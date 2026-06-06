/**
 * @file nfcStartActionDecision.ts
 * @input Active sessions plus the category/activity pair from an NFC `start` action
 * @output A small decision describing whether the scan should stop matching sessions or start an additional activity
 * @pos Utility (NFC timer decision)
 * @description Keeps NFC timer scans scoped to the scanned tag only: scanning the same tag again stops its matching sessions, while scanning a different tag starts another concurrent session instead of stopping unrelated timers.
 * @updated 2026-06-06: Added per-tag NFC start/stop decision helper so different tags can run concurrently without stopping each other.
 */
import { ActiveSession } from '../types';
import { buildNfcActivityKey } from './nfcActivityRestartGuard';

export type NfcStartActionDecision =
  | {
      type: 'stop_matching_sessions';
      activityKey: string;
      sessionIds: string[];
    }
  | {
      type: 'start_activity';
      activityKey: string;
    };

export const decideNfcStartAction = (
  activeSessions: ActiveSession[],
  categoryId: string,
  activityId: string
): NfcStartActionDecision => {
  const activityKey = buildNfcActivityKey(categoryId, activityId);
  const matchingSessionIds = activeSessions
    .filter((session) => buildNfcActivityKey(session.categoryId, session.activityId) === activityKey)
    .map((session) => session.id);

  if (matchingSessionIds.length > 0) {
    return {
      type: 'stop_matching_sessions',
      activityKey,
      sessionIds: matchingSessionIds
    };
  }

  return {
    type: 'start_activity',
    activityKey
  };
};
