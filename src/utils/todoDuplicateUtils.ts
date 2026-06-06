/**
 * @file todoDuplicateUtils.ts
 * @input Todo items plus duplicate cleanup options
 * @output Pure helpers for todo duplication and schedule-field normalization
 * @pos Utility
 * @description Centralizes todo duplicate shaping so copy flows can be tested without booting React hook context dependencies.
 * @updated 2026-06-06: Added duplicate helpers that clear copied cover images by default while preserving existing date/tag/scope cleanup rules.
 */

import { TodoDuplicateOptions, TodoItem } from '../types';
import { normalizeMaybeDates } from './todoScheduleUtils';

export const normalizeTodoScheduleFields = (todo: TodoItem): TodoItem => {
  const skipDates = todo.recurrenceRule?.skipDates?.length
    ? Array.from(new Set(
        todo.recurrenceRule.skipDates
          .map((dateKey) => dateKey.trim())
          .filter(Boolean)
      )).sort((left, right) => left.localeCompare(right))
    : undefined;

  return {
    ...todo,
    maybeDates: normalizeMaybeDates(todo.maybeDates),
    recurrenceRule: todo.recurrenceRule
      ? {
          ...todo.recurrenceRule,
          ...(skipDates ? { skipDates } : {})
        }
      : undefined
  };
};

export const buildDuplicatedTodo = (
  todo: TodoItem,
  options?: TodoDuplicateOptions & { duplicateId?: string; childOrder?: number }
): TodoItem => {
  const title = options?.title?.trim() || `${todo.title} 副本`;
  const clearDates = options?.clearDates ?? true;
  const clearTags = options?.clearTags ?? false;
  const clearScopes = options?.clearScopes ?? false;

  return normalizeTodoScheduleFields({
    ...todo,
    id: options?.duplicateId || crypto.randomUUID(),
    title,
    isCompleted: false,
    pin: false,
    completedAt: undefined,
    completedUnits: 0,
    coverImage: undefined,
    parentTodoId: todo.parentTodoId,
    childOrder: todo.parentTodoId ? options?.childOrder : undefined,
    scheduledDate: clearDates ? undefined : todo.scheduledDate,
    deadlineDate: clearDates ? undefined : todo.deadlineDate,
    recurrenceRule: clearDates || todo.parentTodoId ? undefined : todo.recurrenceRule,
    maybeDates: clearDates ? undefined : todo.maybeDates,
    linkedActivityId: clearTags ? undefined : todo.linkedActivityId,
    linkedCategoryId: clearTags ? undefined : todo.linkedCategoryId,
    defaultScopeIds: clearScopes ? undefined : todo.defaultScopeIds
  });
};
