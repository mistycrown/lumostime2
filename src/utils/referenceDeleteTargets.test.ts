/**
 * @file referenceDeleteTargets.test.ts
 * @input Mixed-order todos, completed parents, excluded targets and search queries
 * @output Regression coverage for safe hierarchical migration target discovery
 * @pos Test (Reference deletion)
 * @updated 2026-10-16: Covers hierarchy, eligibility, ordering, contextual search and flat scope targets.
 */
import { describe, expect, it } from 'vitest';
import type { TodoItem } from '../types';
import { getReferenceDeleteTargetGroups, getTodoReferenceDeleteTargets } from './referenceDeleteTargets';

const todo = (id: string, title: string, extra: Partial<TodoItem> = {}): TodoItem => ({
  id, title, categoryId: 'reading', isCompleted: false, ...extra
});
const todos = [
  todo('child-b', '第二章', { parentTodoId: 'parent', childOrder: 2 }),
  todo('other', '散步'),
  todo('parent', '阅读计划'),
  todo('child-a', '第一章', { parentTodoId: 'parent', childOrder: 1 }),
  todo('done-child', '已读章节', { parentTodoId: 'parent', isCompleted: true }),
  todo('source', '即将删除'),
  todo('done-parent', '旧计划', { isCompleted: true }),
  todo('open-child', '待整理', { parentTodoId: 'done-parent' })
];

describe('deletion migration targets', () => {
  it('keeps root order and child order while excluding completed and deleted targets', () => {
    const targets = getTodoReferenceDeleteTargets(todos, ['source', 'parent', 'child-a', 'child-b', 'done-child']);
    expect(targets.map((target) => target.id)).toEqual(['other', 'done-parent', 'open-child']);
    expect(targets.find((target) => target.id === 'done-parent')?.selectable).toBe(false);
    expect(getTodoReferenceDeleteTargets(todos).map((target) => target.id)).toEqual([
      'other', 'parent', 'child-a', 'child-b', 'source', 'done-parent', 'open-child'
    ]);
  });

  it('retains the parent and only matching children when searching for a child', () => {
    const groups = getReferenceDeleteTargetGroups(getTodoReferenceDeleteTargets(todos), ' 第一 ');
    expect(groups.map((group) => [group.target.id, group.children.map((child) => child.id)])).toEqual([
      ['parent', ['child-a']]
    ]);
  });

  it('finds all children by the parent name and handles case-insensitive flat targets', () => {
    const groups = getReferenceDeleteTargetGroups(getTodoReferenceDeleteTargets(todos), '阅读');
    expect(groups[0].children.map((child) => child.id)).toEqual(['child-a', 'child-b']);
    expect(getReferenceDeleteTargetGroups([{ id: 'scope', name: 'Work', icon: '📖' }], ' WORK ')[0].target.id).toBe('scope');
  });

  it('allows unfinished children under completed parents without making the parent selectable', () => {
    const groups = getReferenceDeleteTargetGroups(getTodoReferenceDeleteTargets(todos), '待整理');
    expect(groups[0].target).toMatchObject({ id: 'done-parent', selectable: false });
    expect(groups[0].children).toEqual([{ id: 'open-child', name: '待整理', parentId: 'done-parent' }]);
  });

  it('preserves orphan targets, returns no matches and does not mutate inputs', () => {
    const input = Object.freeze([Object.freeze(todo('orphan', '独立任务', { parentTodoId: 'missing' }))]);
    const targets = getTodoReferenceDeleteTargets([...input]);
    expect(getReferenceDeleteTargetGroups(targets, '')[0].target.id).toBe('orphan');
    expect(getReferenceDeleteTargetGroups(targets, '不存在')).toEqual([]);
    expect(input[0].parentTodoId).toBe('missing');
    expect(getTodoReferenceDeleteTargets([todo('done', '已完成', { isCompleted: true })])).toEqual([]);
  });
});
