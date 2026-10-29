/**
 * @file goalUtils.test.ts
 * @input Goal date range keys
 * @output Regression coverage for inclusive local-calendar goal boundaries
 * @pos Test (goal utilities)
 * @description Verifies that goal ranges include the full local start and end dates.
 * @updated 2026-07-21: Added inclusive local-day boundary coverage.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */
import { describe, expect, test } from 'vitest';
import { calculateGoalProgress, getGoalDateRange, getGoalFilterExpression } from './goalUtils';
import type { Category, Goal, Scope, TodoCategory, TodoItem } from '../types';

describe('getGoalDateRange', () => {
  test('includes the full local start and end dates', () => {
    const { start, end } = getGoalDateRange('2026-07-21', '2026-07-25');

    expect(start).toBe(new Date(2026, 6, 21, 0, 0, 0, 0).getTime());
    expect(end).toBe(new Date(2026, 6, 25, 23, 59, 59, 999).getTime());
    expect(start).toBeLessThanOrEqual(new Date(2026, 6, 21, 0, 0, 0, 0).getTime());
    expect(end).toBeGreaterThanOrEqual(new Date(2026, 6, 25, 23, 59, 59, 999).getTime());
  });
});

describe('goal filter expressions', () => {
  const categories = [{ id: 'cat', name: '工作', icon: '', themeColor: '', activities: [{ id: 'read', name: '阅读', icon: 'R', color: '' }] }] as Category[];
  const scopes = [{ id: 'scope', name: '学习', themeColor: '' }] as Scope[];
  const todoCategories = [{ id: 'todo-cat', name: '项目', icon: 'T' }] as TodoCategory[];
  const goal = (patch: Partial<Goal> = {}): Goal => ({ id: 'g', title: '目标', scopeId: 'scope', metric: 'duration_raw', targetValue: 3600, startDate: '2026-01-01', endDate: '2026-12-31', status: 'active', ...patch });

  test('falls back to legacy activity and todo category filters', () => {
    expect(getGoalFilterExpression(goal({ filterActivityIds: ['read'] }), categories, todoCategories)).toBe('#阅读');
    expect(getGoalFilterExpression(goal({ filterTodoCategories: ['todo-cat'] }), categories, todoCategories)).toBe('@项目');
  });

  test('matches mixed expressions while retaining the base scope', () => {
    const logs = [
      { id: 'match', activityId: 'read', categoryId: 'cat', scopeIds: ['scope'], startTime: new Date(2026, 1, 1).getTime(), endTime: new Date(2026, 1, 1, 1).getTime(), duration: 3600, note: '深度' },
      { id: 'wrong-scope', activityId: 'read', categoryId: 'cat', scopeIds: ['other'], startTime: new Date(2026, 1, 1).getTime(), endTime: new Date(2026, 1, 1, 1).getTime(), duration: 3600, note: '深度' }
    ];
    expect(calculateGoalProgress(goal({ filterExpression: '#阅读 %学习 深度' }), logs, [], categories, scopes, todoCategories).current).toBe(3600);
  });
});
