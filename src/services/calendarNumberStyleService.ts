/**
 * @file calendarNumberStyleService.ts
 * @description Shared month-calendar number style definitions used by persistence, settings previews, and calendar renderers.
 *
 * @updated 2026-07-21: Added the WenQuanYi Bitmap Song variant to the synchronized calendar number styles.
 */

import { useEffect, useState, type CSSProperties } from 'react';
import { Solar } from 'lunar-javascript';

export type CalendarNumberStyle = 'default' | 'modern' | 'kodeMono' | 'bitmapSong';

export const DEFAULT_CALENDAR_NUMBER_STYLE: CalendarNumberStyle = 'default';

export const CALENDAR_NUMBER_FONT_FAMILY: Record<CalendarNumberStyle, string> = {
  default: "'Bilbo Swash Caps', 'Georgia', 'Times New Roman', cursive, serif",
  modern: "'Lahlit Font', 'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', sans-serif",
  kodeMono: "'Kode Mono', 'Noto Sans Mono CJK SC', 'Microsoft YaHei', monospace",
  bitmapSong: "'WenQuanYi Bitmap Song', 'Noto Serif SC', 'Source Han Serif SC', 'SimSun', serif"
};

export const CALENDAR_NUMBER_STYLE_OPTIONS: Array<{
  value: CalendarNumberStyle;
  label: string;
}> = [
  { value: 'default', label: '默认' },
  { value: 'modern', label: 'Lahlit' },
  { value: 'kodeMono', label: 'Kode' },
  { value: 'bitmapSong', label: '点阵' }
];

export const isCalendarNumberStyle = (value: string | null): value is CalendarNumberStyle => (
  value === 'default' || value === 'modern' || value === 'kodeMono' || value === 'bitmapSong'
);

export const CALENDAR_NUMBER_STYLE_CHANGED_EVENT = 'lumostime:calendar-number-style-changed';
export const CALENDAR_LUNAR_DISPLAY_CHANGED_EVENT = 'lumostime:calendar-lunar-display-changed';
export const CALENDAR_LUNAR_DISPLAY_STORAGE_KEY = 'lumostime_calendar_lunar_display';

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

export const readCalendarLunarDisplay = (): boolean => (
  typeof window !== 'undefined'
  && window.localStorage.getItem(CALENDAR_LUNAR_DISPLAY_STORAGE_KEY) === 'true'
);

export const useCalendarLunarDisplay = (): boolean => {
  const [isEnabled, setIsEnabled] = useState(readCalendarLunarDisplay);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const refresh = () => setIsEnabled(readCalendarLunarDisplay());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === CALENDAR_LUNAR_DISPLAY_STORAGE_KEY) {
        refresh();
      }
    };

    window.addEventListener(CALENDAR_LUNAR_DISPLAY_CHANGED_EVENT, refresh);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(CALENDAR_LUNAR_DISPLAY_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return isEnabled;
};

export const getCalendarLunarLabel = (date: Date): string => {
  const lunar = Solar.fromDate(date).getLunar();
  return lunar.getDay() === 1
    ? `${lunar.getMonthInChinese()}月`
    : lunar.getDayInChinese();
};

export const getCalendarNumberTextStyle = (
  style: CalendarNumberStyle
): CSSProperties => ({
  fontFamily: CALENDAR_NUMBER_FONT_FAMILY[style],
  fontSize: style === 'modern' ? '0.94rem' : '1.02rem',
  letterSpacing: 0
});
