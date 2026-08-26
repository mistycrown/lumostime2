/**
 * @file todoAssociationUtils.ts
 * @updated 2026-08-26: Excludes archived todos from association picker options.
 * @input Flat todo arrays, expanded parent ids, selected todo ids
 * @output Pure row models for hierarchical todo-association pickers
 * @pos Utility (Todo association)
 * @description Builds collapsed or expanded parent/subtask row models so UI pickers can render one-level todo hierarchy consistently without mixing stateful component code into tests.
 * @updated 2026-05-16: Filtered reserved `小事` quick todos out of association pickers while still preserving the currently linked legacy quick todo for edit continuity.
 * @updated 2026-05-06: Added picker-level completed-todo filtering that hides finished todos by default while preserving the currently linked completed todo for edit continuity.
 * @updated 2026-05-06: Added standalone parent-title metadata so virtual today pickers can label subtasks whose parent row is not visible in the current picker pool.
 * @updated 2026-04-25: Hid unfinished subtasks in association pickers whenever their parent todo is completed, so hidden children never resurface as standalone rows.
 * @updated 2026-04-22: Added optional full-child expansion support so virtual picker categories can show every direct subtask under a visible parent.
 * @updated 2026-04-22: Added helper functions for hierarchical todo-association pickers, including selected-child parent auto-expansion.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */

import { TodoCategory, TodoItem } from '../types';
import { isQuickTodo } from './todoKindUtils';
import { buildTodoTreeItems, getCompletedDirectChildCount, getDirectChildCount, getDirectChildTodosForDisplay, getParentTodo, isIncompleteSubtaskHiddenByCompletedParent } from './todoHierarchyUtils';
import { isQuickTodoCategoryId } from './todoQuickCategoryUtils';
import { isTodoArchived } from './archiveUtils';

export interface TodoAssociationRow {
  todo: TodoItem;
  level: 0 | 1;
  parentTitle: string | null;
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

const isLegacyLinkedQuickTodo = (todo: TodoItem, linkedTodoId?: string): boolean => (
  todo.id === linkedTodoId && (isQuickTodo(todo) || isQuickTodoCategoryId(todo.categoryId))
);

const isTodoEligibleForAssociationPicker = (todo: TodoItem, linkedTodoId?: string): boolean => (
  isLegacyLinkedQuickTodo(todo, linkedTodoId)
  || (!isQuickTodo(todo) && !isQuickTodoCategoryId(todo.categoryId))
);

export const filterTodoAssociationCategories = (
  categories: TodoCategory[],
  todos: TodoItem[],
  linkedTodoId?: string
): TodoCategory[] => {
  const linkedTodo = linkedTodoId ? todos.find((todo) => todo.id === linkedTodoId) : undefined;
  const legacyQuickCategoryId = linkedTodo && isLegacyLinkedQuickTodo(linkedTodo, linkedTodoId)
    ? linkedTodo?.categoryId
    : undefined;

  return categories.filter((category) => (
    !isQuickTodoCategoryId(category.id) || category.id === legacyQuickCategoryId
  ));
};

export const filterTodoAssociationPickerTodos = (
  todos: TodoItem[],
  linkedTodoId?: string
): TodoItem[] => (
  todos.filter((todo) => (
    !isTodoArchived(todo)
    && isTodoEligibleForAssociationPicker(todo, linkedTodoId)
    && (!todo.isCompleted || todo.id === linkedTodoId)
  ))
);

export const buildTodoAssociationRows = (
  todos: TodoItem[],
  expandedParentIds: string[],
  enableHierarchy: boolean,
  countSourceTodos: TodoItem[] = todos,
  childSourceTodos: TodoItem[] = todos
): TodoAssociationRow[] => {
  const visibleTodos = todos.filter((todo) => !isIncompleteSubtaskHiddenByCompletedParent(countSourceTodos, todo));

  if (!enableHierarchy) {
    return visibleTodos.map((todo) => ({
      todo,
      level: 0,
      parentTitle: null,
      childCount: 0,
      completedChildCount: 0,
      hasChildren: false,
      isExpanded: false
    }));
  }

  const expandedParentIdSet = new Set(expandedParentIds);
  const visibleTodoMap = new Map(visibleTodos.map((todo) => [todo.id, todo]));

  return buildTodoTreeItems(visibleTodos).flatMap((item) => {
    const sourceTodo = visibleTodoMap.get(item.todo.id) || item.todo;
    const sourceParentTodo = getParentTodo(countSourceTodos, sourceTodo);
    const childCount = getDirectChildCount(countSourceTodos, item.todo.id);
    const completedChildCount = getCompletedDirectChildCount(countSourceTodos, item.todo.id);
    const parentRow: TodoAssociationRow = {
      todo: item.todo,
      level: 0,
      parentTitle: !item.todo.parentTodoId && sourceTodo.parentTodoId ? sourceParentTodo?.title || null : null,
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
      ...getDirectChildTodosForDisplay(childSourceTodos, item.todo.id, {
        incompleteFirst: true,
        hideIncompleteWhenParentCompleted: true
      }).map((childTodo) => ({
        todo: childTodo,
        level: 1 as const,
        parentTitle: null,
        childCount: 0,
        completedChildCount: 0,
        hasChildren: false,
        isExpanded: false
      }))
    ];
  });
};
