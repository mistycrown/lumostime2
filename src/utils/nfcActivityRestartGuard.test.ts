/**
 * @file nfcActivityRestartGuard.test.ts
 * @description Verifies that recent NFC stop metadata suppresses same-tag restarts both inside the duplicate-delivery window and while a stop marker is waiting for the next real timer start.
 * @updated 2026-05-14: Added coverage for persistent same-tag suppression and clearing after a different timer starts.
 * @updated 2026-05-13: Added regression coverage for NFC stop-then-restart suppression.
 */
import { describe, expect, test } from 'vitest';
import {
  ActiveSessionRestartCandidate,
  buildNfcActivityKey,
  NFC_ACTIVITY_RESTART_GUARD_MS,
  shouldClearRecentNfcActivityStop,
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

  test('keeps suppressing the same tag until another timer start clears the stop marker', () => {
    const activityKey = buildNfcActivityKey('life', 'commute');

    expect(
      shouldSuppressNfcActivityRestart(
        { activityKey, timestamp: 10_000, suppressUntilNextStart: true },
        activityKey,
        50_000
      )
    ).toBe(true);
  });

  test('clears the recent NFC stop marker once a newer session has started', () => {
    const activityKey = buildNfcActivityKey('life', 'commute');
    const sessions: ActiveSessionRestartCandidate[] = [
      { categoryId: 'life', activityId: 'commute', startTime: 9_000 },
      { categoryId: 'work', activityId: 'writing', startTime: 11_000 },
    ];

    expect(
      shouldClearRecentNfcActivityStop(
        { activityKey, timestamp: 10_000, suppressUntilNextStart: true },
        sessions
      )
    ).toBe(true);

    expect(
      shouldClearRecentNfcActivityStop(
        { activityKey, timestamp: 10_000, suppressUntilNextStart: true },
        [{ categoryId: 'life', activityId: 'commute', startTime: 10_000 }]
      )
    ).toBe(false);
  });
});
