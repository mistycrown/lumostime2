/**
 * @file statsLogGroupingUtils.test.ts
 * @input Local calendar boundaries and filtered timeline records
 * @output Regression checks for partial weeks, leap days, overnight logs and hierarchical totals
 * @updated 2026-10-17: Covers week/month/year grouping without dropped or duplicated records.
 * @updated 2026-10-17: Verifies one-level loading, linear scans, cache reuse and source invalidation with a large annual dataset.
 */
import { describe, expect, it } from 'vitest';
import type { Log } from '../types';
import { getDateRange } from '../components/StatsView/statsUtils';
import { buildStatsLogGroups, getStatsLogsDuration, type StatsLogGroup } from './statsLogGroupingUtils';

const date = (year: number, month: number, day: number, hour = 0) => new Date(year, month - 1, day, hour);
const log = (id: string, start: Date, minutes: number): Log => ({
  id, categoryId: 'study', activityId: 'reading', startTime: start.getTime(),
  endTime: start.getTime() + minutes * 60000, duration: 0
});
const leafLogs = (groups: StatsLogGroup[]): Log[] => groups.flatMap(group => group.kind === 'day' ? group.loadLogs() : leafLogs(group.loadChildren()));
const checkTotals = (groups: StatsLogGroup[]) => groups.forEach(group => {
  const children = group.loadChildren();
  if (group.kind === 'day') {
    expect(group.duration).toBe(getStatsLogsDuration(group.loadLogs()));
    expect(group.count).toBe(group.loadLogs().length);
  } else {
    expect(children.reduce((sum, child) => sum + child.duration, 0)).toBe(group.duration);
    expect(children.reduce((sum, child) => sum + child.count, 0)).toBe(group.count);
    checkTotals(children);
  }
});

