/**
 * @file nfcActivityRestartGuard.test.ts
 * @description Verifies that recent NFC stop metadata only suppresses accidental same-activity restarts within the short duplicate-delivery window.
 * @updated 2026-05-13: Added regression coverage for NFC stop-then-restart suppression.
 */
import { describe, expect, test } from 'vitest';
import {
  buildNfcActivityKey,
  NFC_ACTIVITY_RESTART_GUARD_MS,
  shouldSuppressNfcActivityRestart,
} from './nfcActivityRestartGuard';

describe('nfcActivityRestartGuard', () => {
  test('suppresses same-activity restart attempts inside the guard window', () => {
    const activityKey = buildNfcActivityKey('life', 'commute');

    expect(
      shouldSuppressNfcActivityRestart(
        { activityKey, timestamp: 10_000 },
        activityKey,
        10_000 + NFC_ACTIVITY_RESTART_GUARD_MS - 1
      )
    ).toBe(true);
  });

  test('allows restarts for other activities or after the guard window expires', () => {
    const activityKey = buildNfcActivityKey('life', 'commute');
    const otherActivityKey = buildNfcActivityKey('work', 'writing');
    const recentStop = { activityKey, timestamp: 10_000 };

    expect(
      shouldSuppressNfcActivityRestart(recentStop, otherActivityKey, 10_500)
    ).toBe(false);

    expect(
      shouldSuppressNfcActivityRestart(
        recentStop,
        activityKey,
        10_000 + NFC_ACTIVITY_RESTART_GUARD_MS
      )
    ).toBe(false);
  });
});
