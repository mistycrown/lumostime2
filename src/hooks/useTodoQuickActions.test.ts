/**
 * @file useTodoQuickActions.test.ts
 * @input Quick-actions interaction guard helper
 * @output Regression coverage for same-touch quick-actions click-through protection
 * @pos Test
 * @description Ensures the quick-actions helpers keep their same-touch guard and category-move save behavior stable.
 * @updated 2026-05-13: Added quick upgrade-to-project coverage so quick reminders must carry an explicitly chosen target category.
 * @updated 2026-05-13: Added quick category-move coverage so non-subtask todos can switch todo categories while subtasks stay locked.
 * @updated 2026-08-24: Added note-update normalization coverage for quick note editing.
 * @updated 2026-05-05: Added guard-window coverage for bottom-row quick-actions click-through.
 */

import { describe, expect, test } from 'vitest';
import {
  QUICK_ACTION_INTERACTION_GUARD_MS,
  buildQuickActionCategoryMoveTodo,
  buildQuickActionNoteUpdateTodo,
  buildQuickActionUpgradeToProjectTodo,
  isTodoQuickActionInteractionGuardActive,
} from './useTodoQuickActions';

describe('useTodoQuickActions interaction guard', () => {
  test('blocks interactions during the open guard window', () => {
    const openedAt = 10_000;

    expect(isTodoQuickActionInteractionGuardActive(openedAt, openedAt)).toBe(true);
    expect(isTodoQuickActionInteractionGuardActive(openedAt, openedAt + QUICK_ACTION_INTERACTION_GUARD_MS - 1)).toBe(true);
  });

  test('allows interactions after the guard window or without an open timestamp', () => {
    const openedAt = 10_000;

    expect(isTodoQuickActionInteractionGuardActive(openedAt, openedAt + QUICK_ACTION_INTERACTION_GUARD_MS)).toBe(false);
    expect(isTodoQuickActionInteractionGuardActive(0, openedAt)).toBe(false);
  });

  test('moves a standalone todo into the selected category and closes the sheet', () => {
    const todo = {
      id: 'todo-1',
      categoryId: 'cat-a',
      title: 'Standalone task',
      isCompleted: false
    } as any;

    expect(buildQuickActionCategoryMoveTodo(todo, 'cat-b')).toEqual({
      ...todo,
      categoryId: 'cat-b'
    });
  });

  test('ignores category move requests for subtasks', () => {
    const todo = {
      id: 'todo-2',
      categoryId: 'cat-a',
      parentTodoId: 'parent-1',
      title: 'Subtask',
      isCompleted: false
    } as any;

    expect(buildQuickActionCategoryMoveTodo(todo, 'cat-b')).toBeNull();
  });

  test('upgrades a quick todo into a project under the chosen category', () => {
    const todo = {
      id: 'todo-3',
      categoryId: '__virtual_quick__',
      kind: 'quick',
      title: 'Quick note',
      isCompleted: false
    } as any;

    expect(buildQuickActionUpgradeToProjectTodo(todo, 'cat-b')).toEqual({
      ...todo,
      kind: 'project',
      categoryId: 'cat-b'
    });
  });

  test('ignores project upgrades for non-quick todos', () => {
    const todo = {
      id: 'todo-4',
      categoryId: 'cat-a',
      kind: 'project',
      title: 'Already project',
      isCompleted: false
    } as any;

    expect(buildQuickActionUpgradeToProjectTodo(todo, 'cat-b')).toBeNull();
  });

  test('trims note updates and clears empty notes', () => {
    const todo = {
      id: 'todo-5',
      categoryId: 'cat-a',
      title: 'Task with note',
      isCompleted: false,
      note: 'old note'
    } as any;

    expect(buildQuickActionNoteUpdateTodo(todo, '  new note  ')).toEqual({
      ...todo,
      note: 'new note'
    });
    expect(buildQuickActionNoteUpdateTodo(todo, '   ')).toEqual({
      ...todo,
      note: undefined
    });
    expect(buildQuickActionNoteUpdateTodo(todo, 'old note')).toBeNull();
  });
});
