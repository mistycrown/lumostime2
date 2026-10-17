/**
 * @file statsLogDetailsUtils.test.ts
 * @input Tag/todo/scope selections, actual/planned logs and entity metadata
 * @output Regression coverage for independent chart filtering, identities and scope duration totals
 * @updated 2026-10-17: Covers duplicate names, multi-scope attribution and stored-duration grouping.
 */
import { describe, expect, it } from 'vitest';
import type { Log, TodoItem } from '../types';
import { getDateRange } from '../components/StatsView/statsUtils';
import { buildStatsLogGroups, getStatsLogsDuration, type StatsLogGroup } from './statsLogGroupingUtils';
import { getStatsDetailIdentity, selectStatsDetailLogs, type StatsLogMetadata } from './statsLogDetailsUtils';

const date = new Date(2026, 9, 16);
const period = getDateRange(date, 'day');
const start = new Date(2026, 9, 16, 9).getTime();
const log = (id: string, extra: Partial<Log> = {}): Log => ({
  id, categoryId: 'study', activityId: 'read', startTime: start, endTime: start + 1800000,
  duration: 1200, ...extra
});
const todos: TodoItem[] = [
  { id: 'book', title: '读书', categoryId: 'projects', isCompleted: false },
  { id: 'notes', title: '整理笔记', categoryId: 'projects', isCompleted: true },
  { id: 'duplicate', title: '读书', categoryId: 'other', isCompleted: false }
];
const logs = [
  log('first', { linkedTodoId: 'book', scopeIds: ['growth', 'health', 'growth'] }),
  log('second', { categoryId: 'self', activityId: 'run', linkedTodoId: 'notes', startTime: start + 3600000, endTime: start + 5400000, scopeIds: ['growth'] }),
  log('other-todo', { linkedTodoId: 'duplicate', scopeIds: ['health'] }),
  log('no-todo', { scopeIds: ['growth'] }),
  log('planned', { linkedTodoId: 'book', scopeIds: ['growth'], isPlanned: true }),
  log('outside', { linkedTodoId: 'book', scopeIds: ['growth'], startTime: start - 86400000, endTime: start - 84600000 })
];
const metadata: StatsLogMetadata = {
  categories: [{ id: 'study', name: '学习', icon: '📚', themeColor: '#a7f3d0', activities: [{ id: 'read', name: '阅读', icon: '📖', color: '#bae6fd' }] }],
  todos,
  todoCategories: [{ id: 'projects', name: '阅读计划', icon: '📝', color: '#e9d5ff' }],
  scopes: [{ id: 'growth', name: '个人成长', icon: '🌱', themeColor: '#a7f3d0', isArchived: false, order: 0 }]
};

describe('chart entity log details', () => {
  it('selects a todo category across activity categories, including completed todos', () => {
    expect(selectStatsDetailLogs(logs, { type: 'todoCategory', categoryId: 'projects' }, todos, period).map(item => item.id)).toEqual(['first', 'second']);
  });

  it('matches a single todo by ID rather than its duplicated title', () => {
    expect(selectStatsDetailLogs(logs, { type: 'todo', todoId: 'book' }, todos, period).map(item => item.id)).toEqual(['first']);
  });

  it('counts a multi-scope record once in each linked scope and excludes plans/out-of-range logs', () => {
    const growth = selectStatsDetailLogs(logs, { type: 'scope', scopeId: 'growth' }, todos, period);
    const health = selectStatsDetailLogs(logs, { type: 'scope', scopeId: 'health' }, todos, period);
    expect(growth.map(item => item.id)).toEqual(['first', 'no-todo', 'second']);
    expect(health.map(item => item.id)).toEqual(['first', 'other-todo']);
    expect(getStatsLogsDuration(growth, 'scope')).toBe(3600);
    expect(getStatsLogsDuration(health, 'scope')).toBe(2400);
    expect(getStatsLogsDuration(growth)).toBe(5400);
  });

  it('keeps original tag activity and category matching unchanged', () => {
    expect(selectStatsDetailLogs(logs, { categoryId: 'study', activityId: 'read' }, todos, period).map(item => item.id)).toEqual(['first', 'no-todo', 'other-todo']);
    expect(selectStatsDetailLogs(logs, { categoryId: 'self' }, todos, period).map(item => item.id)).toEqual(['second']);
  });

  it('resolves dialog titles, parent categories, icons and selected chart colors', () => {
    expect(getStatsDetailIdentity({ type: 'todo', todoId: 'book', color: '#ffedd5' }, metadata)).toMatchObject({ name: '读书', subtitle: '阅读计划', icon: '📝', color: '#ffedd5' });
    expect(getStatsDetailIdentity({ type: 'todoCategory', categoryId: 'projects' }, metadata)).toMatchObject({ name: '阅读计划', color: '#e9d5ff' });
    expect(getStatsDetailIdentity({ type: 'scope', scopeId: 'growth' }, metadata)).toMatchObject({ name: '个人成长', icon: '🌱', color: '#a7f3d0' });
    expect(getStatsDetailIdentity({ categoryId: 'study', activityId: 'read' }, metadata)).toMatchObject({ name: '阅读', subtitle: '学习' });
  });

  it('preserves scope chart duration at every month/week/day summary level', () => {
    const selected = selectStatsDetailLogs(logs, { type: 'scope', scopeId: 'growth' }, todos, period);
    const groups = buildStatsLogGroups(selected, 'year', getDateRange(date, 'year'), 'scope');
    const check = (items: StatsLogGroup[]) => items.forEach(group => {
      expect(group.duration).toBe(getStatsLogsDuration(group.logs, 'scope'));
      if (group.children.length) {
        expect(group.children.reduce((sum, child) => sum + child.duration, 0)).toBe(group.duration);
        check(group.children);
      }
    });
    check(groups);
    expect(groups[9].duration).toBe(3600);
  });

  it('handles deleted entities, missing timestamps and scope duration fallbacks safely', () => {
    expect(selectStatsDetailLogs(logs, { type: 'todoCategory', categoryId: 'deleted' }, todos, period)).toEqual([]);
    expect(selectStatsDetailLogs([{ ...logs[0], startTime: undefined } as unknown as Log], { type: 'todo', todoId: 'book' }, todos, period)).toEqual([]);
    expect(getStatsDetailIdentity({ type: 'scope', scopeId: 'deleted' }, metadata).name).toBe('记录明细');
    expect(getStatsLogsDuration([{ ...logs[0], duration: NaN }], 'scope')).toBe(1800);
  });
});
