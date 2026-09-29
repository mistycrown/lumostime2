/**
 * @file themeSnapshotService.ts
 * @input Current appearance storage and saved theme snapshots
 * @output Complete local theme snapshots, application, default fallback, and snapshot image references
 * @pos Service (Theme Management)
 * @description Captures and restores the full set of theme-managed settings while leaving user data and theme catalog metadata untouched.
 * @updated 2026-09-26: Added immutable full appearance snapshots for saved themes.
 * @updated 2026-09-26: Restores named custom achievement-bottle icon-pack records.
 * @updated 2026-09-28: Preserves independently imported resource catalogs when applying a saved theme snapshot.
 * @updated 2026-09-28: Falls back from missing selected theme resources with user-facing warnings.
 * @updated 2026-09-28: Keeps an independently selected Memoir background active across ordinary theme switches.
 * @updated 2026-09-29: Captures and validates the global floating-button image background.
 */

import { THEME_KEYS, TIMEPAL_KEYS } from '../constants/storageKeys';
import { DEFAULT_ACHIEVEMENT_BOTTLE_STYLE } from './achievementBottleStyleService';
import {
  DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK,
  registerCustomAchievementBottleIconPack
} from './achievementBottleIconPackService';
import { APPEARANCE_RESTORED_EVENT, appearanceBackupService } from './appearanceBackupService';
import { DEFAULT_TIMELINE_STYLE_CONFIGS } from './timelineStyleService';
import { fontService } from './fontService';
import { moodCalendarBackgroundService } from './moodCalendarBackgroundService';
import { navigationBackgroundService } from './navigationBackgroundService';
import { NAVIGATION_ICON_CHANGE_EVENT, navigationIconService } from './navigationIconService';
import { imageService } from './imageService';
import { backgroundService } from './backgroundService';
import { navigationDecorationService } from './navigationDecorationService';
import { cardBackgroundService } from './cardBackgroundService';
import { floatingButtonBackgroundService } from './floatingButtonBackgroundService';
import { getSettingsReferencedImages } from './settingsImageReferenceService';
import { UI_ICON_CUSTOM_ASSETS_KEY, uiIconService } from './uiIconService';
import { extractCustomTimePalId } from '../constants/timePalConfig';

const SNAPSHOT_EXTRA_KEYS = [
  'navigation_new_mode_enabled',
  'navigation_new_background',
  'navigation_new_background_custom_list',
  'navigation_new_background_settings',
  'lumostime_custom_sticker_sets_v2',
  'lumostime_custom_stickers_v2',
  'lumostime_default_selector_page',
  'lumostime_sticker_selector_config'
] as const;

const SNAPSHOT_EXCLUDED_KEYS = new Set<string>([
  THEME_KEYS.CURRENT_PRESET,
  THEME_KEYS.CUSTOM_PRESETS,
  THEME_KEYS.IMPORTED_THEME_PACKAGES
]);

// These catalogs are user-owned libraries, not a theme's selected appearance. A
// saved snapshot may retain them for backup and later image-reference cleanup,
// but applying that snapshot must never replace resources imported afterwards.
const SNAPSHOT_RESOURCE_CATALOG_KEYS = new Set<string>([
  THEME_KEYS.CUSTOM_COLOR_GROUP,
  UI_ICON_CUSTOM_ASSETS_KEY,
  'lumos_custom_backgrounds',
  'navigation_decoration_custom_list',
  'navigation_decoration_custom_settings',
  'navigation_new_background_custom_list',
  'navigation_new_background_settings',
  'navigation_icon_custom_list_v1',
  'navigation_icon_schemes_v1',
  'mood_calendar_background_settings',
  'mood_calendar_fill_background',
  'mood_calendar_fill_background_custom_list',
  'lumostime_timepal_custom_items',
  'lumostime_custom_sticker_sets_v2',
  'lumostime_custom_stickers_v2',
  'lumostime_achievement_bottle_custom_icon_packs_v1',
  'lumostime_card_background_groups_v1'
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

const getStoredArray = <T>(key: string): T[] => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value as T[] : [];
  } catch {
    return [];
  }
};

const getMissingImageFilenames = async (filenames: Array<string | undefined>): Promise<string[]> => {
  const unique = [...new Set(filenames.filter((filename): filename is string => Boolean(filename?.trim())))];
  const results = await Promise.all(unique.map(async (filename) => ({
    filename,
    available: Boolean(await imageService.getImageUrl(filename).catch(() => ''))
  })));
  return results.filter((result) => !result.available).map((result) => result.filename);
};

