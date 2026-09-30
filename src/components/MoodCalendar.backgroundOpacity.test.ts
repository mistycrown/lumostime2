/**
 * @file MoodCalendar.backgroundOpacity.test.ts
 * @input Memoir calendar image-opacity values
 * @output Regression coverage for card-style white-mask opacity semantics
 * @description Verifies that Memoir calendar opacity maps to a white overlay instead of making the image element transparent.
 * @updated 2026-09-30: Added normal, boundary, out-of-range, and non-finite opacity coverage.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';

vi.mock('./IconRenderer', () => ({ IconRenderer: () => null }));
vi.mock('./MoodPicker', () => ({ MoodPickerModal: () => null }));
vi.mock('../contexts/SettingsContext', () => ({ useSettings: () => ({ uiIconTheme: 'default' }) }));
vi.mock('../hooks/useCustomAppearanceEnabled', () => ({ useCustomAppearanceEnabled: () => true }));
vi.mock('../services/moodCalendarBackgroundService', () => ({
  MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT: 'moodCalendarBackgroundChange',
  moodCalendarBackgroundService: {
    getCurrentBackground: () => 'calendar-background',
    getBackgroundById: () => ({
      id: 'calendar-background',
      name: 'Calendar background',
      type: 'custom',
      url: 'blob:calendar-background',
      opacity: 0.25
    }),
    hydrateCustomBackgrounds: () => Promise.resolve()
  }
}));

import { MoodCalendar, getMemoirCalendarMaskOpacity } from './MoodCalendar';

describe('getMemoirCalendarMaskOpacity', () => {
  test.each([
    { imageOpacity: 0, maskOpacity: 1 },
    { imageOpacity: 0.25, maskOpacity: 0.75 },
    { imageOpacity: 1, maskOpacity: 0 }
  ])('maps image opacity $imageOpacity to mask opacity $maskOpacity', ({ imageOpacity, maskOpacity }) => {
    expect(getMemoirCalendarMaskOpacity(imageOpacity)).toBe(maskOpacity);
  });

  test('clamps out-of-range opacity values', () => {
    expect(getMemoirCalendarMaskOpacity(-0.5)).toBe(1);
    expect(getMemoirCalendarMaskOpacity(1.5)).toBe(0);
  });

  test('uses the fully visible image default for missing and non-finite values', () => {
    expect(getMemoirCalendarMaskOpacity(undefined)).toBe(0);
    expect(getMemoirCalendarMaskOpacity(Number.NaN)).toBe(0);
    expect(getMemoirCalendarMaskOpacity(Number.POSITIVE_INFINITY)).toBe(0);
  });

  test('renders a full-opacity image beneath the white mask', () => {
    const markup = renderToStaticMarkup(
      React.createElement(MoodCalendar, {
        year: 2026,
        month: 8,
        dailyReviews: [],
        onUpdateMood: () => undefined,
        onClearMood: () => undefined
      })
    );
    const imageTag = markup.match(/<img[^>]*src="blob:calendar-background"[^>]*>/)?.[0] ?? '';

    expect(imageTag).not.toContain('style=');
    expect(markup).toContain('data-memoir-calendar-background-mask="true"');
    expect(markup).toContain('pointer-events-none absolute inset-0 bg-white');
    expect(markup).toContain('style="opacity:0.75"');
  });
});
