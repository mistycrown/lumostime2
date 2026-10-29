/**
 * @file useTodoQuickActions.ts
 * @updated 2026-10-29: Keeps the current quick-action snapshot in sync with execution-library task saves.
 * @updated 2026-10-27: Can retain the sheet after calendar selection for plan/reminder follow-up actions.
 * @updated 2026-10-18: Adds mutually exclusive abandon/restore actions using the latest saved task.
 * @updated 2026-10-18: Saves independent date reminders from quick-action cards against the latest todo state.
 * @updated 2026-10-16: Carries occurrence dates into complete, undo and skip actions.
 * @input Todo save/edit callbacks from TodoView
 * @output Shared quick-actions state and handlers for todo list rows and week-view badges
 * @pos Hook
 * @updated 2026-10-11: Saves arbitrary arrange/due dates selected directly from the quick-actions sheet.
 * @updated 2026-10-04: Associates existing tasks with validated main tasks through the shared save pipeline.
 * @description Centralizes todo quick-actions sheet state so multiple entry points can open the same modal without duplicating move/complete/detail logic inside the view.
 * @updated 2026-06-13: Added handleQuickActionUpdateTitle to support updating todo title directly from the quick actions modal on blur.
 * @updated 2026-08-24: Added inline note updates for the todo quick-actions sheet.
 * @updated 2026-05-14: Dismisses the quick-actions sheet after the recurring skip-current action succeeds so both recurrence skip shortcuts share the same success-close feedback.
 * @updated 2026-05-14: Added recurring `Skip 当前轮次 / Skip到` quick actions so recurrence shortcuts can skip the next occurrence and optionally pair that skip with one future `Maybe Date` target from the shared quick-actions flow.
 * @updated 2026-05-14: Added a shared `Maybe` quick action that writes normalized multi-date `maybeDates`, including for recurring todos, through the same save pipeline as other lightweight task actions.
 * @updated 2026-05-13: Changed the quick `升级为项目` flow to require picking a target standard category instead of silently falling back to the default project bucket.
 * @updated 2026-05-13: Added a shared move-category quick action so non-subtask todos can jump between standard todo categories without opening the detail editor.
 * @updated 2026-05-13: Added a shared quick-to-project upgrade action so lightweight reminders can graduate into full project todos from shared entry points.
 * @updated 2026-05-05: Exposes the quick-actions open timestamp plus a shared interaction guard so bottom-edge touch openings cannot immediately trigger a newly mounted action button.
 * @updated 2026-04-27: Routed shared quick-actions delete requests into the existing todo deletion flow.
 * @updated 2026-04-21: Added a shared pin/unpin quick action so schedule-list rows and week badges can toggle the today-top flag consistently.
 * @updated 2026-04-20: Extracted from TodoView to unify quick-actions behavior across todo-row taps and week badge actions.
 */
import { useRef, useState } from 'react';
import { TodoItem, TodoReminderField, TodoReminderSetting } from '../types';
import { formatDateKey, getNextRecurrenceOccurrenceDateKey, normalizeMaybeDates, normalizeSkipDates, parseDateKey } from '../utils/todoScheduleUtils';
import { isQuickTodo } from '../utils/todoKindUtils';
import { buildTodoParentLink } from '../utils/todoParentLinkUtils';
import { canCompleteTodoOccurrence, setTodoCompletion } from '../utils/todoOccurrenceUtils';
import { normalizeTodoReminders } from '../utils/todoReminderUtils';
import { isTodoClosed, setTodoStatus } from '../utils/todoStatusUtils';

export const QUICK_ACTION_INTERACTION_GUARD_MS = 280;

export const isTodoQuickActionInteractionGuardActive = (
  openedAt: number,
  now = Date.now()
): boolean => openedAt > 0 && now - openedAt < QUICK_ACTION_INTERACTION_GUARD_MS;

