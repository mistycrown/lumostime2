/**
 * @file todoScheduleUtils.test.ts
 * @input Todo schedule helpers with fixed reference dates
 * @output Regression coverage for virtual-category date matching and week-view badge normalization
 * @pos Test (todo planning utilities)
 * @description Verifies today/tomorrow/this-week filtering against Arrange, Due, and recurrence rules without creating occurrence records.
 * @updated 2026-04-27: Added regression coverage for the shared today-category helper so `today + pin` widget and picker views keep due-today and recurring-today todos.
 * @updated 2026-04-22: Added regression coverage for the shared todo-picker today category that mixes pinned todos with todos arranged for today.
 * @updated 2026-04-20: Added tests for virtual todo category schedule matches and deadline-over-scheduled normalization.
 */

import { describe, expect, test } from 'vitest';
import { TodoItem } from '../types';
import {
  getTodoAssociationTodayTodos,
  getTodoScheduleMatches,
  getTodoScheduleRangeDateKeys,
  isTodoInAssociationTodayCategory
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
});
