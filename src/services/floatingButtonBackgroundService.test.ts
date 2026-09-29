/**
 * @file floatingButtonBackgroundService.test.ts
 * @input Floating-button image schemes and legacy persisted settings
 * @output Regression coverage for scheme-library migration and cleanup behavior
 * @pos Test (UI Customization)
 * @description Verifies independently selectable floating-button background schemes.
 * @updated 2026-09-29: Covers the selectable multi-scheme background library.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

const { saveImage, deleteImage, getSettingsReferencedImages } = vi.hoisted(() => ({
  saveImage: vi.fn(),
  deleteImage: vi.fn(async () => undefined),
  getSettingsReferencedImages: vi.fn(() => new Set<string>())
}));

vi.mock('./imageService', () => ({
  imageService: { saveImage, deleteImage }
}));

vi.mock('./settingsImageReferenceService', () => ({
  getSettingsReferencedImages
}));

const createLocalStorage = (): Storage => {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
    clear: () => { values.clear(); },
    key: (index) => [...values.keys()][index] ?? null,
    get length() { return values.size; }
  } as Storage;
};

describe('floatingButtonBackgroundService', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    saveImage.mockReset();
    deleteImage.mockClear();
    getSettingsReferencedImages.mockReset();
    getSettingsReferencedImages.mockReturnValue(new Set());
  });

  it('migrates one legacy image into a selected reusable scheme', async () => {
    const localStorage = createLocalStorage();
    vi.stubGlobal('localStorage', localStorage);
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    localStorage.setItem('lumostime_floating_button_background_v1', 'legacy.webp');
    localStorage.setItem('lumostime_floating_button_background_scale_v1', '135');

    const { floatingButtonBackgroundService } = await import('./floatingButtonBackgroundService');

    expect(globalThis.localStorage).toBe(localStorage);
    expect(localStorage.getItem('lumostime_floating_button_background_schemes_v1')).toBeNull();
    expect(floatingButtonBackgroundService.getSettings()).toEqual({ imageFilename: 'legacy.webp', scale: 135 });
    expect(floatingButtonBackgroundService.getSchemes()).toMatchObject([
      { imageFilename: 'legacy.webp', scale: 135, source: 'user' }
    ]);
    expect(floatingButtonBackgroundService.getCurrentSchemeId()).toBeTruthy();
    expect(localStorage.getItem('lumostime_floating_button_background_v1')).toBeNull();
  });

  it('adds, selects, scales, and deletes independent schemes safely', async () => {
    vi.stubGlobal('localStorage', createLocalStorage());
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    saveImage.mockResolvedValueOnce('first.webp').mockResolvedValueOnce('second.webp');
    const { floatingButtonBackgroundService } = await import('./floatingButtonBackgroundService');

    const first = await floatingButtonBackgroundService.addScheme(new File(['first'], 'first.png', { type: 'image/png' }));
    const second = await floatingButtonBackgroundService.addScheme(new File(['second'], 'second.png', { type: 'image/png' }));
    floatingButtonBackgroundService.selectScheme(first.id);
    floatingButtonBackgroundService.setSchemeScale(first.id, 240);

    expect(floatingButtonBackgroundService.getSettings()).toEqual({ imageFilename: 'first.webp', scale: 200 });
    expect(floatingButtonBackgroundService.getSchemes()).toHaveLength(2);

    floatingButtonBackgroundService.selectScheme(second.id);
    getSettingsReferencedImages.mockReturnValue(new Set(['second.webp']));
    await floatingButtonBackgroundService.deleteScheme(second.id);

    expect(floatingButtonBackgroundService.getCurrentSchemeId()).toBeNull();
    expect(floatingButtonBackgroundService.getSchemes()).toMatchObject([{ id: first.id, imageFilename: 'first.webp' }]);
    expect(deleteImage).not.toHaveBeenCalledWith('second.webp');
  });
});
