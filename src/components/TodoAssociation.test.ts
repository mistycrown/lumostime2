/**
 * @file TodoAssociation.test.ts
 * @input TodoAssociation hierarchy helpers
 * @output Regression coverage for hierarchical todo picker row building
 * @pos Test
 * @description Ensures the todo association picker keeps parent/subtask rows collapsed by default and auto-expands the selected child's parent.
 * @updated 2026-04-25: Added regression coverage so unfinished subtasks stay hidden in the picker whenever their parent todo is completed.
 * @updated 2026-04-22: Added regression coverage for virtual-category style expansion where a visible parent can reveal children from a broader todo source.
 * @updated 2026-04-22: Added regression coverage for collapsed parent rows and expandable child rows inside the shared todo association picker.
 */

import { describe, expect, it } from 'vitest';
import { buildTodoAssociationRows, getInitialExpandedTodoParentIds } from '../utils/todoAssociationUtils';
import type { TodoItem } from '../types';

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
});
