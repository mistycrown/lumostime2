/**
 * @file nfcStartActionDecision.test.ts
 * @description Verifies that NFC timer scans only stop sessions tied to the same tag and otherwise allow multiple tag-backed activities to run concurrently.
 * @updated 2026-08-26: Covers the completion Toast text shown after a repeated activity-tag scan.
 * @updated 2026-06-06: Added regression coverage for `A -> B` concurrent starts and `A -> A` stop-on-repeat behavior.
 */
import { describe, expect, test } from 'vitest';
import { ActiveSession } from '../types';
import { decideNfcStartAction, getNfcActivityStopToast } from './nfcStartActionDecision';

const buildSession = (
  overrides: Partial<ActiveSession> = {}
): ActiveSession => ({
  id: overrides.id ?? 'session-default',
  activityId: overrides.activityId ?? 'activity-default',
  categoryId: overrides.categoryId ?? 'category-default',
  activityName: overrides.activityName ?? 'Default Activity',
  activityIcon: overrides.activityIcon ?? 'A',
  startTime: overrides.startTime ?? 1_000,
  source: overrides.source ?? 'app',
  ...overrides
});

describe('decideNfcStartAction', () => {
  test('stops only sessions that match the scanned tag', () => {
    const sessions: ActiveSession[] = [
      buildSession({
        id: 'session-a',
        categoryId: 'life',
        activityId: 'activity-a'
      }),
      buildSession({
        id: 'session-b',
        categoryId: 'life',
        activityId: 'activity-b'
      })
    ];

    expect(decideNfcStartAction(sessions, 'life', 'activity-a')).toEqual({
      type: 'stop_matching_sessions',
      activityKey: 'life::activity-a',
      sessionIds: ['session-a']
    });
  });

  test('starts a new concurrent activity when the scanned tag does not already have an active session', () => {
    const sessions: ActiveSession[] = [
      buildSession({
        id: 'session-a',
        categoryId: 'life',
        activityId: 'activity-a'
      })
    ];

    expect(decideNfcStartAction(sessions, 'life', 'activity-b')).toEqual({
      type: 'start_activity',
      activityKey: 'life::activity-b'
    });
  });

  test('builds a completion Toast for a repeated activity-tag scan', () => {
    expect(getNfcActivityStopToast('阅读')).toBe('已结束：阅读');
  });
});
