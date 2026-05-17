/**
 * @file desktopTodoQuickEditorUtils.ts
 * @input Live todo arrays plus the selected todo id
 * @output Shared quick-editor view models for desktop widget inline todo editing
 * @pos Utility (desktop widget quick editor)
 * @description Resolves one lightweight desktop-widget quick-editor model so today, quick, and month widgets can all render the same inline title editor, schedule summary, and hierarchy-aware related content.
 * @updated 2026-05-17: Added first-pass desktop widget quick-editor model helpers for inline title editing, compact schedule summaries, and one-level hierarchy display.
 * @updated 2026-05-17: Integrated recurrence schedule summaries under recurring todo titles within the desktop widget quick-editor models.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */

import type { TodoItem } from '../types';
import { getDirectChildTodosForDisplay, getParentTodo, isIncompleteSubtaskHiddenByCompletedParent } from './todoHierarchyUtils';
import { parseDateKey, formatTodoRecurrenceSummary } from './todoScheduleUtils';

export interface DesktopTodoQuickEditorListItem {
  id: string;
  title: string;
  isCurrent: boolean;
  isCompleted: boolean;
}

export interface DesktopTodoQuickEditorModel {
  todo: TodoItem;
  scheduleSummary: string | null;
  parentTitle: string | null;
  parentTodoId: string | null;
  sectionTitle: string | null;
  items: DesktopTodoQuickEditorListItem[];
  note: string | null;
  mode: 'children' | 'siblings' | 'note';
}

const formatCompactDate = (value?: string): string | null => {
  if (!value) {
    return null;
  }

  const parsed = parseDateKey(value);
  if (!parsed) {
    return value;
  }

  return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
};

const buildMaybeSummary = (todo: TodoItem): string | null => {
  if (!Array.isArray(todo.maybeDates) || todo.maybeDates.length === 0) {
    return null;
  }

  const compactDates = todo.maybeDates
    .slice()
    .sort((left, right) => left.localeCompare(right))
    .map((dateKey) => formatCompactDate(dateKey))
    .filter((value): value is string => Boolean(value));

  if (compactDates.length === 0) {
    return null;
  }

  return `Maybe ${compactDates.join(', ')}`;
};

export const buildDesktopTodoQuickEditorScheduleSummary = (todo: TodoItem): string | null => {
  const isRecurringTodo = Boolean(todo.recurrenceRule);
  const recurrenceSummary = isRecurringTodo ? formatTodoRecurrenceSummary(todo.recurrenceRule) : null;

  const parts = isRecurringTodo
    ? [
        recurrenceSummary,
        buildMaybeSummary(todo)
      ].filter((value): value is string => Boolean(value))
    : [
        todo.scheduledDate ? `安排 ${formatCompactDate(todo.scheduledDate)}` : null,
        todo.deadlineDate ? `截止 ${formatCompactDate(todo.deadlineDate)}` : null,
        buildMaybeSummary(todo)
      ].filter((value): value is string => Boolean(value));

  if (parts.length === 0) {
    return null;
  }

  return parts.join(' · ');
};

const buildListItem = (
  todo: TodoItem,
  currentTodoId: string
): DesktopTodoQuickEditorListItem => ({
  id: todo.id,
  title: todo.title,
  isCurrent: todo.id === currentTodoId,
  isCompleted: todo.isCompleted
});

const getVisibleChildTodos = (todos: TodoItem[], parentTodoId: string): TodoItem[] => (
  getDirectChildTodosForDisplay(todos, parentTodoId, {
    incompleteFirst: true,
    hideIncompleteWhenParentCompleted: true
  })
);

export const buildDesktopTodoQuickEditorModel = (
  todos: TodoItem[],
  todoId: string
): DesktopTodoQuickEditorModel | null => {
  const todo = todos.find((item) => item.id === todoId);
  if (!todo) {
    return null;
  }

  const parentTodo = getParentTodo(todos, todo);
  const visibleChildTodos = getVisibleChildTodos(todos, todo.id)
    .filter((childTodo) => !isIncompleteSubtaskHiddenByCompletedParent(todos, childTodo));

  if (visibleChildTodos.length > 0) {
    return {
      todo,
      scheduleSummary: buildDesktopTodoQuickEditorScheduleSummary(todo),
      parentTitle: parentTodo?.title || null,
      parentTodoId: parentTodo?.id || null,
      sectionTitle: '子任务',
      items: visibleChildTodos.map((childTodo) => buildListItem(childTodo, todo.id)),
      note: todo.note?.trim() || null,
      mode: 'children'
    };
  }

  if (parentTodo) {
    return {
      todo,
      scheduleSummary: buildDesktopTodoQuickEditorScheduleSummary(todo),
      parentTitle: parentTodo.title,
      parentTodoId: parentTodo.id,
      sectionTitle: null,
      items: [],
      note: todo.note?.trim() || null,
      mode: 'note'
    };
  }

  return {
    todo,
    scheduleSummary: buildDesktopTodoQuickEditorScheduleSummary(todo),
    parentTitle: null,
    parentTodoId: null,
    sectionTitle: null,
    items: [],
    note: todo.note?.trim() || null,
    mode: 'note'
  };
};
