/**
 * @file todoRecurringPlanUtils.ts
 * @input Todo items, timeline logs, and local reference dates
 * @output Normalized recurring Plan configs, occurrence windows, generated Plan logs, and deletion-lock checks
 * @pos Utility (Todo planning)
 * @description Centralizes the Repeat todo auto-Plan rules so details, startup checks, and timeline actions share one behavior.
 * @updated 2026-07-31: Added a shared manual timeline Plan log builder so drag-created and AI-created Plan blocks use the same persisted shape.
 * @updated 2026-07-30: Added the first recurring auto-Plan helper set for finite occurrence materialization and lock-aware deletion.
 */
import { Log, TodoItem, TodoRecurringPlanConfig } from '../types';
import { formatDateKey, matchesRecurrenceRule, parseDateKey } from './todoScheduleUtils';

export const TIMELINE_PLAN_CATEGORY_ID = '__timeline_plan__';
export const TIMELINE_PLAN_ACTIVITY_ID = '__timeline_plan__';
export const RECURRING_PLAN_SOURCE = 'recurrence-auto' as const;
export const DEFAULT_RECURRING_PLAN_START_MINUTES = 9 * 60;
export const DEFAULT_RECURRING_PLAN_END_MINUTES = 10 * 60;
export const DEFAULT_RECURRING_PLAN_HORIZON_COUNT = 3;
export const MIN_RECURRING_PLAN_HORIZON_COUNT = 1;
export const MAX_RECURRING_PLAN_HORIZON_COUNT = 30;

const DAY_MINUTES = 24 * 60;
const LAST_CLOCK_MINUTE = DAY_MINUTES - 1;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RECURRING_PLAN_DURATION_MINUTES = DEFAULT_RECURRING_PLAN_END_MINUTES - DEFAULT_RECURRING_PLAN_START_MINUTES;

const clampInteger = (value: number, min: number, max: number): number => (
  Math.min(max, Math.max(min, Math.round(value)))
);

export const normalizeClockMinutes = (value: unknown, fallback: number): number => {
  const minutes = typeof value === 'number' && Number.isFinite(value)
    ? Math.round(value)
    : fallback;

  return clampInteger(minutes, 0, LAST_CLOCK_MINUTE);
};

export const normalizeRecurringPlanHorizonCount = (value: unknown): number => {
  const parsed = typeof value === 'number' && Number.isFinite(value)
    ? value
    : Number(value);

  return clampInteger(
    Number.isFinite(parsed) ? parsed : DEFAULT_RECURRING_PLAN_HORIZON_COUNT,
    MIN_RECURRING_PLAN_HORIZON_COUNT,
    MAX_RECURRING_PLAN_HORIZON_COUNT
  );
};

export const normalizeTodoRecurringPlanConfig = (
  config?: TodoRecurringPlanConfig
): TodoRecurringPlanConfig | undefined => {
  if (!config) {
    return undefined;
  }

  const startMinutes = Math.min(
    normalizeClockMinutes(config.startMinutes, DEFAULT_RECURRING_PLAN_START_MINUTES),
    LAST_CLOCK_MINUTE - 1
  );
  const rawEndMinutes = normalizeClockMinutes(config.endMinutes, DEFAULT_RECURRING_PLAN_END_MINUTES);
  const endMinutes = rawEndMinutes > startMinutes
    ? rawEndMinutes
    : Math.min(LAST_CLOCK_MINUTE, startMinutes + DEFAULT_RECURRING_PLAN_DURATION_MINUTES);

  return {
    enabled: config.enabled === true,
    startMinutes,
    endMinutes,
    horizonCount: normalizeRecurringPlanHorizonCount(config.horizonCount)
  };
};

export const formatClockMinutes = (minutes: number): string => {
  const normalized = normalizeClockMinutes(minutes, 0);
  const hours = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

export const parseClockMinutes = (value: string): number | null => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
};

interface BuildTimelinePlannedLogOptions {
  idFactory?: () => string;
  title?: string;
  note?: string;
  planSource?: Log['planSource'];
  plannedOccurrenceDate?: string;
}

export const buildTimelinePlannedLog = (
  todo: TodoItem,
  startTime: number,
  endTime: number,
  options: BuildTimelinePlannedLogOptions = {}
): Log | null => {
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    return null;
  }

  const note = options.note?.trim();

  return {
    id: (options.idFactory || (() => crypto.randomUUID()))(),
    categoryId: TIMELINE_PLAN_CATEGORY_ID,
    activityId: TIMELINE_PLAN_ACTIVITY_ID,
    startTime,
    endTime,
    duration: Math.max(0, Math.round((endTime - startTime) / 1000)),
    title: options.title || `计划 · ${todo.title}`,
    linkedTodoId: todo.id,
    isPlanned: true,
    ...(note ? { note } : {}),
    ...(options.planSource ? { planSource: options.planSource } : {}),
    ...(options.plannedOccurrenceDate ? { plannedOccurrenceDate: options.plannedOccurrenceDate } : {})
  };
};

