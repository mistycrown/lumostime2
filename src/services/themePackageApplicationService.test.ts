/**
 * @file themePackageApplicationService.test.ts
 * @input Imported theme package records with supported configuration sections
 * @output Regression coverage for applying packaged achievement-bottle settings
 * @pos Test (Theme Package Import)
 * @description Verifies achievement-bottle configuration is applied without a synthetic config.settings section.
 * @updated 2026-09-26: Covers custom icon-pack application from theme packages.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

const { registerIconPack } = vi.hoisted(() => ({
  registerIconPack: vi.fn(async () => undefined)
}));

vi.mock('./achievementBottleIconPackService', () => ({
  registerCustomAchievementBottleIconPack: registerIconPack
}));

vi.mock('./colorSchemeService', () => ({
  colorSchemeService: { setScheme: vi.fn() }
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
});
