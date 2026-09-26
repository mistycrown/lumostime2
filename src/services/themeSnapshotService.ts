/**
 * @file themeSnapshotService.ts
 * @input Current appearance storage and saved theme snapshots
 * @output Complete local theme snapshots, application, default fallback, and snapshot image references
 * @pos Service (Theme Management)
 * @description Captures and restores the full set of theme-managed settings while leaving user data and theme catalog metadata untouched.
 * @updated 2026-09-26: Added immutable full appearance snapshots for saved themes.
 */

import { THEME_KEYS } from '../constants/storageKeys';
import { DEFAULT_ACHIEVEMENT_BOTTLE_STYLE } from './achievementBottleStyleService';
import {
  DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK,
  registerCustomAchievementBottleIconPack
} from './achievementBottleIconPackService';
import { APPEARANCE_RESTORED_EVENT, appearanceBackupService } from './appearanceBackupService';
import { DEFAULT_TIMELINE_STYLE_CONFIGS } from './timelineStyleService';
import { fontService } from './fontService';
import {
  FILL_MOOD_CALENDAR_BACKGROUND_CURRENT_KEY,
  moodCalendarBackgroundService
} from './moodCalendarBackgroundService';
import { navigationBackgroundService } from './navigationBackgroundService';
import { NAVIGATION_ICON_CHANGE_EVENT, navigationIconService } from './navigationIconService';
import { imageService } from './imageService';
import { getSettingsReferencedImages } from './settingsImageReferenceService';
import { UI_ICON_CUSTOM_ASSETS_KEY, uiIconService } from './uiIconService';

const SNAPSHOT_EXTRA_KEYS = [
  'navigation_new_mode_enabled',
  'navigation_new_background',
  'navigation_new_background_custom_list',
  'navigation_new_background_settings',
  'lumostime_custom_sticker_sets_v2',
  'lumostime_custom_stickers_v2'
] as const;

const SNAPSHOT_EXCLUDED_KEYS = new Set<string>([
  THEME_KEYS.CURRENT_PRESET,
  THEME_KEYS.CUSTOM_PRESETS,
  THEME_KEYS.IMPORTED_THEME_PACKAGES
]);

export interface ThemeSettingsSnapshot {
  version: 1;
  storage: Record<string, string | null>;
}

const getStoredObject = <T extends object>(key: string): T => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {} as T;
  } catch {
    return {} as T;
  }
};

const readSnapshotStorage = (): Record<string, string | null> => {
  const storage = appearanceBackupService.buildBackupPayload().storage;
  const snapshot = Object.fromEntries(
    Object.entries(storage).filter(([key]) => !SNAPSHOT_EXCLUDED_KEYS.has(key))
  );
  SNAPSHOT_EXTRA_KEYS.forEach((key) => {
    snapshot[key] = localStorage.getItem(key);
  });
  return snapshot;
};

export const captureThemeSettingsSnapshot = (): ThemeSettingsSnapshot => ({
  version: 1,
  storage: readSnapshotStorage()
});

export const getThemeSnapshotImageReferences = (snapshot: ThemeSettingsSnapshot | undefined): string[] => {
  const values = snapshot?.storage || {};
  const references = new Set<string>();
  const add = (filename: unknown) => {
    if (typeof filename !== 'string' || !filename.trim()) return;
    references.add(filename);
    references.add(`thumb_${filename}`);
  };
  const parse = (key: string): unknown => {
    try {
      return JSON.parse(values[key] || 'null');
    } catch {
      return null;
    }
  };
  const addImageList = (key: string, includeSixWeek = false) => {
    const list = parse(key);
    if (!Array.isArray(list)) return;
    list.forEach((item) => {
      add(item?.imageFilename);
      if (includeSixWeek) add(item?.sixWeekImageFilename);
      add(item?.thumbnailFilename);
      add(item?.sixWeekThumbnail);
      if (Array.isArray(item?.stageFilenames)) item.stageFilenames.forEach(add);
    });
  };

  addImageList('lumos_custom_backgrounds');
  addImageList('navigation_decoration_custom_list');
  addImageList('navigation_new_background_custom_list');
  addImageList('navigation_icon_custom_list_v1');
  addImageList('mood_calendar_background_custom_list', true);
  addImageList('mood_calendar_fill_background_custom_list');
  addImageList('lumostime_timepal_custom_items');
  addImageList('lumostime_custom_stickers_v2');

  [UI_ICON_CUSTOM_ASSETS_KEY, 'lumostime_achievement_bottle_custom_icon_packs_v1'].forEach((key) => {
    const mapping = parse(key);
    if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) return;
    const addValues = (value: unknown) => {
      if (typeof value === 'string') add(value);
      else if (Array.isArray(value)) value.forEach(addValues);
      else if (value && typeof value === 'object') Object.values(value).forEach(addValues);
    };
    addValues(mapping);
  });

  return [...references];
};

