/**
 * @file todoRecurringPlanUtils.test.ts
 * @input Recurring todo fixtures, planned logs, and fixed reference dates
 * @output Regression coverage for recurring auto-Plan materialization and deletion locks
 * @pos Test (todo planning automation)
 * @description Verifies finite Repeat auto-Plan windows, existing-plan dedupe, skip/end-date handling, and lock-state rules.
 * @updated 2026-07-31: Added coverage for the shared manual timeline Plan log builder used by drag and AI creation paths.
 * @updated 2026-07-30: Added first regression tests for recurring auto-Plan helpers.
 */
import { describe, expect, test } from 'vitest';
import { Log, TodoItem } from '../types';
import {
  RECURRING_PLAN_SOURCE,
  TIMELINE_PLAN_ACTIVITY_ID,
  TIMELINE_PLAN_CATEGORY_ID,
  buildRecurringPlanInsertions,
  buildRecurringPlanLog,
  buildTimelinePlannedLog,
  getRecurringPlanOccurrenceDateKeys,
  isAutoRecurringPlanDeleteLocked,
  normalizeTodoRecurringPlanConfig,
  removeRecurringAutoPlanLogsFromDate
} from './todoRecurringPlanUtils';

const referenceDate = new Date(2026, 3, 20);

const buildTodo = (overrides: Partial<TodoItem> = {}): TodoItem => ({
  id: 'repeat-todo',
  categoryId: 'cat',
  title: '背单词',
  isCompleted: false,
  recurrenceRule: {
    frequency: 'daily',
    startDate: '2026-04-20'
  },
  recurringPlan: {
    enabled: true,
    startMinutes: 9 * 60,
    endMinutes: 10 * 60,
    horizonCount: 3
  },
  ...overrides
});

const buildPlannedLog = (dateKey: string, overrides: Partial<Log> = {}): Log => {
  const startTime = new Date(`${dateKey}T09:00:00`).getTime();
  const endTime = new Date(`${dateKey}T10:00:00`).getTime();

  return {
    id: `plan-${dateKey}`,
    categoryId: '__timeline_plan__',
    activityId: '__timeline_plan__',
    startTime,
    endTime,
    duration: 3600,
    linkedTodoId: 'repeat-todo',
    isPlanned: true,
    ...overrides
  };
};

