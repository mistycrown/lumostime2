/**
 * @file desktopWidgetService.ts
 * @input Persisted todos/categories from localStorage, shared todo schedule utilities, reference date
 * @output Desktop widget route helpers and compact today-task snapshot builders for the Electron widget window
 * @pos Service
 * @description Builds the lightweight desktop widget snapshot from the shared todo model so the Electron widget window can reuse the app's existing today-task logic without mounting the full app shell.
 * @updated 2026-05-17: 扩展了桌面小组件状态快照，新增计时器小组件（timer widget）的快照构建 buildDesktopTimerWidgetSnapshot 与 loadDesktopTimerWidgetSnapshotFromStorage。
 * @updated 2026-05-17: 新增桌面小组件启动偏好键名与读取辅助逻辑，供 Electron 主应用启动时自动恢复已启用的 PC 端小组件。
 * @updated 2026-05-17: 扩展了桌面小组件的支持，新增 desktop-quick（小事清单小组件）快照构建与窗口检测，实现了 buildDesktopQuickWidgetSnapshot 以确保无排期的小事能够完整呈现在小组件待办列表中。
 * @updated 2026-05-17: Added a dedicated `desktop-editor` route and shared payload type for the transparent widget quick-editor window.
 * @updated 2026-05-18: Added a dedicated `desktop-ai` route plus startup-toggle parsing so the Electron desktop AI widget can restore alongside other desktop windows without joining the lightweight widget boot path.
 * @updated 2026-05-18: Added parent todo ids to desktop today-widget snapshot items so compact Electron list views can render one-level subtask hierarchy without reloading the full todo graph.
 * @updated 2026-05-17: Added desktop widget route detection plus today/pin/overdue snapshot builders for the Electron desktop today widget and month-widget window, with getDesktopWidgetType helper support.
 * @updated 2026-05-17: Kept completed todos visible in desktop today/quick widget snapshots so the widget views can render them after unfinished rows instead of dropping them.
 */
import { USER_DATA_KEYS, storage } from '../constants/storageKeys';
import { Category, TodoItem, ActiveSession } from '../types';
import { getColorHexForCharts } from '../utils/colorAdapterUtils';
import { loadPersistedActiveSessions } from '../utils/sessionPersistence';
import { getParentTodo } from '../utils/todoHierarchyUtils';
import {
  formatDateKey,
  getTodoAssociationTodayTodos,
  hasMaybeDate
} from '../utils/todoScheduleUtils';

export const DESKTOP_WIDGET_WINDOW_QUERY_KEY = 'window';
export const DESKTOP_WIDGET_WINDOW_QUERY_VALUE = 'desktop-widget';
export const DESKTOP_MONTH_WIDGET_WINDOW_QUERY_VALUE = 'desktop-month';
export const DESKTOP_QUICK_WIDGET_WINDOW_QUERY_VALUE = 'desktop-quick';
export const DESKTOP_TIMER_WIDGET_WINDOW_QUERY_VALUE = 'desktop-timer';
export const DESKTOP_EDITOR_WIDGET_WINDOW_QUERY_VALUE = 'desktop-editor';
export const DESKTOP_AI_WIDGET_WINDOW_QUERY_VALUE = 'desktop-ai';
export const DESKTOP_WIDGET_TODAY_STORAGE_KEY = 'lumostime_desktop_widget_today_enabled';
export const DESKTOP_WIDGET_MONTH_STORAGE_KEY = 'lumostime_desktop_widget_month_enabled';
export const DESKTOP_WIDGET_QUICK_STORAGE_KEY = 'lumostime_desktop_widget_quick_enabled';
export const DESKTOP_WIDGET_TIMER_STORAGE_KEY = 'lumostime_desktop_widget_timer_enabled';
export const DESKTOP_WIDGET_AI_STORAGE_KEY = 'lumostime_desktop_widget_ai_enabled';

export type DesktopWidgetStartupType = 'today' | 'month' | 'quick' | 'timer' | 'ai';

export type DesktopWidgetBadgeLabel = 'PIN' | 'TODAY' | 'LATE' | 'MAYBE';

export interface DesktopTodoQuickEditorWindowPayload {
  todoId: string;
  theme: 'light' | 'dark';
  x: number;
  y: number;
}

export interface DesktopWidgetTodoItem {
  todoId: string;
  title: string;
  isCompleted: boolean;
  badgeLabel: DesktopWidgetBadgeLabel;
  icon: string | null;
  color: string | null;
  activityLabel: string | null;
  parentTodoId: string | null;
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
    parentTodoId: todo.parentTodoId || null,
    parentTitle: linkedPresentation.parentTitle,
    scheduledDate: todo.scheduledDate || null,
    deadlineDate: todo.deadlineDate || null
  };
};

