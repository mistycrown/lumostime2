/**
 * @file TodoScheduleAssignModal.test.ts
 * @input Schedule-assignment picker visibility helpers
 * @output Regression coverage for schedule picker todo filtering
 * @pos Test
 * @description Ensures the schedule assignment picker can hide unfinished subtasks when their parent todo is completed, even if the visible picker pool excludes completed parents.
 * @updated 2026-05-14: Added regression coverage for quick-picker ordering so undated roots stay first, saved root order is preserved, and subtasks still use `childOrder`.
 * @updated 2026-05-14: Added regression coverage for the quick-picker date gate so `Maybe` stays available on today and future dates, while past dates still hide it.
 * @updated 2026-05-14: Added regression coverage so recurring todos reappear only for the quick `Maybe` picker tab, while Arrange / Due still exclude them.
 * @updated 2026-05-12: Added search coverage so matching subtasks keep their parent row visible inside the schedule assignment picker hierarchy.
 * @updated 2026-04-25: Added coverage for resolving completed-parent visibility from the full todo source instead of the unfinished picker subset.
 */

import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { TodoItem } from '../types';
import {
  buildTodoScheduleAssignRows,
  getInitialExpandedScheduleAssignParentIds,
  getVisibleScheduleAssignTodos
} from '../utils/todoScheduleAssignUtils';

