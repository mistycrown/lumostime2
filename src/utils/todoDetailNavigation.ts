/**
 * @file todoDetailNavigation.ts
 * @input Todo detail history entries plus current/target todo records
 * @output Pure helpers for pushing and popping nested todo-detail navigation state
 * @description Keeps nested todo-detail back navigation deterministic across UI buttons and Android hardware back handling.
 * @updated 2026-05-12: Added shared push/pop helpers so todo-detail pages can return to their parent detail session instead of closing straight back to the root view.
 */
import { TodoItem } from '../types';

export const pushTodoDetailHistory = (
  history: TodoItem[],
  currentTodo: TodoItem | null,
  nextTodo: TodoItem
): TodoItem[] => {
  if (!currentTodo || currentTodo.id === nextTodo.id) {
    return history;
  }

  return [...history, currentTodo];
};

export const popTodoDetailHistory = (
  history: TodoItem[]
): { previousTodo: TodoItem | null; nextHistory: TodoItem[] } => {
  if (history.length === 0) {
    return {
      previousTodo: null,
      nextHistory: []
    };
  }

  return {
    previousTodo: history[history.length - 1],
    nextHistory: history.slice(0, -1)
  };
};
