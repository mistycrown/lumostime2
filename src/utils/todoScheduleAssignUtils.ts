/**
 * @file todoScheduleAssignUtils.ts
 * @input Assignable todo subsets, full todo sources, picker category ids, and schedule-assignment modes
 * @output Shared pure filtering and ordering helpers for the schedule assignment picker
 * @pos Utility (Todo schedule assignment)
 * @description Keeps the week-plan picker aligned with todo hierarchy visibility rules by hiding unfinished subtasks whose parent todo is already completed and suppressing the reserved `未来` bucket from quick scheduling.
 * @updated 2026-05-14: Allowed recurring todos back into the quick picker only for the `Maybe` tab, while Arrange / Due still exclude them.
 * @updated 2026-05-13: Excluded the reserved `未来` category from arrange/due picker pools so future-only project backlogs stay out of quick scheduling popups.
 * @updated 2026-05-13: Excluded recurring todos from arrange/due picker pools so quick scheduling only offers one-shot tasks that can legally carry arrange or due dates.
 * @updated 2026-05-12: Added title search filtering that keeps matched subtasks attached to their visible parent rows inside the schedule assignment picker.
 * @updated 2026-04-25: Added hierarchy row builders so schedule assignment pickers can render subtasks beneath their parent rows while preserving completed-parent visibility rules.
 * @updated 2026-04-25: Added shared filtering so schedule assignment pickers can resolve completed-parent visibility from the full todo source.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */

import { TodoItem } from '../types';
import {
  getDirectChildTodosForDisplay,
  getParentTodo,
  isIncompleteSubtaskHiddenByCompletedParent
} from './todoHierarchyUtils';
import { isFutureTodoCategoryId } from './todoQuickCategoryUtils';

export interface TodoScheduleAssignRow {
  todo: TodoItem;
  level: 0 | 1;
  hasChildren: boolean;
  childCount: number;
  isExpanded: boolean;
}

const getStatusDateValue = (
  todo: TodoItem,
  type: 'scheduled' | 'deadline' | 'maybe'
): string | undefined => {
  if (type === 'scheduled') {
    return todo.scheduledDate;
  }

  if (type === 'deadline') {
    return todo.deadlineDate;
  }

  return todo.maybeDates?.slice().sort((left, right) => left.localeCompare(right))[0];
};

const compareScheduleAssignTodos = (
  left: TodoItem,
  right: TodoItem,
  activeType: 'maybe' | 'scheduled' | 'deadline' | 'new',
  assignType: 'maybe' | 'scheduled' | 'deadline'
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

const normalizeSearchValue = (value: string): string => value.trim().toLocaleLowerCase('zh-CN');

const buildMatchedTodoSet = (todos: TodoItem[], sourceTodos: TodoItem[], searchQuery: string): Set<string> | null => {
  const normalizedQuery = normalizeSearchValue(searchQuery);
  if (!normalizedQuery) {
    return null;
  }

  const sourceTodoMap = new Map(sourceTodos.map((todo) => [todo.id, todo]));
  const matchedTodoIds = new Set<string>();

  todos.forEach((todo) => {
    if (!normalizeSearchValue(todo.title).includes(normalizedQuery)) {
      return;
    }

    matchedTodoIds.add(todo.id);

    let currentParentId = todo.parentTodoId;
    while (currentParentId) {
      const parentTodo = sourceTodoMap.get(currentParentId);
      if (!parentTodo) {
        break;
      }
      matchedTodoIds.add(parentTodo.id);
      currentParentId = parentTodo.parentTodoId;
    }
  });

  return matchedTodoIds;
};

export const getVisibleScheduleAssignTodos = (
  todos: TodoItem[],
  sourceTodos: TodoItem[],
  selectedCategoryId: string,
  activeType: 'maybe' | 'scheduled' | 'deadline' | 'new',
  assignType: 'maybe' | 'scheduled' | 'deadline',
  searchQuery = ''
): TodoItem[] => {
  const nextTodos = selectedCategoryId === 'all'
    ? [...todos]
    : todos.filter((todo) => todo.categoryId === selectedCategoryId);
  const schedulableTodos = nextTodos.filter((todo) => {
    if (isFutureTodoCategoryId(todo.categoryId)) {
      return false;
    }

    if (todo.recurrenceRule && activeType !== 'maybe') {
      return false;
    }

    return true;
  });

  const visibleTodos = schedulableTodos.filter((todo) => !isIncompleteSubtaskHiddenByCompletedParent(sourceTodos, todo));
  const matchedTodoIds = buildMatchedTodoSet(visibleTodos, sourceTodos, searchQuery);

  const searchedTodos = matchedTodoIds
    ? visibleTodos.filter((todo) => matchedTodoIds.has(todo.id))
    : visibleTodos;

  searchedTodos.sort((left, right) => compareScheduleAssignTodos(left, right, activeType, assignType));

  return searchedTodos;
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
  activeType: 'maybe' | 'scheduled' | 'deadline' | 'new',
  assignType: 'maybe' | 'scheduled' | 'deadline'
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