describe('isTodayOrFutureScheduleAssignDate', () => {
  let isTodayOrFutureScheduleAssignDate: typeof import('./TodoScheduleAssignModal').isTodayOrFutureScheduleAssignDate;
  const referenceDate = new Date(2026, 4, 14, 18, 30, 0);

  beforeAll(async () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(() => null),
      length: 0
    });

    ({ isTodayOrFutureScheduleAssignDate } = await import('./TodoScheduleAssignModal'));
  });

  it('treats today as eligible for the Maybe tab', () => {
    expect(isTodayOrFutureScheduleAssignDate('2026-05-14', referenceDate)).toBe(true);
  });

  it('keeps future dates eligible and past dates ineligible', () => {
    expect(isTodayOrFutureScheduleAssignDate('2026-05-15', referenceDate)).toBe(true);
    expect(isTodayOrFutureScheduleAssignDate('2026-05-13', referenceDate)).toBe(false);
  });
});

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

  it('builds visible rows so subtasks render beneath their parent instead of as flat standalone cards', () => {
    const allTodos: TodoItem[] = [
      {
        id: 'parent-open',
        categoryId: 'cat-1',
        title: 'Parent task',
        isCompleted: false
      } as TodoItem,
      {
        id: 'child-a',
        categoryId: 'cat-1',
        parentTodoId: 'parent-open',
        childOrder: 1,
        title: 'Child A',
        isCompleted: false
      } as TodoItem,
      {
        id: 'child-b',
        categoryId: 'cat-1',
        parentTodoId: 'parent-open',
        childOrder: 2,
        title: 'Child B',
        isCompleted: false
      } as TodoItem,
      {
        id: 'solo-open',
        categoryId: 'cat-1',
        title: 'Solo task',
        isCompleted: false
      } as TodoItem
    ];

    const visibleTodos = getVisibleScheduleAssignTodos(allTodos, allTodos, 'all', 'scheduled', 'scheduled');
    const expandedParentIds = getInitialExpandedScheduleAssignParentIds(visibleTodos, allTodos);
    const rows = buildTodoScheduleAssignRows(visibleTodos, allTodos, expandedParentIds, 'scheduled', 'scheduled');

    expect(rows.map((row) => `${row.level}:${row.todo.id}`)).toEqual([
      '0:parent-open',
      '1:child-a',
      '1:child-b',
      '0:solo-open'
    ]);
  });

  it('keeps undated roots first, preserves saved root order, and still sorts subtasks by childOrder', () => {
    const allTodos: TodoItem[] = [
      {
        id: 'root-dated',
        categoryId: 'cat-1',
        title: 'Root dated',
        isCompleted: false,
        scheduledDate: '2026-05-20'
      } as TodoItem,
      {
        id: 'root-undated-b',
        categoryId: 'cat-1',
        title: 'Root undated B',
        isCompleted: false
      } as TodoItem,
      {
        id: 'root-undated-a',
        categoryId: 'cat-1',
        title: 'Root undated A',
        isCompleted: false
      } as TodoItem,
      {
        id: 'child-late',
        categoryId: 'cat-1',
        parentTodoId: 'root-undated-a',
        childOrder: 2,
        title: 'Child late',
        isCompleted: false
      } as TodoItem,
      {
        id: 'child-early',
        categoryId: 'cat-1',
        parentTodoId: 'root-undated-a',
        childOrder: 1,
        title: 'Child early',
        isCompleted: false
      } as TodoItem,
      {
        id: 'root-dated-earlier',
        categoryId: 'cat-1',
        title: 'Root dated earlier',
        isCompleted: false,
        scheduledDate: '2026-05-18'
      } as TodoItem
    ];

    const visibleTodos = getVisibleScheduleAssignTodos(allTodos, allTodos, 'all', 'scheduled', 'scheduled');
    const expandedParentIds = getInitialExpandedScheduleAssignParentIds(visibleTodos, allTodos);
    const rows = buildTodoScheduleAssignRows(visibleTodos, allTodos, expandedParentIds, 'scheduled', 'scheduled');

    expect(visibleTodos.map((todo) => todo.id)).toEqual([
      'root-undated-b',
      'root-undated-a',
      'child-early',
      'child-late',
      'root-dated-earlier',
      'root-dated'
    ]);
    expect(rows.map((row) => `${row.level}:${row.todo.id}`)).toEqual([
      '0:root-undated-b',
      '0:root-undated-a',
      '1:child-early',
      '1:child-late',
      '0:root-dated-earlier',
      '0:root-dated'
    ]);
  });

  it('keeps a matched subtask attached to its parent when search filters the picker', () => {
    const allTodos: TodoItem[] = [
      {
        id: 'parent-open',
        categoryId: 'cat-1',
        title: 'Parent task',
        isCompleted: false
      } as TodoItem,
      {
        id: 'child-match',
        categoryId: 'cat-1',
        parentTodoId: 'parent-open',
        childOrder: 1,
        title: 'Matched chapter',
        isCompleted: false
      } as TodoItem,
      {
        id: 'child-other',
        categoryId: 'cat-1',
        parentTodoId: 'parent-open',
        childOrder: 2,
        title: 'Other chapter',
        isCompleted: false
      } as TodoItem,
      {
        id: 'solo-open',
        categoryId: 'cat-1',
        title: 'Solo task',
        isCompleted: false
      } as TodoItem
    ];

    const visibleTodos = getVisibleScheduleAssignTodos(allTodos, allTodos, 'all', 'scheduled', 'scheduled', 'matched');
    const expandedParentIds = getInitialExpandedScheduleAssignParentIds(visibleTodos, allTodos);
    const rows = buildTodoScheduleAssignRows(visibleTodos, allTodos, expandedParentIds, 'scheduled', 'scheduled');

    expect(visibleTodos.map((todo) => todo.id)).toEqual([
      'parent-open',
      'child-match'
    ]);
    expect(rows.map((row) => `${row.level}:${row.todo.id}`)).toEqual([
      '0:parent-open',
      '1:child-match'
    ]);
  });

  it('keeps recurring todos out of Arrange / Due but allows them in Maybe', () => {
    const allTodos: TodoItem[] = [
      {
        id: 'recurring',
        categoryId: 'cat-1',
        title: 'Recurring task',
        isCompleted: false,
        recurrenceRule: {
          frequency: 'weekly',
          startDate: '2026-05-01',
          weekdays: [1]
        }
      } as TodoItem,
      {
        id: 'one-shot',
        categoryId: 'cat-1',
        title: 'One-shot task',
        isCompleted: false
      } as TodoItem
    ];

    expect(getVisibleScheduleAssignTodos(allTodos, allTodos, 'all', 'scheduled', 'scheduled').map((todo) => todo.id)).toEqual([
      'one-shot'
    ]);
    expect(getVisibleScheduleAssignTodos(allTodos, allTodos, 'all', 'deadline', 'deadline').map((todo) => todo.id)).toEqual([
      'one-shot'
    ]);
    expect(getVisibleScheduleAssignTodos(allTodos, allTodos, 'all', 'maybe', 'maybe').map((todo) => todo.id)).toEqual([
      'recurring',
      'one-shot'
    ]);
  });
});
