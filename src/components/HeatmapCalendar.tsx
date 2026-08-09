
/**
 * @file HeatmapCalendar.tsx
 * @input year, month, data map, optional display mode and unknown-day metadata
 * @output Minimalist Month Heatmap
 * @pos Component (Visualization)
 * @description A simple, grid-based heatmap for visualizing daily activity intensity within a specific month. Supports duration, count, and completion-oriented daily-check cells.
 * @updated 2026-08-09: Added count, binary, unknown-day, and caller accent modes for daily-check heatmaps.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HeatmapCalendarProps {
  year: number;
  month: number; // 0-11
  data: Map<number, number>; // day -> seconds
  onMonthChange: (offset: number) => void;
  mode?: 'duration' | 'count' | 'binary';
  target?: number;
  unknownDays?: Set<number>;
  accentColor?: string;
  getDayTitle?: (day: number, value: number | null) => string;
}

export const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({
  year,
  month,
  data,
  onMonthChange,
  mode = 'duration',
  target = 0,
  unknownDays,
  accentColor,
  getDayTitle
}) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun

  const days = [];
  // Pad empty start days
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  // Fill actual days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Helper to determine color intensity using theme colors
  const getColor = (value: number) => {
    if (mode === 'binary') {
      return value > 0
        ? { bg: '', textColor: 'text-white', useTheme: true, opacity: 1 }
        : { bg: 'bg-stone-100', textColor: 'text-stone-400', useTheme: false };
    }

    if (mode === 'duration' && target === 0) {
      const hours = value / 3600;
      if (hours === 0) return { bg: 'bg-stone-100', textColor: 'text-stone-300', useTheme: false };
      if (hours < 0.5) return { bg: '', textColor: 'text-stone-700', useTheme: true, opacity: 0.15 };
      if (hours < 1) return { bg: '', textColor: 'text-stone-700', useTheme: true, opacity: 0.3 };
      if (hours < 2) return { bg: '', textColor: 'text-stone-700', useTheme: true, opacity: 0.5 };
      if (hours < 4) return { bg: '', textColor: 'text-white', useTheme: true, opacity: 0.7 };
      return { bg: '', textColor: 'text-white', useTheme: true, opacity: 1 };
    }

    const normalizedValue = mode === 'duration' ? value / 3600 : value;
    const normalizedTarget = mode === 'duration' ? target / 60 : target;
    const ratio = normalizedTarget > 0
      ? Math.min(1, normalizedValue / normalizedTarget)
      : normalizedValue > 0 ? 1 : 0;

    if (ratio === 0) return { bg: 'bg-stone-100', textColor: 'text-stone-400', useTheme: false };
    if (ratio < 0.25) return { bg: '', textColor: 'text-stone-700', useTheme: true, opacity: 0.15 };
    if (ratio < 0.5) return { bg: '', textColor: 'text-stone-700', useTheme: true, opacity: 0.3 };
    if (ratio < 0.75) return { bg: '', textColor: 'text-stone-700', useTheme: true, opacity: 0.5 };
    if (ratio < 1) return { bg: '', textColor: 'text-white', useTheme: true, opacity: 0.7 };
    return { bg: '', textColor: 'text-white', useTheme: true, opacity: 1 };
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 px-1">
        <span className="text-xl font-bold text-stone-900 font-mono tracking-tight">
          {year} <span className="text-stone-500 font-serif ml-1">{month + 1}月</span>
        </span>
        <div className="flex gap-1 text-stone-400">
          <button
            onClick={() => onMonthChange(-1)}
            className="p-1 hover:bg-stone-100 hover:text-stone-900 rounded-full transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => onMonthChange(1)}
            className="p-1 hover:bg-stone-100 hover:text-stone-900 rounded-full transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-2 md:gap-3">
        {/* Headers */}
        {weekDays.map(d => (
          <div key={d} className="text-center text-[10px] text-stone-400 mb-2 font-medium">
            {d}
          </div>
        ))}

        {days.map((day, idx) => {
          if (day === null) return <div key={`pad-${idx}`} />;
          const value = data.get(day) ?? 0;
          const isUnknown = unknownDays?.has(day) || false;
          const colorInfo = getColor(value);

          return (
            <div
              key={day}
              className={`
                    aspect-square rounded-lg flex flex-col items-center justify-center relative group cursor-pointer transition-colors duration-300
                    ${colorInfo.useTheme ? '' : colorInfo.bg}
                 `}
              style={colorInfo.useTheme ? {
                backgroundColor: `color-mix(in srgb, ${accentColor || 'var(--progress-bar-fill)'} ${colorInfo.opacity * 100}%, transparent)`
              } : undefined}
              title={getDayTitle?.(day, isUnknown ? null : value)}
            >
              <span className={`text-[10px] font-medium ${colorInfo.textColor}`}>
                {isUnknown ? '?' : day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
