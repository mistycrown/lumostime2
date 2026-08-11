/**
 * @file useSyncManager.test.ts
 * @input Sync timestamp and JSON-size direction helpers
 * @output Regression coverage for local/cloud timestamp classification and size-aware conflict detection
 * @pos Test
 * @description Ensures timestamp and JSON-size directions remain independent, use neutral equality inside tolerance, and block contradictory overwrite directions.
 * @updated 2026-06-15: Added JSON-size direction, tie-break, and conflict coverage for cloud sync overwrite protection.
 * @updated 2026-08-11: Covers neutral pending-auto-sync timestamps and JSON-size comparison that excludes sync metadata.
 * @updated 2026-05-18: Added regression coverage for the narrowed sync tolerance so recent desktop edits are no longer swallowed as equal.
 */

import { describe, expect, test } from 'vitest';
import {
  classifySyncJsonSizeDirection,
  classifySyncTimestampDirection,
  detectForcedSyncConflict,
  getComparableSyncJsonByteSize,
  getJsonByteSize,
  resolveSyncDirectionDecision,
  resolveSyncTimestampDirection
} from '../utils/syncTimestampDirection';

describe('classifySyncTimestampDirection', () => {
  test('treats sub-second timestamp jitter as equal', () => {
    expect(classifySyncTimestampDirection(10_400, 10_000, 1_000)).toBe('equal');
    expect(classifySyncTimestampDirection(10_000, 10_900, 1_000)).toBe('equal');
  });

  test('detects fresh local edits a little over one second after cloud sync', () => {
    expect(classifySyncTimestampDirection(11_200, 10_000, 1_000)).toBe('upload');
  });

  test('detects newer cloud data once it is clearly beyond tolerance', () => {
    expect(classifySyncTimestampDirection(10_000, 11_500, 1_000)).toBe('restore');
  });

  test('keeps an in-tolerance timestamp neutral even with pending auto-sync', () => {
    expect(resolveSyncTimestampDirection({
      localTimestamp: 10_400,
      cloudTimestamp: 10_000,
      toleranceMs: 1_000,
      mode: 'auto',
      hadPendingAutoSync: true
    })).toBe('equal');
  });

  test('keeps equal classification inside tolerance when no local auto-sync is pending', () => {
    expect(resolveSyncTimestampDirection({
      localTimestamp: 10_400,
      cloudTimestamp: 10_000,
      toleranceMs: 1_000,
      mode: 'auto',
      hadPendingAutoSync: false
    })).toBe('equal');
  });
});

describe('classifySyncJsonSizeDirection', () => {
  test('prefers upload when local json is larger', () => {
    expect(classifySyncJsonSizeDirection(300, 200)).toBe('upload');
  });

  test('prefers restore when cloud json is larger', () => {
    expect(classifySyncJsonSizeDirection(200, 300)).toBe('restore');
  });

  test('treats equal sizes as equal', () => {
    expect(classifySyncJsonSizeDirection(300, 300)).toBe('equal');
  });
});

describe('resolveSyncDirectionDecision', () => {
  test('returns conflict when timestamp says restore but local json is larger', () => {
    expect(resolveSyncDirectionDecision({
      localTimestamp: 10_000,
      cloudTimestamp: 12_500,
      toleranceMs: 1_000,
      mode: 'auto',
      hadPendingAutoSync: false,
      localJsonSize: 500,
      cloudJsonSize: 300
    })).toMatchObject({
      direction: 'conflict',
      timestampDirection: 'restore',
      sizeDirection: 'upload'
    });
  });

  test('returns conflict when timestamp says upload but cloud json is larger', () => {
    expect(resolveSyncDirectionDecision({
      localTimestamp: 12_500,
      cloudTimestamp: 10_000,
      toleranceMs: 1_000,
      mode: 'manual',
      hadPendingAutoSync: false,
      localJsonSize: 300,
      cloudJsonSize: 500
    })).toMatchObject({
      direction: 'conflict',
      timestampDirection: 'upload',
      sizeDirection: 'restore'
    });
  });

  test('uses larger json as the tiebreaker when timestamps are equal', () => {
    expect(resolveSyncDirectionDecision({
      localTimestamp: 10_400,
      cloudTimestamp: 10_000,
      toleranceMs: 1_000,
      mode: 'manual',
      hadPendingAutoSync: false,
      localJsonSize: 450,
      cloudJsonSize: 300
    })).toMatchObject({
      direction: 'upload',
      timestampDirection: 'equal',
      sizeDirection: 'upload'
    });
  });

  test('keeps timestamp direction when size is equal', () => {
    expect(resolveSyncDirectionDecision({
      localTimestamp: 10_000,
      cloudTimestamp: 12_500,
      toleranceMs: 1_000,
      mode: 'manual',
      hadPendingAutoSync: false,
      localJsonSize: 300,
      cloudJsonSize: 300
    })).toMatchObject({
      direction: 'restore',
      timestampDirection: 'restore',
      sizeDirection: 'equal'
    });
  });
});

describe('detectForcedSyncConflict', () => {
  test('flags forced upload when cloud json is larger', () => {
    expect(detectForcedSyncConflict('upload', 300, 500)).toMatchObject({
      direction: 'conflict',
      sizeDirection: 'restore'
    });
  });

  test('allows forced download when cloud json is larger', () => {
    expect(detectForcedSyncConflict('restore', 300, 500)).toMatchObject({
      direction: 'restore',
      sizeDirection: 'restore'
    });
  });
});

describe('getJsonByteSize', () => {
  test('returns utf-8 byte length instead of plain character count', () => {
    expect(getJsonByteSize({ text: '中' })).toBeGreaterThan(JSON.stringify({ text: '中' }).length);
  });
});

describe('getComparableSyncJsonByteSize', () => {
  test('excludes top-level sync timestamps from the JSON-size fallback', () => {
    const localSize = getComparableSyncJsonByteSize({ logs: ['same'], timestamp: 1 });
    const cloudSize = getComparableSyncJsonByteSize({ logs: ['same'], timestamp: 9999999999999, cloudUploadedAt: 9999999999999 });

    expect(localSize).toBe(cloudSize);
  });
});
