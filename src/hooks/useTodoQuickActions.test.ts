/**
 * @file useTodoQuickActions.test.ts
 * @updated 2026-10-18: Covers independent date-reminder updates and stale/deleted source guards.
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
  buildQuickActionReminderUpdateTodo,
  buildQuickActionUpgradeToProjectTodo,
  getQuickActionTodoNote,
  isTodoQuickActionInteractionGuardActive,
} from './useTodoQuickActions';

describe('useTodoQuickActions interaction guard', () => {
  test('sets and removes only the selected date reminder while preserving other todo fields', () => {
    const todo = { id: 'reminder', categoryId: 'cat', title: '写作', note: '保留备注', isCompleted: false,
      scheduledDate: '2026-10-22', deadlineDate: '2026-10-24',
      reminders: { deadlineDate: { daysBefore: 1, time: '18:30' } } };
    const updated = buildQuickActionReminderUpdateTodo(todo, 'scheduledDate', { daysBefore: 0, time: '09:15' });
    expect(updated).toEqual({ ...todo, reminders: { ...todo.reminders, scheduledDate: { daysBefore: 0, time: '09:15' } } });
    expect(buildQuickActionReminderUpdateTodo(updated, 'scheduledDate')).toEqual(todo);
    expect(buildQuickActionReminderUpdateTodo(updated, 'deadlineDate')?.reminders).toEqual({ scheduledDate: { daysBefore: 0, time: '09:15' } });
  });

  test('ignores deleted, undated, completed and recurring reminder targets', () => {
    const todo = { id: 'reminder', categoryId: 'cat', title: '写作', isCompleted: false };
    const setting = { daysBefore: 0, time: '09:15' };
    expect(buildQuickActionReminderUpdateTodo(null, 'scheduledDate', setting)).toBeNull();
    expect(buildQuickActionReminderUpdateTodo(todo, 'scheduledDate', setting)).toBeNull();
    expect(buildQuickActionReminderUpdateTodo({ ...todo, scheduledDate: '2026-10-22', isCompleted: true }, 'scheduledDate', setting)).toBeNull();
    expect(buildQuickActionReminderUpdateTodo({ ...todo, scheduledDate: '2026-10-22', recurrenceRule: { frequency: 'daily', startDate: '2026-10-20' } }, 'scheduledDate', setting)).toBeNull();
  });
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

  test('reads only the todo note and preserves date fields when updating it', () => {
    const todo = {
      id: 'todo-6',
      categoryId: 'cat-a',
      title: 'Scheduled task',
      isCompleted: false,
      note: 'Existing note',
      scheduledDate: '2026-08-24',
      deadlineDate: '2026-08-30',
      completedAt: '2026-08-24T10:15:00.000Z'
    } as any;

    expect(getQuickActionTodoNote(todo)).toBe('Existing note');
    expect(buildQuickActionNoteUpdateTodo(todo, 'Updated note')).toEqual({
      ...todo,
      note: 'Updated note'
    });
    expect(getQuickActionTodoNote({ ...todo, note: undefined })).toBe('');
  });
});