const buildTimestampOnDate = (dateKey: string, minutes: number): number | null => {
  const date = parseDateKey(dateKey);
  if (!date) {
    return null;
  }

  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date.getTime();
};

const getDayDiff = (start: Date, end: Date): number => (
  Math.floor((end.getTime() - start.getTime()) / ONE_DAY_MS)
);

const getRecurringPlanLogDateKey = (log: Log): string => (
  log.plannedOccurrenceDate || formatDateKey(new Date(log.startTime))
);

export const isRecurringAutoPlanLog = (log: Log): boolean => (
  log.isPlanned === true && log.planSource === RECURRING_PLAN_SOURCE
);

export const hasPlanForTodoOnDate = (logs: Log[], todoId: string, dateKey: string): boolean => (
  logs.some((log) => (
    log.isPlanned === true &&
    log.linkedTodoId === todoId &&
    getRecurringPlanLogDateKey(log) === dateKey
  ))
);

export const isTodoRecurringPlanEnabled = (todo?: TodoItem | null): boolean => {
  if (!todo || todo.isCompleted || todo.parentTodoId || todo.kind === 'quick' || !todo.recurrenceRule) {
    return false;
  }

  return normalizeTodoRecurringPlanConfig(todo.recurringPlan)?.enabled === true;
};

export const isAutoRecurringPlanDeleteLocked = (
  log: Log,
  linkedTodo?: TodoItem | null
): boolean => (
  isRecurringAutoPlanLog(log) && isTodoRecurringPlanEnabled(linkedTodo)
);

export const getRecurringPlanOccurrenceDateKeys = (
  todo: TodoItem,
  referenceDate: Date = new Date()
): string[] => {
  const config = normalizeTodoRecurringPlanConfig(todo.recurringPlan);
  const recurrenceRule = todo.recurrenceRule;

  if (!config?.enabled || !recurrenceRule || todo.isCompleted || todo.parentTodoId || todo.kind === 'quick') {
    return [];
  }

  const recurrenceStartDate = parseDateKey(recurrenceRule.startDate);
  if (!recurrenceStartDate) {
    return [];
  }

  const normalizedReference = parseDateKey(formatDateKey(referenceDate));
  if (!normalizedReference) {
    return [];
  }

  const cursor = recurrenceStartDate.getTime() > normalizedReference.getTime()
    ? new Date(recurrenceStartDate)
    : new Date(normalizedReference);
  const recurrenceEndDate = parseDateKey(recurrenceRule.endDate);
  const maxIterations = recurrenceEndDate
    ? Math.max(0, getDayDiff(cursor, recurrenceEndDate) + 1)
    : 3660;
  const dateKeys: string[] = [];

  for (let index = 0; index < maxIterations && dateKeys.length < config.horizonCount; index += 1) {
    const dateKey = formatDateKey(cursor);
    if (matchesRecurrenceRule(recurrenceRule, dateKey)) {
      dateKeys.push(dateKey);
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return dateKeys;
};

export const buildRecurringPlanLog = (
  todo: TodoItem,
  dateKey: string,
  idFactory: () => string = () => crypto.randomUUID()
): Log | null => {
  const config = normalizeTodoRecurringPlanConfig(todo.recurringPlan);
  if (!config?.enabled) {
    return null;
  }

  const startTime = buildTimestampOnDate(dateKey, config.startMinutes);
  const endTime = buildTimestampOnDate(dateKey, config.endMinutes);
  if (startTime === null || endTime === null || endTime <= startTime) {
    return null;
  }

  return buildTimelinePlannedLog(todo, startTime, endTime, {
    idFactory,
    title: `Plan · ${todo.title}`,
    planSource: RECURRING_PLAN_SOURCE,
    plannedOccurrenceDate: dateKey
  });
};

export const buildRecurringPlanInsertions = (
  todos: TodoItem[],
  logs: Log[],
  options?: {
    referenceDate?: Date;
    idFactory?: () => string;
  }
): Log[] => {
  const referenceDate = options?.referenceDate || new Date();
  const idFactory = options?.idFactory;
  const accumulatedLogs = [...logs];
  const insertions: Log[] = [];

  todos.forEach((todo) => {
    getRecurringPlanOccurrenceDateKeys(todo, referenceDate).forEach((dateKey) => {
      if (hasPlanForTodoOnDate(accumulatedLogs, todo.id, dateKey)) {
        return;
      }

      const log = buildRecurringPlanLog(todo, dateKey, idFactory);
      if (!log) {
        return;
      }

      accumulatedLogs.push(log);
      insertions.push(log);
    });
  });

  return insertions;
};

export const buildRecurringPlanTodoSignature = (todos: TodoItem[]): string => JSON.stringify(
  todos
    .map((todo) => ({
      id: todo.id,
      isCompleted: todo.isCompleted,
      kind: todo.kind || 'project',
      parentTodoId: todo.parentTodoId || '',
      recurrenceRule: todo.recurrenceRule || null,
      recurringPlan: normalizeTodoRecurringPlanConfig(todo.recurringPlan) || null
    }))
    .sort((left, right) => left.id.localeCompare(right.id))
);
