/**
 * @file todoAssociationUtils.ts
 * @input Flat todo arrays, expanded parent ids, selected todo ids
 * @output Pure row models for hierarchical todo-association pickers
 * @pos Utility (Todo association)
 * @description Builds collapsed or expanded parent/subtask row models so UI pickers can render one-level todo hierarchy consistently without mixing stateful component code into tests.
 * @updated 2026-04-22: Added optional full-child expansion support so virtual picker categories can show every direct subtask under a visible parent.
 * @updated 2026-04-22: Added helper functions for hierarchical todo-association pickers, including selected-child parent auto-expansion.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */

import { TodoItem } from '../types';
import { buildTodoTreeItems, getCompletedDirectChildCount, getDirectChildCount, getDirectChildTodosForDisplay, getParentTodo } from './todoHierarchyUtils';

export interface TodoAssociationRow {
  todo: TodoItem;
  level: 0 | 1;
  childCount: number;
  completedChildCount: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

export const getInitialExpandedTodoParentIds = (todos: TodoItem[], linkedTodoId?: string): string[] => {
  if (!linkedTodoId) {
    return [];
  }

  const linkedTodo = todos.find((todo) => todo.id === linkedTodoId);
  if (!linkedTodo) {
    return [];
  }

  const parentTodo = getParentTodo(todos, linkedTodo);
  return parentTodo ? [parentTodo.id] : [];
};

export const buildTodoAssociationRows = (
  todos: TodoItem[],
  expandedParentIds: string[],
  enableHierarchy: boolean,
  countSourceTodos: TodoItem[] = todos,
  childSourceTodos: TodoItem[] = todos
): TodoAssociationRow[] => {
  if (!enableHierarchy) {
    return todos.map((todo) => ({
      todo,
      level: 0,
      childCount: 0,
      completedChildCount: 0,
      hasChildren: false,
      isExpanded: false
    }));
  }

  const expandedParentIdSet = new Set(expandedParentIds);

  return buildTodoTreeItems(todos).flatMap((item) => {
    const childCount = getDirectChildCount(countSourceTodos, item.todo.id);
    const completedChildCount = getCompletedDirectChildCount(countSourceTodos, item.todo.id);
    const parentRow: TodoAssociationRow = {
      todo: item.todo,
      level: 0,
      childCount,
      completedChildCount,
      hasChildren: childCount > 0,
      isExpanded: expandedParentIdSet.has(item.todo.id)
    };

    if (!parentRow.hasChildren || !parentRow.isExpanded) {
      return [parentRow];
    }

    return [
      parentRow,
      ...getDirectChildTodosForDisplay(childSourceTodos, item.todo.id, { incompleteFirst: true }).map((childTodo) => ({
        todo: childTodo,
        level: 1 as const,
        childCount: 0,
        completedChildCount: 0,
        hasChildren: false,
        isExpanded: false
      }))
    ];
  });
};
