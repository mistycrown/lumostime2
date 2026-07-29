/**
 * @file TimelineScheduleCanvas.tsx
 * @input Selected date, logs, categories, default scroll hour, and record callbacks
 * @output A full-day scrollable schedule canvas with touch pinch zoom
 * @pos Component
 * @description Positions real records on a 00:00-24:00 time grid for the Chronicle timeline-and-todo layout.
 * @updated 2026-07-29: Added the initial full-day visual schedule canvas and two-finger zoom support.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Category, Log, TodoItem } from '../types';
import { toCssColor } from '../utils/colorUtils';

const MIN_HOUR_HEIGHT = 52;
const MAX_HOUR_HEIGHT = 180;
const DEFAULT_HOUR_HEIGHT = 88;
const DAY_MINUTES = 24 * 60;

interface TimelineScheduleCanvasProps {
  currentDate: Date;
  logs: Log[];
  categories: Category[];
  todos: TodoItem[];
  defaultStartHour: number;
  onEditLog: (log: Log) => void;
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const getTouchDistance = (first: Touch, second: Touch): number => Math.hypot(
  second.clientX - first.clientX,
  second.clientY - first.clientY
);

const formatTime = (value: Date): string => `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;

export const TimelineScheduleCanvas: React.FC<TimelineScheduleCanvasProps> = ({
  currentDate,
  logs,
  categories,
  todos,
  defaultStartHour,
  onEditLog
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pinchRef = useRef<{ distance: number; hourHeight: number } | null>(null);
  const initializedDateRef = useRef<string>('');
  const [hourHeight, setHourHeight] = useState(DEFAULT_HOUR_HEIGHT);

  const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
  const dayStart = useMemo(() => {
    const value = new Date(currentDate);
    value.setHours(0, 0, 0, 0);
    return value;
  }, [dateKey]);
  const dayEnd = useMemo(() => dayStart.getTime() + 24 * 60 * 60 * 1000, [dayStart]);
  const canvasHeight = 24 * hourHeight;

  const scheduledLogs = useMemo(() => logs
    .filter((log) => log.startTime < dayEnd && log.endTime > dayStart.getTime())
    .map((log) => {
      const displayStart = Math.max(log.startTime, dayStart.getTime());
      const displayEnd = Math.min(log.endTime, dayEnd);
      const topMinutes = (displayStart - dayStart.getTime()) / 60000;
      const durationMinutes = Math.max(1, (displayEnd - displayStart) / 60000);
      const category = categories.find((item) => item.id === log.categoryId);
      const activity = category?.activities.find((item) => item.id === log.activityId);
      const linkedTodo = todos.find((item) => item.id === log.linkedTodoId);
      const colorSource = activity?.color || category?.themeColor || '';

      return {
        log,
        top: (topMinutes / 60) * hourHeight,
        height: Math.max(42, (durationMinutes / 60) * hourHeight),
        color: toCssColor(colorSource, 'fill'),
        background: toCssColor(colorSource, 'background', 0.34),
        startLabel: formatTime(new Date(log.startTime)),
        endLabel: formatTime(new Date(log.endTime)),
        categoryLabel: activity?.name || category?.name || '未分类',
        linkedTodoLabel: linkedTodo?.title
      };
    }), [logs, categories, todos, dayStart, dayEnd, hourHeight]);

  useEffect(() => {
    if (!scrollRef.current || initializedDateRef.current === dateKey) return;
    initializedDateRef.current = dateKey;
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = defaultStartHour * hourHeight;
      }
    });
  }, [dateKey, defaultStartHour, hourHeight]);

  const setCanvasScale = (nextHourHeight: number) => {
    const next = clamp(nextHourHeight, MIN_HOUR_HEIGHT, MAX_HOUR_HEIGHT);
    const scrollContainer = scrollRef.current;
    const visibleMinute = scrollContainer ? (scrollContainer.scrollTop / hourHeight) * 60 : 0;
    setHourHeight(next);
    requestAnimationFrame(() => {
      if (scrollContainer) {
        scrollContainer.scrollTop = (visibleMinute / 60) * next;
      }
    });
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
    if (event.touches.length < 2) {
      pinchRef.current = null;
    }
  };

  return (
    <section className="relative min-h-0 flex-1 overflow-hidden border-t border-stone-200/80 bg-[#fdfbf7]/72" aria-label="全天时间轴">
      <div className="absolute right-3 top-3 z-10 flex overflow-hidden rounded-lg border border-stone-200 bg-white/95 shadow-sm">
        <button type="button" onClick={() => setCanvasScale(hourHeight - 16)} className="p-2 text-stone-400 transition-colors hover:bg-stone-50 hover:text-stone-700" aria-label="缩小时间轴">
          <Minus size={15} />
        </button>
        <button type="button" onClick={() => setCanvasScale(hourHeight + 16)} className="border-l border-stone-100 p-2 text-stone-400 transition-colors hover:bg-stone-50 hover:text-stone-700" aria-label="放大时间轴">
          <Plus size={15} />
        </button>
      </div>
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto overscroll-contain pb-28 touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div className="relative min-w-0" style={{ height: `${canvasHeight}px` }}>
          {Array.from({ length: 25 }, (_, hour) => {
            const top = hour * hourHeight;
            return (
              <React.Fragment key={hour}>
                <div className="absolute left-0 right-0 border-t border-stone-200/80" style={{ top }} />
                {hour < 24 && <div className="absolute left-14 right-0 border-t border-dashed border-stone-100" style={{ top: top + hourHeight / 2 }} />}
                <span className="absolute left-0 w-12 -translate-y-1/2 pr-2 text-right text-[10px] font-bold tabular-nums text-stone-400" style={{ top }}>
                  {String(hour).padStart(2, '0')}:00
                </span>
              </React.Fragment>
            );
          })}

          <div className="absolute inset-y-0 left-14 right-3">
            {scheduledLogs.map(({ log, top, height, color, background, startLabel, endLabel, categoryLabel, linkedTodoLabel }) => (
              <button
                key={log.id}
                type="button"
                onClick={() => onEditLog(log)}
                className="absolute left-0 right-0 overflow-hidden border-l-[3px] px-3 py-2 text-left shadow-[0_1px_2px_rgba(28,25,23,0.06)] transition-shadow hover:shadow-[0_5px_16px_rgba(28,25,23,0.14)]"
                style={{ top: `${top}px`, height: `${height}px`, borderColor: color, backgroundColor: background }}
              >
                <span className="block truncate text-sm font-bold leading-5 text-stone-800">{log.note?.split('\n')[0] || categoryLabel}</span>
                <span className="mt-0.5 block text-[11px] font-medium tabular-nums text-stone-500">{startLabel} - {endLabel}</span>
                {height >= 66 && (
                  <span className="mt-1 block truncate text-[11px] text-stone-500">{linkedTodoLabel ? `@ ${linkedTodoLabel}` : categoryLabel}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
