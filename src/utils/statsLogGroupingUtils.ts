/**
 * @file statsLogGroupingUtils.ts
 * @input Chart-filtered logs, statistics range and inclusive local date boundaries
 * @output One level of period summaries with cached, on-demand child and log loaders
 * @description Partitions the current period once; descendants and day sorting are deferred until explicitly requested.
 * @updated 2026-10-17: Replaces eager recursive trees with lazy cached loaders and single-pass period bucketing.
 * @updated 2026-10-17: Adds week-to-day, month-to-week and year-to-month log grouping.
 * @updated 2026-10-17: Preserves scope chart duration semantics throughout all summary levels.
 */
import type { Log } from '../types';
import { getLocalDateStr } from './dateUtils';
import { getLogDurationSeconds } from './scopeStatsUtils';

export type StatsLogRange = 'day' | 'week' | 'month' | 'year';
export type StatsLogDurationMetric = 'elapsed' | 'scope';
export interface StatsLogGroup {
  id: string;
  kind: 'day' | 'week' | 'month';
  label: string;
  caption: string;
  start: Date;
  end: Date;
  count: number;
  duration: number;
  loadChildren: () => StatsLogGroup[];
  loadLogs: () => Log[];
}

const getDuration = (log: Log, metric: StatsLogDurationMetric): number => metric === 'scope'
  ? getLogDurationSeconds(log) : Math.max(0, (log.endTime - log.startTime) / 1000);

export const getStatsLogsDuration = (logs: Log[], metric: StatsLogDurationMetric = 'elapsed'): number => logs.reduce(
  (total, log) => total + getDuration(log, metric), 0
);

const shortDate = (date: Date) => `${date.getMonth() + 1}.${String(date.getDate()).padStart(2, '0')}`;

export const buildStatsLogGroups = (
  logs: Log[],
  range: StatsLogRange,
  period: { start: Date; end: Date },
  metric: StatsLogDurationMetric = 'elapsed'
): StatsLogGroup[] => {
  if (range === 'day') return [];
  const buckets: Array<{ start: Date; end: Date; logs: Log[]; duration: number }> = [];
  const kind = range === 'year' ? 'month' : range === 'month' ? 'week' : 'day';
  let cursor = new Date(period.start);
  cursor.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= period.end.getTime()) {
    const start = new Date(cursor);
    const next = new Date(cursor);
    if (kind === 'month') {
      next.setMonth(next.getMonth() + 1, 1);
    } else if (kind === 'week') {
      next.setDate(next.getDate() + 7 - ((next.getDay() + 6) % 7));
    } else {
      next.setDate(next.getDate() + 1);
    }
    const end = new Date(Math.min(next.getTime() - 1, period.end.getTime()));
    buckets.push({ start, end, logs: [], duration: 0 });
    cursor = next;
  }

  // One pass at the requested level, without rescanning all records for each bucket.
  for (const log of logs) {
    const timestamp = log.startTime;
    let low = 0;
    let high = buckets.length - 1;
    while (low <= high) {
      const middle = (low + high) >>> 1;
      const bucket = buckets[middle];
      if (timestamp < bucket.start.getTime()) high = middle - 1;
      else if (timestamp > bucket.end.getTime()) low = middle + 1;
      else {
        bucket.logs.push(log);
        bucket.duration += getDuration(log, metric);
        break;
      }
    }
  }

  return buckets.map(({ start, end, logs: groupLogs, duration }, index) => {
    const label = kind === 'month' ? `${start.getMonth() + 1}月`
      : kind === 'week' ? `第${index + 1}周`
      : `${start.getMonth() + 1}月${start.getDate()}日`;
    const caption = kind === 'day' ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][start.getDay()]
      : kind === 'week' ? `${shortDate(start)} — ${shortDate(end)}` : '';
    let children: StatsLogGroup[] | undefined;
    let sortedLogs: Log[] | undefined;
    return {
      id: `${kind}:${getLocalDateStr(start)}`, kind, label, caption, start, end,
      count: groupLogs.length, duration,
      loadChildren: () => {
        if (!children) children = groupLogs.length > 0 && kind !== 'day'
          ? buildStatsLogGroups(groupLogs, kind === 'month' ? 'month' : 'week', { start, end }, metric)
          : [];
        return children;
      },
      // Only a day's records are sorted. Parent periods never sort or duplicate the whole subtree.
      loadLogs: () => {
        if (!sortedLogs) sortedLogs = kind === 'day'
          ? [...groupLogs].sort((a, b) => a.startTime - b.startTime || a.id.localeCompare(b.id))
          : [];
        return sortedLogs;
      }
    };
  });
};
