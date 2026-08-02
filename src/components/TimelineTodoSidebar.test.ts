/**
 * @file TimelineTodoSidebar.test.ts
 * @input Todo drag movement vectors, scheduled entries, and one-level task hierarchy fixtures
 * @output Regression coverage for sidebar drag intent, marker visibility, and schedule-aware parent-child grouping
 * @pos Test
 * @updated 2026-08-02: Covers recurring todos using a locked completion marker in the Chronicle sidebar.
 * @updated 2026-07-30: Covers category completion filtering and shared hierarchy rendering.
 */
import { describe, expect, test } from 'vitest';
import { TodoItem } from '../types';
import { buildTimelineSidebarCategoryTodoEntries, buildTimelineSidebarTodoEntries, buildTimelineSidebarTodoTreeGroups, isTimelineSidebarTodoCompletionLocked, resolveTodoDragIntent, shouldHideCheckMarkerContent, TODO_DRAG_DISTANCE } from './TimelineTodoSidebar';

describe('resolveTodoDragIntent', () => {
  test('uses a two-pixel threshold before recognizing a direct mobile drag', () => {
    expect(TODO_DRAG_DISTANCE).toBe(2);
  });

  test('starts a plan drag for any leftward movement toward the timeline', () => {
    expect(resolveTodoDragIntent(-16, 4)).toBe('drag');
    expect(resolveTodoDragIntent(-4, 16)).toBe('drag');
  });

  test('keeps rightward movements available for scrolling', () => {
    expect(resolveTodoDragIntent(16, 4)).toBe('scroll');
  });
});

describe('shouldHideCheckMarkerContent', () => {
  test('keeps every current count visible before the target is reached', () => {
    expect(shouldHideCheckMarkerContent(true, false)).toBe(false);
    expect(shouldHideCheckMarkerContent(true, true)).toBe(false);
  });

  test('hides only an empty, incomplete binary marker', () => {
    expect(shouldHideCheckMarkerContent(false, false)).toBe(true);
    expect(shouldHideCheckMarkerContent(false, true)).toBe(false);
  });
});

describe('isTimelineSidebarTodoCompletionLocked', () => {
  test('locks recurring todos while leaving ordinary todos completable', () => {
    expect(isTimelineSidebarTodoCompletionLocked({
      id: 'repeat',
      categoryId: 'cat',
      title: 'Repeat task',
      isCompleted: false,
      recurrenceRule: {
        frequency: 'daily',
        startDate: '2026-08-02'
      }
    })).toBe(true);

    expect(isTimelineSidebarTodoCompletionLocked({
      id: 'ordinary',
      categoryId: 'cat',
      title: 'Ordinary task',
      isCompleted: false
    })).toBe(false);
  });
});

describe('buildTimelineSidebarTodoEntries', () => {
  test('includes an unfinished pin-only todo once and puts it before dated entries', () => {
    const entries = buildTimelineSidebarTodoEntries([
      { id: 'today', categoryId: 'cat', title: 'Today task', isCompleted: false, scheduledDate: '2026-07-30' },
      { id: 'pinned', categoryId: 'cat', title: 'Pinned task', isCompleted: false, pin: true },
      { id: 'completed-pin', categoryId: 'cat', title: 'Completed pin', isCompleted: true, pin: true }
    ], [], '2026-07-30');

    expect(entries.map((entry) => `${entry.todo.id}:${entry.isPinnedOnly ? 'PIN' : entry.primaryKind}`)).toEqual([
      'pinned:PIN',
      'today:scheduled'
    ]);
  });
});

describe('timeline sidebar list and hierarchy', () => {
  const parent: TodoItem = { id: 'parent', categoryId: 'cat-a', title: 'Parent task', isCompleted: false, scheduledDate: '2026-07-30' };
  const child: TodoItem = { id: 'child', categoryId: 'cat-a', title: 'Child task', isCompleted: false, parentTodoId: 'parent', childOrder: 1 };
  const otherCategory: TodoItem = { id: 'other', categoryId: 'cat-b', title: 'Other task', isCompleted: false };

  test('filters a selected list by category while retaining its subtasks', () => {
    const entries = buildTimelineSidebarCategoryTodoEntries([parent, child, otherCategory], 'cat-a');
    expect(entries.map((entry) => entry.todo.id)).toEqual(['child', 'parent']);

    const groups = buildTimelineSidebarTodoTreeGroups(entries, [parent, child, otherCategory]);
    expect(groups).toHaveLength(1);
    expect(groups[0].parentEntry.todo.id).toBe('parent');
    expect(groups[0].childEntries.map((entry) => entry.todo.id)).toEqual(['child']);
  });

  test('hides completed todos in a specific task list while Today retains same-day completions', () => {
    const completed = { id: 'completed', categoryId: 'cat-a', title: 'Completed', isCompleted: true, completedAt: '2026-07-30T08:00:00' };
    const categoryEntries = buildTimelineSidebarCategoryTodoEntries([parent, child, completed], 'cat-a');
    const todayEntries = buildTimelineSidebarTodoEntries([completed], [], '2026-07-30');

    expect(categoryEntries.map((entry) => entry.todo.id)).toEqual(['child', 'parent']);
    expect(todayEntries.map((entry) => entry.todo.id)).toEqual(['completed']);
  });

  test("adds a scheduled parent's subtasks to the same expandable tree", () => {
    const scheduledEntries = buildTimelineSidebarTodoEntries([parent, child, otherCategory], [], '2026-07-30');
    const groups = buildTimelineSidebarTodoTreeGroups(scheduledEntries, [parent, child, otherCategory], true);
    expect(groups).toHaveLength(1);
    expect(groups[0].parentEntry.todo.id).toBe('parent');
    expect(groups[0].childEntries.map((entry) => entry.todo.id)).toEqual(['child']);
  });

  test('keeps a child-only schedule entry independent without adding its parent', () => {
    const childOnlyEntries = buildTimelineSidebarTodoEntries([
      { ...parent, scheduledDate: undefined },
      { ...child, scheduledDate: '2026-07-30' }
    ], [], '2026-07-30');
    const groups = buildTimelineSidebarTodoTreeGroups(childOnlyEntries, [parent, child], true);

    expect(groups.map((group) => group.parentEntry.todo.id)).toEqual(['child']);
    expect(groups[0].childEntries).toEqual([]);
  });
});
