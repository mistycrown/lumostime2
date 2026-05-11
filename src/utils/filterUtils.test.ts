/**
 * @file filterUtils.test.ts
 * @input Todo-style custom filter expressions with linked category/scope metadata
 * @output Regression coverage for month-view todo hidden-filter matching
 * @pos Test (custom filter utilities)
 * @description Verifies that todo-target custom filter expressions reuse the same AND/OR parser while matching todo title/category, linked activity/category, default scopes, and notes.
 * @updated 2026-05-11: Added todo hidden-filter coverage for the month-view display-settings expression.
 */

import { describe, expect, test } from 'vitest';
import { Category, Scope, TodoCategory, TodoItem } from '../types';
import { matchesTodoFilterExpression } from './filterUtils';

const activityCategories: Category[] = [
  {
    id: 'activity-category-study',
    name: '学习',
    icon: '📚',
    activities: [
      {
        id: 'activity-reading',
        name: '阅读',
        icon: '📖',
        color: 'bg-stone-100'
      },
      {
        id: 'activity-writing',
        name: '写作',
        icon: '✍️',
        color: 'bg-stone-100'
      }
    ],
    themeColor: '#333333'
  },
  {
    id: 'activity-category-fitness',
    name: '运动',
    icon: '🏃',
    activities: [
      {
        id: 'activity-run',
        name: '跑步',
        icon: '👟',
        color: 'bg-stone-100'
      }
    ],
    themeColor: '#666666'
  }
];

const scopes: Scope[] = [
  {
    id: 'scope-health',
    name: '健康',
    icon: '💪',
    isArchived: false,
    order: 0,
    themeColor: '#00aa88'
  },
  {
    id: 'scope-school',
    name: '学校',
    icon: '🏫',
    isArchived: false,
    order: 1,
    themeColor: '#3366ff'
  }
];

const todoCategories: TodoCategory[] = [
  {
    id: 'todo-category-plan',
    name: '计划',
    icon: '🗂️'
  },
  {
    id: 'todo-category-life',
    name: '生活',
    icon: '🌿'
  }
];

const buildTodo = (overrides: Partial<TodoItem>): TodoItem => ({
  id: 'todo-1',
  categoryId: 'todo-category-plan',
  title: '写作复盘',
  isCompleted: false,
  linkedCategoryId: 'activity-category-study',
  linkedActivityId: 'activity-reading',
  defaultScopeIds: ['scope-health'],
  note: '今晚复盘阅读笔记',
  ...overrides
});

const filterContext = {
  categories: activityCategories,
  scopes,
  todoCategories
};

describe('matchesTodoFilterExpression', () => {
  test('returns false for empty expressions so blank month filters do not hide everything', () => {
    expect(matchesTodoFilterExpression(buildTodo({}), '', filterContext)).toBe(false);
    expect(matchesTodoFilterExpression(buildTodo({}), '   ', filterContext)).toBe(false);
  });

  test('matches @ tokens against todo title or todo category title', () => {
    expect(matchesTodoFilterExpression(buildTodo({}), '@写作', filterContext)).toBe(true);
    expect(matchesTodoFilterExpression(buildTodo({}), '@计划', filterContext)).toBe(true);
    expect(matchesTodoFilterExpression(buildTodo({ categoryId: 'todo-category-life' }), '@计划', filterContext)).toBe(false);
  });

  test('matches # tokens against linked activity or linked activity category and keeps OR prefix inheritance', () => {
    expect(matchesTodoFilterExpression(buildTodo({}), '#阅读', filterContext)).toBe(true);
    expect(matchesTodoFilterExpression(buildTodo({}), '#学习', filterContext)).toBe(true);
    expect(matchesTodoFilterExpression(buildTodo({ linkedCategoryId: 'activity-category-fitness', linkedActivityId: 'activity-run' }), '#阅读 OR 运动', filterContext)).toBe(true);
  });

  test('keeps space as AND while matching scopes and note text', () => {
    expect(matchesTodoFilterExpression(buildTodo({}), '%健康 复盘', filterContext)).toBe(true);
    expect(matchesTodoFilterExpression(buildTodo({ note: '只有阅读' }), '%健康 复盘', filterContext)).toBe(false);
    expect(matchesTodoFilterExpression(buildTodo({ defaultScopeIds: ['scope-school'] }), '%健康 复盘', filterContext)).toBe(false);
  });
});
