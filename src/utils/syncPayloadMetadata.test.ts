/**
 * @file syncPayloadMetadata.test.ts
 * @input Sync payload samples
 * @output Regression coverage for canonical sync payload metadata helpers
 * @pos Test
 * @description Verifies that cloud sync compares payload content and extracts timestamps from the main backup body rather than remote filenames or backup-directory metadata.
 * @updated 2026-06-21: Added coverage for canonical sync payload timestamp and equality helpers.
 */

import { describe, expect, test } from 'vitest';
import {
  buildSyncPayloadMetadata,
  getSyncPayloadTimestamp,
  isSameSyncPayload
} from './syncPayloadMetadata';

describe('syncPayloadMetadata', () => {
  test('uses payload timestamp before fallback timestamp', () => {
    expect(getSyncPayloadTimestamp({ timestamp: 123 }, 999)).toBe(123);
  });

  test('falls back when payload timestamp is missing or invalid', () => {
    expect(getSyncPayloadTimestamp({}, 999)).toBe(999);
    expect(getSyncPayloadTimestamp({ timestamp: '123' }, 999)).toBe(999);
  });

  test('compares serialized payload content exactly', () => {
    expect(isSameSyncPayload({ logs: [], timestamp: 1 }, { logs: [], timestamp: 1 })).toBe(true);
    expect(isSameSyncPayload({ logs: [], timestamp: 1 }, { logs: [], timestamp: 2 })).toBe(false);
  });

  test('builds timestamp and byte-size metadata from payload body', () => {
    const metadata = buildSyncPayloadMetadata({ text: '中文', timestamp: 456 });

    expect(metadata.timestamp).toBe(456);
    expect(metadata.jsonSize).toBeGreaterThan(JSON.stringify({ text: '中文', timestamp: 456 }).length);
  });
});
