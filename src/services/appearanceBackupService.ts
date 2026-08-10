/**
 * @file appearanceBackupService.ts
 * @input Theme, background, navigation, TimePal, font, and style preferences from localStorage
 * @output Versioned appearance backup payloads, restore helpers, and referenced theme image filenames
 * @pos Service (Backup and Sync)
 * @description Centralizes the user-facing appearance and TimePal settings that must survive export, cloud restore, and reinstall.
 * @updated 2026-08-10: Added the first unified appearance backup block with built-in-font fallback and theme-image reference extraction.
 */
import { TIMEPAL_KEYS, THEME_KEYS } from '../constants/storageKeys';
import { fontService } from './fontService';
import { uiIconService } from './uiIconService';
import { colorSchemeService } from './colorSchemeService';
import { backgroundService } from './backgroundService';
import { navigationDecorationService } from './navigationDecorationService';

export const APPEARANCE_RESTORED_EVENT = 'lumostime:appearance-restored';

const APPEARANCE_STORAGE_KEYS = [
  THEME_KEYS.CURRENT_PRESET,
  THEME_KEYS.UI_ICON_THEME,
  THEME_KEYS.COLOR_SCHEME,
  THEME_KEYS.CUSTOM_COLOR_GROUP,
  THEME_KEYS.CURRENT_BACKGROUND,
  'lumos_background_opacity',
  THEME_KEYS.NAVIGATION_DECORATION,
  'navigation_decoration_custom_settings',
  'navigation_decoration_custom_list',
  'lumos_custom_backgrounds',
  THEME_KEYS.CUSTOM_PRESETS,
  THEME_KEYS.SCHEDULE_STYLE,
  THEME_KEYS.CALENDAR_NUMBER_STYLE,
  THEME_KEYS.CALENDAR_LUNAR_DISPLAY,
  THEME_KEYS.TIMELINE_STYLE_THEME,
  THEME_KEYS.TIMELINE_STYLE_CONFIGS,
  THEME_KEYS.TIMELINE_LAYOUT,
  THEME_KEYS.ACHIEVEMENT_BOTTLE_STYLE,
  THEME_KEYS.ACHIEVEMENT_BOTTLE_ICON_PACK,
  'lumostime_emoji_style',
  'lumostime_theme_mode',
  'lumos_selected_icon',
  'lumostime_font_family',
  TIMEPAL_KEYS.TYPE,
  TIMEPAL_KEYS.CUSTOM_ITEMS,
  TIMEPAL_KEYS.STAGE_THRESHOLDS,
  TIMEPAL_KEYS.CLICK_SWITCH_ENABLED,
  TIMEPAL_KEYS.FILTER_ENABLED,
  TIMEPAL_KEYS.FILTER_ACTIVITIES,
  TIMEPAL_KEYS.CUSTOM_QUOTES_ENABLED,
  TIMEPAL_KEYS.CUSTOM_QUOTES
] as const;

type AppearanceStorage = Record<string, string | null>;

export interface AppearanceBackupPayload {
  version: 1;
  storage: AppearanceStorage;
}

const readStorageSnapshot = (): AppearanceStorage => Object.fromEntries(
  APPEARANCE_STORAGE_KEYS.map((key) => [key, localStorage.getItem(key)])
);

const parseJsonValue = (storageSnapshot: AppearanceStorage, key: string): unknown => {
  const raw = storageSnapshot[key];
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const isBuiltInFont = (fontId: string): boolean => (
  fontService.getAllFonts().some((font) => font.id === fontId && font.source === 'builtin')
);

const normalizeStorageForRestore = (snapshot: AppearanceStorage): AppearanceStorage => {
  const next = { ...snapshot };
  const savedFont = next.lumostime_font_family;
  if (savedFont && !isBuiltInFont(savedFont)) {
    next.lumostime_font_family = 'default';
  }
  return next;
};

const addImageReference = (set: Set<string>, value: unknown, includeThumbnail = true): void => {
  if (typeof value === 'string' && value.trim()) {
    set.add(value.trim());
    if (includeThumbnail) {
      set.add(`thumb_${value.trim()}`);
    }
  }
};

const collectImageReferencesFromSnapshot = (snapshot: AppearanceStorage): string[] => {
  const referenced = new Set<string>();
  const customTimePalItems = parseJsonValue(snapshot, TIMEPAL_KEYS.CUSTOM_ITEMS);
  if (Array.isArray(customTimePalItems)) {
    customTimePalItems.forEach((item) => {
      if (Array.isArray(item?.stageFilenames)) {
        item.stageFilenames.forEach((filename: unknown) => addImageReference(referenced, filename, false));
      }
    });
  }

  const customBackgrounds = parseJsonValue(snapshot, 'lumos_custom_backgrounds');
  if (Array.isArray(customBackgrounds)) {
    customBackgrounds.forEach((item) => addImageReference(referenced, item?.imageFilename));
  }

  const customDecorations = parseJsonValue(snapshot, 'navigation_decoration_custom_list');
  if (Array.isArray(customDecorations)) {
    customDecorations.forEach((item) => addImageReference(referenced, item?.imageFilename));
  }

  return [...referenced];
};

export const appearanceBackupService = {
  buildBackupPayload(): AppearanceBackupPayload {
    return {
      version: 1,
      storage: readStorageSnapshot()
    };
  },

  applyBackupPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') return;
    const candidate = payload as Partial<AppearanceBackupPayload>;
    if (!candidate.storage || typeof candidate.storage !== 'object') return;

    const restoredStorage = normalizeStorageForRestore(candidate.storage as AppearanceStorage);
    APPEARANCE_STORAGE_KEYS.forEach((key) => {
      const value = restoredStorage[key];
      if (typeof value === 'string') {
        localStorage.setItem(key, value);
      } else if (value === null) {
        localStorage.removeItem(key);
      }
    });

    const fontId = restoredStorage.lumostime_font_family || 'default';
    fontService.setFont(isBuiltInFont(fontId) ? fontId : 'default');
    uiIconService.setTheme((restoredStorage[THEME_KEYS.UI_ICON_THEME] || 'default') as any);
    colorSchemeService.setScheme((restoredStorage[THEME_KEYS.COLOR_SCHEME] || 'default') as any);
    backgroundService.setCurrentBackground(restoredStorage[THEME_KEYS.CURRENT_BACKGROUND] || 'default');
    navigationDecorationService.setCurrentDecoration(restoredStorage[THEME_KEYS.NAVIGATION_DECORATION] || 'default');
    void backgroundService.hydrateImageBackedCustomBackgrounds();
    void navigationDecorationService.hydrateImageBackedCustomDecorations();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(APPEARANCE_RESTORED_EVENT));
      window.dispatchEvent(new Event('timepal-type-changed'));
      window.dispatchEvent(new Event('timepal-click-switch-changed'));
      window.dispatchEvent(new Event('timepal-stage-thresholds-changed'));
      window.dispatchEvent(new Event('timepal-custom-changed'));
    }
  },

  getReferencedImageFilenames(payload?: AppearanceBackupPayload): string[] {
    return collectImageReferencesFromSnapshot(payload?.storage || readStorageSnapshot());
  },

  getStorageKeys(): readonly string[] {
    return APPEARANCE_STORAGE_KEYS;
  }
};
