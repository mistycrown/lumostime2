/**
 * @file themePackageImportService.test.ts
 * @input Minimal version-two theme package ZIP files
 * @output Regression coverage for package replacement, name conflicts, and resource deletion
 * @pos Test (Theme Package Import)
 * @description Verifies same-ID overwrite and direct cleanup of package-owned assets.
 * @updated 2026-09-27: Covers UIIcon first-image preview fallback for theme cards.
 * @updated 2026-09-27: Covers card-background group registration and cleanup for imported theme packages.
 */

import JSZip from 'jszip';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { saveImage, deleteImage, addCustomFont, removeCustomFont, setFont } = vi.hoisted(() => ({
  saveImage: vi.fn(async () => `image-${Math.random()}.webp`),
  deleteImage: vi.fn(async () => undefined),
  addCustomFont: vi.fn(async () => ({ success: false })),
  removeCustomFont: vi.fn(async () => undefined),
  setFont: vi.fn(() => ({ success: true }))
}));

vi.mock('./imageService', () => ({
  imageService: { saveImage, deleteImage, removeFromReferencedList: vi.fn(), deleteImageLocalOnly: vi.fn() }
}));

vi.mock('./fontService', () => ({
  fontService: { addCustomFont, removeCustomFont, setFont }
}));

vi.mock('./appearanceBackupService', () => ({ APPEARANCE_RESTORED_EVENT: 'appearanceRestored' }));

vi.mock('./achievementBottleIconPackService', () => ({
  DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK: 'star1'
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

  it('deletes the package image assets without reference checks', async () => {
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
});
