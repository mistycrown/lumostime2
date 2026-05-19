/**
 * @file TodoScheduleViewsFallback.test.tsx
 * @input Schedule-view props with a monthly 31st month-end fallback rule
 * @output Regression coverage for schedule views rendering short-month recurring todos
 * @pos Test
 * @description Verifies the week and month schedule views can render a `31 -> 月末` recurring todo during a short month without crashing.
 * @updated 2026-05-18: Added render coverage for monthly fallback recurrence in both TodoMonthView and TodoBentoWeekView.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { TodoBentoWeekView } from './TodoBentoWeekView';
import { TodoMonthView } from './TodoMonthView';

vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node
  };
});

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

beforeEach(() => {
  const storage = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true
  });
});

describe('todo schedule views monthly fallback recurrence', () => {
  test('renders the month view during a short month without crashing', () => {
    expect(() => renderToStaticMarkup(
      <TodoMonthView
        todos={[recurringTodo as any]}
        todoCategories={[{ id: 'cat-1', name: 'Category', icon: 'book', color: '#000000' } as any]}
        activityCategories={[]}
        scopes={[]}
        logs={[]}
        referenceDate={new Date('2026-04-15T12:00:00+08:00')}
        entryJumpSignal={0}
        viewMenuNode={null}
      />
    )).not.toThrow();
  });

  test('renders the bento week view during a short month without crashing', () => {
    expect(() => renderToStaticMarkup(
      <TodoBentoWeekView
        todos={[recurringTodo as any]}
        todoCategories={[{ id: 'cat-1', name: 'Category', icon: 'book', color: '#000000' } as any]}
        logs={[]}
        weekStartDate={new Date('2026-04-27T12:00:00+08:00')}
        headerWeekLabel="2026.04.27 - 2026.05.03"
        isCurrentWeek={false}
        onGoToPreviousWeek={vi.fn()}
        onGoToNextWeek={vi.fn()}
        onGoToCurrentWeek={vi.fn()}
        onOpenWeekPicker={vi.fn()}
        viewMenuNode={null}
      />
    )).not.toThrow();
  });
});
