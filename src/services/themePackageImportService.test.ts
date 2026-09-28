/**
 * @file themePackageImportService.test.ts
 * @input Minimal version-two theme package ZIP files
 * @output Regression coverage for package replacement, name conflicts, and resource deletion
 * @pos Test (Theme Package Import)
 * @description Verifies same-ID overwrite and direct cleanup of package-owned assets.
 * @updated 2026-09-27: Covers UIIcon first-image preview fallback for theme cards.
 * @updated 2026-09-27: Covers card-background group registration and cleanup for imported theme packages.
 * @updated 2026-09-27: Keeps stable theme sticker IDs and historical mood references readable across package-version replacements.
 * @updated 2026-09-28: Prevents package cleanup from deleting images still used by standalone settings.
 * @updated 2026-09-28: Covers retaining package resources and resolving later same-package imports.
 */

import JSZip from 'jszip';
import { afterEach, describe, expect, it, vi } from 'vitest';

const {
  saveImage,
  deleteImage,
  addCustomFont,
  removeCustomFont,
  setFont,
  loadReviewEntriesSnapshot,
  saveDailyReviews,
  getSettingsReferencedImages
} = vi.hoisted(() => ({
  saveImage: vi.fn(async () => `image-${Math.random()}.webp`),
  deleteImage: vi.fn(async () => undefined),
  addCustomFont: vi.fn(async () => ({ success: false })),
  removeCustomFont: vi.fn(async () => undefined),
  setFont: vi.fn(() => ({ success: true })),
  loadReviewEntriesSnapshot: vi.fn(async () => ({
    dailyReviews: [], weeklyReviews: [], monthlyReviews: [], onThisDayEntries: []
  })),
  saveDailyReviews: vi.fn(async () => undefined),
  getSettingsReferencedImages: vi.fn(() => new Set<string>())
}));

vi.mock('./imageService', () => ({
  imageService: {
    saveImage,
    deleteImage,
    removeFromReferencedList: vi.fn(),
    deleteImageLocalOnly: vi.fn(),
    getReferencedImageManifest: vi.fn(() => ({ content: [] }))
  }
}));

vi.mock('./settingsImageReferenceService', () => ({ getSettingsReferencedImages }));

vi.mock('./fontService', () => ({
  fontService: { addCustomFont, removeCustomFont, setFont }
}));

vi.mock('./appearanceBackupService', () => ({ APPEARANCE_RESTORED_EVENT: 'appearanceRestored' }));

vi.mock('./achievementBottleIconPackService', () => ({
  DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK: 'star1'
}));

vi.mock('../repositories/dataRepository', () => ({
  dataRepository: { loadReviewEntriesSnapshot, saveDailyReviews },
  REVIEW_ENTRIES_UPDATED_EVENT: 'lumostime:review-entries-updated'
}));

const createPackage = async (id: string, name: string, version: string, asset = 'assets/background/main.png'): Promise<Blob> => {
  const zip = new JSZip();
  zip.file('theme.json', JSON.stringify({
    format: 'lumostime-theme-package',
    schemaVersion: 2,
    package: { id, name, version },
    resources: { backgrounds: [{ id: 'main', file: asset }] },
    apply: { background: { resourceId: 'main' } }
  }));
  zip.file(asset, `image-${version}`);
  return zip.generateAsync({ type: 'blob' });
};

const createUiIconPackage = async (): Promise<Blob> => {
  const zip = new JSZip();
  zip.file('theme.json', JSON.stringify({
    format: 'lumostime-theme-package',
    schemaVersion: 2,
    package: { id: 'fish-theme', name: 'Fish Theme', version: '1.0.0' },
    resources: {
      uiIcons: [{
        id: 'fish-icons',
        files: {
          record: 'assets/uiicon/01.webp',
          todo: 'assets/uiicon/02.webp'
        }
      }]
    },
    apply: { uiIcon: { resourceId: 'fish-icons' } }
  }));
  zip.file('assets/uiicon/01.webp', 'first-icon');
  zip.file('assets/uiicon/02.webp', 'second-icon');
  return zip.generateAsync({ type: 'blob' });
};

