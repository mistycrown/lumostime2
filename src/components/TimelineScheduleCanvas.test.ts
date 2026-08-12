/**
 * @file TimelineScheduleCanvas.test.ts
 * @input Sample time intervals including overlap boundaries
 * @output Regression coverage for parallel schedule block columns, actionable idle-time gaps, planning time ranges, and quick-color ranges
 * @pos Test
 * @updated 2026-08-06: Covers multiline note expansion for sufficiently tall timeline blocks.
 * @updated 2026-07-31: Covers locked recurring auto-Plan blocks staying out of time-edit mode.
 * @updated 2026-07-30: Covers whole-block drag shifting while preserving duration and daily bounds.
 * @updated 2026-07-30: Covers quick-color range minimums for click-to-drag formal record creation.
 * @updated 2026-07-30: Covers compact two-digit hour-only grid labels and alpha backgrounds for timeline activity colors.
 * @updated 2026-08-09: Covers all-day idle-gap calculation, planned-block exclusion, threshold filtering, and the current-time trailing boundary.
 * @updated 2026-08-12: Covers contiguous schedule blocks staying on one visual track.
 */
import { describe, expect, test, vi } from 'vitest';
import { Log, TodoItem } from '../types';
import {
  formatTimelineHourLabel,
  getMinimumTimelineRange,
  getPlannedTimeRange,
  getScheduleBlockHeight,
  getTimelineIdleGaps,
  getTimelineBlockBackground,
  isTimelinePlanTimeEditingLocked,
  isTimelineLogNoteExpanded,
  layoutParallelScheduleBlocks,
  MIN_SCHEDULE_BLOCK_HEIGHT,
  scheduleTimelineRecordDetailOpen,
  shiftTimeRangeWithinDay,
  TIMELINE_TOP_PADDING
} from './TimelineScheduleCanvas';

