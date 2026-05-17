/**
 * @file DesktopMonthCalendar.test.ts
 * @input Height samples for the desktop month widget calendar body
 * @output Regression coverage for desktop month-cell visible row estimation
 * @pos Test (Desktop widget)
 * @description Guards the month widget against falling back to the old fixed per-page overflow cap when a taller window has room to show more entries.
 * @updated 2026-05-17: Added coverage for ResizeObserver-backed visible row estimation in desktop month cells.
 */
import { describe, expect, it } from 'vitest';
import { getDesktopMonthVisibleEntryCount } from './DesktopMonthCalendar';

describe('getDesktopMonthVisibleEntryCount', () => {
  it('falls back to the legacy default before the calendar body has been measured', () => {
    expect(getDesktopMonthVisibleEntryCount(0, 2)).toBe(5);
    expect(getDesktopMonthVisibleEntryCount(0, 3)).toBe(4);
    expect(getDesktopMonthVisibleEntryCount(0, 4)).toBe(3);
  });

  it('uses spare height in month pages before collapsing into overflow', () => {
    expect(getDesktopMonthVisibleEntryCount(500, 4)).toBe(4);
    expect(getDesktopMonthVisibleEntryCount(620, 4)).toBe(5);
    expect(getDesktopMonthVisibleEntryCount(720, 3)).toBe(10);
    expect(getDesktopMonthVisibleEntryCount(840, 3)).toBe(12);
  });

  it('keeps compact windows safe and clamps very tall pages to a hard global maximum', () => {
    expect(getDesktopMonthVisibleEntryCount(280, 4)).toBe(1);
    expect(getDesktopMonthVisibleEntryCount(960, 2)).toBe(12);
  });
});
