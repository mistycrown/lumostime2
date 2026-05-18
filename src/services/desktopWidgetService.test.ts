/**
 * @file desktopWidgetService.test.ts
 * @input Shared today-task snapshot builder plus representative todo/category fixtures
 * @output Regression coverage for the Electron desktop widget today/pin/overdue grouping logic
 * @pos Test (desktop widget service)
 * @description Verifies the desktop today-widget snapshot keeps pinned and today-visible todos together while still surfacing overdue items outside the shared today bucket.
 * @updated 2026-05-18: Added regression coverage for subtask parent metadata in today-widget snapshot items so compact Electron views can rebuild one-level hierarchy locally.
 * @updated 2026-05-17: 扩展了单元测试，补全了计时器小组件（timer widget）的快照构建 buildDesktopTimerWidgetSnapshot 和 loadEnabledDesktopWidgetTypes 在启用 timer 时的测试覆盖。
 * @updated 2026-05-17: Added startup preference coverage for Electron desktop widget auto-restore state parsing.
 * @updated 2026-05-17: Added first-pass regression coverage for Electron desktop widget snapshot grouping.
 */
import { describe, expect, it } from 'vitest';
import type { Category, TodoItem, ActiveSession } from '../types';
import {
  buildDesktopTodayWidgetSnapshot,
  loadEnabledDesktopWidgetTypes,
  buildDesktopTimerWidgetSnapshot
} from './desktopWidgetService';

const REFERENCE_DATE = new Date('2026-05-17T09:00:00');

const categories: Category[] = [
  {
    id: 'life',
    name: 'Life',
    icon: '🌿',
    activities: [
      {
        id: 'walk',
        name: 'Walk',
        icon: '🚶',
        color: '#5B8C5A'
      }
    ],
    themeColor: '#6B8E23'
  }
];

const buildTodo = (overrides: Partial<TodoItem> & Pick<TodoItem, 'id' | 'title'>): TodoItem => ({
  id: overrides.id,
  categoryId: overrides.categoryId || 'project',
  title: overrides.title,
  isCompleted: overrides.isCompleted ?? false,
  ...overrides
});

describe('buildDesktopTodayWidgetSnapshot', () => {
  it('keeps pinned and today-visible todos in their dedicated sections', () => {
    const todos: TodoItem[] = [
      buildTodo({
        id: 'pin-today',
        title: 'Pinned today',
        pin: true,
        linkedCategoryId: 'life',
        linkedActivityId: 'walk'
      }),
      buildTodo({
        id: 'scheduled-today',
        title: 'Scheduled today',
        scheduledDate: '2026-05-17'
      }),
      buildTodo({
        id: 'deadline-today',
        title: 'Deadline today',
        deadlineDate: '2026-05-17'
      })
    ];

    const snapshot = buildDesktopTodayWidgetSnapshot({
      todos,
      categories,
      date: REFERENCE_DATE
    });

    expect(snapshot.pinned.map((item) => item.todoId)).toEqual(['pin-today']);
    expect(snapshot.today.map((item) => item.todoId)).toEqual(['deadline-today', 'scheduled-today']);
    expect(snapshot.overdue).toHaveLength(0);
    expect(snapshot.summary.remaining).toBe(3);
  });

  it('keeps overdue todos separate from the shared today bucket', () => {
    const todos: TodoItem[] = [
      buildTodo({
        id: 'pin-today',
        title: 'Pinned today',
        pin: true
      }),
      buildTodo({
        id: 'deadline-overdue',
        title: 'Deadline overdue',
        deadlineDate: '2026-05-15'
      }),
      buildTodo({
        id: 'scheduled-overdue',
        title: 'Scheduled overdue',
        scheduledDate: '2026-05-16'
      }),
      buildTodo({
        id: 'done-today',
        title: 'Done today',
        scheduledDate: '2026-05-17',
        isCompleted: true
      })
    ];

    const snapshot = buildDesktopTodayWidgetSnapshot({
      todos,
      categories,
      date: REFERENCE_DATE
    });

    expect(snapshot.pinned.map((item) => item.todoId)).toEqual(['pin-today']);
    expect(snapshot.today.map((item) => item.todoId)).toEqual(['done-today']);
    expect(snapshot.overdue.map((item) => item.todoId)).toEqual([
      'deadline-overdue',
      'scheduled-overdue'
    ]);
    expect(snapshot.summary.completed).toBe(1);
  });

  it('preserves parent metadata for visible subtasks', () => {
    const todos: TodoItem[] = [
      buildTodo({
        id: 'parent',
        title: 'Parent task',
        scheduledDate: '2026-05-17'
      }),
      buildTodo({
        id: 'child',
        title: 'Child task',
        parentTodoId: 'parent',
        scheduledDate: '2026-05-17'
      })
    ];

    const snapshot = buildDesktopTodayWidgetSnapshot({
      todos,
      categories,
      date: REFERENCE_DATE
    });

    const childItem = snapshot.today.find((item) => item.todoId === 'child');
    expect(childItem).toMatchObject({
      parentTodoId: 'parent',
      parentTitle: 'Parent task'
    });
  });
});

describe('loadEnabledDesktopWidgetTypes', () => {
  it('returns only widget types whose startup toggles are enabled', () => {
    const storageLike = {
      getItem(key: string) {
        const map: Record<string, string | null> = {
          lumostime_desktop_widget_today_enabled: 'true',
          lumostime_desktop_widget_month_enabled: 'false',
          lumostime_desktop_widget_quick_enabled: 'true',
          lumostime_desktop_widget_timer_enabled: 'true'
        };
        return map[key] ?? null;
      }
    };

    expect(loadEnabledDesktopWidgetTypes(storageLike)).toEqual(['today', 'quick', 'timer']);
  });

  it('returns an empty list when no desktop widget startup toggle is enabled', () => {
    const storageLike = {
      getItem() {
        return null;
      }
    };

    expect(loadEnabledDesktopWidgetTypes(storageLike)).toEqual([]);
  });
});

describe('buildDesktopTimerWidgetSnapshot', () => {
  it('returns a null session when no active sessions are present', () => {
    const snapshot = buildDesktopTimerWidgetSnapshot([]);
    expect(snapshot.session).toBeNull();
  });

  it('returns the latest active session when only one is present', () => {
    const activeSessions: ActiveSession[] = [
      {
        id: 'session-1',
        activityId: 'coding',
        activityName: 'Coding',
        startTime: 1000000000000
      }
    ];

    const snapshot = buildDesktopTimerWidgetSnapshot(activeSessions);
    expect(snapshot.session).toEqual({
      sessionId: 'session-1',
      activityName: 'Coding',
      startTime: 1000000000000
    });
  });

  it('returns the last active session in the list when multiple are present', () => {
    const activeSessions: ActiveSession[] = [
      {
        id: 'session-1',
        activityId: 'coding',
        activityName: 'Coding',
        startTime: 1000000000000
      },
      {
        id: 'session-2',
        activityId: 'writing',
        activityName: 'Writing Art',
        startTime: 2000000000000
      }
    ];

    const snapshot = buildDesktopTimerWidgetSnapshot(activeSessions);
    expect(snapshot.session).toEqual({
      sessionId: 'session-2',
      activityName: 'Writing Art',
      startTime: 2000000000000
    });
  });
});
