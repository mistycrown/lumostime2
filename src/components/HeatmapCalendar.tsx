/**
 * @file HeatmapCalendar.tsx
 * @input Month, daily-check records, display mode, and optional temporary backfill controls
 * @output Month heatmap with record-aware daily-check cells
 * @pos Component (Visualization)
 * @description Renders a Monday-first month grid whose empty dates remain visible without a background, while recorded checks expose completion, measured values, and temporary manual backfill actions.
 * @updated 2026-08-09: Matched detail timeline month navigation, restored empty date numerals, and added record-aware captions plus backfill mode.
 *
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface HeatmapCalendarDayData {
  value: number | null;
  hasRecord: boolean;
  isCompleted: boolean;
}

interface HeatmapCalendarProps {
  year: number;
  month: number;
  data: Map<number, HeatmapCalendarDayData>;
  onMonthChange: (offset: number) => void;
  accentColor?: string;
  getDayCaption?: (day: number, data: HeatmapCalendarDayData) => string | null;
  getDayTitle?: (day: number, data: HeatmapCalendarDayData) => string;
  isBackfillMode?: boolean;
  onBackfillModeChange?: (enabled: boolean) => void;
  onDayClick?: (day: number) => void;
}

const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({
  year,
  month,
  data,
  onMonthChange,
  accentColor,
  getDayCaption,
  getDayTitle,
  isBackfillMode = false,
  onBackfillModeChange,
  onDayClick
}) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const days: Array<number | null> = Array.from({ length: firstDayOffset }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(day);
  }

  const getColor = (dayData: HeatmapCalendarDayData) => {
    if (!dayData.hasRecord) {
      return { className: 'bg-transparent text-stone-400', style: undefined };
    }

    if (!dayData.isCompleted) {
      return { className: 'bg-stone-100 text-stone-500', style: undefined };
    }

    return {
      className: 'text-white',
      style: { backgroundColor: accentColor || 'var(--progress-bar-fill)' }
    };
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex min-h-8 flex-wrap items-center justify-center gap-2 px-1 sm:relative">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onMonthChange(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-600 transition-colors hover:bg-stone-100/70"
            title="上个月"
            aria-label="上个月"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-[92px] text-center font-mono text-lg font-bold tabular-nums text-stone-800">
            {year}.{String(month + 1).padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={() => onMonthChange(1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-600 transition-colors hover:bg-stone-100/70"
            title="下个月"
            aria-label="下个月"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {onBackfillModeChange && (
          <label className="flex items-center gap-1.5 text-xs text-stone-500 sm:absolute sm:right-0">
            <input
              type="checkbox"
              checked={isBackfillMode}
              onChange={(event) => onBackfillModeChange(event.target.checked)}
              className="h-3.5 w-3.5 accent-stone-700"
            />
            补打卡模式
          </label>
        )}
      </div>

      <div className="grid grid-cols-7 gap-2 px-2">
        {WEEK_DAYS.map((day) => (
          <div key={day} className="mb-0.5 text-center text-[10px] font-medium text-stone-400">
            {day}
          </div>
        ))}

        {days.map((day, index) => {
          if (day === null) {
            return <div key={`pad-${index}`} aria-hidden="true" />;
          }

          const dayData = data.get(day) || { value: null, hasRecord: false, isCompleted: false };
          const color = getColor(dayData);
          const caption = getDayCaption?.(day, dayData);
          const isClickable = Boolean(onDayClick && isBackfillMode);

          return (
            <button
              key={day}
              type="button"
              onClick={() => onDayClick?.(day)}
              disabled={!isClickable}
              className={`aspect-square rounded-lg ${isClickable ? 'cursor-pointer active:scale-95' : 'cursor-default'} flex flex-col items-center justify-center transition-all ${color.className}`}
              style={color.style}
              title={getDayTitle?.(day, dayData)}
              aria-label={getDayTitle?.(day, dayData)}
            >
              <span className={`font-medium leading-none ${caption ? 'text-[13px]' : 'text-sm'}`}>
                {day}
              </span>
              {caption && (
                <span className="mt-1 max-w-full truncate px-0.5 text-[8px] font-semibold leading-none">
                  {caption}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
