/**
 * @file TodoMonthView.tsx
 * @input Todo items, logs, a reference date, and an optional todo-open callback
 * @output Reference-style rolling month schedule UI backed by real daily todo data
 * @pos Component (Todo scheduling)
 * @description Renders the editorial monthly schedule view adapted from the minimalist demo, using shared todo schedule utilities so each day shows the same real Arrange / Due / Repeat / Done / Trace data as the week planner.
 * @updated 2026-05-10: Expanded month-view rows now append truncated `@父任务` context for subtasks so the monthly detail list matches the week planner's parent-hint treatment.
 * @updated 2026-05-10: Added a top-right `本月` jump action so the month view can quickly snap back to today's month without using the title link or month arrows.
 * @updated 2026-05-10: Replaced the inline month-view settings dropdown with a standalone modal panel so density, font-size, and marker-color controls have more room without crowding the header.
 * @updated 2026-05-10: Month view now opens at today's month, renders the header title as `YYYY.M`, and trims expand-time animation work so tapping a day feels lighter.
 * @updated 2026-05-10: Added a persisted month-row density control beside the view switcher so users can choose 2/3/4/5 visible week rows per screen, and enlarged in-cell task typography for better readability.
 * @updated 2026-05-10: Added draggable expanded-day rows for Arrange and Due items only, including desktop drag/drop plus touch drag with edge auto-scroll so the month view now matches the week planner's editable schedule movement rules.
 * @updated 2026-05-10: Reduced scroll-time visual overhead, enlarged task typography, let each day cell use more of its vertical space with dynamic visible-entry counts, and switched the date numerals to the same smaller Bilbo Swash Caps treatment used by the week planner.
 * @updated 2026-05-10: Added inline schedule-type tags to each expanded day row and lets clickable tags reuse the same quick-edit entry path as the week planner, while keeping recurring tags display-only.
 * @updated 2026-05-10: Removed the boxed white month surfaces so the calendar now runs edge-to-edge and inherits the Todo schedule page's custom background treatment instead of masking it.
 * @updated 2026-05-10: Replaced seeded demo items with shared real daily todo entries, added month-view-only type marker colors, and preserved the continuous rolling grid plus selected-day expansion behavior.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Flag, Repeat2, SlidersHorizontal, TrendingUp } from 'lucide-react';
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
import { Log, TodoCategory, TodoItem } from '../types';
import {
  buildTodoDateEntryMap,
  formatDateKey,
  TodoDateEntry
} from '../utils/todoScheduleUtils';
import { getParentTodo } from '../utils/todoHierarchyUtils';
import { getColorHexForCharts } from '../utils/colorAdapterUtils';

interface TodoMonthViewProps {
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  logs: Log[];
  referenceDate: Date;
  onMoveScheduleEntry?: (entry: TodoDateEntry, targetDateKey: string) => void;
  onOpenDatePicker?: () => void;
  useReducedEffects?: boolean;
  viewMenuNode: React.ReactNode;
  onOpenTodo?: (todo: TodoItem) => void;
}

interface TodoMonthWeek {
  id: string;
  monthKey: string;
  days: Date[];
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_VIEW_ROWS_PER_SCREEN_STORAGE_KEY = 'todoMonthViewRowsPerScreen';
const MONTH_VIEW_FONT_SIZE_STORAGE_KEY = 'todoMonthViewFontSize';
const MONTH_VIEW_MARKER_COLOR_MODE_STORAGE_KEY = 'todoMonthViewMarkerColorMode';
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

const MONTH_VIEW_TYPE_COLORS: Record<TodoDateEntry['primaryKind'], string> = {
  scheduled: '#141414',
  deadline: '#c86a4c',
  recurring: '#768252',
  completed: '#a4a09a',
  inProgress: '#60758b'
};

const buildMonthLabelDate = (value: string): Date => {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, 1);
};

const isSameCalendarDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate();

const getMonthEntryLeadingIcon = (entry: TodoDateEntry): React.ReactNode => {
  const { badges } = entry;
  const isHistoricalOnly = !badges.scheduled && !badges.deadline && !badges.recurring && (badges.completed || badges.inProgress);
  const iconClassName = isHistoricalOnly ? 'text-stone-300' : 'text-stone-400';

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
  logs,
  referenceDate,
  onMoveScheduleEntry,
  onOpenDatePicker,
  useReducedEffects = false,
  viewMenuNode,
  onOpenTodo
}) => {
  const today = useMemo(() => new Date(), []);
  const todayDateKey = useMemo(() => formatDateKey(today), [today]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const observerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const monthAnchorRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const hasInitialScrollRef = useRef(false);
  const touchDragActivatedRef = useRef(false);
  const touchDraggingEntryRef = useRef<TodoDateEntry | null>(null);
  const touchDragTargetDateRef = useRef<string | null>(null);
  const touchDragPointRef = useRef<{ x: number; y: number; title: string } | null>(null);
  const touchDragFrameRef = useRef<number | null>(null);
  const touchAutoScrollFrameRef = useRef<number | null>(null);
  const touchAutoScrollSpeedRef = useRef(0);
  const desktopAutoScrollIntervalRef = useRef<number | null>(null);
  const [activeMonth, setActiveMonth] = useState<string>(() => format(referenceDate, 'yyyy-MM-01'));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState(600);
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
  const [isDensityMenuOpen, setIsDensityMenuOpen] = useState(false);
  const [draggingTodoId, setDraggingTodoId] = useState<string | null>(null);
  const [draggingEntry, setDraggingEntry] = useState<TodoDateEntry | null>(null);
  const [dragTargetDate, setDragTargetDate] = useState<string | null>(null);
  const [touchDragPreview, setTouchDragPreview] = useState<{ x: number; y: number; title: string } | null>(null);
  const [isTouchDragging, setIsTouchDragging] = useState(false);

  const weeks = useMemo<TodoMonthWeek[]>(() => {
    const start = startOfWeek(startOfMonth(subMonths(referenceDate, 6)), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(addMonths(referenceDate, 12)), { weekStartsOn: 1 });
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
  }, [referenceDate]);

  const dateKeys = useMemo(
    () => weeks.flatMap((week) => week.days.map((day) => formatDateKey(day))),
    [weeks]
  );
  const entriesByDate = useMemo(
    () => buildTodoDateEntryMap(todos, logs, dateKeys),
    [dateKeys, logs, todos]
  );

  const scrollToWeekContainingDate = (date: Date) => {
    const targetWeek = weeks.find((week) => week.days.some((day) => isSameCalendarDay(day, date)));
    const targetElement = targetWeek ? observerRefs.current[targetWeek.id] : null;

    if (scrollRef.current && targetElement) {
      scrollRef.current.scrollTop = targetElement.offsetTop - (headerRef.current?.offsetHeight || 0);
    }
  };

  const scrollToMonth = (date: Date) => {
    const monthKey = format(startOfMonth(date), 'yyyy-MM-01');
    const targetElement = monthAnchorRefs.current[monthKey];

    if (scrollRef.current && targetElement) {
      scrollRef.current.scrollTop = targetElement.offsetTop - (headerRef.current?.offsetHeight || 0);
      return;
    }

    scrollToWeekContainingDate(date);
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

  const isMonthEntryDraggable = (entry: TodoDateEntry): boolean => Boolean(entry.badges.deadline || entry.badges.scheduled);

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
    if (!entry || !onMoveScheduleEntry) {
      handleMonthItemDragEnd();
      return;
    }

    onMoveScheduleEntry(entry, targetDateKey);
    handleMonthItemDragEnd();
  };

  const handleMonthItemDragStart = (entry: TodoDateEntry, event: React.DragEvent<HTMLDivElement>) => {
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
    if (!draggingEntry) {
      return;
    }

    commitMonthDrop(targetDateKey, draggingEntry);
  };

  const handleMonthContainerDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!draggingEntry || !scrollRef.current) {
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
      if (touchDragFrameRef.current !== null) {
        window.cancelAnimationFrame(touchDragFrameRef.current);
      }
    }
  ), []);

  useEffect(() => {
    if (containerHeight === 0 || hasInitialScrollRef.current) {
      return;
    }

    const currentMonthDate = today;
    scrollToMonth(currentMonthDate);
    setActiveMonth(format(startOfMonth(currentMonthDate), 'yyyy-MM-01'));
    hasInitialScrollRef.current = true;
  }, [containerHeight, today, weeks]);

  useEffect(() => {
    if (!hasInitialScrollRef.current) {
      return;
    }

    scrollToWeekContainingDate(referenceDate);
    setActiveMonth(format(startOfMonth(referenceDate), 'yyyy-MM-01'));
  }, [referenceDate, weeks]);

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
  const selectedDateEntries = useMemo(
    () => (selectedDate ? entriesByDate[selectedDate] || [] : []),
    [entriesByDate, selectedDate]
  );
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
  const getTodoMarkerColor = (entry: TodoDateEntry): string => {
    if (monthMarkerColorMode === 'category') {
      return todoCategoryColorMap.get(entry.todo.categoryId) || MONTH_VIEW_TYPE_COLORS[entry.primaryKind];
    }

    return MONTH_VIEW_TYPE_COLORS[entry.primaryKind];
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={`flex min-h-0 flex-1 flex-col transition-[filter,opacity] duration-200 ${isDensityMenuOpen ? 'pointer-events-none blur-[6px] opacity-90' : ''}`}>
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
              onClick={() => scrollToMonth(today)}
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
              onClick={() => setIsDensityMenuOpen(true)}
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

        <div className="grid grid-cols-7 border-b border-black/90 bg-[rgba(250,249,246,0.16)] py-1.5 text-[0.6rem] font-bold uppercase tracking-widest">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="text-center opacity-40">
              {label}
            </div>
          ))}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto bg-transparent pb-[10vh] no-scrollbar"
        style={{ scrollBehavior: 'smooth' }}
        onDragOver={handleMonthContainerDragOver}
        onDragLeave={stopDesktopAutoScroll}
        onDrop={stopDesktopAutoScroll}
      >
        {weeks.map((week) => {
          const middleDayOfWeek = week.days[3];
          const firstMonthDay = week.days.find((day) => getDate(day) === 1);
          const firstMonthKey = firstMonthDay ? format(startOfMonth(firstMonthDay), 'yyyy-MM-01') : null;

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
              <div className="grid grid-cols-7" style={{ height: `${topRowHeight}px` }}>
                {week.days.map((day) => {
                  const dateKey = formatDateKey(day);
                  const entries = entriesByDate[dateKey] || [];
                  const visibleEntries = entries.slice(0, visibleEntryCount);
                  const hiddenCount = Math.max(0, entries.length - visibleEntries.length);
                  const isCurrentMonth = isSameMonth(day, middleDayOfWeek);
                  const isToday = dateKey === todayDateKey;
                  const isSelected = selectedDate === dateKey;
                  const isFirst = getDate(day) === 1;

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      data-month-drop-date={dateKey}
                      onClick={() => setSelectedDate((previous) => previous === dateKey ? null : dateKey)}
                      onDragOver={(event) => {
                        if (!draggingEntry) return;
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
                        handleMonthDrop(dateKey);
                      }}
                      className={[
                        'relative flex cursor-pointer flex-col border-b border-r border-stone-200/35 px-2 py-1.5 text-left transition-colors duration-200',
                        !isCurrentMonth ? 'bg-[rgba(245,244,240,0.14)] opacity-30' : 'bg-transparent',
                        isToday ? 'z-10 ring-1 ring-inset ring-stone-400' : '',
                        isSelected && !isToday ? 'bg-[rgba(255,255,255,0.22)]' : '',
                        dragTargetDate === dateKey ? 'bg-[rgba(250,249,246,0.32)] ring-2 ring-inset ring-stone-800/75' : ''
                      ].join(' ')}
                    >
                      <div className="flex justify-start">
                        <span
                          className="text-[1.02rem] leading-none text-stone-800"
                          style={{ fontFamily: "'Bilbo Swash Caps', 'Georgia', 'Times New Roman', cursive, serif" }}
                        >
                          {format(day, 'dd')}
                        </span>
                      </div>

                      <div className="mt-1.5 flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                        {visibleEntries.map((entry) => (
                          <div
                            key={`${dateKey}-${entry.todo.id}-${entry.primaryKind}`}
                            className={`truncate border-l-[1.5px] pl-1 font-medium leading-[1.2] text-stone-800 ${monthCellTaskClassName}`}
                            style={{ borderLeftColor: getTodoMarkerColor(entry) }}
                          >
                            {entry.todo.title}
                          </div>
                        ))}

                        {hiddenCount > 0 && (
                          <div className="pl-[7px] pt-0.5 text-[0.53rem] font-bold uppercase tracking-[0.14em] text-stone-300">
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
                    </button>
                  );
                })}
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
                          const isHistoricalOnly = !entry.badges.scheduled && !entry.badges.deadline && !entry.badges.recurring && (entry.badges.completed || entry.badges.inProgress);
                          const titleClassName = isHistoricalOnly ? 'text-stone-400' : 'text-stone-800';
                          const parentTodo = getParentTodo(todos, entry.todo);
                          const parentTitle = parentTodo?.title || null;
                          const parentTitleClassName = isHistoricalOnly ? 'text-stone-300' : 'text-stone-400';
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
                                    <span className={`min-w-0 flex flex-1 items-baseline gap-1 font-medium uppercase tracking-[0.12em] text-left ${monthDetailTaskClassName} ${draggingTodoId === entry.todo.id ? 'cursor-grabbing opacity-40' : 'cursor-grab active:cursor-grabbing'} ${titleClassName}`}>
                                      <span className="shrink-0">{entry.todo.title}</span>
                                      {parentTitle && (
                                        <span className={`min-w-0 flex-1 truncate ${parentTitleClassName}`}>{` @${parentTitle}`}</span>
                                      )}
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => onOpenTodo(entry.todo)}
                                      className={`min-w-0 flex flex-1 items-baseline gap-1 font-medium uppercase tracking-[0.12em] text-left ${monthDetailTaskClassName} ${titleClassName}`}
                                    >
                                      <span className="shrink-0">{entry.todo.title}</span>
                                      {parentTitle && (
                                        <span className={`min-w-0 flex-1 truncate ${parentTitleClassName}`}>{` @${parentTitle}`}</span>
                                      )}
                                    </button>
                                  )}
                                  <div className={`flex shrink-0 flex-wrap items-center justify-end gap-1 whitespace-nowrap text-[9px] uppercase leading-none ${activeTagCount > 1 ? 'tracking-[0.08em]' : 'tracking-[0.16em]'}`}>
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
                                <span className={`min-w-0 flex flex-1 items-baseline gap-1 font-medium uppercase tracking-[0.12em] ${monthDetailTaskClassName} ${titleClassName}`}>
                                  <span className="shrink-0">{entry.todo.title}</span>
                                  {parentTitle && (
                                    <span className={`min-w-0 flex-1 truncate ${parentTitleClassName}`}>{` @${parentTitle}`}</span>
                                  )}
                                </span>
                                <div className={`flex shrink-0 flex-wrap items-center justify-end gap-1 whitespace-nowrap text-[9px] uppercase leading-none ${activeTagCount > 1 ? 'tracking-[0.08em]' : 'tracking-[0.16em]'}`}>
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
      {touchDragPreview && (
        <div
          className="pointer-events-none fixed z-[140] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-stone-200 bg-white/92 px-3 py-2 text-sm text-stone-700 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
          style={{ left: touchDragPreview.x, top: touchDragPreview.y }}
        >
          <div className="max-w-[12rem] truncate">{touchDragPreview.title}</div>
        </div>
      )}
      </div>
      {isDensityMenuOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(15,23,42,0.16)] px-4 py-8"
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
            setIsDensityMenuOpen(false);
          }}
        >
          <div
            className="w-full max-w-[24rem] overflow-hidden rounded-[2rem] border border-stone-200 bg-[#faf9f6] shadow-[0_26px_70px_rgba(15,23,42,0.14)]"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="max-h-[min(82vh,42rem)] overflow-y-auto p-4">
            <div className="mb-4 flex items-center justify-between border-b border-stone-200/80 pb-3">
              <span className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-stone-500">
                月视图设置
              </span>
              <button
                type="button"
                onClick={() => setIsDensityMenuOpen(false)}
                className="text-[0.72rem] tracking-[0.12em] text-stone-400 transition-colors hover:text-stone-600"
              >
                关闭
              </button>
            </div>

            <div className="mb-4">
              <div className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-stone-400">
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
                      className={`rounded-xl px-3 py-2 text-left text-[12px] tracking-[0.08em] transition-colors ${
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
              <div className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-stone-400">
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
                      className={`rounded-xl px-3 py-2 text-center text-[12px] tracking-[0.08em] transition-colors ${
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
              <div className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-stone-400">
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
                      className={`rounded-xl px-3 py-2 text-center text-[12px] tracking-[0.08em] transition-colors ${
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
