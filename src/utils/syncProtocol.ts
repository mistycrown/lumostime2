/**
 * @file syncProtocol.ts
 * @input Current local snapshots, remote snapshots, destination checkpoints, and transfer callbacks
 * @output Content-based sync decisions and acknowledgements for exactly the transferred snapshot
 * @pos Utility (Cloud Sync)
 * @description Implements sequential-device handoff without comparing clocks or JSON sizes.
 */

export type SyncPayload = Record<string, any>;
export type SyncDirection = 'equal' | 'upload' | 'restore' | 'conflict';
export interface SyncCheckpoint {
  remoteVersion: string;
  localHash: string;
}

const canonicalize = (value: any): any => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
};

export const serializeSyncContent = (data: SyncPayload): string => {
  const { timestamp, cloudUploadedAt, syncRevision, version, ...content } = data;
  for (const key of ['aiData', 'achievementData']) {
    if (content[key] && typeof content[key] === 'object') {
      const { exportedAt, ...persistent } = content[key];
      content[key] = persistent;
    }
  }
  return JSON.stringify(canonicalize(content));
};

export const hashSyncContent = async (content: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const getRemoteVersion = async (data: SyncPayload | null): Promise<string> => {
  if (data === null) return 'missing';
  // Including content also detects legacy clients that preserve a revision while editing its payload.
  return `${typeof data.syncRevision === 'string' ? data.syncRevision : 'legacy'}:${await hashSyncContent(serializeSyncContent(data))}`;
};

export const readSyncCheckpoint = (destination: string): SyncCheckpoint | null => {
  try {
    const value = JSON.parse(localStorage.getItem(`lumostime_sync_checkpoint_v2:${destination}`) || 'null');
    return typeof value?.remoteVersion === 'string' && typeof value?.localHash === 'string' ? value : null;
  } catch {
    return null;
  }
};

export const writeSyncCheckpoint = (destination: string, checkpoint: SyncCheckpoint): void => {
  localStorage.setItem(`lumostime_sync_checkpoint_v2:${destination}`, JSON.stringify(checkpoint));
};

export const readPendingUpload = (destination: string): SyncCheckpoint | null => readSyncCheckpoint('pending:' + destination);
export const writePendingUpload = (destination: string, checkpoint: SyncCheckpoint): void => writeSyncCheckpoint('pending:' + destination, checkpoint);
export const clearPendingUpload = (destination: string): void => {
  localStorage.removeItem('lumostime_sync_checkpoint_v2:pending:' + destination);
};

export const resolveVersionDirection = (input: {
  checkpoint: SyncCheckpoint | null;
  localHash: string;
  remoteHash: string | null;
  remoteVersion: string;
  legacyPending: boolean;
}): SyncDirection => {
  const { checkpoint, localHash, remoteHash, remoteVersion, legacyPending } = input;
  if (remoteHash === localHash) return 'equal';
  if (!checkpoint) {
    if (remoteHash === null) return 'upload';
    return legacyPending ? 'conflict' : 'restore';
  }
  const localChanged = localHash !== checkpoint.localHash;
  const remoteChanged = remoteVersion !== checkpoint.remoteVersion;
  // A removed backup or a wrong destination must not silently become an empty restore.
  if (remoteHash === null && remoteChanged) return 'conflict';
  if (localChanged && remoteChanged) return 'conflict';
  if (localChanged) return 'upload';
  return remoteChanged ? 'restore' : 'equal';
};

export class LocalChangedDuringSyncError extends Error {
  constructor() {
    super('同步期间本地发生修改，已保留修改并安排重新检查');
  }
}

export interface SyncCycleDependencies {
  readLocal: () => SyncPayload;
  readRemote: () => Promise<SyncPayload | null>;
  readCheckpoint: () => SyncCheckpoint | null;
  readPendingUpload?: () => SyncCheckpoint | null;
  recordPendingUpload?: (checkpoint: SyncCheckpoint) => void;
  acknowledge: (checkpoint: SyncCheckpoint, localSnapshot: SyncPayload) => void;
  legacyPending: () => boolean;
  upload: (local: SyncPayload) => Promise<SyncPayload>;
  prepareRestore: (remote: SyncPayload, local: SyncPayload) => Promise<SyncPayload>;
  applyRestore: (remote: SyncPayload) => Promise<void>;
  backupRemote: (remote: SyncPayload) => Promise<void>;
}

export interface SyncCycleResult {
  direction: SyncDirection;
  remoteVersion: string;
  localData: SyncPayload;
  cloudData: SyncPayload | null;
}

export const runSyncCycle = async (
  dependencies: SyncCycleDependencies,
  options: { force?: 'upload' | 'restore'; expectedRemoteVersion?: string } = {}
): Promise<SyncCycleResult> => {
  const remote = await dependencies.readRemote();
  // Read after network I/O, never from the callback's original render.
  const local = JSON.parse(JSON.stringify(dependencies.readLocal())) as SyncPayload;
  const localContent = serializeSyncContent(local);
  const localHash = await hashSyncContent(localContent);
  const remoteVersion = await getRemoteVersion(remote);
  const remoteHash = remote === null ? null : await hashSyncContent(serializeSyncContent(remote));
  const result = (direction: SyncDirection): SyncCycleResult => ({
    direction, remoteVersion, localData: local, cloudData: remote
  });

  if (options.expectedRemoteVersion !== undefined && options.expectedRemoteVersion !== remoteVersion) {
    return result('conflict');
  }
  const pendingUpload = dependencies.readPendingUpload?.();
  // A lost PUT/verification response must not turn our own successful write into a foreign edit.
  const checkpoint = pendingUpload?.remoteVersion === remoteVersion ? pendingUpload : dependencies.readCheckpoint();
  const direction = options.force || resolveVersionDirection({
    checkpoint, localHash, remoteHash, remoteVersion,
    legacyPending: dependencies.legacyPending()
  });
  if (direction === 'conflict') return result(direction);
  if (direction === 'upload') {
    if (options.force && remote) await dependencies.backupRemote(remote);
    const currentRemote = await dependencies.readRemote();
    if (await getRemoteVersion(currentRemote) !== remoteVersion) {
      return { ...result('conflict'), cloudData: currentRemote, remoteVersion: await getRemoteVersion(currentRemote) };
    }
    const uploadSnapshot = { ...local, syncRevision: crypto.randomUUID() };
    dependencies.recordPendingUpload?.({ remoteVersion: await getRemoteVersion(uploadSnapshot), localHash });
    const uploaded = await dependencies.upload(uploadSnapshot);
    dependencies.acknowledge({ remoteVersion: await getRemoteVersion(uploaded), localHash }, local);
  } else if (direction === 'restore') {
    if (!remote) throw new Error('云端没有可恢复的备份');
    const prepared = await dependencies.prepareRestore(remote, local);
    // Includes edits made while downloading images or writing the safety backup.
    if (serializeSyncContent(dependencies.readLocal()) !== localContent) {
      throw new LocalChangedDuringSyncError();
    }
    await dependencies.applyRestore(prepared);
    const applied = dependencies.readLocal();
    const appliedHash = await hashSyncContent(serializeSyncContent(applied));
    dependencies.acknowledge({ remoteVersion, localHash: appliedHash }, applied);
  } else {
    dependencies.acknowledge({ remoteVersion, localHash }, local);
  }
  return result(direction);
};
