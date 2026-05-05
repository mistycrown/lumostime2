/**
 * @file todoListDisplayUtils.test.ts
 * @input Todo list display helpers with compact schedule metadata and category-list ordering rules
 * @output Regression coverage for compact inline dates and incomplete-first scheduled category sorting
 * @pos Test (todo list display)
 * @description Verifies the shared compact schedule summary text and the category-list comparator that now prioritizes incomplete scheduled todos.
 * @updated 2026-05-05: Updated compact summary coverage to expect symbol-only date suffixes appended directly after the title.
 * @updated 2026-05-05: Added regression coverage for compact arranged/due summaries and category-list sorting by completion plus schedule presence.
 */

import { describe, expect, test } from 'vitest';
import { TodoItem } from '../types';
import { compareCategoryListTodos, formatTodoCompactScheduleSummary, formatTodoInlineDate } from './todoListDisplayUtils';

const buildTodo = (overrides: Partial<TodoItem>): TodoItem => ({
  id: 'todo-1',
  categoryId: 'cat-1',
  title: 'Todo',
  isCompleted: false,
  ...overrides
});

describe('todoListDisplayUtils', () => {
  test('formats inline dates as month-day pairs', () => {
    expect(formatTodoInlineDate('2026-05-06')).toBe('05.06');
  });

  test('builds compact symbol-only summaries and omits missing fields', () => {
    expect(formatTodoCompactScheduleSummary(buildTodo({
      scheduledDate: '2026-05-06',
      deadlineDate: '2026-05-09'
    }))).toBe('(05.06)[05.09]');

    expect(formatTodoCompactScheduleSummary(buildTodo({
      deadlineDate: '2026-05-09'
    }))).toBe('[05.09]');

    expect(formatTodoCompactScheduleSummary(buildTodo({
      scheduledDate: '2026-05-06'
    }))).toBe('(05.06)');

    expect(formatTodoCompactScheduleSummary(buildTodo({}))).toBeNull();
  });

  test('orders category todos by incomplete first, scheduled before unscheduled, then completed last', () => {
    const todos = [
      buildTodo({ id: 'completed-scheduled', title: 'Completed Scheduled', isCompleted: true, scheduledDate: '2026-05-06' }),
      buildTodo({ id: 'unscheduled', title: 'Incomplete Unscheduled' }),
      buildTodo({ id: 'scheduled', title: 'Incomplete Scheduled', scheduledDate: '2026-05-06' })
    ];

    expect([...todos].sort(compareCategoryListTodos).map((todo) => todo.id)).toEqual([
      'scheduled',
      'unscheduled',
      'completed-scheduled'
    ]);
  });

  test('prefers the earlier schedule date and breaks same-day ties toward deadline urgency', () => {
    const todos = [
      buildTodo({ id: 'arrange-later', title: 'Arrange Later', scheduledDate: '2026-05-08' }),
      buildTodo({ id: 'due-same-day', title: 'Due Same Day', deadlineDate: '2026-05-06' }),
      buildTodo({ id: 'arrange-same-day', title: 'Arrange Same Day', scheduledDate: '2026-05-06' })
    ];

    expect([...todos].sort(compareCategoryListTodos).map((todo) => todo.id)).toEqual([
      'due-same-day',
      'arrange-same-day',
      'arrange-later'
    ]);
  });
});
