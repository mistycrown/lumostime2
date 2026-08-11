/**
 * @file syncTimestampDirection.ts
 * @input Local/cloud timestamps, sync tolerance, and serialized JSON sizes
 * @output Pure sync-direction classifiers for timestamp-based and size-aware cloud decisions
 * @pos Utility (Sync Metadata)
 * @description Keeps sync direction decisions side-effect free so timestamp tolerance and JSON-size conflict protection can be regression tested without pulling in the full app shell.
 * @updated 2026-08-11: Keeps timestamp and JSON-size paths independent, with sync metadata excluded from the JSON-size fallback.
 * @updated 2026-06-15: Added JSON-size-aware sync direction resolution so larger backup payloads can block contradictory overwrite directions and break timestamp ties.
 * @updated 2026-05-18: Added shared timestamp direction classification so narrow sync-tolerance fixes can be tested independently from the React hook.
 */

export type SyncTimestampDirection = 'restore' | 'upload' | 'equal';
export type SyncPreferredDirection = 'restore' | 'upload' | 'equal';
export type SyncResolvedDirection = SyncTimestampDirection | 'conflict';

export interface SyncDirectionDecision {
  direction: SyncResolvedDirection;
  timestampDirection: SyncTimestampDirection;
  sizeDirection: SyncPreferredDirection;
  localJsonSize: number;
  cloudJsonSize: number;
  conflictSource?: 'timestamp-vs-size' | 'forced-direction-vs-size';
}

export const classifySyncTimestampDirection = (
  localTimestamp: number,
  cloudTimestamp: number,
  toleranceMs: number
): SyncTimestampDirection => {
  if (cloudTimestamp > localTimestamp + toleranceMs) {
    return 'restore';
  }

  if (localTimestamp > cloudTimestamp + toleranceMs) {
    return 'upload';
  }

  return 'equal';
};

export const classifySyncJsonSizeDirection = (
  localJsonSize: number,
  cloudJsonSize: number
): SyncPreferredDirection => {
  if (localJsonSize > cloudJsonSize) {
    return 'upload';
  }

  if (cloudJsonSize > localJsonSize) {
    return 'restore';
  }

  return 'equal';
};

export const getJsonByteSize = (data: unknown): number => {
  const serialized = JSON.stringify(data);

  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(serialized).length;
  }

  return serialized.length;
};

export const getComparableSyncJsonByteSize = (data: unknown): number => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return getJsonByteSize(data);
  }

  const { timestamp: _timestamp, cloudUploadedAt: _cloudUploadedAt, ...userData } = data as Record<string, unknown>;
  return getJsonByteSize(userData);
};

interface ResolveSyncTimestampDirectionOptions {
  localTimestamp: number;
  cloudTimestamp: number;
  toleranceMs: number;
  mode: 'startup' | 'resume' | 'manual' | 'auto';
  hadPendingAutoSync: boolean;
}

export const resolveSyncTimestampDirection = ({
  localTimestamp,
  cloudTimestamp,
  toleranceMs
}: ResolveSyncTimestampDirectionOptions): SyncTimestampDirection => {
  const baseDirection = classifySyncTimestampDirection(localTimestamp, cloudTimestamp, toleranceMs);

  return baseDirection;
};

interface ResolveSyncDirectionDecisionOptions extends ResolveSyncTimestampDirectionOptions {
  localJsonSize: number;
  cloudJsonSize: number;
}

export const resolveSyncDirectionDecision = ({
  localTimestamp,
  cloudTimestamp,
  toleranceMs,
  mode,
  hadPendingAutoSync,
  localJsonSize,
  cloudJsonSize
}: ResolveSyncDirectionDecisionOptions): SyncDirectionDecision => {
  const timestampDirection = resolveSyncTimestampDirection({
    localTimestamp,
    cloudTimestamp,
    toleranceMs,
    mode,
    hadPendingAutoSync
  });
  const sizeDirection = classifySyncJsonSizeDirection(localJsonSize, cloudJsonSize);

  if (timestampDirection === 'equal' && sizeDirection !== 'equal') {
    return {
      direction: sizeDirection,
      timestampDirection,
      sizeDirection,
      localJsonSize,
      cloudJsonSize
    };
  }

  if (
    timestampDirection !== 'equal'
    && sizeDirection !== 'equal'
    && timestampDirection !== sizeDirection
  ) {
    return {
      direction: 'conflict',
      timestampDirection,
      sizeDirection,
      localJsonSize,
      cloudJsonSize,
      conflictSource: 'timestamp-vs-size'
    };
  }

  return {
    direction: timestampDirection,
    timestampDirection,
    sizeDirection,
    localJsonSize,
    cloudJsonSize
  };
};

export const detectForcedSyncConflict = (
  requestedDirection: 'restore' | 'upload',
  localJsonSize: number,
  cloudJsonSize: number
): SyncDirectionDecision => {
  const sizeDirection = classifySyncJsonSizeDirection(localJsonSize, cloudJsonSize);
  const direction = sizeDirection !== 'equal' && sizeDirection !== requestedDirection
    ? 'conflict'
    : requestedDirection;

  return {
    direction,
    timestampDirection: requestedDirection,
    sizeDirection,
    localJsonSize,
    cloudJsonSize,
    conflictSource: direction === 'conflict' ? 'forced-direction-vs-size' : undefined
  };
};
