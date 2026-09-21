/**
 * @file useAIBackfillChatContextData.ts
 * @input Current logs, todos, categories, scopes, and todo categories
 * @output Structured read-only context arrays for assistant tool calls
 * @pos Component Support (AI Integration)
 * @description Builds the normalized todo and log lookup context used by update/edit/subtask assistant actions.
 */
import { useMemo } from 'react';
import type { Category, Log, Scope, TodoCategory, TodoItem } from '../../types';
import { formatDateKey } from '../../utils/aiBackfillUtils';

interface ContextDataOptions {
  categories: Category[];
  logs: Log[];
  scopes: Scope[];
  todoCategories: TodoCategory[];
  todos: TodoItem[];
}

export const useAIBackfillChatContextData = ({
  categories,
  logs,
  scopes,
  todoCategories,
  todos
}: ContextDataOptions) => {
  const todoUpdateContext = useMemo(() => todos.map((todo) => {
    const parentTodo = todo.parentTodoId
      ? todos.find((candidate) => candidate.id === todo.parentTodoId)
      : undefined;
    const todoCategory = todoCategories.find((category) => category.id === todo.categoryId);
    const linkedCategory = todo.linkedCategoryId
      ? categories.find((category) => category.id === todo.linkedCategoryId)
      : undefined;
    const linkedActivity = todo.linkedActivityId
      ? linkedCategory?.activities.find((activity) => activity.id === todo.linkedActivityId)
        || categories.flatMap((category) => category.activities).find((activity) => activity.id === todo.linkedActivityId)
      : undefined;

    return {
      id: todo.id,
      title: todo.title,
      path: parentTodo ? `${parentTodo.title} / ${todo.title}` : todo.title,
      categoryId: todo.categoryId,
      categoryName: todoCategory?.name || '',
      isCompleted: todo.isCompleted,
      parentTodoId: todo.parentTodoId,
      parentTodoTitle: parentTodo?.title,
      linkedCategoryId: todo.linkedCategoryId,
      linkedActivityId: todo.linkedActivityId,
      linkedActivityName: linkedActivity?.name,
      scheduledDate: todo.scheduledDate,
      deadlineDate: todo.deadlineDate,
      pin: Boolean(todo.pin)
    };
  }), [categories, todoCategories, todos]);

  const subtaskParentContext = useMemo(() => todos
    .filter((todo) => !todo.parentTodoId && !todo.recurrenceRule)
    .map((todo) => {
      const todoCategory = todoCategories.find((category) => category.id === todo.categoryId);
      const linkedCategory = todo.linkedCategoryId
        ? categories.find((category) => category.id === todo.linkedCategoryId)
        : undefined;
      const linkedActivity = todo.linkedActivityId
        ? linkedCategory?.activities.find((activity) => activity.id === todo.linkedActivityId)
          || categories.flatMap((category) => category.activities).find((activity) => activity.id === todo.linkedActivityId)
        : undefined;

      return {
        id: todo.id,
        title: todo.title,
        categoryId: todo.categoryId,
        categoryName: todoCategory?.name || '',
        linkedActivityId: todo.linkedActivityId,
        linkedActivityName: linkedActivity?.name,
        defaultScopeIds: todo.defaultScopeIds,
        defaultScopeNames: (todo.defaultScopeIds || [])
          .map((scopeId) => scopes.find((scope) => scope.id === scopeId)?.name)
          .filter((name): name is string => Boolean(name))
      };
    }), [categories, scopes, todoCategories, todos]);

  const logEditContext = useMemo(() => [...logs]
    .sort((left, right) => right.startTime - left.startTime)
    .slice(0, 40)
    .map((log) => {
      const category = categories.find((item) => item.id === log.categoryId);
      const activity = category?.activities.find((item) => item.id === log.activityId)
        || categories.flatMap((item) => item.activities).find((item) => item.id === log.activityId);
      const linkedTodo = log.linkedTodoId
        ? todos.find((todo) => todo.id === log.linkedTodoId)
        : undefined;

      return {
        id: log.id,
        date: formatDateKey(new Date(log.startTime)),
        startTime: `${String(new Date(log.startTime).getHours()).padStart(2, '0')}:${String(new Date(log.startTime).getMinutes()).padStart(2, '0')}`,
        endTime: `${String(new Date(log.endTime).getHours()).padStart(2, '0')}:${String(new Date(log.endTime).getMinutes()).padStart(2, '0')}`,
        categoryId: log.categoryId,
        categoryName: category?.name || '',
        activityId: log.activityId,
        activityName: activity?.name || log.title || '',
        note: log.note,
        linkedTodoId: log.linkedTodoId,
        linkedTodoTitle: linkedTodo?.title
      };
    }), [categories, logs, todos]);

  return { todoUpdateContext, subtaskParentContext, logEditContext };
};
