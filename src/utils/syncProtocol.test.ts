/**
 * @file syncProtocol.test.ts
 * @input In-memory devices/cloud storage and deferred transfer callbacks
 * @output Regression coverage for sequential-device sync, concurrent edits and legacy migration
 * @pos Test (Cloud Sync)
 */
import { describe, expect, test, vi } from 'vitest';
import {
  getRemoteVersion, hashSyncContent, LocalChangedDuringSyncError, resolveVersionDirection,
  runSyncCycle, serializeSyncContent, SyncCheckpoint, SyncCycleDependencies, SyncPayload
} from './syncProtocol';

const payload = (text: string, timestamp = 10): SyncPayload => ({ logs: [{ text }], todos: [], categories: [], timestamp });
const hash = (data: SyncPayload) => hashSyncContent(serializeSyncContent(data));

const device = (initial: SyncPayload, cloud: { data: SyncPayload | null }) => {
  let local = initial;
  let checkpoint: SyncCheckpoint | null = null;
  let pendingUpload: SyncCheckpoint | null = null;
  const dependencies: SyncCycleDependencies = {
    readLocal: () => local,
    readRemote: vi.fn(async () => cloud.data),
    readCheckpoint: () => checkpoint,
    readPendingUpload: () => pendingUpload,
    recordPendingUpload: value => { pendingUpload = value; },
    acknowledge: vi.fn((value) => { checkpoint = value; pendingUpload = null; }),
    legacyPending: () => false,
    upload: vi.fn(async (snapshot) => {
      cloud.data = { ...snapshot, syncRevision: snapshot.syncRevision || crypto.randomUUID() };
      return cloud.data;
    }),
    prepareRestore: vi.fn(async (remote) => remote),
    applyRestore: vi.fn(async (remote) => { local = remote; }),
    backupRemote: vi.fn(async () => {})
  };
  return {
    dependencies,
    edit: (data: SyncPayload) => { local = data; },
    read: () => local,
    checkpoint: () => checkpoint,
    sync: (options?: Parameters<typeof runSyncCycle>[1]) => runSyncCycle(dependencies, options)
  };
};

