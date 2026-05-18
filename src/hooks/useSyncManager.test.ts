/**
 * @file useSyncManager.test.ts
 * @input Sync timestamp direction helper
 * @output Regression coverage for local/cloud timestamp classification
 * @pos Test
 * @description Ensures sync direction classification still uploads fresh local edits shortly after the previous sync while keeping sub-second timestamp jitter treated as equal.
 * @updated 2026-05-18: Added regression coverage for the narrowed sync tolerance so recent desktop edits are no longer swallowed as equal.
 */

import { describe, expect, test } from 'vitest';
import { classifySyncTimestampDirection } from '../utils/syncTimestampDirection';

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
});
