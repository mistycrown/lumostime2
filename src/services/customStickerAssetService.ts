/**
 * @file customStickerAssetService.ts
 * @input local custom sticker metadata, daily reviews
 * @output helper functions for custom sticker sets and protected image filenames
 * @description Centralizes custom sticker metadata parsing, slot normalization, and image reference calculation for picker rendering, sync manifests, and image cleanup.
 * @updated 2026-04-19: Added slot index metadata, normalization for legacy custom sticker state, and optional empty-set inclusion for the sticker set editor.
 * @updated 2026-10-02: Separates tag sticker groups from the general mood sticker picker while preserving shared assets.
 * @updated 2026-10-04: Includes resources from every imported theme without requiring theme application.
 */

import { CustomStickerRecord, CustomStickerSetRecord, DailyReview } from '../types';
import { THEME_KEYS } from '../constants/storageKeys';
import type { ImportedThemePackageRecord } from './themePackageImportService';

const CUSTOM_STICKER_SETS_KEY = 'lumostime_custom_sticker_sets_v2';
const CUSTOM_STICKERS_KEY = 'lumostime_custom_stickers_v2';
const MAX_CUSTOM_STICKER_SLOTS = 16;

export interface CustomStickerViewItem {
  id: string;
  path: string;
  label?: string;
  thumbnail?: string;
  slotIndex: number;
}

export interface CustomStickerViewSet {
  id: string;
  name: string;
  description?: string;
  activityId?: string;
  isCustom: true;
  stickers: CustomStickerViewItem[];
}

interface BuildCustomStickerViewSetsOptions {
  includeEmptySets?: boolean;
  purpose?: 'mood' | 'tag' | 'all';
}

const safeParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('[customStickerAssetService] Failed to parse custom sticker payload', error);
    return fallback;
  }
};

const getStickerSortRank = (sticker: CustomStickerRecord): number => {
  if (
    Number.isInteger(sticker.sortOrder) &&
    sticker.sortOrder >= 0 &&
    sticker.sortOrder < MAX_CUSTOM_STICKER_SLOTS
  ) {
    return sticker.sortOrder;
  }

  return Number.MAX_SAFE_INTEGER;
};

const findNextAvailableSlot = (usedSlots: Set<number>): number | null => {
  for (let slotIndex = 0; slotIndex < MAX_CUSTOM_STICKER_SLOTS; slotIndex += 1) {
    if (!usedSlots.has(slotIndex)) {
      return slotIndex;
    }
  }

  return null;
};

export const normalizeCustomStickerState = (
  customStickerSets: CustomStickerSetRecord[] = [],
  customStickers: CustomStickerRecord[] = []
): {
  customStickerSets: CustomStickerSetRecord[];
  customStickers: CustomStickerRecord[];
} => {
  const normalizedSets = customStickerSets.map((set) => ({
    ...set,
    status: 'active' as const
  }));
  const setIds = new Set(normalizedSets.map((set) => set.id));
  const stickersBySetId = new Map<string, CustomStickerRecord[]>();

  customStickers.forEach((sticker) => {
    if (!setIds.has(sticker.setId)) {
      return;
    }

    const list = stickersBySetId.get(sticker.setId) || [];
    list.push({
      ...sticker,
      status: 'active',
      thumbnailFilename: sticker.thumbnailFilename || `thumb_${sticker.imageFilename}`
    });
    stickersBySetId.set(sticker.setId, list);
  });

  const normalizedStickers: CustomStickerRecord[] = [];
  const normalizedSetsWithStickerIds = normalizedSets.map((set) => {
    const stickers = (stickersBySetId.get(set.id) || [])
      .sort((first, second) => (
        getStickerSortRank(first) - getStickerSortRank(second) ||
        first.createdAt - second.createdAt
      ));
    const usedSlots = new Set<number>();
    const stickerIds: string[] = [];

    stickers.forEach((sticker) => {
      const desiredSlot = (
        Number.isInteger(sticker.sortOrder) &&
        sticker.sortOrder >= 0 &&
        sticker.sortOrder < MAX_CUSTOM_STICKER_SLOTS &&
        !usedSlots.has(sticker.sortOrder)
      )
        ? sticker.sortOrder
        : findNextAvailableSlot(usedSlots);

      if (desiredSlot === null) {
        return;
      }

      usedSlots.add(desiredSlot);
      stickerIds.push(sticker.id);
      normalizedStickers.push({
        ...sticker,
        sortOrder: desiredSlot
      });
    });

    return {
      ...set,
      stickerIds
    };
  });

  return {
    customStickerSets: normalizedSetsWithStickerIds,
    customStickers: normalizedStickers
  };
};

