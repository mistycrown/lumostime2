/**
 * @file DesktopMonthCalendar.tsx
 * @input Todo items, logs, current display month, and desktop widget drag callbacks
 * @output Fixed 6x7 monthly calendar grid for the Electron desktop month widget
 * @pos View helper (Desktop widget)
 * @description Renders a traditional full-month calendar body that keeps every date visible, follows the app month-view spacing more closely, and supports drag-to-schedule inside the desktop widget.
 * @updated 2026-05-17: Rebuilt the desktop month calendar as a headerless fixed grid so the outer widget can own one unified title bar, wheel month switching, and shared display settings.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, format, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { Log, TodoItem } from '../../types';
import {
  buildTodoDateEntryMap,
  formatDateKey,
  TodoDateEntry
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
const FIXED_MONTH_GRID_DAY_COUNT = 42;
const MONTH_CELL_VERTICAL_PADDING_PX = 6;
const MONTH_DAY_NUMBER_ROW_HEIGHT_PX = 16;
const MONTH_ENTRY_TOP_MARGIN_PX = 6;
const MONTH_ENTRY_ROW_GAP_PX = 2;
const ROWS_PER_SCREEN_TO_VISIBLE_ENTRY_COUNT: Record<2 | 3 | 4 | 5, number> = {
  2: 5,
  3: 4,
  4: 3,
  5: 2
};

interface DesktopMonthCalendarProps {
  todos: TodoItem[];
  logs: Log[];
  displayMonth: Date;
  visibleRowsPerScreen: 2 | 3 | 4 | 5;
  onMoveScheduleEntry?: (entry: TodoDateEntry, targetDateKey: string) => void;
  onOpenTodo?: (todo: TodoItem) => void;
  isScheduleLocked?: boolean;
  externalDraggingTodoId?: string | null;
  externalDraggingType?: 'scheduled' | 'deadline' | 'maybe' | null;
  isDark?: boolean;
  onWheelMonthChange?: (direction: 'prev' | 'next') => void;
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
  displayMonth,
  visibleRowsPerScreen,
  onMoveScheduleEntry,
  onOpenTodo,
  isScheduleLocked = false,
  externalDraggingTodoId = null,
  externalDraggingType = null,
  isDark = false,
  onWheelMonthChange
}) => {
  const todayDateKey = useMemo(() => formatDateKey(new Date()), []);
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

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(displayMonth), { weekStartsOn: 1 });
    return Array.from({ length: FIXED_MONTH_GRID_DAY_COUNT }, (_, index) => addDays(start, index));
  }, [displayMonth]);

  const dateKeys = useMemo(
    () => calendarDays.map((day) => formatDateKey(day)),
    [calendarDays]
  );

  const entriesByDate = useMemo(
    () => buildTodoDateEntryMap(todos, logs, dateKeys),
    [dateKeys, logs, todos]
  );

  const visibleEntryCount = ROWS_PER_SCREEN_TO_VISIBLE_ENTRY_COUNT[visibleRowsPerScreen];

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
    if (!onWheelMonthChange || Math.abs(event.deltaY) < 12) {
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

    onWheelMonthChange(event.deltaY > 0 ? 'next' : 'prev');
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
        className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 overflow-hidden px-px"
        onWheel={handleWheel}
      >
        {calendarDays.map((day) => {
          const dateKey = formatDateKey(day);
          const entries = entriesByDate[dateKey] || [];
          const visibleEntries = entries.slice(0, visibleEntryCount);
          const hiddenCount = Math.max(0, entries.length - visibleEntries.length);
          const isCurrentMonth = isSameMonth(day, displayMonth);
          const isToday = dateKey === todayDateKey;
          const isFirst = day.getDate() === 1;

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
                `relative z-0 flex min-h-0 flex-col border-b border-r ${isDark ? 'border-stone-800/50' : 'border-stone-200/35'} text-left transition-colors duration-200`,
                !isCurrentMonth ? (isDark ? 'bg-stone-950/25' : 'bg-[rgba(245,244,240,0.14)]') : 'bg-transparent',
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
                  className={`rounded-sm text-[1.02rem] leading-none ${
                    isCurrentMonth
                      ? (isDark ? 'text-stone-100' : 'text-stone-800')
                      : (isDark ? 'text-stone-500' : 'text-stone-400')
                  }`}
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
                {visibleEntries.map((entry) => {
                  const colorKey = getEntryColorKey(entry);
                  const markerColor = resolvedScheduleTypeColors[colorKey];
                  const draggable = isEntryDraggable(entry, isScheduleLocked);

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
                      className={`overflow-hidden text-clip whitespace-nowrap border-l-[1.5px] pl-[3px] font-medium leading-[1.2] ${
                        isDark ? (entry.badges.completed ? 'text-stone-500' : 'text-stone-200') : (entry.badges.completed ? 'text-stone-500' : 'text-stone-800')
                      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} text-[0.74rem]`}
                      style={{
                        borderLeftColor: markerColor,
                        backgroundColor: hexToRgba(markerColor, 0.08)
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
                          className={`block w-full truncate text-left ${entry.badges.completed ? 'line-through' : ''}`}
                        >
                          {entry.todo.title}
                        </button>
                      ) : (
                        <div className={`truncate ${entry.badges.completed ? 'line-through' : ''}`}>
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

              {isFirst && !isToday && (
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
};
