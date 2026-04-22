/**
 * @file todoHierarchyUtils.ts
 * @input Flat todo arrays and optional parent/child todo records
 * @output Shared helpers for validating one-level todo hierarchy, syncing inherited fields, and building tree views
 * @pos Utility (Todo hierarchy)
 * @description Centralizes parent-child todo rules so list rendering, save logic, and detail editing all share the same one-level hierarchy behavior.
 * @updated 2026-04-22: Added direct-child display ordering plus optional completed-task filtering so expanded parent rows can honor list-level hide-completed controls.
 * @updated 2026-04-22: Added direct-child display ordering so schedule-expanded parent rows can show all subtasks with unfinished items first.
 * @updated 2026-04-21: Added one-level todo hierarchy helpers for subtasks, inheritance sync, and cascade delete calculations.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */

import { TodoItem } from '../types';

export interface TodoTreeItem {
  todo: TodoItem;
  children: TodoItem[];
}

const compareChildTodos = (left: TodoItem, right: TodoItem): number => {
  const leftOrder = typeof left.childOrder === 'number' ? left.childOrder : Number.MAX_SAFE_INTEGER;
  const rightOrder = typeof right.childOrder === 'number' ? right.childOrder : Number.MAX_SAFE_INTEGER;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return left.title.localeCompare(right.title, 'zh-CN');
};

const cloneScopeIds = (scopeIds?: string[]): string[] | undefined => (
  scopeIds && scopeIds.length > 0 ? [...scopeIds] : undefined
);

export const isSubtask = (todo?: Pick<TodoItem, 'parentTodoId'> | null): boolean => Boolean(todo?.parentTodoId);

export const getDirectChildTodos = (todos: TodoItem[], parentTodoId: string): TodoItem[] => (
  todos
    .filter((todo) => todo.parentTodoId === parentTodoId)
    .sort(compareChildTodos)
);

export const getDirectChildTodosForDisplay = (
  todos: TodoItem[],
  parentTodoId: string,
  options?: { incompleteFirst?: boolean; includeCompleted?: boolean }
): TodoItem[] => {
  const orderedChildren = getDirectChildTodos(todos, parentTodoId)
    .filter((todo) => options?.includeCompleted ?? true ? true : !todo.isCompleted);

  if (!options?.incompleteFirst) {
    return orderedChildren;
  }

  return [
    ...orderedChildren.filter((todo) => !todo.isCompleted),
    ...orderedChildren.filter((todo) => todo.isCompleted)
  ];
};

export const getDirectChildCount = (todos: TodoItem[], parentTodoId: string): number => (
  todos.filter((todo) => todo.parentTodoId === parentTodoId).length
);

export const getCompletedDirectChildCount = (todos: TodoItem[], parentTodoId: string): number => (
  todos.filter((todo) => todo.parentTodoId === parentTodoId && todo.isCompleted).length
);

export const getNextChildOrder = (todos: TodoItem[], parentTodoId: string): number => {
  const maxOrder = todos.reduce((currentMax, todo) => {
    if (todo.parentTodoId !== parentTodoId) {
      return currentMax;
    }

    const childOrder = typeof todo.childOrder === 'number' ? todo.childOrder : 0;
    return Math.max(currentMax, childOrder);
  }, 0);

  return maxOrder + 1;
};

export const getTodoCascadeDeleteIds = (todos: TodoItem[], todoId: string): string[] => {
  const directChildIds = getDirectChildTodos(todos, todoId).map((todo) => todo.id);
  return [todoId, ...directChildIds];
};

export const getParentTodo = (todos: TodoItem[], todo: Pick<TodoItem, 'id' | 'parentTodoId'>): TodoItem | null => {
  if (!todo.parentTodoId) {
    return null;
  }

  const parentTodo = todos.find((candidate) => candidate.id === todo.parentTodoId) || null;
  if (!parentTodo || parentTodo.id === todo.id || parentTodo.parentTodoId) {
    return null;
  }

  return parentTodo;
};

export const applyParentTodoInheritance = (todo: TodoItem, parentTodo: TodoItem): TodoItem => ({
  ...todo,
  parentTodoId: parentTodo.id,
  categoryId: parentTodo.categoryId,
  linkedCategoryId: parentTodo.linkedCategoryId,
  linkedActivityId: parentTodo.linkedActivityId,
  defaultScopeIds: cloneScopeIds(parentTodo.defaultScopeIds),
  recurrenceRule: undefined
});

export const normalizeTodoHierarchy = (todo: TodoItem, todos: TodoItem[]): TodoItem => {
  const parentTodo = getParentTodo(todos, todo);
  if (!parentTodo) {
    return {
      ...todo,
      parentTodoId: undefined,
      childOrder: undefined
    };
  }

  return applyParentTodoInheritance({
    ...todo,
    childOrder: typeof todo.childOrder === 'number'
      ? todo.childOrder
      : getNextChildOrder(todos, parentTodo.id)
  }, parentTodo);
};

export const syncDirectChildTodosWithParent = (todos: TodoItem[], parentTodo: TodoItem): TodoItem[] => (
  todos.map((todo) => (
    todo.parentTodoId === parentTodo.id
      ? applyParentTodoInheritance(todo, parentTodo)
      : todo
  ))
);

export const buildTodoTreeItems = (todos: TodoItem[]): TodoTreeItem[] => {
  const rootTodos: TodoItem[] = [];
  const childMap = new Map<string, TodoItem[]>();
  const todoMap = new Map(todos.map((todo) => [todo.id, todo]));

  todos.forEach((todo) => {
    if (!todo.parentTodoId) {
      rootTodos.push(todo);
      return;
    }

    const parentTodo = todoMap.get(todo.parentTodoId);
    if (!parentTodo || parentTodo.parentTodoId) {
      rootTodos.push({
        ...todo,
        parentTodoId: undefined,
        childOrder: undefined
      });
      return;
    }

    const currentChildren = childMap.get(parentTodo.id) || [];
    currentChildren.push(todo);
    childMap.set(parentTodo.id, currentChildren);
  });

  return rootTodos
    .sort((left, right) => left.title.localeCompare(right.title, 'zh-CN'))
    .map((todo) => ({
      todo,
      children: (childMap.get(todo.id) || []).sort(compareChildTodos)
    }));
};
