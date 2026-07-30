/**
 * @file TimelineScheduleCanvas.test.ts
 * @input Sample time intervals including overlap boundaries
 * @output Regression coverage for parallel schedule block columns and planning time ranges
 * @pos Test
 * @updated 2026-07-30: Covers alpha backgrounds for Tailwind and hexadecimal timeline activity colors.
 */
import { describe, expect, test, vi } from 'vitest';
import { getPlannedTimeRange, getScheduleBlockHeight, getTimelineBlockBackground, layoutParallelScheduleBlocks, MIN_SCHEDULE_BLOCK_HEIGHT, scheduleTimelineRecordDetailOpen, TIMELINE_TOP_PADDING } from './TimelineScheduleCanvas';

describe('layoutParallelScheduleBlocks', () => {
  test('places overlapping records in separate equal-width columns', () => {
    const blocks = layoutParallelScheduleBlocks([
      { id: 'first', startMinutes: 60, endMinutes: 180 },
      { id: 'second', startMinutes: 90, endMinutes: 150 },
      { id: 'third', startMinutes: 120, endMinutes: 210 }
    ]);

    expect(blocks.map(({ id, column, columnCount }) => ({ id, column, columnCount }))).toEqual([
      { id: 'first', column: 0, columnCount: 3 },
      { id: 'second', column: 1, columnCount: 3 },
      { id: 'third', column: 2, columnCount: 3 }
    ]);
  });

  test('reuses a released column and keeps adjacent records independent', () => {
    const blocks = layoutParallelScheduleBlocks([
      { id: 'first', startMinutes: 60, endMinutes: 120 },
      { id: 'second', startMinutes: 90, endMinutes: 180 },
      { id: 'third', startMinutes: 120, endMinutes: 210 },
      { id: 'later', startMinutes: 240, endMinutes: 300 }
    ]);

    expect(blocks.find((block) => block.id === 'third')).toMatchObject({ column: 0, columnCount: 2 });
    expect(blocks.find((block) => block.id === 'later')).toMatchObject({ column: 0, columnCount: 1 });
  });

  test('keeps a small breathing space before the 00:00 line', () => {
    expect(TIMELINE_TOP_PADDING).toBe(12);
  });

  test('creates 30-minute plans snapped to five-minute boundaries within the day', () => {
    expect(getPlannedTimeRange(62)).toEqual({ startMinutes: 60, endMinutes: 90 });
    expect(getPlannedTimeRange(1438)).toEqual({ startMinutes: 1410, endMinutes: 1440 });
  });

  test('keeps short records close to their true duration instead of expanding them into long blocks', () => {
    expect(getScheduleBlockHeight(14, 88)).toBeCloseTo(20.53, 2);
    expect(getScheduleBlockHeight(1, 88)).toBe(MIN_SCHEDULE_BLOCK_HEIGHT);
  });

  test('applies requested alpha to Tailwind activity colors instead of returning an opaque light color', () => {
    expect(getTimelineBlockBackground('bg-lime-500 text-lime-600', 0.06)).toBe('rgba(132, 204, 22, 0.06)');
  });

  test('keeps hexadecimal activity colors on the same alpha conversion path', () => {
    expect(getTimelineBlockBackground('#84cc16', 0.14)).toBe('rgba(132, 204, 22, 0.14)');
  });

  test('opens a record detail after the initiating pointer sequence has finished', () => {
    vi.useFakeTimers();
    const openDetail = vi.fn();

    scheduleTimelineRecordDetailOpen(openDetail);
    expect(openDetail).not.toHaveBeenCalled();

    vi.runOnlyPendingTimers();
    expect(openDetail).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
