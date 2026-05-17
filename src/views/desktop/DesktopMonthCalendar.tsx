/**
 * @file DesktopMonthCalendar.tsx
 * @input Todo items, logs, current week-page start date, and desktop widget drag callbacks
 * @output Week-paged calendar grid for the Electron desktop month widget
 * @pos View helper (Desktop widget)
 * @description Renders a desktop scheduling calendar that pages by 2/3/4 whole weeks, keeps the app's month-view spacing feel, and supports drag-to-schedule inside the desktop widget.
 * @updated 2026-05-17: Replaced the fixed 6x7 month grid with a dynamic 2/3/4-week page layout so the widget can navigate by week-page units instead of whole months.
 * @updated 2026-05-17: Reused the shared week-trace layout so cross-day trace events render as continuous bars and aligned desktop complete/maybe styling with the app month view.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, format, isSameDay } from 'date-fns';
import { Log, TodoItem } from '../../types';
import {
  buildTodoDateEntryMap,
  buildTodoMonthWeekLayout,
  formatDateKey,
  TodoDateEntry,
  TodoMonthWeekLayout,
  TodoWeekTraceSegment
} from '../../utils/todoScheduleUtils';
import { hexToRgba } from '../../utils/colorUtils';
import {
  getResolvedTodoScheduleTypeColors,
  TODO_SCHEDULE_TYPE_COLOR_SETTINGS_UPDATED_EVENT,
  todoScheduleColorService,
  type TodoScheduleTypeColorKey,
  type TodoScheduleTypeColorSettings
} from '../../services/todoScheduleColorService';

const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONTH_CELL_VERTICAL_PADDING_PX = 6;
const MONTH_DAY_NUMBER_ROW_HEIGHT_PX = 16;
const MONTH_ENTRY_TOP_MARGIN_PX = 6;
const MONTH_ENTRY_TOP_OFFSET_PX = MONTH_CELL_VERTICAL_PADDING_PX + MONTH_DAY_NUMBER_ROW_HEIGHT_PX + MONTH_ENTRY_TOP_MARGIN_PX;
const MONTH_ENTRY_ROW_GAP_PX = 2;
const MONTH_CELL_LINE_HEIGHT_PX = 16;
const WEEKS_PER_PAGE_TO_VISIBLE_ENTRY_COUNT: Record<2 | 3 | 4, number> = {
  2: 5,
  3: 4,
  4: 3
};

interface DesktopMonthCalendarProps {
  todos: TodoItem[];
  logs: Log[];
  pageStartDate: Date;
  weeksPerPage: 2 | 3 | 4;
  onMoveScheduleEntry?: (entry: TodoDateEntry, targetDateKey: string) => void;
  onOpenTodo?: (todo: TodoItem) => void;
  isScheduleLocked?: boolean;
  externalDraggingTodoId?: string | null;
  externalDraggingType?: 'scheduled' | 'deadline' | 'maybe' | null;
  isDark?: boolean;
  onWheelPageChange?: (direction: 'prev' | 'next') => void;
}

const getEntryColorKey = (entry: TodoDateEntry): TodoScheduleTypeColorKey => {
  if (entry.badges.deadline) {
    return 'deadline';
  }
  if (entry.badges.scheduled) {
    return 'scheduled';
  }
  if (entry.badges.maybe) {
    return 'maybe';
  }
  if (entry.badges.recurring) {
    return 'recurring';
  }
  if (entry.badges.completed) {
    return 'completed';
  }
  return 'inProgress';
};

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
  onWheelPageChange
}) => {
  const today = useMemo(() => new Date(), []);
  const todayDateKey = useMemo(() => formatDateKey(today), [today]);
  const wheelLockRef = useRef(false);
  const [draggingEntry, setDraggingEntry] = useState<TodoDateEntry | null>(null);
  const [dragTargetDate, setDragTargetDate] = useState<string | null>(null);
  const [scheduleTypeColorSettings, setScheduleTypeColorSettings] = useState<TodoScheduleTypeColorSettings>(() => (
    todoScheduleColorService.getSettings()
  ));

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

  const visibleEntryCount = WEEKS_PER_PAGE_TO_VISIBLE_ENTRY_COUNT[weeksPerPage];
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

  const getTodoMarkerStyle = (entry: TodoDateEntry): React.CSSProperties => {
    const markerColor = resolvedScheduleTypeColors[getEntryColorKey(entry)];

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
      height: `${MONTH_CELL_LINE_HEIGHT_PX}px`,
      minHeight: `${MONTH_CELL_LINE_HEIGHT_PX}px`
    }),
    []
  );

  const getTraceSegmentStyle = (segment: TodoWeekTraceSegment): React.CSSProperties => {
    const markerColor = resolvedScheduleTypeColors[getEntryColorKey(segment.entry)];
    const spanDayCount = segment.endDayIndex - segment.startDayIndex + 1;

    return {
      left: `${(segment.startDayIndex / 7) * 100}%`,
      width: `${(spanDayCount / 7) * 100}%`,
      top: `${MONTH_ENTRY_TOP_OFFSET_PX + (segment.laneIndex * (MONTH_CELL_LINE_HEIGHT_PX + MONTH_ENTRY_ROW_GAP_PX))}px`,
      height: `${MONTH_CELL_LINE_HEIGHT_PX}px`,
      paddingLeft: '3px',
      backgroundColor: hexToRgba(markerColor, 0.08),
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

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-px" onWheel={handleWheel}>
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
                      isDark ? 'text-stone-200' : 'text-stone-800'
                    } text-[0.74rem]`}
                    style={getTraceSegmentStyle(segment)}
                    title={segment.entry.todo.title}
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
                            fontFamily: '\'Bilbo Swash Caps\', \'Georgia\', \'Times New Roman\', cursive, serif',
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
                          const textClassName = entry.primaryKind === 'completed'
                            ? (isDark ? 'line-through text-stone-500/90' : 'line-through text-stone-400/90')
                            : (isDark ? 'text-stone-200' : 'text-stone-800');
                          const shapeClassName = entry.primaryKind === 'maybe'
                            ? 'rounded-[2px] px-[3px]'
                            : 'border-l-[1.5px] pl-[3px]';

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
                              className={`overflow-hidden text-clip whitespace-nowrap font-medium leading-[1.2] ${textClassName} ${shapeClassName} ${
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
                                    onOpenTodo(entry.todo);
                                  }}
                                  className="block w-full truncate text-left"
                                >
                                  {entry.todo.title}
                                </button>
                              ) : (
                                <div className="truncate">
                                  {entry.todo.title}
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
