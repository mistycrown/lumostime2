/**
 * @file timelineLayoutService.ts
 * @input Persisted timeline layout setting values
 * @output Timeline layout types, options, and validation
 * @pos Service
 * @description Defines the Chronicle page layouts independently from decorative timeline rail styles.
 * @updated 2026-07-29: Added schedule-canvas default-hour options and validation.
 */

export const TIMELINE_LAYOUT_MODES = ['timeline', 'timeline-todo'] as const;

export type TimelineLayoutMode = typeof TIMELINE_LAYOUT_MODES[number];

export interface TimelineLayoutOption {
  value: TimelineLayoutMode;
  label: string;
}

export const DEFAULT_TIMELINE_LAYOUT_MODE: TimelineLayoutMode = 'timeline';
export const DEFAULT_TIMELINE_CANVAS_START_HOUR = 8;
export const TIMELINE_CANVAS_START_HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour);

export const TIMELINE_LAYOUT_OPTIONS: TimelineLayoutOption[] = [
  { value: 'timeline', label: '纯时间轴' },
  { value: 'timeline-todo', label: '时间轴 + 待办' }
];

export const isTimelineLayoutMode = (value: unknown): value is TimelineLayoutMode => (
  typeof value === 'string' && TIMELINE_LAYOUT_MODES.includes(value as TimelineLayoutMode)
);

export const isTimelineCanvasStartHour = (value: unknown): value is number => (
  typeof value === 'number'
  && Number.isInteger(value)
  && TIMELINE_CANVAS_START_HOUR_OPTIONS.includes(value)
);
