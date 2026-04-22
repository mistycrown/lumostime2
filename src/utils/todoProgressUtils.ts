/**
 * @file todoProgressUtils.ts
 * @input Todo records and optional todo collections
 * @output Shared helpers for resolving todo progress modes, derived progress values, and subtask-based sync
 * @pos Utility (Todo progress)
 * @description Normalizes the new todo progress-tracking modes so detail pages, list rendering, log entry, and save logic all use the same progress rules.
 * @updated 2026-04-22: Added manual/subtask progress-mode helpers and parent subtask progress syncing.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */

import { TodoItem, TodoProgressTrackingMode } from '../types';
import { getCompletedDirectChildCount, getDirectChildCount, isSubtask } from './todoHierarchyUtils';

export interface TodoProgressSnapshot {
  mode: TodoProgressTrackingMode;
  isProgress: boolean;
  supportsManualEntry: boolean;
  completedUnits: number;
  totalAmount: number;
  unitAmount: number;
  progressRatio: number;
  progressPercentage: number;
}

const TODO_PROGRESS_MODES: TodoProgressTrackingMode[] = ['none', 'manual', 'subtasks'];

export const isTodoProgressTrackingMode = (value: unknown): value is TodoProgressTrackingMode => (
  typeof value === 'string' && TODO_PROGRESS_MODES.includes(value as TodoProgressTrackingMode)
);

export const getTodoProgressTrackingMode = (
  todo?: Pick<TodoItem, 'id' | 'parentTodoId' | 'isProgress' | 'progressTrackingMode'> | null,
  todos: TodoItem[] = []
): TodoProgressTrackingMode => {
  if (!todo) {
    return 'none';
  }

  const rawMode = isTodoProgressTrackingMode(todo.progressTrackingMode)
    ? todo.progressTrackingMode
    : (todo.isProgress ? 'manual' : 'none');

  if (rawMode !== 'subtasks') {
    return rawMode;
  }

  if (isSubtask(todo) || !todo.id) {
    return 'none';
  }

  const childCount = getDirectChildCount(todos, todo.id);
  return childCount > 0 ? 'subtasks' : 'none';
};

export const canTodoUseSubtaskProgress = (
  todo?: Pick<TodoItem, 'id' | 'parentTodoId'> | null,
  todos: TodoItem[] = []
): boolean => {
  if (!todo || isSubtask(todo) || !todo.id) {
    return false;
  }

  return getDirectChildCount(todos, todo.id) > 0;
};

export const shouldTodoUseManualProgressInput = (
  todo?: Pick<TodoItem, 'id' | 'parentTodoId' | 'isProgress' | 'progressTrackingMode'> | null,
  todos: TodoItem[] = []
): boolean => getTodoProgressTrackingMode(todo, todos) === 'manual';

export const getTodoProgressSnapshot = (
  todo?: Pick<TodoItem, 'id' | 'parentTodoId' | 'isProgress' | 'progressTrackingMode' | 'totalAmount' | 'unitAmount' | 'completedUnits'> | null,
  todos: TodoItem[] = []
): TodoProgressSnapshot => {
  const mode = getTodoProgressTrackingMode(todo, todos);

  if (!todo || mode === 'none') {
    return {
      mode: 'none',
      isProgress: false,
      supportsManualEntry: false,
      completedUnits: 0,
      totalAmount: 0,
      unitAmount: 1,
      progressRatio: 0,
      progressPercentage: 0
    };
  }

  if (mode === 'subtasks') {
    const totalAmount = todo.id ? getDirectChildCount(todos, todo.id) : 0;
    const completedUnits = todo.id ? getCompletedDirectChildCount(todos, todo.id) : 0;
    const progressRatio = totalAmount > 0 ? completedUnits / totalAmount : 0;

    return {
      mode,
      isProgress: true,
      supportsManualEntry: false,
      completedUnits,
      totalAmount,
      unitAmount: 1,
      progressRatio,
      progressPercentage: Math.round(progressRatio * 100)
    };
  }

  const totalAmount = Math.max(0, todo.totalAmount || 0);
  const completedUnits = Math.max(0, todo.completedUnits || 0);
  const unitAmount = Math.max(1, todo.unitAmount || 1);
  const progressRatio = totalAmount > 0 ? completedUnits / totalAmount : 0;

  return {
    mode,
    isProgress: true,
    supportsManualEntry: true,
    completedUnits,
    totalAmount,
    unitAmount,
    progressRatio,
    progressPercentage: Math.round(progressRatio * 100)
  };
};

export const syncSubtaskProgressToParentTodos = (todos: TodoItem[]): TodoItem[] => (
  todos.map((todo) => {
    const mode = getTodoProgressTrackingMode(todo, todos);

    if (mode !== 'subtasks') {
      if (todo.progressTrackingMode === 'subtasks') {
        return {
          ...todo,
          isProgress: false,
          progressTrackingMode: 'none',
          totalAmount: undefined,
          unitAmount: undefined,
          completedUnits: undefined
        };
      }

      if (mode === 'manual') {
        return {
          ...todo,
          isProgress: true,
          progressTrackingMode: 'manual'
        };
      }

      if (todo.isProgress || todo.progressTrackingMode) {
        return {
          ...todo,
          isProgress: false,
          progressTrackingMode: 'none'
        };
      }

      return todo;
    }

    const totalAmount = getDirectChildCount(todos, todo.id);
    const completedUnits = getCompletedDirectChildCount(todos, todo.id);

    return {
      ...todo,
      isProgress: true,
      progressTrackingMode: 'subtasks',
      totalAmount,
      unitAmount: 1,
      completedUnits
    };
  })
);
