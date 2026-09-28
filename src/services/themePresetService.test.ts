/**
 * @file themePresetService.test.ts
 * @input Theme preset settings and mocked appearance services
 * @output Regression coverage for preset-owned modern-navigation and Memoir defaults
 * @pos Test (Theme Management)
 * @description Ensures a legacy preset explicitly restores newer appearance controls without deleting their asset catalogs.
 * @updated 2026-09-28: Added legacy preset modern-navigation and Memoir default coverage.
 * @updated 2026-09-28: Covers card-background and font defaults owned by legacy presets.
 * @updated 2026-09-28: Covers preserving an independently selected Memoir background across legacy preset switches.
 */

import { describe, expect, it, vi } from 'vitest';
import type { ThemePreset } from '../hooks/useCustomPresets';

const navigationBackground = {
  setEnabled: vi.fn(),
  setCurrentBackground: vi.fn(),
  setTransparentNavigationEnabled: vi.fn()
};
const navigationIcons = { setMode: vi.fn(), setShowLabelWithIcon: vi.fn() };
const memoirCalendar = { getCurrentBackground: vi.fn(() => 'memoir-personal'), setCurrentBackground: vi.fn() };
const cardBackground = { setCurrentGroup: vi.fn() };
const fonts = { setFont: vi.fn() };

vi.mock('./backgroundService', () => ({ backgroundService: { setCurrentBackground: vi.fn(), applyBackgroundToElements: vi.fn() } }));
vi.mock('./navigationDecorationService', () => ({ navigationDecorationService: { setCurrentDecoration: vi.fn() } }));
vi.mock('./navigationBackgroundService', () => ({ navigationBackgroundService: navigationBackground }));
vi.mock('./navigationIconService', () => ({ navigationIconService: navigationIcons }));
vi.mock('./moodCalendarBackgroundService', () => ({ moodCalendarBackgroundService: memoirCalendar }));
vi.mock('./cardBackgroundService', () => ({ cardBackgroundService: cardBackground }));
vi.mock('./fontService', () => ({ fontService: fonts }));
vi.mock('./achievementBottleStyleService', () => ({ DEFAULT_ACHIEVEMENT_BOTTLE_STYLE: 'default' }));
vi.mock('./achievementBottleIconPackService', () => ({ DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK: 'star1' }));

describe('ThemePresetService', () => {
  it('applies legacy preset-owned defaults without clearing an independently selected Memoir background', async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key)
    });
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    const { ThemePresetService } = await import('./themePresetService');
    const preset: ThemePreset = {
      id: 'legacy-test',
      name: 'Legacy test',
      description: '',
      icon: '',
      appIcon: 'icon_simple',
      uiTheme: 'default',
      colorScheme: 'default',
      background: 'default',
      navigation: 'default',
      timePal: 'none',
      navigationMode: 'legacy',
      modernNavigation: {
        enabled: false,
        background: 'new-none',
        transparent: false,
        iconMode: 'text',
        showLabelWithIcon: false
      },
      memoirCalendarBackground: 'none',
      cardBackgroundGroupId: null,
      fontId: 'default'
    };

    const result = await ThemePresetService.applyThemePreset(
      preset,
      'default',
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn()
    );

    expect(result.success).toBe(true);
    expect(navigationBackground.setCurrentBackground).toHaveBeenCalledWith('new-none');
    expect(navigationBackground.setTransparentNavigationEnabled).toHaveBeenCalledWith(false);
    expect(navigationBackground.setEnabled).toHaveBeenLastCalledWith(false);
    expect(navigationIcons.setMode).toHaveBeenCalledWith('text');
    expect(navigationIcons.setShowLabelWithIcon).toHaveBeenCalledWith(false);
    expect(memoirCalendar.setCurrentBackground).not.toHaveBeenCalled();
    expect(cardBackground.setCurrentGroup).toHaveBeenCalledWith(null);
    expect(fonts.setFont).toHaveBeenCalledWith('default');
  });

  it('clears a Memoir background owned by the outgoing theme package', async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key)
    });
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    memoirCalendar.getCurrentBackground.mockReturnValueOnce('theme:rabbits:memoir-calendar');
    const { ThemePresetService } = await import('./themePresetService');

    await ThemePresetService.applyMemoirCalendarBackground('none');

    expect(memoirCalendar.setCurrentBackground).toHaveBeenCalledWith('none');
  });
});
