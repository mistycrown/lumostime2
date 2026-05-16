/**
 * @file TodoAssociation.test.ts
 * @input TodoAssociation hierarchy helpers
 * @output Regression coverage for hierarchical todo picker row building
 * @pos Test
 * @description Ensures the todo association picker keeps parent/subtask rows collapsed by default, auto-expands the selected child's parent, and hides completed todos unless the current linked todo needs to stay visible.
 * @updated 2026-05-16: Added regression coverage so reserved `小事` quick todos stay out of association pickers unless a legacy linked quick todo must remain visible during editing.
 * @updated 2026-05-06: Added regression coverage for picker-level completed-todo filtering so finished todos stay hidden by default while the current linked finished todo remains visible.
 * @updated 2026-05-06: Added regression coverage for standalone virtual-category subtasks that should expose their hidden parent title as picker context.
 * @updated 2026-04-25: Added regression coverage so unfinished subtasks stay hidden in the picker whenever their parent todo is completed.
 * @updated 2026-04-22: Added regression coverage for virtual-category style expansion where a visible parent can reveal children from a broader todo source.
 * @updated 2026-04-22: Added regression coverage for collapsed parent rows and expandable child rows inside the shared todo association picker.
 */

import { describe, expect, it } from 'vitest';
import {
  buildTodoAssociationRows,
  filterTodoAssociationCategories,
  filterTodoAssociationPickerTodos,
  getInitialExpandedTodoParentIds
} from '../utils/todoAssociationUtils';
import type { TodoCategory, TodoItem } from '../types';
import { QUICK_TODO_CATEGORY_ID } from '../utils/todoQuickCategoryUtils';

const baseTodos: TodoItem[] = [
  {
    id: 'parent-b',
    categoryId: 'cat-1',
    title: 'Alpha parent',
    isCompleted: false
  } as TodoItem,
  {
    id: 'child-b-1',
    categoryId: 'cat-1',
    parentTodoId: 'parent-b',
    childOrder: 1,
    title: 'Child one',
    isCompleted: false
  } as TodoItem,
  {
    id: 'child-b-2',
    categoryId: 'cat-1',
    parentTodoId: 'parent-b',
    childOrder: 2,
    title: 'Child two',
    isCompleted: false
  } as TodoItem,
  {
    id: 'solo-a',
    categoryId: 'cat-1',
    title: 'Solo todo',
    isCompleted: false
  } as TodoItem
];

