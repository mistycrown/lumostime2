import { describe, expect, test } from 'vitest';
import {
  DEFAULT_TIMEPAL_STAGE_THRESHOLDS,
  calculateTimePalStageLevel,
  getSampleFocusMinutesForStage,
  getTimePalStageRanges,
  normalizeTimePalStageThresholds,
  readStoredTimePalStageThresholds,
} from './timePalStageThresholds';

describe('timePalStageThresholds', () => {
  test('falls back to the default thresholds when persisted values are invalid', () => {
    const storage = {
      getItem: () => JSON.stringify([120, 120, 360, 480]),
    } as Pick<Storage, 'getItem'>;

    expect(DEFAULT_TIMEPAL_STAGE_THRESHOLDS).toEqual([120, 240, 360, 480]);
    expect(normalizeTimePalStageThresholds([120, 240, 360, 480])).toEqual([120, 240, 360, 480]);
    expect(normalizeTimePalStageThresholds([120, 120, 360, 480])).toEqual([120, 240, 360, 480]);
    expect(readStoredTimePalStageThresholds(storage)).toEqual([120, 240, 360, 480]);
  });

  test('maps cumulative minutes to the expected stage level', () => {
    const thresholds = [30, 60, 120, 180] as const;

    expect(calculateTimePalStageLevel(0, thresholds)).toBe(1);
    expect(calculateTimePalStageLevel(29, thresholds)).toBe(1);
    expect(calculateTimePalStageLevel(30, thresholds)).toBe(2);
    expect(calculateTimePalStageLevel(60, thresholds)).toBe(3);
    expect(calculateTimePalStageLevel(120, thresholds)).toBe(4);
    expect(calculateTimePalStageLevel(180, thresholds)).toBe(5);
  });

  test('builds readable stage ranges and sample minutes from thresholds', () => {
    const thresholds = [30, 60, 120, 180] as const;

    expect(getTimePalStageRanges(thresholds)).toEqual([
      { level: 1, startMinutes: 0, endMinutes: 29, label: '小于 30 分钟' },
      { level: 2, startMinutes: 30, endMinutes: 59, label: '30 - 59 分钟' },
      { level: 3, startMinutes: 60, endMinutes: 119, label: '60 - 119 分钟' },
      { level: 4, startMinutes: 120, endMinutes: 179, label: '120 - 179 分钟' },
      { level: 5, startMinutes: 180, endMinutes: null, label: '大于等于 180 分钟' },
    ]);

    expect(getSampleFocusMinutesForStage(1, thresholds)).toBe(15);
    expect(getSampleFocusMinutesForStage(3, thresholds)).toBe(90);
    expect(getSampleFocusMinutesForStage(5, thresholds)).toBe(210);
  });
});
