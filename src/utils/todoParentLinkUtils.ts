/**
 * @file todoParentLinkUtils.ts
 * @input Source todo, flat todo collection, category and search filters
 * @output Eligible main tasks and validated subtask association payloads
 * @pos Utility (Todo hierarchy)
 * @description Reuses one-level hierarchy inheritance when associating an existing task with a main task.
 * @updated 2026-10-04: Added quick-action parent selection and association validation.
 */
import { TodoItem } from '../types';
import { applyParentTodoInheritance, getNextChildOrder } from './todoHierarchyUtils';
import { isQuickTodo } from './todoKindUtils';

export const canTodoLinkToParent = (todo: TodoItem | null, todos: TodoItem[]): boolean => (
  Boolean(todo && !todo.recurrenceRule && !todos.some((item) => item.parentTodoId === todo.id))
);

export const getTodoParentCandidates = (
  todo: TodoItem | null,
  todos: TodoItem[],
  categoryId = '',
  search = ''
): TodoItem[] => {
  if (!todo || !canTodoLinkToParent(todo, todos)) return [];

  const query = search.trim().toLocaleLowerCase();
  return todos.filter((candidate) => (
    candidate.id !== todo.id
    && !candidate.parentTodoId
    && !candidate.recurrenceRule
    && !candidate.isCompleted
    && !isQuickTodo(candidate)
    && (!categoryId || candidate.categoryId === categoryId)
    && (!query || `${candidate.title}\n${candidate.note || ''}`.toLocaleLowerCase().includes(query))
  ));
};

export const buildTodoParentLink = (
  todo: TodoItem | null,
  todos: TodoItem[],
  parentTodoId: string
): TodoItem | null => {
  const parent = getTodoParentCandidates(todo, todos).find((candidate) => candidate.id === parentTodoId);
  if (!todo || !parent || todo.parentTodoId === parentTodoId) return null;

  return applyParentTodoInheritance({
    ...todo,
    kind: 'project',
    childOrder: getNextChildOrder(todos, parentTodoId)
  }, parent);
};
