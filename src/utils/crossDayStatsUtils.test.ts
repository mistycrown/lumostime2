/**
 * @file crossDayStatsUtils.test.ts
 * @input Split, overlapping, interrupted and cross-period activity logs.
 * @output Regression coverage for local overnight aggregation and clock metrics.
 * @pos Test (Statistics)
 * @updated 2026-10-25: Covers complete nights, missing days and calendar boundaries.
 * @updated 2026-10-25: Covers four-digit time validation and multi-year all-time ranges.
 */
import { describe, expect, it } from 'vitest';
import type { Log } from '../types';
import { buildCrossDayStats, formatCrossDayClock, getCrossDayDateKeys, getCrossDayValue, parseCrossDayTimeInput } from './crossDayStatsUtils';

const log = (start: string, end: string, overrides: Partial<Log> = {}): Log => ({
  id: start + end, activityId: 'sleep', categoryId: 'rest', startTime: new Date(start).getTime(),
  endTime: new Date(end).getTime(), duration: (new Date(end).getTime() - new Date(start).getTime()) / 1000, ...overrides
});
const now = new Date('2026-10-25T15:00:00');

describe('cross-day activity aggregation', () => {
  it('accepts only complete valid four-digit times', () => {
    expect(parseCrossDayTimeInput('0000')).toBe(0);
    expect(parseCrossDayTimeInput('1200')).toBe(720);
    expect(parseCrossDayTimeInput('2359')).toBe(1439);
    for (const value of ['', '12', '120', '2400', '1260', '12:00', '１２３４', '12345']) expect(parseCrossDayTimeInput(value)).toBeNull();
  });
  it('keeps all-time dates across years and bounds empty/future histories to today', () => {
    const keys = getCrossDayDateKeys('all', now, '2024-12-31');
    expect(keys[0]).toBe('2024-12-31');
    expect(keys.at(-1)).toBe('2026-10-25');
    expect(keys).toContain('2025-01-01');
    expect(getCrossDayDateKeys('all', now)).toEqual(['2026-10-25']);
    expect(getCrossDayDateKeys('all', now, '2027-01-01')).toEqual(['2026-10-25']);
  });
  it('joins midnight splits and assigns the complete night to the following date', () => {
    const stats = buildCrossDayStats([
      log('2026-10-24T23:30:00', '2026-10-24T23:59:59.999'),
      log('2026-10-25T00:00:00', '2026-10-25T07:30:00')
    ], 720, now);
    expect([...stats.keys()]).toEqual(['2026-10-25']);
    const night = stats.get('2026-10-25')!;
    expect(night.duration).toBe(8 * 3600);
    expect(night.intervals).toHaveLength(1);
    expect(getCrossDayValue(night, 'start')).toBe(23 * 60 + 30);
    expect(getCrossDayValue(night, 'end')).toBe(31 * 60 + 30);
  });

  it('unions overlapping records without counting night-time wake gaps', () => {
    const night = buildCrossDayStats([
      log('2026-10-24T23:00:00', '2026-10-25T02:00:00'),
      log('2026-10-25T01:00:00', '2026-10-25T03:00:00'),
      log('2026-10-25T04:00:00', '2026-10-25T07:00:00')
    ], 720, now).get('2026-10-25')!;
    expect(night.duration).toBe(7 * 3600);
    expect(night.intervals).toHaveLength(2);
    expect(getCrossDayValue(night, 'start')).toBe(23 * 60);
    expect(getCrossDayValue(night, 'end')).toBe(31 * 60);
  });

  it('handles after-midnight starts and continuous clock averages', () => {
    const stats = buildCrossDayStats([
      log('2026-10-23T23:30:00', '2026-10-24T07:00:00'),
      log('2026-10-25T00:30:00', '2026-10-25T08:00:00')
    ], 720, now);
    const values = [...stats.values()].map(night => getCrossDayValue(night, 'start'));
    expect(values).toEqual([1410, 1470]);
    expect(formatCrossDayClock((values[0] + values[1]) / 2)).toBe('00:00');
  });

  it('retains the preceding month/year segment before selecting a range', () => {
    const stats = buildCrossDayStats([
      log('2025-12-31T23:00:00', '2026-01-01T00:00:00'),
      log('2026-01-01T00:00:00', '2026-01-01T07:00:00')
    ], 720, now);
    expect(getCrossDayDateKeys('month', new Date(2026, 0, 2))).toEqual(['2026-01-01', '2026-01-02']);
    expect(stats.get('2026-01-01')?.duration).toBe(8 * 3600);
    expect(stats.has('2026-01-02')).toBe(false);
  });

  it('uses half-open configurable boundaries without losing activity duration', () => {
    const stats = buildCrossDayStats([log('2026-10-24T09:00:00', '2026-10-24T11:00:00')], 600, now);
    expect(stats.get('2026-10-24')?.duration).toBe(3600);
    expect(stats.get('2026-10-25')?.duration).toBe(3600);
    const exactEnd = buildCrossDayStats([log('2026-10-24T22:00:00', '2026-10-25T12:00:00')], 720, now);
    expect([...exactEnd.keys()]).toEqual(['2026-10-25']);
  });

  it('excludes invalid, planned and unfinished records', () => {
    expect(buildCrossDayStats([
      log('2026-10-24T23:00:00', '2026-10-25T07:00:00', { isPlanned: true }),
      log('2026-10-25T14:00:00', '2026-10-25T16:00:00'),
      log('2026-10-25T07:00:00', '2026-10-25T06:00:00'),
      log('2026-10-25T07:00:00', '2026-10-25T07:00:00'),
      log('2026-10-25T07:00:00', '2026-10-25T08:00:00', { startTime: NaN })
    ], 720, now).size).toBe(0);
  });

  it('builds rolling and Monday-based calendar ranges through today only', () => {
    expect(getCrossDayDateKeys('7d', now)).toHaveLength(7);
    expect(getCrossDayDateKeys('30d', now)[0]).toBe('2026-09-26');
    expect(getCrossDayDateKeys('week', now)[0]).toBe('2026-10-19');
    expect(getCrossDayDateKeys('year', now).at(-1)).toBe('2026-10-25');
  });

  it('uses elapsed duration and local clock coordinates over daylight-saving changes', () => {
    const originalZone = process.env.TZ;
    try {
      process.env.TZ = 'America/New_York';
      const night = buildCrossDayStats([log('2026-03-07T23:00:00', '2026-03-08T07:00:00')], 720, now).get('2026-03-08')!;
      expect(night.duration).toBe(7 * 3600);
      expect(getCrossDayValue(night, 'end')).toBe(31 * 60);
      expect(getCrossDayDateKeys('7d', new Date(2026, 2, 10))).toHaveLength(7);
      const shifted = buildCrossDayStats([log('2026-03-08T04:00:00', '2026-03-09T03:00:00')], 150, now);
      expect(shifted.get('2026-03-09')?.duration).toBe(22.5 * 3600);
      expect(shifted.get('2026-03-10')?.duration).toBe(0.5 * 3600);
      const fallNight = buildCrossDayStats([log('2026-11-01T00:00:00', '2026-11-01T07:00:00')], 720, new Date(2026, 10, 2)).get('2026-11-01')!;
      expect(fallNight.duration).toBe(8 * 3600);
      expect(getCrossDayValue(fallNight, 'end')).toBe(31 * 60);
    } finally {
      if (originalZone === undefined) delete process.env.TZ;
      else process.env.TZ = originalZone;
    }
  });
});
