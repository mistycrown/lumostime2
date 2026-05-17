/**
 * @file todoScheduleUtils.test.ts
 * @input Todo schedule helpers with fixed reference dates
 * @output Regression coverage for virtual-category date matching, shared day entries, and week-view badge normalization
 * @pos Test (todo planning utilities)
 * @description Verifies today/tomorrow/this-week filtering and shared per-day entry building against Arrange, Due, recurrence, and Maybe rules without creating occurrence records.
 * @updated 2026-05-17: Added regression coverage for completed-first month-entry priority when one todo matches multiple day badges, while preserving repeat-before-maybe ordering and leaving trace-lane layout unchanged.
 * @updated 2026-05-14: Added regression coverage for recurrence `skipDates`, quick-action next-occurrence resolution, today-or-future `maybeDates`, hydration cleanup helpers, and Maybe ordering in shared day-entry builders.
  * Once I am updated, be sure to update my header comment and the folder's md.

 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Log, TodoItem } from '../types';
import {
  buildWeekTodoBuckets,
  buildTodoDateEntryMap,
  buildTodoDateEntries,
  buildTodoMonthWeekLayout,
  formatMonthlyDayInput,
  formatTodoRecurrenceSummary,
  getNextRecurrenceOccurrenceDateKey,
  formatWeekTodoLineTitle,
  getTodoAssociationTodayTodos,
  getTodoScheduleMatches,
  getTodoScheduleRangeDateKeys,
  isTodoInAssociationTodayCategory,
  matchesRecurrenceRule,
  normalizeMaybeDates,
  normalizeTodoMaybeDates,
  normalizeSkipDates,
  normalizeMonthlyDayInput,
  parseMonthlyDayInput
} from './todoScheduleUtils';

const REFERENCE_DATE = new Date('2026-04-20T12:00:00+08:00');

const buildTodo = (overrides: Partial<TodoItem>): TodoItem => ({
  id: 'todo-1',
  categoryId: 'cat-1',
  title: '测试待办',
  isCompleted: false,
  ...overrides
});

const buildLog = (overrides: Partial<Log>): Log => ({
  id: 'log-1',
  activityId: 'activity-1',
  categoryId: 'category-1',
  startTime: new Date('2026-04-20T09:00:00+08:00').getTime(),
  endTime: new Date('2026-04-20T10:00:00+08:00').getTime(),
  duration: 3600,
  ...overrides
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(REFERENCE_DATE);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('todoScheduleUtils virtual category helpers', () => {
  test('builds Monday-based date keys for today, tomorrow, and this week', () => {
    expect(getTodoScheduleRangeDateKeys('today', REFERENCE_DATE)).toEqual(['2026-04-20']);
    expect(getTodoScheduleRangeDateKeys('tomorrow', REFERENCE_DATE)).toEqual(['2026-04-21']);
    expect(getTodoScheduleRangeDateKeys('thisWeek', REFERENCE_DATE)).toEqual([
      '2026-04-20',
      '2026-04-21',
      '2026-04-22',
      '2026-04-23',
      '2026-04-24',
      '2026-04-25',
      '2026-04-26'
    ]);
  });

  test('prefers Due over Arrange on the same date but keeps recurrence badges', () => {
    const todo = buildTodo({
      scheduledDate: '2026-04-20',
      deadlineDate: '2026-04-20',
      recurrenceRule: {
        frequency: 'daily',
        startDate: '2026-04-20'
      }
    });

    expect(getTodoScheduleMatches(todo, 'today', REFERENCE_DATE)).toEqual([
      { dateKey: '2026-04-20', kind: 'deadline' },
      { dateKey: '2026-04-20', kind: 'recurring' }
    ]);
  });

  test('collects every matching date across the current week for recurring todos', () => {
    const todo = buildTodo({
      recurrenceRule: {
        frequency: 'weekly',
        startDate: '2026-04-20',
        weekdays: [1, 3, 5]
      }
    });

    expect(getTodoScheduleMatches(todo, 'thisWeek', REFERENCE_DATE)).toEqual([
      { dateKey: '2026-04-20', kind: 'recurring' },
      { dateKey: '2026-04-22', kind: 'recurring' },
      { dateKey: '2026-04-24', kind: 'recurring' }
    ]);
  });

  test('skips explicitly excluded recurring dates before matching the current week', () => {
    const todo = buildTodo({
      recurrenceRule: {
        frequency: 'weekly',
        startDate: '2026-04-20',
        weekdays: [1, 3, 5],
        skipDates: ['2026-04-22']
      }
    });

    expect(getTodoScheduleMatches(todo, 'thisWeek', REFERENCE_DATE)).toEqual([
      { dateKey: '2026-04-20', kind: 'recurring' },
      { dateKey: '2026-04-24', kind: 'recurring' }
    ]);
  });

  test('matches only weekdays that belong to the weekly recurrence pattern', () => {
    const weeklyRule = {
      frequency: 'weekly' as const,
      startDate: '2026-04-20',
      weekdays: [2],
      interval: 1
    };

    expect(matchesRecurrenceRule(weeklyRule, '2026-04-21')).toBe(true);
    expect(matchesRecurrenceRule(weeklyRule, '2026-04-22')).toBe(false);
    expect(matchesRecurrenceRule(weeklyRule, '2026-04-28')).toBe(true);
  });

  test('normalizes maybe dates to today-or-future unique valid keys', () => {
    expect(normalizeMaybeDates([
      '2026-04-20',
      '2026-04-24',
      '2026-04-24',
      '2026-04-19',
      'invalid',
      '2026-04-21'
    ], REFERENCE_DATE)).toEqual([
      '2026-04-20',
      '2026-04-21',
      '2026-04-24'
    ]);
  });

  test('normalizes hydrated todo maybe dates by removing only stale past entries', () => {
    expect(normalizeTodoMaybeDates(buildTodo({
      maybeDates: ['2026-04-19', '2026-04-20', '2026-04-22']
    }), REFERENCE_DATE).maybeDates).toEqual([
      '2026-04-20',
      '2026-04-22'
    ]);
  });

  test('normalizes skip dates to today-or-future unique valid keys', () => {
    expect(normalizeSkipDates([
      '2026-04-20',
      '2026-04-20',
      '2026-04-19',
      'invalid',
      '2026-04-24'
    ], REFERENCE_DATE)).toEqual([
      '2026-04-20',
      '2026-04-24'
    ]);
  });

  test('resolves the next visible recurrence occurrence after skipped dates', () => {
    expect(getNextRecurrenceOccurrenceDateKey({
      frequency: 'weekly',
      startDate: '2026-04-20',
      weekdays: [1, 3, 5],
      skipDates: ['2026-04-20']
    }, REFERENCE_DATE)).toBe('2026-04-22');

    expect(getNextRecurrenceOccurrenceDateKey({
      frequency: 'daily',
      startDate: '2026-04-18',
      endDate: '2026-04-19'
    }, REFERENCE_DATE)).toBe(null);
  });

  test('keeps legacy monthly 31st rules skipping short months unless fallback is enabled', () => {
    expect(matchesRecurrenceRule({
      frequency: 'monthly',
      startDate: '2026-01-31',
      monthDays: [31]
    }, '2026-02-28')).toBe(false);

    expect(matchesRecurrenceRule({
      frequency: 'monthly',
      startDate: '2026-01-31',
      monthDays: [31],
      fallbackToMonthEnd: true
    }, '2026-02-28')).toBe(true);

    expect(matchesRecurrenceRule({
      frequency: 'monthly',
      startDate: '2026-01-31',
      monthDays: [31],
      fallbackToMonthEnd: true
    }, '2026-04-30')).toBe(true);

    expect(matchesRecurrenceRule({
      frequency: 'monthly',
      startDate: '2026-01-31',
      monthDays: [29, 30, 31],
      fallbackToMonthEnd: true
    }, '2026-02-28')).toBe(true);

    expect(matchesRecurrenceRule({
      frequency: 'monthly',
      startDate: '2026-01-31',
      monthDays: [29, 30, 31],
      fallbackToMonthEnd: true
    }, '2026-02-27')).toBe(false);
  });

  test('matches only dates that belong to the monthly recurrence pattern', () => {
    expect(matchesRecurrenceRule({
      frequency: 'monthly',
      startDate: '2026-01-15',
      monthDays: [15]
    }, '2026-05-15')).toBe(true);

    expect(matchesRecurrenceRule({
      frequency: 'monthly',
      startDate: '2026-01-15',
      monthDays: [15]
    }, '2026-05-14')).toBe(false);

    expect(matchesRecurrenceRule({
      frequency: 'monthly',
      startDate: '2026-01-31',
      monthDays: [31],
      fallbackToMonthEnd: true
    }, '2026-04-30')).toBe(true);
  });

  test('parses monthly multi-day input as sorted unique day numbers', () => {
    expect(normalizeMonthlyDayInput('1,15  31a')).toBe('1 15 31 ');
    expect(parseMonthlyDayInput('31 1 15 31')).toEqual([1, 15, 31]);
    expect(formatMonthlyDayInput([31, 1, 15, 31])).toBe('1 15 31');
  });

  test('formats compact recurrence summaries for daily, weekly, and monthly rules', () => {
    expect(formatTodoRecurrenceSummary({
      frequency: 'daily',
      startDate: '2026-04-20'
    })).toBe('每天');

    expect(formatTodoRecurrenceSummary({
      frequency: 'daily',
      startDate: '2026-04-20',
      interval: 2
    })).toBe('每2天');

    expect(formatTodoRecurrenceSummary({
      frequency: 'weekly',
      startDate: '2026-04-20',
      weekdays: [1, 3, 5]
    })).toBe('每周一三五');

    expect(formatTodoRecurrenceSummary({
      frequency: 'weekly',
      startDate: '2026-04-20',
      interval: 2,
      weekdays: [1, 3, 5]
    })).toBe('每2周一三五');

    expect(formatTodoRecurrenceSummary({
      frequency: 'monthly',
      startDate: '2026-01-31',
      monthDays: [31, 1, 15, 31]
    })).toBe('每月 1,15,31');
  });

  test('matches the picker today category for pinned, arranged, due, or recurring todos that hit today', () => {
    expect(isTodoInAssociationTodayCategory(buildTodo({ pin: true }), REFERENCE_DATE)).toBe(true);
    expect(isTodoInAssociationTodayCategory(buildTodo({ scheduledDate: '2026-04-20' }), REFERENCE_DATE)).toBe(true);
    expect(isTodoInAssociationTodayCategory(buildTodo({ deadlineDate: '2026-04-20' }), REFERENCE_DATE)).toBe(true);
    expect(isTodoInAssociationTodayCategory(buildTodo({
      recurrenceRule: {
        frequency: 'daily',
        startDate: '2026-04-18'
      }
    }), REFERENCE_DATE)).toBe(true);
    expect(isTodoInAssociationTodayCategory(buildTodo({ scheduledDate: '2026-04-19' }), REFERENCE_DATE)).toBe(false);
    expect(isTodoInAssociationTodayCategory(buildTodo({ scheduledDate: '2026-04-21' }), REFERENCE_DATE)).toBe(false);
  });

  test('builds today-category picker todos with pinned items first and excludes unrelated or completed todos', () => {
    const todos: TodoItem[] = [
      buildTodo({
        id: 'recurring',
        title: 'Alpha',
        recurrenceRule: {
          frequency: 'daily',
          startDate: '2026-04-18'
        }
      }),
      buildTodo({ id: 'scheduled', title: 'Beta', scheduledDate: '2026-04-20' }),
      buildTodo({ id: 'due', title: 'Delta', deadlineDate: '2026-04-20' }),
      buildTodo({ id: 'pinned', title: 'Omega', pin: true }),
      buildTodo({ id: 'other-day', title: 'Alpha', scheduledDate: '2026-04-21' }),
      buildTodo({ id: 'overdue', title: 'Gamma', scheduledDate: '2026-04-19' }),
      buildTodo({ id: 'completed-pinned', title: 'Done', pin: true, isCompleted: true })
    ];

    expect(getTodoAssociationTodayTodos(todos, REFERENCE_DATE).map((todo) => todo.id)).toEqual([
      'pinned',
      'recurring',
      'scheduled',
      'due'
    ]);
  });

  test('builds shared per-day entries with completed rows first, followed by due, arrange, repeat, and trace', () => {
    const todos: TodoItem[] = [
      buildTodo({ id: 'completed', title: 'Echo', completedAt: new Date('2026-04-20T20:00:00+08:00').getTime() }),
      buildTodo({ id: 'scheduled', title: 'Bravo', scheduledDate: '2026-04-20' }),
      buildTodo({ id: 'in-progress', title: 'Foxtrot' }),
      buildTodo({ id: 'deadline', title: 'Alpha', deadlineDate: '2026-04-20' }),
      buildTodo({
        id: 'recurring',
        title: 'Charlie',
        recurrenceRule: {
          frequency: 'daily',
          startDate: '2026-04-18'
        }
      })
    ];
    const logs: Log[] = [
      buildLog({
        id: 'log-in-progress',
        linkedTodoId: 'in-progress',
        startTime: new Date('2026-04-20T14:00:00+08:00').getTime(),
        endTime: new Date('2026-04-20T15:00:00+08:00').getTime()
      })
    ];

    const entries = buildTodoDateEntries(todos, logs, '2026-04-20');

    expect(entries.map((entry) => `${entry.todo.id}:${entry.primaryKind}`)).toEqual([
      'completed:completed',
      'deadline:deadline',
      'scheduled:scheduled',
      'recurring:recurring',
      'in-progress:inProgress'
    ]);
  });

  test('uses the highest-priority shared primary kind when one todo matches completed, due, arrange, repeat, maybe, and trace on the same day', () => {
    const todos: TodoItem[] = [
      buildTodo({
        id: 'stacked',
        title: 'Stacked priority',
        scheduledDate: '2026-04-20',
        deadlineDate: '2026-04-20',
        maybeDates: ['2026-04-20'],
        recurrenceRule: {
          frequency: 'daily',
          startDate: '2026-04-18'
        },
        completedAt: new Date('2026-04-20T20:00:00+08:00').getTime()
      }),
      buildTodo({ id: 'due-only', title: 'Due only', deadlineDate: '2026-04-20' })
    ];
    const logs: Log[] = [
      buildLog({
        id: 'stacked-log',
        linkedTodoId: 'stacked',
        startTime: new Date('2026-04-20T14:00:00+08:00').getTime(),
        endTime: new Date('2026-04-20T15:00:00+08:00').getTime()
      })
    ];

    const entries = buildTodoDateEntries(todos, logs, '2026-04-20');

    expect(entries.map((entry) => `${entry.todo.id}:${entry.primaryKind}`)).toEqual([
      'stacked:completed',
      'due-only:deadline'
    ]);
  });

  test('adds future maybe dates to schedule matches after recurring entries', () => {
    const todo = buildTodo({
      recurrenceRule: {
        frequency: 'weekly',
        startDate: '2026-04-20',
        weekdays: [1]
      },
      maybeDates: ['2026-04-23', '2026-04-25']
    });

    expect(getTodoScheduleMatches(todo, 'thisWeek', REFERENCE_DATE)).toEqual([
      { dateKey: '2026-04-20', kind: 'recurring' },
      { dateKey: '2026-04-23', kind: 'maybe' },
      { dateKey: '2026-04-25', kind: 'maybe' }
    ]);
  });

  test('keeps repeat rows ahead of maybe rows while completed rows still win the non-trace ordering', () => {
    const todos: TodoItem[] = [
      buildTodo({ id: 'completed', title: 'Echo', completedAt: new Date('2026-04-21T20:00:00+08:00').getTime() }),
      buildTodo({ id: 'in-progress', title: 'Foxtrot' }),
      buildTodo({ id: 'maybe', title: 'Delta', maybeDates: ['2026-04-21'] }),
      buildTodo({
        id: 'recurring',
        title: 'Charlie',
        recurrenceRule: {
          frequency: 'daily',
          startDate: '2026-04-18'
        }
      })
    ];
    const logs: Log[] = [
      buildLog({
        id: 'log-in-progress-future',
        linkedTodoId: 'in-progress',
        startTime: new Date('2026-04-21T14:00:00+08:00').getTime(),
        endTime: new Date('2026-04-21T15:00:00+08:00').getTime()
      })
    ];

    const entries = buildTodoDateEntries(todos, logs, '2026-04-21');

    expect(entries.map((entry) => `${entry.todo.id}:${entry.primaryKind}`)).toEqual([
      'completed:completed',
      'recurring:recurring',
      'maybe:maybe',
      'in-progress:inProgress'
    ]);
  });

  test('carries parent titles into week buckets so subtask rows can render inline @parent context', () => {
    const todos: TodoItem[] = [
      buildTodo({ id: 'parent', title: 'Parent Atlas' }),
      buildTodo({
        id: 'child',
        title: 'Dataset Draft',
        parentTodoId: 'parent',
        scheduledDate: '2026-04-20'
      }),
      buildTodo({
        id: 'root',
        title: 'Root Item',
        scheduledDate: '2026-04-20'
      })
    ];

    const [firstBucket] = buildWeekTodoBuckets(todos, [], REFERENCE_DATE);
    const childEntry = firstBucket?.items.find((entry) => entry.todo.id === 'child');
    const rootEntry = firstBucket?.items.find((entry) => entry.todo.id === 'root');

    expect(childEntry?.parentTitle).toBe('Parent Atlas');
    expect(rootEntry?.parentTitle).toBeUndefined();
    expect(childEntry ? formatWeekTodoLineTitle(childEntry) : null).toBe('Dataset Draft @Parent Atlas');
    expect(rootEntry ? formatWeekTodoLineTitle(rootEntry) : null).toBe('Root Item');
  });

  test('keeps overlapping week-row trace segments in stable relative order', () => {
    const weekDateKeys = getTodoScheduleRangeDateKeys('thisWeek', REFERENCE_DATE);
    const todos: TodoItem[] = [
      buildTodo({ id: 'alpha-trace', title: 'Alpha trace' }),
      buildTodo({ id: 'beta-trace', title: 'Beta trace' }),
      buildTodo({ id: 'due-day-4', title: 'Due day 4', deadlineDate: '2026-04-23' })
    ];
    const logs: Log[] = [
      buildLog({ id: 'alpha-1', linkedTodoId: 'alpha-trace', startTime: new Date('2026-04-20T09:00:00+08:00').getTime() }),
      buildLog({ id: 'alpha-2', linkedTodoId: 'alpha-trace', startTime: new Date('2026-04-21T09:00:00+08:00').getTime() }),
      buildLog({ id: 'alpha-3', linkedTodoId: 'alpha-trace', startTime: new Date('2026-04-22T09:00:00+08:00').getTime() }),
      buildLog({ id: 'beta-1', linkedTodoId: 'beta-trace', startTime: new Date('2026-04-21T12:00:00+08:00').getTime() }),
      buildLog({ id: 'beta-2', linkedTodoId: 'beta-trace', startTime: new Date('2026-04-22T12:00:00+08:00').getTime() }),
      buildLog({ id: 'beta-3', linkedTodoId: 'beta-trace', startTime: new Date('2026-04-23T12:00:00+08:00').getTime() })
    ];

    const entriesByDate = buildTodoDateEntryMap(todos, logs, weekDateKeys);
    const layout = buildTodoMonthWeekLayout(weekDateKeys, entriesByDate, 6);

    expect(layout.traceSegments.map((segment) => ({
      todoId: segment.todoId,
      laneIndex: segment.laneIndex,
      startDayIndex: segment.startDayIndex,
      endDayIndex: segment.endDayIndex
    }))).toEqual([
      { todoId: 'alpha-trace', laneIndex: 0, startDayIndex: 0, endDayIndex: 2 },
      { todoId: 'beta-trace', laneIndex: 1, startDayIndex: 1, endDayIndex: 3 }
    ]);
    expect(layout.sortedEntriesByDate['2026-04-21']?.map((entry) => entry.todo.id)).toEqual([
      'alpha-trace',
      'beta-trace'
    ]);
    expect(layout.sortedEntriesByDate['2026-04-22']?.map((entry) => entry.todo.id)).toEqual([
      'alpha-trace',
      'beta-trace'
    ]);
    expect(layout.sortedEntriesByDate['2026-04-23']?.map((entry) => entry.todo.id)).toEqual([
      'due-day-4',
      'beta-trace'
    ]);
  });

  test('moves non-trace rows below reserved trace lanes while preserving the new completed-first internal order', () => {
    const weekDateKeys = getTodoScheduleRangeDateKeys('thisWeek', REFERENCE_DATE);
    const todos: TodoItem[] = [
      buildTodo({ id: 'trace-row', title: 'Trace row' }),
      buildTodo({ id: 'due-row', title: 'Due row', deadlineDate: '2026-04-21' }),
      buildTodo({ id: 'scheduled-row', title: 'Scheduled row', scheduledDate: '2026-04-21' }),
      buildTodo({ id: 'done-row', title: 'Done row', completedAt: new Date('2026-04-21T20:00:00+08:00').getTime() })
    ];
    const logs: Log[] = [
      buildLog({ id: 'trace-log', linkedTodoId: 'trace-row', startTime: new Date('2026-04-21T09:00:00+08:00').getTime() })
    ];

    const entriesByDate = buildTodoDateEntryMap(todos, logs, weekDateKeys);
    const layout = buildTodoMonthWeekLayout(weekDateKeys, entriesByDate, 6);

    expect(layout.sortedEntriesByDate['2026-04-21']?.map((entry) => entry.todo.id)).toEqual([
      'trace-row',
      'done-row',
      'due-row',
      'scheduled-row'
    ]);
  });

  test('treats each rendered week row independently when building trace segments', () => {
    const firstWeekDateKeys = [
      '2026-04-20',
      '2026-04-21',
      '2026-04-22',
      '2026-04-23',
      '2026-04-24',
      '2026-04-25',
      '2026-04-26'
    ];
    const secondWeekDateKeys = [
      '2026-04-27',
      '2026-04-28',
      '2026-04-29',
      '2026-04-30',
      '2026-05-01',
      '2026-05-02',
      '2026-05-03'
    ];
    const todos: TodoItem[] = [
      buildTodo({ id: 'cross-week-trace', title: 'Cross week trace' })
    ];
    const logs: Log[] = [
      buildLog({ id: 'trace-sun', linkedTodoId: 'cross-week-trace', startTime: new Date('2026-04-26T09:00:00+08:00').getTime() }),
      buildLog({ id: 'trace-mon', linkedTodoId: 'cross-week-trace', startTime: new Date('2026-04-27T09:00:00+08:00').getTime() })
    ];

    const firstLayout = buildTodoMonthWeekLayout(
      firstWeekDateKeys,
      buildTodoDateEntryMap(todos, logs, firstWeekDateKeys),
      6
    );
    const secondLayout = buildTodoMonthWeekLayout(
      secondWeekDateKeys,
      buildTodoDateEntryMap(todos, logs, secondWeekDateKeys),
      6
    );

    expect(firstLayout.traceSegments).toHaveLength(1);
    expect(firstLayout.traceSegments[0]).toMatchObject({
      startDayIndex: 6,
      endDayIndex: 6,
      laneIndex: 0
    });
    expect(secondLayout.traceSegments).toHaveLength(1);
    expect(secondLayout.traceSegments[0]).toMatchObject({
      startDayIndex: 0,
      endDayIndex: 0,
      laneIndex: 0
    });
  });

  test('splits a trace segment when the todo becomes a non-trace entry in the middle of the week', () => {
    const weekDateKeys = getTodoScheduleRangeDateKeys('thisWeek', REFERENCE_DATE);
    const todos: TodoItem[] = [
      buildTodo({
        id: 'mixed-entry',
        title: 'Mixed entry',
        scheduledDate: '2026-04-22'
      })
    ];
    const logs: Log[] = [
      buildLog({ id: 'mixed-1', linkedTodoId: 'mixed-entry', startTime: new Date('2026-04-20T09:00:00+08:00').getTime() }),
      buildLog({ id: 'mixed-2', linkedTodoId: 'mixed-entry', startTime: new Date('2026-04-21T09:00:00+08:00').getTime() }),
      buildLog({ id: 'mixed-3', linkedTodoId: 'mixed-entry', startTime: new Date('2026-04-22T09:00:00+08:00').getTime() }),
      buildLog({ id: 'mixed-4', linkedTodoId: 'mixed-entry', startTime: new Date('2026-04-23T09:00:00+08:00').getTime() })
    ];

    const layout = buildTodoMonthWeekLayout(
      weekDateKeys,
      buildTodoDateEntryMap(todos, logs, weekDateKeys),
      6
    );

    expect(layout.traceSegments.map((segment) => ({
      startDayIndex: segment.startDayIndex,
      endDayIndex: segment.endDayIndex,
      dateKeys: segment.dateKeys
    }))).toEqual([
      {
        startDayIndex: 0,
        endDayIndex: 1,
        dateKeys: ['2026-04-20', '2026-04-21']
      },
      {
        startDayIndex: 3,
        endDayIndex: 3,
        dateKeys: ['2026-04-23']
      }
    ]);
  });

  test('computes hidden counts from sparse trace lanes instead of compacted day arrays', () => {
    const weekDateKeys = getTodoScheduleRangeDateKeys('thisWeek', REFERENCE_DATE);
    const todos: TodoItem[] = [
      buildTodo({ id: 'trace-a', title: 'Trace A' }),
      buildTodo({ id: 'trace-b', title: 'Trace B' }),
      buildTodo({ id: 'trace-c', title: 'Trace C' })
    ];
    const logs: Log[] = [
      buildLog({ id: 'a-20', linkedTodoId: 'trace-a', startTime: new Date('2026-04-20T09:00:00+08:00').getTime() }),
      buildLog({ id: 'a-21', linkedTodoId: 'trace-a', startTime: new Date('2026-04-21T09:00:00+08:00').getTime() }),
      buildLog({ id: 'a-22', linkedTodoId: 'trace-a', startTime: new Date('2026-04-22T09:00:00+08:00').getTime() }),
      buildLog({ id: 'a-23', linkedTodoId: 'trace-a', startTime: new Date('2026-04-23T09:00:00+08:00').getTime() }),
      buildLog({ id: 'a-24', linkedTodoId: 'trace-a', startTime: new Date('2026-04-24T09:00:00+08:00').getTime() }),
      buildLog({ id: 'b-20', linkedTodoId: 'trace-b', startTime: new Date('2026-04-20T12:00:00+08:00').getTime() }),
      buildLog({ id: 'b-21', linkedTodoId: 'trace-b', startTime: new Date('2026-04-21T12:00:00+08:00').getTime() }),
      buildLog({ id: 'b-22', linkedTodoId: 'trace-b', startTime: new Date('2026-04-22T12:00:00+08:00').getTime() }),
      buildLog({ id: 'c-22', linkedTodoId: 'trace-c', startTime: new Date('2026-04-22T15:00:00+08:00').getTime() }),
      buildLog({ id: 'c-23', linkedTodoId: 'trace-c', startTime: new Date('2026-04-23T15:00:00+08:00').getTime() }),
      buildLog({ id: 'c-24', linkedTodoId: 'trace-c', startTime: new Date('2026-04-24T15:00:00+08:00').getTime() })
    ];

    const layout = buildTodoMonthWeekLayout(
      weekDateKeys,
      buildTodoDateEntryMap(todos, logs, weekDateKeys),
      2
    );

    expect(layout.rowEntriesByDate['2026-04-23']?.map((entry) => entry?.todo.id ?? null)).toEqual([
      'trace-a',
      null,
      'trace-c'
    ]);
    expect(layout.hiddenCountByDate['2026-04-23']).toBe(1);
  });
});
