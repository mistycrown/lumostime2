/**
 * @file themeSnapshotService.test.ts
 * @input Current theme settings in local storage
 * @output Regression coverage for complete saved-theme snapshots
 * @pos Test (Theme Management)
 * @description Ensures saved-theme snapshots preserve independently imported resource catalogs while applying selections.
 * @updated 2026-09-28: Covers Memoir background catalog preservation during theme switching.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

const { applyBackupPayload } = vi.hoisted(() => ({
  applyBackupPayload: vi.fn()
}));

vi.mock('./achievementBottleStyleService', () => ({ DEFAULT_ACHIEVEMENT_BOTTLE_STYLE: 'default' }));
vi.mock('./achievementBottleIconPackService', () => ({
  DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK: 'star1',
  registerCustomAchievementBottleIconPack: vi.fn(async () => undefined)
}));
vi.mock('./appearanceBackupService', () => ({
  APPEARANCE_RESTORED_EVENT: 'appearanceRestored',
  appearanceBackupService: { buildBackupPayload: () => ({ version: 1, storage: {} }), applyBackupPayload }
}));
vi.mock('./timelineStyleService', () => ({ DEFAULT_TIMELINE_STYLE_CONFIGS: {} }));
vi.mock('./fontService', () => ({ fontService: { setFont: vi.fn(() => ({ success: true })) } }));
vi.mock('./moodCalendarBackgroundService', () => ({
  moodCalendarBackgroundService: { hydrateCustomBackgrounds: vi.fn(async () => undefined) }
}));
vi.mock('./navigationBackgroundService', () => ({ navigationBackgroundService: {
  hydrateCustomBackgrounds: vi.fn(async () => undefined), setCurrentBackground: vi.fn(), setEnabled: vi.fn()
} }));
vi.mock('./navigationIconService', () => ({
  NAVIGATION_ICON_CHANGE_EVENT: 'navigationIconChange',
  navigationIconService: { hydrateCustomIcons: vi.fn(async () => undefined) }
}));
vi.mock('./imageService', () => ({ imageService: { getReferencedImageManifest: () => ({ content: [] }), deleteImage: vi.fn() } }));
vi.mock('./settingsImageReferenceService', () => ({ getSettingsReferencedImages: () => new Set<string>() }));
vi.mock('./uiIconService', () => ({ UI_ICON_CUSTOM_ASSETS_KEY: 'ui-icons', uiIconService: { registerCustomThemeAssets: vi.fn() } }));

const makeLocalStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key)
  };
};

describe('themeSettingsSnapshot', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    applyBackupPayload.mockClear();
  });

  it('captures sticker selector default page and merged groups', async () => {
    vi.stubGlobal('localStorage', makeLocalStorage());
    localStorage.setItem('lumostime_default_selector_page', 'theme:example:sticker-group-all');
    localStorage.setItem('lumostime_sticker_selector_config', JSON.stringify({
      enabled: true,
      groups: [{ id: 'theme:example:sticker-group-all', sourceSetIds: ['theme:example:sticker-set-one'] }]
    }));

    const { captureThemeSettingsSnapshot } = await import('./themeSnapshotService');
    const snapshot = captureThemeSettingsSnapshot();

    expect(snapshot.storage).toMatchObject({
      lumostime_default_selector_page: 'theme:example:sticker-group-all',
      lumostime_sticker_selector_config: JSON.stringify({
        enabled: true,
        groups: [{ id: 'theme:example:sticker-group-all', sourceSetIds: ['theme:example:sticker-set-one'] }]
      })
    });
  });

  it('keeps a Memoir background imported after the snapshot was saved', async () => {
    vi.stubGlobal('localStorage', makeLocalStorage());
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    const independentlyImportedBackgrounds = JSON.stringify([{
      id: 'memoir-personal', imageFilename: 'personal-memoir.webp'
    }]);
    localStorage.setItem('mood_calendar_fill_background_custom_list', independentlyImportedBackgrounds);

    const { applyThemeSettingsSnapshot } = await import('./themeSnapshotService');
    await applyThemeSettingsSnapshot({
      version: 1,
      storage: {
        mood_calendar_fill_background: 'none',
        mood_calendar_fill_background_custom_list: JSON.stringify([{
          id: 'theme-old', imageFilename: 'theme-old.webp'
        }])
      }
    });

    expect(localStorage.getItem('mood_calendar_fill_background_custom_list')).toBe(independentlyImportedBackgrounds);
    expect(applyBackupPayload).toHaveBeenCalledWith({
      version: 1,
      storage: { mood_calendar_fill_background: 'none' }
    });
  });
});