describe('versioned handoff', () => {
  test('A uploads, B downloads, B deletes and A receives the smaller payload despite clock skew', async () => {
    const cloud = { data: null as SyncPayload | null };
    const a = device(payload('first'), cloud);
    const b = device(payload('seed', 999999), cloud);
    expect((await a.sync()).direction).toBe('upload');
    expect((await b.sync()).direction).toBe('restore');
    b.edit(payload('', 1));
    expect((await b.sync()).direction).toBe('upload');
    expect((await a.sync()).direction).toBe('restore');
    expect(a.read().logs[0].text).toBe('');
    expect((await a.sync()).direction).toBe('equal');
  });

  test('same-length edits with identical timestamps are uploaded', async () => {
    const cloud = { data: payload('aaa') };
    const a = device(payload('aaa'), cloud);
    await a.sync();
    a.edit(payload('bbb'));
    expect((await a.sync()).direction).toBe('upload');
    expect(cloud.data.logs[0].text).toBe('bbb');
  });

  test('both devices editing the common baseline produces a real conflict', async () => {
    const cloud = { data: payload('base') };
    const a = device(payload('base'), cloud);
    const b = device(payload('base'), cloud);
    await a.sync();
    await b.sync();
    a.edit(payload('from a'));
    b.edit(payload('from b'));
    await a.sync();
    expect((await b.sync()).direction).toBe('conflict');
    expect(b.read().logs[0].text).toBe('from b');
  });

  test('unconfirmed legacy local changes do not overwrite an unknown cloud', async () => {
    const a = device(payload('offline'), { data: payload('remote') });
    a.dependencies.legacyPending = () => true;
    expect((await a.sync()).direction).toBe('conflict');
    expect(a.dependencies.upload).not.toHaveBeenCalled();
  });

  test('a failed remote read performs no write and acknowledges nothing', async () => {
    const a = device(payload('local'), { data: null });
    a.dependencies.readRemote = vi.fn().mockRejectedValue(new Error('offline'));
    await expect(a.sync()).rejects.toThrow('offline');
    expect(a.dependencies.upload).not.toHaveBeenCalled();
    expect(a.checkpoint()).toBeNull();
  });

  test('reads the latest local state after remote I/O', async () => {
    const cloud = { data: payload('base') };
    const a = device(payload('base'), cloud);
    await a.sync();
    a.dependencies.readRemote = vi.fn(async () => {
      a.edit(payload('new while reading'));
      return cloud.data;
    });
    expect((await a.sync()).direction).toBe('upload');
    expect(cloud.data.logs[0].text).toBe('new while reading');
  });

  test('edits during upload remain different from the acknowledged snapshot and upload next', async () => {
    const cloud = { data: payload('base') };
    const a = device(payload('base'), cloud);
    await a.sync();
    a.edit(payload('first edit'));
    const upload = a.dependencies.upload;
    a.dependencies.upload = async (snapshot) => {
      a.edit(payload('second edit'));
      return upload(snapshot);
    };
    await a.sync();
    expect(a.checkpoint()?.localHash).toBe(await hash(payload('first edit')));
    expect(cloud.data.logs[0].text).toBe('first edit');
    a.dependencies.upload = upload;
    expect((await a.sync()).direction).toBe('upload');
    expect(cloud.data.logs[0].text).toBe('second edit');
  });

  test('does not apply a restore when the user edits during backup/image download', async () => {
    const a = device(payload('base'), { data: payload('remote') });
    a.dependencies.prepareRestore = async (remote) => {
      a.edit(payload('new local edit'));
      return remote;
    };
    await expect(a.sync()).rejects.toBeInstanceOf(LocalChangedDuringSyncError);
    expect(a.dependencies.applyRestore).not.toHaveBeenCalled();
    expect(a.checkpoint()).toBeNull();
  });

  test('uses normalized local state as the restored baseline without uploading it back', async () => {
    const a = device(payload('seed'), { data: payload('cloud') });
    a.dependencies.applyRestore = async () => a.edit({ ...payload('cloud'), platformDefault: true });
    await a.sync();
    expect((await a.sync()).direction).toBe('equal');
    expect(a.dependencies.upload).not.toHaveBeenCalled();
  });

  test('conflict choices use current local data and recheck the selected cloud version', async () => {
    const cloud = { data: payload('remote') };
    const a = device(payload('local'), cloud);
    a.dependencies.legacyPending = () => true;
    const conflict = await a.sync();
    a.edit(payload('local after dialog'));
    await a.sync({ force: 'upload', expectedRemoteVersion: conflict.remoteVersion });
    expect(cloud.data.logs[0].text).toBe('local after dialog');
    expect(a.dependencies.backupRemote).toHaveBeenCalled();
    cloud.data = payload('changed again');
    expect((await a.sync({ force: 'restore', expectedRemoteVersion: conflict.remoteVersion })).direction).toBe('conflict');
  });

  test('remote changes during upload preflight stop the overwrite', async () => {
    const cloud = { data: payload('base') };
    const a = device(payload('base'), cloud);
    await a.sync();
    a.edit(payload('edited'));
    a.dependencies.readRemote = vi.fn().mockResolvedValueOnce(cloud.data).mockResolvedValueOnce(payload('other device'));
    expect((await a.sync()).direction).toBe('conflict');
    expect(a.dependencies.upload).not.toHaveBeenCalled();
  });

  test('recovers a successful PUT with a lost response before uploading subsequent edits', async () => {
    const cloud = { data: payload('base') };
    const a = device(payload('base'), cloud);
    await a.sync();
    a.edit(payload('first edit'));
    const upload = a.dependencies.upload;
    a.dependencies.upload = async snapshot => {
      await upload(snapshot);
      a.edit(payload('second edit'));
      throw new Error('response lost');
    };
    await expect(a.sync()).rejects.toThrow('response lost');
    a.dependencies.upload = upload;
    expect((await a.sync()).direction).toBe('upload');
    expect(cloud.data.logs[0].text).toBe('second edit');
  });
});

describe('content identity', () => {
  test('ignores generated metadata and object key order but keeps user timestamps and array order', async () => {
    const a = { ...payload('text'), aiData: { exportedAt: 'old', messages: [{ timestamp: 1 }] }, achievementData: { exportedAt: 'old' } };
    const b = { achievementData: { exportedAt: 'new' }, aiData: { messages: [{ timestamp: 1 }], exportedAt: 'new' }, ...payload('text', 999) };
    expect(await hash(a)).toBe(await hash(b));
    b.aiData.messages[0].timestamp = 2;
    expect(await hash(a)).not.toBe(await hash(b));
    expect(await hash({ items: [1, 2] })).not.toBe(await hash({ items: [2, 1] }));
  });

  test('legacy versions are content based and reused revision IDs cannot hide changed content', async () => {
    expect(await getRemoteVersion(payload('a', 10))).toBe(await getRemoteVersion(payload('a', 99)));
    expect(await getRemoteVersion({ ...payload('a'), syncRevision: 'same' }))
      .not.toBe(await getRemoteVersion({ ...payload('b'), syncRevision: 'same' }));
  });

  test('a missing previously acknowledged backup requires a decision', () => {
    expect(resolveVersionDirection({ checkpoint: { remoteVersion: 'v1', localHash: 'a' }, localHash: 'a', remoteHash: null, remoteVersion: 'missing', legacyPending: false })).toBe('conflict');
  });
});