describe('layoutParallelScheduleBlocks', () => {
  test('finds start, intermediate, and trailing idle time while ignoring planned blocks', () => {
    const minute = 60 * 1000;
    expect(getTimelineIdleGaps([
      { id: 'first', startTime: 100 * minute, endTime: 200 * minute, isPlanned: false },
      { id: 'plan', startTime: 300 * minute, endTime: 400 * minute, isPlanned: true },
      { id: 'last', startTime: 500 * minute, endTime: 600 * minute, isPlanned: false }
    ], 0, 24 * 60 * minute, 1)).toEqual([
      { id: 'idle-0-6000000', startTime: 0, endTime: 100 * minute },
      { id: 'idle-12000000-30000000', startTime: 200 * minute, endTime: 500 * minute },
      { id: 'idle-36000000-86400000', startTime: 600 * minute, endTime: 24 * 60 * minute }
    ]);
  });

  test('merges overlapping real records and stops the trailing idle time at the supplied current-time boundary', () => {
    const minute = 60 * 1000;
    expect(getTimelineIdleGaps([
      { id: 'first', startTime: 100 * minute, endTime: 300 * minute, isPlanned: false },
      { id: 'overlap', startTime: 200 * minute, endTime: 400 * minute, isPlanned: false }
    ], 0, 500 * minute, 1)).toEqual([
      { id: 'idle-0-6000000', startTime: 0, endTime: 100 * minute },
      { id: 'idle-24000000-30000000', startTime: 400 * minute, endTime: 500 * minute }
    ]);
  });

  test('uses the whole available day for an empty day and filters gaps below the configured threshold', () => {
    const minute = 60 * 1000;
    expect(getTimelineIdleGaps([], 0, 60 * minute, 60)).toEqual([
      { id: 'idle-0-3600000', startTime: 0, endTime: 60 * minute }
    ]);
    expect(getTimelineIdleGaps([], 0, 59 * minute, 60)).toEqual([]);
    expect(getTimelineIdleGaps([], 100 * minute, 90 * minute, 1)).toEqual([]);
  });

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

  test('keeps directly contiguous records in the same visual track', () => {
    const blocks = layoutParallelScheduleBlocks([
      { id: 'first', startMinutes: 40, endMinutes: 43 },
      { id: 'second', startMinutes: 43, endMinutes: 48 }
    ]);

    expect(blocks.map(({ id, column, columnCount }) => ({ id, column, columnCount }))).toEqual([
      { id: 'first', column: 0, columnCount: 1 },
      { id: 'second', column: 0, columnCount: 1 }
    ]);
  });

  test('treats second-level boundaries shown in the same minute as contiguous', () => {
    const blocks = layoutParallelScheduleBlocks([
      { id: 'first', startMinutes: 40, endMinutes: 43.9 },
      { id: 'second', startMinutes: 43.1, endMinutes: 48 }
    ]);

    expect(blocks.map(({ id, column, columnCount }) => ({ id, column, columnCount }))).toEqual([
      { id: 'first', column: 0, columnCount: 1 },
      { id: 'second', column: 0, columnCount: 1 }
    ]);
  });

  test('keeps a small breathing space before the 00:00 line', () => {
    expect(TIMELINE_TOP_PADDING).toBe(12);
  });

  test('uses compact two-digit hour labels and hides only the top 00 label', () => {
    expect(formatTimelineHourLabel(0)).toBe('');
    expect(formatTimelineHourLabel(1)).toBe('01');
    expect(formatTimelineHourLabel(12)).toBe('12');
    expect(formatTimelineHourLabel(24)).toBe('24');
  });

  test('creates 30-minute plans snapped to five-minute boundaries within the day', () => {
    expect(getPlannedTimeRange(62)).toEqual({ startMinutes: 60, endMinutes: 90 });
    expect(getPlannedTimeRange(1438)).toEqual({ startMinutes: 1410, endMinutes: 1440 });
  });

  test('expands notes only on sufficiently tall timeline blocks', () => {
    expect(isTimelineLogNoteExpanded(87)).toBe(false);
    expect(isTimelineLogNoteExpanded(88)).toBe(true);
  });

  test('keeps locked recurring auto-Plan blocks out of time editing', () => {
    const todo: TodoItem = {
      id: 'repeat-todo',
      categoryId: 'cat',
      title: 'Repeat',
      isCompleted: false,
      recurrenceRule: {
        frequency: 'daily',
        startDate: '2026-07-31'
      },
      recurringPlan: {
        enabled: true,
        startMinutes: 9 * 60,
        endMinutes: 10 * 60,
        horizonCount: 3
      }
    };
    const autoPlanLog: Log = {
      id: 'plan-log',
      categoryId: '__timeline_plan__',
      activityId: '__timeline_plan__',
      startTime: new Date('2026-07-31T09:00:00').getTime(),
      endTime: new Date('2026-07-31T10:00:00').getTime(),
      duration: 3600,
      linkedTodoId: 'repeat-todo',
      isPlanned: true,
      planSource: 'recurrence-auto',
      plannedOccurrenceDate: '2026-07-31'
    };

    expect(isTimelinePlanTimeEditingLocked(autoPlanLog, [todo])).toBe(true);
    expect(isTimelinePlanTimeEditingLocked(autoPlanLog, [{
      ...todo,
      recurringPlan: { ...todo.recurringPlan!, enabled: false }
    }])).toBe(false);
  });

  test('keeps quick-color drag ranges at least five minutes within the day', () => {
    expect(getMinimumTimelineRange(60, 60)).toEqual({ startMinutes: 60, endMinutes: 65 });
    expect(getMinimumTimelineRange(1440, 1440)).toEqual({ startMinutes: 1435, endMinutes: 1440 });
    expect(getMinimumTimelineRange(180, 120)).toEqual({ startMinutes: 120, endMinutes: 180 });
  });

  test('shifts a time range by snapped minutes while keeping its duration and day bounds', () => {
    expect(shiftTimeRangeWithinDay(9 * 60 * 60 * 1000, 10 * 60 * 60 * 1000, 15, 0)).toEqual({
      startTime: 9 * 60 * 60 * 1000 + 15 * 60 * 1000,
      endTime: 10 * 60 * 60 * 1000 + 15 * 60 * 1000
    });
    expect(shiftTimeRangeWithinDay(23 * 60 * 60 * 1000 + 30 * 60 * 1000, 24 * 60 * 60 * 1000, 30, 0)).toEqual({
      startTime: 23 * 60 * 60 * 1000 + 30 * 60 * 1000,
      endTime: 24 * 60 * 60 * 1000
    });
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
