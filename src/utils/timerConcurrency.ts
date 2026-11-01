/**
 * @file timerConcurrency.ts
 * @input Persisted timer concurrency preference
 * @output Shared storage key and backwards-compatible preference reader
 * @pos Utility (Timer)
 * @updated 2026-11-01: Defaults simultaneous timing to enabled for existing installations.
 */
export const ALLOW_CONCURRENT_TIMERS_KEY = 'lumostime_allow_concurrent_timers';

export const readAllowConcurrentTimers = (storage: Pick<Storage, 'getItem'>): boolean =>
  storage.getItem(ALLOW_CONCURRENT_TIMERS_KEY) !== 'false';
