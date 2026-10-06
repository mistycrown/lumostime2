/**
 * @file hourlyDurationUtils.ts
 * @input Actual logs, a local calendar range, and an optional reference date.
 * @output Hourly duration segments and weekday/hour heatmap buckets in seconds.
 * @pos Utility (Statistics)
 * @description Splits effective duration over elapsed hours, sharing period clipping and pause scaling.
 * @updated 2026-10-06: Shares precise hourly allocation between heatmaps and radial rhythm charts.
 */
import type { ActivityStatisticRange, Log } from '../types';
import { getLogDurationSeconds } from './scopeStatsUtils';

type DurationLog = Pick<Log, 'startTime' | 'endTime' | 'duration' | 'isPlanned'>;

export const getHourlyDurationRange = (range: ActivityStatisticRange, now = new Date()) => {
  if (range === 'all') return { start: -Infinity, end: Infinity };
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (range === 'year') start.setMonth(0, 1);
  else if (range === 'month') start.setDate(1);
  else if (range === 'week') start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  else start.setDate(start.getDate() - (range === '7d' ? 6 : 29));
  return { start: start.getTime(), end: now.getTime() };
};

export const forEachHourlyDurationSegment = (
  logs: DurationLog[],
  bounds: { start: number; end: number },
  visit: (segmentStart: number, seconds: number, logIndex: number) => void
) => {
  logs.forEach((log, logIndex) => {
    if (log.isPlanned || !Number.isFinite(log.startTime) || !Number.isFinite(log.endTime)) return;
    const start = Math.min(log.startTime, log.endTime);
    const end = Math.max(log.startTime, log.endTime);
    const duration = getLogDurationSeconds(log);
    if (end <= start || !Number.isFinite(duration) || duration <= 0) return;
    const scale = duration / ((end - start) / 1000);
    let cursor = Math.max(start, bounds.start);
    const overlapEnd = Math.min(end, bounds.end);
    while (cursor < overlapEnd) {
      // Advancing elapsed time from the local hour also preserves repeated DST hours.
      const date = new Date(cursor);
      const nextHour = cursor + 60 * 60 * 1000 - date.getMinutes() * 60 * 1000 - date.getSeconds() * 1000 - date.getMilliseconds();
      const segmentEnd = Math.min(nextHour, overlapEnd);
      if (segmentEnd <= cursor) break;
      visit(cursor, ((segmentEnd - cursor) / 1000) * scale, logIndex);
      cursor = segmentEnd;
    }
  });
};

export const aggregateWeekHourDurations = (logs: DurationLog[], range: ActivityStatisticRange, now = new Date()) => {
  const buckets = new Map<string, { duration: number; count: number }>();
  const counted = new Set<string>();
  forEachHourlyDurationSegment(logs, getHourlyDurationRange(range, now), (timestamp, seconds, logIndex) => {
    const date = new Date(timestamp);
    const key = `${(date.getDay() + 6) % 7}-${date.getHours()}`;
    const bucket = buckets.get(key) || { duration: 0, count: 0 };
    bucket.duration += seconds;
    const countKey = `${logIndex}:${key}`;
    if (!counted.has(countKey)) {
      counted.add(countKey);
      bucket.count += 1;
    }
    buckets.set(key, bucket);
  });
  return buckets;
};
