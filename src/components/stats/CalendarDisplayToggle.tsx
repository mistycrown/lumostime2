/**
 * @file CalendarDisplayToggle.tsx
 * @input Persisted value visibility, numeric value kind and update callback.
 * @output A single accessible icon action for calendar display, placed beside its chart title.
 * @pos Component (Shared Statistics Calendar)
 * @updated 2026-10-25: Replaces text mode pills for cross-day, tag-duration and category-duration calendars.
 */
import React from 'react';
import { Grid2X2, ListOrdered } from 'lucide-react';

interface CalendarDisplayToggleProps {
  showValues: boolean;
  kind?: 'duration' | 'clock';
  onChange: (show: boolean) => void;
}

export const CalendarDisplayToggle: React.FC<CalendarDisplayToggleProps> = ({ showValues, kind = 'duration', onChange }) => {
  const Icon = showValues ? Grid2X2 : ListOrdered;
  return <button type="button" aria-label="切换日历数值显示" aria-pressed={showValues}
    title={showValues ? '仅显示色块' : kind === 'clock' ? '显示每日时刻' : '显示每日时长'}
    onClick={() => onChange(!showValues)}
    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-stone-100 ${showValues ? 'bg-stone-100 text-stone-700' : 'text-stone-400'}`}>
    <Icon size={14} aria-hidden="true" />
  </button>;
};
