/**
 * @file quickAddTodo.ts
 * @input User-entered AI chat text
 * @output Quick-add-todo command prefix and extracted todo description
 * @pos Utility (AI Todo Shortcut)
 * @description Centralizes the explicit command marker used by the AI quick-add-todo flow.
 */

export const QUICK_ADD_TODO_PREFIX = '快速添加待办：';

export const extractQuickAddTodoDescription = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed.startsWith(QUICK_ADD_TODO_PREFIX)) {
    return null;
  }

  return trimmed.slice(QUICK_ADD_TODO_PREFIX.length).trim() || null;
};

export const isQuickAddTodoCommand = (value: string): boolean => (
  extractQuickAddTodoDescription(value) !== null
);
