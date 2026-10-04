/**
 * @file stickerService.test.ts
 * @input Stored theme packages and standalone custom sticker records
 * @output Regression coverage for theme-independent sticker availability
 * @pos Test (Sticker Resources)
 * @updated 2026-10-04: Covers unselected synchronized theme packages and existing sticker edits.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_KEYS } from '../constants/storageKeys';
import { getStoredCustomStickerState } from './customStickerAssetService';
import { stickerService } from './stickerService';

const createPackage = (id: string) => ({
  id, name: id, importedAt: 10, updatedAt: 20,
  manifest: { config: { stickers: [{
    id: 'garden', name: `${id} Garden`, items: [{ id: 'flower', file: 'assets/flower.webp' }]
  }] } },
  imageAssets: { 'assets/flower.webp': `${id}-flower.webp` }
});

describe('theme-independent sticker library', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key)
    });
    localStorage.setItem(THEME_KEYS.CURRENT_PRESET, 'default');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lists stickers from all synchronized packages without applying their themes', () => {
    localStorage.setItem(THEME_KEYS.IMPORTED_THEME_PACKAGES, JSON.stringify([createPackage('first'), createPackage('second')]));
    expect(stickerService.getCustomStickerSets().map(set => [set.id, set.stickers[0].path])).toEqual([
      ['theme:first:sticker-set-garden', 'first-flower.webp'],
      ['theme:second:sticker-set-garden', 'second-flower.webp']
    ]);
    expect(localStorage.getItem(THEME_KEYS.CURRENT_PRESET)).toBe('default');
    expect(localStorage.getItem('lumostime_default_selector_page')).toBeNull();
    expect(getStoredCustomStickerState()).toEqual(getStoredCustomStickerState());
  });

  it('keeps edits to existing sets and does not duplicate applied theme stickers', () => {
    localStorage.setItem(THEME_KEYS.IMPORTED_THEME_PACKAGES, JSON.stringify([createPackage('first')]));
    localStorage.setItem('lumostime_custom_sticker_sets_v2', JSON.stringify([{
      id: 'theme:first:sticker-set-garden', name: 'Renamed', stickerIds: ['edited'],
      status: 'active', createdAt: 1, updatedAt: 2
    }]));
    localStorage.setItem('lumostime_custom_stickers_v2', JSON.stringify([{
      id: 'edited', setId: 'theme:first:sticker-set-garden', imageFilename: 'edited.webp',
      sortOrder: 0, status: 'active', createdAt: 1, updatedAt: 2
    }]));
    expect(stickerService.getCustomStickerSets()).toMatchObject([{
      name: 'Renamed', stickers: [{ path: 'edited.webp' }]
    }]);
    expect(stickerService.getCustomStickerSets()).toHaveLength(1);
  });

  it('ignores malformed package metadata and sticker entries without saved image filenames', () => {
    const record = createPackage('first');
    record.imageAssets = {} as typeof record.imageAssets;
    localStorage.setItem(THEME_KEYS.IMPORTED_THEME_PACKAGES, JSON.stringify([null, {}, record]));
    expect(stickerService.getCustomStickerSets()).toEqual([]);
  });
});