describe('statistics log period grouping', () => {
  it('loads only one level, scans only the expanded period and reuses cached results', () => {
    const reads = Array.from({ length: 12 }, () => 0);
    let idReads = 0;
    const logs = Array.from({ length: 12000 }, (_, index): Log => {
      const month = Math.floor(index / 1000);
      const start = new Date(2026, month, index % 28 + 1, 9).getTime();
      return {
        get id() { idReads++; return `record-${index}`; },
        categoryId: 'study', activityId: 'reading', duration: 60,
        get startTime() { reads[month]++; return start; },
        get endTime() { reads[month]++; return start + 60000; },
        get note() { throw new Error('Collapsed periods must not read record content'); }
      };
    });
    const groups = buildStatsLogGroups(logs, 'year', getDateRange(date(2026, 6, 1), 'year'));
    expect(groups).toHaveLength(12);
    expect(groups.every(group => group.count === 1000)).toBe(true);
    expect(reads).toEqual(Array.from({ length: 12 }, () => 3000));
    expect(idReads).toBe(0);

    const before = [...reads];
    const weeks = groups[5].loadChildren();
    expect(weeks.length).toBeGreaterThanOrEqual(4);
    reads.forEach((count, month) => expect(count - before[month]).toBe(month === 5 ? 3000 : 0));
    const cachedReads = [...reads];
    expect(groups[5].loadChildren()).toBe(weeks);
    expect(reads).toEqual(cachedReads);
    expect(idReads).toBe(0);

    const days = weeks[0].loadChildren();
    expect(weeks[0].loadChildren()).toBe(days);
    expect(idReads).toBe(0);
    const records = days.find(group => group.count > 0)!.loadLogs();
    expect(records.length).toBeLessThan(1000);
    expect(idReads).toBeGreaterThan(0);
    const sortedReads = [...reads];
    const sortedIdReads = idReads;
    expect(days.find(group => group.count > 0)!.loadLogs()).toBe(records);
    expect(reads).toEqual(sortedReads);
    expect(idReads).toBe(sortedIdReads);
  });

  it('rebuilds lazy caches for a new source while keeping loaded snapshots stable', () => {
    const first = log('first', date(2026, 10, 16, 9), 20);
    const period = getDateRange(date(2026, 10, 16), 'year');
    const original = buildStatsLogGroups([first], 'year', period);
    const loadedWeeks = original[9].loadChildren();
    const next = buildStatsLogGroups([first, log('new', date(2026, 10, 16, 10), 15)], 'year', period);
    expect(next[9].count).toBe(2);
    expect(next[9].duration).toBe(2100);
    expect(next[9].loadChildren()).not.toBe(loadedWeeks);
    expect(original[9].count).toBe(1);
    expect(original[9].loadChildren()).toBe(loadedWeeks);
  });

  it('lists all seven local days Monday to Sunday across a year boundary', () => {
    const period = getDateRange(date(2026, 1, 1), 'week');
    const logs = [log('december', date(2025, 12, 29, 9), 30), log('january', date(2026, 1, 4, 8), 20)];
    const groups = buildStatsLogGroups(logs, 'week', period);
    expect(groups).toHaveLength(7);
    expect(groups[0].label).toBe('12月29日');
    expect(groups[0].caption).toBe('周一');
    expect(groups[6].label).toBe('1月4日');
    expect(groups[6].caption).toBe('周日');
    expect(groups[1].loadLogs()).toEqual([]);
    expect(leafLogs(groups).map(item => item.id)).toEqual(['december', 'january']);
    checkTotals(groups);
  });

  it('clips calendar weeks to a leap-year February without duplicate or missing days', () => {
    const period = getDateRange(date(2024, 2, 20), 'month');
    const logs = Array.from({ length: 29 }, (_, index) => log(`day-${index + 1}`, date(2024, 2, index + 1, 9), 10));
    const groups = buildStatsLogGroups(logs, 'month', period);
    expect(groups).toHaveLength(5);
    expect(groups[0].caption).toBe('2.01 — 2.04');
    expect(groups[4].caption).toBe('2.26 — 2.29');
    expect(groups.flatMap(group => group.loadChildren())).toHaveLength(29);
    expect(new Set(leafLogs(groups).map(item => item.id)).size).toBe(29);
    expect(groups.every(group => group.start.getMonth() === 1 && group.end.getMonth() === 1)).toBe(true);
    checkTotals(groups);
  });

  it('shows twelve months and attributes a shared calendar week only to its own month portions', () => {
    const logs = [log('jan-end', date(2026, 1, 31, 9), 45), log('feb-start', date(2026, 2, 1, 9), 15)];
    const groups = buildStatsLogGroups(logs, 'year', getDateRange(date(2026, 10, 16), 'year'));
    expect(groups).toHaveLength(12);
    expect(groups[0].loadChildren().at(-1)?.caption).toBe('1.26 — 1.31');
    expect(groups[1].loadChildren()[0].caption).toBe('2.01 — 2.01');
    expect(groups[0].duration).toBe(2700);
    expect(groups[1].duration).toBe(900);
    expect(groups[2].loadChildren()).toEqual([]);
    expect(leafLogs(groups).map(item => item.id)).toEqual(['jan-end', 'feb-start']);
    checkTotals(groups);
  });

  it('keeps an overnight record on its start day and preserves its full chart duration', () => {
    const overnight = log('overnight', date(2026, 10, 16, 23), 120);
    const logs = Object.freeze([overnight]) as unknown as Log[];
    const groups = buildStatsLogGroups(logs, 'week', getDateRange(date(2026, 10, 16), 'week'));
    expect(groups[4].loadLogs()).toEqual([overnight]);
    expect(groups[4].duration).toBe(7200);
    expect(groups[5].loadLogs()).toEqual([]);
    expect(leafLogs(groups)).toHaveLength(1);
  });

  it('leaves daily records ungrouped and uses timestamp durations like the chart', () => {
    const logs = [log('reading', date(2026, 10, 16, 9), 25)];
    expect(buildStatsLogGroups(logs, 'day', getDateRange(date(2026, 10, 16), 'day'))).toEqual([]);
    expect(getStatsLogsDuration(logs)).toBe(1500);
    expect(getStatsLogsDuration([{ ...logs[0], endTime: logs[0].startTime - 1000 }])).toBe(0);
  });
});
