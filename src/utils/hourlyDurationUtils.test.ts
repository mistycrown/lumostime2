/**
 * @file hourlyDurationUtils.test.ts
 * @input Logs spanning local hours, midnight, range boundaries, and pauses.
 * @output Regression checks for weekday/hour attribution and total duration conservation.
 * @pos Test (Statistics)
 * @updated 2026-10-06: Covers elapsed-hour allocation shared by heatmaps and rhythm charts.
 */
import { describe, expect, it } from 'vitest';
import type { Log } from '../types';
import { aggregateWeekHourDurations, forEachHourlyDurationSegment, getHourlyDurationRange } from './hourlyDurationUtils';

const time = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).getTime();
const log = (startTime: number, endTime: number, duration = (endTime - startTime) / 1000): Pick<Log, 'startTime' | 'endTime' | 'duration' | 'isPlanned'> => ({ startTime, endTime, duration });

describe('hourly duration allocation', () => {
  it('splits a Monday record across all elapsed hours while preserving its total', () => {
    const buckets = aggregateWeekHourDurations([log(time(5, 9, 30), time(5, 11, 15))], 'all');
    expect([...buckets]).toEqual([
      ['0-9', { duration: 1800, count: 1 }],
      ['0-10', { duration: 3600, count: 1 }],
      ['0-11', { duration: 900, count: 1 }]
    ]);
    expect([...buckets.values()].reduce((sum, bucket) => sum + bucket.duration, 0)).toBe(6300);
  });

  it('assigns midnight segments to their actual weekdays', () => {
    const buckets = aggregateWeekHourDurations([log(time(4, 23, 30), time(5, 0, 30))], 'all');
    expect(buckets.get('6-23')?.duration).toBe(1800);
    expect(buckets.get('0-0')?.duration).toBe(1800);
    expect(buckets.size).toBe(2);
  });

  it('includes the overlapping part of a record that begins before the selected week', () => {
    const buckets = aggregateWeekHourDurations([log(time(4, 23, 30), time(5, 0, 30))], 'week', new Date(time(6, 12)));
    expect([...buckets]).toEqual([['0-0', { duration: 1800, count: 1 }]]);
  });

  it('scales elapsed segments to effective duration when a record contains pauses', () => {
    const buckets = aggregateWeekHourDurations([log(time(5, 9), time(5, 11), 3600)], 'all');
    expect([...buckets.values()].map((bucket) => bucket.duration)).toEqual([1800, 1800]);
  });

  it('clips the current hour at now and excludes planned, empty, and invalid records', () => {
    const records = [
      log(time(6, 9), time(6, 11)),
      { ...log(time(6, 8), time(6, 9)), isPlanned: true },
      log(time(6, 7), time(6, 7)),
      log(NaN, time(6, 9)),
      log(time(6, 6), time(6, 7), 0)
    ];
    const buckets = aggregateWeekHourDurations(records, 'month', new Date(time(6, 10, 30)));
    expect([...buckets]).toEqual([
      ['1-9', { duration: 3600, count: 1 }], ['1-10', { duration: 1800, count: 1 }]
    ]);
  });

  it('counts one record once in each recurring weekday/hour bucket', () => {
    const buckets = aggregateWeekHourDurations([log(time(5, 0), time(13, 0))], 'all');
    expect(buckets.get('0-0')).toEqual({ duration: 7200, count: 1 });
    expect([...buckets.values()].reduce((sum, bucket) => sum + bucket.duration, 0)).toBe(8 * 86400);
  });

  it('retains second-level precision at fractional hour boundaries', () => {
    const segments: number[] = [];
    forEachHourlyDurationSegment([log(time(5, 10) - 500, time(5, 10) + 500)], getHourlyDurationRange('all'), (_timestamp, seconds) => segments.push(seconds));
    expect(segments).toEqual([0.5, 0.5]);
  });
});
