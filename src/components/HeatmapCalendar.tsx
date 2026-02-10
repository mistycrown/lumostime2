
/**
 * @file HeatmapCalendar.tsx
 * @input year, month, data map
 * @output Minimalist Month Heatmap
 * @pos Component (Visualization)
 * @description A simple, grid-based heatmap for visualizing daily activity intensity within a specific month.
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
}

export const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({ year, month, data, onMonthChange }) => {
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
  const getColor = (seconds: number) => {
    if (seconds === 0) return { bg: 'bg-stone-100', textColor: 'text-stone-300', useTheme: false };
    const hours = seconds / 3600;
    
    // 使用主题色的不同透明度
    if (hours < 0.5) return { bg: '', textColor: 'text-stone-700', useTheme: true, opacity: 0.15 }; // 15%
    if (hours < 1) return { bg: '', textColor: 'text-stone-700', useTheme: true, opacity: 0.3 };   // 30%
    if (hours < 2) return { bg: '', textColor: 'text-stone-700', useTheme: true, opacity: 0.5 };   // 50%
    if (hours < 4) return { bg: '', textColor: 'text-white', useTheme: true, opacity: 0.7 };       // 70%
    return { bg: '', textColor: 'text-white', useTheme: true, opacity: 1 };                        // 100%
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
          const duration = data.get(day) || 0;
          const colorInfo = getColor(duration);

          return (
            <div
              key={day}
              className={`
                    aspect-square rounded-lg flex flex-col items-center justify-center relative group cursor-pointer transition-colors duration-300
                    ${colorInfo.useTheme ? '' : colorInfo.bg}
                 `}
              style={colorInfo.useTheme ? {
                backgroundColor: `color-mix(in srgb, var(--progress-bar-fill) ${colorInfo.opacity * 100}%, transparent)`
              } : undefined}
            >
              <span className={`text-[10px] font-medium ${colorInfo.textColor}`}>
                {day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
