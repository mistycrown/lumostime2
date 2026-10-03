/**
 * @file tagStickerUtils.ts
 * @input Activity IDs, custom sticker metadata, and keyword sticker assignments.
 * @output Linked tag sticker groups and valid per-keyword sticker lookups.
 * @pos Shared tag calendar utility
 * @description Resolves only active stickers from groups associated with the current tag.
 * @updated 2026-10-02: Created for tag-specific keyword calendar stickers.
 */
import type { ActivityKeyword, CustomStickerRecord, CustomStickerSetRecord } from '../types';
import { buildCustomStickerViewSets, type CustomStickerViewItem, type CustomStickerViewSet } from '../services/customStickerAssetService';

export const getTagStickerSets = (
  activityId: string,
  sets: CustomStickerSetRecord[],
  stickers: CustomStickerRecord[]
): CustomStickerViewSet[] => buildCustomStickerViewSets(sets, stickers, { purpose: 'tag', includeEmptySets: true })
  .filter((set) => set.activityId === activityId);

export const getKeywordStickerMap = (
  keywords: ActivityKeyword[],
  sets: CustomStickerViewSet[]
): Map<string, CustomStickerViewItem> => {
  const stickersById = new Map(sets.flatMap((set) => set.stickers).map((sticker) => [sticker.id, sticker]));
  const result = new Map<string, CustomStickerViewItem>();
  keywords.forEach((keyword) => {
    const sticker = keyword.stickerId ? stickersById.get(keyword.stickerId) : undefined;
    if (sticker) result.set(keyword.label, sticker);
  });
  return result;
};
