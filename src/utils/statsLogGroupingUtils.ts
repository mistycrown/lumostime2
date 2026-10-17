/**
 * @file statsLogGroupingUtils.ts
 * @input Chart-filtered logs, statistics range and inclusive local date boundaries
 * @output Chronological day/week/month groups with matching durations and record counts
 * @description Builds expandable period summaries; calendar weeks are clipped to their parent month.
 * @updated 2026-10-17: Adds week-to-day, month-to-week and year-to-month log grouping.
 */
import type { Log } from '../types';
import { getLocalDateStr } from './dateUtils';

export type StatsLogRange = 'day' | 'week' | 'month' | 'year';
export interface StatsLogGroup {
  id: string;
  kind: 'day' | 'week' | 'month';
  label: string;
  caption: string;
  start: Date;
  end: Date;
  logs: Log[];
  duration: number;
  children: StatsLogGroup[];
}

export const getStatsLogsDuration = (logs: Log[]): number => logs.reduce(
  (total, log) => total + Math.max(0, (log.endTime - log.startTime) / 1000), 0
);

const shortDate = (date: Date) => `${date.getMonth() + 1}.${String(date.getDate()).padStart(2, '0')}`;

export const buildStatsLogGroups = (
  logs: Log[],
  range: StatsLogRange,
  period: { start: Date; end: Date }
): StatsLogGroup[] => {
  if (range === 'day') return [];
  const groups: StatsLogGroup[] = [];
  let cursor = new Date(period.start);
  cursor.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= period.end.getTime()) {
    const start = new Date(cursor);
    const next = new Date(cursor);
    const kind = range === 'year' ? 'month' : range === 'month' ? 'week' : 'day';
    if (kind === 'month') {
      next.setMonth(next.getMonth() + 1, 1);
    } else if (kind === 'week') {
      next.setDate(next.getDate() + 7 - ((next.getDay() + 6) % 7));
    } else {
      next.setDate(next.getDate() + 1);
    }
    const end = new Date(Math.min(next.getTime() - 1, period.end.getTime()));
    // Each record belongs to its start date, including overnight records counted by the chart.
    const groupLogs = logs.filter(log => log.startTime >= start.getTime() && log.startTime <= end.getTime());
    const label = kind === 'month' ? `${start.getMonth() + 1}月`
      : kind === 'week' ? `第${groups.length + 1}周`
      : `${start.getMonth() + 1}月${start.getDate()}日`;
    const caption = kind === 'day' ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][start.getDay()]
      : kind === 'week' ? `${shortDate(start)} — ${shortDate(end)}` : '';
    const children = groupLogs.length > 0 && kind !== 'day'
      ? buildStatsLogGroups(groupLogs, kind === 'month' ? 'month' : 'week', { start, end })
      : [];
    groups.push({
      id: `${kind}:${getLocalDateStr(start)}`, kind, label, caption, start, end,
      logs: groupLogs, duration: getStatsLogsDuration(groupLogs), children
    });
    cursor = next;
  }
  return groups;
};
