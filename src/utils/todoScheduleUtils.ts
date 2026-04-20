/**
 * @file todoScheduleUtils.ts
 * @input Todo items with optional schedule fields, reference dates
 * @output Week buckets and schedule badge metadata for the todo week view
 * @pos Utility (Todo planning)
 * @description Shared helpers for deriving scheduled, deadline, and recurring todo visibility without creating standalone occurrence records.
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

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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

export const getTodoDateBadges = (
  todo: TodoItem,
  targetDateKey: string,
  inProgressLookup?: Map<string, Set<string>>
): TodoDateBadges => ({
  scheduled: todo.scheduledDate === targetDateKey,
  deadline: todo.deadlineDate === targetDateKey,
  recurring: matchesRecurrenceRule(todo.recurrenceRule, targetDateKey),
  completed: todo.completedAt ? formatDateKey(new Date(todo.completedAt)) === targetDateKey : false,
  inProgress: inProgressLookup?.get(todo.id)?.has(targetDateKey) || false
});

const getWeekEntryPriority = (badges: TodoDateBadges): number => {
  if (badges.deadline) return 0;
  if (badges.scheduled) return 1;
  if (badges.recurring) return 2;
  if (badges.completed) return 3;
  if (badges.inProgress) return 4;
  return 6;
};

export const buildWeekTodoBuckets = (todos: TodoItem[], logs: Log[], referenceDate: Date): WeekDayBucket[] => {
  const inProgressLookup = buildInProgressLookup(logs);

  return getWeekDates(referenceDate).map((date) => {
    const dateKey = formatDateKey(date);
    const items = todos
      .map((todo) => ({
        todo,
        badges: getTodoDateBadges(todo, dateKey, inProgressLookup)
      }))
      .filter(({ badges }) => badges.scheduled || badges.deadline || badges.recurring || badges.completed || badges.inProgress)
      .sort((a, b) => {
        const priorityDiff = getWeekEntryPriority(a.badges) - getWeekEntryPriority(b.badges);
        if (priorityDiff !== 0) return priorityDiff;
        return a.todo.title.localeCompare(b.todo.title, 'zh-CN');
      });

    return {
      date: dateKey,
      items
    };
  });
};
