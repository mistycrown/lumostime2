/**
 * @file localDataTimestamp.test.ts
 * @input Mock localStorage and local/cloud timestamp helpers
 * @output Regression coverage for neutral missing local timestamps and cloud acknowledgement persistence
 * @pos Test
 * @description Prevents a missing local timestamp from being interpreted as the current time during sync direction checks.
 * @updated 2026-08-11: Added dual-path sync timestamp storage coverage.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

const { storage } = vi.hoisted(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear()
  });
  return { storage };
});

import {
  getLastSeenCloudUploadedAt,
  getLocalDataTimestamp,
  setLastSeenCloudUploadedAt,
  setLocalDataTimestampUpdateLocked,
  updateLocalDataTimestamp
} from './localDataTimestamp';
import { SYNC_KEYS, USER_DATA_KEYS } from '../constants/storageKeys';

describe('localDataTimestamp', () => {
  beforeEach(() => {
    storage.clear();
    setLocalDataTimestampUpdateLocked(false);
  });

  test('uses zero instead of the current time when the local timestamp is missing or invalid', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123456);

    expect(getLocalDataTimestamp()).toBe(0);
    storage.set(USER_DATA_KEYS.LOCAL_TIMESTAMP, 'not-a-timestamp');
    expect(getLocalDataTimestamp()).toBe(0);
  });

  test('updates the local timestamp only through an explicit local data change', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123456);

    expect(updateLocalDataTimestamp()).toBe(123456);
    expect(getLocalDataTimestamp()).toBe(123456);
  });

  test('persists the latest acknowledged cloud upload independently', () => {
    expect(setLastSeenCloudUploadedAt(456789)).toBe(456789);
    expect(getLastSeenCloudUploadedAt()).toBe(456789);
    expect(storage.get(SYNC_KEYS.LAST_SEEN_CLOUD_UPLOADED_AT)).toBe('456789');
  });
});
