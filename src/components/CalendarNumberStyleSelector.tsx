/**
 * @file CalendarNumberStyleSelector.tsx
 * @description Preview selector for switching synchronized month-calendar date number typography in the sponsorship style tab.
 *
 * @updated 2026-07-21: Added a compact lunar-display toggle for all calendar number views.
 */

import React from 'react';
import { Check } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import {
  CALENDAR_NUMBER_STYLE_OPTIONS,
  getCalendarNumberTextStyle,
  type CalendarNumberStyle
} from '../services/calendarNumberStyleService';

export const CalendarNumberStyleSelector: React.FC = () => {
  const {
    calendarNumberStyle,
    setCalendarNumberStyle,
    calendarLunarDisplay,
    setCalendarLunarDisplay
  } = useSettings();

  return (
    <section className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
      <div className="p-4">
        <h4 className="font-bold text-stone-700">月历数字</h4>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {CALENDAR_NUMBER_STYLE_OPTIONS.map((option) => {
            const isSelected = option.value === calendarNumberStyle;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setCalendarNumberStyle(option.value as CalendarNumberStyle)}
                className={`relative flex min-h-[64px] flex-col items-center justify-center rounded-lg border px-1.5 py-1.5 transition-colors ${isSelected
                  ? 'border-stone-700 bg-stone-50 text-stone-800 shadow-[0_4px_12px_rgba(41,37,36,0.08)]'
                  : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300 hover:bg-stone-50/60'}`}
              >
                {isSelected && (
                  <span className="absolute right-2 top-2 text-stone-700" aria-label="已选择">
                    <Check size={14} strokeWidth={2.5} />
                  </span>
                )}
                <span className="leading-none" style={getCalendarNumberTextStyle(option.value)}>
                  21
                </span>
                <span className="mt-1 text-[10px] font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3">
          <span className="text-xs font-medium text-stone-600">显示农历</span>
          <button
            type="button"
            role="switch"
            aria-checked={calendarLunarDisplay}
            aria-label="显示农历"
            onClick={() => setCalendarLunarDisplay((current) => !current)}
            className={`relative h-5 w-9 rounded-full transition-colors ${calendarLunarDisplay ? 'bg-stone-700' : 'bg-stone-200'}`}
          >
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${calendarLunarDisplay ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>
    </section>
  );
};
