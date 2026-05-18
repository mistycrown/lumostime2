/**
 * @file DesktopMonthWidgetView.test.ts
 * @input Page start dates plus navigation mode and rows-per-screen presets
 * @output Regression coverage for desktop month widget navigation step sizes
 * @pos Test (Desktop widget)
 * @description Guards the desktop month widget against reverting wheel/trackpad vertical scrolling back to whole-page jumps when the visible range spans multiple weeks.
 * @updated 2026-05-18: Added coverage for one-week wheel shifts alongside whole-page header navigation.
 */
import { describe, expect, it } from 'vitest';
import { shiftDesktopMonthPageStart } from './DesktopMonthWidgetView';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

describe('shiftDesktopMonthPageStart', () => {
  it('keeps header paging aligned with the configured rows-per-screen', () => {
    const start = new Date(Date.UTC(2026, 4, 18));

    expect(shiftDesktopMonthPageStart(start, 'next', 'page', 3).getTime() - start.getTime()).toBe(3 * ONE_WEEK_MS);
    expect(shiftDesktopMonthPageStart(start, 'prev', 'page', 4).getTime() - start.getTime()).toBe(-4 * ONE_WEEK_MS);
  });

  it('moves wheel navigation by exactly one week regardless of rows-per-screen', () => {
    const start = new Date(Date.UTC(2026, 4, 18));

    expect(shiftDesktopMonthPageStart(start, 'next', 'wheel', 2).getTime() - start.getTime()).toBe(ONE_WEEK_MS);
    expect(shiftDesktopMonthPageStart(start, 'next', 'wheel', 4).getTime() - start.getTime()).toBe(ONE_WEEK_MS);
    expect(shiftDesktopMonthPageStart(start, 'prev', 'wheel', 3).getTime() - start.getTime()).toBe(-ONE_WEEK_MS);
  });
});
