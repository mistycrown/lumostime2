/**
 * @file crossDayStatsUtils.ts
 * @input Complete activity history, local day boundary, date range and current time.
 * @output Overnight interval unions, extended clock values and local date keys.
 * @pos Utility (Statistics)
 * @updated 2026-10-25: Adds gap-aware cross-day statistics assigned to the window's ending date.
 */
import type { ActivityStatisticRange, CrossDayMetric, Log } from '../types';

export interface CrossDayInterval { start: number; end: number }
export interface CrossDayStat {
  key: string;
  start: number;
  end: number;
  duration: number;
  intervals: CrossDayInterval[];
}

export const CROSS_DAY_METRIC_LABELS: Record<CrossDayMetric, string> = {
  start: '开始时间', duration: '持续时长', end: '结束时间'
};

export const localDateKey = (date: Date): string => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);
export const parseLocalDate = (key: string): Date => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};
export const normalizeDayBoundary = (value: unknown): number => (
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1439, Math.round(value))) : 720
);
export const formatCrossDayClock = (minutes: number): string => {
  const clock = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(clock / 60)).padStart(2, '0')}:${String(clock % 60).padStart(2, '0')}`;
};
export const formatCrossDayDuration = (seconds: number): string => {
  const minutes = Math.max(0, Math.round(seconds / 60));
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
};

/** Clock position relative to midnight of the window's starting calendar date, not elapsed DST hours. */
export const getCrossDayClockPosition = (timestamp: number, key: string): number => {
  const date = new Date(timestamp);
  const anchor = parseLocalDate(key);
  const offset = (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    - Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())) / 86400000;
  return (offset + 1) * 1440 + date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
};
export const getCrossDayValue = (stat: CrossDayStat, metric: CrossDayMetric): number => (
  metric === 'duration' ? stat.duration : getCrossDayClockPosition(metric === 'start' ? stat.start : stat.end, stat.key)
);

/** Split at local boundaries before unioning overlaps; preserve deliberate gaps and midnight precision. */
export const buildCrossDayStats = (logs: Log[], boundaryMinutes = 720, now = new Date()): Map<string, CrossDayStat> => {
  const boundary = normalizeDayBoundary(boundaryMinutes);
  const groups = new Map<string, CrossDayInterval[]>();
  for (const log of logs) {
    if (log.isPlanned || !Number.isFinite(log.startTime) || !Number.isFinite(log.endTime)
      || log.startTime >= log.endTime || log.endTime > now.getTime()
      || !Number.isFinite(new Date(log.startTime).getTime()) || !Number.isFinite(new Date(log.endTime).getTime())) continue;
    let cursor = log.startTime;
    while (cursor < log.endTime) {
      const endDate = new Date(cursor);
      endDate.setHours(Math.floor(boundary / 60), boundary % 60, 0, 0);
      if (cursor >= endDate.getTime()) {
        endDate.setDate(endDate.getDate() + 1);
        endDate.setHours(Math.floor(boundary / 60), boundary % 60, 0, 0);
      }
      const end = Math.min(log.endTime, endDate.getTime());
      const key = localDateKey(endDate);
      const segments = groups.get(key) || [];
      segments.push({ start: cursor, end });
      groups.set(key, segments);
      cursor = end;
    }
  }
  const result = new Map<string, CrossDayStat>();
  for (const [key, segments] of [...groups].sort(([left], [right]) => left.localeCompare(right))) {
    const intervals: CrossDayInterval[] = [];
    for (const segment of segments.sort((left, right) => left.start - right.start)) {
      const previous = intervals.at(-1);
      // splitLogByDays ends the first segment one millisecond before midnight.
      if (previous && segment.start <= previous.end + 1) previous.end = Math.max(previous.end, segment.end);
      else intervals.push({ ...segment });
    }
    result.set(key, {
      key, start: intervals[0].start, end: intervals.at(-1)!.end,
      duration: intervals.reduce((sum, segment) => sum + (segment.end - segment.start) / 1000, 0), intervals
    });
  }
  return result;
};

export const getCrossDayDateKeys = (range: ActivityStatisticRange, now = new Date()): string[] => {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  if (range === 'year') start.setMonth(0, 1);
  else if (range === 'month') start.setDate(1);
  else if (range === 'week') start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  else start.setDate(start.getDate() - (range === '7d' ? 6 : 29));
  const keys: string[] = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) keys.push(localDateKey(cursor));
  return keys;
};

/** Immediately preceding equal-length local calendar period, for average comparisons. */
export const getPreviousCrossDayKeys = (keys: string[]): string[] => {
  if (!keys.length) return [];
  const start = parseLocalDate(keys[0]);
  start.setDate(start.getDate() - keys.length);
  return keys.map((_, index) => { const day = new Date(start); day.setDate(day.getDate() + index); return localDateKey(day); });
};
