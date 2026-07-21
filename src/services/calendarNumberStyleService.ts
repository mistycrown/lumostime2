/**
 * @file calendarNumberStyleService.ts
 * @description Shared month-calendar number style definitions used by persistence, settings previews, and calendar renderers.
 *
 * @updated 2026-07-21: Added synchronized default and modern number styles for the app and desktop month calendars.
 */

import { useEffect, useState, type CSSProperties } from 'react';

export type CalendarNumberStyle = 'default' | 'modern';

export const DEFAULT_CALENDAR_NUMBER_STYLE: CalendarNumberStyle = 'default';

export const CALENDAR_NUMBER_FONT_FAMILY: Record<CalendarNumberStyle, string> = {
  default: "'Bilbo Swash Caps', 'Georgia', 'Times New Roman', cursive, serif",
  modern: "'Inter', 'PingFang SC', 'Microsoft YaHei', 'Segoe UI', sans-serif"
};

export const CALENDAR_NUMBER_STYLE_OPTIONS: Array<{
  value: CalendarNumberStyle;
  label: string;
}> = [
  { value: 'default', label: '??' },
  { value: 'modern', label: '??' }
];

export const isCalendarNumberStyle = (value: string | null): value is CalendarNumberStyle => (
  value === 'default' || value === 'modern'
);

export const CALENDAR_NUMBER_STYLE_CHANGED_EVENT = 'lumostime:calendar-number-style-changed';

export const readCalendarNumberStyle = (): CalendarNumberStyle => {
  if (typeof window === 'undefined') {
    return DEFAULT_CALENDAR_NUMBER_STYLE;
  }

  const stored = window.localStorage.getItem('lumostime_calendar_number_style');
  return isCalendarNumberStyle(stored) ? stored : DEFAULT_CALENDAR_NUMBER_STYLE;
};

export const useCalendarNumberStyle = (): CalendarNumberStyle => {
  const [style, setStyle] = useState<CalendarNumberStyle>(readCalendarNumberStyle);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const refreshStyle = () => setStyle(readCalendarNumberStyle());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'lumostime_calendar_number_style') {
        refreshStyle();
      }
    };

    window.addEventListener(CALENDAR_NUMBER_STYLE_CHANGED_EVENT, refreshStyle);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(CALENDAR_NUMBER_STYLE_CHANGED_EVENT, refreshStyle);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return style;
};

export const getCalendarNumberTextStyle = (
  style: CalendarNumberStyle
): CSSProperties => ({
  fontFamily: CALENDAR_NUMBER_FONT_FAMILY[style],
  fontSize: style === 'modern' ? '0.94rem' : '1.02rem',
  fontWeight: style === 'modern' ? 600 : undefined,
  letterSpacing: 0
});
