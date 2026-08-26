/**
 * @file todoScheduleAssignUtils.ts
 * @input Assignable todo subsets, full todo sources, picker category ids, and schedule-assignment modes
 * @output Shared pure filtering and ordering helpers for the schedule assignment picker
 * @pos Utility (Todo schedule assignment)
 * @description Keeps the week-plan picker aligned with todo hierarchy visibility rules by hiding unfinished subtasks whose parent todo is already completed and suppressing the reserved `未来` bucket from quick scheduling.
 * @updated 2026-05-14: Aligned quick-picker ordering so `Maybe` / `Arrange` / `Due` all keep undated root todos first, preserve saved root-todo order, and still pin subtasks beneath their parent via `childOrder`.

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

interface ScheduleAssignSortContext {
  orderLookup: Map<string, number>;
  todoMap: Map<string, TodoItem>;
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

const compareSiblingChildOrder = (left: TodoItem, right: TodoItem): number => {
  const leftOrder = typeof left.childOrder === 'number' ? left.childOrder : Number.MAX_SAFE_INTEGER;
  const rightOrder = typeof right.childOrder === 'number' ? right.childOrder : Number.MAX_SAFE_INTEGER;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return left.title.localeCompare(right.title, 'zh-CN');
};

const getRootTodo = (todo: TodoItem, todoMap: Map<string, TodoItem>): TodoItem => {
  if (!todo.parentTodoId) {
    return todo;
  }

  const parentTodo = todoMap.get(todo.parentTodoId);
  return parentTodo && !parentTodo.parentTodoId ? parentTodo : todo;
};

const compareScheduleAssignTodos = (
  left: TodoItem,
  right: TodoItem,
  activeType: 'maybe' | 'scheduled' | 'deadline' | 'new',
  assignType: 'maybe' | 'scheduled' | 'deadline',
  context: ScheduleAssignSortContext
): number => {
  const leftDate = getStatusDateValue(left, activeType === 'new' ? assignType : activeType);
  const rightDate = getStatusDateValue(right, activeType === 'new' ? assignType : activeType);

  if (!leftDate && !rightDate) {
    // When both todos are undated for the active picker, fall back to saved root order
    // so root tasks stay stable and subtasks can remain attached below their parent.
  } else {
    if (!leftDate) return -1;
    if (!rightDate) return 1;
  }

  if (leftDate && rightDate) {
    const dateCompare = leftDate.localeCompare(rightDate);
    if (dateCompare !== 0) return dateCompare;
  }

  const leftRootTodo = getRootTodo(left, context.todoMap);
  const rightRootTodo = getRootTodo(right, context.todoMap);
  const leftRootOrder = context.orderLookup.get(leftRootTodo.id) ?? Number.MAX_SAFE_INTEGER;
  const rightRootOrder = context.orderLookup.get(rightRootTodo.id) ?? Number.MAX_SAFE_INTEGER;

  if (leftRootOrder !== rightRootOrder) {
    return leftRootOrder - rightRootOrder;
  }

  if (leftRootTodo.id === rightRootTodo.id) {
    if (left.id === right.id) {
      return 0;
    }

    if (left.id === leftRootTodo.id) {
      return -1;
    }

    if (right.id === rightRootTodo.id) {
      return 1;
    }

    return compareSiblingChildOrder(left, right);
  }

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
  const sortContext: ScheduleAssignSortContext = {
    orderLookup: new Map(sourceTodos.map((todo, index) => [todo.id, index])),
    todoMap: new Map(sourceTodos.map((todo) => [todo.id, todo]))
  };
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

  searchedTodos.sort((left, right) => compareScheduleAssignTodos(left, right, activeType, assignType, sortContext));

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
  const sortContext: ScheduleAssignSortContext = {
    orderLookup: new Map(sourceTodos.map((todo, index) => [todo.id, index])),
    todoMap: new Map(sourceTodos.map((todo) => [todo.id, todo]))
  };
  const expandedParentIdSet = new Set(expandedParentIds);
  const rootTodos = todos
    .filter((todo) => !getParentTodo(sourceTodos, todo))
    .sort((left, right) => compareScheduleAssignTodos(left, right, activeType, assignType, sortContext));

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
