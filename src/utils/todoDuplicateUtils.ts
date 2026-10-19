/**
 * @file todoDuplicateUtils.ts
 * @updated 2026-10-18: Normalizes terminal states and resets abandonment when duplicating.
 * @updated 2026-10-17: Normalizes local reminders and never copies notification settings to a duplicate.
 * @updated 2026-10-16: Normalizes occurrence history and clears it when duplicating tasks.
 * @input Todo items plus duplicate cleanup options
 * @output Pure helpers for todo duplication and schedule-field normalization
 * @pos Utility
 * @description Centralizes todo duplicate shaping so copy flows can be tested without booting React hook context dependencies.
 * @updated 2026-07-30: Normalizes recurring auto-Plan settings with the rest of todo planning fields.
 * @updated 2026-06-06: Added duplicate helpers that clear copied cover images by default while preserving existing date/tag/scope cleanup rules.
 * @updated 2026-10-07: Clears copied todo notes by default so duplicates start without the source remark.
 */

import { TodoDuplicateOptions, TodoItem } from '../types';
import { normalizeMaybeDates } from './todoScheduleUtils';
import { normalizeTodoRecurringPlanConfig } from './todoRecurringPlanUtils';
import { normalizeOccurrenceCompletions } from './todoOccurrenceUtils';
import { normalizeTodoReminders } from './todoReminderUtils';
import { normalizeTodoStatus } from './todoStatusUtils';

export const normalizeTodoScheduleFields = (todo: TodoItem): TodoItem => {
  const skipDates = todo.recurrenceRule?.skipDates?.length
    ? Array.from(new Set(
        todo.recurrenceRule.skipDates
          .map((dateKey) => dateKey.trim())
          .filter(Boolean)
      )).sort((left, right) => left.localeCompare(right))
    : undefined;

  return normalizeTodoStatus({
    ...todo,
    reminders: normalizeTodoReminders(todo),
    occurrenceCompletions: normalizeOccurrenceCompletions(todo.occurrenceCompletions),
    maybeDates: normalizeMaybeDates(todo.maybeDates),
    recurringPlan: todo.recurrenceRule && !todo.parentTodoId && todo.kind !== 'quick'
      ? normalizeTodoRecurringPlanConfig(todo.recurringPlan)
      : undefined,
    recurrenceRule: todo.recurrenceRule
      ? {
          ...todo.recurrenceRule,
          ...(skipDates ? { skipDates } : {})
        }
      : undefined
  });
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
    abandonedAt: undefined,
    occurrenceCompletions: undefined,
    reminders: undefined,
    completedUnits: 0,
    coverImage: undefined,
    note: undefined,
    parentTodoId: todo.parentTodoId,
    childOrder: todo.parentTodoId ? options?.childOrder : undefined,
    scheduledDate: clearDates ? undefined : todo.scheduledDate,
    deadlineDate: clearDates ? undefined : todo.deadlineDate,
    recurrenceRule: clearDates || todo.parentTodoId ? undefined : todo.recurrenceRule,
    recurringPlan: clearDates || todo.parentTodoId ? undefined : todo.recurringPlan,
    maybeDates: clearDates ? undefined : todo.maybeDates,
    linkedActivityId: clearTags ? undefined : todo.linkedActivityId,
    linkedCategoryId: clearTags ? undefined : todo.linkedCategoryId,
    defaultScopeIds: clearScopes ? undefined : todo.defaultScopeIds
  });
};
