/**
 * @file TodoBentoWeekView.tsx
 * @input Todo items, logs, one parent-owned week start, and schedule interaction callbacks
 * @output Single-week 2x4 bento schedule UI backed by real todo data
 * @pos Component (Todo scheduling)
 * @description Renders one selected week at a time in the bento layout so the mini calendar, header range, and visible day cells always describe the same week.
 * @updated 2026-05-11: Added a shared default/custom schedule-type color editor to the display popup so Arrange / Due / Repeat / Done / Trace colors can be customized whenever marker coloring follows schedule type.
 * @updated 2026-05-11: Removed the background blur transition from the display-settings open state so the softened calendar and popup appear on the same frame.
 * @updated 2026-05-11: Aligned the display-settings popup glass treatment and control sizing with the schedule shortcut menu so blur strength, fill, and typography now match.
 * @updated 2026-05-11: Added a dedicated full-screen blur scrim behind the display-settings popup and made the card fill more opaque so the wallpaper stays soft without making the text glow.
 * @updated 2026-05-11: Moved the display-settings frosted blur onto the popup card background layer so Android/WebView no longer adds a false glow to popup text and buttons.
 * @updated 2026-05-10: Added `单页 / 全部` bento display modes, per-cell visible-entry limits with `+N` overflow badges, and an all-items layout that expands row heights so every task in the selected week can be rendered.
 * @updated 2026-05-10: Replaced the unstable multi-page horizontal week strip with a single-week bento renderer so mini-calendar taps, header navigation, and rendered tasks stay locked to one parent-owned Monday `weekStart`.
 * @updated 2026-05-10: Rebuilt bento week navigation around one parent-owned Monday `weekStart` so the header, week picker, and mini-calendar stop competing with each other.
 * @updated 2026-05-10: Removed the top-left shortcut footer buttons so the mini calendar can use the full cell height without extra footer controls.
 *
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
import { ChevronLeft, ChevronRight, CircleAlert, SlidersHorizontal } from 'lucide-react';
import { Log, TodoCategory, TodoItem } from '../types';
import {
  buildWeekTodoBuckets,
  formatDateKey,
  formatWeekTodoLineTitle,
  TodoDateEntry,
  WeekTodoEntry
} from '../utils/todoScheduleUtils';
import { getColorHexForCharts } from '../utils/colorAdapterUtils';
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
  useReducedEffects?: boolean;
  viewMenuNode: React.ReactNode;
}

type BentoDraggableEntry = Pick<WeekTodoEntry, 'todo' | 'badges' | 'parentTitle'> & {
  primaryKind: 'deadline' | 'scheduled';
};

const MINI_WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_CELL_WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const TODO_BENTO_DISPLAY_MODE_STORAGE_KEY = 'todoBentoDisplayMode';
const TODO_BENTO_MARKER_COLOR_MODE_STORAGE_KEY = 'todoBentoMarkerColorMode';
const DEFAULT_BENTO_VISIBLE_ENTRY_COUNT = 4;
const BENTO_ENTRY_ROW_HEIGHT = 24;
const BENTO_ENTRY_GAP = 6;
const TODO_BENTO_DISPLAY_MODE_OPTIONS = [
  { key: 'single', label: '单页' },
  { key: 'all', label: '全部' }
] as const;
const TODO_BENTO_MARKER_COLOR_OPTIONS = [
  { key: 'schedule', label: '按排期类型' },
  { key: 'category', label: '按任务分类' }
] as const;
type BentoBadgeKey = 'deadline' | 'scheduled' | 'recurring' | 'completed' | 'inProgress';
type BentoQuickActionBadgeKey = 'deadline' | 'scheduled' | 'completed' | 'inProgress';
type TodoBentoDisplayMode = typeof TODO_BENTO_DISPLAY_MODE_OPTIONS[number]['key'];
type TodoBentoMarkerColorMode = typeof TODO_BENTO_MARKER_COLOR_OPTIONS[number]['key'];

interface BentoBadgeDescriptor {
  key: BentoBadgeKey;
  label: string;
  color: string;
  overdue?: boolean;
}

const getWeekEntryColorKey = (entry: WeekTodoEntry): TodoScheduleTypeColorKey => {
  if (entry.badges.deadline) return 'deadline';
  if (entry.badges.scheduled) return 'scheduled';
  if (entry.badges.recurring) return 'recurring';
  if (entry.badges.completed) return 'completed';
  return 'inProgress';
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
        completed: false,
        inProgress: false
      },
      primaryKind: 'scheduled'
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
  useReducedEffects = false,
  viewMenuNode
}) => {
  const today = useMemo(() => new Date(), []);
  const todayDateKey = useMemo(() => formatDateKey(today), [today]);
  const touchDragActivatedRef = useRef(false);
  const touchDraggingEntryRef = useRef<BentoDraggableEntry | null>(null);
  const touchDragTargetDateRef = useRef<string | null>(null);
  const touchDragPointRef = useRef<{ x: number; y: number; title: string } | null>(null);
  const touchDragFrameRef = useRef<number | null>(null);
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
    if (!entry || !onMoveScheduleEntry) {
      return;
    }

    onMoveScheduleEntry(entry, targetDateKey);
  };

  const handleEntryBadgeClick = (
    entry: WeekTodoEntry,
    badgeKey: BentoQuickActionBadgeKey
  ) => {
    if (badgeKey === 'deadline' || badgeKey === 'scheduled' || badgeKey === 'completed' || badgeKey === 'inProgress') {
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

  const navigateToWeekStart = (weekStart: Date) => {
    if (!onWeekStartChange) {
      return;
    }

    onWeekStartChange(startOfWeek(weekStart, { weekStartsOn: 1 }));
  };

  return (
    <div className="flex min-h-0 flex-1 w-full">
      <div className="relative flex min-h-0 flex-1 overflow-hidden bg-transparent">
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

          <div className={`min-h-0 flex-1 ${displayMode === 'all' ? 'overflow-y-auto no-scrollbar' : 'overflow-hidden'}`}>
            <div
              key={selectedWeekId}
              data-week-id={selectedWeekId}
              className={`grid min-w-full grid-cols-2 ${displayMode === 'all' ? 'min-h-full' : 'h-full'} grid-rows-4`}
              style={displayMode === 'all' ? { gridTemplateRows: 'repeat(4, minmax(10rem, auto))' } : undefined}
            >
              <div className="flex min-h-0 flex-col overflow-hidden border-b border-r border-stone-200/80 bg-transparent p-2 md:p-3">
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

                            return (
                              <div
                                key={`${selectedWeekId}-${day.toISOString()}`}
                                className={`${isDenseMonthGrid ? 'text-[0.47rem] leading-none md:text-[0.54rem]' : 'text-[0.53rem] leading-none md:text-[0.6rem]'} ${
                                  !isCurrentMonth
                                    ? 'opacity-25'
                                    : isTodayCell
                                      ? 'font-bold text-stone-800'
                                      : ''
                                }`}
                              >
                                {format(day, 'd')}
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
                      dragTargetDate === dateKey ? 'bg-stone-100/30' : ''
                    }`}
                    onDragOver={(event) => {
                      if (!draggingEntry) {
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
                      commitDrop(dateKey, draggingEntry);
                      resetDragState();
                    }}
                  >
                        <button
                          type="button"
                          onClick={() => onOpenDay?.(dateKey)}
                          className="mb-2 flex items-start justify-between gap-2 text-left"
                        >
                          <span
                            className={`text-[1.55rem] italic leading-none md:text-[1.95rem] ${
                              isTodayCell ? 'text-stone-900' : 'text-stone-800'
                            }`}
                            style={{ fontFamily: "'Bilbo Swash Caps', 'Georgia', 'Times New Roman', cursive, serif" }}
                      >
                        {format(day, 'dd')}
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
                            const draggable = entry.badges.deadline || entry.badges.scheduled;
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
                                    badge.key === 'scheduled' || badge.key === 'deadline' || badge.key === 'completed' || badge.key === 'inProgress' ? (
                                      <button
                                        key={badge.key}
                                        type="button"
                                        onClick={() => handleEntryBadgeClick(entry, badge.key)}
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
        {isDisplaySettingsOpen && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-8"
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
              <div className="relative z-10 max-h-[min(82vh,42rem)] overflow-y-auto p-4">
              <div className="mb-4 flex items-center justify-between border-b border-stone-200/80 pb-3">
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
        )}
      </div>
    </div>
  );
};
