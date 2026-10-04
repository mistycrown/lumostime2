/**
 * @file todoParentLinkUtils.test.ts
 * @input Existing tasks, hierarchy and main-task filters
 * @output Regression coverage for association eligibility and inherited task fields
 * @pos Test
 * @updated 2026-10-04: Covers filtering, invalid hierarchy rejection and reparenting without losing task data.
 */
import { describe, expect, test } from 'vitest';
import { TodoItem } from '../types';
import { buildTodoParentLink, canTodoLinkToParent, getTodoParentCandidates } from './todoParentLinkUtils';

const task = (id: string, overrides: Partial<TodoItem> = {}): TodoItem => ({
  id, title: id, categoryId: 'cat-a', isCompleted: false, ...overrides
});
const source = task('source', { note: '保留备注', scheduledDate: '2026-10-05', completedUnits: 2 });
const parent = task('parent', {
  title: '整理参考文献', categoryId: 'cat-b', linkedCategoryId: 'activity-category',
  linkedActivityId: 'activity', defaultScopeIds: ['scope']
});

describe('main-task association', () => {
  test('filters across categories and searches Chinese titles and notes', () => {
    const other = task('other', { title: 'Reading', note: 'PAPER notes' });
    const todos = [source, parent, other];
    expect(getTodoParentCandidates(source, todos).map((todo) => todo.id)).toEqual(['parent', 'other']);
    expect(getTodoParentCandidates(source, todos, 'cat-b', '  文献 ')).toEqual([parent]);
    expect(getTodoParentCandidates(source, todos, 'cat-a', '文献')).toEqual([]);
    expect(getTodoParentCandidates(source, todos, '', 'paper')).toEqual([other]);
  });

  test('rejects self, children, quick reminders, recurring and completed parents', () => {
    const todos = [source, parent,
      task('child', { parentTodoId: parent.id }),
      task('quick', { kind: 'quick' }),
      task('recurring', { recurrenceRule: { frequency: 'daily' } as any }),
      task('completed', { isCompleted: true })
    ];
    expect(getTodoParentCandidates(source, todos)).toEqual([parent]);
    for (const invalidId of ['source', 'child', 'quick', 'recurring', 'completed', 'missing']) {
      expect(buildTodoParentLink(source, todos, invalidId)).toBeNull();
    }
  });

  test('preserves source data and inherits parent settings when upgrading a quick reminder', () => {
    const quick = { ...source, kind: 'quick' as const };
    const todos = [quick, parent, task('sibling', { parentTodoId: parent.id, childOrder: 4 })];
    const linked = buildTodoParentLink(quick, todos, parent.id)!;
    expect(linked).toMatchObject({
      id: source.id, title: source.title, note: '保留备注', scheduledDate: '2026-10-05', completedUnits: 2,
      kind: 'project', parentTodoId: parent.id, childOrder: 5, categoryId: 'cat-b',
      linkedCategoryId: 'activity-category', linkedActivityId: 'activity', defaultScopeIds: ['scope']
    });
    expect(linked.defaultScopeIds).not.toBe(parent.defaultScopeIds);
    expect(quick.kind).toBe('quick');
  });

  test('blocks tasks with children and recurring source tasks without changing their hierarchy', () => {
    const todos = [source, parent, task('child', { parentTodoId: source.id })];
    expect(canTodoLinkToParent(source, todos)).toBe(false);
    expect(buildTodoParentLink(source, todos, parent.id)).toBeNull();
    const recurring = { ...source, recurrenceRule: { frequency: 'daily' } as any };
    expect(buildTodoParentLink(recurring, [recurring, parent], parent.id)).toBeNull();
    expect(buildTodoParentLink(null, todos, parent.id)).toBeNull();
  });

  test('reparents existing subtasks and ignores the current parent', () => {
    const child = { ...source, parentTodoId: 'old-parent', childOrder: 8 };
    const todos = [child, parent, task('old-parent')];
    expect(buildTodoParentLink(child, todos, 'old-parent')).toBeNull();
    expect(buildTodoParentLink(child, todos, parent.id)).toMatchObject({ parentTodoId: parent.id, childOrder: 1 });
  });
});
