/**
 * @file todoListDisplayUtils.ts
 * @input Todo records with optional arranged/due dates
 * @output Shared formatting and category-list ordering helpers for todo rows
 * @pos Utility (todo list display)
 * @description Keeps category-list sorting and inline schedule text consistent between compact and loose todo list rendering.
 * @updated 2026-05-05: Switched compact inline schedule summaries to symbol-only `(MM.DD)[MM.DD]` formatting so dates can sit immediately after the title.
 * @updated 2026-05-05: Added category-list ordering that prefers incomplete scheduled todos and compact inline schedule-summary formatting.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */

import { TodoItem } from '../types';
import { parseDateKey } from './todoScheduleUtils';

type TodoScheduleDisplayItem = Pick<TodoItem, 'scheduledDate' | 'deadlineDate'>;
type TodoCategorySortItem = Pick<TodoItem, 'title' | 'isCompleted' | 'scheduledDate' | 'deadlineDate' | 'pin'>;

const compareOptionalDateKey = (left?: string | null, right?: string | null): number => {
  if (left && right) {
    return left.localeCompare(right);
  }

  if (left) {
    return -1;
  }

  if (right) {
    return 1;
  }

  return 0;
};

const hasTodoSchedule = (todo: TodoScheduleDisplayItem): boolean => Boolean(todo.scheduledDate || todo.deadlineDate);

const getTodoEarliestScheduleDate = (todo: TodoScheduleDisplayItem): string | null => {
  const dateKeys = [todo.scheduledDate, todo.deadlineDate].filter((value): value is string => Boolean(value));
  if (dateKeys.length === 0) {
    return null;
  }

  return dateKeys.reduce((earliest, current) => (
    current.localeCompare(earliest) < 0 ? current : earliest
  ));
};

const getTodoScheduleUrgency = (todo: TodoScheduleDisplayItem, scheduleDate: string | null): number => {
  if (!scheduleDate) {
    return Number.MAX_SAFE_INTEGER;
  }

  const matchesDeadline = todo.deadlineDate === scheduleDate;
  const matchesScheduled = todo.scheduledDate === scheduleDate;

  if (matchesDeadline && !matchesScheduled) {
    return 0;
  }

  if (matchesDeadline && matchesScheduled) {
    return 1;
  }

  if (matchesScheduled) {
    return 2;
  }

  return 3;
};

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

export const compareCategoryListTodos = (left: TodoCategorySortItem, right: TodoCategorySortItem): number => {
  if (left.isCompleted !== right.isCompleted) {
    return Number(left.isCompleted) - Number(right.isCompleted);
  }

  const leftHasSchedule = hasTodoSchedule(left);
  const rightHasSchedule = hasTodoSchedule(right);
  if (leftHasSchedule !== rightHasSchedule) {
    return Number(rightHasSchedule) - Number(leftHasSchedule);
  }

  const leftScheduleDate = getTodoEarliestScheduleDate(left);
  const rightScheduleDate = getTodoEarliestScheduleDate(right);
  const scheduleDateDiff = compareOptionalDateKey(leftScheduleDate, rightScheduleDate);
  if (scheduleDateDiff !== 0) {
    return scheduleDateDiff;
  }

  const scheduleUrgencyDiff = getTodoScheduleUrgency(left, leftScheduleDate) - getTodoScheduleUrgency(right, rightScheduleDate);
  if (scheduleUrgencyDiff !== 0) {
    return scheduleUrgencyDiff;
  }

  if (Boolean(left.pin) !== Boolean(right.pin)) {
    return Number(Boolean(right.pin)) - Number(Boolean(left.pin));
  }

  const scheduledDateDiff = compareOptionalDateKey(left.scheduledDate, right.scheduledDate);
  if (scheduledDateDiff !== 0) {
    return scheduledDateDiff;
  }

  const deadlineDateDiff = compareOptionalDateKey(left.deadlineDate, right.deadlineDate);
  if (deadlineDateDiff !== 0) {
    return deadlineDateDiff;
  }

  return left.title.localeCompare(right.title, 'zh-CN');
};
