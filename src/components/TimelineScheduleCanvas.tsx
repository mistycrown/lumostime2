/**
 * @file TimelineScheduleCanvas.tsx
 * @input Selected date, logs, categories, scopes, todos, quick-color selection, and record mutation callbacks
 * @output A full-day scrollable schedule canvas with actionable idle-time gaps, plan drops, quick-color record creation, editable time bounds, and touch pinch zoom
 * @pos Component
 * @description Positions real records and virtual planning blocks on a 00:00-24:00 time grid for the Chronicle split layout.
 * @updated 2026-08-13: Hides notes while a time block is being edited so long text cannot extend beyond its bounds.
 * @updated 2026-08-06: Lets larger blocks show full multiline notes while keeping shorter blocks on a single truncated line.
 * @updated 2026-07-31: Prevents locked recurring auto-Plan blocks from entering long-press time editing or drag/resize adjustment.
 * @updated 2026-07-30: Displays compact two-digit hour-only grid labels while preserving full block start/end times.
 * @updated 2026-07-30: Locks recurring auto-Plan deletion while the source Repeat todo still has auto generation enabled.
 * @updated 2026-07-30: Added quick-color range dragging plus direct 30-minute activity drops for formal record creation.
 * @updated 2026-07-30: Makes record taps more reliable by using a single pointer-up detail path and a longer edit long-press.
 * @updated 2026-07-30: Lets edited schedule blocks drag their middle body to move the whole range while keeping edge handles independent.
 * @updated 2026-07-30: Locks edit-mode taps to the active block and suppresses pinch-zoom release taps from reopening record detail.
 * @updated 2026-07-30: Restores a guarded click fallback so still taps open block detail without requiring pointer movement.
 * @updated 2026-07-30: Tightens the schedule gutters and hides the in-panel scrollbar for a denser split workspace.
 * @updated 2026-07-30: Suppresses the synthetic click after real-record taps so the detail modal is not immediately backdrop-closed.
 * @updated 2026-08-09: Renders clickable idle-time gaps from real records only; planned blocks do not split gaps and today's trailing gap ends at the current time.
 * @updated 2026-08-12: Keeps exactly adjacent schedule blocks in the same visual layout group so contiguous records do not appear staggered.
 * @updated 2026-08-28: Ends parallel width groups when no active overlap remains so later adjacent blocks can use the full row.
 * @updated 2026-08-24: Uses 23:59:59.999 rather than next-day 00:00 for historical-day gaps and 24:00 timeline creations.
 * @updated 2026-08-24: Closes the plan action panel on completed backdrop clicks so the release click cannot reach the timeline underneath.
 * @updated 2026-08-24: Ignores the opening touch click inside plan actions and requires a second delete confirmation to prevent accidental starts and removals.
 * @updated 2026-08-26: Shows activity attributes beneath notes in sufficiently tall split-layout time blocks.
 * @updated 2026-08-26: Applies privacy-mode blurring to notes in split-layout time blocks.
 * @updated 2026-08-26: Renders Routine Markdown checklist notes as visual checkbox rows.
 */
import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, Minus, Play, Plus, Trash2, X } from 'lucide-react';
import { Category, Log, Scope, TodoItem } from '../types';
import { toCssColor } from '../utils/colorUtils';
import { isAutoRecurringPlanDeleteLocked } from '../utils/todoRecurringPlanUtils';
import { clampEndTimeToStartDay } from '../utils/logUtils';
import { ActivityAttributeSummary } from './ActivityAttributeSummary';
import { RoutineChecklistPreview } from './RoutineChecklistPreview';
import { isRoutineChecklistMarkdown } from '../utils/routineChecklist';

const MIN_HOUR_HEIGHT = 52;
const MAX_HOUR_HEIGHT = 180;
const DEFAULT_HOUR_HEIGHT = 88;
const DAY_MINUTES = 24 * 60;
const TIME_SNAP_MINUTES = 5;
const SCHEDULE_ADJACENCY_TOLERANCE_MINUTES = 1;
export const TIMELINE_TOP_PADDING = 12;
export const MIN_SCHEDULE_BLOCK_HEIGHT = 12;
const MIN_EXPANDED_TIMELINE_NOTE_HEIGHT = 88;
const BLOCK_GESTURE_THRESHOLD = 6;
const LONG_PRESS_EDIT_DELAY = 500;
const PINCH_BLOCK_TAP_SUPPRESSION_MS = 300;
const BLOCK_CLICK_FALLBACK_SUPPRESSION_MS = 160;
const RECORD_DETAIL_BACKDROP_CLICK_SUPPRESSION_MS = 320;
export const PLAN_ACTION_INTERACTION_GUARD_MS = 280;

export const isPlanActionInteractionGuardActive = (
  openedAt: number,
  now = Date.now()
): boolean => openedAt > 0 && now - openedAt < PLAN_ACTION_INTERACTION_GUARD_MS;

interface TimelineScheduleCanvasProps {
  currentDate: Date;
  logs: Log[];
  categories: Category[];
  scopes: Scope[];
  todos: TodoItem[];
  isDarkMode: boolean;
  isPrivacyMode: boolean;
  minIdleTimeThreshold: number;
  onAddLog: (startTime: number, endTime: number) => void;
  onEditLog: (log: Log) => void;
  onUpdateLog: (log: Log) => void;
  onCreatePlannedLog: (todo: TodoItem, startTime: number, endTime: number) => Log;
  quickColorSelection?: TimelineQuickColorActivity | null;
  onCreateQuickColorLog: (target: TimelineQuickColorActivity, startTime: number, endTime: number) => Log;
  onStartPlannedTodo: (todo: TodoItem) => void;
  onDeletePlannedLog: (log: Log) => void;
}

export interface TimelineQuickColorActivity {
  categoryId: string;
  activityId: string;
  categoryName: string;
  activityName: string;
  categoryIcon: string;
  categoryUiIcon?: string;
  activityIcon: string;
  activityUiIcon?: string;
  color: string;
}

export interface TimelineScheduleCanvasHandle {
  previewTodoDropAtClientPoint: (todo: TodoItem, clientX: number, clientY: number) => boolean;
  clearTodoDropPreview: () => void;
  dropTodoAtClientPoint: (todo: TodoItem, clientX: number, clientY: number) => boolean;
  previewQuickColorDropAtClientPoint: (target: TimelineQuickColorActivity, clientX: number, clientY: number) => boolean;
  clearQuickColorDropPreview: () => void;
  dropQuickColorAtClientPoint: (target: TimelineQuickColorActivity, clientX: number, clientY: number) => boolean;
}

interface ScheduleBlockLayout {
  startMinutes: number;
  endMinutes: number;
  column: number;
  columnCount: number;
}

interface TimeOverride {
  startTime: number;
  endTime: number;
}

export interface TimelineIdleGap {
  id: string;
  startTime: number;
  endTime: number;
}

interface TodoDropPreview {
  todo: TodoItem;
  startMinutes: number;
  endMinutes: number;
}

interface QuickColorPreview {
  target: TimelineQuickColorActivity;
  startMinutes: number;
  endMinutes: number;
}

interface QuickColorRangeSession {
  pointerId: number;
  target: TimelineQuickColorActivity;
  anchorMinutes: number;
  startX: number;
  startY: number;
  hasMoved: boolean;
}

