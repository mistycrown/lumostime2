/**
 * @file timelineLayoutService.ts
 * @input Persisted timeline layout setting values
 * @output Timeline layout types, options, and validation
 * @pos Service
 * @description Defines the Chronicle page layouts independently from decorative timeline rail styles.
 * @updated 2026-07-29: Removed the fixed schedule-canvas start hour in favor of current-time positioning.
 */

export const TIMELINE_LAYOUT_MODES = ['timeline', 'timeline-todo'] as const;

export type TimelineLayoutMode = typeof TIMELINE_LAYOUT_MODES[number];

export interface TimelineLayoutOption {
  value: TimelineLayoutMode;
  label: string;
}

export const DEFAULT_TIMELINE_LAYOUT_MODE: TimelineLayoutMode = 'timeline';

export const TIMELINE_LAYOUT_OPTIONS: TimelineLayoutOption[] = [
  { value: 'timeline', label: '纯时间轴' },
  { value: 'timeline-todo', label: '时间轴 + 待办' }
];

export const isTimelineLayoutMode = (value: unknown): value is TimelineLayoutMode => (
  typeof value === 'string' && TIMELINE_LAYOUT_MODES.includes(value as TimelineLayoutMode)
);
