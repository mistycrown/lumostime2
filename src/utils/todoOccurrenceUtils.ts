/**
 * @file todoOccurrenceUtils.ts
 * @input Todo items, occurrence dates and completion commands
 * @output Sparse completion normalization, dated display state and immutable updates
 * @pos Utility
 * @updated 2026-10-16: Separates single occurrence completion from ending a series.
 */
import type { TodoItem, TodoOccurrenceCompletion } from '../types';
import { formatDateKey, matchesRecurrenceRule, parseDateKey } from './todoScheduleUtils';

export const normalizeOccurrenceCompletions = (value: unknown): TodoItem['occurrenceCompletions'] => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = Object.entries(value).filter(([dateKey, record]) => (
    Boolean(parseDateKey(dateKey)) && record && typeof record.completedAt === 'string'
    && Number.isFinite(Date.parse(record.completedAt))
  )).map(([dateKey, record]) => [dateKey, { completedAt: record.completedAt } as TodoOccurrenceCompletion]);
  return entries.length ? Object.fromEntries(entries) : undefined;
};

export const canCompleteTodoOccurrence = (todo: TodoItem, dateKey: string): boolean => (
  Boolean(parseDateKey(dateKey)) && !todo.isCompleted && (
    Boolean(todo.occurrenceCompletions?.[dateKey])
    || matchesRecurrenceRule(todo.recurrenceRule, dateKey)
    || Boolean(todo.recurrenceRule && todo.maybeDates?.includes(dateKey))
  )
);

// Display-only projection. Mutations must resolve the live task by id.
export const getTodoForOccurrence = (todo: TodoItem, dateKey: string): TodoItem => {
  const completion = todo.occurrenceCompletions?.[dateKey];
  if (!todo.recurrenceRule || todo.isCompleted || !completion) return todo;
  return { ...todo, isCompleted: true, completedAt: completion.completedAt };
};

export const setTodoCompletion = (
  todo: TodoItem,
  completed: boolean,
  occurrenceDateKey?: string,
  now = new Date()
): TodoItem => {
  if (!todo.recurrenceRule || (todo.isCompleted && !occurrenceDateKey && !completed)) {
    if (todo.isCompleted === completed) return todo;
    return { ...todo, isCompleted: completed, completedAt: completed ? now.toISOString() : undefined };
  }
  const dateKey = occurrenceDateKey || formatDateKey(now);
  if (!canCompleteTodoOccurrence(todo, dateKey)) return todo;
  if (Boolean(todo.occurrenceCompletions?.[dateKey]) === completed) return todo;
  const completions = { ...todo.occurrenceCompletions };
  if (completed) completions[dateKey] = { completedAt: now.toISOString() };
  else delete completions[dateKey];
  return { ...todo, occurrenceCompletions: Object.keys(completions).length ? completions : undefined };
};

export const toggleTodoCompletion = (todo: TodoItem, occurrenceDateKey?: string, now = new Date()): TodoItem => {
  const completed = todo.recurrenceRule && !todo.isCompleted
    ? Boolean(todo.occurrenceCompletions?.[occurrenceDateKey || formatDateKey(now)])
    : todo.isCompleted;
  return setTodoCompletion(todo, !completed, occurrenceDateKey, now);
};

export const applyTodoCompletionActions = (todo: TodoItem, actions: Array<{
  todoId: string;
  isCompleted: boolean;
  createdAt: number;
  occurrenceDateKey?: string | null;
  actionType?: string;
}>): TodoItem => actions.filter((action) => action.todoId === todo.id && action.actionType !== 'create')
  .sort((left, right) => left.createdAt - right.createdAt)
  .reduce((current, action) => {
    if (current.recurrenceRule && !action.occurrenceDateKey) return current;
    if (!Number.isFinite(action.createdAt)) return current;
    return setTodoCompletion(current, action.isCompleted, action.occurrenceDateKey || undefined, new Date(action.createdAt));
  }, todo);
