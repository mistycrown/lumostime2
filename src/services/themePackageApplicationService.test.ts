/**
 * @file themePackageApplicationService.test.ts
 * @input Imported theme package records with supported configuration sections
 * @output Regression coverage for applying packaged theme settings and assets
 * @pos Test (Theme Package Import)
 * @description Verifies achievement-bottle configuration is applied without a synthetic config.settings section.
 * @updated 2026-09-26: Covers custom icon-pack, sticker, and navigation icon application.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

const { registerIconPack, hydrateNavigationIcons, setNavigationEnabled } = vi.hoisted(() => ({
  registerIconPack: vi.fn(async () => undefined),
  hydrateNavigationIcons: vi.fn(async () => undefined),
  setNavigationEnabled: vi.fn()
}));

vi.mock('./achievementBottleIconPackService', () => ({
  registerCustomAchievementBottleIconPack: registerIconPack
}));

vi.mock('./colorSchemeService', () => ({
  colorSchemeService: { setScheme: vi.fn() }
}));

vi.mock('./backgroundService', () => ({
  backgroundService: {
    setCurrentBackground: vi.fn(),
    setBackgroundOpacity: vi.fn(),
    hydrateImageBackedCustomBackgrounds: vi.fn(async () => undefined)
  }
}));

vi.mock('./navigationIconService', () => ({
  NAVIGATION_ICON_CHANGE_EVENT: 'navigationIconChange',
  navigationIconService: {
    getSlots: () => ['record', 'todo', 'timeline', 'review', 'index'],
    getSelection: () => ({ showLabelWithIcon: false }),
    hydrateCustomIcons: hydrateNavigationIcons
  }
}));

vi.mock('./navigationBackgroundService', () => ({
  navigationBackgroundService: {
    setEnabled: setNavigationEnabled,
    setCurrentBackground: vi.fn(),
    hydrateCustomBackgrounds: vi.fn(async () => undefined)
  }
}));

vi.mock('./appearanceBackupService', () => ({
  APPEARANCE_RESTORED_EVENT: 'lumostime:appearance-restored'
}));

vi.mock('./moodCalendarBackgroundService', () => ({
  FILL_MOOD_CALENDAR_BACKGROUND_CURRENT_KEY: 'mood_calendar_fill_background',
  FILL_MOOD_CALENDAR_BACKGROUND_CUSTOM_KEY: 'mood_calendar_fill_background_custom_list',
  moodCalendarBackgroundService: {
    hydrateCustomBackgrounds: vi.fn(async () => undefined),
    setCurrentBackground: vi.fn(),
    setMode: vi.fn()
  }
}));

describe('applyImportedThemePackage', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    registerIconPack.mockClear();
    hydrateNavigationIcons.mockClear();
    setNavigationEnabled.mockClear();
  });

  it('applies custom bottle frames when achievementBottle is a top-level config section', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key)
    });

    const { applyImportedThemePackage } = await import('./themePackageApplicationService');
    const result = await applyImportedThemePackage({
      id: 'test-theme',
      name: 'Test Theme',
      version: '1.0.0',
      manifest: {
        format: 'lumostime-theme-package',
        schemaVersion: 1,
        package: { id: 'test-theme', name: 'Test Theme', version: '1.0.0' },
        config: {
          achievementBottle: {
            style: { id: 'blushBloom' },
            iconPack: {
              source: 'asset',
              id: 'test-bottle',
              name: 'Test Bottle',
              frames: ['assets/achievement-bottle/test-bottle/01.webp']
            }
          }
        }
      },
      imageAssets: {
        'assets/achievement-bottle/test-bottle/01.webp': 'theme-frame-01.webp'
      },
      importedAt: 1,
      updatedAt: 1
    });

    expect(result.appliedSections).toContain('settings');
    expect(values.get('lumostime_achievement_bottle_style')).toBe('blushBloom');
    expect(values.get('lumostime_achievement_bottle_icon_pack'))
      .toBe('theme:test-theme:achievement-bottle-test-bottle');
    expect(registerIconPack).toHaveBeenCalledWith(
      'theme:test-theme:achievement-bottle-test-bottle',
      ['theme-frame-01.webp'],
      'Test Bottle'
    );
  });

  it('applies nested navigation icons and refreshes custom sticker state', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key)
    });
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });

    const { applyImportedThemePackage } = await import('./themePackageApplicationService');
    const result = await applyImportedThemePackage({
      id: 'asset-theme',
      name: 'Asset Theme',
      version: '1.0.0',
      manifest: {
        format: 'lumostime-theme-package',
        schemaVersion: 1,
        package: { id: 'asset-theme', name: 'Asset Theme', version: '1.0.0' },
        config: {
          background: {
            source: 'asset',
            file: 'assets/background/main.png',
            opacity: 0.3
          },
          navigation: {
            icons: {
              source: 'asset',
              files: { record: 'assets/navigation/record.png' }
            }
          },
          stickers: [{
            id: 'stickers',
            name: 'Theme Stickers',
            items: [{ id: 'sticker-1', name: 'One', file: 'assets/stickers/one.png' }]
          }]
        }
      },
      imageAssets: {
        'assets/background/main.png': 'theme-background.png',
        'assets/navigation/record.png': 'navigation-record.png',
        'assets/stickers/one.png': 'theme-sticker.png'
      },
      importedAt: 1,
      updatedAt: 1
    });

    const iconSelection = JSON.parse(values.get('navigation_icon_selection_v1') || '{}');
    const customStickerSets = JSON.parse(values.get('lumostime_custom_sticker_sets_v2') || '[]');
    const customStickers = JSON.parse(values.get('lumostime_custom_stickers_v2') || '[]');

    expect(result.appliedSections).toContain('navigation-icons');
    expect(iconSelection).toMatchObject({ mode: 'custom', schemeId: 'theme:asset-theme:navigation-icons' });
    expect(hydrateNavigationIcons).toHaveBeenCalledOnce();
    expect(setNavigationEnabled).toHaveBeenCalledWith(true);
    const { backgroundService } = await import('./backgroundService');
    expect(backgroundService.setBackgroundOpacity).toHaveBeenCalledWith(0.3);
    expect(result.appliedSections).toContain('stickers');
    expect(customStickerSets).toHaveLength(1);
    expect(customStickers).toMatchObject([{ setId: 'theme:asset-theme:sticker-set-stickers', imageFilename: 'theme-sticker.png' }]);
  });
});