describe('todo recurring auto-Plan helpers', () => {
  test('collects a finite occurrence window from today', () => {
    expect(getRecurringPlanOccurrenceDateKeys(buildTodo(), referenceDate)).toEqual([
      '2026-04-20',
      '2026-04-21',
      '2026-04-22'
    ]);
  });

  test('counts existing plans inside the horizon instead of extending the window', () => {
    const insertions = buildRecurringPlanInsertions(
      [buildTodo()],
      [
        buildPlannedLog('2026-04-20'),
        buildPlannedLog('2026-04-21')
      ],
      {
        referenceDate,
        idFactory: () => 'created-plan'
      }
    );

    expect(insertions).toHaveLength(1);
    expect(insertions[0].plannedOccurrenceDate).toBe('2026-04-22');
  });

  test('counts any planned block for the same todo and date as existing', () => {
    const insertions = buildRecurringPlanInsertions(
      [buildTodo()],
      [
        buildPlannedLog('2026-04-20', { planSource: undefined }),
        buildPlannedLog('2026-04-21', { planSource: undefined }),
        buildPlannedLog('2026-04-22', { planSource: undefined })
      ],
      {
        referenceDate,
        idFactory: () => 'created-plan'
      }
    );

    expect(insertions).toEqual([]);
  });

  test('respects skipDates and endDate when building occurrence windows', () => {
    const todo = buildTodo({
      recurrenceRule: {
        frequency: 'weekly',
        startDate: '2026-04-20',
        endDate: '2026-04-24',
        weekdays: [1, 3, 5],
        skipDates: ['2026-04-22']
      },
      recurringPlan: {
        enabled: true,
        startMinutes: 9 * 60,
        endMinutes: 10 * 60,
        horizonCount: 3
      }
    });

    expect(getRecurringPlanOccurrenceDateKeys(todo, referenceDate)).toEqual([
      '2026-04-20',
      '2026-04-24'
    ]);
  });

  test('skips skipDates while continuing to the next valid recurrence occurrence', () => {
    const todo = buildTodo({
      recurrenceRule: {
        frequency: 'daily',
        startDate: '2026-04-20',
        skipDates: ['2026-04-21']
      },
      recurringPlan: {
        enabled: true,
        startMinutes: 9 * 60,
        endMinutes: 10 * 60,
        horizonCount: 3
      }
    });

    const insertions = buildRecurringPlanInsertions([todo], [], {
      referenceDate,
      idFactory: () => 'created-plan'
    });

    expect(insertions.map((log) => log.plannedOccurrenceDate)).toEqual([
      '2026-04-20',
      '2026-04-22',
      '2026-04-23'
    ]);
  });

  test('builds recurring auto-Plan log metadata and local times', () => {
    const log = buildRecurringPlanLog(buildTodo(), '2026-04-20', () => 'created-plan');

    expect(log).toMatchObject({
      id: 'created-plan',
      linkedTodoId: 'repeat-todo',
      isPlanned: true,
      planSource: RECURRING_PLAN_SOURCE,
      plannedOccurrenceDate: '2026-04-20'
    });
    expect(new Date(log!.startTime).getHours()).toBe(9);
    expect(new Date(log!.endTime).getHours()).toBe(10);
  });

  test('builds manual timeline Plan logs with shared virtual metadata', () => {
    const startTime = new Date('2026-04-20T14:00:00').getTime();
    const endTime = new Date('2026-04-20T15:30:00').getTime();
    const log = buildTimelinePlannedLog(
      buildTodo({ title: '写论文' }),
      startTime,
      endTime,
      {
        idFactory: () => 'manual-plan',
        note: '先写引言'
      }
    );

    expect(log).toMatchObject({
      id: 'manual-plan',
      categoryId: TIMELINE_PLAN_CATEGORY_ID,
      activityId: TIMELINE_PLAN_ACTIVITY_ID,
      startTime,
      endTime,
      duration: 90 * 60,
      title: '计划 · 写论文',
      linkedTodoId: 'repeat-todo',
      isPlanned: true,
      note: '先写引言'
    });
  });

  test('locks auto-Plan deletion only while the source todo switch is enabled', () => {
    const log = buildPlannedLog('2026-04-20', {
      planSource: RECURRING_PLAN_SOURCE,
      plannedOccurrenceDate: '2026-04-20'
    });

    expect(isAutoRecurringPlanDeleteLocked(log, buildTodo())).toBe(true);
    expect(isAutoRecurringPlanDeleteLocked(log, buildTodo({
      recurringPlan: {
        enabled: false,
        startMinutes: 9 * 60,
        endMinutes: 10 * 60,
        horizonCount: 3
      }
    }))).toBe(false);
    expect(isAutoRecurringPlanDeleteLocked(buildPlannedLog('2026-04-20'), buildTodo())).toBe(false);
  });

  test('removes only current-day and future automatic plans for cancelled or deleted todos', () => {
    const todayStart = new Date(2026, 3, 20, 0, 0, 0, 0);
    const logs = [
      buildPlannedLog('2026-04-19', {
        id: 'past-auto-plan',
        planSource: RECURRING_PLAN_SOURCE,
        plannedOccurrenceDate: '2026-04-19'
      }),
      buildPlannedLog('2026-04-20', {
        id: 'today-auto-plan',
        planSource: RECURRING_PLAN_SOURCE,
        plannedOccurrenceDate: '2026-04-20'
      }),
      buildPlannedLog('2026-04-21', {
        id: 'future-auto-plan',
        planSource: RECURRING_PLAN_SOURCE,
        plannedOccurrenceDate: '2026-04-21'
      }),
      buildPlannedLog('2026-04-20', {
        id: 'today-manual-plan',
        planSource: undefined
      }),
      buildPlannedLog('2026-04-21', {
        id: 'other-todo-auto-plan',
        linkedTodoId: 'other-todo',
        planSource: RECURRING_PLAN_SOURCE,
        plannedOccurrenceDate: '2026-04-21'
      })
    ];

    expect(removeRecurringAutoPlanLogsFromDate(logs, ['repeat-todo'], todayStart).map((log) => log.id)).toEqual([
      'past-auto-plan',
      'today-manual-plan',
      'other-todo-auto-plan'
    ]);
  });

  test('normalizes invalid config into bounded same-day values', () => {
    expect(normalizeTodoRecurringPlanConfig({
      enabled: true,
      startMinutes: 23 * 60,
      endMinutes: 8 * 60,
      horizonCount: 999
    })).toEqual({
      enabled: true,
      startMinutes: 23 * 60,
      endMinutes: 23 * 60 + 59,
      horizonCount: 30
    });
  });
});