const appendMissingResourceWarning = (warnings: string[], label: string, filenames: string[]): void => {
  if (filenames.length > 0) warnings.push(`${label}缺少资源：${filenames.join('、')}`);
};

const validateActiveThemeResources = async (
  activeUiTheme: string,
  customUiThemes: Record<string, Record<string, string>>,
  activeIconPack: string | null | undefined,
  customIconPack: string[] | { name?: string; filenames?: string[] } | undefined
): Promise<string[]> => {
  const warnings: string[] = [];
  const validate = async (label: string, filenames: Array<string | undefined>, fallback: () => void) => {
    const missing = await getMissingImageFilenames(filenames);
    if (missing.length === 0) return;
    fallback();
    appendMissingResourceWarning(warnings, label, missing);
  };

  const pageBackground = backgroundService.getCurrentBackgroundOption();
  if (pageBackground?.imageFilename) {
    await validate('页面背景', [pageBackground.imageFilename], () => backgroundService.setCurrentBackground('default'));
  }

  const decoration = navigationDecorationService.getDecorationById(navigationDecorationService.getCurrentDecoration());
  if (decoration?.imageFilename) {
    await validate('导航装饰', [decoration.imageFilename], () => navigationDecorationService.setCurrentDecoration('default'));
  }

  if (navigationBackgroundService.isEnabled()) {
    const background = navigationBackgroundService.getBackgroundById(navigationBackgroundService.getCurrentBackground());
    if (background?.imageFilename) {
      await validate('导航背景', [background.imageFilename], () => navigationBackgroundService.setCurrentBackground('new-none'));
    }
  }

  const iconFiles = navigationIconService.getSlots().map((slot) => navigationIconService.getIconForSlot(slot)?.imageFilename);
  if (iconFiles.some(Boolean)) {
    await validate('导航图标', iconFiles, () => {
      navigationIconService.setMode('text');
      navigationIconService.setShowLabelWithIcon(false);
    });
  }

  const memoirBackground = moodCalendarBackgroundService.getBackgroundById(moodCalendarBackgroundService.getCurrentBackground());
  if (memoirBackground?.imageFilename) {
    await validate('Memoir 日历背景', [memoirBackground.imageFilename], () => moodCalendarBackgroundService.setCurrentBackground('none'));
  }

  const cardGroup = cardBackgroundService.getCurrentGroup();
  if (cardGroup) {
    await validate('卡片背景', cardGroup.imageFilenames, () => cardBackgroundService.setCurrentGroup(null));
  }

  const floatingButtonBackground = floatingButtonBackgroundService.getSettings();
  if (floatingButtonBackground.imageFilename) {
    await validate('悬浮按钮背景', [floatingButtonBackground.imageFilename], () => {
      floatingButtonBackgroundService.selectScheme(null);
    });
  }

  const timePalId = extractCustomTimePalId(localStorage.getItem(TIMEPAL_KEYS.TYPE));
  if (timePalId) {
    const item = getStoredArray<{ id?: string; stageFilenames?: string[] }>(TIMEPAL_KEYS.CUSTOM_ITEMS)
      .find((candidate) => candidate.id === timePalId);
    if (!item) {
      localStorage.setItem(TIMEPAL_KEYS.TYPE, 'none');
      warnings.push(`时光小友缺少资源：${timePalId}`);
    } else {
      await validate('时光小友', item.stageFilenames || [], () => localStorage.setItem(TIMEPAL_KEYS.TYPE, 'none'));
    }
  }

  const uiThemeAssets = customUiThemes[activeUiTheme];
  if (uiThemeAssets) {
    await validate('UI 图标主题', Object.values(uiThemeAssets), () => uiIconService.setTheme('default'));
  }

  const packFiles = Array.isArray(customIconPack) ? customIconPack : customIconPack?.filenames || [];
  if (activeIconPack && packFiles.length > 0) {
    await validate('成就瓶图标包', packFiles, () => localStorage.setItem(
      THEME_KEYS.ACHIEVEMENT_BOTTLE_ICON_PACK,
      DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK
    ));
  }

  return warnings;
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

const getThemeSwitchStorage = (snapshot: ThemeSettingsSnapshot): Record<string, string | null> => (
  Object.fromEntries(
    Object.entries(snapshot.storage).filter(([key]) => !SNAPSHOT_RESOURCE_CATALOG_KEYS.has(key))
  )
);

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
  const addImageList = (key: string) => {
    const list = parse(key);
    if (!Array.isArray(list)) return;
    list.forEach((item) => {
      add(item?.imageFilename);
      add(item?.thumbnailFilename);
      if (Array.isArray(item?.stageFilenames)) item.stageFilenames.forEach(add);
    });
  };

  add(values[THEME_KEYS.FLOATING_BUTTON_BACKGROUND]);
  addImageList(THEME_KEYS.FLOATING_BUTTON_BACKGROUND_SCHEMES);

  addImageList('lumos_custom_backgrounds');
  addImageList('navigation_decoration_custom_list');
  addImageList('navigation_new_background_custom_list');
  addImageList('navigation_icon_custom_list_v1');
  addImageList('mood_calendar_fill_background_custom_list');
  addImageList('lumostime_timepal_custom_items');
  addImageList('lumostime_custom_stickers_v2');

  const customUiThemes = parse(UI_ICON_CUSTOM_ASSETS_KEY);
  if (customUiThemes && typeof customUiThemes === 'object' && !Array.isArray(customUiThemes)) {
    const addValues = (value: unknown) => {
      if (typeof value === 'string') add(value);
      else if (Array.isArray(value)) value.forEach(addValues);
      else if (value && typeof value === 'object') Object.values(value).forEach(addValues);
    };
    addValues(customUiThemes);
  }

  const customIconPacks = parse('lumostime_achievement_bottle_custom_icon_packs_v1');
  if (customIconPacks && typeof customIconPacks === 'object' && !Array.isArray(customIconPacks)) {
    Object.values(customIconPacks).forEach((pack) => {
      const filenames = Array.isArray(pack)
        ? pack
        : pack && typeof pack === 'object' && Array.isArray(pack.filenames)
          ? pack.filenames
          : [];
      filenames.forEach(add);
    });
  }

  return [...references];
};

