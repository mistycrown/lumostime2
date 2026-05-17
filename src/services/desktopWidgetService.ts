/**
 * @file desktopWidgetService.ts
 * @input Persisted todos/categories from localStorage, shared todo schedule utilities, reference date
 * @output Desktop widget route helpers and compact today-task snapshot builders for the Electron widget window
 * @pos Service
 * @description Builds the lightweight desktop widget snapshot from the shared todo model so the Electron widget window can reuse the app's existing today-task logic without mounting the full app shell.
 * @updated 2026-05-17: Added desktop widget route detection plus today/pin/overdue snapshot builders for the Electron desktop today widget and month-widget window, with getDesktopWidgetType helper support.
 */
import { USER_DATA_KEYS, storage } from '../constants/storageKeys';
import { Category, TodoItem } from '../types';
import { getColorHexForCharts } from '../utils/colorAdapterUtils';
import { getParentTodo } from '../utils/todoHierarchyUtils';
import {
  formatDateKey,
  getTodoAssociationTodayTodos,
  hasMaybeDate
} from '../utils/todoScheduleUtils';

export const DESKTOP_WIDGET_WINDOW_QUERY_KEY = 'window';
export const DESKTOP_WIDGET_WINDOW_QUERY_VALUE = 'desktop-widget';
export const DESKTOP_MONTH_WIDGET_WINDOW_QUERY_VALUE = 'desktop-month';

export type DesktopWidgetBadgeLabel = 'PIN' | 'TODAY' | 'LATE' | 'MAYBE';

export interface DesktopWidgetTodoItem {
  todoId: string;
  title: string;
  isCompleted: boolean;
  badgeLabel: DesktopWidgetBadgeLabel;
  icon: string | null;
  color: string | null;
  activityLabel: string | null;
  parentTitle: string | null;
  scheduledDate: string | null;
  deadlineDate: string | null;
}

export interface DesktopTodayWidgetSnapshot {
  date: string;
  summary: {
    total: number;
    completed: number;
    remaining: number;
  };
  pinned: DesktopWidgetTodoItem[];
  today: DesktopWidgetTodoItem[];
  maybe: DesktopWidgetTodoItem[];
  overdue: DesktopWidgetTodoItem[];
  completed: DesktopWidgetTodoItem[];
  syncedAt: number;
}

const EMPTY_SNAPSHOT: DesktopTodayWidgetSnapshot = {
  date: formatDateKey(new Date()),
  summary: {
    total: 0,
    completed: 0,
    remaining: 0
  },
  pinned: [],
  today: [],
  maybe: [],
  overdue: [],
  completed: [],
  syncedAt: Date.now()
};

const normalizeStoredArray = <T,>(value: T[] | null): T[] => (Array.isArray(value) ? value : []);

const resolveTodoLinkedPresentation = (
  todo: TodoItem,
  todos: TodoItem[],
  categories: Category[]
): Pick<DesktopWidgetTodoItem, 'icon' | 'color' | 'activityLabel' | 'parentTitle'> => {
  const linkedCategory = todo.linkedCategoryId
    ? categories.find((category) => category.id === todo.linkedCategoryId)
    : undefined;
  const linkedActivity = todo.linkedActivityId
    ? linkedCategory?.activities.find((activity) => activity.id === todo.linkedActivityId)
      || categories
        .flatMap((category) => category.activities)
        .find((activity) => activity.id === todo.linkedActivityId)
    : undefined;
  const resolvedCategory = linkedCategory
    || categories.find((category) => category.activities.some((activity) => activity.id === linkedActivity?.id));
  const parentTodo = getParentTodo(todos, todo);

  return {
    icon: linkedActivity?.icon || resolvedCategory?.icon || null,
    color: getColorHexForCharts(linkedActivity?.color || resolvedCategory?.themeColor || '') || null,
    activityLabel: linkedActivity?.name || null,
    parentTitle: parentTodo?.title || null
  };
};

const buildDesktopWidgetTodoItem = (
  todo: TodoItem,
  todos: TodoItem[],
  categories: Category[],
  badgeLabel: DesktopWidgetBadgeLabel
): DesktopWidgetTodoItem => {
  const linkedPresentation = resolveTodoLinkedPresentation(todo, todos, categories);
  return {
    todoId: todo.id,
    title: todo.title,
    isCompleted: todo.isCompleted,
    badgeLabel,
    icon: linkedPresentation.icon,
    color: linkedPresentation.color,
    activityLabel: linkedPresentation.activityLabel,
    parentTitle: linkedPresentation.parentTitle,
    scheduledDate: todo.scheduledDate || null,
    deadlineDate: todo.deadlineDate || null
  };
};

const getOverdueSortKey = (todo: TodoItem, todayDateKey: string): string => {
  const overdueCandidates = [todo.deadlineDate, todo.scheduledDate]
    .filter((value): value is string => Boolean(value && value < todayDateKey))
    .sort((left, right) => left.localeCompare(right));
  return overdueCandidates[0] || todayDateKey;
};

