/**
 * @file todoScheduleUtils.ts
 * @input Todo items with optional schedule fields, reference dates
 * @output Week buckets, daily schedule entries, and badge metadata for todo planning views
 * @pos Utility (Todo planning)
 * @description Shared helpers for deriving scheduled, deadline, recurring, completed, and in-progress todo visibility without creating standalone occurrence records.
 * @updated 2026-05-10: Added shared day-entry builders for the new reference-style month schedule so the month grid and week planner now read the same real per-day todo data.
 * @updated 2026-04-27: Expanded the shared today-selector helpers so widget and picker `today + pin` views include todos that match today via arrange, due, or recurrence rules.
 * @updated 2026-04-22: Added shared today-selector helpers so todo pickers can reuse the same `pin or arranged today` virtual category.
 * @updated 2026-04-20 19:08: Added reusable today/tomorrow/this-week schedule match helpers for the todo list virtual category.
 * @updated 2026-04-20 18:12: Normalized week-view badge combinations so Due hides Arrange and Done hides Trace for the same day.
 *
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { Log, TodoItem, TodoRecurrenceRule } from '../types';

export interface TodoDateBadges {
  scheduled: boolean;
  deadline: boolean;
  recurring: boolean;
  completed: boolean;
  inProgress: boolean;
}

export interface WeekTodoEntry {
  todo: TodoItem;
  badges: TodoDateBadges;
}

export interface WeekDayBucket {
  date: string;
  items: WeekTodoEntry[];
}

export type TodoScheduleMatchKind = 'deadline' | 'scheduled' | 'recurring';
export type TodoScheduleRange = 'today' | 'tomorrow' | 'thisWeek';
export type TodoScheduleEntryKind = 'deadline' | 'scheduled' | 'recurring' | 'completed' | 'inProgress';

export interface TodoScheduleMatch {
  dateKey: string;
  kind: TodoScheduleMatchKind;
}

export interface TodoDateEntry {
  todo: TodoItem;
  badges: TodoDateBadges;
  primaryKind: TodoScheduleEntryKind;
}

export const TODO_ASSOCIATION_TODAY_CATEGORY_ID = '__todo_association_today__';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const TODO_SCHEDULE_MATCH_PRIORITY: Record<TodoScheduleMatchKind, number> = {
  deadline: 0,
  scheduled: 1,
  recurring: 2
};

const normalizeDate = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const formatDateKey = (date: Date): string => {
  const normalized = normalizeDate(date);
  const year = normalized.getFullYear();
  const month = `${normalized.getMonth() + 1}`.padStart(2, '0');
  const day = `${normalized.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDateKey = (dateKey?: string): Date | null => {
  if (!dateKey) return null;
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return normalizeDate(parsed);
};

export const getStartOfWeek = (date: Date): Date => {
  const normalized = normalizeDate(date);
  const day = normalized.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(normalized);
  weekStart.setDate(normalized.getDate() + offset);
  return normalizeDate(weekStart);
};

export const getWeekDates = (referenceDate: Date): Date[] => {
  const weekStart = getStartOfWeek(referenceDate);
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() + index);
    return normalizeDate(next);
  });
};

export const getTodayDateKey = (): string => formatDateKey(new Date());

export const isTodoInAssociationTodayCategory = (
  todo: TodoItem,
  referenceDate: Date = new Date()
): boolean => {
  const todayDateKey = formatDateKey(referenceDate);
  return Boolean(todo.pin)
    || todo.scheduledDate === todayDateKey
    || todo.deadlineDate === todayDateKey
    || matchesRecurrenceRule(todo.recurrenceRule, todayDateKey);
};

export const getTodoAssociationTodayTodos = (
  todos: TodoItem[],
  referenceDate: Date = new Date(),
  options?: { includeCompleted?: boolean }
): TodoItem[] => todos
  .filter((todo) => options?.includeCompleted || !todo.isCompleted)
  .filter((todo) => isTodoInAssociationTodayCategory(todo, referenceDate))
  .sort((left, right) => {
    if (Boolean(left.pin) !== Boolean(right.pin)) {
      return Number(Boolean(right.pin)) - Number(Boolean(left.pin));
    }

    return left.title.localeCompare(right.title, 'zh-CN');
  });

export const getTodoScheduleRangeDateKeys = (
  range: TodoScheduleRange,
  referenceDate: Date = new Date()
): string[] => {
  const normalizedReference = normalizeDate(referenceDate);

  if (range === 'today') {
    return [formatDateKey(normalizedReference)];
  }

  if (range === 'tomorrow') {
    const tomorrow = new Date(normalizedReference);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return [formatDateKey(tomorrow)];
  }

  return getWeekDates(normalizedReference).map((date) => formatDateKey(date));
};

const getDayDiff = (start: Date, end: Date): number =>
  Math.floor((normalizeDate(end).getTime() - normalizeDate(start).getTime()) / ONE_DAY_MS);

const getMonthDiff = (start: Date, end: Date): number =>
  (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

const matchesDailyRule = (rule: TodoRecurrenceRule, targetDate: Date, startDate: Date): boolean => {
  const interval = Math.max(1, rule.interval || 1);
  return getDayDiff(startDate, targetDate) % interval === 0;
};

const matchesWeeklyRule = (rule: TodoRecurrenceRule, targetDate: Date, startDate: Date): boolean => {
  const interval = Math.max(1, rule.interval || 1);
  const weekdays = rule.weekdays?.length ? rule.weekdays : [startDate.getDay()];
  if (!weekdays.includes(targetDate.getDay())) return false;

  const startWeek = getStartOfWeek(startDate);
  const targetWeek = getStartOfWeek(targetDate);
  const weekDiff = Math.floor(getDayDiff(startWeek, targetWeek) / 7);
  return weekDiff % interval === 0;
};

const matchesMonthlyRule = (rule: TodoRecurrenceRule, targetDate: Date, startDate: Date): boolean => {
  const interval = Math.max(1, rule.interval || 1);
  const monthDays = rule.monthDays?.length ? rule.monthDays : [startDate.getDate()];
  const monthDiff = getMonthDiff(startDate, targetDate);
  if (monthDiff % interval !== 0) return false;
  return monthDays.includes(targetDate.getDate());
};

export const matchesRecurrenceRule = (rule: TodoRecurrenceRule | undefined, targetDateKey: string): boolean => {
  if (!rule) return false;

  const targetDate = parseDateKey(targetDateKey);
  const startDate = parseDateKey(rule.startDate);
  const endDate = parseDateKey(rule.endDate);
  if (!targetDate || !startDate) return false;
  if (targetDate.getTime() < startDate.getTime()) return false;
  if (endDate && targetDate.getTime() > endDate.getTime()) return false;

  switch (rule.frequency) {
    case 'daily':
      return matchesDailyRule(rule, targetDate, startDate);
    case 'weekly':
      return matchesWeeklyRule(rule, targetDate, startDate);
    case 'monthly':
      return matchesMonthlyRule(rule, targetDate, startDate);
    default:
      return false;
  }
};

const buildInProgressLookup = (logs: Log[]): Map<string, Set<string>> => {
  const lookup = new Map<string, Set<string>>();

  logs.forEach((log) => {
    if (!log.linkedTodoId) return;
    const dateKey = formatDateKey(new Date(log.startTime));
    const current = lookup.get(log.linkedTodoId) || new Set<string>();
    current.add(dateKey);
    lookup.set(log.linkedTodoId, current);
  });

  return lookup;
};

const normalizeTodoDateBadges = (badges: TodoDateBadges): TodoDateBadges => {
  const normalized = { ...badges };

  if (normalized.deadline) {
    normalized.scheduled = false;
  }

  if (normalized.completed) {
    normalized.inProgress = false;
  }

  return normalized;
};

export const getTodoDateBadges = (
  todo: TodoItem,
  targetDateKey: string,
  inProgressLookup?: Map<string, Set<string>>
): TodoDateBadges => normalizeTodoDateBadges({
  scheduled: todo.scheduledDate === targetDateKey,
  deadline: todo.deadlineDate === targetDateKey,
  recurring: matchesRecurrenceRule(todo.recurrenceRule, targetDateKey),
  completed: todo.completedAt ? formatDateKey(new Date(todo.completedAt)) === targetDateKey : false,
  inProgress: inProgressLookup?.get(todo.id)?.has(targetDateKey) || false
});

export const getTodoScheduleMatches = (
  todo: TodoItem,
  range: TodoScheduleRange,
  referenceDate: Date = new Date()
): TodoScheduleMatch[] => {
  const dateKeys = getTodoScheduleRangeDateKeys(range, referenceDate);

  return dateKeys.flatMap((dateKey) => {
    const badges = getTodoDateBadges(todo, dateKey);
    const matches: TodoScheduleMatch[] = [];

    if (badges.deadline) {
      matches.push({ dateKey, kind: 'deadline' });
    }

    if (badges.scheduled) {
      matches.push({ dateKey, kind: 'scheduled' });
    }

    if (badges.recurring) {
      matches.push({ dateKey, kind: 'recurring' });
    }

    return matches;
  }).sort((left, right) => {
    if (left.dateKey !== right.dateKey) {
      return left.dateKey.localeCompare(right.dateKey);
    }

    return TODO_SCHEDULE_MATCH_PRIORITY[left.kind] - TODO_SCHEDULE_MATCH_PRIORITY[right.kind];
  });
};

const getTodoEntryPriority = (badges: TodoDateBadges): number => {
  if (badges.deadline) return 0;
  if (badges.scheduled) return 1;
  if (badges.recurring) return 2;
  if (badges.completed) return 3;
  if (badges.inProgress) return 4;
  return 6;
};

export const getPrimaryTodoScheduleEntryKind = (badges: TodoDateBadges): TodoScheduleEntryKind => {
  if (badges.deadline) return 'deadline';
  if (badges.scheduled) return 'scheduled';
  if (badges.recurring) return 'recurring';
  if (badges.completed) return 'completed';
  return 'inProgress';
};

const buildTodoDateEntriesWithLookup = (
  todos: TodoItem[],
  targetDateKey: string,
  inProgressLookup?: Map<string, Set<string>>
): TodoDateEntry[] => todos
  .map((todo) => {
    const badges = getTodoDateBadges(todo, targetDateKey, inProgressLookup);

    if (!badges.scheduled && !badges.deadline && !badges.recurring && !badges.completed && !badges.inProgress) {
      return null;
    }

    return {
      todo,
      badges,
      primaryKind: getPrimaryTodoScheduleEntryKind(badges)
    } satisfies TodoDateEntry;
  })
  .filter((entry): entry is TodoDateEntry => entry !== null)
  .sort((left, right) => {
    const priorityDiff = getTodoEntryPriority(left.badges) - getTodoEntryPriority(right.badges);
    if (priorityDiff !== 0) return priorityDiff;
    return left.todo.title.localeCompare(right.todo.title, 'zh-CN');
  });

export const buildTodoDateEntries = (
  todos: TodoItem[],
  logs: Log[],
  targetDateKey: string
): TodoDateEntry[] => {
  const inProgressLookup = buildInProgressLookup(logs);
  return buildTodoDateEntriesWithLookup(todos, targetDateKey, inProgressLookup);
};

export const buildTodoDateEntryMap = (
  todos: TodoItem[],
  logs: Log[],
  targetDateKeys: string[]
): Record<string, TodoDateEntry[]> => {
  const inProgressLookup = buildInProgressLookup(logs);
  const uniqueDateKeys = Array.from(new Set(targetDateKeys));

  return uniqueDateKeys.reduce<Record<string, TodoDateEntry[]>>((accumulator, dateKey) => {
    accumulator[dateKey] = buildTodoDateEntriesWithLookup(todos, dateKey, inProgressLookup);
    return accumulator;
  }, {});
};

export const buildWeekTodoBuckets = (todos: TodoItem[], logs: Log[], referenceDate: Date): WeekDayBucket[] => {
  const weekDates = getWeekDates(referenceDate);
  const weekDateKeys = weekDates.map((date) => formatDateKey(date));
  const entriesByDate = buildTodoDateEntryMap(todos, logs, weekDateKeys);

  return weekDates.map((date) => {
    const dateKey = formatDateKey(date);
    const items = (entriesByDate[dateKey] || []).map(({ todo, badges }) => ({ todo, badges }));

    return {
      date: dateKey,
      items
    };
  });
};
