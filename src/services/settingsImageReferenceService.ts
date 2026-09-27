/**
 * @file settingsImageReferenceService.ts
 * @input Local settings data stored in localStorage
 * @output Referenced image filenames used by settings features
 * @pos Service (Image Management)
 * @description Collects persisted settings-level image filenames so cleanup and sync manifest rebuild can keep user-owned assets.
 * @updated 2026-09-25: Included active custom sticker assets and custom navigation icon assets so legacy flat manifests can be migrated into the theme group.
 * @updated 2026-09-26: Protects custom Memoir mood-calendar background images from cleanup.
 * @updated 2026-09-26: Protects imported theme package image assets from cleanup and sync manifest rebuilds.
 * @updated 2026-09-26: Protects image-backed custom UIIcon assets from cleanup and sync manifest rebuilds.
 * @updated 2026-09-26: Protects custom achievement-bottle icon frames from cleanup and sync manifest rebuilds.
 * @updated 2026-09-26: Reads named custom icon-pack configuration while retaining legacy filename-array support.
 * @updated 2026-09-26: Protects single-image Memoir Fill backgrounds from cleanup and sync manifest rebuilds.
 * @updated 2026-09-26: Protects image assets retained by immutable saved theme snapshots.
 * @updated 2026-09-26: Reads achievement icon-pack filenames without treating display names as assets.
 * @updated 2026-09-26: Protects custom card-background group images from cleanup and sync manifest rebuilds.
 * @updated 2026-05-05: Added AI assistant persona and AI user avatar images to the protected settings reference set.
 * @updated 2026-08-10: Added custom background and navigation decoration image filenames to the protected settings reference set.
 */

import { THEME_KEYS, TIMEPAL_KEYS, storage } from '../constants/storageKeys';

const AI_CHAT_PERSONAS_KEY = 'lumostime_ai_chat_personas_v1';
const AI_CHAT_USER_PROFILE_KEY = 'lumostime_ai_chat_user_profile_v1';
const CUSTOM_BACKGROUND_KEY = 'lumos_custom_backgrounds';
const CUSTOM_NAVIGATION_KEY = 'navigation_decoration_custom_list';
const CUSTOM_NAVIGATION_ICON_KEY = 'navigation_icon_custom_list_v1';
const CUSTOM_MOOD_CALENDAR_FILL_BACKGROUND_KEY = 'mood_calendar_fill_background_custom_list';
const CUSTOM_STICKERS_KEY = 'lumostime_custom_stickers_v2';
const CUSTOM_UI_ICON_ASSETS_KEY = 'lumostime_ui_icon_custom_assets_v1';
const CUSTOM_ACHIEVEMENT_ICON_PACKS_KEY = 'lumostime_achievement_bottle_custom_icon_packs_v1';
const CARD_BACKGROUND_GROUPS_KEY = 'lumostime_card_background_groups_v1';

interface StoredCustomTimePalItem {
  stageFilenames?: unknown;
}

interface StoredAIChatPersona {
  avatarImage?: unknown;
}

interface StoredAIChatUserProfile {
  avatarImage?: unknown;
}

interface StoredImageAsset {
  imageFilename?: unknown;
}

interface StoredCustomSticker {
  imageFilename?: unknown;
  thumbnailFilename?: unknown;
  status?: unknown;
}

interface StoredThemePackage {
  imageAssets?: unknown;
}

interface StoredCustomPreset {
  snapshot?: {
    storage?: Record<string, string | null>;
  };
}

interface StoredCardBackgroundGroup {
  imageFilenames?: unknown;
}

const isValidFilename = (value: unknown): value is string => (
  typeof value === 'string' && value.trim().length > 0
);

const readRawJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`[settingsImageReferenceService] Failed to parse localStorage key "${key}"`, error);
    return fallback;
  }
};

