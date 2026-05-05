/**
 * @file todoListDisplayUtils.ts
 * @input Todo records with optional arranged/due dates
 * @output Shared formatting and completion-group ordering helpers for todo rows
 * @pos Utility (todo list display)
 * @description Keeps category-list ordering and inline schedule text consistent between compact and loose todo list rendering.
 * @updated 2026-05-05: Category-list ordering now only groups incomplete todos before completed ones while preserving each group's incoming array order from batch-management saves.
 * @updated 2026-05-05: Switched compact inline schedule summaries to symbol-only `(MM.DD)[MM.DD]` formatting so dates can sit immediately after the title.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */

import { TodoItem } from '../types';
import { parseDateKey } from './todoScheduleUtils';

type TodoScheduleDisplayItem = Pick<TodoItem, 'scheduledDate' | 'deadlineDate'>;
type TodoCompletionDisplayItem = Pick<TodoItem, 'isCompleted'>;

export const formatTodoInlineDate = (dateKey?: string): string | null => {
  if (!dateKey) return null;
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${month}.${day}`;
};

export const formatTodoCompactScheduleSummary = (todo: TodoScheduleDisplayItem): string | null => {
  const segments = [
    todo.scheduledDate ? `(${formatTodoInlineDate(todo.scheduledDate)})` : null,
    todo.deadlineDate ? `[${formatTodoInlineDate(todo.deadlineDate)}]` : null
  ].filter((value): value is string => Boolean(value));

  return segments.length > 0 ? segments.join('') : null;
};

export const orderTodoItemsByCompletionGroups = <T extends TodoCompletionDisplayItem>(todos: T[]): T[] => [
  ...todos.filter((todo) => !todo.isCompleted),
  ...todos.filter((todo) => todo.isCompleted)
];
