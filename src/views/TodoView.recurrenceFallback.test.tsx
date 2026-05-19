/**
 * @file TodoView.recurrenceFallback.test.tsx
 * @input TodoView props with a monthly 31st recurrence plus month-end fallback
 * @output Regression coverage for hidden TodoView schedule render paths during detail-page recurrence edits
 * @pos Test
 * @description Verifies TodoView can render its week, bento, and month schedule surfaces with a `31 -> 月末` recurring todo during a short month without crashing.
 * @updated 2026-05-18: Added render coverage for TodoView schedule modes so hidden route trees cannot white-screen detail-page recurrence edits.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { TodoView } from './TodoView';

vi.mock('../contexts/PrivacyContext', () => ({
  usePrivacy: () => ({
    hideSensitiveContent: false
  })
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({
    addToast: vi.fn()
  })
}));

vi.mock('../hooks/useBackgroundDisplay', () => ({
  useBackgroundDisplay: () => ({
    backgroundUrl: null,
    hasBackground: false,
    panelOverlayOpacity: 0.5,
    useReducedEffects: true
  })
}));

vi.mock('../contexts/AIChatWindowContext', () => ({
  useAIChatWindow: () => ({
    openAIChat: vi.fn(),
    unreadCount: 0
  })
}));

vi.mock('../components/FloatingButton', () => ({
  FloatingButton: () => null
}));

vi.mock('../components/UIIcon', () => ({
  UIIcon: () => null
}));

vi.mock('../components/IconRenderer', () => ({
  IconRenderer: () => <span data-testid="icon-renderer" />
}));

vi.mock('../components/TodoScheduleAssignModal', () => ({
  TodoScheduleAssignModal: () => null
}));

vi.mock('../components/TodoDatePickerModal', () => ({
  TodoDatePickerModal: () => null
}));

vi.mock('../components/TodoDisplaySettingsModal', () => ({
  TodoDisplaySettingsModal: () => null
}));

vi.mock('../components/TodoDuplicateModal', () => ({
  TodoDuplicateModal: () => null
}));

vi.mock('../components/TodoQuickActionsModal', () => ({
  TodoQuickActionsModal: () => null
}));

vi.mock('../components/UnreadCountBadge', () => ({
  UnreadCountBadge: () => null
}));

const recurringTodo = {
  id: 'todo-fallback',
  categoryId: 'cat-1',
  title: 'Month-end recurring',
  isCompleted: false,
  recurrenceRule: {
    frequency: 'monthly' as const,
    startDate: '2026-01-31',
    monthDays: [31],
    fallbackToMonthEnd: true
  }
};

const baseProps = {
  todos: [recurringTodo as any],
  logs: [],
  categories: [{ id: 'cat-1', name: 'Category', icon: 'book', color: '#000000' } as any],
  activityCategories: [],
  scopes: [],
  onToggleTodo: vi.fn(),
  onEditTodo: vi.fn(),
  onAddTodo: vi.fn(),
  onStartFocus: vi.fn(),
  onDuplicateTodo: vi.fn(),
  onSaveTodo: vi.fn(),
  onDeleteTodo: vi.fn(),
  autoLinkRules: []
};

describe('TodoView recurrence fallback schedule rendering', () => {
  beforeEach(() => {
    const storage = {
      getItem: vi.fn((key: string) => {
        if (key === 'todoScreenMode') {
          return 'week';
        }

        if (key === 'todoShowCompleted') {
          return 'true';
        }

        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };

    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true
    });
  });

  test.each([
    ['week'],
    ['bento'],
    ['month']
  ])('renders schedule view mode %s without crashing', (mode) => {
    const getItem = vi.fn((key: string) => {
      if (key === 'todoScreenMode') {
        return 'week';
      }

      if (key === 'todoScheduleViewMode') {
        return mode;
      }

      if (key === 'todoShowCompleted') {
        return 'true';
      }

      return null;
    });

    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem,
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      },
      configurable: true
    });

    expect(() => renderToStaticMarkup(
      <TodoView {...baseProps} />
    )).not.toThrow();
  });
});
