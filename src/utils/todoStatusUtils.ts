/**
 * @file todoStatusUtils.ts
 * @input Legacy completion fields and an optional abandonment timestamp
 * @output Mutually exclusive todo status transitions and normalization
 * @pos Utility
 * @updated 2026-10-18: Adds dated abandonment without migrating existing completion records.
 */
import type { TodoItem } from '../types';

export type TodoStatus = 'active' | 'completed' | 'abandoned';
type TodoStatusFields = Pick<TodoItem, 'isCompleted' | 'completedAt' | 'abandonedAt'>;

export const getTodoStatus = (todo: TodoStatusFields): TodoStatus => (
  todo.abandonedAt ? 'abandoned' : todo.isCompleted ? 'completed' : 'active'
);

export const isTodoClosed = (todo: Pick<TodoItem, 'isCompleted' | 'abandonedAt'>): boolean => (
  todo.isCompleted || Boolean(todo.abandonedAt)
);

export const normalizeTodoStatus = <T extends TodoStatusFields>(todo: T): T => {
  const abandonedAt = typeof todo.abandonedAt === 'string' && Number.isFinite(Date.parse(todo.abandonedAt))
    ? todo.abandonedAt : undefined;
  const isCompleted = !abandonedAt && todo.isCompleted;
  const completedAt = isCompleted ? todo.completedAt : undefined;
  return todo.abandonedAt === abandonedAt && todo.isCompleted === isCompleted && todo.completedAt === completedAt
    ? todo : { ...todo, abandonedAt, isCompleted, completedAt };
};

export const setTodoStatus = (todo: TodoItem, status: TodoStatus, now = new Date()): TodoItem => ({
  ...todo,
  isCompleted: status === 'completed',
  completedAt: status === 'completed' ? (todo.isCompleted && todo.completedAt || now.toISOString()) : undefined,
  abandonedAt: status === 'abandoned' ? (todo.abandonedAt || now.toISOString()) : undefined
});
