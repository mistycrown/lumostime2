/**
 * @file TimelineTodoSidebar.test.ts
 * @input Todo drag movement vectors
 * @output Regression coverage for sidebar-to-timeline drag gesture intent and check-marker visibility
 * @pos Test
 * @updated 2026-07-30: Covers the lower direct-drag threshold used by mobile cross-panel scheduling.
 */
import { describe, expect, test } from 'vitest';
import { TodoItem } from '../types';
import { buildTimelineSidebarCategoryTodoEntries, buildTimelineSidebarTodoEntries, buildTimelineSidebarTodoTreeGroups, resolveTodoDragIntent, shouldHideCheckMarkerContent, TODO_DRAG_DISTANCE } from './TimelineTodoSidebar';

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

describe('buildTimelineSidebarTodoEntries', () => {
  test('includes an unfinished pin-only todo once and puts it before dated entries', () => {
    const entries = buildTimelineSidebarTodoEntries([
      { id: 'today', categoryId: 'cat', title: '今天任务', isCompleted: false, scheduledDate: '2026-07-30' },
      { id: 'pinned', categoryId: 'cat', title: '置顶任务', isCompleted: false, pin: true },
      { id: 'completed-pin', categoryId: 'cat', title: '已完成置顶', isCompleted: true, pin: true }
    ], [], '2026-07-30');

    expect(entries.map((entry) => `${entry.todo.id}:${entry.isPinnedOnly ? 'PIN' : entry.primaryKind}`)).toEqual([
      'pinned:PIN',
      'today:scheduled'
    ]);
  });
});

describe('timeline sidebar list and hierarchy', () => {
  const parent: TodoItem = { id: 'parent', categoryId: 'cat-a', title: '父任务', isCompleted: false, scheduledDate: '2026-07-30' };
  const child: TodoItem = { id: 'child', categoryId: 'cat-a', title: '子任务', isCompleted: false, parentTodoId: 'parent', childOrder: 1 };
  const otherCategory: TodoItem = { id: 'other', categoryId: 'cat-b', title: '其他任务', isCompleted: false };

  test('filters a selected list by category while retaining its subtasks', () => {
    const entries = buildTimelineSidebarCategoryTodoEntries([parent, child, otherCategory], 'cat-a');
    expect(entries.map((entry) => entry.todo.id)).toEqual(['parent', 'child']);
  });

  test('adds a scheduled parent’s subtasks to the same expandable tree', () => {
    const scheduledEntries = buildTimelineSidebarTodoEntries([parent, child, otherCategory], [], '2026-07-30');
    const groups = buildTimelineSidebarTodoTreeGroups(scheduledEntries, [parent, child, otherCategory]);
    expect(groups).toHaveLength(1);
    expect(groups[0].parentEntry.todo.id).toBe('parent');
    expect(groups[0].childEntries.map((entry) => entry.todo.id)).toEqual(['child']);
  });
});
