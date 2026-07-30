/**
 * @file timelineSidebarRatioUtils.test.ts
 * @input Stored ratio and legacy width fixtures
 * @output Regression coverage for responsive Chronicle sidebar ratio persistence
 * @pos Test
 * @updated 2026-07-30: Covers default, migration, and 26%-70% ratio bounds.
 * @updated 2026-07-30: Covers shared 26%-70% bounds and quick-color legacy width migration.
 */
import { describe, expect, test } from 'vitest';
import {
  clampTimelineTodoSidebarRatio,
  DEFAULT_TIMELINE_QUICK_COLOR_SIDEBAR_RATIO,
  DEFAULT_TIMELINE_TODO_SIDEBAR_RATIO,
  readTimelineQuickColorSidebarRatio,
  readTimelineTodoSidebarRatio
} from './timelineSidebarRatioUtils';

describe('timeline todo sidebar ratio', () => {
  test('keeps the todo sidebar between 26% and 70%', () => {
    expect(clampTimelineTodoSidebarRatio(0.1)).toBe(0.26);
    expect(clampTimelineTodoSidebarRatio(0.8)).toBe(0.7);
    expect(clampTimelineTodoSidebarRatio(0.5)).toBe(0.5);
  });

  test('prefers a persisted ratio over the former pixel setting', () => {
    expect(readTimelineTodoSidebarRatio('0.6', '320', 400)).toBe(0.6);
  });

  test('migrates a former pixel width using the current viewport width', () => {
    expect(readTimelineTodoSidebarRatio(null, '320', 640)).toBe(0.5);
    expect(readTimelineTodoSidebarRatio(null, '120', 640)).toBe(0.26);
  });

  test('uses the 40% default when neither preference is valid', () => {
    expect(readTimelineTodoSidebarRatio(null, null, 640)).toBe(DEFAULT_TIMELINE_TODO_SIDEBAR_RATIO);
  });
});

describe('timeline quick-color sidebar ratio', () => {
  test('prefers a persisted ratio over the former pixel setting', () => {
    expect(readTimelineQuickColorSidebarRatio('0.34', '280', 700)).toBe(0.34);
  });

  test('migrates a former pixel width using the current viewport width', () => {
    expect(readTimelineQuickColorSidebarRatio(null, '280', 700)).toBe(0.4);
    expect(readTimelineQuickColorSidebarRatio(null, '120', 700)).toBe(0.26);
  });

  test('uses the quick-color default when neither preference is valid', () => {
    expect(readTimelineQuickColorSidebarRatio(null, null, 700)).toBe(DEFAULT_TIMELINE_QUICK_COLOR_SIDEBAR_RATIO);
  });
});
