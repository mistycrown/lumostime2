/**
 * @file moodCalendarBackgroundService.test.ts
 * @input Persisted mood-calendar background tuning settings
 * @output Regression coverage for independent width and five-week/six-week height mapping
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getMoodCalendarMappedHeightScale,
  moodCalendarBackgroundService
} from './moodCalendarBackgroundService';

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
      heightScale: 1.05,
      weekScale: { fiveWeek: 1.1, sixWeek: 0.9 }
    });

    expect(moodCalendarBackgroundService.getBackgroundById('calendar-1')).toMatchObject({
      offsetX: '12px',
      scale: 1.2,
      heightScale: 1.05,
      weekScale: { fiveWeek: 1.1, sixWeek: 0.9 }
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

describe('getMoodCalendarMappedHeightScale', () => {
  it('uses the five-week mapping for five or fewer calendar rows', () => {
    expect(getMoodCalendarMappedHeightScale({ heightScale: 1.2, weekScale: { fiveWeek: 1.1, sixWeek: 0.86 } }, 5)).toBeCloseTo(1.32);
    expect(getMoodCalendarMappedHeightScale({ heightScale: 1.2, weekScale: { fiveWeek: 1.1, sixWeek: 0.86 } }, 4)).toBeCloseTo(1.32);
  });

  it('uses the six-week mapping for six-row months', () => {
    expect(getMoodCalendarMappedHeightScale({ heightScale: 1.2, weekScale: { fiveWeek: 1.1, sixWeek: 0.86 } }, 6)).toBeCloseTo(1.032);
  });

  it('uses stable default mappings when settings are missing', () => {
    expect(getMoodCalendarMappedHeightScale({}, 5)).toBeCloseTo(1);
    expect(getMoodCalendarMappedHeightScale({}, 6)).toBeCloseTo(1);
  });
});
