/**
 * @file todoHierarchyUtils.test.ts
 * @input Todo hierarchy ordering helpers
 * @output Regression coverage for expanded subtask display ordering
 * @pos Test
 * @description Verifies that expanded parent-task displays can show all direct subtasks while prioritizing unfinished items ahead of completed ones.
 * @updated 2026-04-25: Added coverage for hiding unfinished subtasks when their parent todo is completed without mutating child completion flags.
 * @updated 2026-04-22: Added tests for direct-child display ordering plus optional completed-task filtering.
 * @updated 2026-04-22: Added tests for direct-child display ordering with unfinished subtasks first.
 */

import { describe, expect, it } from 'vitest';
import type { TodoItem } from '../types';
import { getDirectChildTodosForDisplay, isIncompleteSubtaskHiddenByCompletedParent } from './todoHierarchyUtils';

const baseTodos: TodoItem[] = [
  {
    id: 'parent-1',
    categoryId: 'cat-1',
    title: 'Parent',
    isCompleted: false
  } as TodoItem,
  {
    id: 'child-2',
    categoryId: 'cat-1',
    parentTodoId: 'parent-1',
    childOrder: 2,
    title: 'Second child',
    isCompleted: false
  } as TodoItem,
  {
    id: 'child-1-done',
    categoryId: 'cat-1',
    parentTodoId: 'parent-1',
    childOrder: 1,
    title: 'First child done',
    isCompleted: true
  } as TodoItem,
  {
    id: 'child-3',
    categoryId: 'cat-1',
    parentTodoId: 'parent-1',
    childOrder: 3,
    title: 'Third child',
    isCompleted: false
  } as TodoItem
];

describe('todoHierarchyUtils display ordering', () => {
  it('keeps childOrder sorting when incomplete-first ordering is disabled', () => {
    expect(getDirectChildTodosForDisplay(baseTodos, 'parent-1').map((todo) => todo.id)).toEqual([
      'child-1-done',
      'child-2',
      'child-3'
    ]);
  });

  it('moves completed subtasks behind unfinished ones while preserving sibling order within each group', () => {
    expect(getDirectChildTodosForDisplay(baseTodos, 'parent-1', { incompleteFirst: true }).map((todo) => todo.id)).toEqual([
      'child-2',
      'child-3',
      'child-1-done'
    ]);
  });

  it('can hide completed subtasks while keeping unfinished sibling order', () => {
    expect(getDirectChildTodosForDisplay(baseTodos, 'parent-1', {
      incompleteFirst: true,
      includeCompleted: false
    }).map((todo) => todo.id)).toEqual([
      'child-2',
      'child-3'
    ]);
  });

  it('hides only unfinished subtasks when the parent todo is completed', () => {
    const completedParentTodos = baseTodos.map((todo) => (
      todo.id === 'parent-1'
        ? { ...todo, isCompleted: true }
        : todo
    ));

    expect(getDirectChildTodosForDisplay(completedParentTodos, 'parent-1', {
      incompleteFirst: true,
      hideIncompleteWhenParentCompleted: true
    }).map((todo) => todo.id)).toEqual([
      'child-1-done'
    ]);
  });
});

describe('isIncompleteSubtaskHiddenByCompletedParent', () => {
  it('returns true only for unfinished subtasks under completed parents', () => {
    const completedParentTodos = baseTodos.map((todo) => (
      todo.id === 'parent-1'
        ? { ...todo, isCompleted: true }
        : todo
    ));

    expect(isIncompleteSubtaskHiddenByCompletedParent(completedParentTodos, completedParentTodos[1])).toBe(true);
    expect(isIncompleteSubtaskHiddenByCompletedParent(completedParentTodos, completedParentTodos[2])).toBe(false);
    expect(isIncompleteSubtaskHiddenByCompletedParent(completedParentTodos, completedParentTodos[0])).toBe(false);
  });
});