export const buildThemePackageStickerState = (record: ImportedThemePackageRecord): {
  customStickerSets: CustomStickerSetRecord[];
  customStickers: CustomStickerRecord[];
} => {
  const customStickerSets: CustomStickerSetRecord[] = [];
  const customStickers: CustomStickerRecord[] = [];
  const config = record?.manifest?.config?.stickers;
  if (typeof record?.id !== 'string' || !Array.isArray(config)) {
    return { customStickerSets, customStickers };
  }
  const timestamp = record.updatedAt || record.importedAt || 0;
  config.forEach((rawSet, setIndex) => {
    if (!rawSet || typeof rawSet !== 'object') return;
    const set = rawSet as Record<string, unknown>;
    const setKey = String(set.id || setIndex);
    const setId = `theme:${record.id}:sticker-set-${setKey}`;
    const items = Array.isArray(set.items) ? set.items : [];
    const stickers: CustomStickerRecord[] = items.slice(0, MAX_CUSTOM_STICKER_SLOTS).flatMap((rawItem, itemIndex) => {
      if (!rawItem || typeof rawItem !== 'object') return [];
      const item = rawItem as Record<string, unknown>;
      const imageFilename = typeof item.file === 'string' ? record.imageAssets?.[item.file] : undefined;
      if (!imageFilename) return [];
      return [{
        id: `theme:${record.id}:sticker-${setKey}-${String(item.id || itemIndex)}`,
        setId, imageFilename, thumbnailFilename: `thumb_${imageFilename}`,
        label: typeof item.name === 'string' ? item.name : undefined,
        sortOrder: itemIndex, status: 'active' as const, createdAt: timestamp, updatedAt: timestamp
      }];
    });
    customStickerSets.push({
      id: setId, name: typeof set.name === 'string' ? set.name : record.name,
      stickerIds: stickers.map(item => item.id), status: 'active', createdAt: timestamp, updatedAt: timestamp
    });
    customStickers.push(...stickers);
  });
  return { customStickerSets, customStickers };
};

export const getStoredCustomStickerState = (): {
  customStickerSets: CustomStickerSetRecord[];
  customStickers: CustomStickerRecord[];
} => {
  const current = normalizeCustomStickerState(
    safeParse<CustomStickerSetRecord[]>(localStorage.getItem(CUSTOM_STICKER_SETS_KEY), []),
    safeParse<CustomStickerRecord[]>(localStorage.getItem(CUSTOM_STICKERS_KEY), [])
  );
  const packages = safeParse<ImportedThemePackageRecord[]>(localStorage.getItem(THEME_KEYS.IMPORTED_THEME_PACKAGES), []);
  const existingSetIds = new Set(current.customStickerSets.map(set => set.id));
  if (Array.isArray(packages)) {
    packages.forEach(record => {
      const resources = buildThemePackageStickerState(record);
      resources.customStickerSets.forEach(set => {
        // Existing sets may contain user edits; only recover sets that were never registered.
        if (existingSetIds.has(set.id)) return;
        existingSetIds.add(set.id);
        current.customStickerSets.push(set);
        current.customStickers.push(...resources.customStickers.filter(sticker => sticker.setId === set.id));
      });
    });
  }
  return normalizeCustomStickerState(current.customStickerSets, current.customStickers);
};

export const buildCustomStickerViewSets = (
  customStickerSets: CustomStickerSetRecord[],
  customStickers: CustomStickerRecord[],
  options: BuildCustomStickerViewSetsOptions = {}
): CustomStickerViewSet[] => {
  const { includeEmptySets = false, purpose = 'mood' } = options;
  const stickersBySetId = new Map<string, CustomStickerRecord[]>();

  customStickers.forEach((sticker) => {
    if (sticker.status !== 'active') {
      return;
    }

    const list = stickersBySetId.get(sticker.setId) || [];
    list.push(sticker);
    stickersBySetId.set(sticker.setId, list);
  });

  return customStickerSets
    .filter((set) => set.status === 'active' && (purpose === 'all' || (set.purpose || 'mood') === purpose))
    .map((set) => {
      const stickers = (stickersBySetId.get(set.id) || [])
        .sort((first, second) => first.sortOrder - second.sortOrder || first.createdAt - second.createdAt)
        .map((sticker) => ({
          id: sticker.id,
          path: sticker.imageFilename,
          label: sticker.label,
          thumbnail: sticker.thumbnailFilename,
          slotIndex: sticker.sortOrder
        }));

      return {
        id: set.id,
        name: set.name,
        activityId: set.activityId,
        isCustom: true as const,
        stickers
      };
    })
    .filter((set) => includeEmptySets || set.stickers.length > 0);
};

export const collectCustomStickerReferencedImages = (
  dailyReviews: DailyReview[] = [],
  customStickerSets: CustomStickerSetRecord[] = [],
  customStickers: CustomStickerRecord[] = []
): Set<string> => {
  const referencedImages = new Set<string>();
  const activeSetIds = new Set(
    customStickerSets
      .filter((set) => set.status === 'active')
      .map((set) => set.id)
  );
  const stickerByFilename = new Map<string, CustomStickerRecord>();

  customStickers.forEach((sticker) => {
    stickerByFilename.set(sticker.imageFilename, sticker);

    if (sticker.status === 'active' && activeSetIds.has(sticker.setId)) {
      referencedImages.add(sticker.imageFilename);
      if (sticker.thumbnailFilename) {
        referencedImages.add(sticker.thumbnailFilename);
      } else {
        referencedImages.add(`thumb_${sticker.imageFilename}`);
      }
    }
  });

  dailyReviews.forEach((review) => {
    const moodValue = typeof review?.moodEmoji === 'string' ? review.moodEmoji : '';
    if (!moodValue.startsWith('image:')) {
      return;
    }

    const filename = moodValue.substring(6);
    const sticker = stickerByFilename.get(filename);
    if (!sticker) {
      return;
    }

    referencedImages.add(sticker.imageFilename);
    if (sticker.thumbnailFilename) {
      referencedImages.add(sticker.thumbnailFilename);
    } else {
      referencedImages.add(`thumb_${sticker.imageFilename}`);
    }
  });

  return referencedImages;
};