type BlockPressMode = 'detail' | 'edit';

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const getTouchDistance = (first: Touch, second: Touch): number => Math.hypot(
  second.clientX - first.clientX,
  second.clientY - first.clientY
);

const formatTime = (value: Date): string => `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;

export const formatTimelineHourLabel = (hour: number): string => (
  hour === 0 ? '' : String(hour).padStart(2, '0')
);

const snapMinute = (minute: number): number => clamp(
  Math.round(minute / TIME_SNAP_MINUTES) * TIME_SNAP_MINUTES,
  0,
  DAY_MINUTES
);

export const getPlannedTimeRange = (minute: number): { startMinutes: number; endMinutes: number } => {
  const startMinutes = clamp(snapMinute(minute), 0, DAY_MINUTES - 30);
  return { startMinutes, endMinutes: startMinutes + 30 };
};

export const shiftTimeRangeWithinDay = (
  startTime: number,
  endTime: number,
  deltaMinutes: number,
  dayStartTime: number
): { startTime: number; endTime: number } => {
  const durationMs = Math.max(0, endTime - startTime);
  if (durationMs === 0) {
    return { startTime, endTime };
  }

  const durationMinutes = durationMs / 60000;
  const baseStartMinutes = (startTime - dayStartTime) / 60000;
  const maxStartMinutes = Math.max(0, DAY_MINUTES - durationMinutes);
  const nextStartMinutes = clamp(snapMinute(baseStartMinutes + deltaMinutes), 0, maxStartMinutes);
  const nextStartTime = dayStartTime + nextStartMinutes * 60000;

  return {
    startTime: nextStartTime,
    endTime: nextStartTime + durationMs
  };
};

export const getMinimumTimelineRange = (anchorMinutes: number, currentMinutes: number): { startMinutes: number; endMinutes: number } => {
  let startMinutes = Math.min(anchorMinutes, currentMinutes);
  let endMinutes = Math.max(anchorMinutes, currentMinutes);

  if (endMinutes - startMinutes >= TIME_SNAP_MINUTES) {
    return { startMinutes, endMinutes };
  }

  if (startMinutes >= DAY_MINUTES - TIME_SNAP_MINUTES) {
    startMinutes = DAY_MINUTES - TIME_SNAP_MINUTES;
    endMinutes = DAY_MINUTES;
  } else {
    endMinutes = startMinutes + TIME_SNAP_MINUTES;
  }

  return { startMinutes, endMinutes };
};

export const getTimelineTimestamp = (dayStartTime: number, minutes: number): number => clampEndTimeToStartDay(
  dayStartTime,
  dayStartTime + minutes * 60 * 1000
);

export const getTimelineIdleGaps = (
  logs: Array<Pick<Log, 'id' | 'startTime' | 'endTime' | 'isPlanned'>>,
  dayStartTime: number,
  availableEndTime: number,
  minimumDurationMinutes: number
): TimelineIdleGap[] => {
  if (availableEndTime <= dayStartTime) return [];

  const realRanges = logs
    .filter((log) => !log.isPlanned && log.startTime < availableEndTime && log.endTime > dayStartTime)
    .map((log) => ({
      startTime: Math.max(log.startTime, dayStartTime),
      endTime: Math.min(log.endTime, availableEndTime)
    }))
    .filter((range) => range.endTime > range.startTime)
    .sort((left, right) => left.startTime - right.startTime || left.endTime - right.endTime);
  const minimumDurationMs = Math.max(0, minimumDurationMinutes) * 60 * 1000;
  const gaps: TimelineIdleGap[] = [];
  let cursor = dayStartTime;

  const addGap = (startTime: number, endTime: number) => {
    if (endTime <= startTime || endTime - startTime < minimumDurationMs) return;
    gaps.push({ id: `idle-${startTime}-${endTime}`, startTime, endTime });
  };

  realRanges.forEach((range) => {
    addGap(cursor, range.startTime);
    cursor = Math.max(cursor, range.endTime);
  });
  addGap(cursor, availableEndTime);

  return gaps;
};

export const getScheduleBlockHeight = (durationMinutes: number, hourHeight: number): number => Math.max(
  MIN_SCHEDULE_BLOCK_HEIGHT,
  (durationMinutes / 60) * hourHeight
);

export const getTimelineBlockBackground = (colorSource: string, alpha: number): string => {
  const fillColor = toCssColor(colorSource, 'fill');
  return toCssColor(fillColor, 'background', alpha);
};

export const scheduleTimelineRecordDetailOpen = (callback: () => void): ReturnType<typeof setTimeout> => (
  setTimeout(callback, 0)
);

export const isTimelineLogNoteExpanded = (height: number): boolean => height >= MIN_EXPANDED_TIMELINE_NOTE_HEIGHT;

export const isTimelinePlanTimeEditingLocked = (log: Log, todos: TodoItem[]): boolean => {
  const linkedTodo = log.linkedTodoId
    ? todos.find((todo) => todo.id === log.linkedTodoId) || null
    : null;

  return isAutoRecurringPlanDeleteLocked(log, linkedTodo);
};

export const layoutParallelScheduleBlocks = <T extends { startMinutes: number; endMinutes: number },>(blocks: T[]): Array<T & ScheduleBlockLayout> => {
  const sorted = [...blocks].sort((left, right) => left.startMinutes - right.startMinutes || left.endMinutes - right.endMinutes);
  const laidOut: Array<T & ScheduleBlockLayout> = [];
  let active: Array<T & ScheduleBlockLayout> = [];
  let group: Array<T & ScheduleBlockLayout> = [];

  const finalizeGroup = () => {
    const columnCount = Math.max(1, ...group.map((block) => block.column + 1));
    group.forEach((block) => { block.columnCount = columnCount; });
    group = [];
  };

  sorted.forEach((block) => {
    active = active.filter((entry) => entry.endMinutes > block.startMinutes + SCHEDULE_ADJACENCY_TOLERANCE_MINUTES);
    // Width is scoped to actual overlap. A contiguous successor starts a new
    // width group so it does not inherit a half-width from an earlier overlap.
    if (active.length === 0 && group.length > 0) finalizeGroup();
    const usedColumns = new Set(active.map((entry) => entry.column));
    let column = 0;
    while (usedColumns.has(column)) column += 1;
    const laidOutBlock = { ...block, column, columnCount: 1 };
    active.push(laidOutBlock);
    group.push(laidOutBlock);
    laidOut.push(laidOutBlock);
  });

  if (group.length > 0) finalizeGroup();
  return laidOut;
};

export const TimelineScheduleCanvas = React.forwardRef<TimelineScheduleCanvasHandle, TimelineScheduleCanvasProps>(({
  currentDate,
  logs,
  categories,
  scopes,
  todos,
  minIdleTimeThreshold,
  onAddLog,
  onEditLog,
  onUpdateLog,
  onCreatePlannedLog,
  quickColorSelection,
  onCreateQuickColorLog,
  onStartPlannedTodo,
  onDeletePlannedLog,
  isDarkMode,
  isPrivacyMode
}, ref) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pinchRef = useRef<{ distance: number; hourHeight: number } | null>(null);
  const pinchBlockTapSuppressionUntilRef = useRef<number>(0);
  const blockClickFallbackSuppressionUntilRef = useRef<number>(0);
  const recordDetailBackdropClickSuppressionUntilRef = useRef<number>(0);
  const initializedDateRef = useRef<string>('');
  const longPressRef = useRef<{ logId: string; pointerId: number; startX: number; startY: number; timerId: number | null; active: boolean; mode: BlockPressMode } | null>(null);
  const resizeRef = useRef<{ log: Log; edge: 'start' | 'end' } | null>(null);
  const moveRef = useRef<{
    log: Log;
    pointerId: number;
    anchorMinute: number;
    baseRange: TimeOverride;
    hadExistingOverride: boolean;
  } | null>(null);
  const quickColorRangeRef = useRef<QuickColorRangeSession | null>(null);
  const timeOverridesRef = useRef<Record<string, TimeOverride>>({});
  const [hourHeight, setHourHeight] = useState(DEFAULT_HOUR_HEIGHT);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [planActionLogId, setPlanActionLogId] = useState<string | null>(null);
  const [planActionOpenedAt, setPlanActionOpenedAt] = useState(0);
  const [isPlanDeleteConfirming, setIsPlanDeleteConfirming] = useState(false);
  const [todoDropPreview, setTodoDropPreview] = useState<TodoDropPreview | null>(null);
  const [quickColorDropPreview, setQuickColorDropPreview] = useState<QuickColorPreview | null>(null);
  const [quickColorRangePreview, setQuickColorRangePreview] = useState<QuickColorPreview | null>(null);
  const [createdPlanLogId, setCreatedPlanLogId] = useState<string | null>(null);
  const [timeOverrides, setTimeOverrides] = useState<Record<string, TimeOverride>>({});
  const createdPlanTimerRef = useRef<number | null>(null);
  const recordDetailOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editingLogIdRef = useRef<string | null>(null);
  const setEditingMode = (nextEditingLogId: string | null) => {
    editingLogIdRef.current = nextEditingLogId;
    setEditingLogId(nextEditingLogId);
  };

  const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
  const dayStart = useMemo(() => {
    const value = new Date(currentDate);
    value.setHours(0, 0, 0, 0);
    return value;
  }, [dateKey]);
  const dayEnd = useMemo(() => dayStart.getTime() + 24 * 60 * 60 * 1000, [dayStart]);
  const canvasHeight = TIMELINE_TOP_PADDING + 24 * hourHeight;
  const isToday = dateKey === `${currentTime.getFullYear()}-${currentTime.getMonth()}-${currentTime.getDate()}`;
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes() + currentTime.getSeconds() / 60;
  const surfaceClassName = isDarkMode ? 'border-stone-700 bg-stone-950/95' : 'border-stone-200/80 bg-[#fdfbf7]/72';
  const hourLineClassName = isDarkMode ? 'border-stone-700' : 'border-stone-200/80';
  const halfHourLineClassName = isDarkMode ? 'border-stone-800' : 'border-stone-100';
  const timeLabelClassName = isDarkMode ? 'text-stone-300' : 'text-stone-400';
  const zoomControlClassName = isDarkMode ? 'border-stone-700 bg-stone-900/95 text-stone-300 hover:bg-stone-800 hover:text-white' : 'border-stone-200 bg-white/95 text-stone-400 hover:bg-stone-50 hover:text-stone-700';
  const idleGaps = useMemo(() => getTimelineIdleGaps(
    logs,
    dayStart.getTime(),
    isToday ? Math.min(dayEnd, currentTime.getTime()) : dayStart.getTime() > currentTime.getTime() ? dayStart.getTime() : getTimelineTimestamp(dayStart.getTime(), DAY_MINUTES),
    minIdleTimeThreshold
  ), [logs, dayStart, dayEnd, isToday, currentTime, minIdleTimeThreshold]);

  const scheduledLogs = useMemo(() => layoutParallelScheduleBlocks(logs
    .map((log) => ({ log, ...timeOverrides[log.id] }))
    .filter(({ log, startTime = log.startTime, endTime = log.endTime }) => startTime < dayEnd && endTime > dayStart.getTime())
    .map(({ log, startTime = log.startTime, endTime = log.endTime }) => {
      const displayStart = Math.max(startTime, dayStart.getTime());
      const displayEnd = Math.min(endTime, dayEnd);
      const topMinutes = (displayStart - dayStart.getTime()) / 60000;
      const durationMinutes = Math.max(1, (displayEnd - displayStart) / 60000);
      const category = categories.find((item) => item.id === log.categoryId);
      const activity = category?.activities.find((item) => item.id === log.activityId);
      const linkedTodo = todos.find((item) => item.id === log.linkedTodoId);
      const plannedCategory = log.isPlanned
        ? categories.find((item) => item.id === linkedTodo?.linkedCategoryId)
        : category;
      const plannedActivity = log.isPlanned
        ? plannedCategory?.activities.find((item) => item.id === linkedTodo?.linkedActivityId)
        : activity;
      const linkedScopeIds = log.isPlanned ? (linkedTodo?.defaultScopeIds || []) : (log.scopeIds || []);
      const linkedScopeNames = linkedScopeIds
        .map((scopeId) => scopes.find((scope) => scope.id === scopeId)?.name)
        .filter((name): name is string => Boolean(name));
      const colorSource = log.isPlanned
        ? (plannedActivity?.color || '#a8a29e')
        : (plannedActivity?.color || plannedCategory?.themeColor || '');

      return {
        log,
        startMinutes: topMinutes,
        endMinutes: topMinutes + durationMinutes,
        top: TIMELINE_TOP_PADDING + (topMinutes / 60) * hourHeight,
        height: getScheduleBlockHeight(durationMinutes, hourHeight),
        color: toCssColor(colorSource, 'fill'),
        background: getTimelineBlockBackground(colorSource, log.isPlanned ? 0.06 : 0.14),
        startLabel: formatTime(new Date(startTime)),
        endLabel: formatTime(new Date(endTime)),
        activityLabel: plannedActivity?.name,
        activity: plannedActivity,
        linkedTodoLabel: linkedTodo?.title,
        linkedScopeNames,
        isPlanned: Boolean(log.isPlanned)
      };
    })), [logs, categories, scopes, todos, dayStart, dayEnd, hourHeight, timeOverrides]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTime(new Date()), 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const activePlanLog = useMemo(() => (
    planActionLogId ? logs.find((log) => log.id === planActionLogId && log.isPlanned) || null : null
  ), [logs, planActionLogId]);
  const activePlanTodo = useMemo(() => (
    activePlanLog?.linkedTodoId ? todos.find((todo) => todo.id === activePlanLog.linkedTodoId) || null : null
  ), [activePlanLog, todos]);
  const isActivePlanDeleteLocked = useMemo(() => (
    activePlanLog ? isTimelinePlanTimeEditingLocked(activePlanLog, todos) : false
  ), [activePlanLog, todos]);
  const isLogTimeEditingLocked = (log: Log): boolean => isTimelinePlanTimeEditingLocked(log, todos);

  const openPlanActions = (logId: string) => {
    setPlanActionOpenedAt(Date.now());
    setIsPlanDeleteConfirming(false);
    setPlanActionLogId(logId);
  };

  const closePlanActions = () => {
    setIsPlanDeleteConfirming(false);
    setPlanActionLogId(null);
  };

  const withPlanActionInteractionGuard = <T extends HTMLElement>(
    action: () => void
  ): React.MouseEventHandler<T> => (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.detail !== 0 && isPlanActionInteractionGuardActive(planActionOpenedAt)) {
      return;
    }

    action();
  };
  const todoDropPreviewColor = useMemo(() => {
    if (!todoDropPreview) return '#a8a29e';
    const category = categories.find((item) => item.id === todoDropPreview.todo.linkedCategoryId);
    const activity = category?.activities.find((item) => item.id === todoDropPreview.todo.linkedActivityId);
    return toCssColor(activity?.color || '#a8a29e', 'fill');
  }, [categories, todoDropPreview]);
  const activeQuickColorPreview = quickColorRangePreview || quickColorDropPreview;
  const activeQuickColorPreviewColor = useMemo(() => (
    activeQuickColorPreview
      ? toCssColor(activeQuickColorPreview.target.color || '#a8a29e', 'fill')
      : '#a8a29e'
  ), [activeQuickColorPreview]);

  useEffect(() => {
    if (planActionLogId && !activePlanLog) setPlanActionLogId(null);
  }, [activePlanLog, planActionLogId]);

  useEffect(() => {
    editingLogIdRef.current = editingLogId;
  }, [editingLogId]);

  useEffect(() => {
    const handleDocumentPointerDownCapture = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const activeEditingLogId = editingLogIdRef.current;
      const targetBlock = target.closest('[data-schedule-block]') as HTMLElement | null;
      const targetBlockId = targetBlock?.dataset.logId || null;
      const isEditingBlock = Boolean(activeEditingLogId && targetBlockId === activeEditingLogId);
      const isTouchSuppressed = event.pointerType === 'touch'
        && (pinchRef.current !== null || Date.now() < pinchBlockTapSuppressionUntilRef.current);

      if (isTouchSuppressed) {
        if (targetBlock) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }

      if (!activeEditingLogId || isEditingBlock) return;

      clearLongPress();
      pinchBlockTapSuppressionUntilRef.current = Date.now() + PINCH_BLOCK_TAP_SUPPRESSION_MS;
      setEditingMode(null);
      event.preventDefault();
      event.stopPropagation();
    };

    const handleDocumentClickCapture = (event: MouseEvent) => {
      const now = Date.now();
      if (
        now < pinchBlockTapSuppressionUntilRef.current
        || now < recordDetailBackdropClickSuppressionUntilRef.current
      ) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const activeEditingLogId = editingLogIdRef.current;
      if (!activeEditingLogId) return;

      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const targetBlock = target.closest('[data-schedule-block]') as HTMLElement | null;
      if (targetBlock?.dataset.logId === activeEditingLogId) return;

      event.preventDefault();
      event.stopPropagation();
      clearLongPress();
      setEditingMode(null);
    };

    document.addEventListener('pointerdown', handleDocumentPointerDownCapture, true);
    document.addEventListener('click', handleDocumentClickCapture, true);
    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDownCapture, true);
      document.removeEventListener('click', handleDocumentClickCapture, true);
    };
  }, []);

  useEffect(() => {
    quickColorRangeRef.current = null;
    setQuickColorRangePreview(null);
    setQuickColorDropPreview(null);
  }, [dateKey, quickColorSelection?.activityId, quickColorSelection?.categoryId]);

  useEffect(() => {
    if (!scrollRef.current || initializedDateRef.current === dateKey) return;
    initializedDateRef.current = dateKey;
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = isToday ? TIMELINE_TOP_PADDING + (currentMinutes / 60) * hourHeight : 0;
      }
    });
  }, [dateKey, hourHeight, isToday, currentMinutes]);

  useEffect(() => () => {
    if (createdPlanTimerRef.current !== null) window.clearTimeout(createdPlanTimerRef.current);
    if (recordDetailOpenTimerRef.current !== null) clearTimeout(recordDetailOpenTimerRef.current);
    if (longPressRef.current?.timerId !== null && longPressRef.current?.timerId !== undefined) {
      window.clearTimeout(longPressRef.current.timerId);
    }
    moveRef.current = null;
  }, []);

  const setCanvasScale = (nextHourHeight: number) => {
    const next = clamp(nextHourHeight, MIN_HOUR_HEIGHT, MAX_HOUR_HEIGHT);
    const scrollContainer = scrollRef.current;
    const visibleMinute = scrollContainer ? Math.max(0, ((scrollContainer.scrollTop - TIMELINE_TOP_PADDING) / hourHeight) * 60) : 0;
    setHourHeight(next);
    requestAnimationFrame(() => {
      if (scrollContainer) {
        scrollContainer.scrollTop = TIMELINE_TOP_PADDING + (visibleMinute / 60) * next;
      }
    });
  };

  const getMinuteAtClientY = (clientY: number): number | null => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return null;
    const bounds = scrollContainer.getBoundingClientRect();
    const contentY = clientY - bounds.top + scrollContainer.scrollTop - TIMELINE_TOP_PADDING;
    return snapMinute((contentY / hourHeight) * 60);
  };

  const updateResizeDraft = (clientY: number) => {
    const resize = resizeRef.current;
    const minute = getMinuteAtClientY(clientY);
    if (!resize || minute === null) return;
    const current = timeOverridesRef.current[resize.log.id] || { startTime: resize.log.startTime, endTime: resize.log.endTime };
    const minimumDuration = TIME_SNAP_MINUTES * 60 * 1000;
    const nextTime = getTimelineTimestamp(dayStart.getTime(), minute);
    const nextOverride = resize.edge === 'start'
      ? { startTime: Math.min(nextTime, current.endTime - minimumDuration), endTime: current.endTime }
      : { startTime: current.startTime, endTime: Math.max(nextTime, current.startTime + minimumDuration) };
    setTimeOverrides((previous) => {
      const next = { ...previous, [resize.log.id]: nextOverride };
      timeOverridesRef.current = next;
      return next;
    });
  };

  const updateMoveDraft = (clientY: number) => {
    const move = moveRef.current;
    const minute = getMinuteAtClientY(clientY);
    if (!move || minute === null) return;

    const deltaMinutes = minute - move.anchorMinute;
    const nextRange = shiftTimeRangeWithinDay(move.baseRange.startTime, move.baseRange.endTime, deltaMinutes, dayStart.getTime());
    const currentRange = timeOverridesRef.current[move.log.id];
    if (currentRange?.startTime === nextRange.startTime && currentRange?.endTime === nextRange.endTime) return;

    setTimeOverrides((previous) => {
      const next = { ...previous, [move.log.id]: nextRange };
      timeOverridesRef.current = next;
      return next;
    });
  };

  const commitResize = () => {
    const resize = resizeRef.current;
    if (!resize) return;
    const override = timeOverridesRef.current[resize.log.id];
    if (override) {
      onUpdateLog({
        ...resize.log,
        ...override,
        duration: Math.max(0, Math.round((override.endTime - override.startTime) / 1000))
      });
    }
    resizeRef.current = null;
    setTimeOverrides((previous) => {
      const { [resize.log.id]: _, ...rest } = previous;
      timeOverridesRef.current = rest;
      return rest;
    });
  };

  const startMove = (log: Log, event: React.PointerEvent<HTMLDivElement>) => {
    if (isLogTimeEditingLocked(log)) {
      setEditingMode(null);
      return;
    }

    const minute = getMinuteAtClientY(event.clientY);
    if (minute === null) return;

    const currentRange = timeOverridesRef.current[log.id] || { startTime: log.startTime, endTime: log.endTime };
    clearLongPress();
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    moveRef.current = {
      log,
      pointerId: event.pointerId,
      anchorMinute: minute,
      baseRange: currentRange,
      hadExistingOverride: Boolean(timeOverridesRef.current[log.id])
    };
  };

  const commitMove = () => {
    const move = moveRef.current;
    if (!move) return;

    const override = timeOverridesRef.current[move.log.id];
    if (override && (override.startTime !== move.baseRange.startTime || override.endTime !== move.baseRange.endTime)) {
      onUpdateLog({
        ...move.log,
        ...override,
        duration: Math.max(0, Math.round((override.endTime - override.startTime) / 1000))
      });
    }

    moveRef.current = null;
    setTimeOverrides((previous) => {
      const { [move.log.id]: _, ...rest } = previous;
      timeOverridesRef.current = rest;
      return rest;
    });
  };

  const cancelMove = () => {
    const move = moveRef.current;
    if (!move) return;

    moveRef.current = null;
    setTimeOverrides((previous) => {
      const next = { ...previous };
      if (move.hadExistingOverride) {
        next[move.log.id] = move.baseRange;
      } else {
        delete next[move.log.id];
      }
      timeOverridesRef.current = next;
      return next;
    });
  };

  const clearLongPress = () => {
    const press = longPressRef.current;
    if (press?.timerId !== null && press?.timerId !== undefined) {
      window.clearTimeout(press.timerId);
    }
    longPressRef.current = null;
  };

  useEffect(() => {
    if (!editingLogId) return;
    const editingLog = logs.find((log) => log.id === editingLogId);
    if (!editingLog || !isTimelinePlanTimeEditingLocked(editingLog, todos)) return;

    clearLongPress();
    cancelMove();
    setEditingMode(null);
  }, [editingLogId, logs, todos]);

  const handleBlockPointerDown = (log: Log, event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' && (pinchRef.current !== null || Date.now() < pinchBlockTapSuppressionUntilRef.current)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const isTimeEditingLocked = isLogTimeEditingLocked(log);
    if (isTimeEditingLocked && editingLogIdRef.current === log.id) {
      clearLongPress();
      cancelMove();
      setEditingMode(null);
    }
    if (editingLogIdRef.current && editingLogIdRef.current !== log.id) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const pressMode: BlockPressMode = editingLogIdRef.current === log.id && !isTimeEditingLocked ? 'edit' : 'detail';
    const press = {
      logId: log.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      timerId: null as number | null,
      active: false,
      mode: pressMode
    };
    longPressRef.current = press;
    if (pressMode === 'detail' && !isTimeEditingLocked) {
      press.timerId = window.setTimeout(() => {
        if (longPressRef.current === press) {
          press.active = true;
          setEditingMode(log.id);
        }
      }, LONG_PRESS_EDIT_DELAY);
    }
  };

  const handleBlockPointerMove = (log: Log, event: React.PointerEvent<HTMLDivElement>) => {
    if (isLogTimeEditingLocked(log)) {
      if (moveRef.current?.log.id === log.id) cancelMove();
      const press = longPressRef.current;
      if (press?.logId === log.id && press.pointerId === event.pointerId) clearLongPress();
      return;
    }

    const move = moveRef.current;
    if (move?.log.id === log.id && move.pointerId === event.pointerId) {
      event.preventDefault();
      updateMoveDraft(event.clientY);
      return;
    }

    const press = longPressRef.current;
    if (!press || press.logId !== log.id || press.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - press.startX;
    const deltaY = event.clientY - press.startY;
    const distance = Math.hypot(deltaX, deltaY);

    if (press.mode === 'edit') {
      if (!moveRef.current && distance > BLOCK_GESTURE_THRESHOLD) {
        startMove(log, event);
        updateMoveDraft(event.clientY);
      }
      return;
    }

    if (press.active && !moveRef.current) {
      startMove(log, event);
      updateMoveDraft(event.clientY);
      return;
    }
    if (press.active) return;
    if (distance > BLOCK_GESTURE_THRESHOLD) {
      clearLongPress();
    }
  };

  const scheduleRecordDetailOpen = (log: Log) => {
    if (recordDetailOpenTimerRef.current !== null) clearTimeout(recordDetailOpenTimerRef.current);
    recordDetailBackdropClickSuppressionUntilRef.current = Date.now() + RECORD_DETAIL_BACKDROP_CLICK_SUPPRESSION_MS;
    recordDetailOpenTimerRef.current = scheduleTimelineRecordDetailOpen(() => {
      recordDetailOpenTimerRef.current = null;
      onEditLog(log);
    });
  };

  const handleBlockPointerUp = (log: Log, event: React.PointerEvent<HTMLDivElement>) => {
    const move = moveRef.current;
    if (move?.log.id === log.id && move.pointerId === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      commitMove();
      return;
    }

    if (event.pointerType === 'touch' && (pinchRef.current !== null || Date.now() < pinchBlockTapSuppressionUntilRef.current)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const press = longPressRef.current;
    const wasLongPress = press?.logId === log.id && press.pointerId === event.pointerId && press.mode === 'detail' && press.active;
    clearLongPress();
    if (editingLogIdRef.current) return;
    if (!wasLongPress) {
      blockClickFallbackSuppressionUntilRef.current = Date.now() + BLOCK_CLICK_FALLBACK_SUPPRESSION_MS;
      if (log.isPlanned) {
        openPlanActions(log.id);
      } else {
        scheduleRecordDetailOpen(log);
      }
    }
  };

  const handleBlockClick = (log: Log, event: React.MouseEvent<HTMLDivElement>) => {
    if (Date.now() < blockClickFallbackSuppressionUntilRef.current) return;
    if (Date.now() < pinchBlockTapSuppressionUntilRef.current) return;
    if (editingLogIdRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    clearLongPress();
    if (log.isPlanned) {
      openPlanActions(log.id);
    } else {
      scheduleRecordDetailOpen(log);
    }
  };

  const handleBlockPointerCancel = (log: Log, event: React.PointerEvent<HTMLDivElement>) => {
    const move = moveRef.current;
    if (move?.log.id === log.id && move.pointerId === event.pointerId) {
      cancelMove();
      return;
    }

    if (longPressRef.current?.logId === log.id && longPressRef.current?.pointerId === event.pointerId) {
      clearLongPress();
    }
  };

  const handleResizePointerDown = (log: Log, edge: 'start' | 'end', event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isLogTimeEditingLocked(log)) {
      clearLongPress();
      cancelMove();
      setEditingMode(null);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = { log, edge };
  };

  const handleResizePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!resizeRef.current) return;
    event.preventDefault();
    updateResizeDraft(event.clientY);
  };

  const handleResizePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    commitResize();
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.touches.length !== 2) return;
    pinchRef.current = {
      distance: getTouchDistance(event.touches[0], event.touches[1]),
      hourHeight
    };
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (!pinchRef.current || event.touches.length !== 2) return;
    event.preventDefault();
    const distance = getTouchDistance(event.touches[0], event.touches[1]);
    setCanvasScale(pinchRef.current.hourHeight * (distance / pinchRef.current.distance));
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (pinchRef.current && event.touches.length < 2) {
      pinchBlockTapSuppressionUntilRef.current = Date.now() + PINCH_BLOCK_TAP_SUPPRESSION_MS;
      pinchRef.current = null;
    }
  };

  const showCreatedLogFeedback = (log: Log, enterEditMode = true) => {
    setEditingMode(enterEditMode ? log.id : null);
    if (createdPlanTimerRef.current !== null) window.clearTimeout(createdPlanTimerRef.current);
    setCreatedPlanLogId(log.id);
    createdPlanTimerRef.current = window.setTimeout(() => {
      createdPlanTimerRef.current = null;
      setCreatedPlanLogId(null);
    }, 1200);
  };

  const clearQuickColorRange = () => {
    quickColorRangeRef.current = null;
    setQuickColorRangePreview(null);
  };

  const handleQuickColorCanvasPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!quickColorSelection) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const minute = getMinuteAtClientY(event.clientY);
    if (minute === null) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    quickColorRangeRef.current = {
      pointerId: event.pointerId,
      target: quickColorSelection,
      anchorMinutes: minute,
      startX: event.clientX,
      startY: event.clientY,
      hasMoved: false
    };
    setQuickColorDropPreview(null);
    setQuickColorRangePreview({ target: quickColorSelection, ...getMinimumTimelineRange(minute, minute) });
  };

  const handleQuickColorCanvasPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const session = quickColorRangeRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    const minute = getMinuteAtClientY(event.clientY);
    if (minute === null) return;

    if (!session.hasMoved && Math.hypot(event.clientX - session.startX, event.clientY - session.startY) > 4) {
      session.hasMoved = true;
    }
    event.preventDefault();
    setQuickColorRangePreview({ target: session.target, ...getMinimumTimelineRange(session.anchorMinutes, minute) });
  };

  const handleQuickColorCanvasPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const session = quickColorRangeRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    const minute = getMinuteAtClientY(event.clientY);
    const range = minute === null ? null : getMinimumTimelineRange(session.anchorMinutes, minute);
    const shouldCreate = Boolean(range && session.hasMoved);
    clearQuickColorRange();

    if (!shouldCreate || !range) return;
    const log = onCreateQuickColorLog(
      session.target,
      getTimelineTimestamp(dayStart.getTime(), range.startMinutes),
      getTimelineTimestamp(dayStart.getTime(), range.endMinutes)
    );
    showCreatedLogFeedback(log, false);
  };

  const handleQuickColorCanvasPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (quickColorRangeRef.current?.pointerId === event.pointerId) clearQuickColorRange();
  };

  useImperativeHandle(ref, () => ({
    previewTodoDropAtClientPoint: (todo, clientX, clientY) => {
      const scrollContainer = scrollRef.current;
      if (!scrollContainer) return false;
      const bounds = scrollContainer.getBoundingClientRect();
      if (clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom) {
        setTodoDropPreview(null);
        return false;
      }
      const minute = getMinuteAtClientY(clientY);
      if (minute === null) {
        setTodoDropPreview(null);
        return false;
      }
      const range = getPlannedTimeRange(minute);
      setTodoDropPreview((previous) => (
        previous?.todo.id === todo.id && previous.startMinutes === range.startMinutes
          ? previous
          : { todo, ...range }
      ));
      return true;
    },
    clearTodoDropPreview: () => setTodoDropPreview(null),
    dropTodoAtClientPoint: (todo, clientX, clientY) => {
      const scrollContainer = scrollRef.current;
      if (!scrollContainer) return false;
      const bounds = scrollContainer.getBoundingClientRect();
      if (clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom) {
        setTodoDropPreview(null);
        return false;
      }
      const minute = getMinuteAtClientY(clientY);
      if (minute === null) {
        setTodoDropPreview(null);
        return false;
      }
      const range = getPlannedTimeRange(minute);
      const plannedLog = onCreatePlannedLog(
        todo,
        getTimelineTimestamp(dayStart.getTime(), range.startMinutes),
        getTimelineTimestamp(dayStart.getTime(), range.endMinutes)
      );
      setTodoDropPreview(null);
      showCreatedLogFeedback(plannedLog);
      return true;
    },
    previewQuickColorDropAtClientPoint: (target, clientX, clientY) => {
      const scrollContainer = scrollRef.current;
      if (!scrollContainer) return false;
      const bounds = scrollContainer.getBoundingClientRect();
      if (clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom) {
        setQuickColorDropPreview(null);
        return false;
      }
      const minute = getMinuteAtClientY(clientY);
      if (minute === null) {
        setQuickColorDropPreview(null);
        return false;
      }
      const range = getPlannedTimeRange(minute);
      setQuickColorDropPreview((previous) => (
        previous?.target.activityId === target.activityId
          && previous?.target.categoryId === target.categoryId
          && previous.startMinutes === range.startMinutes
          ? previous
          : { target, ...range }
      ));
      return true;
    },
    clearQuickColorDropPreview: () => setQuickColorDropPreview(null),
    dropQuickColorAtClientPoint: (target, clientX, clientY) => {
      const scrollContainer = scrollRef.current;
      if (!scrollContainer) return false;
      const bounds = scrollContainer.getBoundingClientRect();
      if (clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom) {
        setQuickColorDropPreview(null);
        return false;
      }
      const minute = getMinuteAtClientY(clientY);
      if (minute === null) {
        setQuickColorDropPreview(null);
        return false;
      }
      const range = getPlannedTimeRange(minute);
      const log = onCreateQuickColorLog(
        target,
        getTimelineTimestamp(dayStart.getTime(), range.startMinutes),
        getTimelineTimestamp(dayStart.getTime(), range.endMinutes)
      );
      setQuickColorDropPreview(null);
      showCreatedLogFeedback(log, false);
      return true;
    }
  }), [dayStart, hourHeight, onCreatePlannedLog, onCreateQuickColorLog]);

  return (
    <section className={`relative min-h-0 min-w-0 flex-1 overflow-hidden border-t ${surfaceClassName}`} aria-label="全天时间轴">
      <div
        ref={scrollRef}
        className={`h-full overflow-y-auto overscroll-contain pb-28 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${quickColorSelection ? 'touch-none' : 'touch-pan-y'}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div
          className="relative min-w-0"
          style={{ height: `${canvasHeight}px` }}
          onPointerDown={(event) => {
            if (!(event.target as HTMLElement).closest('[data-schedule-block]')) {
              setEditingMode(null);
              handleQuickColorCanvasPointerDown(event);
            }
          }}
          onPointerMove={handleQuickColorCanvasPointerMove}
          onPointerUp={handleQuickColorCanvasPointerUp}
          onPointerCancel={handleQuickColorCanvasPointerCancel}
        >
          {Array.from({ length: 25 }, (_, hour) => {
            const top = TIMELINE_TOP_PADDING + hour * hourHeight;
            return (
              <React.Fragment key={hour}>
                <div className={`absolute left-0 right-0 border-t ${hourLineClassName}`} style={{ top }} />
                {hour < 24 && <div className={`absolute left-10 right-0 border-t border-dashed ${halfHourLineClassName}`} style={{ top: top + hourHeight / 2 }} />}
                <span className={`absolute left-0 w-8 -translate-y-1/2 pr-1 text-right text-[10px] font-bold tabular-nums ${timeLabelClassName}`} style={{ top }}>
                  {formatTimelineHourLabel(hour)}
                </span>
              </React.Fragment>
            );
          })}

          <div className="absolute inset-y-0 left-10 right-1">
            {idleGaps.map((gap) => {
              const startMinutes = (gap.startTime - dayStart.getTime()) / 60000;
              const endMinutes = (gap.endTime - dayStart.getTime()) / 60000;
              const durationMinutes = endMinutes - startMinutes;
              return (
                <button
                  key={gap.id}
                  type="button"
                  data-idle-time
                  disabled={Boolean(quickColorSelection)}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddLog(gap.startTime, gap.endTime);
                  }}
                  className="absolute z-0 w-full overflow-hidden rounded-[4px] border border-dashed border-stone-300/70 bg-stone-100/20 px-3 py-2 text-left transition-colors hover:border-stone-400 hover:bg-stone-100/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400/50 disabled:pointer-events-none dark:border-stone-700/80 dark:bg-stone-900/15 dark:hover:border-stone-500 dark:hover:bg-stone-800/35"
                  style={{
                    top: `${TIMELINE_TOP_PADDING + (startMinutes / 60) * hourHeight}px`,
                    height: `${getScheduleBlockHeight(endMinutes - startMinutes, hourHeight)}px`,
                    left: '0'
                  }}
                  aria-label={`添加空闲时段活动 ${formatTime(new Date(gap.startTime))} 至 ${formatTime(new Date(gap.endTime))}`}
                >
                  {durationMinutes >= 20 && <>
                    <span className="block truncate text-[10px] font-bold tabular-nums text-stone-400 dark:text-stone-500">
                      {formatTime(new Date(gap.startTime))} - {formatTime(new Date(gap.endTime))}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] font-medium text-stone-400 dark:text-stone-500">Idle Time</span>
                  </>}
                </button>
              );
            })}
            {todoDropPreview && (
              <div
                className="pointer-events-none absolute z-10 rounded-[4px] border border-dashed px-3 py-2 opacity-90"
                style={{
                  top: `${TIMELINE_TOP_PADDING + (todoDropPreview.startMinutes / 60) * hourHeight}px`,
                  height: `${getScheduleBlockHeight(todoDropPreview.endMinutes - todoDropPreview.startMinutes, hourHeight)}px`,
                  left: '0',
                  width: '100%',
                  borderColor: todoDropPreviewColor,
                  backgroundColor: toCssColor(todoDropPreviewColor, 'background', 0.08)
                }}
              >
                <span className="block truncate text-[10px] font-bold tabular-nums text-stone-500 dark:text-stone-400">
                  {String(Math.floor(todoDropPreview.startMinutes / 60)).padStart(2, '0')}:{String(todoDropPreview.startMinutes % 60).padStart(2, '0')} - {String(Math.floor(todoDropPreview.endMinutes / 60)).padStart(2, '0')}:{String(todoDropPreview.endMinutes % 60).padStart(2, '0')}
                </span>
              </div>
            )}
            {activeQuickColorPreview && (
              <div
                className="pointer-events-none absolute z-10 rounded-[4px] border-l-[3px] px-3 py-2 opacity-90 shadow-[0_1px_8px_rgba(28,25,23,0.08)]"
                style={{
                  top: `${TIMELINE_TOP_PADDING + (activeQuickColorPreview.startMinutes / 60) * hourHeight}px`,
                  height: `${getScheduleBlockHeight(activeQuickColorPreview.endMinutes - activeQuickColorPreview.startMinutes, hourHeight)}px`,
                  left: '0',
                  width: '100%',
                  borderColor: activeQuickColorPreviewColor,
                  backgroundColor: toCssColor(activeQuickColorPreviewColor, 'background', 0.12)
                }}
              >
                <span className="block truncate text-[10px] font-bold tabular-nums text-stone-500 dark:text-stone-400">
                  {String(Math.floor(activeQuickColorPreview.startMinutes / 60)).padStart(2, '0')}:{String(activeQuickColorPreview.startMinutes % 60).padStart(2, '0')} - {String(Math.floor(activeQuickColorPreview.endMinutes / 60)).padStart(2, '0')}:{String(activeQuickColorPreview.endMinutes % 60).padStart(2, '0')}
                </span>
                <span className="mt-0.5 block truncate text-[11px] font-medium text-stone-700 dark:text-stone-200">
                  #{activeQuickColorPreview.target.activityName}
                </span>
              </div>
            )}
            {scheduledLogs.map(({ log, top, height, color, background, startLabel, endLabel, activityLabel, activity, linkedTodoLabel, linkedScopeNames, isPlanned, column, columnCount }) => {
              const isTimeEditingLocked = isLogTimeEditingLocked(log);
              const isEditing = editingLogId === log.id && !isTimeEditingLocked;
              const isNewlyCreated = createdPlanLogId === log.id;
              const isCompact = height < 30;
              const showMetadata = height >= 34;
              const showNote = height >= 52;
              const showAttributes = height >= 68 && !isPlanned && (log.attributeValues?.length || 0) > 0;
              const isExpandedNote = isTimelineLogNoteExpanded(height);
              const noteText = log.note?.trim() || '';
              const hasChecklist = isRoutineChecklistMarkdown(noteText);
              return (
                <div
                  key={log.id}
                  data-schedule-block
                  data-log-id={log.id}
                  role="button"
                  tabIndex={0}
                  onPointerDown={(event) => handleBlockPointerDown(log, event)}
                  onPointerMove={(event) => handleBlockPointerMove(log, event)}
                  onPointerUp={(event) => handleBlockPointerUp(log, event)}
                  onPointerCancel={(event) => handleBlockPointerCancel(log, event)}
                  onClick={(event) => handleBlockClick(log, event)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      if (log.isPlanned) {
                        openPlanActions(log.id);
                      } else {
                        onEditLog(log);
                      }
                    }
                  }}
                  className={`absolute rounded-[4px] text-left shadow-[0_1px_2px_rgba(28,25,23,0.06)] transition-shadow hover:shadow-[0_5px_16px_rgba(28,25,23,0.14)] ${isEditing ? 'overflow-visible ring-1 ring-stone-300/80 dark:ring-stone-600 cursor-grab select-none touch-none active:cursor-grabbing' : 'overflow-hidden'} ${isCompact ? 'px-1.5 py-0.5' : 'px-3 py-2'} ${isPlanned ? 'border border-dashed bg-stone-50/70 dark:bg-stone-900/50' : 'border-l-[3px]'}`}
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    left: `calc(${(column / columnCount) * 100}% + ${(column * (columnCount - 1) * 4) / columnCount}px)`,
                    width: `calc(${100 / columnCount}% - ${((columnCount - 1) * 4) / columnCount}px)`,
                    borderColor: color,
                    backgroundColor: background,
                    outline: isNewlyCreated ? `2px solid ${color}` : undefined,
                    outlineOffset: isNewlyCreated ? '1px' : undefined
                  }}
                >
                  {isEditing && (
                    <>
                      <button type="button" aria-label="调整开始时间" onPointerDown={(event) => handleResizePointerDown(log, 'start', event)} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp} onPointerCancel={commitResize} className="absolute -top-[22px] left-0 z-20 h-11 w-full touch-none">
                        <span className="absolute left-2 right-2 top-1/2 h-px bg-stone-300/80 dark:bg-stone-600" />
                        <span className="absolute left-1/2 top-1/2 h-1 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-400/80 dark:bg-stone-500" />
                      </button>
                      <button type="button" aria-label="调整结束时间" onPointerDown={(event) => handleResizePointerDown(log, 'end', event)} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp} onPointerCancel={commitResize} className="absolute -bottom-[22px] left-0 z-20 h-11 w-full touch-none">
                        <span className="absolute left-2 right-2 top-1/2 h-px bg-stone-300/80 dark:bg-stone-600" />
                        <span className="absolute left-1/2 top-1/2 h-1 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-400/80 dark:bg-stone-500" />
                      </button>
                    </>
                  )}
                  <span className={`block truncate font-bold tabular-nums text-stone-600 dark:text-stone-300 ${isCompact ? 'text-[9px] leading-3' : 'text-[11px]'}`}>{startLabel} - {endLabel}</span>
                  {showMetadata && (activityLabel || linkedTodoLabel || linkedScopeNames.length > 0) && (
                    <span className="mt-0.5 block truncate text-[11px] font-medium text-stone-700 dark:text-stone-200">
                      {activityLabel && `#${activityLabel}`}{linkedTodoLabel && `${activityLabel ? ' ' : ''}@${linkedTodoLabel}`}{linkedScopeNames.map((scopeName) => ` %${scopeName}`).join('')}
                    </span>
                  )}
                  {!isEditing && showNote && noteText && (hasChecklist ? (
                    <RoutineChecklistPreview
                      markdown={noteText}
                      compact
                      className={`mt-0.5 text-stone-500 ${isPrivacyMode ? 'blur-sm select-none transition-all duration-500' : 'transition-all duration-500'} ${isExpandedNote ? '' : 'max-h-3 overflow-hidden'}`}
                    />
                  ) : (
                    <span
                      className={`mt-0.5 block text-[11px] leading-4 text-stone-500 ${isPrivacyMode ? 'blur-sm select-none transition-all duration-500' : 'transition-all duration-500'} ${
                        isExpandedNote ? 'whitespace-pre-wrap break-words' : 'truncate'
                      }`}
                    >
                      {isExpandedNote ? noteText : noteText.replace(/\s+/g, ' ')}
                    </span>
                  ))}
                  {!isEditing && showAttributes && (
                    <ActivityAttributeSummary
                      activity={activity}
                      values={log.attributeValues}
                      className="!mt-0.5 !mb-0 !flex-nowrap !overflow-hidden !whitespace-nowrap !text-[10px] !leading-3"
                    />
                  )}
                </div>
              );
            })}
          </div>
          {isToday && (
            <div className="pointer-events-none absolute left-10 right-1 z-10 flex items-center" style={{ top: `${TIMELINE_TOP_PADDING + (currentMinutes / 60) * hourHeight}px` }}>
              <span className="h-2 w-2 shrink-0 -translate-x-1/2 rounded-full" style={{ backgroundColor: isDarkMode ? '#ffffff' : 'var(--accent-color, #1c1917)' }} />
              <span className="h-px flex-1" style={{ backgroundColor: isDarkMode ? '#ffffff' : 'var(--accent-color, #1c1917)' }} />
            </div>
          )}
        </div>
        <div className={`flex justify-end border-t px-3 py-3 ${hourLineClassName}`}>
          <div className={`flex overflow-hidden rounded-lg border shadow-sm ${zoomControlClassName}`}>
            <button type="button" onClick={() => setCanvasScale(hourHeight - 16)} className="p-2 transition-colors" aria-label="缩小时间轴">
              <Minus size={15} />
            </button>
            <button type="button" onClick={() => setCanvasScale(hourHeight + 16)} className={`border-l p-2 transition-colors ${hourLineClassName}`} aria-label="放大时间轴">
              <Plus size={15} />
            </button>
          </div>
        </div>
      </div>
      {activePlanLog && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[130] flex items-end justify-center bg-[rgba(15,23,42,0.12)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-12 backdrop-blur-sm md:items-center md:pb-4"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            event.preventDefault();
            event.stopPropagation();
            if (event.detail !== 0 && isPlanActionInteractionGuardActive(planActionOpenedAt)) return;
            closePlanActions();
          }}
        >
          <section
            role="dialog"
            aria-label="计划操作"
            aria-modal="true"
            className="w-full max-w-[26rem] overflow-hidden rounded-[2rem] border border-stone-200 bg-[#faf9f6] shadow-[0_26px_70px_rgba(15,23,42,0.14)] dark:border-stone-700 dark:bg-stone-900"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative border-b border-stone-200 px-5 py-4 pr-14 dark:border-stone-700">
              <div className="text-[11px] uppercase tracking-[0.22em] text-stone-400">Plan</div>
              <div className="mt-1 min-w-0 truncate text-lg font-medium text-stone-800 dark:text-stone-100">{activePlanTodo?.title || activePlanLog.title || '计划'}</div>
              <button type="button" onClick={withPlanActionInteractionGuard(closePlanActions)} className="absolute right-4 top-4 rounded-full p-2 text-stone-400 transition-colors hover:bg-white hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-200" aria-label="关闭计划操作">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2 px-4 py-4">
              <button
                type="button"
                disabled={!activePlanTodo}
                onClick={withPlanActionInteractionGuard(() => {
                  if (!activePlanTodo) return;
                  onStartPlannedTodo(activePlanTodo);
                  closePlanActions();
                })}
                className="flex w-full items-center gap-2 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-left text-sm text-stone-700 transition-colors hover:border-stone-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700 dark:bg-stone-800/80 dark:text-stone-200 dark:hover:bg-stone-800"
              >
                <Play size={16} className="text-stone-400" />
                开始计时
              </button>
              <button
                type="button"
                disabled={isActivePlanDeleteLocked}
                onClick={withPlanActionInteractionGuard(() => {
                  if (isActivePlanDeleteLocked) return;
                  if (!isPlanDeleteConfirming) {
                    setIsPlanDeleteConfirming(true);
                    return;
                  }
                  onDeletePlannedLog(activePlanLog);
                  closePlanActions();
                })}
                className={`flex w-full items-center gap-2 rounded-2xl border px-4 py-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:bg-white/50 disabled:text-stone-400 disabled:hover:border-stone-200 disabled:hover:bg-white/50 dark:disabled:bg-stone-800/50 dark:disabled:text-stone-500 dark:disabled:hover:border-stone-700 dark:disabled:hover:bg-stone-800/50 ${
                  isPlanDeleteConfirming
                    ? 'border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300'
                    : 'border-stone-200 bg-white/80 text-stone-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-stone-700 dark:bg-stone-800/80 dark:text-stone-200 dark:hover:border-red-900/70 dark:hover:bg-red-950/30 dark:hover:text-red-300'
                }`}
              >
                {isActivePlanDeleteLocked
                  ? <Lock size={16} className="text-stone-400" />
                  : <Trash2 size={16} className={isPlanDeleteConfirming ? 'text-red-500' : 'text-stone-400'} />}
                {isActivePlanDeleteLocked ? '自动循环计划已锁定' : isPlanDeleteConfirming ? '确认删除？' : '删除计划'}
              </button>
            </div>
          </section>
        </div>,
        document.body
      )}
    </section>
  );
});
