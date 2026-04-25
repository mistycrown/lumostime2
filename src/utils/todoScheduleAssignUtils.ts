/**
 * @file todoScheduleAssignUtils.ts
 * @input Assignable todo subsets, full todo sources, picker category ids, and schedule-assignment modes
 * @output Shared pure filtering and ordering helpers for the schedule assignment picker
 * @pos Utility (Todo schedule assignment)
 * @description Keeps the week-plan arrange/due picker aligned with todo hierarchy visibility rules by hiding unfinished subtasks whose parent todo is already completed.
 * @updated 2026-04-25: Added hierarchy row builders so schedule assignment pickers can render subtasks beneath their parent rows while preserving completed-parent visibility rules.
 * @updated 2026-04-25: Added shared filtering so schedule assignment pickers can resolve completed-parent visibility from the full todo source.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */

import { TodoItem } from '../types';
import { getDirectChildTodosForDisplay, getParentTodo, isIncompleteSubtaskHiddenByCompletedParent } from './todoHierarchyUtils';

export interface TodoScheduleAssignRow {
  todo: TodoItem;
  level: 0 | 1;
  hasChildren: boolean;
  childCount: number;
  isExpanded: boolean;
}

const getStatusDateValue = (todo: TodoItem, type: 'scheduled' | 'deadline'): string | undefined => (
  type === 'scheduled' ? todo.scheduledDate : todo.deadlineDate
);

const compareScheduleAssignTodos = (
  left: TodoItem,
  right: TodoItem,
  activeType: 'scheduled' | 'deadline' | 'new',
  assignType: 'scheduled' | 'deadline'
): number => {
  const leftDate = getStatusDateValue(left, activeType === 'new' ? assignType : activeType);
  const rightDate = getStatusDateValue(right, activeType === 'new' ? assignType : activeType);

  if (!leftDate && !rightDate) {
    return left.title.localeCompare(right.title, 'zh-CN');
  }
  if (!leftDate) return -1;
  if (!rightDate) return 1;

  const dateCompare = leftDate.localeCompare(rightDate);
  if (dateCompare !== 0) return dateCompare;

  return left.title.localeCompare(right.title, 'zh-CN');
};

export const getVisibleScheduleAssignTodos = (
  todos: TodoItem[],
  sourceTodos: TodoItem[],
  selectedCategoryId: string,
  activeType: 'scheduled' | 'deadline' | 'new',
  assignType: 'scheduled' | 'deadline'
): TodoItem[] => {
  const nextTodos = selectedCategoryId === 'all'
    ? [...todos]
    : todos.filter((todo) => todo.categoryId === selectedCategoryId);

  const visibleTodos = nextTodos.filter((todo) => !isIncompleteSubtaskHiddenByCompletedParent(sourceTodos, todo));

  visibleTodos.sort((left, right) => compareScheduleAssignTodos(left, right, activeType, assignType));

  return visibleTodos;
};

export const getInitialExpandedScheduleAssignParentIds = (todos: TodoItem[], sourceTodos: TodoItem[]): string[] => {
  const parentIds = new Set<string>();

  todos.forEach((todo) => {
    const parentTodo = getParentTodo(sourceTodos, todo);
    if (parentTodo && !parentTodo.isCompleted) {
      parentIds.add(parentTodo.id);
      return;
    }

    const visibleChildCount = getDirectChildTodosForDisplay(todos, todo.id, {
      hideIncompleteWhenParentCompleted: true
    }).length;
    if (visibleChildCount > 0) {
      parentIds.add(todo.id);
    }
  });

  return Array.from(parentIds);
};

export const buildTodoScheduleAssignRows = (
  todos: TodoItem[],
  sourceTodos: TodoItem[],
  expandedParentIds: string[],
  activeType: 'scheduled' | 'deadline' | 'new',
  assignType: 'scheduled' | 'deadline'
): TodoScheduleAssignRow[] => {
  const expandedParentIdSet = new Set(expandedParentIds);
  const rootTodos = todos
    .filter((todo) => !getParentTodo(sourceTodos, todo))
    .sort((left, right) => compareScheduleAssignTodos(left, right, activeType, assignType));

  return rootTodos.flatMap((todo) => {
    const childTodos = getDirectChildTodosForDisplay(todos, todo.id, {
      hideIncompleteWhenParentCompleted: true
    });
    const parentRow: TodoScheduleAssignRow = {
      todo,
      level: 0,
      hasChildren: childTodos.length > 0,
      childCount: childTodos.length,
      isExpanded: expandedParentIdSet.has(todo.id)
    };

    if (!parentRow.hasChildren || !parentRow.isExpanded) {
      return [parentRow];
    }

    return [
      parentRow,
      ...childTodos.map((childTodo) => ({
        todo: childTodo,
        level: 1 as const,
        hasChildren: false,
        childCount: 0,
        isExpanded: false
      }))
    ];
  });
};
