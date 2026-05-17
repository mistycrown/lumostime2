/**
 * @file desktopMonthWidgetSidebarUtils.test.ts
 * @input Representative todo/category fixtures for the desktop month-widget planning sidebar
 * @output Regression coverage for grouped sidebar sections, subtask hierarchy, and orphan child labeling
 * @pos Test (desktop month widget sidebar)
 * @description Verifies the desktop month widget planning sidebar renders one section per todo group, nests visible subtasks under their parent, and keeps filtered-parent subtasks visible with inline `@parent` context.
 * @updated 2026-05-17: Added first-pass coverage for the desktop month widget sidebar grouping and hierarchy model.
 */
import { describe, expect, it } from 'vitest';
import type { TodoCategory, TodoItem } from '../types';
import { buildDesktopMonthSidebarSections } from './desktopMonthWidgetSidebarUtils';

const todoCategories: TodoCategory[] = [
  { id: 'work', name: '工作', icon: 'W' },
  { id: 'life', name: '生活', icon: 'L' }
];

const buildTodo = (overrides: Partial<TodoItem> & Pick<TodoItem, 'id' | 'title'>): TodoItem => ({
  id: overrides.id,
  categoryId: overrides.categoryId || 'work',
  title: overrides.title,
  isCompleted: overrides.isCompleted ?? false,
  ...overrides
});

describe('buildDesktopMonthSidebarSections', () => {
  it('groups rows by todo category and keeps visible subtasks nested under the parent row', () => {
    const todos: TodoItem[] = [
      buildTodo({ id: 'parent-work', title: '写方案', categoryId: 'work' }),
      buildTodo({
        id: 'child-work-1',
        title: '列提纲',
        categoryId: 'work',
        parentTodoId: 'parent-work',
        childOrder: 1
      }),
      buildTodo({
        id: 'child-work-2',
        title: '补例子',
        categoryId: 'work',
        parentTodoId: 'parent-work',
        childOrder: 2
      }),
      buildTodo({ id: 'life-root', title: '买菜', categoryId: 'life' })
    ];

    const sections = buildDesktopMonthSidebarSections(todos, todoCategories, 'scheduled');

    expect(sections.map((section) => section.title)).toEqual(['工作', '生活']);
    expect(sections[0]?.rows.map((row) => `${row.level}:${row.displayTitle}`)).toEqual([
      '0:写方案',
      '1:列提纲',
      '1:补例子'
    ]);
    expect(sections[1]?.rows.map((row) => `${row.level}:${row.displayTitle}`)).toEqual([
      '0:买菜'
    ]);
  });

  it('keeps subtasks visible as standalone rows when their parent is filtered out of the active tab', () => {
    const todos: TodoItem[] = [
      buildTodo({
        id: 'parent-scheduled',
        title: '整理行程',
        categoryId: 'work',
        scheduledDate: '2026-05-20'
      }),
      buildTodo({
        id: 'child-unscheduled',
        title: '确认酒店',
        categoryId: 'work',
        parentTodoId: 'parent-scheduled'
      })
    ];

    const sections = buildDesktopMonthSidebarSections(todos, todoCategories, 'scheduled');

    expect(sections).toHaveLength(1);
    expect(sections[0]?.rows.map((row) => `${row.level}:${row.displayTitle}`)).toEqual([
      '0:确认酒店 @整理行程'
    ]);
  });

  it('hides unfinished subtasks when their parent task is already completed', () => {
    const todos: TodoItem[] = [
      buildTodo({
        id: 'done-parent',
        title: '完成父任务',
        categoryId: 'work',
        isCompleted: true
      }),
      buildTodo({
        id: 'hidden-child',
        title: '不该再出现的子任务',
        categoryId: 'work',
        parentTodoId: 'done-parent'
      })
    ];

    const sections = buildDesktopMonthSidebarSections(todos, todoCategories, 'maybe');

    expect(sections).toEqual([]);
  });
});
