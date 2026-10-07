/**
 * @file appearanceBackupService.test.ts
 * @input Modern navigation settings and appearance backup snapshots
 * @output Regression coverage for navigation backup, image references, and restore hydration
 * @pos Test (Cloud Sync)
 * @updated 2026-10-04: Covers modern navigation backgrounds across devices and legacy backups.
 * @updated 2026-10-05: Covers metadata-only backups and quota-safe restoration of legacy image URLs.
 * @updated 2026-10-07: Verifies modern navigation background adjustments remain local-only.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./fontService', () => ({
  fontService: { getAllFonts: () => [{ id: 'default', source: 'builtin' }], setFont: vi.fn() }
}));
vi.mock('./uiIconService', () => ({
  UI_ICON_CUSTOM_ASSETS_KEY: 'lumostime_ui_icon_custom_assets_v1',
  UI_ICON_CUSTOM_THEME_NAMES_KEY: 'lumostime_ui_icon_custom_theme_names_v1',
  uiIconService: { setTheme: vi.fn() }
}));
vi.mock('./colorSchemeService', () => ({ colorSchemeService: { setScheme: vi.fn() } }));
vi.mock('./backgroundService', () => ({
  backgroundService: { setCurrentBackground: vi.fn(), hydrateImageBackedCustomBackgrounds: vi.fn() }
}));
vi.mock('./navigationDecorationService', () => ({
  navigationDecorationService: { setCurrentDecoration: vi.fn(), hydrateImageBackedCustomDecorations: vi.fn() }
}));
vi.mock('./navigationIconService', () => ({
  NAVIGATION_ICON_CHANGE_EVENT: 'navigationIconChange',
  navigationIconService: { hydrateCustomIcons: vi.fn() }
}));
vi.mock('./moodCalendarBackgroundService', () => ({
  moodCalendarBackgroundService: { hydrateCustomBackgrounds: vi.fn() }
}));
vi.mock('./webdavService', () => ({ webdavService: {} }));
vi.mock('./s3Service', () => ({ s3Service: {} }));
vi.mock('./compatibleS3Service', () => ({ compatibleS3Service: {} }));

import { appearanceBackupService } from './appearanceBackupService';
import { imageService } from './imageService';
import { downloadWithBackup, uploadDataToCloud, type CloudService } from '../utils/syncUtils';
import type { ImageManifestGroups } from './imageManifest';
import {
  NAVIGATION_BACKGROUND_CHANGE_EVENT,
  NAVIGATION_BACKGROUND_MODE_CHANGE_EVENT,
  NAVIGATION_TRANSPARENCY_CHANGE_EVENT,
  navigationBackgroundService
} from './navigationBackgroundService';

const navigationStorage = {
  navigation_new_mode_enabled: 'true',
  navigation_new_background: 'modern-background',
  navigation_new_background_custom_list: JSON.stringify([
    { id: 'modern-background', type: 'custom', imageFilename: 'navigation.webp', url: '' }
  ]),
  navigation_new_background_settings: JSON.stringify({
    'modern-background': { offsetX: '8px', offsetY: '-4px', scale: 1.2, verticalStretch: 1.3, opacity: 0.7 }
  }),
  navigation_transparent_enabled: 'true'
};

const syncedNavigationStorage = {
  navigation_new_mode_enabled: navigationStorage.navigation_new_mode_enabled,
  navigation_new_background: navigationStorage.navigation_new_background,
  navigation_new_background_custom_list: navigationStorage.navigation_new_background_custom_list,
  navigation_transparent_enabled: navigationStorage.navigation_transparent_enabled
};

describe('modern navigation appearance sync', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
      clear: () => values.clear()
    });
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('backs up settings, restores selection, and loads the image URL on the destination', async () => {
    Object.entries(navigationStorage).forEach(([key, value]) => localStorage.setItem(key, value));
    const payload = appearanceBackupService.buildBackupPayload();
    expect(payload.storage).toMatchObject(syncedNavigationStorage);
    expect(payload.storage).not.toHaveProperty('navigation_new_background_settings');

    localStorage.clear();
    const destinationSettings = JSON.stringify({
      'modern-background': { offsetX: '100px', offsetY: '20px', scale: 0.8, verticalStretch: 0.9, opacity: 0.4 }
    });
    localStorage.setItem('navigation_new_background_settings', destinationSettings);
    vi.spyOn(imageService, 'getImageUrl').mockResolvedValue('blob:destination-device');
    appearanceBackupService.applyBackupPayload(payload);

    await vi.waitFor(() => {
      expect(navigationBackgroundService.getBackgroundById('modern-background')?.url).toBe('blob:destination-device');
    });
    expect(navigationBackgroundService.isEnabled()).toBe(true);
    expect(navigationBackgroundService.getCurrentBackground()).toBe('modern-background');
    expect(navigationBackgroundService.isTransparentNavigationEnabled()).toBe(true);
    expect(localStorage.getItem('navigation_new_background_settings')).toBe(destinationSettings);
    expect(navigationBackgroundService.getBackgroundById('modern-background')).toMatchObject({
      offsetX: '100px', offsetY: '20px', scale: 0.8, verticalStretch: 0.9, opacity: 0.4
    });
    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: NAVIGATION_BACKGROUND_MODE_CHANGE_EVENT, detail: { enabled: true }
    }));
    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: NAVIGATION_BACKGROUND_CHANGE_EVENT, detail: { backgroundId: 'modern-background' }
    }));
    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: NAVIGATION_TRANSPARENCY_CHANGE_EVENT, detail: { enabled: true }
    }));
  });

  it('collects destination image references from the backup without local navigation settings', () => {
    expect(appearanceBackupService.getReferencedImageFilenames({ version: 1, storage: navigationStorage })).toEqual([
      'navigation.webp', 'thumb_navigation.webp'
    ]);
    expect(localStorage.getItem('navigation_new_background_custom_list')).toBeNull();
  });

  it('removes large legacy image URLs before writing restored settings', () => {
    const raw = JSON.stringify([{ id: 'legacy', imageFilename: 'legacy.png', url: `data:image/png;base64,${'A'.repeat(10000)}` }]);
    const originalSetItem = localStorage.setItem;
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (value.length > 2000) throw new DOMException('Storage full', 'QuotaExceededError');
      originalSetItem(key, value);
    });

    appearanceBackupService.applyBackupPayload({ version: 1, storage: {
      navigation_icon_custom_list_v1: raw,
      lumostime_custom_presets: JSON.stringify([{ id: 'preset', snapshot: { version: 1, storage: { navigation_icon_custom_list_v1: raw } } }])
    } });

    const restored = appearanceBackupService.buildBackupPayload().storage;
    expect(restored.navigation_icon_custom_list_v1).not.toContain('data:');
    expect(restored.lumostime_custom_presets).not.toContain('data:');
    expect(restored.lumostime_custom_presets).toContain('legacy.png');
  });

  it('keeps runtime image data out of newly captured backups', () => {
    localStorage.setItem('navigation_icon_custom_list_v1', JSON.stringify([
      { id: 'native', imageFilename: 'native.png', url: 'data:image/png;base64,AAAA' }
    ]));
    expect(JSON.parse(appearanceBackupService.buildBackupPayload().storage.navigation_icon_custom_list_v1 || '[]'))
      .toEqual([{ id: 'native', imageFilename: 'native.png', url: '' }]);
  });

  it('uploads navigation files in the theme group and downloads them on a fresh device', async () => {
    Object.entries(navigationStorage).forEach(([key, value]) => localStorage.setItem(key, value));
    const files = new Map<string, unknown>();
    const images = new Map<string, ArrayBuffer>();
    let groups: ImageManifestGroups = { content: [], theme: [] };
    const cloud = {
      uploadData: vi.fn(async (data: unknown, filename: string) => { files.set(filename, data); return true; }),
      downloadData: vi.fn(async (filename = 'lumostime_backup.json') => files.get(filename)),
      uploadImage: vi.fn(async (filename: string, data: ArrayBuffer) => { images.set(filename, data); return true; }),
      downloadImage: vi.fn(async (filename: string) => images.get(filename)!),
      deleteImage: vi.fn(async () => true),
      uploadImageList: vi.fn(async (next: ImageManifestGroups) => { groups = next; return true; }),
      downloadImageList: vi.fn(async () => ({ groups, images: [...groups.content, ...groups.theme], timestamp: 1 }))
    };
    const filenames = ['navigation.webp', 'thumb_navigation.webp'];
    const listImages = vi.spyOn(imageService, 'listImages').mockResolvedValue(filenames);
    vi.spyOn(imageService, 'readImage').mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
    const payload = {
      logs: [], todos: [], categories: [{ id: 'cat-1', name: 'Category', activities: [] }], timestamp: 1,
      appearanceData: appearanceBackupService.buildBackupPayload()
    };
    const service = cloud as unknown as CloudService;
    const upload = await uploadDataToCloud(service, payload);
    expect(upload.success).toBe(true);
    expect(upload.imageStats?.uploaded).toBe(2);
    expect(groups).toEqual({ content: [], theme: filenames });
    expect([...images.keys()].sort()).toEqual(filenames);

    localStorage.clear();
    listImages.mockResolvedValue([]);
    const writeImage = vi.spyOn(imageService, 'writeImage').mockResolvedValue(undefined);
    const download = await downloadWithBackup(service, { logs: [], todos: [], categories: payload.categories, timestamp: 2 });
    expect(download.success).toBe(true);
    expect(download.imageStats?.downloaded).toBe(2);
    expect(writeImage.mock.calls.map(([filename]) => filename).sort()).toEqual(filenames);
    expect(download.data.appearanceData.storage).toMatchObject(syncedNavigationStorage);
    expect(download.data.appearanceData.storage).not.toHaveProperty('navigation_new_background_settings');
    expect(imageService.getReferencedImageManifest()).toEqual({ content: [], theme: filenames });
  });

  it('preserves local navigation settings when an older backup omits them', async () => {
    Object.entries(navigationStorage).forEach(([key, value]) => localStorage.setItem(key, value));
    vi.spyOn(imageService, 'getImageUrl').mockResolvedValue('blob:source-device');
    appearanceBackupService.applyBackupPayload({ version: 1, storage: {} });
    await navigationBackgroundService.hydrateCustomBackgrounds();
    expect(appearanceBackupService.buildBackupPayload().storage).toMatchObject(syncedNavigationStorage);
    expect(appearanceBackupService.buildBackupPayload().storage).not.toHaveProperty('navigation_new_background_settings');
  });

  it('clears modern navigation settings when the backup explicitly stores null', () => {
    Object.entries(navigationStorage).forEach(([key, value]) => localStorage.setItem(key, value));
    appearanceBackupService.applyBackupPayload({
      version: 1, storage: Object.fromEntries(Object.keys(navigationStorage).map(key => [key, null]))
    });
    Object.keys(syncedNavigationStorage).forEach(key => expect(localStorage.getItem(key)).toBeNull());
    expect(localStorage.getItem('navigation_new_background_settings')).toBe(navigationStorage.navigation_new_background_settings);
    expect(navigationBackgroundService.isEnabled()).toBe(false);
    expect(navigationBackgroundService.getCurrentBackground()).toBe('new-none');
  });
});
