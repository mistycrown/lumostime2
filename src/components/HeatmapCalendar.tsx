
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

  // Helper to determine color intensity (Monochrome)
  const getColor = (seconds: number) => {
    if (seconds === 0) return 'bg-stone-100';
    const hours = seconds / 3600;
    if (hours < 0.5) return 'bg-[#e7e5e4]'; // stone-200
    if (hours < 1) return 'bg-[#a8a29e]';   // stone-400
    if (hours < 2) return 'bg-[#78716c]';   // stone-500
    if (hours < 4) return 'bg-[#57534e]';   // stone-600
    return 'bg-[#1c1917] text-white';       // stone-900
  };

  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

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
          const colorClass = getColor(duration);
          const isDark = colorClass.includes('text-white');

          return (
            <div
              key={day}
              className={`
                    aspect-square rounded-lg flex flex-col items-center justify-center relative group cursor-pointer transition-colors duration-300
                    ${colorClass}
                 `}
            >
              <span className={`text-[10px] font-medium ${isDark ? 'text-white/90' : (duration > 0 ? 'text-stone-700' : 'text-stone-300')}`}>
                {day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
