/**
 * @file themePresetService.test.ts
 * @input Theme preset settings and mocked appearance services
 * @output Regression coverage for preset-owned modern-navigation and Memoir defaults
 * @pos Test (Theme Management)
 * @description Ensures a legacy preset explicitly restores newer appearance controls without deleting their asset catalogs.
 * @updated 2026-09-28: Added legacy preset modern-navigation and Memoir default coverage.
 */

import { describe, expect, it, vi } from 'vitest';
import type { ThemePreset } from '../hooks/useCustomPresets';

const navigationBackground = {
  setEnabled: vi.fn(),
  setCurrentBackground: vi.fn(),
  setTransparentNavigationEnabled: vi.fn()
};
const navigationIcons = { setMode: vi.fn(), setShowLabelWithIcon: vi.fn() };
const memoirCalendar = { setCurrentBackground: vi.fn() };

vi.mock('./backgroundService', () => ({ backgroundService: { setCurrentBackground: vi.fn(), applyBackgroundToElements: vi.fn() } }));
vi.mock('./navigationDecorationService', () => ({ navigationDecorationService: { setCurrentDecoration: vi.fn() } }));
vi.mock('./navigationBackgroundService', () => ({ navigationBackgroundService: navigationBackground }));
vi.mock('./navigationIconService', () => ({ navigationIconService: navigationIcons }));
vi.mock('./moodCalendarBackgroundService', () => ({ moodCalendarBackgroundService: memoirCalendar }));
vi.mock('./achievementBottleStyleService', () => ({ DEFAULT_ACHIEVEMENT_BOTTLE_STYLE: 'default' }));
vi.mock('./achievementBottleIconPackService', () => ({ DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK: 'star1' }));

describe('ThemePresetService', () => {
  it('applies legacy preset-owned defaults for modern navigation and Memoir calendar', async () => {
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
        background: 'new-default',
        transparent: false,
        iconMode: 'text',
        showLabelWithIcon: false
      },
      memoirCalendarBackground: 'none'
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
    expect(navigationBackground.setCurrentBackground).toHaveBeenCalledWith('new-default');
    expect(navigationBackground.setTransparentNavigationEnabled).toHaveBeenCalledWith(false);
    expect(navigationBackground.setEnabled).toHaveBeenLastCalledWith(false);
    expect(navigationIcons.setMode).toHaveBeenCalledWith('text');
    expect(navigationIcons.setShowLabelWithIcon).toHaveBeenCalledWith(false);
    expect(memoirCalendar.setCurrentBackground).toHaveBeenCalledWith('none');
  });
});
