/**
 * @file calendarHeatmap.test.ts
 * @input Clustered sleep durations, clock positions and calendar scale edge cases.
 * @output Coverage for shared heat levels without treating missing days as zero measurements.
 * @updated 2026-10-25: Verifies monotonic bands, ties and consistent full-range comparisons.
 */
import { describe, expect, it } from 'vitest';
import { getCalendarHeatmapLevel } from './calendarHeatmap';

describe('calendar heat levels', () => {
  it('spreads similar recorded sleep durations over all five levels', () => {
    expect([7, 7.5, 8, 8.5, 9].map(hours => getCalendarHeatmapLevel(hours * 3600, 7 * 3600, 9 * 3600)))
      .toEqual([0, 1, 2, 3, 4]);
  });

  it('keeps equal values equal across months and clamps values to the shared range', () => {
    expect([-3, 0, 2, 4, 6, 8, 10, 15].map(value => getCalendarHeatmapLevel(value, 0, 10)))
      .toEqual([0, 0, 1, 2, 3, 4, 4, 4]);
  });

  it('uses the middle level when all recordings are identical', () => {
    expect(getCalendarHeatmapLevel(8, 8, 8)).toBe(2);
    expect(getCalendarHeatmapLevel(0, 0, 0)).toBe(2);
  });

  it('orders extended clock positions through midnight without wrapping the scale', () => {
    const clocks = [1380, 1410, 1440, 1470, 1500];
    expect(clocks.map(clock => getCalendarHeatmapLevel(clock, 1380, 1500))).toEqual([0, 1, 2, 3, 4]);
  });
});