const sortWidgetTodosByCompletionAndTitle = (
  list: TodoItem[]
): TodoItem[] => [...list].sort((left, right) => (
  Number(left.isCompleted) - Number(right.isCompleted)
  || left.title.localeCompare(right.title, 'zh-CN')
));

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
  visibleTodayIds: Set<string>,
  options?: {
    includeCompleted?: boolean;
  }
): DesktopWidgetTodoItem[] => {
  const todayDateKey = formatDateKey(referenceDate);

  return todos
    .filter((todo) => (options?.includeCompleted ? true : !todo.isCompleted))
    .filter((todo) => !visibleTodayIds.has(todo.id))
    .filter((todo) => (
      Boolean(todo.deadlineDate && todo.deadlineDate < todayDateKey)
      || Boolean(todo.scheduledDate && todo.scheduledDate < todayDateKey)
    ))
    .sort((left, right) => {
      const completionDiff = Number(left.isCompleted) - Number(right.isCompleted);
      if (completionDiff !== 0) {
        return completionDiff;
      }
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
  return val === DESKTOP_WIDGET_WINDOW_QUERY_VALUE
    || val === DESKTOP_MONTH_WIDGET_WINDOW_QUERY_VALUE
    || val === DESKTOP_QUICK_WIDGET_WINDOW_QUERY_VALUE
    || val === DESKTOP_TIMER_WIDGET_WINDOW_QUERY_VALUE
    || val === DESKTOP_EDITOR_WIDGET_WINDOW_QUERY_VALUE;
};

export const getDesktopWidgetType = (): 'today' | 'month' | 'quick' | 'timer' | 'editor' | 'ai' | null => {
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
  if (val === DESKTOP_QUICK_WIDGET_WINDOW_QUERY_VALUE) {
    return 'quick';
  }
  if (val === DESKTOP_TIMER_WIDGET_WINDOW_QUERY_VALUE) {
    return 'timer';
  }
  if (val === DESKTOP_EDITOR_WIDGET_WINDOW_QUERY_VALUE) {
    return 'editor';
  }
  if (val === DESKTOP_AI_WIDGET_WINDOW_QUERY_VALUE) {
    return 'ai';
  }
  return null;
};

export const loadEnabledDesktopWidgetTypes = (
  storageLike: Pick<Storage, 'getItem'>
): DesktopWidgetStartupType[] => {
  const enabledWidgetTypes: DesktopWidgetStartupType[] = [];

  if (storageLike.getItem(DESKTOP_WIDGET_TODAY_STORAGE_KEY) === 'true') {
    enabledWidgetTypes.push('today');
  }
  if (storageLike.getItem(DESKTOP_WIDGET_MONTH_STORAGE_KEY) === 'true') {
    enabledWidgetTypes.push('month');
  }
  if (storageLike.getItem(DESKTOP_WIDGET_QUICK_STORAGE_KEY) === 'true') {
    enabledWidgetTypes.push('quick');
  }
  if (storageLike.getItem(DESKTOP_WIDGET_TIMER_STORAGE_KEY) === 'true') {
    enabledWidgetTypes.push('timer');
  }
  if (storageLike.getItem(DESKTOP_WIDGET_AI_STORAGE_KEY) === 'true') {
    enabledWidgetTypes.push('ai');
  }

  return enabledWidgetTypes;
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
  const visibleTodayTodos = getTodoAssociationTodayTodos(todos, referenceDate, {
    includeCompleted: true
  });
  const visibleTodayIds = new Set(visibleTodayTodos.map((todo) => todo.id));

  const pinned = sortWidgetTodosByCompletionAndTitle(visibleTodayTodos
    .filter((todo) => Boolean(todo.pin))
  ).map((todo) => buildDesktopWidgetTodoItem(todo, todos, categories, 'PIN'));
  
  const maybeItems = sortWidgetTodosByCompletionAndTitle(visibleTodayTodos
    .filter((todo) => !todo.pin && hasMaybeDate(todo, dateKey, referenceDate))
  ).map((todo) => buildDesktopWidgetTodoItem(todo, todos, categories, 'MAYBE'));
    
  const todayItems = sortWidgetTodosByCompletionAndTitle(visibleTodayTodos
    .filter((todo) => !todo.pin && !hasMaybeDate(todo, dateKey, referenceDate))
  ).map((todo) => buildDesktopWidgetTodoItem(todo, todos, categories, 'TODAY'));
    
  const overdue = buildOverdueTodos(todos, categories, referenceDate, visibleTodayIds, {
    includeCompleted: true
  });
  const allVisibleItems = [...pinned, ...todayItems, ...maybeItems, ...overdue];
  const completedItems = allVisibleItems.filter((item) => item.isCompleted);

  const completed = completedItems.length;
  const remaining = allVisibleItems.length - completed;

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

export const buildDesktopQuickWidgetSnapshot = ({
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

  // 1. 过滤已完成和未完成的小事
  const uncompletedQuickTodos = todos.filter((todo) => !todo.isCompleted);
  // 已完成的我们仍然只保留今天完成的小事，以便展示已完成列表
  // Completed quick todos stay in the snapshot so the flat widget list can render them at the end.
  const completedQuickTodos = todos.filter((todo) => todo.isCompleted);

  // 2. 归类置顶小事
  const pinnedTodos = uncompletedQuickTodos.filter((todo) => Boolean(todo.pin));
  const pinnedIds = new Set(pinnedTodos.map((t) => t.id));

  // 3. 归类逾期小事 (有排期且排期小于今天)
  const overdueTodos = uncompletedQuickTodos.filter((todo) => {
    if (pinnedIds.has(todo.id)) return false;
    return (
      (todo.deadlineDate && todo.deadlineDate < dateKey) ||
      (todo.scheduledDate && todo.scheduledDate < dateKey)
    );
  });
  const overdueIds = new Set(overdueTodos.map((t) => t.id));

  // 4. 归类备选小事
  const maybeTodos = uncompletedQuickTodos.filter((todo) => {
    if (pinnedIds.has(todo.id) || overdueIds.has(todo.id)) return false;
    return hasMaybeDate(todo, dateKey, referenceDate);
  });
  const maybeIds = new Set(maybeTodos.map((t) => t.id));

  // 5. 剩余的所有未完成小事，即：排期在今天、或者没有任何排期的小事，都归入今天小事
  const todayTodos = uncompletedQuickTodos.filter((todo) => {
    return !pinnedIds.has(todo.id) && !overdueIds.has(todo.id) && !maybeIds.has(todo.id);
  });

  // 映射到小组件所需要的 DesktopWidgetTodoItem 数组中，按标题排序以保持稳定
  const sortTodos = (list: TodoItem[]) =>
    [...list].sort((left, right) => left.title.localeCompare(right.title, 'zh-CN'));

  const pinned = sortTodos(pinnedTodos).map((todo) =>
    buildDesktopWidgetTodoItem(todo, todos, categories, 'PIN')
  );
  const todayItems = sortTodos(todayTodos).map((todo) =>
    buildDesktopWidgetTodoItem(todo, todos, categories, 'TODAY')
  );
  const maybeItems = sortTodos(maybeTodos).map((todo) =>
    buildDesktopWidgetTodoItem(todo, todos, categories, 'MAYBE')
  );
  const overdue = sortTodos(overdueTodos).map((todo) =>
    buildDesktopWidgetTodoItem(todo, todos, categories, 'LATE')
  );
  const completedItems = sortTodos(completedQuickTodos).map((todo) =>
    buildDesktopWidgetTodoItem(todo, todos, categories, 'TODAY')
  );

  const remaining = pinned.length + maybeItems.length + todayItems.length + overdue.length;
  const completed = completedQuickTodos.length;

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

export const loadDesktopQuickWidgetSnapshotAsync = async (
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

  // 仅筛选小事清单（kind 为 quick）的 todo 项
  const quickTodos = (todos || []).filter((todo) => todo.kind === 'quick');

  return buildDesktopQuickWidgetSnapshot({
    todos: quickTodos,
    categories,
    date
  });
};

export interface DesktopTimerWidgetSnapshot {
  session: {
    sessionId: string;
    activityName: string;
    startTime: number;
  } | null;
  syncedAt: number;
}

export const buildDesktopTimerWidgetSnapshot = (
  activeSessions: ActiveSession[]
): DesktopTimerWidgetSnapshot => {
  if (!activeSessions || activeSessions.length === 0) {
    return { session: null, syncedAt: Date.now() };
  }
  // 默认升序，最后一个是最新开始的
  const latest = activeSessions[activeSessions.length - 1];
  return {
    session: {
      sessionId: latest.id,
      activityName: latest.activityName,
      startTime: latest.startTime
    },
    syncedAt: Date.now()
  };
};

export const loadDesktopTimerWidgetSnapshotFromStorage = (): DesktopTimerWidgetSnapshot => {
  if (typeof window === 'undefined') {
    return { session: null, syncedAt: Date.now() };
  }
  const sessions = loadPersistedActiveSessions();
  return buildDesktopTimerWidgetSnapshot(sessions);
};
