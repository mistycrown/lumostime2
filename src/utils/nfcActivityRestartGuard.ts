/**
 * @file nfcActivityRestartGuard.ts
 * @input Recent NFC stop / cross-source start metadata plus the next timer-start candidate
 * @output Small helpers that suppress accidental same-activity restarts right after an NFC stop or duplicate start handling across NFC and deep-link sources
 * @pos Utility (NFC timer guard)
 * @description Prevents duplicated NFC/deep-link deliveries from immediately restarting the same activity after the scan was meant to stop it, and suppresses cross-source replays of the same start action from one physical NFC scan.
 * @updated 2026-05-14: Added cross-source start duplicate suppression so one NFC scan cannot stop a timer and then re-open it through the deep-link bridge.
 * @updated 2026-05-14: Removed persistent same-tag suppression and returned this guard to the short duplicate-delivery window only.
 * @updated 2026-05-13: Added a short same-activity restart guard for repeated NFC timer scans.
 */

export const NFC_ACTIVITY_RESTART_GUARD_MS = 2500;
export const NFC_CROSS_SOURCE_START_DUPLICATE_GUARD_MS = 5000;

export type RecentNfcActivityStop = {
  activityKey: string;
  timestamp: number;
};

export type RecentNfcActivityStartExecution = {
  activityKey: string;
  timestamp: number;
  source: 'scan' | 'deeplink';
};

export const buildNfcActivityKey = (categoryId: string, activityId: string): string =>
  `${categoryId}::${activityId}`;

export const shouldSuppressNfcActivityRestart = (
  recentStop: RecentNfcActivityStop | null,
  nextActivityKey: string,
  now: number,
  guardMs: number = NFC_ACTIVITY_RESTART_GUARD_MS
): boolean => {
  if (!recentStop || recentStop.activityKey !== nextActivityKey) {
    return false;
  }

  const elapsed = now - recentStop.timestamp;
  return elapsed >= 0 && elapsed < guardMs;
};

export const shouldSuppressCrossSourceNfcStartDuplicate = (
  recentExecution: RecentNfcActivityStartExecution | null,
  nextActivityKey: string,
  nextSource: 'scan' | 'deeplink',
  now: number,
  guardMs: number = NFC_CROSS_SOURCE_START_DUPLICATE_GUARD_MS
): boolean => {
  if (!recentExecution || recentExecution.activityKey !== nextActivityKey) {
    return false;
  }

  if (recentExecution.source === nextSource) {
    return false;
  }

  const elapsed = now - recentExecution.timestamp;
  return elapsed >= 0 && elapsed < guardMs;
};
