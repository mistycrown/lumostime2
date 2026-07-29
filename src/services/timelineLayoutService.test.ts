/**
 * @file timelineLayoutService.test.ts
 * @input Timeline layout validation cases
 * @output Regression coverage for persisted Chronicle layout values
 * @pos Test
 * @description Ensures unknown local storage values cannot switch the Chronicle page to an unsupported layout.
 * @updated 2026-07-29: Added coverage for the initial timeline layout preference.
 */
import { describe, expect, test } from 'vitest';
import {
  DEFAULT_TIMELINE_LAYOUT_MODE,
  TIMELINE_LAYOUT_OPTIONS,
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
});
