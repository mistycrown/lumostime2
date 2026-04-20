/**
 * @file todoScheduleUtils.test.ts
 * @input Todo schedule helpers with fixed reference dates
 * @output Regression coverage for virtual-category date matching and week-view badge normalization
 * @pos Test (todo planning utilities)
 * @description Verifies today/tomorrow/this-week filtering against Arrange, Due, and recurrence rules without creating occurrence records.
 * @updated 2026-04-20: Added tests for virtual todo category schedule matches and deadline-over-scheduled normalization.
 */

import { describe, expect, test } from 'vitest';
import { TodoItem } from '../types';
import {
  getTodoScheduleMatches,
  getTodoScheduleRangeDateKeys
} from './todoScheduleUtils';

const REFERENCE_DATE = new Date('2026-04-20T12:00:00+08:00');

const buildTodo = (overrides: Partial<TodoItem>): TodoItem => ({
  id: 'todo-1',
  categoryId: 'cat-1',
  title: '测试待办',
  isCompleted: false,
  ...overrides
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
});
