/**
 * @file DesktopMonthCalendar.tsx
 * @input Todo items, logs, current week-page start date, and desktop widget drag callbacks
 * @output Week-paged calendar grid for the Electron desktop month widget
 * @pos View helper (Desktop widget)
 * @description Renders a desktop scheduling calendar that pages by 2/3/4 whole weeks, keeps the app's month-view spacing feel, and supports drag-to-schedule inside the desktop widget.
 * @updated 2026-05-18: 支持在月视图小组件中如果是 recurring（循环）类型的任务，在靠右渲染 Repeat2 图标，模仿截止 (due) 条目的 Flag 样式，保持 UI 一致。
 * @updated 2026-05-17: Added a caller-controlled entry background opacity so the desktop month widget display settings can tune task strip fill strength independently from window opacity.
 * @updated 2026-05-17: Replaced the fixed 6x7 month grid with a dynamic 2/3/4-week page layout so the widget can navigate by week-page units instead of whole months.
 * @updated 2026-05-17: Reused the shared week-trace layout so cross-day trace events render as continuous bars and aligned desktop complete/maybe styling with the app month view.
 * @updated 2026-05-17: Converted todo clicks to screen-space anchors so the external widget quick editor can open outside the widget window bounds.
 * @updated 2026-05-17: Switched month-cell overflow from a fixed per-page row cap to ResizeObserver-backed height estimation so taller widgets use their spare space before collapsing to `+N`.
 * @updated 2026-05-17: Wired up click handlers on monthly trace segments to trigger the quick actions popover outside widget bounds.
 * @updated 2026-05-17: Switched desktop month-entry marker colors to the shared `primaryKind`, so completed rows now keep completed styling even when due/arrange/maybe badges also match on the same day.
 * @updated 2026-05-17: 支持在月视图中如果是 due 则在任务名称后显示 flag 图标，如果是 trace 则将文字设为灰色。
 * @updated 2026-07-21: Reads the shared calendar number style so desktop and app month grids stay synchronized.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Flag, Repeat2 } from 'lucide-react';
import { addDays, format, isSameDay } from 'date-fns';
import { Log, TodoCategory, TodoItem } from '../../types';
import {
  buildTodoDateEntryMap,
  buildTodoMonthWeekLayout,
  formatDateKey,
  TodoDateEntry,
  TodoMonthWeekLayout,
  TodoWeekTraceSegment
} from '../../utils/todoScheduleUtils';
import { hexToRgba } from '../../utils/colorUtils';
import { getColorHexForCharts } from '../../utils/colorAdapterUtils';
import {
  getResolvedTodoScheduleTypeColors,
  TODO_SCHEDULE_TYPE_COLOR_SETTINGS_UPDATED_EVENT,
  todoScheduleColorService,
  type TodoScheduleTypeColorKey,
  type TodoScheduleTypeColorSettings
} from '../../services/todoScheduleColorService';
import { resolveDesktopTodoQuickEditorScreenAnchor } from '../../utils/desktopTodoQuickEditorAnchorUtils';
import {
  getCalendarNumberTextStyle,
  useCalendarNumberStyle
} from '../../services/calendarNumberStyleService';

const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONTH_CELL_VERTICAL_PADDING_PX = 6;
const MONTH_DAY_NUMBER_ROW_HEIGHT_PX = 16;
const MONTH_ENTRY_TOP_MARGIN_PX = 6;
const MONTH_ENTRY_TOP_OFFSET_PX = MONTH_CELL_VERTICAL_PADDING_PX + MONTH_DAY_NUMBER_ROW_HEIGHT_PX + MONTH_ENTRY_TOP_MARGIN_PX;
const MONTH_ENTRY_ROW_GAP_PX = 2;
const MONTH_CELL_LINE_HEIGHT_PX = 16;
const MONTH_CELL_FOOTER_RESERVE_PX = 18;
const DEFAULT_VISIBLE_ENTRY_COUNT_BY_PAGE: Record<2 | 3 | 4, number> = {
  2: 5,
  3: 4,
  4: 3
};
const MAX_VISIBLE_ENTRY_COUNT = 12;

interface DesktopMonthCalendarProps {
  todos: TodoItem[];
  logs: Log[];
  pageStartDate: Date;
  weeksPerPage: 2 | 3 | 4;
  onMoveScheduleEntry?: (entry: TodoDateEntry, targetDateKey: string) => void;
  onOpenTodo?: (todo: TodoItem, anchor: { x: number; y: number }) => void;
  isScheduleLocked?: boolean;
  externalDraggingTodoId?: string | null;
  externalDraggingType?: 'scheduled' | 'deadline' | 'maybe' | null;
  isDark?: boolean;
  onWheelPageChange?: (direction: 'prev' | 'next') => void;
  markerColorMode?: 'schedule' | 'category';
  todoCategories?: TodoCategory[];
  entryBackgroundOpacity?: number;
}

export const getDesktopMonthVisibleEntryCount = (
  calendarBodyHeight: number,
  weeksPerPage: 2 | 3 | 4
): number => {
  if (calendarBodyHeight <= 0) {
    return DEFAULT_VISIBLE_ENTRY_COUNT_BY_PAGE[weeksPerPage];
  }

  const weekRowHeight = calendarBodyHeight / weeksPerPage;
  const nonEntryHeight = (MONTH_CELL_VERTICAL_PADDING_PX * 2)
    + MONTH_DAY_NUMBER_ROW_HEIGHT_PX
    + MONTH_ENTRY_TOP_MARGIN_PX
    + MONTH_CELL_FOOTER_RESERVE_PX;
  const availableEntryHeight = Math.max(0, weekRowHeight - nonEntryHeight);
  const computedRows = Math.floor(
    (availableEntryHeight + MONTH_ENTRY_ROW_GAP_PX) / (MONTH_CELL_LINE_HEIGHT_PX + MONTH_ENTRY_ROW_GAP_PX)
  );

  return Math.max(1, Math.min(MAX_VISIBLE_ENTRY_COUNT, computedRows));
};

const getEntryColorKey = (entry: TodoDateEntry): TodoScheduleTypeColorKey => entry.primaryKind;

const isEntryDraggable = (entry: TodoDateEntry, isScheduleLocked: boolean): boolean => (
  !isScheduleLocked && (entry.badges.scheduled || entry.badges.deadline || entry.badges.maybe)
);

export const DesktopMonthCalendar: React.FC<DesktopMonthCalendarProps> = ({
  todos,
  logs,
  pageStartDate,
  weeksPerPage,
  onMoveScheduleEntry,
  onOpenTodo,
  isScheduleLocked = false,
  externalDraggingTodoId = null,
  externalDraggingType = null,
  isDark = false,
  markerColorMode = 'schedule',
  todoCategories = [],
  entryBackgroundOpacity = 0.08,
  onWheelPageChange
}) => {
  const calendarNumberStyle = useCalendarNumberStyle();
  const today = useMemo(() => new Date(), []);
  const todayDateKey = useMemo(() => formatDateKey(today), [today]);
  const calendarBodyRef = useRef<HTMLDivElement | null>(null);
  const wheelLockRef = useRef(false);
  const [draggingEntry, setDraggingEntry] = useState<TodoDateEntry | null>(null);
  const [dragTargetDate, setDragTargetDate] = useState<string | null>(null);
  const [calendarBodyHeight, setCalendarBodyHeight] = useState(0);
  const [scheduleTypeColorSettings, setScheduleTypeColorSettings] = useState<TodoScheduleTypeColorSettings>(() => (
    todoScheduleColorService.getSettings()
  ));

  const todoCategoryColorMap = useMemo(
    () => new Map(todoCategories.map((category) => [category.id, getColorHexForCharts(category.color || '')])),
    [todoCategories]
  );

  useLayoutEffect(() => {
    const target = calendarBodyRef.current;
    if (!target) {
      return;
    }

    const updateHeight = () => {
      const nextHeight = target.clientHeight;
      setCalendarBodyHeight((current) => (current === nextHeight ? current : nextHeight));
    };

    updateHeight();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateHeight);
      return () => {
        window.removeEventListener('resize', updateHeight);
      };
    }

    const observer = new ResizeObserver(() => {
      updateHeight();
    });
    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [weeksPerPage]);

  useEffect(() => {
    const handleSettingsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<TodoScheduleTypeColorSettings>;
      if (customEvent.detail) {
        setScheduleTypeColorSettings(customEvent.detail);
        return;
      }
      setScheduleTypeColorSettings(todoScheduleColorService.getSettings());
    };

    window.addEventListener(
      TODO_SCHEDULE_TYPE_COLOR_SETTINGS_UPDATED_EVENT,
      handleSettingsUpdated as EventListener
    );

    return () => {
      window.removeEventListener(
        TODO_SCHEDULE_TYPE_COLOR_SETTINGS_UPDATED_EVENT,
        handleSettingsUpdated as EventListener
      );
    };
  }, []);

  const resolvedScheduleTypeColors = useMemo(
    () => getResolvedTodoScheduleTypeColors(scheduleTypeColorSettings),
    [scheduleTypeColorSettings]
  );

  const activeDraggingEntry = useMemo(() => {
    if (draggingEntry) {
      return draggingEntry;
    }

    if (!externalDraggingTodoId || !externalDraggingType) {
      return null;
    }

    const todo = todos.find((item) => item.id === externalDraggingTodoId);
    if (!todo) {
      return null;
    }

    return {
      todo,
      badges: {
        scheduled: externalDraggingType === 'scheduled',
        deadline: externalDraggingType === 'deadline',
        recurring: false,
        maybe: externalDraggingType === 'maybe',
        completed: false,
        inProgress: false
      },
      primaryKind: externalDraggingType === 'deadline'
        ? 'deadline'
        : (externalDraggingType === 'scheduled' ? 'scheduled' : 'maybe')
    } satisfies TodoDateEntry;
  }, [draggingEntry, externalDraggingTodoId, externalDraggingType, todos]);

  const calendarDays = useMemo(
    () => Array.from({ length: weeksPerPage * 7 }, (_, index) => addDays(pageStartDate, index)),
    [pageStartDate, weeksPerPage]
  );

  const dateKeys = useMemo(
    () => calendarDays.map((day) => formatDateKey(day)),
    [calendarDays]
  );

  const entriesByDate = useMemo(
    () => buildTodoDateEntryMap(todos, logs, dateKeys),
    [dateKeys, logs, todos]
  );
  const calendarWeeks = useMemo(
    () => Array.from({ length: weeksPerPage }, (_, index) => (
      calendarDays.slice(index * 7, (index + 1) * 7)
    )),
    [calendarDays, weeksPerPage]
  );

  const visibleEntryCount = useMemo(
    () => getDesktopMonthVisibleEntryCount(calendarBodyHeight, weeksPerPage),
    [calendarBodyHeight, weeksPerPage]
  );
  const weekLayouts = useMemo<TodoMonthWeekLayout[]>(
    () => calendarWeeks.map((days) => buildTodoMonthWeekLayout(
      days.map((day) => formatDateKey(day)),
      entriesByDate,
      visibleEntryCount,
      { includeTraceSegments: true }
    )),
    [calendarWeeks, entriesByDate, visibleEntryCount]
  );

  const stopDragging = () => {
    setDraggingEntry(null);
    setDragTargetDate(null);
  };

  const handleDrop = (targetDateKey: string) => {
    if (!activeDraggingEntry || !onMoveScheduleEntry || isScheduleLocked) {
      stopDragging();
      return;
    }

    onMoveScheduleEntry(activeDraggingEntry, targetDateKey);
    stopDragging();
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!onWheelPageChange || Math.abs(event.deltaY) < 12) {
      return;
    }

    event.preventDefault();

    if (wheelLockRef.current) {
      return;
    }

    wheelLockRef.current = true;
    window.setTimeout(() => {
      wheelLockRef.current = false;
    }, 180);

    onWheelPageChange(event.deltaY > 0 ? 'next' : 'prev');
  };

  const getTodoMarkerColor = (entry: TodoDateEntry): string => {
    if (markerColorMode === 'category') {
      return todoCategoryColorMap.get(entry.todo.categoryId) || resolvedScheduleTypeColors[getEntryColorKey(entry)];
    }
    return resolvedScheduleTypeColors[getEntryColorKey(entry)];
  };

  const getTodoMarkerStyle = (entry: TodoDateEntry): React.CSSProperties => {
    const markerColor = getTodoMarkerColor(entry);

    if (entry.primaryKind === 'maybe') {
      return {
        border: `1px dashed ${markerColor}`,
        backgroundColor: hexToRgba(markerColor, entryBackgroundOpacity)
      };
    }

    return {
      borderLeftColor: markerColor,
      backgroundColor: hexToRgba(markerColor, entryBackgroundOpacity)
    };
  };

  const monthCellRowStyle = useMemo<React.CSSProperties>(
    () => ({
      display: 'flex',
      alignItems: 'center',
      height: `${MONTH_CELL_LINE_HEIGHT_PX}px`,
      minHeight: `${MONTH_CELL_LINE_HEIGHT_PX}px`
    }),
    []
  );

  const getTraceSegmentStyle = (segment: TodoWeekTraceSegment): React.CSSProperties => {
    const markerColor = getTodoMarkerColor(segment.entry);
    const spanDayCount = segment.endDayIndex - segment.startDayIndex + 1;

    return {
      left: `${(segment.startDayIndex / 7) * 100}%`,
      width: `${(spanDayCount / 7) * 100}%`,
      top: `${MONTH_ENTRY_TOP_OFFSET_PX + (segment.laneIndex * (MONTH_CELL_LINE_HEIGHT_PX + MONTH_ENTRY_ROW_GAP_PX))}px`,
      height: `${MONTH_CELL_LINE_HEIGHT_PX}px`,
      paddingLeft: '3px',
      backgroundColor: hexToRgba(markerColor, entryBackgroundOpacity),
      boxShadow: `inset 1.5px 0 0 ${markerColor}`
    };
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={`grid grid-cols-7 border-b py-1.5 text-[0.6rem] font-bold uppercase tracking-widest ${isDark ? 'border-stone-850/50 bg-stone-950/20 text-stone-500' : 'border-black/90 bg-[rgba(250,249,246,0.16)] text-stone-500'}`}>
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center opacity-40">
            {label}
          </div>
        ))}
      </div>

      <div
        ref={calendarBodyRef}
        className="flex min-h-0 flex-1 flex-col overflow-hidden px-px"
        onWheel={handleWheel}
      >
        {calendarWeeks.map((weekDays, weekIndex) => {
          const weekLayout = weekLayouts[weekIndex];
          const visibleTraceSegments = (weekLayout?.traceSegments || []).filter(
            (segment) => segment.laneIndex < visibleEntryCount
          );

          return (
            <div key={weekDays[0]?.toISOString() || `week-${weekIndex}`} className="relative min-h-0 flex-1">
              <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
                {visibleTraceSegments.map((segment) => (
                  <div
                    key={`${weekIndex}-${segment.todoId}-${segment.startDayIndex}-${segment.endDayIndex}`}
                    className={`absolute flex items-center overflow-hidden font-medium leading-[1.2] ${
                      isDark ? 'text-stone-500' : 'text-stone-400'
                    } text-[0.74rem] ${onOpenTodo ? 'cursor-pointer pointer-events-auto' : ''}`}
                    style={getTraceSegmentStyle(segment)}
                    title={segment.entry.todo.title}
                    onClick={onOpenTodo ? (event) => {
                      event.stopPropagation();
                      void resolveDesktopTodoQuickEditorScreenAnchor(event).then((anchor) => {
                        onOpenTodo(segment.entry.todo, anchor);
                      });
                    } : undefined}
                  >
                    <span className="truncate whitespace-nowrap">{segment.entry.todo.title}</span>
                  </div>
                ))}
              </div>

              <div className="grid h-full grid-cols-7">
                {weekDays.map((day) => {
                  const dateKey = formatDateKey(day);
                  const rowEntries = weekLayout?.rowEntriesByDate[dateKey] || [];
                  const visibleRowEntries = rowEntries.slice(0, visibleEntryCount);
                  const hiddenCount = weekLayout?.hiddenCountByDate[dateKey] ?? 0;
                  const isToday = dateKey === todayDateKey;
                  const isPageStart = isSameDay(day, pageStartDate);
                  const isFirstOfMonth = day.getDate() === 1;

                  return (
                    <div
                      key={dateKey}
                      data-month-drop-date={dateKey}
                      onDragOver={(event) => {
                        if (isScheduleLocked || !activeDraggingEntry) {
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
                        handleDrop(dateKey);
                      }}
                      className={[
                        `relative z-0 flex min-h-0 flex-col border-b border-r ${isDark ? 'border-stone-800/50' : 'border-stone-200/35'} bg-transparent text-left transition-colors duration-200`,
                        isToday ? `z-10 ring-1 ring-inset ${isDark ? 'ring-stone-500/80' : 'ring-stone-400'}` : '',
                        dragTargetDate === dateKey ? (isDark ? 'bg-stone-800/35 ring-2 ring-inset ring-stone-500/60' : 'bg-[rgba(250,249,246,0.32)] ring-2 ring-inset ring-stone-800/75') : ''
                      ].join(' ')}
                      style={{
                        paddingTop: `${MONTH_CELL_VERTICAL_PADDING_PX}px`,
                        paddingBottom: `${MONTH_CELL_VERTICAL_PADDING_PX}px`
                      }}
                    >
                      <div
                        className="flex justify-start px-2"
                        style={{ minHeight: `${MONTH_DAY_NUMBER_ROW_HEIGHT_PX}px` }}
                      >
                        <span
                          className={`rounded-sm text-[1.02rem] leading-none ${isDark ? 'text-stone-100' : 'text-stone-800'}`}
                          style={{
                            ...getCalendarNumberTextStyle(calendarNumberStyle),
                            lineHeight: `${MONTH_DAY_NUMBER_ROW_HEIGHT_PX}px`
                          }}
                        >
                          {format(day, 'dd')}
                        </span>
                      </div>

                      <div
                        className="flex min-h-0 flex-1 flex-col overflow-hidden"
                        style={{
                          marginTop: `${MONTH_ENTRY_TOP_MARGIN_PX}px`,
                          rowGap: `${MONTH_ENTRY_ROW_GAP_PX}px`
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
                                className="invisible overflow-hidden text-clip whitespace-nowrap border-l-[1.5px] pl-[3px] font-medium leading-[1.2] text-[0.74rem]"
                                style={{
                                  ...getTodoMarkerStyle(entry),
                                  ...monthCellRowStyle
                                }}
                              >
                                {entry.todo.title}
                              </div>
                            );
                          }

                          const draggable = isEntryDraggable(entry, isScheduleLocked);
                          const isCompleted = entry.primaryKind === 'completed';
                          const isTrace = entry.primaryKind === 'inProgress';
                          const isDue = entry.primaryKind === 'deadline';
                          const isRecurring = entry.primaryKind === 'recurring';

                          const textClassName = isCompleted
                            ? (isDark ? 'line-through text-stone-500/90' : 'line-through text-stone-400/90')
                            : (isTrace
                              ? (isDark ? 'text-stone-500' : 'text-stone-400')
                              : (isDark ? 'text-stone-200' : 'text-stone-800'));

                          const shapeClassName = entry.primaryKind === 'maybe'
                            ? 'rounded-[2px] px-[3px]'
                            : 'border-l-[1.5px] pl-[3px]';

                          const markerColor = getTodoMarkerColor(entry);

                          return (
                            <div
                              key={`${dateKey}-${entry.todo.id}-${entry.primaryKind}`}
                              draggable={draggable}
                              onDragStart={(event) => {
                                if (!draggable) {
                                  return;
                                }
                                event.dataTransfer.effectAllowed = 'move';
                                event.dataTransfer.setData('text/plain', entry.todo.id);
                                setDraggingEntry(entry);
                              }}
                              onDragEnd={stopDragging}
                              className={`flex items-center justify-between gap-0.5 overflow-hidden font-medium leading-[1.2] ${textClassName} ${shapeClassName} ${
                                draggable ? 'cursor-grab active:cursor-grabbing' : ''
                              } text-[0.74rem]`}
                              style={{
                                ...getTodoMarkerStyle(entry),
                                ...monthCellRowStyle
                              }}
                              title={entry.todo.title}
                            >
                              {onOpenTodo ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void resolveDesktopTodoQuickEditorScreenAnchor(event).then((anchor) => {
                                      onOpenTodo(entry.todo, anchor);
                                    });
                                  }}
                                  className="flex w-full items-center justify-between gap-0.5 text-left"
                                >
                                  <span className="truncate flex-1">{entry.todo.title}</span>
                                  {isDue && (
                                    <Flag size={10} style={{ color: markerColor, fill: markerColor, paddingRight: '2px' }} className="shrink-0 ml-0.5" />
                                  )}
                                  {isRecurring && (
                                    <Repeat2 size={10} style={{ color: markerColor, paddingRight: '2px' }} className="shrink-0 ml-0.5" />
                                  )}
                                </button>
                              ) : (
                                <div className="flex w-full items-center justify-between gap-0.5">
                                  <span className="truncate flex-1">{entry.todo.title}</span>
                                  {isDue && (
                                    <Flag size={10} style={{ color: markerColor, fill: markerColor, paddingRight: '2px' }} className="shrink-0 ml-0.5" />
                                  )}
                                  {isRecurring && (
                                    <Repeat2 size={10} style={{ color: markerColor, paddingRight: '2px' }} className="shrink-0 ml-0.5" />
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {hiddenCount > 0 && (
                          <div className={`pl-[5px] pt-0.5 text-[0.53rem] font-bold uppercase tracking-[0.14em] ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
                            +{hiddenCount}
                          </div>
                        )}
                      </div>

                      {isToday && (
                        <div className={`absolute bottom-1 right-1.5 text-[0.45rem] font-bold uppercase tracking-widest ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
                          TODAY
                        </div>
                      )}

                      {(isFirstOfMonth || isPageStart) && !isToday && (
                        <div className={`absolute bottom-1 right-1.5 text-[0.45rem] font-bold uppercase tracking-widest ${isDark ? 'text-stone-600' : 'text-stone-300'}`}>
                          {format(day, 'MMM')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
