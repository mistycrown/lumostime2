/**
 * @file widgetService.test.ts
 * @input TODAY + PIN payload builders plus native provider source text
 * @output Regression coverage for pinned/recurring TODAY + PIN widget payload items and header tap bindings
 * @pos Test (widget service)
 * @description Verifies pinned and recurring-today todos can populate the TODAY + PIN widget payload, and guards against reintroducing the header tap-to-open binding.
 * @updated 2026-04-27: Added regression coverage so recurring todos that match today are included in the TODAY + PIN widget payload.
 * @updated 2026-04-26: Added regression coverage for pinned todo actionability and removed header click bindings from the dedicated TODAY + PIN widgets.
 */

import { describe, expect, it } from 'vitest';
import type { Category, TodoItem } from '../types';
import { buildTodoPinWidgetPayload } from './widgetService';
import widgetTodoPinProviderSupportSource from '../../android/app/src/main/java/com/mistycrown/lumostime/WidgetTodoPinProviderSupport.java?raw';

const REFERENCE_DATE = new Date('2026-04-26T09:30:00+08:00');

const categories: Category[] = [
  {
    id: 'focus-category',
    name: 'Focus',
    icon: '🎯',
    themeColor: '#7C3AED',
    activities: [
      {
        id: 'writing-activity',
        name: 'Writing',
        icon: '✍️',
        color: '#8B5CF6'
      }
    ]
  }
];

const buildTodo = (overrides: Partial<TodoItem>): TodoItem => ({
  id: 'todo-1',
  categoryId: 'todo-category-1',
  title: 'Pinned Todo',
  isCompleted: false,
  ...overrides
});

describe('buildTodoPinWidgetPayload', () => {
  it('keeps pinned todos startable when they inherit linked activity metadata from the parent todo', () => {
    const todos: TodoItem[] = [
      buildTodo({
        id: 'parent-todo',
        title: 'Parent todo',
        linkedCategoryId: 'focus-category',
        linkedActivityId: 'writing-activity'
      }),
      buildTodo({
        id: 'child-pinned-todo',
        title: 'Pinned child todo',
        parentTodoId: 'parent-todo',
        pin: true
      })
    ];

    const payload = buildTodoPinWidgetPayload({
      todos,
      categories,
      date: REFERENCE_DATE,
      now: 123456789
    });

    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]).toMatchObject({
      todoId: 'child-pinned-todo',
      badgeLabel: 'PIN',
      categoryId: 'focus-category',
      activityId: 'writing-activity',
      activityLabel: 'Writing',
      icon: '✍️'
    });
  });
  it('includes recurring todos that match today in the TODAY + PIN widget payload', () => {
    const todos: TodoItem[] = [
      buildTodo({
        id: 'recurring-todo',
        title: 'Recurring today todo',
        linkedCategoryId: 'focus-category',
        linkedActivityId: 'writing-activity',
        recurrenceRule: {
          frequency: 'daily',
          startDate: '2026-04-20'
        }
      }),
      buildTodo({
        id: 'other-day-todo',
        title: 'Other day todo',
        scheduledDate: '2026-04-27'
      })
    ];

    const payload = buildTodoPinWidgetPayload({
      todos,
      categories,
      date: REFERENCE_DATE,
      now: 123456789
    });

    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]).toMatchObject({
      todoId: 'recurring-todo',
      badgeLabel: 'TODAY',
      categoryId: 'focus-category',
      activityId: 'writing-activity',
      activityLabel: 'Writing'
    });
  });
});

describe('WidgetTodoPinProviderSupport', () => {
  it('does not bind header taps to open the app for the TODAY + PIN widgets', () => {
    expect(widgetTodoPinProviderSupportSource).not.toContain('views.setOnClickPendingIntent(R.id.widget_todo_pin_header');
    expect(widgetTodoPinProviderSupportSource).toContain('views.setPendingIntentTemplate(');
  });
});
