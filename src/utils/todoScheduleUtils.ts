/**
 * @file todoScheduleUtils.ts
 * @input Todo items with optional schedule fields, reference dates
 * @output Week buckets, daily schedule entries, and badge metadata for todo planning views
 * @pos Utility (Todo planning)
 * @description Shared helpers for deriving scheduled, deadline, recurring, maybe, completed, and in-progress todo visibility without creating standalone occurrence records.
 * @updated 2026-05-18: Prevented today-category pin views from surfacing recurring todos whose current-day occurrence is explicitly suppressed by `skipDates`, while still allowing true pin-only todos and other explicit today matches through.
 * @updated 2026-05-17: Reordered shared month-entry priority so completed rows win over due/arrange/repeat/maybe/trace when one todo matches multiple day badges, while keeping the continuous trace lane layout unchanged.
 * @updated 2026-05-14: Updated `TodoDateEntry` and `WeekTodoEntry` to include an optional `dateKey`, enabling drag-and-drop logic to identify which specific occurrence is being moved in multi-date `Maybe` schedules.

 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { Log, TodoItem, TodoRecurrenceRule } from '../types';

export interface TodoDateBadges {
  scheduled: boolean;
  deadline: boolean;
  recurring: boolean;
  maybe: boolean;
  completed: boolean;
  inProgress: boolean;
}

export interface WeekTodoEntry {
  todo: TodoItem;
  badges: TodoDateBadges;
  parentTitle?: string;
  dateKey?: string;
}

export interface WeekDayBucket {
  date: string;
  items: WeekTodoEntry[];
}

export type TodoScheduleMatchKind = 'deadline' | 'scheduled' | 'recurring' | 'maybe';
export type TodoScheduleRange = 'today' | 'tomorrow' | 'thisWeek';
export type TodoScheduleEntryKind = 'deadline' | 'scheduled' | 'recurring' | 'maybe' | 'completed' | 'inProgress';

export interface TodoScheduleMatch {
  dateKey: string;
  kind: TodoScheduleMatchKind;
}

export interface TodoDateEntry {
  todo: TodoItem;
  badges: TodoDateBadges;
  primaryKind: TodoScheduleEntryKind;
  dateKey?: string;
}

export interface TodoWeekTraceSegment {
  todoId: string;
  entry: TodoDateEntry;
  laneIndex: number;
  startDayIndex: number;
  endDayIndex: number;
  dateKeys: string[];
}

export interface TodoMonthWeekLayout {
  rowEntriesByDate: Record<string, Array<TodoDateEntry | null>>;
  sortedEntriesByDate: Record<string, TodoDateEntry[]>;
  traceSegments: TodoWeekTraceSegment[];
  visibleRowCount: number;
  hiddenCountByDate: Record<string, number>;
}

export const TODO_ASSOCIATION_TODAY_CATEGORY_ID = '__todo_association_today__';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const TODO_RECURRENCE_WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'] as const;
const TODO_SCHEDULE_MATCH_PRIORITY: Record<TodoScheduleMatchKind, number> = {
  deadline: 0,
  scheduled: 1,
  recurring: 2,
  maybe: 3
};
const TODO_SCHEDULE_ENTRY_PRIORITY: Record<TodoScheduleEntryKind, number> = {
  completed: 0,
  deadline: 1,
  scheduled: 2,
  recurring: 3,
  maybe: 4,
  inProgress: 5
};

const normalizeDate = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const normalizeMonthlyDayInput = (value: string): string => {
  const sanitized = value.replace(/[^\d]+/g, ' ');
  const hasTrailingSpace = /\s$/.test(sanitized);
  const compact = sanitized
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');

  if (!compact) {
    return '';
  }

  return hasTrailingSpace ? `${compact} ` : compact;
};

export const parseMonthlyDayInput = (value: string): number[] => {
  if (!value.trim()) {
    return [];
  }

  const monthDays = value
    .trim()
    .split(/\s+/)
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 1 && item <= 31);

  return Array.from(new Set(monthDays)).sort((left, right) => left - right);
};

export const formatMonthlyDayInput = (monthDays?: number[], fallbackDay?: number): string => {
  const normalizedDays = Array.isArray(monthDays) && monthDays.length > 0
    ? Array.from(new Set(monthDays
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item >= 1 && item <= 31)))
      .sort((left, right) => left - right)
    : (Number.isInteger(fallbackDay) && fallbackDay! >= 1 && fallbackDay! <= 31 ? [fallbackDay!] : []);

  return normalizedDays.join(' ');
};

export const formatTodoRecurrenceSummary = (rule?: TodoRecurrenceRule): string | null => {
  if (!rule) {
    return null;
  }

  const interval = Math.max(1, rule.interval || 1);
  const prefix = rule.frequency === 'daily'
    ? (interval > 1 ? `每${interval}天` : '每天')
    : rule.frequency === 'weekly'
      ? (interval > 1 ? `每${interval}周` : '每周')
      : (interval > 1 ? `每${interval}月` : '每月');

  if (rule.frequency === 'daily') {
    return prefix;
  }

  const startDate = parseDateKey(rule.startDate);

  if (rule.frequency === 'weekly') {
    const weekdays = (rule.weekdays?.length ? rule.weekdays : (startDate ? [startDate.getDay()] : []))
      .filter((weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6);
    const weekdaySummary = Array.from(new Set(weekdays))
      .sort((left, right) => left - right)
      .map((weekday) => TODO_RECURRENCE_WEEKDAY_LABELS[weekday])
      .join('');

    return weekdaySummary ? `${prefix}${weekdaySummary}` : prefix;
  }

  const fallbackDay = startDate?.getDate();
  const monthDaySummary = formatMonthlyDayInput(rule.monthDays, fallbackDay)
    .split(' ')
    .filter(Boolean)
    .join(',');

  return monthDaySummary ? `${prefix} ${monthDaySummary}` : prefix;
};

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

export const normalizeMaybeDates = (
  maybeDates?: string[],
  referenceDate: Date = new Date()
): string[] | undefined => {
  if (!Array.isArray(maybeDates) || maybeDates.length === 0) {
    return undefined;
  }

  const todayDateKey = formatDateKey(referenceDate);
  const normalized = Array.from(new Set(
    maybeDates
      .map((dateKey) => dateKey.trim())
      .filter((dateKey) => Boolean(parseDateKey(dateKey)))
      .filter((dateKey) => dateKey >= todayDateKey)
  )).sort((left, right) => left.localeCompare(right));

  return normalized.length > 0 ? normalized : undefined;
};

export const normalizeTodoMaybeDates = (
  todo: TodoItem,
  referenceDate: Date = new Date()
): TodoItem => {
  const normalizedMaybeDates = normalizeMaybeDates(todo.maybeDates, referenceDate);

  if (normalizedMaybeDates === todo.maybeDates) {
    return todo;
  }

  return {
    ...todo,
    maybeDates: normalizedMaybeDates
  };
};

export const normalizeSkipDates = (
  skipDates?: string[],
  referenceDate: Date = new Date()
): string[] | undefined => {
  if (!Array.isArray(skipDates) || skipDates.length === 0) {
    return undefined;
  }

  const todayDateKey = formatDateKey(referenceDate);
  const normalized = Array.from(new Set(
    skipDates
      .map((dateKey) => dateKey.trim())
      .filter((dateKey) => Boolean(parseDateKey(dateKey)))
      .filter((dateKey) => dateKey >= todayDateKey)
  )).sort((left, right) => left.localeCompare(right));

  return normalized.length > 0 ? normalized : undefined;
};

export const hasMaybeDate = (
  todo: TodoItem,
  targetDateKey: string,
  referenceDate: Date = new Date()
): boolean => Boolean(normalizeMaybeDates(todo.maybeDates, referenceDate)?.includes(targetDateKey));

const isSuppressedRecurringOccurrenceForDate = (
  todo: TodoItem,
  targetDateKey: string
): boolean => {
  const recurrenceRule = todo.recurrenceRule;

  if (!recurrenceRule?.skipDates?.includes(targetDateKey)) {
    return false;
  }

  return matchesRecurrenceRule({
    ...recurrenceRule,
    skipDates: []
  }, targetDateKey);
};

export const isTodoInAssociationTodayCategory = (
  todo: TodoItem,
  referenceDate: Date = new Date()
): boolean => {
  const todayDateKey = formatDateKey(referenceDate);
  const hasExplicitTodayMatch = todo.scheduledDate === todayDateKey
    || todo.deadlineDate === todayDateKey
    || hasMaybeDate(todo, todayDateKey, referenceDate);
  const hasRecurringMatch = matchesRecurrenceRule(todo.recurrenceRule, todayDateKey);

  if (!hasExplicitTodayMatch && !hasRecurringMatch && isSuppressedRecurringOccurrenceForDate(todo, todayDateKey)) {
    return false;
  }

  return Boolean(todo.pin)
    || hasExplicitTodayMatch
    || hasRecurringMatch;
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

const getLastDayOfMonth = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

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
  const matchDays = rule.fallbackToMonthEnd
    ? monthDays.map((monthDay) => (
      monthDay === 31
        ? Math.min(monthDay, getLastDayOfMonth(targetDate))
        : monthDay
    ))
    : monthDays;
  return matchDays.includes(targetDate.getDate());
};

export const matchesRecurrenceRule = (rule: TodoRecurrenceRule | undefined, targetDateKey: string): boolean => {
  if (!rule) return false;

  const targetDate = parseDateKey(targetDateKey);
  const startDate = parseDateKey(rule.startDate);
  const endDate = parseDateKey(rule.endDate);
  if (!targetDate || !startDate) return false;
  if (targetDate.getTime() < startDate.getTime()) return false;
  if (endDate && targetDate.getTime() > endDate.getTime()) return false;
  if (rule.skipDates?.includes(targetDateKey)) return false;

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

export const getNextRecurrenceOccurrenceDateKey = (
  rule: TodoRecurrenceRule | undefined,
  referenceDate: Date = new Date()
): string | null => {
  if (!rule) {
    return null;
  }

  const startDate = parseDateKey(rule.startDate);
  if (!startDate) {
    return null;
  }

  const normalizedReference = normalizeDate(referenceDate);
  const cursor = startDate.getTime() > normalizedReference.getTime()
    ? new Date(startDate)
    : new Date(normalizedReference);
  const endDate = parseDateKey(rule.endDate);
  const maxIterations = endDate
    ? Math.max(0, Math.floor((endDate.getTime() - cursor.getTime()) / ONE_DAY_MS) + 1)
    : 3660;

  for (let index = 0; index < maxIterations; index += 1) {
    const dateKey = formatDateKey(cursor);
    if (matchesRecurrenceRule(rule, dateKey)) {
      return dateKey;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return null;
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
  maybe: hasMaybeDate(todo, targetDateKey),
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

    if (badges.maybe) {
      matches.push({ dateKey, kind: 'maybe' });
    }

    return matches;
  }).sort((left, right) => {
    if (left.dateKey !== right.dateKey) {
      return left.dateKey.localeCompare(right.dateKey);
    }

    return TODO_SCHEDULE_MATCH_PRIORITY[left.kind] - TODO_SCHEDULE_MATCH_PRIORITY[right.kind];
  });
};

export const getPrimaryTodoScheduleEntryKind = (badges: TodoDateBadges): TodoScheduleEntryKind => {
  if (badges.completed) return 'completed';
  if (badges.deadline) return 'deadline';
  if (badges.scheduled) return 'scheduled';
  if (badges.recurring) return 'recurring';
  if (badges.maybe) return 'maybe';
  return 'inProgress';
};

const getTodoEntryPriority = (badges: TodoDateBadges): number =>
  TODO_SCHEDULE_ENTRY_PRIORITY[getPrimaryTodoScheduleEntryKind(badges)];

const isTraceEntry = (entry: TodoDateEntry | null | undefined): entry is TodoDateEntry =>
  Boolean(entry) && entry.primaryKind === 'inProgress';

interface TodoWeekTraceDayPoint {
  dayIndex: number;
  dateKey: string;
  entry: TodoDateEntry;
  originalIndex: number;
}

interface TodoWeekTraceSegmentDraft {
  todoId: string;
  entry: TodoDateEntry;
  startDayIndex: number;
  endDayIndex: number;
  dateKeys: string[];
  preferredRow: number;
  spanLength: number;
}

const getMedianNumber = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor((sorted.length - 1) / 2)] ?? 0;
};

const buildTodoWeekTraceSegmentDrafts = (
  weekDateKeys: string[],
  entriesByDate: Record<string, TodoDateEntry[]>
): TodoWeekTraceSegmentDraft[] => {
  const tracePointsByTodo = new Map<string, TodoWeekTraceDayPoint[]>();

  weekDateKeys.forEach((dateKey, dayIndex) => {
    (entriesByDate[dateKey] || []).forEach((entry, originalIndex) => {
      if (!isTraceEntry(entry)) {
        return;
      }

      const current = tracePointsByTodo.get(entry.todo.id) || [];
      current.push({
        dayIndex,
        dateKey,
        entry,
        originalIndex
      });
      tracePointsByTodo.set(entry.todo.id, current);
    });
  });

  const segments: TodoWeekTraceSegmentDraft[] = [];

  tracePointsByTodo.forEach((points, todoId) => {
    const sortedPoints = [...points].sort((left, right) => left.dayIndex - right.dayIndex);
    let run: TodoWeekTraceDayPoint[] = [];

    const flushRun = () => {
      if (run.length === 0) {
        return;
      }

      segments.push({
        todoId,
        entry: run[0].entry,
        startDayIndex: run[0].dayIndex,
        endDayIndex: run[run.length - 1].dayIndex,
        dateKeys: run.map((point) => point.dateKey),
        preferredRow: getMedianNumber(run.map((point) => point.originalIndex)),
        spanLength: run.length
      });
      run = [];
    };

    sortedPoints.forEach((point, index) => {
      if (index === 0) {
        run = [point];
        return;
      }

      const previousPoint = sortedPoints[index - 1];
      if (point.dayIndex === previousPoint.dayIndex + 1) {
        run.push(point);
        return;
      }

      flushRun();
      run = [point];
    });

    flushRun();
  });

  return segments;
};

const assignTodoWeekTraceSegmentLanes = (
  segmentDrafts: TodoWeekTraceSegmentDraft[],
  weekLength: number
): TodoWeekTraceSegment[] => {
  const occupiedLanesByDay = Array.from({ length: weekLength }, () => new Set<number>());
  const sortedDrafts = [...segmentDrafts].sort((left, right) => {
    if (left.spanLength !== right.spanLength) {
      return right.spanLength - left.spanLength;
    }

    if (left.startDayIndex !== right.startDayIndex) {
      return left.startDayIndex - right.startDayIndex;
    }

    if (left.preferredRow !== right.preferredRow) {
      return left.preferredRow - right.preferredRow;
    }

    return left.todoId.localeCompare(right.todoId, 'zh-CN');
  });

  return sortedDrafts
    .map((draft) => {
      let laneIndex = 0;

      while (
        Array.from(
          { length: draft.endDayIndex - draft.startDayIndex + 1 },
          (_, offset) => draft.startDayIndex + offset
        ).some((dayIndex) => occupiedLanesByDay[dayIndex]?.has(laneIndex))
      ) {
        laneIndex += 1;
      }

      for (let dayIndex = draft.startDayIndex; dayIndex <= draft.endDayIndex; dayIndex += 1) {
        occupiedLanesByDay[dayIndex]?.add(laneIndex);
      }

      return {
        todoId: draft.todoId,
        entry: draft.entry,
        laneIndex,
        startDayIndex: draft.startDayIndex,
        endDayIndex: draft.endDayIndex,
        dateKeys: draft.dateKeys
      } satisfies TodoWeekTraceSegment;
    })
    .sort((left, right) => {
      if (left.laneIndex !== right.laneIndex) {
        return left.laneIndex - right.laneIndex;
      }

      if (left.startDayIndex !== right.startDayIndex) {
        return left.startDayIndex - right.startDayIndex;
      }

      return left.todoId.localeCompare(right.todoId, 'zh-CN');
    });
};

const buildTodoDateEntriesWithLookup = (
  todos: TodoItem[],
  targetDateKey: string,
  inProgressLookup?: Map<string, Set<string>>
): TodoDateEntry[] => todos
  .map((todo) => {
    const badges = getTodoDateBadges(todo, targetDateKey, inProgressLookup);

    if (!badges.scheduled && !badges.deadline && !badges.recurring && !badges.maybe && !badges.completed && !badges.inProgress) {
      return null;
    }

    return {
      todo,
      badges,
      primaryKind: getPrimaryTodoScheduleEntryKind(badges),
      dateKey: targetDateKey
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

export const buildTodoMonthWeekLayout = (
  weekDateKeys: string[],
  entriesByDate: Record<string, TodoDateEntry[]>,
  visibleEntryCount: number,
  options?: { includeTraceSegments?: boolean }
): TodoMonthWeekLayout => {
  const shouldIncludeTraceSegments = options?.includeTraceSegments ?? true;
  const segmentDrafts = shouldIncludeTraceSegments
    ? buildTodoWeekTraceSegmentDrafts(weekDateKeys, entriesByDate)
    : [];
  const traceSegments = shouldIncludeTraceSegments
    ? assignTodoWeekTraceSegmentLanes(segmentDrafts, weekDateKeys.length)
    : [];
  const segmentLaneByDateAndTodo = new Map<string, number>();

  traceSegments.forEach((segment) => {
    segment.dateKeys.forEach((dateKey) => {
      segmentLaneByDateAndTodo.set(`${dateKey}::${segment.todoId}`, segment.laneIndex);
    });
  });

  let visibleRowCount = 0;
  const rowEntriesByDate = weekDateKeys.reduce<Record<string, Array<TodoDateEntry | null>>>((accumulator, dateKey) => {
    const originalEntries = entriesByDate[dateKey] || [];
    const rowEntries: Array<TodoDateEntry | null | undefined> = [];

    originalEntries.forEach((entry) => {
      if (!isTraceEntry(entry)) {
        return;
      }

      const laneIndex = segmentLaneByDateAndTodo.get(`${dateKey}::${entry.todo.id}`);
      if (laneIndex === undefined) {
        return;
      }

      rowEntries[laneIndex] = entry;
    });

    let nextOpenRowIndex = 0;
    originalEntries.forEach((entry) => {
      if (isTraceEntry(entry)) {
        return;
      }

      while (rowEntries[nextOpenRowIndex] !== undefined) {
        nextOpenRowIndex += 1;
      }

      rowEntries[nextOpenRowIndex] = entry;
      nextOpenRowIndex += 1;
    });

    const normalizedRows = Array.from({ length: rowEntries.length }, (_, index) => rowEntries[index] ?? null);
    visibleRowCount = Math.max(visibleRowCount, normalizedRows.length);
    accumulator[dateKey] = normalizedRows;
    return accumulator;
  }, {});

  const sortedEntriesByDate = weekDateKeys.reduce<Record<string, TodoDateEntry[]>>((accumulator, dateKey) => {
    accumulator[dateKey] = (rowEntriesByDate[dateKey] || []).filter((entry): entry is TodoDateEntry => entry !== null);
    return accumulator;
  }, {});

  const hiddenCountByDate = weekDateKeys.reduce<Record<string, number>>((accumulator, dateKey) => {
    accumulator[dateKey] = Math.max(
      0,
      (rowEntriesByDate[dateKey] || []).slice(visibleEntryCount).filter((entry) => entry !== null).length
    );
    return accumulator;
  }, {});

  return {
    rowEntriesByDate,
    sortedEntriesByDate,
    traceSegments,
    visibleRowCount,
    hiddenCountByDate
  };
};

export const buildWeekTodoBuckets = (todos: TodoItem[], logs: Log[], referenceDate: Date): WeekDayBucket[] => {
  const weekDates = getWeekDates(referenceDate);
  const weekDateKeys = weekDates.map((date) => formatDateKey(date));
  const entriesByDate = buildTodoDateEntryMap(todos, logs, weekDateKeys);
  const todoMap = new Map(todos.map((todo) => [todo.id, todo]));

  return weekDates.map((date) => {
    const dateKey = formatDateKey(date);
    const items = (entriesByDate[dateKey] || []).map(({ todo, badges }) => {
      const parentTodo = todo.parentTodoId ? todoMap.get(todo.parentTodoId) : null;
      const parentTitle = parentTodo && !parentTodo.parentTodoId && parentTodo.id !== todo.id
        ? parentTodo.title
        : undefined;

      return {
        todo,
        badges,
        parentTitle,
        dateKey
      };
    });

    return {
      date: dateKey,
      items
    };
  });
};

export const formatWeekTodoLineTitle = (
  entry: Pick<WeekTodoEntry, 'todo' | 'parentTitle'>
): string => (
  entry.parentTitle ? `${entry.todo.title} @${entry.parentTitle}` : entry.todo.title
);
