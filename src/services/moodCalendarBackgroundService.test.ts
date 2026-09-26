/**
 * @file moodCalendarBackgroundService.test.ts
 * @input Persisted mood-calendar background tuning settings
 * @output Regression coverage for paired five-week/six-week background persistence
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { moodCalendarBackgroundService } from './moodCalendarBackgroundService';

const createLocalStorageMock = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear()
  };
};

describe('mood calendar background persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock());
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to no background and rejects an unknown selection', () => {
    expect(moodCalendarBackgroundService.getCurrentBackground()).toBe('none');
    moodCalendarBackgroundService.setCurrentBackground('missing');
    expect(moodCalendarBackgroundService.getCurrentBackground()).toBe('none');
  });

  it('persists per-background tuning values', () => {
    moodCalendarBackgroundService.saveCustomSettings('calendar-1', {
      offsetX: '12px',
      scale: 1.2,
      opacity: 0.8
    });

    expect(moodCalendarBackgroundService.getBackgroundById('calendar-1')).toMatchObject({
      offsetX: '12px',
      scale: 1.2,
      opacity: 0.8
    });
  });

  it('exposes separate built-in assets for five-week and six-week calendars', () => {
    expect(moodCalendarBackgroundService.getBackgroundById('calendar-1')).toMatchObject({
      url: expect.stringContaining('/calendar/tuzi/5.png'),
      sixWeekUrl: expect.stringContaining('/calendar/tuzi/6.png')
    });
  });

  it('falls back to no background after deleting the selected custom image', async () => {
    localStorage.setItem('mood_calendar_background_custom_list', JSON.stringify([
      { id: 'custom-1', name: 'Test', type: 'custom', url: 'blob:test' }
    ]));
    moodCalendarBackgroundService.setCurrentBackground('custom-1');

    await expect(moodCalendarBackgroundService.deleteCustomBackground('custom-1')).resolves.toBe(true);
    expect(moodCalendarBackgroundService.getCurrentBackground()).toBe('none');
    expect(localStorage.getItem('mood_calendar_background')).toBe('none');
  });
});
