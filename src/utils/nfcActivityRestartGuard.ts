/**
 * @file nfcActivityRestartGuard.ts
 * @input Recent NFC stop metadata plus the next timer-start candidate
 * @output Small helpers that suppress accidental same-activity restarts right after an NFC stop
 * @pos Utility (NFC timer guard)
 * @description Prevents duplicated NFC/deep-link deliveries from immediately restarting the same activity after the scan was meant to stop it.
 * @updated 2026-05-13: Added a short same-activity restart guard for repeated NFC timer scans.
 */

export const NFC_ACTIVITY_RESTART_GUARD_MS = 2500;

export type RecentNfcActivityStop = {
  activityKey: string;
  timestamp: number;
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
