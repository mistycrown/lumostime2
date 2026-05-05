/**
 * @file todoListDisplayUtils.test.ts
 * @input Todo list display helpers with compact schedule metadata and completion-group ordering rules
 * @output Regression coverage for compact inline dates and completion-group ordering that preserves incoming item order
 * @pos Test (todo list display)
 * @description Verifies the shared compact schedule summary text and the category-list grouping rule that keeps incomplete todos before completed ones without reordering items inside either group.
 * @updated 2026-05-05: Updated ordering coverage so category lists preserve incoming per-group order instead of re-sorting by schedule dates.
 * @updated 2026-05-05: Updated compact summary coverage to expect symbol-only date suffixes appended directly after the title.
 */

import { describe, expect, test } from 'vitest';
import { TodoItem } from '../types';
import { formatTodoCompactScheduleSummary, formatTodoInlineDate, orderTodoItemsByCompletionGroups } from './todoListDisplayUtils';

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

  test('keeps incomplete todos before completed ones while preserving incoming order inside each group', () => {
    const todos = [
      buildTodo({ id: 'completed-a', title: 'Completed A', isCompleted: true }),
      buildTodo({ id: 'incomplete-a', title: 'Incomplete A' }),
      buildTodo({ id: 'completed-b', title: 'Completed B', isCompleted: true, scheduledDate: '2026-05-06' }),
      buildTodo({ id: 'incomplete-b', title: 'Incomplete B', scheduledDate: '2026-05-08' })
    ];

    expect(orderTodoItemsByCompletionGroups(todos).map((todo) => todo.id)).toEqual([
      'incomplete-a',
      'incomplete-b',
      'completed-a',
      'completed-b'
    ]);
  });

  test('does not reshuffle same-status todos even when their schedule dates differ', () => {
    const todos = [
      buildTodo({ id: 'first', title: 'First', scheduledDate: '2026-05-09' }),
      buildTodo({ id: 'second', title: 'Second', deadlineDate: '2026-05-06' }),
      buildTodo({ id: 'third', title: 'Third' })
    ];

    expect(orderTodoItemsByCompletionGroups(todos).map((todo) => todo.id)).toEqual([
      'first',
      'second',
      'third'
    ]);
  });
});
