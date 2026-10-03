/**
 * @file feishuImportRange.test.ts
 * @input Fixed local dates, month/year boundaries, and invalid import selections.
 * @output Regression coverage for import presets and inclusive last-day timestamp bounds.
 * @pos Utility tests (Feishu import range).
 */
import { describe, expect, it } from 'vitest';
import { getFeishuImportPreset, getFeishuImportRangeBounds } from './feishuImportRange';

describe('Feishu import presets', () => {
  const friday = new Date(2026, 9, 2, 12);
  it('fills current and previous weeks from Monday through Sunday across a month boundary', () => {
    expect(getFeishuImportPreset('thisWeek', friday)).toEqual({ startDate: '2026-09-28', endDate: '2026-10-04' });
    expect(getFeishuImportPreset('lastWeek', friday)).toEqual({ startDate: '2026-09-21', endDate: '2026-09-27' });
    expect(getFeishuImportPreset('thisWeek', new Date(2026, 9, 4))).toEqual({ startDate: '2026-09-28', endDate: '2026-10-04' });
  });
  it('fills complete months even when today is the 31st', () => {
    const monthEnd = new Date(2026, 9, 31);
    expect(getFeishuImportPreset('thisMonth', monthEnd)).toEqual({ startDate: '2026-10-01', endDate: '2026-10-31' });
    expect(getFeishuImportPreset('lastMonth', monthEnd)).toEqual({ startDate: '2026-09-01', endDate: '2026-09-30' });
  });
  it('handles previous months across years and leap-year February', () => {
    expect(getFeishuImportPreset('lastMonth', new Date(2026, 0, 31))).toEqual({ startDate: '2025-12-01', endDate: '2025-12-31' });
    expect(getFeishuImportPreset('lastMonth', new Date(2024, 2, 31))).toEqual({ startDate: '2024-02-01', endDate: '2024-02-29' });
    expect(getFeishuImportPreset('lastMonth', new Date(2025, 2, 31))).toEqual({ startDate: '2025-02-01', endDate: '2025-02-28' });
  });
  it('uses local calendar dates rather than UTC serialization', () => {
    expect(getFeishuImportPreset('thisMonth', new Date(2026, 9, 1, 0, 1))).toEqual({ startDate: '2026-10-01', endDate: '2026-10-31' });
  });
});

describe('Feishu import timestamp bounds', () => {
  it('includes the whole final date and allows a single-day selection', () => {
    const range = getFeishuImportRangeBounds({ startDate: '2026-10-02', endDate: '2026-10-02' });
    expect(range.startTime).toBe(new Date(2026, 9, 2).getTime());
    expect(range.endTimeExclusive).toBe(new Date(2026, 9, 3).getTime());
    expect(new Date(2026, 9, 2, 23, 59, 59, 999).getTime()).toBeLessThan(range.endTimeExclusive);
  });
  it('includes an entire multi-day range through a year boundary', () => {
    expect(getFeishuImportRangeBounds({ startDate: '2025-12-31', endDate: '2026-01-01' })).toEqual({
      startTime: new Date(2025, 11, 31).getTime(), endTimeExclusive: new Date(2026, 0, 2).getTime()
    });
  });
  it.each([
    { startDate: '', endDate: '2026-10-02' },
    { startDate: '2026-10-02', endDate: '' },
    { startDate: '2026-10-03', endDate: '2026-10-02' },
    { startDate: '2026-02-30', endDate: '2026-03-01' },
    { startDate: '2025-02-29', endDate: '2025-03-01' },
    { startDate: '2026-1-2', endDate: '2026-10-02' }
  ])('rejects incomplete, reversed or invalid dates: %j', (range) => {
    expect(() => getFeishuImportRangeBounds(range)).toThrow();
  });
});
