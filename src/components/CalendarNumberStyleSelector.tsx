/**
 * @file CalendarNumberStyleSelector.tsx
 * @description Preview selector for switching synchronized month-calendar date number typography in the sponsorship style tab.
 *
 * @updated 2026-07-21: Added default and modern calendar number style selection with live numeric previews.
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
  const { calendarNumberStyle, setCalendarNumberStyle } = useSettings();

  return (
    <section className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
      <div className="p-4">
        <h4 className="font-bold text-stone-700">????</h4>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {CALENDAR_NUMBER_STYLE_OPTIONS.map((option) => {
            const isSelected = option.value === calendarNumberStyle;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setCalendarNumberStyle(option.value as CalendarNumberStyle)}
                className={`relative flex min-h-[86px] flex-col items-center justify-center rounded-lg border px-3 py-2 transition-colors ${isSelected
                  ? 'border-stone-700 bg-stone-50 text-stone-800 shadow-[0_4px_12px_rgba(41,37,36,0.08)]'
                  : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300 hover:bg-stone-50/60'}`}
              >
                {isSelected && (
                  <span className="absolute right-2 top-2 text-stone-700" aria-label="???">
                    <Check size={14} strokeWidth={2.5} />
                  </span>
                )}
                <span className="leading-none" style={getCalendarNumberTextStyle(option.value)}>
                  21
                </span>
                <span className="mt-2 text-xs font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
