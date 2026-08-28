/**
 * @file filterUtils.test.ts
 * @input Todo-style custom filter expressions with linked category/scope metadata
 * @output Regression coverage for month-view todo hidden-filter matching
 * @pos Test (custom filter utilities)
 * @description Verifies that todo-target and linked-log custom filter expressions reuse the same AND/OR parser while matching todo title/category, linked activity/category, default scopes, and notes.
 * @updated 2026-06-06: Added linked-log coverage so `@` expressions also match todo category names in custom filters.
 * @updated 2026-05-11: Added todo hidden-filter coverage for the month-view display-settings expression.
 * @updated 2026-08-28: Added case-insensitive matching coverage across filter fields.
 */

import { describe, expect, test } from 'vitest';
import { Category, Log, Scope, TodoCategory, TodoItem } from '../types';
import { matchesFilter, matchesTodoFilterExpression, parseFilterExpression } from './filterUtils';

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

const buildLog = (overrides: Partial<Log> = {}): Log => ({
  id: 'log-1',
  activityId: 'activity-reading',
  categoryId: 'activity-category-study',
  startTime: 1,
  endTime: 2,
  duration: 60,
  linkedTodoId: 'todo-1',
  note: '复盘',
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

describe('matchesFilter legacy activity fallback', () => {
  test('matches a legacy log title when its activity reference is stale', () => {
    const staleLog = buildLog({
      activityId: 'removed-activity',
      categoryId: 'removed-category',
      title: '阅读'
    });

    expect(matchesFilter(
      staleLog,
      parseFilterExpression('#阅读'),
      { categories: activityCategories, scopes, todos: [], todoCategories: [] }
    )).toBe(true);
  });
});

describe('matchesFilter case normalization', () => {
  test('matches tags, scopes, todos, and notes without case sensitivity', () => {
    const context = {
      categories: [{
        ...activityCategories[0],
        id: 'case-category',
        name: 'Work',
        activities: [{ ...activityCategories[0].activities[0], id: 'case-activity', name: 'Deep Focus' }]
      }],
      scopes: [{ ...scopes[0], id: 'case-scope', name: 'Health' }],
      todos: [buildTodo({
        id: 'case-todo',
        title: 'Plan',
        linkedCategoryId: 'case-category',
        linkedActivityId: 'case-activity'
      })],
      todoCategories
    };
    const log = buildLog({
      categoryId: 'case-category',
      activityId: 'case-activity',
      scopeIds: ['case-scope'],
      linkedTodoId: 'case-todo',
      note: 'Night Focus'
    });

    expect(matchesFilter(
      log,
      parseFilterExpression('#dEeP %hEaLtH @pLaN nIgHt'),
      context
    )).toBe(true);
  });
});

describe('matchesFilter linked todo matching', () => {
  test('matches @ tokens against linked todo title or linked todo category title', () => {
    const todo = buildTodo({});
    const logContext = {
      categories: activityCategories,
      scopes,
      todos: [todo],
      todoCategories
    };

    expect(matchesFilter(buildLog({}), parseFilterExpression('@写作'), logContext)).toBe(true);
    expect(matchesFilter(buildLog({}), parseFilterExpression('@计划'), logContext)).toBe(true);
    expect(matchesFilter(buildLog({}), parseFilterExpression('@计划 OR 生活'), logContext)).toBe(true);
    expect(
      matchesFilter(
        buildLog({ linkedTodoId: 'todo-2' }),
        parseFilterExpression('@计划'),
        {
          ...logContext,
          todos: [todo, buildTodo({ id: 'todo-2', categoryId: 'todo-category-life' })]
        }
      )
    ).toBe(false);
  });
});
