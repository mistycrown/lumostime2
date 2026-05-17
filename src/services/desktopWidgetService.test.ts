/**
 * @file desktopWidgetService.test.ts
 * @input Shared today-task snapshot builder plus representative todo/category fixtures
 * @output Regression coverage for the Electron desktop widget today/pin/overdue grouping logic
 * @pos Test (desktop widget service)
 * @description Verifies the desktop today-widget snapshot keeps pinned and today-visible todos together while still surfacing overdue items outside the shared today bucket.
 * @updated 2026-05-17: Added startup preference coverage for Electron desktop widget auto-restore state parsing.
 * @updated 2026-05-17: Added first-pass regression coverage for Electron desktop widget snapshot grouping.
 */
import { describe, expect, it } from 'vitest';
import type { Category, TodoItem } from '../types';
import {
  buildDesktopTodayWidgetSnapshot,
  loadEnabledDesktopWidgetTypes
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
    expect(snapshot.today).toHaveLength(0);
    expect(snapshot.overdue.map((item) => item.todoId)).toEqual([
      'deadline-overdue',
      'scheduled-overdue'
    ]);
    expect(snapshot.summary.completed).toBe(1);
  });
});

describe('loadEnabledDesktopWidgetTypes', () => {
  it('returns only widget types whose startup toggles are enabled', () => {
    const storageLike = {
      getItem(key: string) {
        const map: Record<string, string | null> = {
          lumostime_desktop_widget_today_enabled: 'true',
          lumostime_desktop_widget_month_enabled: 'false',
          lumostime_desktop_widget_quick_enabled: 'true'
        };
        return map[key] ?? null;
      }
    };

    expect(loadEnabledDesktopWidgetTypes(storageLike)).toEqual(['today', 'quick']);
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