export const buildQuickActionCategoryMoveTodo = (
  todo: TodoItem | null,
  categoryId: string
): TodoItem | null => {
  if (!todo || !categoryId || todo.parentTodoId || todo.categoryId === categoryId) {
    return null;
  }

  return {
    ...todo,
    categoryId
  };
};

export const buildQuickActionUpgradeToProjectTodo = (
  todo: TodoItem | null,
  categoryId: string
): TodoItem | null => {
  if (!todo || !categoryId || !isQuickTodo(todo)) {
    return null;
  }

  return {
    ...todo,
    kind: 'project',
    categoryId
  };
};

export const buildQuickActionNoteUpdateTodo = (
  todo: TodoItem | null,
  note: string
): TodoItem | null => {
  if (!todo) {
    return null;
  }

  const nextNote = note.trim() || undefined;
  if ((todo.note || undefined) === nextNote) {
    return null;
  }

  return {
    ...todo,
    note: nextNote
  };
};

export const getQuickActionTodoNote = (todo: TodoItem | null): string => (
  typeof todo?.note === 'string' ? todo.note : ''
);

export const buildQuickActionReminderUpdateTodo = (
  todo: TodoItem | null,
  field: TodoReminderField,
  setting?: TodoReminderSetting
): TodoItem | null => {
  if (!todo || !todo[field] || isTodoClosed(todo) || todo.recurrenceRule) return null;
  return {
    ...todo,
    reminders: normalizeTodoReminders({ ...todo, reminders: { ...todo.reminders, [field]: setting } })
  };
};

interface UseTodoQuickActionsOptions {
  todos: TodoItem[];
  onSaveTodo: (todo: TodoItem) => void;
  onEditTodo: (todo: TodoItem) => void;
  onDeleteTodo: (id: string) => void;
}

