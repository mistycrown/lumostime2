/**
 * @file TodoBentoWeekView.tsx
 * @input Todo items, logs, one parent-owned week start, and schedule interaction callbacks
 * @output Single-week 2x4 bento schedule UI backed by real todo data
 * @pos Component (Todo scheduling)
 * @description Renders one selected week at a time in the bento layout so the mini calendar, header range, and visible day cells always describe the same week.
 * @updated 2026-07-21: Applied the shared calendar number typography to the two-column week view.
 * @updated 2026-09-12: Added explicit min-size constraints to the bento schedule shell so Android WebView flex scrolling does not clip day-cell content at viewport edges.
 * @updated 2026-06-13: 调整显示设置弹窗中已选择选项的视觉效果，移除背景加深，改为下划线指示器。
 * @updated 2026-06-13: 调整显示设置弹窗中已选择选项的背景和文字对比度，将 bg-stone-100 更改为更明显的 bg-stone-200，并加深文字颜色。
 * @updated 2026-06-06: Reused the shared schedule primary-kind priority for bento marker colors so overlapping badges now follow the same Done > Due > Arrange > Repeat > Maybe > Trace precedence as month view.
 * @updated 2026-05-23: Replaced mini-calendar due dots with inline flag icons, hiding the date numeral whenever a visible-month day carries at least one deadline so the bento navigator reads more evenly.
 * @updated 2026-05-21: Highlighted today's 2x4 bento week cell with the same gray inset ring used by month view so the current day reads more clearly at a glance.
 * @updated 2026-05-14: Added a parent-controlled schedule lock toggle so bento week rows can disable drag-to-move without changing the surrounding week navigation or quick-action behavior.
 * @updated 2026-05-18: 支持点击循环排期的 Repeat 标签，唤起快捷编辑栏。
 
 * Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  eachDayOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CircleAlert, Flag, SlidersHorizontal } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Log, TodoCategory, TodoItem } from '../types';
import {
  buildWeekTodoBuckets,
  formatDateKey,
  formatWeekTodoLineTitle,
  getPrimaryTodoScheduleEntryKind,
  TodoDateEntry,
  WeekTodoEntry
} from '../utils/todoScheduleUtils';
import { getColorHexForCharts } from '../utils/colorAdapterUtils';
import {
  getCalendarLunarLabel,
  getCalendarNumberTextStyle,
  useCalendarLunarDisplay,
  useCalendarNumberStyle
} from '../services/calendarNumberStyleService';
import { TodoScheduleTypeColorSettings as TodoScheduleTypeColorSettingsPanel } from './TodoScheduleTypeColorSettings';
import {
  getResolvedTodoScheduleTypeColors,
  todoScheduleColorService,
  type TodoScheduleTypeColorKey,
  type TodoScheduleTypeColorSettings
} from '../services/todoScheduleColorService';

interface TodoBentoWeekViewProps {
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  logs: Log[];
  weekStartDate: Date;
  headerWeekLabel: string;
  isCurrentWeek: boolean;
  onGoToPreviousWeek: () => void;
  onGoToNextWeek: () => void;
  onGoToCurrentWeek: () => void;
  onOpenWeekPicker: () => void;
  onWeekStartChange?: (weekStart: Date) => void;
  onMoveScheduleEntry?: (entry: Pick<TodoDateEntry, 'todo' | 'badges'>, targetDateKey: string) => void;
  onOpenTodo?: (todo: TodoItem) => void;
  onOpenDay?: (dateKey: string) => void;
  isScheduleLocked?: boolean;
  onToggleScheduleLock?: () => void;
  useReducedEffects?: boolean;
  viewMenuNode: React.ReactNode;
}

type BentoDraggableEntry = Pick<WeekTodoEntry, 'todo' | 'badges' | 'parentTitle' | 'dateKey'> & {
  primaryKind: 'deadline' | 'scheduled' | 'maybe';
};

const MINI_WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_CELL_WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const TODO_BENTO_DISPLAY_MODE_STORAGE_KEY = 'todoBentoDisplayMode';
const TODO_BENTO_MARKER_COLOR_MODE_STORAGE_KEY = 'todoBentoMarkerColorMode';
const DEFAULT_BENTO_VISIBLE_ENTRY_COUNT = 4;
const BENTO_ENTRY_ROW_HEIGHT = 24;
const BENTO_ENTRY_GAP = 6;
const BENTO_WEEK_SWIPE_LOCK_DISTANCE = 18;
const BENTO_WEEK_SWIPE_TRIGGER_DISTANCE = 112;
const BENTO_WEEK_SWIPE_DOMINANCE_RATIO = 1.6;
const TODO_DISPLAY_POPUP_MAX_HEIGHT = 'min(calc(100vh - 14rem - env(safe-area-inset-bottom)), 42rem)';
const TODO_BENTO_DISPLAY_MODE_OPTIONS = [
  { key: 'single', label: '单页' },
  { key: 'all', label: '全部' }
] as const;
const TODO_BENTO_MARKER_COLOR_OPTIONS = [
  { key: 'schedule', label: '按排期类型' },
  { key: 'category', label: '按任务分类' }
] as const;
type BentoBadgeKey = 'deadline' | 'scheduled' | 'recurring' | 'maybe' | 'completed' | 'inProgress';
type BentoQuickActionBadgeKey = 'deadline' | 'scheduled' | 'recurring' | 'maybe' | 'completed' | 'inProgress';
type TodoBentoDisplayMode = typeof TODO_BENTO_DISPLAY_MODE_OPTIONS[number]['key'];
type TodoBentoMarkerColorMode = typeof TODO_BENTO_MARKER_COLOR_OPTIONS[number]['key'];

interface BentoBadgeDescriptor {
  key: BentoBadgeKey;
  label: string;
  color: string;
  overdue?: boolean;
}

const getWeekEntryColorKey = (entry: WeekTodoEntry): TodoScheduleTypeColorKey => {
  return getPrimaryTodoScheduleEntryKind(entry.badges);
};

const getMonthGridWeeks = (date: Date): Date[] => eachWeekOfInterval({
  start: startOfWeek(startOfMonth(date), { weekStartsOn: 1 }),
  end: endOfWeek(endOfMonth(date), { weekStartsOn: 1 })
}, {
  weekStartsOn: 1
});

const createDraggableEntry = (entry: WeekTodoEntry): BentoDraggableEntry | null => {
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

const getBentoBadgeDisplayLabel = (badge: BentoBadgeDescriptor, badgeCount: number): string => {
  if (badgeCount <= 1) {
    return badge.label;
  }

  if (badge.key === 'deadline' || badge.key === 'completed') {
    return badge.label;
  }

  return badge.label.slice(0, 3);
};

export const TodoBentoWeekView: React.FC<TodoBentoWeekViewProps> = ({
  todos,
  todoCategories,
  logs,
  weekStartDate,
  headerWeekLabel,
  isCurrentWeek,
  onGoToPreviousWeek,
  onGoToNextWeek,
  onGoToCurrentWeek,
  onOpenWeekPicker,
  onWeekStartChange,
  onMoveScheduleEntry,
  onOpenTodo,
  onOpenDay,
  isScheduleLocked = false,
  onToggleScheduleLock,
  useReducedEffects = false,
  viewMenuNode
}) => {
  const showCalendarLunar = useCalendarLunarDisplay();
  const calendarNumberStyle = useCalendarNumberStyle();
  const today = useMemo(() => new Date(), []);
  const todayDateKey = useMemo(() => formatDateKey(today), [today]);
  const touchDragActivatedRef = useRef(false);
  const touchDraggingEntryRef = useRef<BentoDraggableEntry | null>(null);
  const touchDragTargetDateRef = useRef<string | null>(null);
  const touchDragPointRef = useRef<{ x: number; y: number; title: string } | null>(null);
  const touchDragFrameRef = useRef<number | null>(null);
  const weekSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const weekSwipeAxisRef = useRef<'x' | 'y' | null>(null);
  const weekSwipeEligibleRef = useRef(false);
  const weekSwipeSurfaceRef = useRef<HTMLDivElement | null>(null);
  const dayEntryListRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [draggingTodoId, setDraggingTodoId] = useState<string | null>(null);
  const [draggingEntry, setDraggingEntry] = useState<BentoDraggableEntry | null>(null);
  const [dragTargetDate, setDragTargetDate] = useState<string | null>(null);
  const [touchDragPreview, setTouchDragPreview] = useState<{ x: number; y: number; title: string } | null>(null);
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const [displayMode, setDisplayMode] = useState<TodoBentoDisplayMode>(() => {
    const saved = localStorage.getItem(TODO_BENTO_DISPLAY_MODE_STORAGE_KEY);
    return saved === 'all' ? 'all' : 'single';
  });
  const [markerColorMode, setMarkerColorMode] = useState<TodoBentoMarkerColorMode>(() => {
    const saved = localStorage.getItem(TODO_BENTO_MARKER_COLOR_MODE_STORAGE_KEY);
    return TODO_BENTO_MARKER_COLOR_OPTIONS.some((option) => option.key === saved)
      ? (saved as TodoBentoMarkerColorMode)
      : 'schedule';
  });
  const [scheduleTypeColorSettings, setScheduleTypeColorSettings] = useState<TodoScheduleTypeColorSettings>(() => (
    todoScheduleColorService.getSettings()
  ));
  const [visibleEntryCounts, setVisibleEntryCounts] = useState<Record<string, number>>({});
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false);

  const referenceWeekStart = useMemo(
    () => startOfWeek(weekStartDate, { weekStartsOn: 1 }),
    [weekStartDate]
  );
  const selectedWeekId = useMemo(
    () => formatDateKey(referenceWeekStart),
    [referenceWeekStart]
  );
  const weekDays = useMemo(
    () => eachDayOfInterval({
      start: referenceWeekStart,
      end: endOfWeek(referenceWeekStart, { weekStartsOn: 1 })
    }),
    [referenceWeekStart]
  );
  const middleDay = weekDays[3] || referenceWeekStart;
  const monthGridWeeks = useMemo(
    () => getMonthGridWeeks(middleDay),
    [middleDay]
  );
  const dueDateKeysInMiniMonth = useMemo(() => {
    const visibleMonthKey = format(middleDay, 'yyyy-MM');

    return new Set(
      todos
        .map((todo) => todo.deadlineDate)
        .filter((deadlineDate): deadlineDate is string => Boolean(deadlineDate && deadlineDate.startsWith(`${visibleMonthKey}-`)))
    );
  }, [middleDay, todos]);
  const isDenseMonthGrid = monthGridWeeks.length >= 6;
  const weekBuckets = useMemo(
    () => buildWeekTodoBuckets(todos, logs, referenceWeekStart),
    [logs, referenceWeekStart, todos]
  );
  const todoCategoryColorMap = useMemo(
    () => new Map(todoCategories.map((category) => [category.id, getColorHexForCharts(category.color || '')])),
    [todoCategories]
  );
  const resolvedScheduleTypeColors = useMemo(
    () => getResolvedTodoScheduleTypeColors(scheduleTypeColorSettings),
    [scheduleTypeColorSettings]
  );

  useEffect(() => {
    localStorage.setItem(TODO_BENTO_DISPLAY_MODE_STORAGE_KEY, displayMode);
  }, [displayMode]);

  useEffect(() => {
    localStorage.setItem(TODO_BENTO_MARKER_COLOR_MODE_STORAGE_KEY, markerColorMode);
  }, [markerColorMode]);

  useLayoutEffect(() => {
    if (displayMode !== 'single' || typeof ResizeObserver === 'undefined') {
      return;
    }

    const updateCountForDate = (dateKey: string, element: HTMLDivElement) => {
      const nextCount = Math.max(
        1,
        Math.floor((element.clientHeight + BENTO_ENTRY_GAP) / (BENTO_ENTRY_ROW_HEIGHT + BENTO_ENTRY_GAP))
      );

      setVisibleEntryCounts((current) => (
        current[dateKey] === nextCount
          ? current
          : {
              ...current,
              [dateKey]: nextCount
            }
      ));
    };

    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const target = entry.target as HTMLDivElement;
        const dateKey = target.dataset.bentoEntryDate;
        if (!dateKey) {
          return;
        }

        updateCountForDate(dateKey, target);
      });
    });

    Object.entries(dayEntryListRefs.current).forEach(([dateKey, element]) => {
      if (!element) {
        return;
      }

      updateCountForDate(dateKey, element);
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [displayMode, selectedWeekId, weekBuckets]);

  const commitDrop = (targetDateKey: string, entry: BentoDraggableEntry | null) => {
    if (isScheduleLocked || !entry || !onMoveScheduleEntry) {
      return;
    }

    onMoveScheduleEntry(entry, targetDateKey);
  };

  const handleEntryBadgeClick = (
    entry: WeekTodoEntry,
    badgeKey: BentoQuickActionBadgeKey
  ) => {
    if (badgeKey === 'deadline' || badgeKey === 'scheduled' || badgeKey === 'recurring' || badgeKey === 'maybe' || badgeKey === 'completed' || badgeKey === 'inProgress') {
      onOpenTodo?.(entry.todo);
    }
  };

  const getEntryMarkerColor = (entry: WeekTodoEntry): string => {
    const scheduleTypeColor = resolvedScheduleTypeColors[getWeekEntryColorKey(entry)];
    if (markerColorMode === 'category') {
      return todoCategoryColorMap.get(entry.todo.categoryId) || scheduleTypeColor;
    }

    return scheduleTypeColor;
  };

  const resetDragState = () => {
    setDraggingTodoId(null);
    setDraggingEntry(null);
    setDragTargetDate(null);
    setTouchDragPreview(null);
    setIsTouchDragging(false);
    touchDragActivatedRef.current = false;
    touchDraggingEntryRef.current = null;
    touchDragTargetDateRef.current = null;
    touchDragPointRef.current = null;
    if (touchDragFrameRef.current !== null) {
      window.cancelAnimationFrame(touchDragFrameRef.current);
      touchDragFrameRef.current = null;
    }
  };

  const handleDesktopDragStart = (entry: WeekTodoEntry, event: React.DragEvent<HTMLDivElement>) => {
    if (isScheduleLocked) {
      return;
    }

    const nextDraggingEntry = createDraggableEntry(entry);
    if (!nextDraggingEntry) {
      return;
    }

    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', entry.todo.id);
    setDraggingTodoId(entry.todo.id);
    setDraggingEntry(nextDraggingEntry);
  };

  const resolveDropDateFromPoint = (clientX: number, clientY: number): string | null => {
    const targetElement = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const dropTarget = targetElement?.closest('[data-bento-drop-date]') as HTMLElement | null;
    return dropTarget?.dataset.bentoDropDate || null;
  };

  const flushTouchDragPreview = () => {
    const point = touchDragPointRef.current;
    if (!point) {
      touchDragFrameRef.current = null;
      return;
    }

    const nextDate = resolveDropDateFromPoint(point.x, point.y);
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

  const handleTouchDragStart = (entry: WeekTodoEntry, event: React.TouchEvent<HTMLDivElement>) => {
    if (isScheduleLocked) {
      return;
    }

    const nextDraggingEntry = createDraggableEntry(entry);
    const touch = event.touches[0];

    if (!nextDraggingEntry || !touch) {
      return;
    }

    setDraggingTodoId(entry.todo.id);
    setDraggingEntry(nextDraggingEntry);
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
    touchDraggingEntryRef.current = nextDraggingEntry;
    touchDragTargetDateRef.current = null;
  };

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

      event.preventDefault();
      queueTouchDragPreviewUpdate({
        x: touch.clientX,
        y: touch.clientY,
        title: activeEntry.todo.title
      });
    };

    const handleWindowTouchEnd = () => {
      if (!touchDragActivatedRef.current) {
        return;
      }

      const activeEntry = touchDraggingEntryRef.current;
      const targetDate = touchDragTargetDateRef.current;

      if (targetDate && activeEntry) {
        commitDrop(targetDate, activeEntry);
      }

      resetDragState();
    };

    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);
    window.addEventListener('touchcancel', handleWindowTouchEnd);

    return () => {
      if (touchDragFrameRef.current !== null) {
        window.cancelAnimationFrame(touchDragFrameRef.current);
        touchDragFrameRef.current = null;
      }
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchEnd);
    };
  }, [isTouchDragging]);

  useEffect(() => {
    if (!isScheduleLocked) {
      return;
    }

    resetDragState();
  }, [isScheduleLocked]);

  const navigateToWeekStart = (weekStart: Date) => {
    if (!onWeekStartChange) {
      return;
    }

    onWeekStartChange(startOfWeek(weekStart, { weekStartsOn: 1 }));
  };

  const resetWeekSwipeGesture = () => {
    weekSwipeStartRef.current = null;
    weekSwipeAxisRef.current = null;
    weekSwipeEligibleRef.current = false;
  };

  const shouldIgnoreWeekSwipeTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return Boolean(
      target.closest('[data-bento-week-swipe-ignore="true"], button, a, input, textarea, select, [role="button"]')
    );
  };

  const handleBentoWeekTouchStart = (event: TouchEvent) => {
    if (touchDragActivatedRef.current || event.touches.length !== 1) {
      resetWeekSwipeGesture();
      return;
    }

    if (shouldIgnoreWeekSwipeTarget(event.target)) {
      resetWeekSwipeGesture();
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      resetWeekSwipeGesture();
      return;
    }

    weekSwipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY
    };
    weekSwipeAxisRef.current = null;
    weekSwipeEligibleRef.current = true;
  };

  const handleBentoWeekTouchMove = (event: TouchEvent) => {
    const swipeStart = weekSwipeStartRef.current;
    if (!weekSwipeEligibleRef.current || !swipeStart) {
      return;
    }

    if (touchDragActivatedRef.current || event.touches.length !== 1) {
      resetWeekSwipeGesture();
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    const deltaX = touch.clientX - swipeStart.x;
    const deltaY = touch.clientY - swipeStart.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (weekSwipeAxisRef.current === null) {
      if (absDeltaX < BENTO_WEEK_SWIPE_LOCK_DISTANCE && absDeltaY < BENTO_WEEK_SWIPE_LOCK_DISTANCE) {
        return;
      }

      weekSwipeAxisRef.current = absDeltaX > absDeltaY * BENTO_WEEK_SWIPE_DOMINANCE_RATIO ? 'x' : 'y';
    }

    if (weekSwipeAxisRef.current === 'x') {
      event.preventDefault();
    }
  };

  const handleBentoWeekTouchEnd = (event: TouchEvent) => {
    const swipeStart = weekSwipeStartRef.current;
    if (!weekSwipeEligibleRef.current || !swipeStart || touchDragActivatedRef.current) {
      resetWeekSwipeGesture();
      return;
    }

    const touch = event.changedTouches[0];
    if (!touch) {
      resetWeekSwipeGesture();
      return;
    }

    const deltaX = touch.clientX - swipeStart.x;
    const deltaY = touch.clientY - swipeStart.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    const shouldSwitchWeek = absDeltaX >= BENTO_WEEK_SWIPE_TRIGGER_DISTANCE
      && absDeltaX > absDeltaY * BENTO_WEEK_SWIPE_DOMINANCE_RATIO;

    if (shouldSwitchWeek) {
      event.preventDefault();
      if (deltaX > 0) {
        onGoToPreviousWeek();
      } else {
        onGoToNextWeek();
      }
    }

    resetWeekSwipeGesture();
  };

  useEffect(() => {
    const surface = weekSwipeSurfaceRef.current;
    if (!surface) {
      return;
    }

    surface.addEventListener('touchstart', handleBentoWeekTouchStart);
    surface.addEventListener('touchmove', handleBentoWeekTouchMove, { passive: false });
    surface.addEventListener('touchend', handleBentoWeekTouchEnd);
    surface.addEventListener('touchcancel', resetWeekSwipeGesture);

    return () => {
      surface.removeEventListener('touchstart', handleBentoWeekTouchStart);
      surface.removeEventListener('touchmove', handleBentoWeekTouchMove);
      surface.removeEventListener('touchend', handleBentoWeekTouchEnd);
      surface.removeEventListener('touchcancel', resetWeekSwipeGesture);
    };
  }, [selectedWeekId, onGoToNextWeek, onGoToPreviousWeek]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 w-full">
      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-transparent">
        <div className={`flex min-h-0 flex-1 flex-col ${isDisplaySettingsOpen ? 'pointer-events-none blur-[6px] opacity-90' : ''}`}>
          <div className="shrink-0 border-b border-stone-300/70">
            <div className="flex h-14 items-center justify-between gap-3 px-3 md:px-5">
              <div className="flex min-w-0 items-center gap-2 text-slate-500">
                <button
                  type="button"
                  onClick={onGoToPreviousWeek}
                  className="rounded-full p-1.5 transition-colors hover:bg-white/60 hover:text-slate-700"
                  title="上一周"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  onClick={onOpenWeekPicker}
                  className="rounded-full px-2 py-1 text-[13px] tracking-[0.16em] text-slate-500 transition-colors hover:bg-white/60 hover:text-slate-700"
                  title="跳到某一天"
                >
                  {headerWeekLabel}
                </button>
                <button
                  type="button"
                  onClick={onGoToNextWeek}
                  className="rounded-full p-1.5 transition-colors hover:bg-white/60 hover:text-slate-700"
                  title="下一周"
                >
                  <ChevronRight size={15} />
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onGoToCurrentWeek}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] tracking-[0.14em] transition-colors ${
                    isCurrentWeek
                      ? 'bg-stone-100 text-slate-600'
                      : 'text-slate-400 hover:bg-white/50 hover:text-slate-600'
                  }`}
                >
                  本周
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
                  onClick={() => setIsDisplaySettingsOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/60 hover:text-slate-700"
                  title="Display settings"
                  aria-label="Display settings"
                  aria-expanded={isDisplaySettingsOpen}
                >
                  <SlidersHorizontal size={14} />
                </button>
                {viewMenuNode}
              </div>
            </div>
          </div>

          <div className={`min-h-0 min-w-0 flex-1 touch-pan-y overscroll-contain ${displayMode === 'all' ? 'overflow-y-auto no-scrollbar' : 'overflow-hidden'}`}>
            <div
              ref={weekSwipeSurfaceRef}
              key={selectedWeekId}
              data-week-id={selectedWeekId}
              className={`grid min-w-full grid-cols-2 ${displayMode === 'all' ? 'min-h-full' : 'h-full'} grid-rows-4`}
              style={displayMode === 'all' ? { gridTemplateRows: 'repeat(4, minmax(10rem, auto))' } : undefined}
            >
              <div
                data-bento-week-swipe-ignore="true"
                className="flex min-h-0 flex-col overflow-hidden border-b border-r border-stone-200/80 bg-transparent p-2 md:p-3"
              >
                <div className={`shrink-0 text-center font-bold uppercase tracking-[0.24em] text-stone-400 ${isDenseMonthGrid ? 'mb-1 text-[0.52rem] md:text-[0.58rem]' : 'mb-1.5 text-[0.58rem] md:mb-2 md:text-[0.65rem]'}`}>
                  {format(middleDay, 'MMMM')}
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className={`shrink-0 grid grid-cols-7 text-center uppercase tracking-[0.18em] text-stone-400 ${isDenseMonthGrid ? 'mb-0.5 text-[0.45rem] md:text-[0.5rem]' : 'mb-1 text-[0.5rem] md:text-[0.55rem]'}`}>
                    {MINI_WEEKDAY_LABELS.map((label, index) => (
                      <div key={`${selectedWeekId}-mini-head-${index}`}>
                        {label}
                      </div>
                    ))}
                  </div>

                  <div className={`flex min-h-0 flex-1 flex-col justify-between overflow-hidden ${isDenseMonthGrid ? 'gap-0' : 'gap-0.5'}`}>
                    {monthGridWeeks.map((monthWeekStart) => {
                      const rowDays = eachDayOfInterval({
                        start: monthWeekStart,
                        end: endOfWeek(monthWeekStart, { weekStartsOn: 1 })
                      });
                      const isSelectedWeek = selectedWeekId === formatDateKey(monthWeekStart);

                      return (
                        <button
                          key={`${selectedWeekId}-mini-week-${monthWeekStart.toISOString()}`}
                          type="button"
                          onClick={() => navigateToWeekStart(monthWeekStart)}
                          className={`grid flex-1 min-h-0 grid-cols-7 items-center rounded px-0.5 text-center transition-colors ${
                            isSelectedWeek ? 'bg-stone-200/80 text-stone-700' : 'text-stone-500 hover:bg-stone-100'
                          }`}
                        >
                          {rowDays.map((day) => {
                            const isCurrentMonth = isSameMonth(day, middleDay);
                            const isTodayCell = isToday(day);
                            const dateKey = formatDateKey(day);
                            const hasDeadline = isCurrentMonth && dueDateKeysInMiniMonth.has(dateKey);

                            return (
                              <div
                                key={`${selectedWeekId}-${day.toISOString()}`}
                                className={`flex min-h-0 flex-col items-center justify-center ${
                                  isDenseMonthGrid ? 'text-[0.47rem] md:text-[0.54rem]' : 'text-[0.53rem] md:text-[0.6rem]'
                                } ${
                                  !isCurrentMonth
                                    ? 'opacity-25'
                                    : isTodayCell
                                      ? 'font-bold text-stone-800'
                                      : ''
                                }`}
                              >
                                {hasDeadline ? (
                                  <Flag
                                    size={isDenseMonthGrid ? 7 : 8}
                                    className="shrink-0"
                                    style={{ fill: 'currentColor' }}
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <span className="leading-none">
                                    {format(day, 'd')}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {weekDays.map((day, dayIndex) => {
                const dateKey = formatDateKey(day);
                const entries = weekBuckets[dayIndex]?.items || [];
                const isTodayCell = dateKey === todayDateKey;
                const gridIndex = dayIndex + 1;
                const isLeftColumn = gridIndex % 2 === 0;
                const weekdayLabel = DAY_CELL_WEEKDAY_LABELS[dayIndex] || format(day, 'EEE').toUpperCase();

                return (
                  <div
                    key={`${selectedWeekId}-${dateKey}`}
                    data-bento-drop-date={dateKey}
                    className={`relative flex min-h-0 flex-col ${displayMode === 'all' ? 'overflow-visible' : 'overflow-hidden'} border-b border-stone-200/80 bg-transparent p-2 transition-colors md:p-3 ${
                      isLeftColumn ? 'border-r border-stone-200/80' : ''
                    } ${
                      isTodayCell ? 'z-10 ring-1 ring-inset ring-stone-400' : ''
                    } ${
                      dragTargetDate === dateKey ? 'bg-stone-100/30' : ''
                    }`}
                    onDragOver={(event) => {
                      if (isScheduleLocked || !draggingEntry) {
                        return;
                      }

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
                      commitDrop(dateKey, draggingEntry);
                      resetDragState();
                    }}
                  >
                        <button
                          type="button"
                          onClick={() => onOpenDay?.(dateKey)}
                          data-bento-week-swipe-ignore="true"
                          className="mb-2 flex items-start justify-between gap-2 text-left"
                        >
                          <span className="flex items-center gap-1">
                            <span
                              className={`text-[1.55rem] italic leading-none md:text-[1.95rem] ${
                                isTodayCell ? 'text-stone-900' : 'text-stone-800'
                              }`}
                              style={getCalendarNumberTextStyle(calendarNumberStyle)}
                            >
                              {format(day, 'dd')}
                            </span>
                            {showCalendarLunar && (
                              <span className="text-[9px] leading-none text-stone-400">
                                {getCalendarLunarLabel(day)}
                              </span>
                            )}
                          </span>
                          <span className="text-[0.52rem] font-bold uppercase tracking-[0.18em] text-stone-400 md:text-[0.6rem]">
                            {weekdayLabel}
                          </span>
                        </button>

                        <div
                          ref={(element) => {
                            dayEntryListRefs.current[dateKey] = element;
                      }}
                      data-bento-entry-date={dateKey}
                      className={`flex min-h-0 flex-1 flex-col gap-1.5 pr-1 ${displayMode === 'all' ? 'overflow-visible pb-1' : 'overflow-hidden'}`}
                        >
                          {(displayMode === 'single'
                            ? entries.slice(0, Math.max(1, visibleEntryCounts[dateKey] ?? DEFAULT_BENTO_VISIBLE_ENTRY_COUNT))
                            : entries
                          ).map((entry) => {
                        const markerColor = getEntryMarkerColor(entry);
                            const draggable = !isScheduleLocked && Boolean(entry.badges.deadline || entry.badges.scheduled || entry.badges.maybe);
                            const fullTitle = formatWeekTodoLineTitle(entry);
                            const completedDateKey = entry.todo.completedAt ? formatDateKey(new Date(entry.todo.completedAt)) : null;
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
                            const orderedBadges = [
                              entry.badges.deadline ? { key: 'deadline', label: 'Due', color: '#8f6f6b', overdue: isDeadlineOverdue } : null,
                              entry.badges.scheduled ? { key: 'scheduled', label: 'Arrange', color: '#7c8b97', overdue: isScheduledOverdue } : null,
                              entry.badges.recurring ? { key: 'recurring', label: 'Repeat', color: '#8b8f79' } : null,
                              entry.badges.maybe ? { key: 'maybe', label: 'Maybe', color: '#a58863' } : null,
                              entry.badges.completed ? { key: 'completed', label: 'Done', color: '#7f8c84' } : null,
                              entry.badges.inProgress ? { key: 'inProgress', label: 'Trace', color: '#8b8096' } : null
                            ].filter(Boolean) as BentoBadgeDescriptor[];
                            const hasMultipleBadges = orderedBadges.length > 1;

                            return (
                              <div
                                key={`${dateKey}-${entry.todo.id}`}
                                className={`group flex items-center gap-2 ${
                                  draggingTodoId === entry.todo.id ? 'opacity-40' : ''
                                }`}
                              >
                                <span
                                  className="mt-[0.15rem] h-5 shrink-0 border-l-[1.5px]"
                                  style={{ borderLeftColor: markerColor }}
                                />
                                <div
                                  data-bento-week-swipe-ignore={draggable ? 'true' : undefined}
                                  draggable={draggable}
                                  onDragStart={(event) => draggable && handleDesktopDragStart(entry, event)}
                                  onDragEnd={resetDragState}
                                  onTouchStart={(event) => draggable && handleTouchDragStart(entry, event)}
                                  className={`min-w-0 flex-1 text-left ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                >
                                  <div className="truncate text-[0.78rem] font-medium uppercase leading-5 text-stone-900 md:text-[0.82rem]" title={fullTitle}>
                                    <span>{entry.todo.title}</span>
                                    {entry.parentTitle && (
                                      <span className="text-stone-400">{` @${entry.parentTitle}`}</span>
                                    )}
                                  </div>
                                </div>
                                <div className={`shrink-0 self-center flex items-center justify-end gap-1 whitespace-nowrap text-[9px] uppercase leading-none ${hasMultipleBadges ? 'tracking-[0.08em]' : 'tracking-[0.16em]'}`}>
                                  {orderedBadges.map((badge) => (
                                    badge.key === 'scheduled' || badge.key === 'deadline' || badge.key === 'recurring' || badge.key === 'maybe' || badge.key === 'completed' || badge.key === 'inProgress' ? (
                                      <button
                                        key={badge.key}
                                        type="button"
                                        onClick={() => handleEntryBadgeClick(entry, badge.key as BentoQuickActionBadgeKey)}
                                        data-bento-week-swipe-ignore="true"
                                        className="inline-flex cursor-pointer items-center justify-end gap-1 rounded-full px-1 py-0.5 text-right transition-colors hover:bg-stone-100/70"
                                        style={{ color: badge.color }}
                                      >
                                        {badge.overdue && <CircleAlert size={10} className="-translate-y-px shrink-0 text-red-500" />}
                                        <span>{getBentoBadgeDisplayLabel(badge, hasMultipleBadges ? orderedBadges.length : 1)}</span>
                                      </button>
                                    ) : (
                                      <span
                                        key={badge.key}
                                        className="inline-flex items-center justify-end gap-1 whitespace-nowrap text-right"
                                        style={{ color: badge.color }}
                                      >
                                        {badge.overdue && <CircleAlert size={10} className="-translate-y-px shrink-0 text-red-500" />}
                                        <span>{getBentoBadgeDisplayLabel(badge, hasMultipleBadges ? orderedBadges.length : 1)}</span>
                                      </span>
                                    )
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {displayMode === 'single' && (() => {
                          const visibleCount = entries.length > 0
                            ? Math.max(1, visibleEntryCounts[dateKey] ?? DEFAULT_BENTO_VISIBLE_ENTRY_COUNT)
                            : 0;
                          const hiddenCount = Math.max(0, entries.length - visibleCount);

                          if (hiddenCount <= 0) {
                            return null;
                          }

                          return (
                            <div className="pointer-events-none absolute bottom-2 right-2 bg-white/52 px-1 py-0.5 text-[0.48rem] font-medium tracking-[0.1em] text-stone-400 md:text-[0.56rem]">
                              {`+${hiddenCount}`}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
            </div>
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
        {isDisplaySettingsOpen && typeof document !== 'undefined' && createPortal(
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
              setIsDisplaySettingsOpen(false);
            }}
          >
            <div
              className="relative w-full max-w-[22rem] overflow-hidden rounded-[2rem] border border-stone-200/80 shadow-[0_12px_30px_rgba(28,25,23,0.12)]"
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
                    显示设置
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsDisplaySettingsOpen(false)}
                    className="rounded-full px-2 py-1.5 text-[0.82rem] text-stone-400 transition-colors hover:bg-stone-100/70 hover:text-stone-600"
                  >
                    关闭
                  </button>
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto px-4 pb-4 pt-4">
              <div className="mb-4">
                <div className="mb-2 text-[0.72rem] font-medium tracking-[0.08em] text-stone-400">
                  显示模式
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {TODO_BENTO_DISPLAY_MODE_OPTIONS.map((option) => {
                    const isSelected = displayMode === option.key;

                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setDisplayMode(option.key)}
                        className={`border-b px-3 pt-2.5 pb-2 text-center text-[14px] tracking-[0.04em] transition-colors ${
                          isSelected
                            ? 'border-slate-800 text-slate-800'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
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
                  颜色类型
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {TODO_BENTO_MARKER_COLOR_OPTIONS.map((option) => {
                    const isSelected = markerColorMode === option.key;

                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setMarkerColorMode(option.key)}
                          className={`border-b px-3 pt-2.5 pb-2 text-center text-[14px] tracking-[0.04em] transition-colors ${
                            isSelected
                              ? 'border-slate-800 text-slate-800'
                              : 'border-transparent text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                  })}
                </div>

                {markerColorMode === 'schedule' && (
                  <TodoScheduleTypeColorSettingsPanel
                    settings={scheduleTypeColorSettings}
                    onChange={(nextSettings) => {
                      setScheduleTypeColorSettings(nextSettings);
                      todoScheduleColorService.saveSettings(nextSettings);
                    }}
                  />
                )}
              </div>
              </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};
