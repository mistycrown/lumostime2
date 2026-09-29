/**
 * @file moodCalendarBackgroundService.test.ts
 * @input Persisted single-image Memoir calendar backgrounds
 * @output Regression coverage for selection, opacity, removal, and blob URL rehydration
 * @pos Test (UI Customization)
 * @updated 2026-09-29: Covers temporary URL persistence, hydration deduplication, concurrent list updates, and same-ID replacements.
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
    vi.resetAllMocks();
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

  it('does not persist a native data URL returned for a newly uploaded background', async () => {
    imageServiceMocks.saveImage.mockResolvedValue('native.png');
    imageServiceMocks.getImageUrl.mockResolvedValue('data:image/png;base64,AAAA');

    const background = await moodCalendarBackgroundService.addCustomBackground({ name: 'native.png' } as File);

    expect(moodCalendarBackgroundService.getBackgroundById(background.id)?.url).toBe('data:image/png;base64,AAAA');
    expect(localStorage.getItem('mood_calendar_fill_background_custom_list')).not.toContain('data:image/png;base64,AAAA');
  });

  it('shares one in-flight hydration task across concurrent callers', async () => {
    localStorage.setItem('mood_calendar_fill_background_custom_list', JSON.stringify([
      { id: 'shared-hydration', name: 'Shared', type: 'custom', url: '', imageFilename: 'shared.png' }
    ]));
    let resolveImageUrl: (url: string) => void = () => undefined;
    imageServiceMocks.getImageUrl.mockReturnValue(new Promise<string>((resolve) => {
      resolveImageUrl = resolve;
    }));

    const first = moodCalendarBackgroundService.hydrateCustomBackgrounds();
    const second = moodCalendarBackgroundService.hydrateCustomBackgrounds();

    expect(second).toBe(first);
    expect(imageServiceMocks.getImageUrl).toHaveBeenCalledTimes(1);
    resolveImageUrl('blob:shared');
    await first;
  });

  it('does not overwrite a background added while hydration is in flight', async () => {
    const original = { id: 'hydrate-original', name: 'Original', type: 'custom', url: '', imageFilename: 'original.png' };
    const added = { id: 'hydrate-added', name: 'Added', type: 'custom', url: '', imageFilename: 'added.png' };
    localStorage.setItem('mood_calendar_fill_background_custom_list', JSON.stringify([original]));
    let resolveImageUrl: (url: string) => void = () => undefined;
    imageServiceMocks.getImageUrl.mockImplementation((filename: string) => (
      filename === 'original.png'
        ? new Promise<string>((resolve) => {
            resolveImageUrl = resolve;
          })
        : Promise.resolve('blob:added')
    ));

    const hydration = moodCalendarBackgroundService.hydrateCustomBackgrounds();
    localStorage.setItem('mood_calendar_fill_background_custom_list', JSON.stringify([original, added]));
    resolveImageUrl('blob:original');
    await hydration;

    expect(JSON.parse(localStorage.getItem('mood_calendar_fill_background_custom_list') || '[]').map((item: { id: string }) => item.id))
      .toEqual(['hydrate-original', 'hydrate-added']);
    expect(imageServiceMocks.getImageUrl).toHaveBeenCalledTimes(2);
    expect(moodCalendarBackgroundService.getBackgroundById('hydrate-added')?.url).toBe('blob:added');
  });

  it('invalidates a cached URL when the same background id points to a replacement file', async () => {
    localStorage.setItem('mood_calendar_fill_background_custom_list', JSON.stringify([
      { id: 'same-id-replacement', name: 'Old', type: 'custom', url: '', imageFilename: 'old.png' }
    ]));
    imageServiceMocks.getImageUrl.mockResolvedValueOnce('blob:old');
    await moodCalendarBackgroundService.hydrateCustomBackgrounds();
    expect(moodCalendarBackgroundService.getBackgroundById('same-id-replacement')?.url).toBe('blob:old');

    localStorage.setItem('mood_calendar_fill_background_custom_list', JSON.stringify([
      { id: 'same-id-replacement', name: 'New', type: 'custom', url: '', imageFilename: 'new.png' }
    ]));
    imageServiceMocks.getImageUrl.mockResolvedValueOnce('blob:new');

    expect(moodCalendarBackgroundService.getBackgroundById('same-id-replacement')?.url).toBe('');
    await moodCalendarBackgroundService.hydrateCustomBackgrounds();
    expect(moodCalendarBackgroundService.getBackgroundById('same-id-replacement')?.url).toBe('blob:new');
  });

  it('retries an unavailable image on the next hydration request without clearing the selection', async () => {
    localStorage.setItem('mood_calendar_fill_background_custom_list', JSON.stringify([
      { id: 'retry-image', name: 'Retry', type: 'custom', url: '', imageFilename: 'retry.png' }
    ]));
    localStorage.setItem('mood_calendar_fill_background', 'retry-image');
    imageServiceMocks.getImageUrl.mockResolvedValueOnce('').mockResolvedValueOnce('blob:retry');

    await moodCalendarBackgroundService.hydrateCustomBackgrounds();
    expect(moodCalendarBackgroundService.getCurrentBackground()).toBe('retry-image');
    expect(moodCalendarBackgroundService.getBackgroundById('retry-image')?.url).toBe('');

    await moodCalendarBackgroundService.hydrateCustomBackgrounds();
    expect(moodCalendarBackgroundService.getBackgroundById('retry-image')?.url).toBe('blob:retry');
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
