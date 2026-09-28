/**
 * @file moodCalendarBackgroundService.test.ts
 * @input Persisted single-image Memoir calendar backgrounds
 * @output Regression coverage for selection, opacity, removal, and blob URL rehydration
 * @pos Test (UI Customization)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const imageServiceMocks = vi.hoisted(() => ({
  deleteImage: vi.fn(),
  getImageUrl: vi.fn(),
  saveImage: vi.fn()
}));

vi.mock('./imageService', () => ({ imageService: imageServiceMocks }));

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
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to no background and rejects an unknown selection', () => {
    expect(moodCalendarBackgroundService.getCurrentBackground()).toBe('none');
    moodCalendarBackgroundService.setCurrentBackground('missing');
    expect(moodCalendarBackgroundService.getCurrentBackground()).toBe('none');
  });

  it('reads only the single-image background list', () => {
    localStorage.setItem('mood_calendar_background_custom_list', JSON.stringify([
      { id: 'legacy-pair', name: 'Legacy pair', type: 'custom', url: 'blob:legacy' }
    ]));
    localStorage.setItem('mood_calendar_fill_background_custom_list', JSON.stringify([
      { id: 'single-image', name: 'Single image', type: 'custom', url: 'blob:single', imageFilename: 'single.png' }
    ]));

    expect(moodCalendarBackgroundService.getAllBackgrounds().map((background) => background.id)).toEqual(['none', 'single-image']);
  });

  it('persists opacity per single-image background', () => {
    localStorage.setItem('mood_calendar_fill_background_custom_list', JSON.stringify([
      { id: 'single-image', name: 'Single image', type: 'custom', url: 'blob:single', imageFilename: 'single.png' }
    ]));

    moodCalendarBackgroundService.saveCustomSettings('single-image', { opacity: 0.45 });

    expect(moodCalendarBackgroundService.getBackgroundById('single-image')?.opacity).toBe(0.45);
  });

  it('never exposes an expired persisted blob URL before rehydration', () => {
    localStorage.setItem('mood_calendar_fill_background_custom_list', JSON.stringify([
      { id: 'single-image', name: 'Single image', type: 'custom', url: 'blob:expired', thumbnail: 'blob:expired', imageFilename: 'single.png' }
    ]));

    expect(moodCalendarBackgroundService.getBackgroundById('single-image')).toMatchObject({
      id: 'single-image',
      url: '',
      thumbnail: ''
    });
  });

  it('keeps a rehydrated blob URL in memory instead of persisting it', async () => {
    localStorage.setItem('mood_calendar_fill_background_custom_list', JSON.stringify([
      { id: 'single-image', name: 'Single image', type: 'custom', url: 'blob:expired', thumbnail: 'blob:expired', imageFilename: 'single.png' }
    ]));
    imageServiceMocks.getImageUrl.mockResolvedValue('blob:fresh');

    await moodCalendarBackgroundService.hydrateCustomBackgrounds();

    expect(moodCalendarBackgroundService.getBackgroundById('single-image')).toMatchObject({
      id: 'single-image',
      url: 'blob:fresh',
      thumbnail: 'blob:fresh'
    });
    expect(localStorage.getItem('mood_calendar_fill_background_custom_list')).not.toContain('blob:fresh');
  });

  it('falls back to no background after deleting the selected custom image', async () => {
    localStorage.setItem('mood_calendar_fill_background_custom_list', JSON.stringify([
      { id: 'custom-1', name: 'Test', type: 'custom', url: 'blob:test' }
    ]));
    moodCalendarBackgroundService.setCurrentBackground('custom-1');

    await expect(moodCalendarBackgroundService.deleteCustomBackground('custom-1')).resolves.toBe(true);
    expect(moodCalendarBackgroundService.getCurrentBackground()).toBe('none');
    expect(localStorage.getItem('mood_calendar_fill_background')).toBe('none');
  });
});
