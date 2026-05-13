/**
 * @file todoKindUtils.ts
 * @input Todo items with optional `kind`
 * @output Shared helpers for normalizing quick-vs-project todo behavior
 * @pos Utility (todo kind)
 * @description Keeps lightweight quick reminders on one consistent interpretation path so old todos without a stored kind still behave as normal project todos.
 * @updated 2026-05-13: Added shared todo-kind normalization helpers for the new quick reminder flow.
 */

import { TodoItem, TodoKind } from '../types';

type TodoKindLike = Pick<TodoItem, 'kind'> | null | undefined;

export const getTodoKind = (todo: TodoKindLike): TodoKind => (
  todo?.kind === 'quick' ? 'quick' : 'project'
);

export const isQuickTodo = (todo: TodoKindLike): boolean => getTodoKind(todo) === 'quick';

