/**
 * @file customPresetsRendererMocks.ts
 * @input Isolated theme selections and appearance storage in the renderer harness
 * @output Settings and image adapters for the real custom-presets hook
 * @pos Test Support (Theme Presets)
 * @updated 2026-10-06: Keeps React, localStorage, edit markers and sync decisions real.
 */
export const settings = {
  uiIconTheme: 'default',
  colorScheme: 'default',
  achievementBottleStyle: 'default',
  achievementBottleIconPack: 'default'
};
export const useSettings = () => settings;
export const APPEARANCE_RESTORED_EVENT = 'lumostime:appearance-restored';
export const captureThemeSettingsSnapshot = () => ({
  version: 1 as const,
  storage: {
    navigation_icon_custom_list_v1: localStorage.getItem('navigation_icon_custom_list_v1')
  }
});
export const cleanedSnapshots: unknown[] = [];
export const deleteUnusedSnapshotImages = async (snapshot: unknown) => {
  cleanedSnapshots.push(snapshot);
};
