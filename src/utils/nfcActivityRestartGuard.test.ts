/**
 * @file nfcActivityRestartGuard.test.ts
 * @description Verifies that recent NFC stop metadata only suppresses same-tag restarts inside the short duplicate-delivery window, and that cross-source NFC/deep-link replays do not re-open the same timer.
 * @updated 2026-05-14: Added cross-source start duplicate coverage so NFC timer toggles stay stopped when a matching deep-link replay arrives after the scan.
 * @updated 2026-05-14: Removed the persistent stop-marker case and kept coverage focused on the short duplicate-delivery window.
 * @updated 2026-05-13: Added regression coverage for NFC stop-then-restart suppression.
 */
import { describe, expect, test } from 'vitest';
import {
  buildNfcActivityKey,
  NFC_CROSS_SOURCE_START_DUPLICATE_GUARD_MS,
  NFC_ACTIVITY_RESTART_GUARD_MS,
  shouldSuppressCrossSourceNfcStartDuplicate,
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

  test('suppresses same-activity start replays when the other bridge source already handled the scan', () => {
    const activityKey = buildNfcActivityKey('life', 'commute');

    expect(
      shouldSuppressCrossSourceNfcStartDuplicate(
        {
          activityKey,
          source: 'scan',
          timestamp: 10_000
        },
        activityKey,
        'deeplink',
        10_000 + NFC_CROSS_SOURCE_START_DUPLICATE_GUARD_MS - 1
      )
    ).toBe(true);

    expect(
      shouldSuppressCrossSourceNfcStartDuplicate(
        {
          activityKey,
          source: 'deeplink',
          timestamp: 10_000
        },
        activityKey,
        'scan',
        10_000 + NFC_CROSS_SOURCE_START_DUPLICATE_GUARD_MS - 1
      )
    ).toBe(true);
  });

  test('does not suppress same-source scans, other activities, or arrivals outside the cross-source guard window', () => {
    const activityKey = buildNfcActivityKey('life', 'commute');
    const otherActivityKey = buildNfcActivityKey('work', 'writing');
    const recentExecution = {
      activityKey,
      source: 'scan' as const,
      timestamp: 10_000
    };

    expect(
      shouldSuppressCrossSourceNfcStartDuplicate(
        recentExecution,
        activityKey,
        'scan',
        10_500
      )
    ).toBe(false);

    expect(
      shouldSuppressCrossSourceNfcStartDuplicate(
        recentExecution,
        otherActivityKey,
        'deeplink',
        10_500
      )
    ).toBe(false);

    expect(
      shouldSuppressCrossSourceNfcStartDuplicate(
        recentExecution,
        activityKey,
        'deeplink',
        10_000 + NFC_CROSS_SOURCE_START_DUPLICATE_GUARD_MS
      )
    ).toBe(false);
  });
});