const createCardBackgroundPackage = async (): Promise<Blob> => {
  const zip = new JSZip();
  zip.file('theme.json', JSON.stringify({
    format: 'lumostime-theme-package',
    schemaVersion: 2,
    package: { id: 'card-theme', name: 'Card Theme', version: '1.0.0' },
    resources: {
      cardBackgroundGroups: [{
        id: 'cards',
        name: 'Theme Cards',
        alignment: 'right-bottom',
        files: ['assets/card-backgrounds/card.webp']
      }]
    },
    apply: {}
  }));
  zip.file('assets/card-backgrounds/card.webp', 'card-background');
  return zip.generateAsync({ type: 'blob' });
};

const createStickerPackage = async (version: string): Promise<Blob> => {
  const zip = new JSZip();
  zip.file('theme.json', JSON.stringify({
    format: 'lumostime-theme-package',
    schemaVersion: 2,
    package: { id: 'sticker-upgrade', name: 'Sticker Upgrade', version },
    resources: {
      stickers: [{
        id: 'garden',
        name: 'Garden',
        items: [{ id: 'flower', name: 'Flower', file: 'assets/stickers/garden/flower.webp' }]
      }]
    },
    apply: { stickers: { defaultPage: 'garden', enabled: true } }
  }));
  zip.file('assets/stickers/garden/flower.webp', `sticker-${version}`);
  return zip.generateAsync({ type: 'blob' });
};

const makeLocalStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear()
  };
};

