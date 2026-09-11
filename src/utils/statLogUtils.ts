/**
 * @file statLogUtils.ts
 * @input Timeline logs
 * @output Shared planned-log filters and actual-log end-time inference
 * @description Centralizes the rule that planned timeline blocks should not participate in statistics or backfill time inference.
 * @updated 2026-08-10: Added actual-log helpers so backfill time ranges ignore timeline Plan blocks.
 * @updated 2026-08-09: Added the shared planned-log filter used by stats, summaries, and exports.
 * @updated 2026-09-10: Preserved inclusive period boundaries when calculating the previous statistics range.
 */

import { Log } from '../types';

export interface StatsDateRange {
  start: Date;
  end: Date;
}

/**
 * Return the immediately preceding period while preserving inclusive date
 * boundaries. Stats ranges end at 23:59:59.999, so the period length must
 * include that final millisecond or a midnight segment is dropped.
 */
export const getPreviousStatsDateRange = ({ start, end }: StatsDateRange): StatsDateRange => {
  const periodDuration = end.getTime() - start.getTime() + 1;
  return {
    start: new Date(start.getTime() - periodDuration),
    end: new Date(end.getTime() - periodDuration)
  };
};

export const isActualLog = (log: Pick<Log, 'isPlanned'>): boolean => log.isPlanned !== true;

export const filterActualLogs = <T extends Pick<Log, 'isPlanned'>>(logs: T[]): T[] => (
  logs.filter(isActualLog)
);

export const getLatestActualLogEndTime = <T extends Pick<Log, 'endTime' | 'isPlanned'>>(
  logs: T[]
): number | undefined => filterActualLogs(logs).reduce<number | undefined>(
  (latestEndTime, log) => (
    latestEndTime === undefined || log.endTime > latestEndTime ? log.endTime : latestEndTime
  ),
  undefined
);

export const getLatestActualLogEndTimeInRange = <T extends Pick<Log, 'endTime' | 'isPlanned'>>(
  logs: T[],
  rangeStartTime: number,
  rangeEndTime: number
): number | undefined => getLatestActualLogEndTime(
  filterActualLogs(logs).filter((log) => (
    log.endTime >= rangeStartTime && log.endTime <= rangeEndTime
  ))
);

export const isCountableLog = isActualLog;

export const filterCountableLogs = filterActualLogs;