export const applyThemeSettingsSnapshot = async (snapshot: ThemeSettingsSnapshot): Promise<string[]> => {
  const warnings: string[] = [];
  const currentFontId = snapshot.storage.lumostime_font_family || 'default';

  SNAPSHOT_EXTRA_KEYS.forEach((key) => {
    const value = snapshot.storage[key];
    if (typeof value === 'string') localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  });
  appearanceBackupService.applyBackupPayload({ version: 1, storage: snapshot.storage });

  if (currentFontId !== 'default') {
    const result = fontService.setFont(currentFontId);
    if (!result.success) warnings.push(`当前设备无法恢复此方案字体：${result.message}`);
  }

  const activeUiTheme = snapshot.storage[THEME_KEYS.UI_ICON_THEME] || 'default';
  const customUiThemes = getStoredObject<Record<string, Record<string, string>>>(UI_ICON_CUSTOM_ASSETS_KEY);
  if (customUiThemes[activeUiTheme]) {
    await uiIconService.registerCustomThemeAssets(activeUiTheme, customUiThemes[activeUiTheme]);
  }

  const activeIconPack = snapshot.storage[THEME_KEYS.ACHIEVEMENT_BOTTLE_ICON_PACK];
  const customIconPacks = getStoredObject<Record<string, string[]>>('lumostime_achievement_bottle_custom_icon_packs_v1');
  if (activeIconPack && customIconPacks[activeIconPack]) {
    await registerCustomAchievementBottleIconPack(activeIconPack, customIconPacks[activeIconPack]);
  }

  const navigationBackgroundId = snapshot.storage['navigation_new_background'];
  if (snapshot.storage.navigation_new_mode_enabled === 'true') {
    if (navigationBackgroundId) navigationBackgroundService.setCurrentBackground(navigationBackgroundId);
    navigationBackgroundService.setEnabled(true);
  } else {
    navigationBackgroundService.setEnabled(false);
  }
  await navigationBackgroundService.hydrateCustomBackgrounds();
  await navigationIconService.hydrateCustomIcons();
  await moodCalendarBackgroundService.hydrateCustomBackgrounds();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(APPEARANCE_RESTORED_EVENT));
    window.dispatchEvent(new Event(NAVIGATION_ICON_CHANGE_EVENT));
    window.dispatchEvent(new Event('stickerSetsChanged'));
    window.dispatchEvent(new Event('timepal-custom-changed'));
  }
  return warnings;
};

export const applyDefaultThemeSupplement = async (): Promise<void> => {
  navigationBackgroundService.setEnabled(false);
  navigationIconService.setMode('text');
  moodCalendarBackgroundService.setMode('overflow');
  moodCalendarBackgroundService.setCurrentBackground('none', 'overflow');
  localStorage.setItem(FILL_MOOD_CALENDAR_BACKGROUND_CURRENT_KEY, 'none');
  localStorage.setItem(THEME_KEYS.ACHIEVEMENT_BOTTLE_STYLE, DEFAULT_ACHIEVEMENT_BOTTLE_STYLE);
  localStorage.setItem(THEME_KEYS.ACHIEVEMENT_BOTTLE_ICON_PACK, DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK);
  localStorage.setItem(THEME_KEYS.TIMELINE_STYLE_THEME, 'default');
  localStorage.setItem(THEME_KEYS.TIMELINE_STYLE_CONFIGS, JSON.stringify(DEFAULT_TIMELINE_STYLE_CONFIGS));
  fontService.setFont('default');
  await navigationBackgroundService.hydrateCustomBackgrounds();
  await navigationIconService.hydrateCustomIcons();
  await moodCalendarBackgroundService.hydrateCustomBackgrounds();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(APPEARANCE_RESTORED_EVENT));
    window.dispatchEvent(new Event(NAVIGATION_ICON_CHANGE_EVENT));
  }
};

export const deleteUnusedSnapshotImages = async (snapshot: ThemeSettingsSnapshot | undefined): Promise<void> => {
  const candidates = getThemeSnapshotImageReferences(snapshot);
  const externalReferences = getSettingsReferencedImages();
  const retained = new Set([
    ...externalReferences,
    ...imageService.getReferencedImageManifest().content
  ]);
  for (const filename of candidates) {
    if (filename.startsWith('thumb_') || retained.has(filename)) continue;
    await imageService.deleteImage(filename).catch(() => undefined);
  }
};
