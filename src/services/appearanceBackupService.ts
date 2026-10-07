/**
 * @file appearanceBackupService.ts
 * @input Theme, background, navigation, TimePal, font, and style preferences from localStorage
 * @output Versioned appearance backup payloads, restore helpers, and referenced theme image filenames
 * @pos Service (Backup and Sync)
 * @description Centralizes the user-facing appearance and TimePal settings that must survive export, cloud restore, and reinstall.
 * @updated 2026-08-10: Added the first unified appearance backup block with built-in-font fallback and theme-image reference extraction.
 * @updated 2026-09-15: Included the global font-scale preference in appearance backups.
 * @updated 2026-09-25: Included navigation icon selections and custom image hydration in appearance backups.
 * @updated 2026-09-26: Included Memoir mood-calendar backgrounds in appearance backups and image references.
 * @updated 2026-09-26: Included imported theme package metadata while keeping local-only font binaries out of sync.
 * @updated 2026-09-26: Syncs custom achievement-bottle image mappings without uploading their binary data directly.
 * @updated 2026-09-26: Includes independent Memoir calendar background modes in appearance backup and restore.
 * @updated 2026-09-26: Includes custom card background groups, selection, opacity, and image references.
 * @updated 2026-09-28: Includes transparent navigation, chart palettes, and custom UI-icon theme names.
 * @updated 2026-09-29: Includes the global floating-button image background and scale.
 * @updated 2026-10-01: Includes the TimePal card seconds-visibility preference.
 * @updated 2026-10-04: Backs up modern navigation settings and images, then hydrates and refreshes navigation on restore.
 * @updated 2026-10-05: Compacts file-backed image URLs in backups and restores, including saved theme snapshots.
 * @updated 2026-10-07: Keeps modern navigation background adjustments local to each device instead of syncing them.
 */
import { TIMEPAL_KEYS, THEME_KEYS } from '../constants/storageKeys';
import { sanitizeAppearanceImageStorage } from '../utils/imageAssetStorage';
import { fontService } from './fontService';
import { UI_ICON_CUSTOM_ASSETS_KEY, UI_ICON_CUSTOM_THEME_NAMES_KEY, uiIconService } from './uiIconService';
import { colorSchemeService } from './colorSchemeService';
import { backgroundService } from './backgroundService';
import { navigationDecorationService } from './navigationDecorationService';
import {
  NAVIGATION_BACKGROUND_CHANGE_EVENT,
  NAVIGATION_BACKGROUND_MODE_CHANGE_EVENT,
  NAVIGATION_TRANSPARENCY_CHANGE_EVENT,
  navigationBackgroundService
} from './navigationBackgroundService';
import { NAVIGATION_ICON_CHANGE_EVENT, navigationIconService } from './navigationIconService';
import { moodCalendarBackgroundService } from './moodCalendarBackgroundService';
import { ACHIEVEMENT_BOTTLE_CUSTOM_ICON_PACKS_KEY } from './achievementBottleIconPackService';
import {
  CARD_BACKGROUND_CURRENT_KEY,
  CARD_BACKGROUND_GROUPS_KEY,
  CARD_BACKGROUND_OPACITY_KEY
} from './cardBackgroundService';

export const APPEARANCE_RESTORED_EVENT = 'lumostime:appearance-restored';

const APPEARANCE_STORAGE_KEYS = [
  THEME_KEYS.CURRENT_PRESET,
  THEME_KEYS.UI_ICON_THEME,
  UI_ICON_CUSTOM_ASSETS_KEY,
  UI_ICON_CUSTOM_THEME_NAMES_KEY,
  THEME_KEYS.COLOR_SCHEME,
  THEME_KEYS.CUSTOM_COLOR_GROUP,
  THEME_KEYS.CUSTOM_CHART_PALETTE_SEQUENCES,
  THEME_KEYS.CURRENT_BACKGROUND,
  'lumos_background_opacity',
  THEME_KEYS.NAVIGATION_DECORATION,
  'navigation_decoration_custom_settings',
  'navigation_decoration_custom_list',
  'navigation_new_mode_enabled',
  'navigation_new_background',
  'navigation_new_background_custom_list',
  'navigation_icon_selection_v1',
  'navigation_icon_custom_list_v1',
  'navigation_icon_schemes_v1',
  'navigation_transparent_enabled',
  'mood_calendar_background_settings',
  'mood_calendar_fill_background',
  'mood_calendar_fill_background_custom_list',
  'lumos_custom_backgrounds',
  THEME_KEYS.CUSTOM_PRESETS,
  THEME_KEYS.IMPORTED_THEME_PACKAGES,
  THEME_KEYS.SCHEDULE_STYLE,
  THEME_KEYS.CALENDAR_NUMBER_STYLE,
  THEME_KEYS.CALENDAR_LUNAR_DISPLAY,
  THEME_KEYS.TIMELINE_STYLE_THEME,
  THEME_KEYS.TIMELINE_STYLE_CONFIGS,
  THEME_KEYS.TIMELINE_LAYOUT,
  THEME_KEYS.ACHIEVEMENT_BOTTLE_STYLE,
  THEME_KEYS.ACHIEVEMENT_BOTTLE_ICON_PACK,
  ACHIEVEMENT_BOTTLE_CUSTOM_ICON_PACKS_KEY,
  'lumostime_emoji_style',
  'lumostime_theme_mode',
  'lumos_selected_icon',
  'lumostime_font_family',
  'lumostime_font_scale',
  TIMEPAL_KEYS.TYPE,
  TIMEPAL_KEYS.CUSTOM_ITEMS,
  TIMEPAL_KEYS.STAGE_THRESHOLDS,
  TIMEPAL_KEYS.CLICK_SWITCH_ENABLED,
  TIMEPAL_KEYS.SHOW_SECONDS,
  TIMEPAL_KEYS.FILTER_ENABLED,
  TIMEPAL_KEYS.FILTER_ACTIVITIES,
  TIMEPAL_KEYS.CUSTOM_QUOTES_ENABLED,
  TIMEPAL_KEYS.CUSTOM_QUOTES,
  CARD_BACKGROUND_GROUPS_KEY,
  CARD_BACKGROUND_CURRENT_KEY,
  CARD_BACKGROUND_OPACITY_KEY,
  THEME_KEYS.FLOATING_BUTTON_BACKGROUND,
  THEME_KEYS.FLOATING_BUTTON_BACKGROUND_SCALE,
  THEME_KEYS.FLOATING_BUTTON_BACKGROUND_SCHEMES,
  THEME_KEYS.FLOATING_BUTTON_BACKGROUND_CURRENT
] as const;

