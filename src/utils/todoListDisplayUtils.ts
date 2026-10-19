/**
 * @file todoListDisplayUtils.ts
 * @updated 2026-10-18: Formats icon-ready abandonment dates and interleaves closed tasks by descending end date.
 * @input Todo records with optional arranged, due, and completion dates
 * @output Shared formatting and completion-group ordering helpers for todo rows
 * @pos Utility (todo list display)
 * @description Keeps category-list ordering and inline schedule text consistent between compact and loose todo list rendering.
 * @updated 2026-05-05: Category-list ordering now only groups incomplete todos before completed ones while preserving each group's incoming array order from batch-management saves.
 * @updated 2026-05-05: Switched compact inline schedule summaries to symbol-only `(MM.DD)[MM.DD]` formatting so dates can sit immediately after the title.
 * @updated 2026-10-01: Added safe local-date formatting and compact summary support for completed todos.
 * @updated 2026-10-01: Prioritized a valid completion date over scheduled and deadline labels.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */

import { TodoItem } from '../types';
import { formatDateKey, parseDateKey } from './todoScheduleUtils';
import { isTodoClosed } from './todoStatusUtils';

type TodoScheduleDisplayItem = Pick<TodoItem, 'scheduledDate' | 'deadlineDate' | 'isCompleted' | 'completedAt' | 'abandonedAt'>;
type TodoCompletionDisplayItem = Pick<TodoItem, 'isCompleted' | 'completedAt' | 'abandonedAt'>;

export const formatTodoInlineDate = (dateKey?: string): string | null => {
  if (!dateKey) return null;
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${month}.${day}`;
};

export const formatTodoCompletionDate = (completedAt?: string): string | null => {
  if (!completedAt) return null;

  const date = new Date(completedAt);
  if (Number.isNaN(date.getTime())) return null;

  return formatTodoInlineDate(formatDateKey(date));
};

export const formatTodoCompactScheduleSummary = (todo: TodoScheduleDisplayItem): string | null => {
  if (todo.abandonedAt) {
    return formatTodoCompletionDate(todo.abandonedAt);
  }
  const completionDate = todo.isCompleted ? formatTodoCompletionDate(todo.completedAt) : null;
  if (completionDate) {
    return `{${completionDate}}`;
  }

  const segments = [
    todo.scheduledDate ? `(${formatTodoInlineDate(todo.scheduledDate)})` : null,
    todo.deadlineDate ? `[${formatTodoInlineDate(todo.deadlineDate)}]` : null,
    completionDate ? `{${completionDate}}` : null
  ].filter((value): value is string => Boolean(value));

  return segments.length > 0 ? segments.join('') : null;
};

export const orderTodoItemsByCompletionGroups = <T extends TodoCompletionDisplayItem>(todos: T[]): T[] => [
  ...todos.filter((todo) => !isTodoClosed(todo)),
  ...todos.filter(isTodoClosed).sort((left, right) => {
    const leftDate = Date.parse(left.abandonedAt || left.completedAt || '');
    const rightDate = Date.parse(right.abandonedAt || right.completedAt || '');
    return (Number.isFinite(rightDate) ? rightDate : 0) - (Number.isFinite(leftDate) ? leftDate : 0);
  })
];
