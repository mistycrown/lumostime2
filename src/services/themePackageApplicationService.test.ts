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
  MOOD_CALENDAR_BACKGROUND_CURRENT_KEY: 'mood_calendar_fill_background',
  MOOD_CALENDAR_BACKGROUND_CUSTOM_KEY: 'mood_calendar_fill_background_custom_list',
  moodCalendarBackgroundService: {
    hydrateCustomBackgrounds: vi.fn(async () => undefined),
    setCurrentBackground: vi.fn()
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

  it('sets the imported sticker default page and merges package sets into one selector group', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key)
    });
    values.set('lumostime_sticker_selector_config', JSON.stringify({
      enabled: true,
      groups: [{ id: 'existing-big-group', name: 'Existing', sourceSetIds: ['custom-sticker-set-existing'] }]
    }));

    const { applyImportedThemePackage } = await import('./themePackageApplicationService');
    await applyImportedThemePackage({
      id: 'sticker-theme',
      name: 'Sticker Theme',
      version: '1.0.0',
      manifest: {
        format: 'lumostime-theme-package',
        schemaVersion: 2,
        package: { id: 'sticker-theme', name: 'Sticker Theme', version: '1.0.0' },
        resources: {},
        apply: {},
        config: {
          stickers: [
            { id: 'one', name: 'One', items: [{ id: 'one-1', file: 'assets/stickers/one.webp' }] },
            { id: 'two', name: 'Two', items: [{ id: 'two-1', file: 'assets/stickers/two.webp' }] }
          ],
          stickerSelector: {
            defaultPage: 'one',
            enabled: true,
            groups: [{ id: 'all', name: 'All Stickers', sourceSetIds: ['one', 'two'] }]
          }
        }
      },
      imageAssets: {
        'assets/stickers/one.webp': 'sticker-one.webp',
        'assets/stickers/two.webp': 'sticker-two.webp'
      },
      importedAt: 1,
      updatedAt: 1
    });

    expect(values.get('lumostime_default_selector_page')).toBe('theme:sticker-theme:sticker-set-one');
    expect(JSON.parse(values.get('lumostime_sticker_selector_config') || '{}')).toEqual({
      enabled: true,
      groups: [
        { id: 'existing-big-group', name: 'Existing', sourceSetIds: ['custom-sticker-set-existing'] },
        {
          id: 'theme:sticker-theme:sticker-group-all',
          name: 'All Stickers',
          sourceSetIds: [
            'theme:sticker-theme:sticker-set-one',
            'theme:sticker-theme:sticker-set-two'
          ]
        }
      ]
    });
  });

  it('imports card background groups without replacing existing groups', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key)
    });
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    values.set('lumostime_card_background_groups_v1', JSON.stringify([
      { id: 'existing-card-group', name: 'Existing Cards', imageFilenames: ['existing.webp'], alignment: 'right' }
    ]));

    const { applyImportedThemePackage } = await import('./themePackageApplicationService');
    await applyImportedThemePackage({
      id: 'card-theme',
      name: 'Card Theme',
      version: '1.0.0',
      manifest: {
        format: 'lumostime-theme-package',
        schemaVersion: 2,
        package: { id: 'card-theme', name: 'Card Theme', version: '1.0.0' },
        resources: {},
        apply: {},
        config: {
          cardBackground: {
            id: 'cards',
            name: 'Theme Cards',
            files: ['assets/cards/one.png', 'assets/cards/two.png'],
            alignment: 'right-bottom',
            groupId: 'cards',
            opacity: 0.25
          }
        }
      },
      imageAssets: {
        'assets/cards/one.png': 'one.png',
        'assets/cards/two.png': 'two.png'
      },
      importedAt: 1,
      updatedAt: 1
    });

    expect(JSON.parse(values.get('lumostime_card_background_groups_v1') || '[]')).toEqual([
      { id: 'existing-card-group', name: 'Existing Cards', imageFilenames: ['existing.webp'], alignment: 'right' },
      {
        id: 'theme:card-theme:card-background-cards',
        name: 'Theme Cards',
        imageFilenames: ['one.png', 'two.png'],
        alignment: 'right-bottom'
      }
    ]);
    expect(values.get('lumostime_card_background_current_v1')).toBe('theme:card-theme:card-background-cards');
    expect(values.get('lumostime_card_background_opacity_v1')).toBe('0.25');
  });
});
