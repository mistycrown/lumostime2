/**
 * @file displayMode.ts
 * @description Normalizes persisted display modes and resolves effective light or dark mode.
 * @updated 2026-09-29: Added a runtime custom-appearance flag so dark mode can safely use default surfaces.
 */

export const DISPLAY_MODE_STORAGE_KEY = 'lumostime_theme_mode';
export const CUSTOM_APPEARANCE_ENABLED_ATTRIBUTE = 'data-custom-appearance-enabled';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedThemeMode = Exclude<ThemeMode, 'system'>;

export const isThemeMode = (value: string | null): value is ThemeMode => (
  value === 'light' || value === 'dark' || value === 'system'
);

export const readStoredThemeMode = (storage: Pick<Storage, 'getItem'>): ThemeMode => {
  const stored = storage.getItem(DISPLAY_MODE_STORAGE_KEY);
  return isThemeMode(stored) ? stored : 'system';
};

export const resolveThemeMode = (
  mode: ThemeMode,
  systemPrefersDark: boolean
): ResolvedThemeMode => (
  mode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : mode
);

export const applyThemeMode = (
  root: Pick<HTMLElement, 'setAttribute'>,
  mode: ThemeMode,
  systemPrefersDark: boolean
): ResolvedThemeMode => {
  const resolvedMode = resolveThemeMode(mode, systemPrefersDark);
  root.setAttribute('data-theme-mode', resolvedMode);
  root.setAttribute(CUSTOM_APPEARANCE_ENABLED_ATTRIBUTE, String(resolvedMode !== 'dark'));
  return resolvedMode;
};
