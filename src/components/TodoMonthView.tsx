/**
 * @file TodoMonthView.tsx
 * @input Todo items, logs, a reference date, and an optional todo-open callback
 * @output Reference-style rolling month schedule UI backed by real daily todo data
 * @pos Component (Todo scheduling)
 * @description Renders the editorial monthly schedule view adapted from the minimalist demo, using shared todo schedule utilities so each day shows the same real Arrange / Due / Repeat / Done / Trace data as the week planner.
 * @updated 2026-05-10: Replaced seeded demo items with shared real daily todo entries, added month-view-only type marker colors, and preserved the continuous rolling grid plus selected-day expansion behavior.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
import { Log, TodoItem } from '../types';
import {
  buildTodoDateEntryMap,
  formatDateKey,
  TodoDateEntry
} from '../utils/todoScheduleUtils';

interface TodoMonthViewProps {
  todos: TodoItem[];
  logs: Log[];
  referenceDate: Date;
  viewMenuNode: React.ReactNode;
  onOpenTodo?: (todo: TodoItem) => void;
}

interface TodoMonthWeek {
  id: string;
  monthKey: string;
  days: Date[];
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MONTH_VIEW_TYPE_COLORS: Record<TodoDateEntry['primaryKind'], string> = {
  scheduled: '#141414',
  deadline: '#c86a4c',
  recurring: '#768252',
  completed: '#a4a09a',
  inProgress: '#60758b'
};

const buildMonthLabelDate = (value: string): Date => {
  const [month, year] = value.split(' ');
  return new Date(`${month} 1, ${year}`);
};

const isSameCalendarDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate();

const getTodoMarkerColor = (entry: TodoDateEntry): string => MONTH_VIEW_TYPE_COLORS[entry.primaryKind];

export const TodoMonthView: React.FC<TodoMonthViewProps> = ({
  todos,
  logs,
  referenceDate,
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
  const [activeMonth, setActiveMonth] = useState<string>(() => format(referenceDate, 'MMMM yyyy'));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState(600);

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

  useEffect(() => {
    if (containerHeight === 0 || hasInitialScrollRef.current) {
      return;
    }

    scrollToWeekContainingDate(referenceDate);
    hasInitialScrollRef.current = true;
  }, [containerHeight, referenceDate, weeks]);

  useEffect(() => {
    if (!hasInitialScrollRef.current) {
      return;
    }

    scrollToWeekContainingDate(referenceDate);
  }, [referenceDate, weeks]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      let nextMonth = activeMonth;
      let maxRatio = 0;

      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.intersectionRatio <= maxRatio) {
          return;
        }

        const monthLabel = entry.target.getAttribute('data-month');
        if (!monthLabel) {
          return;
        }

        nextMonth = monthLabel;
        maxRatio = entry.intersectionRatio;
      });

      if (maxRatio > 0.1 && nextMonth !== activeMonth) {
        setActiveMonth(nextMonth);
      }
    }, {
      root: scrollRef.current,
      threshold: [0.1, 0.4, 0.7]
    });

    Object.values(observerRefs.current).forEach((element) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [activeMonth, weeks]);

  const activeMonthDate = useMemo(() => buildMonthLabelDate(activeMonth), [activeMonth]);
  const topRowHeight = Math.max(containerHeight / 5, 110);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={headerRef} className="shrink-0 bg-[#FDFCFB]/95 backdrop-blur-sm">
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
              onClick={() => scrollToWeekContainingDate(today)}
              className="flex items-baseline space-x-1.5 px-1 text-left"
              title="跳到今天"
            >
              <span className="text-xl font-serif font-black italic leading-none transition-opacity hover:opacity-60">
                {format(activeMonthDate, 'MMMM')}
              </span>
              <span className="text-sm font-serif font-light italic transition-opacity hover:opacity-60">
                {format(activeMonthDate, 'yyyy')}
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
            {viewMenuNode}
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-black bg-white py-2 text-[0.6rem] font-bold uppercase tracking-widest">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="text-center opacity-40">
              {label}
            </div>
          ))}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto bg-white pb-[10vh] no-scrollbar"
        style={{ scrollBehavior: 'smooth' }}
      >
        {weeks.map((week) => {
          const middleDayOfWeek = week.days[3];
          const monthLabel = format(middleDayOfWeek, 'MMMM yyyy');
          const firstMonthDay = week.days.find((day) => getDate(day) === 1);
          const firstMonthKey = firstMonthDay ? format(startOfMonth(firstMonthDay), 'yyyy-MM-01') : null;

          return (
            <div
              key={week.id}
              data-month={monthLabel}
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
                  const visibleEntries = entries.slice(0, 3);
                  const hiddenCount = Math.max(0, entries.length - visibleEntries.length);
                  const isCurrentMonth = isSameMonth(day, middleDayOfWeek);
                  const isToday = dateKey === todayDateKey;
                  const isSelected = selectedDate === dateKey;
                  const isFirst = getDate(day) === 1;

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => setSelectedDate((previous) => previous === dateKey ? null : dateKey)}
                      className={[
                        'relative flex cursor-pointer flex-col border-b border-r border-stone-100 p-2 text-left transition-colors duration-300',
                        !isCurrentMonth ? 'bg-stone-50/70 opacity-30' : 'bg-white',
                        isToday ? 'z-10 ring-1 ring-inset ring-stone-400' : '',
                        isSelected && !isToday ? 'bg-stone-100/70' : ''
                      ].join(' ')}
                    >
                      <div className="flex justify-start">
                        <span className="text-xl font-serif italic leading-none">
                          {format(day, 'dd')}
                        </span>
                      </div>

                      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
                        {visibleEntries.map((entry) => (
                          <div
                            key={`${dateKey}-${entry.todo.id}-${entry.primaryKind}`}
                            className="truncate border-l-[1.5px] pl-1 text-[0.55rem] font-medium leading-tight text-stone-800"
                            style={{ borderLeftColor: getTodoMarkerColor(entry) }}
                          >
                            {entry.todo.title}
                          </div>
                        ))}

                        {hiddenCount > 0 && (
                          <div className="pl-[7px] text-[0.5rem] font-bold uppercase tracking-[0.18em] text-stone-300">
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
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="overflow-hidden bg-[#FDFCFB] shadow-[inset_0_3px_6px_rgba(0,0,0,0.02)]"
                  >
                    <div className="flex flex-col gap-1.5 px-6 py-4">
                      {(entriesByDate[selectedDate] || []).length > 0 ? (
                        (entriesByDate[selectedDate] || []).map((entry, index) => {
                          const rowClassName = 'flex w-full items-baseline gap-3 rounded px-2 py-1.5 text-left transition-colors hover:bg-black/5';
                          const rowNumberStyle = { color: getTodoMarkerColor(entry) };
                          const markerStyle = { borderLeftColor: getTodoMarkerColor(entry) };

                          if (onOpenTodo) {
                            return (
                              <button
                                key={`${selectedDate}-${entry.todo.id}-${entry.primaryKind}-detail`}
                                type="button"
                                onClick={() => onOpenTodo(entry.todo)}
                                className={rowClassName}
                              >
                                <span className="text-[0.55rem] font-bold uppercase tracking-widest" style={rowNumberStyle}>
                                  {String(index + 1).padStart(2, '0')}
                                </span>
                                <span
                                  className="flex-1 truncate border-l-[1.5px] pl-2 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-stone-800"
                                  style={markerStyle}
                                >
                                  {entry.todo.title}
                                </span>
                              </button>
                            );
                          }

                          return (
                            <div
                              key={`${selectedDate}-${entry.todo.id}-${entry.primaryKind}-detail`}
                              className={rowClassName}
                            >
                              <span className="text-[0.55rem] font-bold uppercase tracking-widest" style={rowNumberStyle}>
                                {String(index + 1).padStart(2, '0')}
                              </span>
                              <span
                                className="flex-1 truncate border-l-[1.5px] pl-2 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-stone-800"
                                style={markerStyle}
                              >
                                {entry.todo.title}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-2 text-[0.65rem] font-bold uppercase tracking-widest text-stone-300">
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
  );
};
