/**
 * @file TodoScheduleAssignModal.test.ts
 * @input Schedule-assignment picker visibility helpers
 * @output Regression coverage for schedule picker todo filtering
 * @pos Test
 * @description Ensures the schedule assignment picker can hide unfinished subtasks when their parent todo is completed, even if the visible picker pool excludes completed parents.
 * @updated 2026-04-25: Added coverage for resolving completed-parent visibility from the full todo source instead of the unfinished picker subset.
 */

import { describe, expect, it } from 'vitest';
import type { TodoItem } from '../types';
import { getVisibleScheduleAssignTodos } from './TodoScheduleAssignModal';

describe('getVisibleScheduleAssignTodos', () => {
  it('hides unfinished subtasks whose completed parent only exists in the full todo source', () => {
    const allTodos: TodoItem[] = [
      {
        id: 'parent-done',
        categoryId: 'cat-1',
        title: 'Completed parent',
        isCompleted: true
      } as TodoItem,
      {
        id: 'child-open',
        categoryId: 'cat-1',
        parentTodoId: 'parent-done',
        childOrder: 1,
        title: 'Open child',
        isCompleted: false
      } as TodoItem,
      {
        id: 'solo-open',
        categoryId: 'cat-1',
        title: 'Solo open',
        isCompleted: false
      } as TodoItem
    ];

    const assignableTodos = allTodos.filter((todo) => !todo.isCompleted);

    expect(getVisibleScheduleAssignTodos(assignableTodos, allTodos, 'all', 'scheduled', 'scheduled').map((todo) => todo.id)).toEqual([
      'solo-open'
    ]);
  });
});