const buildOverdueTodos = (
  todos: TodoItem[],
  categories: Category[],
  referenceDate: Date,
  visibleTodayIds: Set<string>
): DesktopWidgetTodoItem[] => {
  const todayDateKey = formatDateKey(referenceDate);

  return todos
    .filter((todo) => !todo.isCompleted)
    .filter((todo) => !visibleTodayIds.has(todo.id))
    .filter((todo) => (
      Boolean(todo.deadlineDate && todo.deadlineDate < todayDateKey)
      || Boolean(todo.scheduledDate && todo.scheduledDate < todayDateKey)
    ))
    .sort((left, right) => {
      const leftKey = getOverdueSortKey(left, todayDateKey);
      const rightKey = getOverdueSortKey(right, todayDateKey);
      return leftKey.localeCompare(rightKey) || left.title.localeCompare(right.title, 'zh-CN');
    })
    .map((todo) => buildDesktopWidgetTodoItem(todo, todos, categories, 'LATE'));
};

export const isDesktopWidgetWindow = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  const val = new URLSearchParams(window.location.search).get(DESKTOP_WIDGET_WINDOW_QUERY_KEY);
  return val === DESKTOP_WIDGET_WINDOW_QUERY_VALUE || val === DESKTOP_MONTH_WIDGET_WINDOW_QUERY_VALUE;
};

export const getDesktopWidgetType = (): 'today' | 'month' | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const val = new URLSearchParams(window.location.search).get(DESKTOP_WIDGET_WINDOW_QUERY_KEY);
  if (val === DESKTOP_WIDGET_WINDOW_QUERY_VALUE) {
    return 'today';
  }
  if (val === DESKTOP_MONTH_WIDGET_WINDOW_QUERY_VALUE) {
    return 'month';
  }
  return null;
};

export const buildDesktopTodayWidgetSnapshot = ({
  todos,
  categories,
  date = new Date()
}: {
  todos: TodoItem[];
  categories: Category[];
  date?: Date;
}): DesktopTodayWidgetSnapshot => {
  const referenceDate = new Date(date);
  const dateKey = formatDateKey(referenceDate);
  const visibleTodayTodos = getTodoAssociationTodayTodos(todos, referenceDate);
  const visibleTodayIds = new Set(visibleTodayTodos.map((todo) => todo.id));
  const visibleTodayCompletedTodos = getTodoAssociationTodayTodos(todos, referenceDate, {
    includeCompleted: true
  }).filter((todo) => todo.isCompleted);

  const pinned = visibleTodayTodos
    .filter((todo) => Boolean(todo.pin))
    .map((todo) => buildDesktopWidgetTodoItem(todo, todos, categories, 'PIN'));
  
  const maybeItems = visibleTodayTodos
    .filter((todo) => !todo.pin && hasMaybeDate(todo, dateKey, referenceDate))
    .map((todo) => buildDesktopWidgetTodoItem(todo, todos, categories, 'MAYBE'));
    
  const todayItems = visibleTodayTodos
    .filter((todo) => !todo.pin && !hasMaybeDate(todo, dateKey, referenceDate))
    .map((todo) => buildDesktopWidgetTodoItem(todo, todos, categories, 'TODAY'));
    
  const overdue = buildOverdueTodos(todos, categories, referenceDate, visibleTodayIds);
  const completedItems = visibleTodayCompletedTodos
    .map((todo) => buildDesktopWidgetTodoItem(todo, todos, categories, 'TODAY'));

  const remaining = pinned.length + maybeItems.length + todayItems.length + overdue.length;
  const completed = visibleTodayCompletedTodos.length;

  return {
    date: dateKey,
    summary: {
      total: remaining + completed,
      completed,
      remaining
    },
    pinned,
    today: todayItems,
    maybe: maybeItems,
    overdue,
    completed: completedItems,
    syncedAt: Date.now()
  };
};

export const loadDesktopTodayWidgetSnapshotFromStorage = (
  date: Date = new Date()
): DesktopTodayWidgetSnapshot => {
  if (typeof window === 'undefined') {
    return {
      ...EMPTY_SNAPSHOT,
      date: formatDateKey(date),
      syncedAt: Date.now()
    };
  }

  const todos = normalizeStoredArray(storage.getJSON<TodoItem[]>(USER_DATA_KEYS.TODOS, []));
  const categories = normalizeStoredArray(storage.getJSON<Category[]>(USER_DATA_KEYS.CATEGORIES, []));

  return buildDesktopTodayWidgetSnapshot({
    todos,
    categories,
    date
  });
};

export const loadDesktopTodayWidgetSnapshotAsync = async (
  date: Date = new Date()
): Promise<DesktopTodayWidgetSnapshot> => {
  if (typeof window === 'undefined') {
    return {
      ...EMPTY_SNAPSHOT,
      date: formatDateKey(date),
      syncedAt: Date.now()
    };
  }

  const { dataRepository } = await import('../repositories/dataRepository');
  const { todos } = await dataRepository.loadDataContextSnapshot();
  const { categories } = await dataRepository.loadCategoryScopeSnapshot();

  return buildDesktopTodayWidgetSnapshot({
    todos,
    categories,
    date
  });
};
