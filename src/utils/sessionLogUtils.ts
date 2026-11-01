/**
 * @file sessionLogUtils.ts
 * @input Completed session identity and day-split logs
 * @output Stable log identities shared by app and native completion paths
 * @pos Utility (Timer)
 * @updated 2026-11-01: Deduplicates completion replay when app and native switches race.
 */
import type { Log } from '../types';

export const identifySessionLogs = (sessionId: string, logs: Log[]): Log[] => logs.map((log, index) => ({
  ...log,
  id: index === 0 ? sessionId : `${sessionId}:day:${log.startTime}`
}));
