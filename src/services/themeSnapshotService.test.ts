/**
 * @file themeSnapshotService.test.ts
 * @input Current theme settings in local storage
 * @output Regression coverage for complete saved-theme snapshots
 * @pos Test (Theme Management)
 * @description Ensures sticker selector preferences are captured with saved themes.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./achievementBottleStyleService', () => ({ DEFAULT_ACHIEVEMENT_BOTTLE_STYLE: 'default' }));
vi.mock('./achievementBottleIconPackService', () => ({
  DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK: 'star1',
  registerCustomAchievementBottleIconPack: vi.fn(async () => undefined)
}));
vi.mock('./appearanceBackupService', () => ({
  APPEARANCE_RESTORED_EVENT: 'appearanceRestored',
  appearanceBackupService: { buildBackupPayload: () => ({ version: 1, storage: {} }), applyBackupPayload: vi.fn() }
}));
vi.mock('./timelineStyleService', () => ({ DEFAULT_TIMELINE_STYLE_CONFIGS: {} }));
vi.mock('./fontService', () => ({ fontService: { setFont: vi.fn(() => ({ success: true })) } }));
vi.mock('./moodCalendarBackgroundService', () => ({
  FILL_MOOD_CALENDAR_BACKGROUND_CURRENT_KEY: 'mood_calendar_fill_background',
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

describe('captureThemeSettingsSnapshot', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
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
});