export const useTodoQuickActions = ({ todos, onSaveTodo, onEditTodo, onDeleteTodo }: UseTodoQuickActionsOptions) => {
  const [quickActionTodo, setQuickActionTodo] = useState<TodoItem | null>(null);
  const [quickActionDate, setQuickActionDate] = useState<string | null>();
  const todayDateKey = formatDateKey(new Date());
  const quickActionOccurrenceDateKey = quickActionDate === null ? undefined : quickActionDate
    || (quickActionTodo && canCompleteTodoOccurrence(quickActionTodo, todayDateKey) ? todayDateKey : undefined);
  const quickActionOpenedAtRef = useRef(0);

  const openQuickActions = (todo: TodoItem, dateKey?: string | null) => {
    quickActionOpenedAtRef.current = Date.now();
    setQuickActionTodo(todos.find((item) => item.id === todo.id) || todo);
    setQuickActionDate(dateKey);
  };

  const closeQuickActions = (force = false) => {
    if (!force && isTodoQuickActionInteractionGuardActive(quickActionOpenedAtRef.current)) {
      return;
    }

    setQuickActionTodo(null);
  };

  const handleQuickActionSelectDate = (type: 'scheduled' | 'deadline', dateKey: string, keepOpen = false) => {
    if (!quickActionTodo) return;
    const liveTodo = todos.find((item) => item.id === quickActionTodo.id);
    if (!liveTodo) return;

    const nextTodo = {
      ...liveTodo,
      scheduledDate: type === 'scheduled' ? dateKey : liveTodo.scheduledDate,
      deadlineDate: type === 'deadline' ? dateKey : liveTodo.deadlineDate
    };
    if (keepOpen) setQuickActionTodo(nextTodo);
    onSaveTodo(nextTodo);
    if (!keepOpen) closeQuickActions(true);
  };

  const handleQuickActionMove = (type: 'scheduled' | 'deadline', mode: 'today' | 'tomorrow' | 'nextWeek') => {
    if (!quickActionTodo) return;

    const baseDateKey = type === 'scheduled'
      ? quickActionTodo.scheduledDate
      : quickActionTodo.deadlineDate;
    const baseDate = parseDateKey(baseDateKey) || new Date();
    const targetDate = new Date(baseDate);

    if (mode === 'today') {
      const today = new Date();
      targetDate.setFullYear(today.getFullYear(), today.getMonth(), today.getDate());
    } else if (mode === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      targetDate.setFullYear(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    } else {
      targetDate.setDate(targetDate.getDate() + 7);
    }

    handleQuickActionSelectDate(type, formatDateKey(targetDate));
  };

  const handleQuickActionOpenDetail = () => {
    if (!quickActionTodo) return;
    onEditTodo(quickActionTodo);
    closeQuickActions(true);
  };

  const handleQuickActionComplete = (dateKey?: string) => {
    if (!quickActionTodo) return;
    const liveTodo = todos.find((item) => item.id === quickActionTodo.id) || quickActionTodo;
    const occurrenceDate = dateKey || quickActionOccurrenceDateKey;
    if (liveTodo.recurrenceRule && !occurrenceDate) return;
    onSaveTodo(setTodoCompletion(liveTodo, true, occurrenceDate));
    closeQuickActions(true);
  };

  const handleQuickActionUndoComplete = () => {
    if (!quickActionTodo) return;
    const liveTodo = todos.find((item) => item.id === quickActionTodo.id) || quickActionTodo;
    onSaveTodo(setTodoCompletion(liveTodo, false, liveTodo.isCompleted ? undefined : quickActionOccurrenceDateKey));
    closeQuickActions(true);
  };

  const handleQuickActionToggleAbandon = () => {
    if (!quickActionTodo) return;
    const liveTodo = todos.find((item) => item.id === quickActionTodo.id) || quickActionTodo;
    onSaveTodo(setTodoStatus(liveTodo, liveTodo.abandonedAt ? 'active' : 'abandoned'));
    closeQuickActions(true);
  };

  const handleQuickActionClearDate = (type: 'scheduled' | 'deadline') => {
    if (!quickActionTodo) return;
    onSaveTodo({
      ...quickActionTodo,
      scheduledDate: type === 'scheduled' ? undefined : quickActionTodo.scheduledDate,
      deadlineDate: type === 'deadline' ? undefined : quickActionTodo.deadlineDate
    });
    closeQuickActions(true);
  };

  const handleQuickActionTogglePin = () => {
    if (!quickActionTodo) return;
    onSaveTodo({
      ...quickActionTodo,
      pin: !quickActionTodo.pin
    });
    closeQuickActions(true);
  };

  const handleQuickActionMoveCategory = (categoryId: string) => {
    const movedTodo = buildQuickActionCategoryMoveTodo(quickActionTodo, categoryId);

    if (!movedTodo) {
      return;
    }

    onSaveTodo(movedTodo);
    closeQuickActions(true);
  };

  const handleQuickActionLinkParent = (parentTodoId: string) => {
    const currentTodo = todos.find((todo) => todo.id === quickActionTodo?.id) || null;
    const linkedTodo = buildTodoParentLink(currentTodo, todos, parentTodoId);
    if (!linkedTodo) return;

    onSaveTodo(linkedTodo);
    closeQuickActions(true);
  };

  const handleQuickActionUpgradeToProject = (categoryId: string) => {
    const upgradedTodo = buildQuickActionUpgradeToProjectTodo(quickActionTodo, categoryId);

    if (!upgradedTodo) {
      return;
    }

    onSaveTodo(upgradedTodo);
    closeQuickActions(true);
  };

  const handleQuickActionMaybeDates = (values: string[]) => {
    if (!quickActionTodo) return;

    onSaveTodo({
      ...quickActionTodo,
      maybeDates: normalizeMaybeDates(values)
    });
    closeQuickActions(true);
  };

  const handleQuickActionSkipNextRecurrence = () => {
    if (!quickActionTodo?.recurrenceRule) return;

    const nextOccurrenceDateKey = quickActionOccurrenceDateKey || getNextRecurrenceOccurrenceDateKey(quickActionTodo.recurrenceRule);
    if (!nextOccurrenceDateKey) return;

    const nextTodo: TodoItem = {
      ...quickActionTodo,
      recurrenceRule: {
        ...quickActionTodo.recurrenceRule,
        skipDates: normalizeSkipDates([
          ...(quickActionTodo.recurrenceRule.skipDates || []),
          nextOccurrenceDateKey
        ])
      }
    };

    onSaveTodo(nextTodo);
    closeQuickActions(true);
  };

  const handleQuickActionSkipToMaybeDate = (dateKey: string) => {
    if (!quickActionTodo?.recurrenceRule) return;

    const nextOccurrenceDateKey = quickActionOccurrenceDateKey || getNextRecurrenceOccurrenceDateKey(quickActionTodo.recurrenceRule);
    onSaveTodo({
      ...quickActionTodo,
      maybeDates: normalizeMaybeDates([
        ...(quickActionTodo.maybeDates || []),
        dateKey
      ]),
      recurrenceRule: {
        ...quickActionTodo.recurrenceRule,
        skipDates: normalizeSkipDates([
          ...(quickActionTodo.recurrenceRule.skipDates || []),
          ...(nextOccurrenceDateKey ? [nextOccurrenceDateKey] : [])
        ])
      }
    });
    closeQuickActions(true);
  };

  const handleQuickActionDelete = () => {
    if (!quickActionTodo) return;
    const todoId = quickActionTodo.id;
    closeQuickActions(true);
    onDeleteTodo(todoId);
  };

  const handleQuickActionUpdateTitle = (title: string) => {
    if (!quickActionTodo) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle || trimmedTitle === quickActionTodo.title) return;

    setQuickActionTodo({
      ...quickActionTodo,
      title: trimmedTitle
    });
    onSaveTodo({
      ...quickActionTodo,
      title: trimmedTitle
    });
  };

  const handleQuickActionUpdateNote = (note: string) => {
    const nextTodo = buildQuickActionNoteUpdateTodo(quickActionTodo, note);
    if (!nextTodo) return;

    setQuickActionTodo(nextTodo);
    onSaveTodo(nextTodo);
  };

  const handleQuickActionUpdateReminder = (field: TodoReminderField, setting?: TodoReminderSetting) => {
    if (!quickActionTodo) return;
    const liveTodo = todos.find((item) => item.id === quickActionTodo.id);
    const nextTodo = buildQuickActionReminderUpdateTodo(liveTodo || null, field, setting);
    if (!nextTodo) return;
    setQuickActionTodo(nextTodo);
    onSaveTodo(nextTodo);
  };

  const handleQuickActionSaveTodo = (todo: TodoItem) => {
    setQuickActionTodo((current) => current?.id === todo.id ? todo : current);
    onSaveTodo(todo);
  };

  return {
    quickActionTodo,
    handleQuickActionSaveTodo,
    quickActionOccurrenceDateKey,
    quickActionOpenedAt: quickActionOpenedAtRef.current,
    openQuickActions,
    closeQuickActions,
    handleQuickActionMove,
    handleQuickActionSelectDate,
    handleQuickActionOpenDetail,
    handleQuickActionComplete,
    handleQuickActionUndoComplete,
    handleQuickActionToggleAbandon,
    handleQuickActionClearDate,
    handleQuickActionTogglePin,
    handleQuickActionMaybeDates,
    handleQuickActionSkipNextRecurrence,
    handleQuickActionSkipToMaybeDate,
    handleQuickActionMoveCategory,
    handleQuickActionLinkParent,
    handleQuickActionUpgradeToProject,
    handleQuickActionDelete,
    handleQuickActionUpdateTitle,
    handleQuickActionUpdateNote,
    handleQuickActionUpdateReminder
  };
};
