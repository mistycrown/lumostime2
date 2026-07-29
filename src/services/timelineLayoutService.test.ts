/**
 * @file timelineLayoutService.test.ts
 * @input Timeline layout validation cases
 * @output Regression coverage for persisted Chronicle layout values
 * @pos Test
 * @description Ensures unknown local storage values cannot switch the Chronicle page to an unsupported layout.
 * @updated 2026-07-29: Added coverage for the schedule-canvas default start hour.
 */
import { describe, expect, test } from 'vitest';
import {
  DEFAULT_TIMELINE_LAYOUT_MODE,
  DEFAULT_TIMELINE_CANVAS_START_HOUR,
  TIMELINE_LAYOUT_OPTIONS,
  isTimelineCanvasStartHour,
  isTimelineLayoutMode
} from './timelineLayoutService';

describe('timeline layout preferences', () => {
  test('keeps the existing timeline as the default layout', () => {
    expect(DEFAULT_TIMELINE_LAYOUT_MODE).toBe('timeline');
  });

  test('accepts only the supported persisted layout values', () => {
    expect(TIMELINE_LAYOUT_OPTIONS.map((option) => option.value)).toEqual(['timeline', 'timeline-todo']);
    expect(isTimelineLayoutMode('timeline')).toBe(true);
    expect(isTimelineLayoutMode('timeline-todo')).toBe(true);
    expect(isTimelineLayoutMode('unknown')).toBe(false);
    expect(isTimelineLayoutMode(null)).toBe(false);
  });

  test('uses 08:00 as the safe default canvas location and validates selected hours', () => {
    expect(DEFAULT_TIMELINE_CANVAS_START_HOUR).toBe(8);
    expect(isTimelineCanvasStartHour(0)).toBe(true);
    expect(isTimelineCanvasStartHour(8)).toBe(true);
    expect(isTimelineCanvasStartHour(23)).toBe(true);
    expect(isTimelineCanvasStartHour(-1)).toBe(false);
    expect(isTimelineCanvasStartHour(24)).toBe(false);
    expect(isTimelineCanvasStartHour(8.5)).toBe(false);
  });
});
