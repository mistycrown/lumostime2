/**
 * @file desktopMonthWidgetSidebarUtils.ts
 * @input Full todo list, todo-category metadata, and the active desktop month-widget planning tab
 * @output Grouped sidebar section/row models for the desktop month widget planning panel
 * @pos Utility (desktop month widget)
 * @description Builds grouped sidebar sections for the desktop month widget so arrange/maybe/due tasks render by task group, preserve one-level subtask hierarchy, keep standalone subtasks visible with plain-text `@parent` context when their parent row is filtered out, and let all three planning tabs surface dated todos after undated ones for quick rescheduling.
 * @updated 2026-05-17: Unified the month-widget arrange/maybe/due sidebar rules so all unfinished todos stay visible, undated rows sort first inside each category, and dated rows expose compact trailing date text.
 * @updated 2026-05-17: Added grouped month-widget sidebar models that remove the misleading linked-category line and keep visible subtasks attached to their parent rows whenever possible.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */

import { TodoCategory, TodoItem } from '../types';
import {
  getDirectChildTodosForDisplay,
  getParentTodo,
  isIncompleteSubtaskHiddenByCompletedParent
} from './todoHierarchyUtils';
import { parseDateKey } from './todoScheduleUtils';

export type DesktopMonthSidebarTab = 'scheduled' | 'maybe' | 'deadline';

export interface DesktopMonthSidebarRow {
  todo: TodoItem;
  displayTitle: string;
  level: 0 | 1;
  trailingDateText?: string;
}

export interface DesktopMonthSidebarSection {
  categoryId: string;
  title: string;
  rows: DesktopMonthSidebarRow[];
}

const UNCATEGORIZED_SECTION_TITLE = '未分组';

const buildTodoOrderLookup = (todos: TodoItem[]): Map<string, number> => (
  new Map(todos.map((todo, index) => [todo.id, index]))
);

const compareBySourceOrder = (
  left: TodoItem,
  right: TodoItem,
  orderLookup: Map<string, number>
): number => (
  (orderLookup.get(left.id) ?? Number.MAX_SAFE_INTEGER)
  - (orderLookup.get(right.id) ?? Number.MAX_SAFE_INTEGER)
);

const getPrimaryDateValue = (
  todo: TodoItem,
  tab: DesktopMonthSidebarTab
): string | undefined => {
  if (tab === 'scheduled') {
    return todo.scheduledDate;
  }

  if (tab === 'deadline') {
    return todo.deadlineDate;
  }

  return todo.maybeDates?.slice().sort((left, right) => left.localeCompare(right))[0];
};

const getDateBucketOrder = (
  todo: TodoItem,
  tab: DesktopMonthSidebarTab
): number => (
  getPrimaryDateValue(todo, tab) ? 1 : 0
);

const compareSectionTodos = (
  left: TodoItem,
  right: TodoItem,
  orderLookup: Map<string, number>,
  tab: DesktopMonthSidebarTab
): number => {
  if (tab === 'scheduled' || tab === 'deadline' || tab === 'maybe') {
    const leftBucketOrder = getDateBucketOrder(left, tab);
    const rightBucketOrder = getDateBucketOrder(right, tab);

    if (leftBucketOrder !== rightBucketOrder) {
      return leftBucketOrder - rightBucketOrder;
    }
  }

  return compareBySourceOrder(left, right, orderLookup);
};

const formatCompactDate = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = parseDateKey(value);
  if (!parsed) {
    return value;
  }

  return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
};

const isTodoVisibleForTab = (todo: TodoItem, tab: DesktopMonthSidebarTab): boolean => {
  if (todo.isCompleted || todo.recurrenceRule) {
    return false;
  }

  return true;
};

const buildSectionRows = (
  sectionTodos: TodoItem[],
  sourceTodos: TodoItem[],
  activeTab: DesktopMonthSidebarTab
): DesktopMonthSidebarRow[] => {
  const visibleTodoIds = new Set(sectionTodos.map((todo) => todo.id));
  const orderLookup = buildTodoOrderLookup(sourceTodos);
  const topLevelRows = sectionTodos
    .filter((todo) => {
      const parentTodo = getParentTodo(sourceTodos, todo);
      return !parentTodo || !visibleTodoIds.has(parentTodo.id);
    })
    .sort((left, right) => compareSectionTodos(left, right, orderLookup, activeTab));

  return topLevelRows.flatMap((todo) => {
    const hiddenParentTodo = getParentTodo(sourceTodos, todo);
    if (hiddenParentTodo) {
      return [{
        todo,
        displayTitle: `${todo.title} @${hiddenParentTodo.title}`,
        level: 0 as const,
        trailingDateText: formatCompactDate(getPrimaryDateValue(todo, activeTab))
      }];
    }

    const childRows = getDirectChildTodosForDisplay(sectionTodos, todo.id, {
      incompleteFirst: true,
      includeCompleted: false,
      hideIncompleteWhenParentCompleted: true
    })
      .sort((left, right) => compareSectionTodos(left, right, orderLookup, activeTab))
      .map((childTodo) => ({
        todo: childTodo,
        displayTitle: childTodo.title,
        level: 1 as const,
        trailingDateText: formatCompactDate(getPrimaryDateValue(childTodo, activeTab))
      }));

    return [
      {
        todo,
        displayTitle: todo.title,
        level: 0 as const,
        trailingDateText: formatCompactDate(getPrimaryDateValue(todo, activeTab))
      },
      ...childRows
    ];
  });
};

export const buildDesktopMonthSidebarSections = (
  todos: TodoItem[],
  categories: TodoCategory[],
  activeTab: DesktopMonthSidebarTab
): DesktopMonthSidebarSection[] => {
  const visibleTodos = todos
    .filter((todo) => isTodoVisibleForTab(todo, activeTab))
    .filter((todo) => !isIncompleteSubtaskHiddenByCompletedParent(todos, todo));
  const categoryLookup = new Map(categories.map((category) => [category.id, category]));
  const categoryOrderLookup = new Map(categories.map((category, index) => [category.id, index]));
  const sectionTodoMap = new Map<string, TodoItem[]>();

  visibleTodos.forEach((todo) => {
    const bucketKey = todo.categoryId || '__uncategorized__';
    const currentSectionTodos = sectionTodoMap.get(bucketKey) || [];
    currentSectionTodos.push(todo);
    sectionTodoMap.set(bucketKey, currentSectionTodos);
  });

  return Array.from(sectionTodoMap.entries())
    .sort(([leftCategoryId, leftTodos], [rightCategoryId, rightTodos]) => {
      const leftCategoryOrder = categoryOrderLookup.get(leftCategoryId) ?? Number.MAX_SAFE_INTEGER;
      const rightCategoryOrder = categoryOrderLookup.get(rightCategoryId) ?? Number.MAX_SAFE_INTEGER;

      if (leftCategoryOrder !== rightCategoryOrder) {
        return leftCategoryOrder - rightCategoryOrder;
      }

      const leftFirstTodoIndex = todos.findIndex((todo) => todo.id === leftTodos[0]?.id);
      const rightFirstTodoIndex = todos.findIndex((todo) => todo.id === rightTodos[0]?.id);
      return leftFirstTodoIndex - rightFirstTodoIndex;
    })
    .map(([categoryId, sectionTodos]) => ({
      categoryId,
      title: categoryLookup.get(categoryId)?.name || UNCATEGORIZED_SECTION_TITLE,
      rows: buildSectionRows(sectionTodos, todos, activeTab)
    }))
    .filter((section) => section.rows.length > 0);
};
