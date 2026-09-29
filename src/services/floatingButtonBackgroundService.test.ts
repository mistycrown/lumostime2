/**
 * @file floatingButtonBackgroundService.test.ts
 * @input In-memory browser storage and mocked theme image persistence
 * @output Regression coverage for global floating-button image settings
 * @pos Test (UI Customization)
 * @description Verifies scale normalization and safe image replacement/cleanup behavior.
 * @updated 2026-09-29: Added global floating-button background service coverage.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

const { saveImage, deleteImage, getSettingsReferencedImages } = vi.hoisted(() => ({
  saveImage: vi.fn(async () => 'next.webp'),
  deleteImage: vi.fn(async () => undefined),
  getSettingsReferencedImages: vi.fn(() => new Set<string>())
}));

vi.mock('./imageService', () => ({ imageService: { saveImage, deleteImage } }));
vi.mock('./settingsImageReferenceService', () => ({ getSettingsReferencedImages }));

const makeLocalStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key)
  };
};

describe('floatingButtonBackgroundService', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    saveImage.mockClear();
    deleteImage.mockClear();
    getSettingsReferencedImages.mockReset();
    getSettingsReferencedImages.mockReturnValue(new Set<string>());
  });

  it('uses a 100% default and clamps persisted scale to the supported range', async () => {
    vi.stubGlobal('localStorage', makeLocalStorage());
    const { floatingButtonBackgroundService } = await import('./floatingButtonBackgroundService');

    expect(floatingButtonBackgroundService.getSettings()).toEqual({ imageFilename: null, scale: 100 });
    expect(floatingButtonBackgroundService.setScale(240)).toEqual({ imageFilename: null, scale: 200 });
    expect(floatingButtonBackgroundService.setScale(1)).toEqual({ imageFilename: null, scale: 50 });
  });

  it('replaces an unreferenced image but retains a shared image', async () => {
    const localStorage = makeLocalStorage();
    localStorage.setItem('lumostime_floating_button_background_v1', 'old.webp');
    vi.stubGlobal('localStorage', localStorage);
    const { floatingButtonBackgroundService } = await import('./floatingButtonBackgroundService');

    await floatingButtonBackgroundService.setImage(new File(['image'], 'next.webp', { type: 'image/webp' }));
    expect(saveImage).toHaveBeenCalledWith(expect.any(File), 'theme');
    expect(deleteImage).toHaveBeenCalledWith('old.webp');

    localStorage.setItem('lumostime_floating_button_background_v1', 'shared.webp');
    getSettingsReferencedImages.mockReturnValue(new Set(['shared.webp']));
    await floatingButtonBackgroundService.clearImage();
    expect(deleteImage).not.toHaveBeenCalledWith('shared.webp');
  });
});