describe('TodoAssociation hierarchy helpers', () => {
  it('keeps parent rows collapsed by default in hierarchy mode', () => {
    const rows = buildTodoAssociationRows(baseTodos, [], true);

    expect(rows.map((row) => row.todo.id)).toEqual(['parent-b', 'solo-a']);
    expect(rows[0]).toMatchObject({
      level: 0,
      parentTitle: null,
      childCount: 2,
      completedChildCount: 0,
      hasChildren: true,
      isExpanded: false
    });
  });

  it('includes both parent and child rows once the parent is expanded', () => {
    const rows = buildTodoAssociationRows(baseTodos, ['parent-b'], true);

    expect(rows.map((row) => row.todo.id)).toEqual(['parent-b', 'child-b-1', 'child-b-2', 'solo-a']);
    expect(rows[1]).toMatchObject({
      level: 1,
      parentTitle: null,
      childCount: 0,
      completedChildCount: 0,
      hasChildren: false,
      isExpanded: false
    });
  });

  it('reports completed and total child counts for parent badges', () => {
    const allTodos = [
      ...baseTodos,
      {
        id: 'child-b-3',
        categoryId: 'cat-1',
        parentTodoId: 'parent-b',
        childOrder: 3,
        title: 'Child done',
        isCompleted: true
      } as TodoItem
    ];
    const visibleTodos = allTodos.filter((todo) => !todo.isCompleted);
    const rows = buildTodoAssociationRows(visibleTodos, [], true, allTodos);

    expect(rows[0]).toMatchObject({
      childCount: 3,
      completedChildCount: 1
    });
  });

  it('auto-expands the selected child parent while leaving parent selections collapsed', () => {
    expect(getInitialExpandedTodoParentIds(baseTodos, 'child-b-2')).toEqual(['parent-b']);
    expect(getInitialExpandedTodoParentIds(baseTodos, 'parent-b')).toEqual([]);
    expect(getInitialExpandedTodoParentIds(baseTodos, undefined)).toEqual([]);
  });

  it('can expand a visible parent with the full child set from a broader source list', () => {
    const visibleTodayTodos: TodoItem[] = [
      {
        id: 'parent-pinned',
        categoryId: 'cat-1',
        title: 'Pinned parent',
        isCompleted: false,
        pin: true
      } as TodoItem
    ];
    const allTodos: TodoItem[] = [
      ...visibleTodayTodos,
      {
        id: 'child-open',
        categoryId: 'cat-1',
        parentTodoId: 'parent-pinned',
        childOrder: 2,
        title: 'Open child',
        isCompleted: false
      } as TodoItem,
      {
        id: 'child-done',
        categoryId: 'cat-1',
        parentTodoId: 'parent-pinned',
        childOrder: 1,
        title: 'Done child',
        isCompleted: true
      } as TodoItem
    ];

    const rows = buildTodoAssociationRows(visibleTodayTodos, ['parent-pinned'], true, allTodos, allTodos);

    expect(rows.map((row) => row.todo.id)).toEqual(['parent-pinned', 'child-open', 'child-done']);
    expect(rows[0]).toMatchObject({
      childCount: 2,
      completedChildCount: 1
    });
  });

  it('does not surface unfinished subtasks as standalone picker rows when their parent is completed', () => {
    const visibleTodos: TodoItem[] = [
      {
        id: 'child-hidden',
        categoryId: 'cat-1',
        parentTodoId: 'parent-done',
        childOrder: 1,
        title: 'Hidden child',
        isCompleted: false
      } as TodoItem
    ];
    const allTodos: TodoItem[] = [
      {
        id: 'parent-done',
        categoryId: 'cat-1',
        title: 'Completed parent',
        isCompleted: true
      } as TodoItem,
      ...visibleTodos
    ];

    expect(buildTodoAssociationRows(visibleTodos, [], true, allTodos, allTodos)).toEqual([]);
    expect(buildTodoAssociationRows(visibleTodos, [], false, allTodos, allTodos)).toEqual([]);
  });

  it('adds hidden-parent context for standalone subtasks whose parent is outside the visible picker pool', () => {
    const allTodos: TodoItem[] = [
      {
        id: 'parent-outside',
        categoryId: 'cat-1',
        title: 'Very long parent title',
        isCompleted: false
      } as TodoItem,
      {
        id: 'child-standalone',
        categoryId: 'cat-1',
        parentTodoId: 'parent-outside',
        childOrder: 1,
        title: 'Today child',
        isCompleted: false,
        pin: true
      } as TodoItem
    ];
    const visibleTodayTodos = [allTodos[1]];

    const rows = buildTodoAssociationRows(visibleTodayTodos, [], true, allTodos, allTodos);

    expect(rows).toEqual([
      expect.objectContaining({
        todo: expect.objectContaining({ id: 'child-standalone' }),
        level: 0,
        parentTitle: 'Very long parent title',
        hasChildren: false
      })
    ]);
  });

  it('filters completed todos out of picker pools by default', () => {
    const todos: TodoItem[] = [
      {
        id: 'open-todo',
        categoryId: 'cat-1',
        title: 'Open todo',
        isCompleted: false
      } as TodoItem,
      {
        id: 'done-todo',
        categoryId: 'cat-1',
        title: 'Done todo',
        isCompleted: true
      } as TodoItem
    ];

    expect(filterTodoAssociationPickerTodos(todos)).toEqual([
      expect.objectContaining({ id: 'open-todo' })
    ]);
  });

  it('keeps the currently linked completed todo visible in picker pools', () => {
    const todos: TodoItem[] = [
      {
        id: 'open-todo',
        categoryId: 'cat-1',
        title: 'Open todo',
        isCompleted: false
      } as TodoItem,
      {
        id: 'done-todo',
        categoryId: 'cat-1',
        title: 'Done todo',
        isCompleted: true
      } as TodoItem
    ];

    expect(filterTodoAssociationPickerTodos(todos, 'done-todo')).toEqual([
      expect.objectContaining({ id: 'open-todo' }),
      expect.objectContaining({ id: 'done-todo' })
    ]);
  });

  it('filters quick todos out of picker pools by default', () => {
    const todos: TodoItem[] = [
      {
        id: 'project-todo',
        categoryId: 'cat-1',
        title: 'Project todo',
        isCompleted: false
      } as TodoItem,
      {
        id: 'quick-todo',
        categoryId: QUICK_TODO_CATEGORY_ID,
        kind: 'quick',
        title: 'Quick todo',
        isCompleted: false
      } as TodoItem
    ];

    expect(filterTodoAssociationPickerTodos(todos)).toEqual([
      expect.objectContaining({ id: 'project-todo' })
    ]);
  });

  it('keeps the currently linked quick todo visible for legacy edit flows', () => {
    const todos: TodoItem[] = [
      {
        id: 'project-todo',
        categoryId: 'cat-1',
        title: 'Project todo',
        isCompleted: false
      } as TodoItem,
      {
        id: 'quick-todo',
        categoryId: QUICK_TODO_CATEGORY_ID,
        kind: 'quick',
        title: 'Quick todo',
        isCompleted: false
      } as TodoItem
    ];

    expect(filterTodoAssociationPickerTodos(todos, 'quick-todo')).toEqual([
      expect.objectContaining({ id: 'project-todo' }),
      expect.objectContaining({ id: 'quick-todo' })
    ]);
  });

  it('hides the quick category unless the current linked todo belongs to it', () => {
    const categories: TodoCategory[] = [
      {
        id: 'cat-1',
        name: 'Project',
        icon: 'P'
      },
      {
        id: QUICK_TODO_CATEGORY_ID,
        name: '小事',
        icon: 'Q'
      }
    ];
    const todos: TodoItem[] = [
      {
        id: 'project-todo',
        categoryId: 'cat-1',
        title: 'Project todo',
        isCompleted: false
      } as TodoItem,
      {
        id: 'quick-todo',
        categoryId: QUICK_TODO_CATEGORY_ID,
        kind: 'quick',
        title: 'Quick todo',
        isCompleted: false
      } as TodoItem
    ];

    expect(filterTodoAssociationCategories(categories, todos).map((category) => category.id)).toEqual(['cat-1']);
    expect(filterTodoAssociationCategories(categories, todos, 'quick-todo').map((category) => category.id)).toEqual([
      'cat-1',
      QUICK_TODO_CATEGORY_ID
    ]);
  });

  it('keeps expanded parent rows from surfacing unrelated completed subtasks', () => {
    const parentTodo = {
      id: 'parent-open',
      categoryId: 'cat-1',
      title: 'Parent',
      isCompleted: false
    } as TodoItem;
    const allTodos: TodoItem[] = [
      parentTodo,
      {
        id: 'child-open',
        categoryId: 'cat-1',
        parentTodoId: 'parent-open',
        childOrder: 1,
        title: 'Open child',
        isCompleted: false
      } as TodoItem,
      {
        id: 'child-done',
        categoryId: 'cat-1',
        parentTodoId: 'parent-open',
        childOrder: 2,
        title: 'Done child',
        isCompleted: true
      } as TodoItem
    ];

    const rows = buildTodoAssociationRows(
      [parentTodo],
      ['parent-open'],
      true,
      allTodos,
      filterTodoAssociationPickerTodos(allTodos)
    );

    expect(rows.map((row) => row.todo.id)).toEqual(['parent-open', 'child-open']);
  });

  it('still shows the currently linked completed subtask under its expanded parent', () => {
    const parentTodo = {
      id: 'parent-open',
      categoryId: 'cat-1',
      title: 'Parent',
      isCompleted: false
    } as TodoItem;
    const allTodos: TodoItem[] = [
      parentTodo,
      {
        id: 'child-open',
        categoryId: 'cat-1',
        parentTodoId: 'parent-open',
        childOrder: 1,
        title: 'Open child',
        isCompleted: false
      } as TodoItem,
      {
        id: 'child-done',
        categoryId: 'cat-1',
        parentTodoId: 'parent-open',
        childOrder: 2,
        title: 'Done child',
        isCompleted: true
      } as TodoItem
    ];

    const rows = buildTodoAssociationRows(
      [parentTodo],
      ['parent-open'],
      true,
      allTodos,
      filterTodoAssociationPickerTodos(allTodos, 'child-done')
    );

    expect(rows.map((row) => row.todo.id)).toEqual(['parent-open', 'child-open', 'child-done']);
  });
});
