/**
 * @file customStickerAssetService.ts
 * @input local custom sticker metadata, daily reviews
 * @output helper functions for custom sticker sets and protected image filenames
 * @description Centralizes custom sticker metadata parsing, slot normalization, and image reference calculation for picker rendering, sync manifests, and image cleanup.
 * @updated 2026-04-19: Added slot index metadata, normalization for legacy custom sticker state, and optional empty-set inclusion for the sticker set editor.
 */

import { CustomStickerRecord, CustomStickerSetRecord, DailyReview } from '../types';

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
  isCustom: true;
  stickers: CustomStickerViewItem[];
}

interface BuildCustomStickerViewSetsOptions {
  includeEmptySets?: boolean;
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

export const getStoredCustomStickerState = (): {
  customStickerSets: CustomStickerSetRecord[];
  customStickers: CustomStickerRecord[];
} => normalizeCustomStickerState(
  safeParse<CustomStickerSetRecord[]>(localStorage.getItem(CUSTOM_STICKER_SETS_KEY), []),
  safeParse<CustomStickerRecord[]>(localStorage.getItem(CUSTOM_STICKERS_KEY), [])
);

export const buildCustomStickerViewSets = (
  customStickerSets: CustomStickerSetRecord[],
  customStickers: CustomStickerRecord[],
  options: BuildCustomStickerViewSetsOptions = {}
): CustomStickerViewSet[] => {
  const { includeEmptySets = false } = options;
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
    .filter((set) => set.status === 'active')
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