export const getSettingsReferencedImages = (): Set<string> => {
  const referencedImages = new Set<string>();
  const customTimePalItems = storage.getJSON<StoredCustomTimePalItem[]>(TIMEPAL_KEYS.CUSTOM_ITEMS, []);
  const aiChatPersonas = readRawJson<StoredAIChatPersona[]>(AI_CHAT_PERSONAS_KEY, []);
  const aiChatUserProfile = readRawJson<StoredAIChatUserProfile | null>(AI_CHAT_USER_PROFILE_KEY, null);
  const customBackgrounds = readRawJson<StoredImageAsset[]>(CUSTOM_BACKGROUND_KEY, []);
  const customNavigationDecorations = readRawJson<StoredImageAsset[]>(CUSTOM_NAVIGATION_KEY, []);
  const customNavigationIcons = readRawJson<StoredImageAsset[]>(CUSTOM_NAVIGATION_ICON_KEY, []);
  const customMoodCalendarFillBackgrounds = readRawJson<StoredImageAsset[]>(CUSTOM_MOOD_CALENDAR_FILL_BACKGROUND_KEY, []);
  const customStickers = readRawJson<StoredCustomSticker[]>(CUSTOM_STICKERS_KEY, []);
  const importedThemePackages = readRawJson<StoredThemePackage[]>(
    'lumostime_theme_packages_v1',
    []
  );
  const customUiIconAssets = readRawJson<Record<string, Record<string, unknown>>>(CUSTOM_UI_ICON_ASSETS_KEY, {});
  const customAchievementIconPacks = readRawJson<Record<string, unknown>>(CUSTOM_ACHIEVEMENT_ICON_PACKS_KEY, {});
  const cardBackgroundGroups = readRawJson<StoredCardBackgroundGroup[]>(CARD_BACKGROUND_GROUPS_KEY, []);
  const savedPresets = storage.getJSON<StoredCustomPreset[]>(THEME_KEYS.CUSTOM_PRESETS, []);

  if (Array.isArray(customTimePalItems)) {
    customTimePalItems.forEach((item) => {
      if (!Array.isArray(item?.stageFilenames)) {
        return;
      }

      item.stageFilenames.forEach((filename) => {
        if (isValidFilename(filename)) {
          referencedImages.add(filename);
        }
      });
    });
  }

  if (Array.isArray(cardBackgroundGroups)) {
    cardBackgroundGroups.forEach((group) => {
      if (!Array.isArray(group?.imageFilenames)) return;
      group.imageFilenames.forEach((filename) => {
        if (isValidFilename(filename)) {
          referencedImages.add(filename);
          referencedImages.add(`thumb_${filename}`);
        }
      });
    });
  }

  if (Array.isArray(aiChatPersonas)) {
    aiChatPersonas.forEach((persona) => {
      if (isValidFilename(persona?.avatarImage)) {
        referencedImages.add(persona.avatarImage);
      }
    });
  }

  if (isValidFilename(aiChatUserProfile?.avatarImage)) {
    referencedImages.add(aiChatUserProfile.avatarImage);
  }

  [...customBackgrounds, ...customNavigationDecorations, ...customMoodCalendarFillBackgrounds].forEach((asset) => {
    if (isValidFilename(asset?.imageFilename)) {
      referencedImages.add(asset.imageFilename);
      referencedImages.add(`thumb_${asset.imageFilename}`);
    }
  });

  customNavigationIcons.forEach((asset) => {
    if (isValidFilename(asset?.imageFilename)) {
      referencedImages.add(asset.imageFilename);
      referencedImages.add(`thumb_${asset.imageFilename}`);
    }
  });

  customStickers.forEach((sticker) => {
    if (sticker?.status !== 'active' || !isValidFilename(sticker.imageFilename)) {
      return;
    }
    referencedImages.add(sticker.imageFilename);
    referencedImages.add(
      isValidFilename(sticker.thumbnailFilename)
        ? sticker.thumbnailFilename
        : `thumb_${sticker.imageFilename}`
    );
  });

  importedThemePackages.forEach((themePackage) => {
    if (!themePackage || typeof themePackage.imageAssets !== 'object' || !themePackage.imageAssets) {
      return;
    }

    Object.values(themePackage.imageAssets as Record<string, unknown>).forEach((filename) => {
      if (!isValidFilename(filename)) {
        return;
      }
      referencedImages.add(filename);
      referencedImages.add(`thumb_${filename}`);
    });
  });

  Object.values(customUiIconAssets).forEach((mapping) => {
    if (!mapping || typeof mapping !== 'object') return;
    Object.values(mapping).forEach((filename) => {
      if (isValidFilename(filename)) {
        referencedImages.add(filename);
        referencedImages.add(`thumb_${filename}`);
      }
    });
  });

  Object.values(customAchievementIconPacks).forEach((pack) => {
    const filenames = Array.isArray(pack)
      ? pack
      : pack && typeof pack === 'object' && Array.isArray((pack as { filenames?: unknown }).filenames)
        ? (pack as { filenames: unknown[] }).filenames
        : [];
    if (!Array.isArray(filenames)) return;
    filenames.forEach((filename) => {
      if (isValidFilename(filename)) {
        referencedImages.add(filename);
        referencedImages.add(`thumb_${filename}`);
      }
    });
  });

  if (Array.isArray(savedPresets)) {
    const snapshotKeys = [
      TIMEPAL_KEYS.CUSTOM_ITEMS,
      CUSTOM_BACKGROUND_KEY,
      CUSTOM_NAVIGATION_KEY,
      'navigation_new_background_custom_list',
      CUSTOM_NAVIGATION_ICON_KEY,
      CUSTOM_MOOD_CALENDAR_FILL_BACKGROUND_KEY,
      CUSTOM_STICKERS_KEY
    ];
    savedPresets.forEach((preset) => {
      const snapshot = preset?.snapshot?.storage;
      if (!snapshot) return;
      snapshotKeys.forEach((key) => {
        let value: unknown;
        try {
          value = JSON.parse(snapshot[key] || 'null');
        } catch {
          return;
        }
        if (!Array.isArray(value)) return;
        value.forEach((item) => {
          if (isValidFilename(item?.imageFilename)) {
            referencedImages.add(item.imageFilename);
            referencedImages.add(`thumb_${item.imageFilename}`);
          }
          if (isValidFilename(item?.thumbnailFilename)) referencedImages.add(item.thumbnailFilename);
          if (Array.isArray(item?.stageFilenames)) {
            item.stageFilenames.forEach((filename: unknown) => {
              if (isValidFilename(filename)) referencedImages.add(filename);
            });
          }
        });
      });

      const collect = (candidate: unknown) => {
        if (typeof candidate === 'string' && isValidFilename(candidate)) {
          referencedImages.add(candidate);
          referencedImages.add(`thumb_${candidate}`);
        } else if (Array.isArray(candidate)) {
          candidate.forEach(collect);
        } else if (candidate && typeof candidate === 'object') {
          Object.values(candidate).forEach(collect);
        }
      };
      let uiIconAssets: unknown;
      try {
        uiIconAssets = JSON.parse(snapshot[CUSTOM_UI_ICON_ASSETS_KEY] || 'null');
      } catch {
        uiIconAssets = null;
      }
      collect(uiIconAssets);

      let achievementIconPacks: unknown;
      try {
        achievementIconPacks = JSON.parse(snapshot[CUSTOM_ACHIEVEMENT_ICON_PACKS_KEY] || 'null');
      } catch {
        achievementIconPacks = null;
      }
      if (achievementIconPacks && typeof achievementIconPacks === 'object' && !Array.isArray(achievementIconPacks)) {
        Object.values(achievementIconPacks).forEach((pack) => {
          const filenames = Array.isArray(pack)
            ? pack
            : pack && typeof pack === 'object' && Array.isArray((pack as { filenames?: unknown }).filenames)
              ? (pack as { filenames: unknown[] }).filenames
              : [];
          filenames.forEach(collect);
        });
      }
    });
  }

  return referencedImages;
};
