/**
 * @file TodoMonthView.tsx
 * @input Todo items, logs, a reference date, and an optional todo-open callback
 * @output Reference-style rolling month schedule UI backed by real daily todo data
 * @pos Component (Todo scheduling)
 * @description Renders the editorial monthly schedule view adapted from the minimalist demo, using shared todo schedule utilities so each day shows the same real Arrange / Due / Repeat / Maybe / Done / Trace data as the week planner.
 * @updated 2026-05-14: Added a parent-controlled schedule lock toggle so the month planner can freeze drag-to-move interactions while keeping day opening and quick-edit actions available.
 * @updated 2026-05-17: Added a dashed outline border around "maybe" schedule items in the month view grid matching their type color.
 * @updated 2026-05-17: Added a strike-through (line-through) style to "completed" schedule items in both month view grid cells and expanded details.
 * @updated 2026-05-17: Wired up click handlers on monthly trace segments to trigger the quick actions sheet.
 
 * Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Diff, Flag, Repeat2, SlidersHorizontal, TrendingUp } from 'lucide-react';
import { createPortal } from 'react-dom';
import {
  addMonths,
  eachDayOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDate,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths
} from 'date-fns';
import { Category, Log, Scope, TodoCategory, TodoItem } from '../types';
import {
  buildTodoDateEntryMap,
  buildTodoMonthWeekLayout,
  formatDateKey,
  parseDateKey,
  TodoDateEntry,
  TodoMonthWeekLayout,
  TodoWeekTraceSegment
} from '../utils/todoScheduleUtils';
import { getParentTodo } from '../utils/todoHierarchyUtils';
import { getColorHexForCharts } from '../utils/colorAdapterUtils';
import { hexToRgba } from '../utils/colorUtils';
import { matchesTodoFilterExpression } from '../utils/filterUtils';
import { TodoScheduleTypeColorSettings as TodoScheduleTypeColorSettingsPanel } from './TodoScheduleTypeColorSettings';
import {
  getResolvedTodoScheduleTypeColors,
  todoScheduleColorService,
  type TodoScheduleTypeColorSettings
} from '../services/todoScheduleColorService';

interface TodoMonthViewProps {
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  activityCategories: Category[];
  scopes: Scope[];
  logs: Log[];
  referenceDate: Date;
  entryJumpSignal: number;
  onMoveScheduleEntry?: (entry: TodoDateEntry, targetDateKey: string) => void;
  onOpenDay?: (dateKey: string) => void;
  onOpenDatePicker?: () => void;
  useReducedEffects?: boolean;
  viewMenuNode: React.ReactNode;
  onOpenTodo?: (todo: TodoItem) => void;
  isScheduleLocked?: boolean;
  onToggleScheduleLock?: () => void;
}

interface TodoMonthWeek {
  id: string;
  monthKey: string;
  days: Date[];
}

interface LoadedMonthRange {
  startMonth: Date;
  endMonth: Date;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_VIEW_ROWS_PER_SCREEN_STORAGE_KEY = 'todoMonthViewRowsPerScreen';
const MONTH_VIEW_FONT_SIZE_STORAGE_KEY = 'todoMonthViewFontSize';
const MONTH_VIEW_MARKER_COLOR_MODE_STORAGE_KEY = 'todoMonthViewMarkerColorMode';
const MONTH_VIEW_HIDDEN_FILTER_EXPRESSION_STORAGE_KEY = 'todoMonthViewHiddenFilterExpression';
const MONTH_VIEW_HIDE_TRACE_TYPES_STORAGE_KEY = 'todoMonthViewHideTraceTypes';
const MONTH_VIEW_INITIAL_MONTHS_BEFORE = 2;
const MONTH_VIEW_INITIAL_MONTHS_AFTER = 2;
const MONTH_VIEW_LOAD_CHUNK_MONTHS = 2;
const MONTH_VIEW_EDGE_LOAD_THRESHOLD_PX = 280;
const MONTH_VIEW_PROGRAMMATIC_SCROLL_SETTLE_MS = 140;
const MONTH_VIEW_CALENDAR_SIDE_INSET_CLASS_NAME = 'px-px';
const MONTH_VIEW_CELL_VERTICAL_PADDING_PX = 6;
const MONTH_VIEW_DAY_NUMBER_ROW_HEIGHT_PX = 16;
const MONTH_VIEW_ENTRY_TOP_MARGIN_PX = 6;
const MONTH_VIEW_ENTRY_TOP_OFFSET_PX = MONTH_VIEW_CELL_VERTICAL_PADDING_PX + MONTH_VIEW_DAY_NUMBER_ROW_HEIGHT_PX + MONTH_VIEW_ENTRY_TOP_MARGIN_PX;
const MONTH_VIEW_ENTRY_ROW_GAP_PX = 2;
const TODO_DISPLAY_POPUP_MAX_HEIGHT = 'min(calc(100vh - 14rem - env(safe-area-inset-bottom)), 42rem)';
const MONTH_VIEW_ROW_OPTIONS = [2, 3, 4, 5] as const;
const MONTH_VIEW_FONT_SIZE_OPTIONS = [
  { key: 'small', label: '小' },
  { key: 'medium', label: '中' },
  { key: 'large', label: '大' }
] as const;
type MonthViewFontSizeKey = typeof MONTH_VIEW_FONT_SIZE_OPTIONS[number]['key'];
const MONTH_VIEW_MARKER_COLOR_OPTIONS = [
  { key: 'schedule', label: '按排期' },
  { key: 'category', label: '按分类' }
] as const;
type MonthViewMarkerColorMode = typeof MONTH_VIEW_MARKER_COLOR_OPTIONS[number]['key'];

const buildMonthLabelDate = (value: string): Date => {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, 1);
};

const getMonthKey = (date: Date): string => format(startOfMonth(date), 'yyyy-MM-01');

const createLoadedMonthRange = (
  centerMonth: Date,
  beforeCount = MONTH_VIEW_INITIAL_MONTHS_BEFORE,
  afterCount = MONTH_VIEW_INITIAL_MONTHS_AFTER
): LoadedMonthRange => ({
  startMonth: startOfMonth(subMonths(centerMonth, beforeCount)),
  endMonth: startOfMonth(addMonths(centerMonth, afterCount))
});

const buildWeeksForMonthRange = (range: LoadedMonthRange): TodoMonthWeek[] => {
  const start = startOfWeek(range.startMonth, { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(range.endMonth), { weekStartsOn: 1 });
  const weekIntervals = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });

  return weekIntervals.map((weekStart) => {
    const days = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(weekStart, { weekStartsOn: 1 })
    });

    return {
      id: weekStart.toISOString(),
      monthKey: format(startOfMonth(days[3]), 'yyyy-MM-01'),
      days
    };
  });
};

const isMonthWithinLoadedRange = (date: Date, range: LoadedMonthRange): boolean => {
  const monthTime = startOfMonth(date).getTime();
  return monthTime >= range.startMonth.getTime() && monthTime <= range.endMonth.getTime();
};

const isSameCalendarDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate();

const getMonthEntryLeadingIcon = (entry: TodoDateEntry): React.ReactNode => {
  const { badges } = entry;
  const iconClassName = 'text-stone-400';

  if (badges.completed) {
    return <CheckCircle2 size={12} className={iconClassName} />;
  }

  if (badges.inProgress) {
    return <TrendingUp size={12} className={iconClassName} />;
  }

  if (badges.deadline) {
    return <Flag size={12} className={iconClassName} />;
  }

  if (badges.recurring) {
    return <Repeat2 size={12} className={iconClassName} />;
  }

  if (badges.maybe) {
    return <Diff size={12} className={iconClassName} />;
  }

  return <ChevronRight size={12} className={iconClassName} />;
};

const MONTH_VIEW_ENTRY_TAGS: Array<{
  key: keyof TodoDateEntry['badges'];
  label: string;
  color: string;
  clickable: boolean;
}> = [
  { key: 'deadline', label: 'Due', color: '#8f6f6b', clickable: true },
  { key: 'scheduled', label: 'Arrange', color: '#7c8b97', clickable: true },
  { key: 'recurring', label: 'Repeat', color: '#8b8f79', clickable: false },
  { key: 'maybe', label: 'Maybe', color: '#a58863', clickable: true },
  { key: 'completed', label: 'Done', color: '#7f8c84', clickable: true },
  { key: 'inProgress', label: 'Trace', color: '#8b8096', clickable: true }
];

const getMonthEntryTagLabel = (
  tag: typeof MONTH_VIEW_ENTRY_TAGS[number],
  activeTagCount: number
): string => {
  if (activeTagCount <= 1) {
    return tag.label;
  }

  if (tag.key === 'deadline' || tag.key === 'completed') {
    return tag.label;
  }

  return tag.label.slice(0, 3);
};

export const TodoMonthView: React.FC<TodoMonthViewProps> = ({
  todos,
  todoCategories,
  activityCategories,
  scopes,
  logs,
  referenceDate,
  entryJumpSignal,
  onMoveScheduleEntry,
  onOpenDay,
  onOpenDatePicker,
  useReducedEffects = false,
  viewMenuNode,
  onOpenTodo,
  isScheduleLocked = false,
  onToggleScheduleLock
}) => {
  const today = useMemo(() => new Date(), []);
  const initialMonthRange = useMemo(
    () => createLoadedMonthRange(startOfMonth(today)),
    [today]
  );
  const todayDateKey = useMemo(() => formatDateKey(today), [today]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const observerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const monthAnchorRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const hasInitialScrollRef = useRef(false);
  const pendingMonthJumpRef = useRef<string | null>(null);
  const pendingReferenceDateKeyRef = useRef<string | null>(null);
  const pendingPrependMetricsRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const isExtendingRangeRef = useRef(false);
  const lastAppliedReferenceDateKeyRef = useRef<string | null>(null);
  const latestObservedMonthRef = useRef<string>(getMonthKey(today));
  const activeMonthFreezeTargetRef = useRef<string | null>(null);
  const activeMonthFreezeTimeoutRef = useRef<number | null>(null);
  const touchDragActivatedRef = useRef(false);
  const touchDraggingEntryRef = useRef<TodoDateEntry | null>(null);
  const touchDragTargetDateRef = useRef<string | null>(null);
  const touchDragPointRef = useRef<{ x: number; y: number; title: string } | null>(null);
  const touchDragFrameRef = useRef<number | null>(null);
  const touchAutoScrollFrameRef = useRef<number | null>(null);
  const touchAutoScrollSpeedRef = useRef(0);
  const desktopAutoScrollIntervalRef = useRef<number | null>(null);
  const [activeMonth, setActiveMonth] = useState<string>(() => format(startOfMonth(today), 'yyyy-MM-01'));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [loadedRange, setLoadedRange] = useState<LoadedMonthRange>(initialMonthRange);
  const [monthRowsPerScreen, setMonthRowsPerScreen] = useState<number>(() => {
    const saved = localStorage.getItem(MONTH_VIEW_ROWS_PER_SCREEN_STORAGE_KEY);
    const parsed = saved ? Number(saved) : NaN;
    return MONTH_VIEW_ROW_OPTIONS.includes(parsed as typeof MONTH_VIEW_ROW_OPTIONS[number]) ? parsed : 4;
  });
  const [monthFontSize, setMonthFontSize] = useState<MonthViewFontSizeKey>(() => {
    const saved = localStorage.getItem(MONTH_VIEW_FONT_SIZE_STORAGE_KEY);
    return MONTH_VIEW_FONT_SIZE_OPTIONS.some((option) => option.key === saved)
      ? (saved as MonthViewFontSizeKey)
      : 'medium';
  });
  const [monthMarkerColorMode, setMonthMarkerColorMode] = useState<MonthViewMarkerColorMode>(() => {
    const saved = localStorage.getItem(MONTH_VIEW_MARKER_COLOR_MODE_STORAGE_KEY);
    return MONTH_VIEW_MARKER_COLOR_OPTIONS.some((option) => option.key === saved)
      ? (saved as MonthViewMarkerColorMode)
      : 'schedule';
  });
  const [hiddenFilterExpression, setHiddenFilterExpression] = useState<string>(() => (
    localStorage.getItem(MONTH_VIEW_HIDDEN_FILTER_EXPRESSION_STORAGE_KEY) || ''
  ));
  const [hiddenFilterExpressionDraft, setHiddenFilterExpressionDraft] = useState<string>(() => (
    localStorage.getItem(MONTH_VIEW_HIDDEN_FILTER_EXPRESSION_STORAGE_KEY) || ''
  ));
  const [hideTraceTypes, setHideTraceTypes] = useState<boolean>(() => (
    localStorage.getItem(MONTH_VIEW_HIDE_TRACE_TYPES_STORAGE_KEY) === 'true'
  ));
  const [hideTraceTypesDraft, setHideTraceTypesDraft] = useState<boolean>(() => (
    localStorage.getItem(MONTH_VIEW_HIDE_TRACE_TYPES_STORAGE_KEY) === 'true'
  ));
  const [scheduleTypeColorSettings, setScheduleTypeColorSettings] = useState<TodoScheduleTypeColorSettings>(() => (
    todoScheduleColorService.getSettings()
  ));
  const [isDensityMenuOpen, setIsDensityMenuOpen] = useState(false);
  const [draggingTodoId, setDraggingTodoId] = useState<string | null>(null);
  const [draggingEntry, setDraggingEntry] = useState<TodoDateEntry | null>(null);
  const [dragTargetDate, setDragTargetDate] = useState<string | null>(null);
  const [touchDragPreview, setTouchDragPreview] = useState<{ x: number; y: number; title: string } | null>(null);
  const [isTouchDragging, setIsTouchDragging] = useState(false);

  const weeks = useMemo<TodoMonthWeek[]>(
    () => buildWeeksForMonthRange(loadedRange),
    [loadedRange]
  );

  const dateKeys = useMemo(
    () => weeks.flatMap((week) => week.days.map((day) => formatDateKey(day))),
    [weeks]
  );
  const rawEntriesByDate = useMemo(
    () => buildTodoDateEntryMap(todos, logs, dateKeys),
    [dateKeys, logs, todos]
  );
  const entriesByDate = useMemo(
    () => {
      const expression = hiddenFilterExpression.trim();

      if (!expression && !hideTraceTypes) {
        return rawEntriesByDate;
      }

      return Object.fromEntries(
        Object.entries(rawEntriesByDate).map(([dateKey, entries]) => ([
          dateKey,
          entries.filter((entry) => {
            if (hideTraceTypes && entry.primaryKind === 'inProgress') {
              return false;
            }

            return !matchesTodoFilterExpression(entry.todo, expression, {
              categories: activityCategories,
              scopes,
              todoCategories
            });
          })
        ]))
      );
    },
    [activityCategories, hiddenFilterExpression, hideTraceTypes, rawEntriesByDate, scopes, todoCategories]
  );

  const clearActiveMonthFreezeTimeout = () => {
    if (activeMonthFreezeTimeoutRef.current !== null) {
      window.clearTimeout(activeMonthFreezeTimeoutRef.current);
      activeMonthFreezeTimeoutRef.current = null;
    }
  };

  const finishActiveMonthFreeze = () => {
    const nextMonth = activeMonthFreezeTargetRef.current || latestObservedMonthRef.current;
    if (nextMonth) {
      latestObservedMonthRef.current = nextMonth;
      setActiveMonth((previous) => (previous === nextMonth ? previous : nextMonth));
    }
    activeMonthFreezeTargetRef.current = null;
    clearActiveMonthFreezeTimeout();
  };

  const freezeActiveMonthUntilScrollSettles = (targetMonthKey: string) => {
    activeMonthFreezeTargetRef.current = targetMonthKey;
    clearActiveMonthFreezeTimeout();
  };

  const scheduleActiveMonthFreezeSettle = () => {
    if (!activeMonthFreezeTargetRef.current) {
      return;
    }

    clearActiveMonthFreezeTimeout();
    activeMonthFreezeTimeoutRef.current = window.setTimeout(() => {
      finishActiveMonthFreeze();
    }, MONTH_VIEW_PROGRAMMATIC_SCROLL_SETTLE_MS);
  };

  const scrollToLoadedMonth = (date: Date) => {
    const monthKey = format(startOfMonth(date), 'yyyy-MM-01');
    const targetElement = monthAnchorRefs.current[monthKey];

    if (scrollRef.current && targetElement) {
      scrollRef.current.scrollTop = targetElement.offsetTop - (headerRef.current?.offsetHeight || 0);
      return true;
    }

    const targetWeek = weeks.find((week) => week.days.some((day) => isSameCalendarDay(day, date)));
    const targetWeekElement = targetWeek ? observerRefs.current[targetWeek.id] : null;

    if (scrollRef.current && targetWeekElement) {
      scrollRef.current.scrollTop = targetWeekElement.offsetTop - (headerRef.current?.offsetHeight || 0);
      return true;
    }

    return false;
  };

  const scrollToWeekContainingDate = (date: Date) => {
    const targetWeek = weeks.find((week) => week.days.some((day) => isSameCalendarDay(day, date)));
    const targetElement = targetWeek ? observerRefs.current[targetWeek.id] : null;

    if (scrollRef.current && targetElement) {
      scrollRef.current.scrollTop = targetElement.offsetTop - (headerRef.current?.offsetHeight || 0);
    }
  };

  const extendLoadedRange = (direction: 'prepend' | 'append') => {
    if (!scrollRef.current || isExtendingRangeRef.current) {
      return;
    }

    if (direction === 'prepend') {
      pendingPrependMetricsRef.current = {
        scrollHeight: scrollRef.current.scrollHeight,
        scrollTop: scrollRef.current.scrollTop
      };
    }

    isExtendingRangeRef.current = true;
    setLoadedRange((previous) => (
      direction === 'prepend'
        ? {
          startMonth: startOfMonth(subMonths(previous.startMonth, MONTH_VIEW_LOAD_CHUNK_MONTHS)),
          endMonth: previous.endMonth
        }
        : {
          startMonth: previous.startMonth,
          endMonth: startOfMonth(addMonths(previous.endMonth, MONTH_VIEW_LOAD_CHUNK_MONTHS))
        }
    ));
  };

  const ensureMonthLoaded = (date: Date): boolean => {
    if (isMonthWithinLoadedRange(date, loadedRange)) {
      return true;
    }

    pendingMonthJumpRef.current = format(startOfMonth(date), 'yyyy-MM-01');
    isExtendingRangeRef.current = true;
    setLoadedRange((previous) => ({
      startMonth: date < previous.startMonth
        ? startOfMonth(subMonths(date, MONTH_VIEW_INITIAL_MONTHS_BEFORE))
        : previous.startMonth,
      endMonth: date > previous.endMonth
        ? startOfMonth(addMonths(date, MONTH_VIEW_INITIAL_MONTHS_AFTER))
        : previous.endMonth
    }));
    return false;
  };

  const scrollToMonth = (date: Date) => {
    freezeActiveMonthUntilScrollSettles(getMonthKey(date));
    if (!ensureMonthLoaded(date)) {
      return;
    }

    scrollToLoadedMonth(date);
    scheduleActiveMonthFreezeSettle();
  };

  const jumpToCurrentMonth = () => {
    scrollToMonth(today);
  };

  const handleMonthScroll = () => {
    const container = scrollRef.current;
    if (!container || isExtendingRangeRef.current) {
      return;
    }

    scheduleActiveMonthFreezeSettle();

    if (activeMonthFreezeTargetRef.current) {
      return;
    }

    if (container.scrollTop <= MONTH_VIEW_EDGE_LOAD_THRESHOLD_PX) {
      extendLoadedRange('prepend');
      return;
    }

    const distanceFromBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
    if (distanceFromBottom <= MONTH_VIEW_EDGE_LOAD_THRESHOLD_PX) {
      extendLoadedRange('append');
    }
  };

  const startDesktopAutoScroll = (direction: 'up' | 'down') => {
    if (desktopAutoScrollIntervalRef.current !== null) {
      return;
    }

    desktopAutoScrollIntervalRef.current = window.setInterval(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop += direction === 'down' ? 12 : -12;
      }
    }, 16);
  };

  const stopDesktopAutoScroll = () => {
    if (desktopAutoScrollIntervalRef.current !== null) {
      window.clearInterval(desktopAutoScrollIntervalRef.current);
      desktopAutoScrollIntervalRef.current = null;
    }
  };

  const createDragEntryForMonthItem = (entry: TodoDateEntry): TodoDateEntry | null => {
    if (entry.badges.deadline) {
      return {
        ...entry,
        badges: {
          scheduled: false,
          deadline: true,
          recurring: false,
          maybe: false,
          completed: false,
          inProgress: false
        },
        primaryKind: 'deadline'
      };
    }

    if (entry.badges.scheduled) {
      return {
        ...entry,
        badges: {
          scheduled: true,
          deadline: false,
          recurring: false,
          maybe: false,
          completed: false,
          inProgress: false
        },
        primaryKind: 'scheduled'
      };
    }

    if (entry.badges.maybe) {
      return {
        ...entry,
        badges: {
          scheduled: false,
          deadline: false,
          recurring: false,
          maybe: true,
          completed: false,
          inProgress: false
        },
        primaryKind: 'maybe'
      };
    }

    return null;
  };

  const isMonthEntryDraggable = (entry: TodoDateEntry): boolean =>
    !isScheduleLocked && Boolean(entry.badges.deadline || entry.badges.scheduled || entry.badges.maybe);

  const handleMonthItemDragEnd = () => {
    setDraggingTodoId(null);
    setDraggingEntry(null);
    setDragTargetDate(null);
    setTouchDragPreview(null);
    setIsTouchDragging(false);
    touchDragActivatedRef.current = false;
    touchDraggingEntryRef.current = null;
    touchDragTargetDateRef.current = null;
    touchDragPointRef.current = null;
    touchAutoScrollSpeedRef.current = 0;
    stopDesktopAutoScroll();
    if (touchAutoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(touchAutoScrollFrameRef.current);
      touchAutoScrollFrameRef.current = null;
    }
    if (touchDragFrameRef.current !== null) {
      window.cancelAnimationFrame(touchDragFrameRef.current);
      touchDragFrameRef.current = null;
    }
  };

  const commitMonthDrop = (targetDateKey: string, entry: TodoDateEntry | null) => {
    if (isScheduleLocked || !entry || !onMoveScheduleEntry) {
      handleMonthItemDragEnd();
      return;
    }

    onMoveScheduleEntry(entry, targetDateKey);
    handleMonthItemDragEnd();
  };

  const handleMonthItemDragStart = (entry: TodoDateEntry, event: React.DragEvent<HTMLDivElement>) => {
    if (isScheduleLocked) {
      return;
    }

    const dragEntry = createDragEntryForMonthItem(entry);
    if (!dragEntry) {
      return;
    }

    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', entry.todo.id);
    setDraggingTodoId(entry.todo.id);
    setDraggingEntry(dragEntry);
  };

  const handleMonthDrop = (targetDateKey: string) => {
    if (isScheduleLocked || !draggingEntry) {
      return;
    }

    commitMonthDrop(targetDateKey, draggingEntry);
  };

  const handleMonthContainerDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (isScheduleLocked || !draggingEntry || !scrollRef.current) {
      return;
    }

    event.preventDefault();
    const rect = scrollRef.current.getBoundingClientRect();
    const edgeThreshold = 88;

    if (event.clientY - rect.top < edgeThreshold) {
      startDesktopAutoScroll('up');
    } else if (rect.bottom - event.clientY < edgeThreshold) {
      startDesktopAutoScroll('down');
    } else {
      stopDesktopAutoScroll();
    }
  };

  const resolveMonthDropDateFromPoint = (clientX: number, clientY: number): string | null => {
    const targetElement = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const dropTarget = targetElement?.closest('[data-month-drop-date]') as HTMLElement | null;
    return dropTarget?.dataset.monthDropDate || null;
  };

  const flushTouchDragPreview = () => {
    const point = touchDragPointRef.current;
    if (!point) {
      touchDragFrameRef.current = null;
      return;
    }

    const nextDate = resolveMonthDropDateFromPoint(point.x, point.y);
    touchDragTargetDateRef.current = nextDate;
    setDragTargetDate((current) => current === nextDate ? current : nextDate);
    setTouchDragPreview((current) => (
      current
      && current.x === point.x
      && current.y === point.y
      && current.title === point.title
    )
      ? current
      : { ...point });
    touchDragFrameRef.current = null;
  };

  const queueTouchDragPreviewUpdate = (point: { x: number; y: number; title: string }) => {
    touchDragPointRef.current = point;
    if (touchDragFrameRef.current === null) {
      touchDragFrameRef.current = window.requestAnimationFrame(flushTouchDragPreview);
    }
  };

  const stopTouchAutoScroll = () => {
    touchAutoScrollSpeedRef.current = 0;
    if (touchAutoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(touchAutoScrollFrameRef.current);
      touchAutoScrollFrameRef.current = null;
    }
  };

  const stepTouchAutoScroll = () => {
    const container = scrollRef.current;
    const point = touchDragPointRef.current;
    const speed = touchAutoScrollSpeedRef.current;

    if (!container || !point || speed === 0) {
      touchAutoScrollFrameRef.current = null;
      return;
    }

    const previousScrollTop = container.scrollTop;
    container.scrollTop += speed;
    queueTouchDragPreviewUpdate(point);

    if (container.scrollTop === previousScrollTop) {
      stopTouchAutoScroll();
      return;
    }

    touchAutoScrollFrameRef.current = window.requestAnimationFrame(stepTouchAutoScroll);
  };

  const updateTouchAutoScroll = (clientY: number) => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const threshold = Math.min(96, Math.max(56, rect.height * 0.16));
    let nextSpeed = 0;

    if (clientY < rect.top + threshold) {
      const intensity = (rect.top + threshold - clientY) / threshold;
      nextSpeed = -Math.max(6, intensity * 20);
    } else if (clientY > rect.bottom - threshold) {
      const intensity = (clientY - (rect.bottom - threshold)) / threshold;
      nextSpeed = Math.max(6, intensity * 20);
    }

    if (nextSpeed === 0) {
      stopTouchAutoScroll();
      return;
    }

    touchAutoScrollSpeedRef.current = nextSpeed;
    if (touchAutoScrollFrameRef.current === null) {
      touchAutoScrollFrameRef.current = window.requestAnimationFrame(stepTouchAutoScroll);
    }
  };

  const handleTouchMonthItemDragStart = (entry: TodoDateEntry, event: React.TouchEvent<HTMLDivElement>) => {
    if (isScheduleLocked) {
      return;
    }

    const dragEntry = createDragEntryForMonthItem(entry);
    if (!dragEntry) {
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    setDraggingTodoId(entry.todo.id);
    setDraggingEntry(dragEntry);
    setTouchDragPreview({
      x: touch.clientX,
      y: touch.clientY,
      title: entry.todo.title
    });
    touchDragPointRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      title: entry.todo.title
    };
    setIsTouchDragging(true);
    touchDragActivatedRef.current = true;
    touchDraggingEntryRef.current = dragEntry;
    touchDragTargetDateRef.current = null;
  };

  useEffect(() => {
    const updateHeight = () => {
      if (scrollRef.current) {
        setContainerHeight(scrollRef.current.clientHeight);
      }
    };

    window.addEventListener('resize', updateHeight);
    window.setTimeout(updateHeight, 0);

    return () => {
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  useEffect(() => (
    () => {
      stopDesktopAutoScroll();
      stopTouchAutoScroll();
      clearActiveMonthFreezeTimeout();
      if (touchDragFrameRef.current !== null) {
        window.cancelAnimationFrame(touchDragFrameRef.current);
      }
    }
  ), []);

  useEffect(() => {
    const pendingPrependMetrics = pendingPrependMetricsRef.current;
    if (pendingPrependMetrics && scrollRef.current) {
      const nextScrollHeight = scrollRef.current.scrollHeight;
      const appendedHeight = nextScrollHeight - pendingPrependMetrics.scrollHeight;
      scrollRef.current.scrollTop = pendingPrependMetrics.scrollTop + appendedHeight;
      pendingPrependMetricsRef.current = null;
    }

    const pendingMonthKey = pendingMonthJumpRef.current;
    if (pendingMonthKey) {
      const pendingMonthDate = buildMonthLabelDate(pendingMonthKey);
      const jumpWorked = scrollToLoadedMonth(pendingMonthDate);
      if (jumpWorked) {
        pendingMonthJumpRef.current = null;
        scheduleActiveMonthFreezeSettle();
      }
    }

    const pendingReferenceDateKey = pendingReferenceDateKeyRef.current;
    if (pendingReferenceDateKey) {
      const pendingReferenceDate = parseDateKey(pendingReferenceDateKey);
      if (pendingReferenceDate && isMonthWithinLoadedRange(pendingReferenceDate, loadedRange)) {
        scrollToWeekContainingDate(pendingReferenceDate);
        pendingReferenceDateKeyRef.current = null;
        lastAppliedReferenceDateKeyRef.current = pendingReferenceDateKey;
        lastAppliedExternalNavigationSignalRef.current = externalNavigationSignal;
        scheduleActiveMonthFreezeSettle();
      }
    }

    isExtendingRangeRef.current = false;
  }, [loadedRange, weeks]);

  useEffect(() => {
    if (containerHeight === 0 || entryJumpSignal === 0) {
      return;
    }

    let secondFrameId: number | null = null;
    const applyCurrentMonthEntryJump = () => {
      scrollToMonth(today);
      lastAppliedReferenceDateKeyRef.current = formatDateKey(referenceDate);
      hasInitialScrollRef.current = true;
    };

    const firstFrameId = window.requestAnimationFrame(() => {
      applyCurrentMonthEntryJump();
      secondFrameId = window.requestAnimationFrame(() => {
        applyCurrentMonthEntryJump();
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      if (secondFrameId !== null) {
        window.cancelAnimationFrame(secondFrameId);
      }
    };
  }, [containerHeight, entryJumpSignal, referenceDate, today]);

  useEffect(() => {
    if (!hasInitialScrollRef.current) {
      return;
    }

    const referenceDateKey = formatDateKey(referenceDate);
    if (lastAppliedReferenceDateKeyRef.current === referenceDateKey) {
      return;
    }

    pendingReferenceDateKeyRef.current = referenceDateKey;
    freezeActiveMonthUntilScrollSettles(getMonthKey(referenceDate));

    if (!ensureMonthLoaded(referenceDate)) {
      return;
    }

    scrollToWeekContainingDate(referenceDate);
    pendingReferenceDateKeyRef.current = null;
    lastAppliedReferenceDateKeyRef.current = referenceDateKey;
    scheduleActiveMonthFreezeSettle();
  }, [referenceDate]);

  useEffect(() => {
    localStorage.setItem(MONTH_VIEW_ROWS_PER_SCREEN_STORAGE_KEY, String(monthRowsPerScreen));
  }, [monthRowsPerScreen]);

  useEffect(() => {
    localStorage.setItem(MONTH_VIEW_FONT_SIZE_STORAGE_KEY, monthFontSize);
  }, [monthFontSize]);

  useEffect(() => {
    localStorage.setItem(MONTH_VIEW_MARKER_COLOR_MODE_STORAGE_KEY, monthMarkerColorMode);
  }, [monthMarkerColorMode]);

  useEffect(() => {
    localStorage.setItem(MONTH_VIEW_HIDDEN_FILTER_EXPRESSION_STORAGE_KEY, hiddenFilterExpression);
  }, [hiddenFilterExpression]);

  useEffect(() => {
    localStorage.setItem(MONTH_VIEW_HIDE_TRACE_TYPES_STORAGE_KEY, hideTraceTypes ? 'true' : 'false');
  }, [hideTraceTypes]);

  const openDensityMenu = () => {
    setHiddenFilterExpressionDraft(hiddenFilterExpression);
    setHideTraceTypesDraft(hideTraceTypes);
    setIsDensityMenuOpen(true);
  };

  const closeDensityMenu = () => {
    setHiddenFilterExpression(hiddenFilterExpressionDraft);
    setHideTraceTypes(hideTraceTypesDraft);
    setIsDensityMenuOpen(false);
  };

  useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
      let nextMonth: string | null = null;
      let maxRatio = 0;

      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.intersectionRatio <= maxRatio) {
          return;
        }

        const monthLabel = entry.target.getAttribute('data-month-key');
        if (!monthLabel) {
          return;
        }

        nextMonth = monthLabel;
        maxRatio = entry.intersectionRatio;
      });

      if (maxRatio > 0.12 && nextMonth) {
        latestObservedMonthRef.current = nextMonth;
        if (activeMonthFreezeTargetRef.current) {
          return;
        }
        setActiveMonth((previous) => (previous === nextMonth ? previous : nextMonth));
      }
    }, {
      root: scrollRef.current,
      threshold: [0.18, 0.62]
    });

    Object.values(observerRefs.current).forEach((element) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [weeks]);

  useEffect(() => {
    if (!isTouchDragging) {
      return;
    }

    const handleWindowTouchMove = (event: TouchEvent) => {
      if (!touchDragActivatedRef.current) {
        return;
      }

      const touch = event.touches[0];
      const activeEntry = touchDraggingEntryRef.current;
      if (!touch || !activeEntry) {
        return;
      }

      if (event.cancelable) {
        event.preventDefault();
      }
      queueTouchDragPreviewUpdate({
        x: touch.clientX,
        y: touch.clientY,
        title: activeEntry.todo.title
      });
      updateTouchAutoScroll(touch.clientY);
    };

    const handleWindowTouchEnd = () => {
      if (!touchDragActivatedRef.current) {
        return;
      }

      const activeEntry = touchDraggingEntryRef.current;
      const targetDate = touchDragTargetDateRef.current;
      if (targetDate && activeEntry) {
        commitMonthDrop(targetDate, activeEntry);
        return;
      }

      handleMonthItemDragEnd();
    };

    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);
    window.addEventListener('touchcancel', handleWindowTouchEnd);

    return () => {
      stopTouchAutoScroll();
      if (touchDragFrameRef.current !== null) {
        window.cancelAnimationFrame(touchDragFrameRef.current);
        touchDragFrameRef.current = null;
      }
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchEnd);
    };
  }, [isTouchDragging, onMoveScheduleEntry]);

  useEffect(() => {
    if (!isScheduleLocked) {
      return;
    }

    handleMonthItemDragEnd();
  }, [isScheduleLocked]);

  const activeMonthDate = useMemo(() => buildMonthLabelDate(activeMonth), [activeMonth]);
  const topRowHeight = useMemo(
    () => Math.max(96, containerHeight / monthRowsPerScreen),
    [containerHeight, monthRowsPerScreen]
  );
  const monthCellLineHeightPx = useMemo(() => {
    if (monthFontSize === 'small') {
      return 14;
    }

    if (monthFontSize === 'large') {
      return 18;
    }

    return 16;
  }, [monthFontSize]);
  const visibleEntryCount = useMemo(
    () => {
      const verticalGapPx = 2;
      const dateHeaderReservePx = 24;
      const footerReservePx = 10;
      const availableHeight = Math.max(0, topRowHeight - dateHeaderReservePx - footerReservePx);
      const computedRows = Math.floor((availableHeight + verticalGapPx) / (monthCellLineHeightPx + verticalGapPx));

      return Math.max(3, Math.min(12, computedRows));
    },
    [monthCellLineHeightPx, topRowHeight]
  );
  const weekLayouts = useMemo<Record<string, TodoMonthWeekLayout>>(
    () => weeks.reduce<Record<string, TodoMonthWeekLayout>>((accumulator, week) => {
      const weekDateKeys = week.days.map((day) => formatDateKey(day));
      accumulator[week.id] = buildTodoMonthWeekLayout(weekDateKeys, entriesByDate, visibleEntryCount, {
        includeTraceSegments: !hideTraceTypes
      });
      return accumulator;
    }, {}),
    [entriesByDate, hideTraceTypes, visibleEntryCount, weeks]
  );
  const sortedEntriesByDate = useMemo(
    () => weeks.reduce<Record<string, TodoDateEntry[]>>((accumulator, week) => {
      const weekLayout = weekLayouts[week.id];
      week.days.forEach((day) => {
        const dateKey = formatDateKey(day);
        accumulator[dateKey] = weekLayout?.sortedEntriesByDate[dateKey] || entriesByDate[dateKey] || [];
      });
      return accumulator;
    }, {}),
    [entriesByDate, weekLayouts, weeks]
  );
  const selectedDateEntries = useMemo(
    () => (selectedDate ? sortedEntriesByDate[selectedDate] || [] : []),
    [selectedDate, sortedEntriesByDate]
  );
  const toggleSelectedDate = (dateKey: string) => {
    setSelectedDate((previous) => previous === dateKey ? null : dateKey);
  };
  const handleMonthDayNumberClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    dateKey: string
  ) => {
    event.stopPropagation();

    if (onOpenDay) {
      onOpenDay(dateKey);
      return;
    }

    toggleSelectedDate(dateKey);
  };
  const todoCategoryColorMap = useMemo(
    () => new Map(todoCategories.map((category) => [category.id, getColorHexForCharts(category.color || '')])),
    [todoCategories]
  );
  const activeMonthLabel = useMemo(
    () => `${activeMonthDate.getFullYear()}.${activeMonthDate.getMonth() + 1}`,
    [activeMonthDate]
  );
  const isCurrentMonthActive = useMemo(
    () => activeMonth === format(startOfMonth(today), 'yyyy-MM-01'),
    [activeMonth, today]
  );
  const monthCellTaskClassName = useMemo(() => {
    if (monthFontSize === 'small') {
      return 'text-[0.68rem]';
    }

    if (monthFontSize === 'large') {
      return 'text-[0.82rem]';
    }

    return 'text-[0.74rem]';
  }, [monthFontSize]);
  const monthDetailTaskClassName = useMemo(() => {
    if (monthFontSize === 'small') {
      return 'text-[0.76rem]';
    }

    if (monthFontSize === 'large') {
      return 'text-[0.92rem]';
    }

    return 'text-[0.82rem]';
  }, [monthFontSize]);
  const resolvedScheduleTypeColors = useMemo(
    () => getResolvedTodoScheduleTypeColors(scheduleTypeColorSettings),
    [scheduleTypeColorSettings]
  );
  const getTodoMarkerColor = (entry: TodoDateEntry): string => {
    if (monthMarkerColorMode === 'category') {
      return todoCategoryColorMap.get(entry.todo.categoryId) || resolvedScheduleTypeColors[entry.primaryKind];
    }

    return resolvedScheduleTypeColors[entry.primaryKind];
  };

  const getTodoMarkerStyle = (entry: TodoDateEntry): React.CSSProperties => {
    const markerColor = getTodoMarkerColor(entry);
    if (entry.primaryKind === 'maybe') {
      return {
        border: `1px dashed ${markerColor}`,
        backgroundColor: hexToRgba(markerColor, 0.08)
      };
    }
    return {
      borderLeftColor: markerColor,
      backgroundColor: hexToRgba(markerColor, 0.08)
    };
  };
  const monthCellRowStyle = useMemo<React.CSSProperties>(
    () => ({
      display: 'flex',
      alignItems: 'center',
      height: `${monthCellLineHeightPx}px`,
      minHeight: `${monthCellLineHeightPx}px`
    }),
    [monthCellLineHeightPx]
  );
  const getTraceSegmentStyle = (segment: TodoWeekTraceSegment): React.CSSProperties => {
    const markerColor = getTodoMarkerColor(segment.entry);
    const spanDayCount = segment.endDayIndex - segment.startDayIndex + 1;
    return {
      left: `${(segment.startDayIndex / 7) * 100}%`,
      width: `${(spanDayCount / 7) * 100}%`,
      top: `${MONTH_VIEW_ENTRY_TOP_OFFSET_PX + (segment.laneIndex * (monthCellLineHeightPx + MONTH_VIEW_ENTRY_ROW_GAP_PX))}px`,
      height: `${monthCellLineHeightPx}px`,
      paddingLeft: '3px',
      backgroundColor: hexToRgba(markerColor, 0.08),
      boxShadow: `inset 1.5px 0 0 ${markerColor}`
    };
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={`flex min-h-0 flex-1 flex-col ${isDensityMenuOpen ? 'pointer-events-none blur-[6px] opacity-90' : ''}`}>
      <div
        ref={headerRef}
        className={`shrink-0 bg-[rgba(250,249,246,0.34)] ${useReducedEffects ? '' : ''}`}
      >
        <div className="flex items-center justify-between border-b border-black px-3 py-2.5">
          <div className="flex items-center space-x-1 select-none">
            <button
              type="button"
              onClick={() => scrollToMonth(subMonths(activeMonthDate, 1))}
              className="rounded-full p-1.5 opacity-50 transition-colors hover:bg-stone-200 hover:opacity-100"
              title="上一月"
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
            </button>

            <button
              type="button"
              onClick={() => {
                if (onOpenDatePicker) {
                  onOpenDatePicker();
                  return;
                }

                scrollToWeekContainingDate(today);
              }}
              className="flex items-baseline space-x-1.5 px-1 text-left"
              title={onOpenDatePicker ? '跳到某一天' : '跳到今天'}
            >
              <span className="text-[1.05rem] font-serif font-black italic leading-none transition-opacity hover:opacity-60">
                {activeMonthLabel}
              </span>
            </button>

            <button
              type="button"
              onClick={() => scrollToMonth(addMonths(activeMonthDate, 1))}
              className="rounded-full p-1.5 opacity-50 transition-colors hover:bg-stone-200 hover:opacity-100"
              title="下一月"
            >
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex items-center gap-3 pr-1">
            <div className="pointer-events-none flex items-center gap-2">
              <span className="hidden text-[0.45rem] font-bold uppercase tracking-[0.2em] opacity-40 sm:inline">
                Monthly Agenda
              </span>
              <div className="hidden space-x-1 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-black"></span>
                <span className="h-1.5 w-1.5 rounded-full border border-black"></span>
                <span className="h-1.5 w-1.5 rounded-full border border-black"></span>
              </div>
            </div>
            <button
              type="button"
              onClick={jumpToCurrentMonth}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] tracking-[0.14em] transition-colors ${
                isCurrentMonthActive
                  ? 'bg-stone-100 text-slate-600'
                  : 'text-slate-400 hover:bg-white/50 hover:text-slate-600'
              }`}
            >
              本月
            </button>
            <button
              type="button"
              onClick={onToggleScheduleLock}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] tracking-[0.14em] transition-colors ${
                isScheduleLocked
                  ? 'bg-stone-900 text-[#faf9f6]'
                  : 'text-slate-400 hover:bg-white/50 hover:text-slate-600'
              }`}
              aria-pressed={isScheduleLocked}
              title={isScheduleLocked ? '已锁定拖拽，点击恢复移动' : '锁定拖拽，防止误移动'}
            >
              {isScheduleLocked ? '解锁' : '锁定'}
            </button>
            <button
              type="button"
              onClick={openDensityMenu}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/60 hover:text-slate-700"
              title="月视图设置"
              aria-label="月视图设置"
              aria-expanded={isDensityMenuOpen}
            >
              <SlidersHorizontal size={14} />
            </button>
            {viewMenuNode}
          </div>
        </div>

        <div className={`${MONTH_VIEW_CALENDAR_SIDE_INSET_CLASS_NAME} grid grid-cols-7 border-b border-black/90 bg-[rgba(250,249,246,0.16)] py-1.5 text-[0.6rem] font-bold uppercase tracking-widest`}>
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="text-center opacity-40">
              {label}
            </div>
          ))}
        </div>
      </div>

      <div
        ref={scrollRef}
        className={`min-h-0 flex-1 overflow-y-auto bg-transparent pb-[10vh] no-scrollbar ${MONTH_VIEW_CALENDAR_SIDE_INSET_CLASS_NAME}`}
        style={{ scrollBehavior: 'smooth' }}
        onScroll={handleMonthScroll}
        onDragOver={handleMonthContainerDragOver}
        onDragLeave={stopDesktopAutoScroll}
        onDrop={stopDesktopAutoScroll}
      >
        {weeks.map((week) => {
          const middleDayOfWeek = week.days[3];
          const firstMonthDay = week.days.find((day) => getDate(day) === 1);
          const firstMonthKey = firstMonthDay ? format(startOfMonth(firstMonthDay), 'yyyy-MM-01') : null;
          const weekLayout = weekLayouts[week.id];
          const visibleTraceSegments = (weekLayout?.traceSegments || []).filter((segment) => segment.laneIndex < visibleEntryCount);

          return (
            <div
              key={week.id}
              data-month-key={week.monthKey}
              ref={(element) => {
                observerRefs.current[week.id] = element;
                if (firstMonthKey) {
                  monthAnchorRefs.current[firstMonthKey] = element;
                }
              }}
            >
              <div className="relative" style={{ height: `${topRowHeight}px` }}>
                <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] overflow-hidden" style={{ height: `${topRowHeight}px` }}>
                  {visibleTraceSegments.map((segment) => (
                    <div
                      key={`${week.id}-${segment.todoId}-${segment.startDayIndex}-${segment.endDayIndex}`}
                      className={`absolute flex items-center overflow-hidden font-medium leading-[1.2] text-stone-800 ${monthCellTaskClassName} ${
                        onOpenTodo ? 'cursor-pointer pointer-events-auto' : ''
                      }`}
                      style={getTraceSegmentStyle(segment)}
                      onClick={onOpenTodo ? (event) => {
                        event.stopPropagation();
                        onOpenTodo(segment.entry.todo);
                      } : undefined}
                    >
                      <span className="truncate whitespace-nowrap">{segment.entry.todo.title}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7" style={{ height: `${topRowHeight}px` }}>
                  {week.days.map((day) => {
                    const dateKey = formatDateKey(day);
                    const rowEntries = weekLayout?.rowEntriesByDate[dateKey] || (entriesByDate[dateKey] || []).map((entry) => entry);
                    const visibleRowEntries = rowEntries.slice(0, visibleEntryCount);
                    const hiddenCount = weekLayout?.hiddenCountByDate[dateKey] ?? Math.max(
                      0,
                      (entriesByDate[dateKey] || []).length - visibleRowEntries.length
                    );
                    const isCurrentMonth = isSameMonth(day, middleDayOfWeek);
                    const dayNumberTextClassName = isCurrentMonth ? 'text-stone-800 hover:text-stone-950' : 'text-stone-400 hover:text-stone-500';
                    const isToday = dateKey === todayDateKey;
                    const isSelected = selectedDate === dateKey;
                    const isFirst = getDate(day) === 1;

                    return (
                      <div
                        key={day.toISOString()}
                        data-month-drop-date={dateKey}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        aria-label={`Open ${format(day, 'yyyy-MM-dd')} details`}
                        onClick={() => toggleSelectedDate(dateKey)}
                        onKeyDown={(event) => {
                          if (event.target !== event.currentTarget) {
                            return;
                          }

                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            toggleSelectedDate(dateKey);
                          }
                        }}
                        onDragOver={(event) => {
                          if (isScheduleLocked || !draggingEntry) return;
                          event.preventDefault();
                          if (dragTargetDate !== dateKey) {
                            setDragTargetDate(dateKey);
                          }
                        }}
                        onDragLeave={() => {
                          if (dragTargetDate === dateKey) {
                            setDragTargetDate(null);
                          }
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (isScheduleLocked) {
                            return;
                          }
                          handleMonthDrop(dateKey);
                        }}
                        className={[
                          'relative z-0 flex cursor-pointer flex-col border-b border-r border-stone-200/35 text-left transition-colors duration-200',
                          !isCurrentMonth ? 'bg-[rgba(245,244,240,0.14)]' : 'bg-transparent',
                          isToday ? 'z-10 ring-1 ring-inset ring-stone-400' : '',
                          isSelected && !isToday ? 'bg-[rgba(255,255,255,0.22)]' : '',
                          dragTargetDate === dateKey ? 'bg-[rgba(250,249,246,0.32)] ring-2 ring-inset ring-stone-800/75' : ''
                        ].join(' ')}
                        style={{
                          paddingTop: `${MONTH_VIEW_CELL_VERTICAL_PADDING_PX}px`,
                          paddingBottom: `${MONTH_VIEW_CELL_VERTICAL_PADDING_PX}px`
                        }}
                      >
                        <div
                          className="flex justify-start px-2"
                          style={{ minHeight: `${MONTH_VIEW_DAY_NUMBER_ROW_HEIGHT_PX}px` }}
                        >
                          <button
                            type="button"
                            onClick={(event) => handleMonthDayNumberClick(event, dateKey)}
                            className={`rounded-sm text-[1.02rem] leading-none transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-500/70 ${dayNumberTextClassName}`}
                            style={{
                              fontFamily: "'Bilbo Swash Caps', 'Georgia', 'Times New Roman', cursive, serif",
                              lineHeight: `${MONTH_VIEW_DAY_NUMBER_ROW_HEIGHT_PX}px`
                            }}
                            aria-label={`Quick add task for ${format(day, 'yyyy-MM-dd')}`}
                          >
                            {format(day, 'dd')}
                          </button>
                        </div>

                        <div
                          className="flex min-h-0 flex-1 flex-col overflow-hidden"
                          style={{
                            marginTop: `${MONTH_VIEW_ENTRY_TOP_MARGIN_PX}px`,
                            rowGap: `${MONTH_VIEW_ENTRY_ROW_GAP_PX}px`
                          }}
                        >
                          {visibleRowEntries.map((entry, rowIndex) => {
                            if (!entry) {
                              return (
                                <div
                                  key={`${dateKey}-empty-${rowIndex}`}
                                  aria-hidden="true"
                                  style={monthCellRowStyle}
                                />
                              );
                            }

                            if (entry.primaryKind === 'inProgress') {
                              return (
                                <div
                                  key={`${dateKey}-${entry.todo.id}-${entry.primaryKind}`}
                                  aria-hidden="true"
                                  className={`invisible overflow-hidden text-clip whitespace-nowrap border-l-[1.5px] pl-[3px] font-medium leading-[1.2] ${monthCellTaskClassName}`}
                                  style={{
                                    ...getTodoMarkerStyle(entry),
                                    ...monthCellRowStyle
                                  }}
                                >
                                  {entry.todo.title}
                                </div>
                              );
                            }

                            return (
                              <div
                                key={`${dateKey}-${entry.todo.id}-${entry.primaryKind}`}
                                className={`overflow-hidden text-clip whitespace-nowrap font-medium leading-[1.2] ${entry.primaryKind === 'completed' ? 'line-through text-stone-400/90 dark:text-stone-500/90' : 'text-stone-800'} ${monthCellTaskClassName} ${entry.primaryKind === 'maybe' ? 'rounded-[2px] px-[3px]' : 'border-l-[1.5px] pl-[3px]'}`}
                                style={{
                                  ...getTodoMarkerStyle(entry),
                                  ...monthCellRowStyle
                                }}
                              >
                                {entry.todo.title}
                              </div>
                            );
                          })}

                          {hiddenCount > 0 && (
                            <div className="pl-[5px] pt-0.5 text-[0.53rem] font-bold uppercase tracking-[0.14em] text-stone-300">
                              +{hiddenCount}
                            </div>
                          )}
                        </div>

                        {isToday && (
                          <div className="absolute bottom-1 right-1.5 text-[0.45rem] font-bold uppercase tracking-widest opacity-50">
                            TODAY
                          </div>
                        )}

                        {isFirst && !isToday && (
                          <div className="absolute bottom-1 right-1.5 text-[0.45rem] font-bold uppercase tracking-widest opacity-30">
                            {format(day, 'MMM')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <AnimatePresence initial={false}>
                {selectedDate && week.days.some((day) => formatDateKey(day) === selectedDate) && (
                  <motion.div
                    key={selectedDate}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: useReducedEffects ? 0.08 : 0.12, ease: 'easeOut' }}
                    className="overflow-hidden bg-[rgba(250,249,246,0.26)] shadow-[inset_0_3px_6px_rgba(0,0,0,0.02)]"
                  >
                    <div className="flex flex-col gap-1 px-5 py-3.5">
                      {selectedDateEntries.length > 0 ? (
                        selectedDateEntries.map((entry) => {
                          const rowClassName = 'flex w-full items-start gap-3 rounded px-2 py-1.5 text-left transition-colors hover:bg-black/5';
                          const activeTags = MONTH_VIEW_ENTRY_TAGS.filter(({ key }) => entry.badges[key]);
                          const activeTagCount = activeTags.length;
                          const completedDateKey = entry.todo.completedAt ? formatDateKey(new Date(entry.todo.completedAt)) : null;
                          const titleClassName = 'text-stone-800';
                          const parentTodo = getParentTodo(todos, entry.todo);
                          const parentTitle = parentTodo?.title || null;
                          const parentTitleClassName = 'text-stone-400';
                          const isScheduledOverdue = Boolean(
                            entry.badges.scheduled &&
                            entry.todo.scheduledDate &&
                            entry.todo.scheduledDate < todayDateKey &&
                            !completedDateKey
                          );
                          const isDeadlineOverdue = Boolean(
                            entry.badges.deadline &&
                            entry.todo.deadlineDate &&
                            entry.todo.deadlineDate < todayDateKey &&
                            !completedDateKey
                          );
                          const titleSegmentClassName = parentTitle
                            ? 'min-w-0 max-w-[58%] flex-[0_1_auto] truncate'
                            : 'min-w-0 flex-1 truncate';
                          const parentSegmentClassName = 'min-w-0 max-w-[42%] flex-[0_1_auto] truncate';

                          if (onOpenTodo) {
                            return (
                              <div
                                key={`${selectedDate}-${entry.todo.id}-${entry.primaryKind}-detail`}
                                className={rowClassName}
                                draggable={isMonthEntryDraggable(entry)}
                                onDragStart={(event) => isMonthEntryDraggable(entry) && handleMonthItemDragStart(entry, event)}
                                onDragEnd={handleMonthItemDragEnd}
                                onTouchStart={(event) => isMonthEntryDraggable(entry) && handleTouchMonthItemDragStart(entry, event)}
                              >
                                <span className="flex h-4 w-4 shrink-0 items-center justify-center self-center">
                                  {getMonthEntryLeadingIcon(entry)}
                                </span>
                                <div className="flex min-w-0 flex-1 items-start gap-2">
                                  {isMonthEntryDraggable(entry) ? (
                                    <span className={`min-w-0 flex flex-1 items-baseline gap-0 overflow-hidden font-medium uppercase tracking-[0.12em] text-left ${monthDetailTaskClassName} ${draggingTodoId === entry.todo.id ? 'cursor-grabbing opacity-40' : 'cursor-grab active:cursor-grabbing'} ${titleClassName}`}>
                                      <span className={titleSegmentClassName}>{entry.todo.title}</span>
                                      {parentTitle && (
                                        <span className={`${parentSegmentClassName} ${parentTitleClassName}`}>{` @${parentTitle}`}</span>
                                      )}
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => onOpenTodo(entry.todo)}
                                      className={`min-w-0 flex flex-1 items-baseline gap-0 overflow-hidden font-medium uppercase tracking-[0.12em] text-left ${monthDetailTaskClassName} ${titleClassName} ${entry.primaryKind === 'completed' ? 'line-through opacity-70' : ''}`}
                                    >
                                      <span className={titleSegmentClassName}>{entry.todo.title}</span>
                                      {parentTitle && (
                                        <span className={`${parentSegmentClassName} ${parentTitleClassName}`}>{` @${parentTitle}`}</span>
                                      )}
                                    </button>
                                  )}
                                  <div className={`flex shrink-0 self-center translate-y-px flex-wrap items-center justify-end gap-1 whitespace-nowrap text-[9px] leading-none ${activeTagCount > 1 ? 'tracking-[0.08em]' : 'tracking-[0.16em]'}`}>
                                    {activeTags.map((tag) => (
                                      tag.clickable ? (
                                        <button
                                          key={tag.key}
                                          type="button"
                                          draggable={false}
                                          onTouchStart={(event) => event.stopPropagation()}
                                          onClick={() => onOpenTodo(entry.todo)}
                                          className="inline-flex items-center justify-end gap-1 whitespace-nowrap rounded-full px-1 py-0.5 text-right transition-colors hover:bg-stone-100/70"
                                          style={{ color: tag.color }}
                                        >
                                          {tag.key === 'deadline' && isDeadlineOverdue && <CircleAlert size={10} className="-translate-y-px shrink-0 text-red-500" />}
                                          {tag.key === 'scheduled' && isScheduledOverdue && <CircleAlert size={10} className="-translate-y-px shrink-0 text-red-500" />}
                                          {getMonthEntryTagLabel(tag, activeTagCount)}
                                        </button>
                                      ) : (
                                        <span
                                          key={tag.key}
                                          onTouchStart={(event) => event.stopPropagation()}
                                          className="inline-flex items-center justify-end gap-1 whitespace-nowrap text-right"
                                          style={{ color: tag.color }}
                                        >
                                          {getMonthEntryTagLabel(tag, activeTagCount)}
                                        </span>
                                      )
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={`${selectedDate}-${entry.todo.id}-${entry.primaryKind}-detail`}
                              className={rowClassName}
                            >
                              <span className="flex h-4 w-4 shrink-0 items-center justify-center self-center">
                                {getMonthEntryLeadingIcon(entry)}
                              </span>
                              <div className="flex min-w-0 flex-1 items-start gap-2">
                                <span className={`min-w-0 flex flex-1 items-baseline gap-0 overflow-hidden font-medium uppercase tracking-[0.12em] ${monthDetailTaskClassName} ${titleClassName} ${entry.primaryKind === 'completed' ? 'line-through opacity-70' : ''}`}>
                                  <span className={titleSegmentClassName}>{entry.todo.title}</span>
                                  {parentTitle && (
                                    <span className={`${parentSegmentClassName} ${parentTitleClassName}`}>{` @${parentTitle}`}</span>
                                  )}
                                </span>
                                <div className={`flex shrink-0 self-center translate-y-px flex-wrap items-center justify-end gap-1 whitespace-nowrap text-[9px] leading-none ${activeTagCount > 1 ? 'tracking-[0.08em]' : 'tracking-[0.16em]'}`}>
                                  {activeTags.map((tag) => (
                                    <span
                                      key={tag.key}
                                      onTouchStart={(event) => event.stopPropagation()}
                                      className="inline-flex items-center justify-end gap-1 whitespace-nowrap text-right"
                                      style={{ color: tag.color }}
                                    >
                                      {tag.key === 'deadline' && isDeadlineOverdue && <CircleAlert size={10} className="-translate-y-px shrink-0 text-red-500" />}
                                      {tag.key === 'scheduled' && isScheduledOverdue && <CircleAlert size={10} className="-translate-y-px shrink-0 text-red-500" />}
                                      {getMonthEntryTagLabel(tag, activeTagCount)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-2 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-stone-300">
                          No Tasks Scheduled
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      </div>
      {touchDragPreview && (
        <div
          className="pointer-events-none fixed z-[140] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-stone-200 bg-white/92 px-3 py-2 text-sm text-stone-700 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
          style={{ left: touchDragPreview.x, top: touchDragPreview.y }}
        >
          <div className="max-w-[12rem] truncate">{touchDragPreview.title}</div>
        </div>
      )}
      {isDensityMenuOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-[rgba(250,249,246,0.14)] px-4 py-[calc(4.5rem+env(safe-area-inset-bottom))] backdrop-blur-[3px]"
          onPointerDown={(event) => {
            if (event.target !== event.currentTarget) {
              return;
            }

            event.stopPropagation();
          }}
          onClick={(event) => {
            if (event.target !== event.currentTarget) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            closeDensityMenu();
          }}
        >
          <div
            className="relative w-full max-w-[24rem] overflow-hidden rounded-[2rem] border border-stone-200/80 shadow-[0_12px_30px_rgba(28,25,23,0.12)]"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[#faf9f6]/95 backdrop-blur-sm"
            />
            <div
              className="relative z-10 flex flex-col"
              style={{ maxHeight: TODO_DISPLAY_POPUP_MAX_HEIGHT }}
            >
            <div className="shrink-0 border-b border-stone-200/80 px-4 pb-3 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-[0.82rem] font-medium tracking-[0.08em] text-stone-500">
                  月视图设置
                </span>
                <button
                  type="button"
                  onClick={closeDensityMenu}
                  className="rounded-full px-2 py-1.5 text-[0.82rem] text-stone-400 transition-colors hover:bg-stone-100/70 hover:text-stone-600"
                >
                  关闭
                </button>
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto px-4 pb-4 pt-4">
            <div className="mb-4">
              <div className="mb-2 text-[0.72rem] font-medium tracking-[0.08em] text-stone-400">
                格子高度
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {MONTH_VIEW_ROW_OPTIONS.map((option) => {
                  const isSelected = monthRowsPerScreen === option;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setMonthRowsPerScreen(option)}
                      className={`rounded-xl px-3 py-2.5 text-left text-[14px] tracking-[0.04em] transition-colors ${
                        isSelected
                          ? 'bg-stone-100 text-slate-700'
                          : 'text-slate-500 hover:bg-stone-100/70 hover:text-slate-700'
                      }`}
                    >
                      {option}行/屏
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-2 text-[0.72rem] font-medium tracking-[0.08em] text-stone-400">
                字体大小
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {MONTH_VIEW_FONT_SIZE_OPTIONS.map((option) => {
                  const isSelected = monthFontSize === option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setMonthFontSize(option.key)}
                      className={`rounded-xl px-3 py-2.5 text-center text-[14px] tracking-[0.04em] transition-colors ${
                        isSelected
                          ? 'bg-stone-100 text-slate-700'
                          : 'text-slate-500 hover:bg-stone-100/70 hover:text-slate-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[0.72rem] font-medium tracking-[0.08em] text-stone-400">
                着色类型
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {MONTH_VIEW_MARKER_COLOR_OPTIONS.map((option) => {
                  const isSelected = monthMarkerColorMode === option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setMonthMarkerColorMode(option.key)}
                      className={`rounded-xl px-3 py-2.5 text-center text-[14px] tracking-[0.04em] transition-colors ${
                        isSelected
                          ? 'bg-stone-100 text-slate-700'
                          : 'text-slate-500 hover:bg-stone-100/70 hover:text-slate-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {monthMarkerColorMode === 'schedule' && (
                <TodoScheduleTypeColorSettingsPanel
                  settings={scheduleTypeColorSettings}
                  onChange={(nextSettings) => {
                    setScheduleTypeColorSettings(nextSettings);
                    todoScheduleColorService.saveSettings(nextSettings);
                  }}
                />
              )}
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-3 text-[0.72rem] font-medium tracking-[0.08em] text-stone-400">
                <span>隐藏筛选式</span>
                {hiddenFilterExpressionDraft.trim() && (
                  <button
                    type="button"
                    onClick={() => setHiddenFilterExpressionDraft('')}
                    className="rounded-full px-2 py-1 text-[0.68rem] tracking-[0.04em] text-stone-400 transition-colors hover:bg-stone-100/70 hover:text-stone-600"
                  >
                    清空
                  </button>
                )}
              </div>
              <textarea
                value={hiddenFilterExpressionDraft}
                onChange={(event) => setHiddenFilterExpressionDraft(event.target.value)}
                rows={3}
                spellCheck={false}
                placeholder="@写作 #阅读 %健康 复盘 OR 总结"
                className="w-full resize-none rounded-2xl border border-stone-200 bg-white/88 px-3 py-2.5 text-[13px] leading-5 text-stone-700 outline-none transition-colors placeholder:text-stone-300 focus:border-stone-300"
              />
              <p className="mt-2 text-[11px] leading-5 text-stone-400">
                语法同自定义筛选器：空格=与，OR=或，@待办/分类，#活动/分类，%领域，无前缀=备注。
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={hideTraceTypesDraft}
              onClick={() => setHideTraceTypesDraft((previous) => !previous)}
              className="mt-4 flex w-full items-center justify-between gap-3 px-1 py-3 text-left transition-colors hover:text-stone-900"
            >
              <span className="text-sm font-medium text-stone-700">隐藏 Trace 类型</span>
              <span
                className={`flex h-7 w-12 shrink-0 items-center rounded-full px-1 transition-colors ${hideTraceTypesDraft ? 'bg-stone-800' : 'bg-stone-200'}`}
              >
                <span
                  className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${hideTraceTypesDraft ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </span>
            </button>
            </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