type AppearanceStorage = Record<string, string | null>;

export interface AppearanceBackupPayload {
  version: 1;
  storage: AppearanceStorage;
}

const readStorageSnapshot = (): AppearanceStorage => sanitizeAppearanceImageStorage(Object.fromEntries(
  APPEARANCE_STORAGE_KEYS.map((key) => [key, localStorage.getItem(key)])
));

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
  const next = sanitizeAppearanceImageStorage(snapshot);
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
  addImageReference(referenced, snapshot[THEME_KEYS.FLOATING_BUTTON_BACKGROUND]);
  const floatingButtonSchemes = parseJsonValue(snapshot, THEME_KEYS.FLOATING_BUTTON_BACKGROUND_SCHEMES);
  if (Array.isArray(floatingButtonSchemes)) {
    floatingButtonSchemes.forEach((scheme) => addImageReference(referenced, scheme?.imageFilename));
  }
  const cardBackgroundGroups = parseJsonValue(snapshot, CARD_BACKGROUND_GROUPS_KEY);
  if (Array.isArray(cardBackgroundGroups)) {
    cardBackgroundGroups.forEach((group) => {
      if (Array.isArray(group?.imageFilenames)) {
        group.imageFilenames.forEach((filename: unknown) => addImageReference(referenced, filename));
      }
    });
  }
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

  const customNavigationBackgrounds = parseJsonValue(snapshot, 'navigation_new_background_custom_list');
  if (Array.isArray(customNavigationBackgrounds)) {
    customNavigationBackgrounds.forEach((item) => addImageReference(referenced, item?.imageFilename));
  }

  const customNavigationIcons = parseJsonValue(snapshot, 'navigation_icon_custom_list_v1');
  if (Array.isArray(customNavigationIcons)) {
    customNavigationIcons.forEach((item) => addImageReference(referenced, item?.imageFilename));
  }

  const customMoodCalendarFillBackgrounds = parseJsonValue(snapshot, 'mood_calendar_fill_background_custom_list');
  if (Array.isArray(customMoodCalendarFillBackgrounds)) {
    customMoodCalendarFillBackgrounds.forEach((item) => addImageReference(referenced, item?.imageFilename));
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
    void navigationBackgroundService.hydrateCustomBackgrounds();
    void navigationIconService.hydrateCustomIcons();
    void moodCalendarBackgroundService.hydrateCustomBackgrounds();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(NAVIGATION_BACKGROUND_MODE_CHANGE_EVENT, {
        detail: { enabled: navigationBackgroundService.isEnabled() }
      }));
      window.dispatchEvent(new CustomEvent(NAVIGATION_BACKGROUND_CHANGE_EVENT, {
        detail: { backgroundId: navigationBackgroundService.getCurrentBackground() }
      }));
      window.dispatchEvent(new CustomEvent(NAVIGATION_TRANSPARENCY_CHANGE_EVENT, {
        detail: { enabled: navigationBackgroundService.isTransparentNavigationEnabled() }
      }));
      window.dispatchEvent(new Event(APPEARANCE_RESTORED_EVENT));
      window.dispatchEvent(new Event('timepal-type-changed'));
      window.dispatchEvent(new Event('timepal-click-switch-changed'));
      window.dispatchEvent(new Event('timepal-stage-thresholds-changed'));
      window.dispatchEvent(new Event('timepal-custom-changed'));
      window.dispatchEvent(new Event(NAVIGATION_ICON_CHANGE_EVENT));
    }
  },

  getReferencedImageFilenames(payload?: AppearanceBackupPayload): string[] {
    return collectImageReferencesFromSnapshot(payload?.storage || readStorageSnapshot());
  },

  getStorageKeys(): readonly string[] {
    return APPEARANCE_STORAGE_KEYS;
  }
};