describe('themePackageImportService', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    saveImage.mockClear();
    deleteImage.mockClear();
    removeCustomFont.mockClear();
    loadReviewEntriesSnapshot.mockClear();
    saveDailyReviews.mockClear();
    getSettingsReferencedImages.mockReset();
    getSettingsReferencedImages.mockReturnValue(new Set<string>());
  });

  it('overwrites an existing package ID and removes its old image assets', async () => {
    vi.stubGlobal('localStorage', makeLocalStorage());
    vi.stubGlobal('window', { addEventListener: vi.fn(), dispatchEvent: vi.fn() });
    saveImage.mockImplementation(async (blob: Blob) => `image-${await blob.text()}.webp`);

    const { themePackageImportService } = await import('./themePackageImportService');
    await themePackageImportService.importPackage(await createPackage('same-id', 'Same Theme', '1.0.0'));
    const result = await themePackageImportService.importPackage(await createPackage('same-id', 'Renamed Theme', '0.1.0'));

    expect(themePackageImportService.getImportedPackages()).toHaveLength(1);
    expect(result.record).toMatchObject({ name: 'Renamed Theme', version: '0.1.0' });
    expect(deleteImage).toHaveBeenCalledWith('image-image-1.0.0.webp');
  });

  it('rejects a duplicate name owned by a different package ID', async () => {
    vi.stubGlobal('localStorage', makeLocalStorage());
    const { themePackageImportService, ThemePackageImportError } = await import('./themePackageImportService');
    await themePackageImportService.importPackage(await createPackage('first-id', 'Same Name', '1.0.0'));

    await expect(themePackageImportService.importPackage(await createPackage('second-id', 'same name', '1.0.0')))
      .rejects.toBeInstanceOf(ThemePackageImportError);
  });

  it('finds uiicon/01.webp as the first UIIcon image for a theme card', async () => {
    vi.stubGlobal('localStorage', makeLocalStorage());
    saveImage.mockImplementation(async (blob: Blob) => `image-${await blob.text()}.webp`);

    const { themePackageImportService, getThemePackageUiIconPreviewFallbackFilename } = await import('./themePackageImportService');
    const { record } = await themePackageImportService.importPackage(await createUiIconPackage());

    expect(record.previewImageFilename).toBeUndefined();
    expect(getThemePackageUiIconPreviewFallbackFilename(record)).toBe('image-first-icon.webp');
  });

  it('finds uiicon/01.webp in archived assets when a package omits a files mapping', async () => {
    vi.stubGlobal('localStorage', makeLocalStorage());
    saveImage.mockImplementation(async (blob: Blob) => `image-${await blob.text()}.webp`);

    const { themePackageImportService, getThemePackageUiIconPreviewFallbackFilename } = await import('./themePackageImportService');
    const { record } = await themePackageImportService.importPackage(await createUiIconPackage());
    const legacyRecord = {
      ...record,
      manifest: {
        ...record.manifest,
        config: { uiIcon: { source: 'asset', themeId: 'fish-icons' } }
      }
    };

    expect(getThemePackageUiIconPreviewFallbackFilename(legacyRecord)).toBe('image-first-icon.webp');
  });

  it('deletes package image assets that have no remaining references', async () => {
    vi.stubGlobal('localStorage', makeLocalStorage());
    vi.stubGlobal('window', { addEventListener: vi.fn(), dispatchEvent: vi.fn() });
    saveImage.mockImplementation(async (blob: Blob) => `image-${await blob.text()}.webp`);

    const { themePackageImportService } = await import('./themePackageImportService');
    await themePackageImportService.importPackage(await createPackage('delete-me', 'Delete Me', '1.0.0'));
    localStorage.setItem('lumostime_card_background_groups_v1', JSON.stringify([
      { id: 'theme:delete-me:card-background-cards', name: 'Package Cards', imageFilenames: ['package-card.webp'] },
      { id: 'user-cards', name: 'User Cards', imageFilenames: ['user-card.webp'] }
    ]));
    deleteImage.mockClear();

    await expect(themePackageImportService.deletePackage('delete-me')).resolves.toBe(true);
    expect(deleteImage).toHaveBeenCalledWith('image-image-1.0.0.webp');
    expect(themePackageImportService.getImportedPackages()).toEqual([]);
    expect(JSON.parse(localStorage.getItem('lumostime_card_background_groups_v1') || '[]')).toEqual([
      { id: 'user-cards', name: 'User Cards', imageFilenames: ['user-card.webp'] }
    ]);
  });

  it('keeps a package image that is still referenced by a standalone Memoir background', async () => {
    vi.stubGlobal('localStorage', makeLocalStorage());
    vi.stubGlobal('window', { addEventListener: vi.fn(), dispatchEvent: vi.fn() });
    saveImage.mockImplementation(async (blob: Blob) => `image-${await blob.text()}.webp`);

    const { themePackageImportService } = await import('./themePackageImportService');
    await themePackageImportService.importPackage(await createPackage('shared-image', 'Shared Image', '1.0.0'));
    getSettingsReferencedImages.mockReturnValue(new Set(['image-image-1.0.0.webp']));
    deleteImage.mockClear();

    await expect(themePackageImportService.deletePackage('shared-image')).resolves.toBe(true);

    expect(deleteImage).not.toHaveBeenCalledWith('image-image-1.0.0.webp');
  });

  it('registers a package card-background group on import and removes it with its synchronized images', async () => {
    vi.stubGlobal('localStorage', makeLocalStorage());
    vi.stubGlobal('window', { addEventListener: vi.fn(), dispatchEvent: vi.fn() });
    saveImage.mockImplementation(async (blob: Blob) => `image-${await blob.text()}.webp`);

    const { themePackageImportService } = await import('./themePackageImportService');
    await themePackageImportService.importPackage(await createCardBackgroundPackage());

    expect(saveImage).toHaveBeenCalledWith(expect.any(Blob), 'theme');
    expect(JSON.parse(localStorage.getItem('lumostime_card_background_groups_v1') || '[]')).toEqual([{
      id: 'theme:card-theme:card-background-cards',
      name: 'Theme Cards',
      imageFilenames: ['image-card-background.webp'],
      alignment: 'right-bottom'
    }]);

    await expect(themePackageImportService.deletePackage('card-theme')).resolves.toBe(true);
    expect(deleteImage).toHaveBeenCalledWith('image-card-background.webp');
    expect(JSON.parse(localStorage.getItem('lumostime_card_background_groups_v1') || '[]')).toEqual([]);
  });

  it('retains selectable package resources and resolves a later same-package import', async () => {
    vi.stubGlobal('localStorage', makeLocalStorage());
    vi.stubGlobal('window', { addEventListener: vi.fn(), dispatchEvent: vi.fn() });
    saveImage.mockImplementation(async (blob: Blob) => `image-${await blob.text()}.webp`);

    const { themePackageImportService } = await import('./themePackageImportService');
    await themePackageImportService.importPackage(await createCardBackgroundPackage());
    deleteImage.mockClear();

    await expect(themePackageImportService.deletePackage('card-theme', { deleteResources: false })).resolves.toBe(true);
    expect(themePackageImportService.getImportedPackages()).toEqual([]);
    expect(themePackageImportService.getRetainedResources('card-theme')).toHaveLength(1);
    expect(deleteImage).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('lumostime_card_background_groups_v1') || '[]')).toMatchObject([{
      id: 'theme:card-theme:card-background-cards'
    }]);

    await expect(themePackageImportService.importPackage(await createCardBackgroundPackage()))
      .rejects.toMatchObject({ code: 'RETAINED_RESOURCES_CONFLICT' });

    const kept = await themePackageImportService.importPackage(
      await createCardBackgroundPackage(),
      { retainedResourceResolution: 'keep' }
    );
    expect(kept.record.id).not.toBe('card-theme');
    expect(kept.record.sourcePackageId).toBe('card-theme');
    expect(JSON.parse(localStorage.getItem('lumostime_card_background_groups_v1') || '[]')).toHaveLength(2);

    deleteImage.mockClear();
    await themePackageImportService.importPackage(
      await createCardBackgroundPackage(),
      { retainedResourceResolution: 'overwrite' }
    );
    expect(themePackageImportService.getRetainedResources('card-theme')).toEqual([]);
    expect(deleteImage).toHaveBeenCalledWith('image-card-background.webp');
    expect(JSON.parse(localStorage.getItem('lumostime_card_background_groups_v1') || '[]')).toHaveLength(2);
  });

  it('keeps stable theme sticker IDs and updates their image filenames when replacing a package', async () => {
    vi.stubGlobal('localStorage', makeLocalStorage());
    vi.stubGlobal('window', { addEventListener: vi.fn(), dispatchEvent: vi.fn() });
    saveImage.mockImplementation(async (blob: Blob) => `image-${await blob.text()}.webp`);

    const setId = 'theme:sticker-upgrade:sticker-set-garden';
    const stickerId = 'theme:sticker-upgrade:sticker-garden-flower';
    const { themePackageImportService } = await import('./themePackageImportService');
    await themePackageImportService.importPackage(await createStickerPackage('1.0.0'));
    localStorage.setItem('lumostime_custom_sticker_sets_v2', JSON.stringify([{
      id: setId, name: 'Garden', stickerIds: [stickerId], status: 'active', createdAt: 1, updatedAt: 1
    }]));
    localStorage.setItem('lumostime_custom_stickers_v2', JSON.stringify([{
      id: stickerId, setId, imageFilename: 'image-sticker-1.0.0.webp', thumbnailFilename: 'thumb_image-sticker-1.0.0.webp',
      sortOrder: 0, status: 'active', createdAt: 1, updatedAt: 1
    }]));
    localStorage.setItem('lumostime_sticker_selector_config', JSON.stringify({
      enabled: true,
      groups: [{ id: 'theme:sticker-upgrade:sticker-group-garden', name: 'Garden', sourceSetIds: [setId] }]
    }));
    localStorage.setItem('lumostime_default_selector_page', setId);
    loadReviewEntriesSnapshot.mockResolvedValue({
      dailyReviews: [{
        id: 'review-1', date: '2026-09-27', createdAt: 1, updatedAt: 1, answers: [],
        moodEmoji: 'image:image-sticker-1.0.0.webp'
      }],
      weeklyReviews: [], monthlyReviews: [], onThisDayEntries: []
    });
    deleteImage.mockClear();

    await themePackageImportService.importPackage(await createStickerPackage('2.0.0'));

    expect(JSON.parse(localStorage.getItem('lumostime_custom_stickers_v2') || '[]')).toMatchObject([{
      id: stickerId,
      setId,
      imageFilename: 'image-sticker-2.0.0.webp',
      thumbnailFilename: 'thumb_image-sticker-2.0.0.webp'
    }]);
    expect(JSON.parse(localStorage.getItem('lumostime_custom_sticker_sets_v2') || '[]')).toMatchObject([{
      id: setId,
      stickerIds: [stickerId]
    }]);
    expect(JSON.parse(localStorage.getItem('lumostime_sticker_selector_config') || '{}')).toMatchObject({
      groups: [{ sourceSetIds: [setId] }]
    });
    expect(localStorage.getItem('lumostime_default_selector_page')).toBe(setId);
    expect(deleteImage).toHaveBeenCalledWith('image-sticker-1.0.0.webp');
    expect(saveDailyReviews).toHaveBeenCalledWith([expect.objectContaining({
      moodEmoji: 'image:image-sticker-2.0.0.webp'
    })]);
  });
});
