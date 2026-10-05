/**
 * @file themeSnapshotService.test.ts
 * @input Current theme settings in local storage
 * @output Regression coverage for complete saved-theme snapshots
 * @pos Test (Theme Management)
 * @description Ensures saved-theme snapshots preserve independently imported resource catalogs while applying selections.
 * @updated 2026-09-28: Covers Memoir background catalog preservation during theme switching.
 * @updated 2026-09-28: Keeps the selected standalone Memoir background across ordinary theme switches.
 * @updated 2026-10-05: Preserves card groups with partially available images instead of disabling them.
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
vi.mock('./fontService', () => ({ fontService: {
  refreshCustomFonts: vi.fn(async () => []),
  setFont: vi.fn(() => ({ success: true }))
} }));
vi.mock('./moodCalendarBackgroundService', () => ({
  moodCalendarBackgroundService: {
    getBackgroundById: vi.fn(),
    getCurrentBackground: vi.fn(() => 'none'),
    hydrateCustomBackgrounds: vi.fn(async () => undefined),
    setCurrentBackground: vi.fn()
  }
}));
vi.mock('./navigationBackgroundService', () => ({ navigationBackgroundService: {
  getBackgroundById: vi.fn(), getCurrentBackground: vi.fn(() => 'new-none'), hydrateCustomBackgrounds: vi.fn(async () => undefined),
  isEnabled: vi.fn(() => false), setCurrentBackground: vi.fn(), setEnabled: vi.fn(), setTransparentNavigationEnabled: vi.fn()
} }));
vi.mock('./navigationIconService', () => ({
  NAVIGATION_ICON_CHANGE_EVENT: 'navigationIconChange',
  navigationIconService: { getIconForSlot: vi.fn(), getSlots: vi.fn(() => []), hydrateCustomIcons: vi.fn(async () => undefined), setMode: vi.fn() }
}));
vi.mock('./backgroundService', () => ({ backgroundService: { getCurrentBackgroundOption: vi.fn(), setCurrentBackground: vi.fn() } }));
vi.mock('./navigationDecorationService', () => ({ navigationDecorationService: {
  getCurrentDecoration: vi.fn(() => 'default'), getDecorationById: vi.fn(), setCurrentDecoration: vi.fn()
} }));
vi.mock('./cardBackgroundService', () => ({ cardBackgroundService: { getCurrentGroup: vi.fn(), setCurrentGroup: vi.fn() } }));
vi.mock('./imageService', () => ({ imageService: {
  deleteImage: vi.fn(),
  getImageUrl: vi.fn(async () => ''),
  getReferencedImageManifest: () => ({ content: [] })
} }));
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
    vi.clearAllMocks();
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
    localStorage.setItem('mood_calendar_fill_background', 'memoir-personal');

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
    expect(localStorage.getItem('mood_calendar_fill_background')).toBe('memoir-personal');
    expect(applyBackupPayload).toHaveBeenCalledWith({
      version: 1,
      storage: {}
    });
  });

  it('keeps a standalone Memoir background when switching to the default theme', async () => {
    vi.stubGlobal('localStorage', makeLocalStorage());
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    const { moodCalendarBackgroundService } = await import('./moodCalendarBackgroundService');
    vi.mocked(moodCalendarBackgroundService.getCurrentBackground).mockReturnValue('memoir-personal');

    const { applyDefaultThemeSupplement } = await import('./themeSnapshotService');
    await applyDefaultThemeSupplement();

    expect(moodCalendarBackgroundService.setCurrentBackground).not.toHaveBeenCalled();
  });

  it('restores transparent navigation and falls back when the selected card background is missing', async () => {
    vi.stubGlobal('localStorage', makeLocalStorage());
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    const { cardBackgroundService } = await import('./cardBackgroundService');
    const { imageService } = await import('./imageService');
    const { navigationBackgroundService } = await import('./navigationBackgroundService');
    vi.mocked(cardBackgroundService.getCurrentGroup).mockReturnValue({
      id: 'missing-group',
      name: 'Missing cards',
      imageFilenames: ['missing-card.webp'],
      alignment: 'right'
    });
    vi.mocked(imageService.getImageUrl).mockResolvedValue('');

    const { applyThemeSettingsSnapshot } = await import('./themeSnapshotService');
    const warnings = await applyThemeSettingsSnapshot({
      version: 1,
      storage: { navigation_transparent_enabled: 'true' }
    });

    expect(navigationBackgroundService.setTransparentNavigationEnabled).toHaveBeenCalledWith(true);
    expect(cardBackgroundService.setCurrentGroup).toHaveBeenCalledWith(null);
    expect(warnings).toContain('卡片背景缺少资源：missing-card.webp');
  });

  it('keeps the selected card group when only some images are missing', async () => {
    vi.stubGlobal('localStorage', makeLocalStorage());
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    const { cardBackgroundService } = await import('./cardBackgroundService');
    const { imageService } = await import('./imageService');
    vi.mocked(cardBackgroundService.getCurrentGroup).mockReturnValue({
      id: 'partial', name: 'Partial', imageFilenames: ['missing.webp', 'available.webp'], alignment: 'right'
    });
    vi.mocked(cardBackgroundService.setCurrentGroup).mockClear();
    vi.mocked(imageService.getImageUrl).mockImplementation(async (filename) => filename === 'available.webp' ? 'blob:available' : '');
    const revoke = vi.spyOn(URL, 'revokeObjectURL');

    const { applyThemeSettingsSnapshot } = await import('./themeSnapshotService');
    const warnings = await applyThemeSettingsSnapshot({ version: 1, storage: {} });
    expect(cardBackgroundService.setCurrentGroup).not.toHaveBeenCalled();
    expect(warnings).toContain('卡片背景缺少资源：missing.webp');
    expect(revoke).toHaveBeenCalledWith('blob:available');
    revoke.mockRestore();
  });
});