export const applyThemeSettingsSnapshot = async (snapshot: ThemeSettingsSnapshot): Promise<string[]> => {
  const warnings: string[] = [];
  const switchStorage = getThemeSwitchStorage(snapshot);
  const currentFontId = switchStorage.lumostime_font_family || 'default';

  SNAPSHOT_EXTRA_KEYS.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(switchStorage, key)) return;
    const value = switchStorage[key];
    if (typeof value === 'string') localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  });
  appearanceBackupService.applyBackupPayload({ version: 1, storage: switchStorage });

  await fontService.refreshCustomFonts().catch(() => undefined);
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
  const customIconPacks = getStoredObject<Record<string, string[] | { name?: string; filenames?: string[] }>>('lumostime_achievement_bottle_custom_icon_packs_v1');
  const customIconPack = activeIconPack ? customIconPacks[activeIconPack] : undefined;
  if (activeIconPack && customIconPack) {
    const filenames = Array.isArray(customIconPack) ? customIconPack : customIconPack.filenames || [];
    const name = Array.isArray(customIconPack) ? activeIconPack : customIconPack.name || activeIconPack;
    if (filenames.length > 0) {
      await registerCustomAchievementBottleIconPack(activeIconPack, filenames, name);
    }
  }

  const navigationBackgroundId = snapshot.storage['navigation_new_background'];
  if (snapshot.storage.navigation_new_mode_enabled === 'true') {
    if (navigationBackgroundId) navigationBackgroundService.setCurrentBackground(navigationBackgroundId);
    navigationBackgroundService.setEnabled(true);
  } else {
    navigationBackgroundService.setEnabled(false);
  }
  navigationBackgroundService.setTransparentNavigationEnabled(switchStorage.navigation_transparent_enabled === 'true');
  await navigationBackgroundService.hydrateCustomBackgrounds();
  await navigationIconService.hydrateCustomIcons();
  await moodCalendarBackgroundService.hydrateCustomBackgrounds();
  warnings.push(...await validateActiveThemeResources(
    activeUiTheme,
    customUiThemes,
    activeIconPack,
    customIconPack
  ));

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
  if (moodCalendarBackgroundService.getCurrentBackground().startsWith('theme:')) {
    moodCalendarBackgroundService.setCurrentBackground('none');
  }
  localStorage.setItem(THEME_KEYS.ACHIEVEMENT_BOTTLE_STYLE, DEFAULT_ACHIEVEMENT_BOTTLE_STYLE);
  localStorage.setItem(THEME_KEYS.ACHIEVEMENT_BOTTLE_ICON_PACK, DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK);
  localStorage.setItem(THEME_KEYS.TIMELINE_STYLE_THEME, 'default');
  localStorage.setItem(THEME_KEYS.TIMELINE_STYLE_CONFIGS, JSON.stringify(DEFAULT_TIMELINE_STYLE_CONFIGS));
  floatingButtonBackgroundService.selectScheme(null);
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
