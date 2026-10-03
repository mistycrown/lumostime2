/**
 * @file tagStickerUtils.test.ts
 * @input Linked, unlinked, archived, legacy, and reassigned sticker groups.
 * @output Regression coverage for tag isolation, asset protection, and keyword mappings.
 * @pos Utility test
 * @description Verifies tag sticker assignments survive attribute renames and safely fall back after removal or reassignment.
 * @updated 2026-10-02: Created for tag sticker calendars.
 */
import { describe, expect, it } from 'vitest';
import type { ActivityKeyword, CustomStickerRecord, CustomStickerSetRecord } from '../types';
import { buildCustomStickerViewSets, collectCustomStickerReferencedImages, normalizeCustomStickerState } from '../services/customStickerAssetService';
import { syncActivityKeywordsWithAttribute } from './detailTimelineKeywordUtils';
import { getKeywordStickerMap, getTagStickerSets } from './tagStickerUtils';

const makeSet = (id: string, options: Partial<CustomStickerSetRecord> = {}): CustomStickerSetRecord => ({
  id, name: id, stickerIds: [], status: 'active', createdAt: 1, updatedAt: 1, ...options
});
const makeSticker = (id: string, setId: string, options: Partial<CustomStickerRecord> = {}): CustomStickerRecord => ({
  id, setId, imageFilename: `${id}.png`, sortOrder: 0, status: 'active', createdAt: 1, updatedAt: 1, ...options
});
const sets = [
  makeSet('legacy'),
  makeSet('fitness', { purpose: 'tag', activityId: 'gym' }),
  makeSet('reading', { purpose: 'tag', activityId: 'books' }),
  makeSet('unlinked', { purpose: 'tag' }),
  makeSet('empty', { purpose: 'tag', activityId: 'gym' }),
  makeSet('archived', { purpose: 'tag', activityId: 'gym', status: 'archived' })
];
const stickers = [
  makeSticker('mood', 'legacy'), makeSticker('chest', 'fitness'), makeSticker('back', 'fitness', { sortOrder: 1 }),
  makeSticker('book', 'reading'), makeSticker('old', 'fitness', { status: 'archived', sortOrder: 2 })
];

describe('tag sticker calendars', () => {
  it('keeps legacy mood groups in the general picker and excludes tag groups', () => {
    expect(buildCustomStickerViewSets(sets, stickers).map((set) => set.id)).toEqual(['legacy']);
  });

  it('returns only active groups linked to the current tag, including empty groups', () => {
    const result = getTagStickerSets('gym', sets, stickers);
    expect(result.map((set) => set.id)).toEqual(['fitness', 'empty']);
    expect(result[0].stickers.map((sticker) => sticker.id)).toEqual(['chest', 'back']);
    expect(getTagStickerSets('unknown', sets, stickers)).toEqual([]);
  });

  it('resolves selected stickers and rejects missing, archived, and other-tag assignments', () => {
    const keywords: ActivityKeyword[] = [
      { label: 'Chest', source: 'manual', stickerId: 'chest' },
      { label: 'Back', source: 'manual', stickerId: 'back' },
      { label: 'Other tag', source: 'manual', stickerId: 'book' },
      { label: 'Archived', source: 'manual', stickerId: 'old' },
      { label: 'Missing', source: 'manual', stickerId: 'deleted' },
      { label: 'Color', source: 'manual', color: '#123456' }
    ];
    expect(Array.from(getKeywordStickerMap(keywords, getTagStickerSets('gym', sets, stickers)).keys())).toEqual(['Chest', 'Back']);
  });

  it('invalidates assignments when a group is reassigned or its sticker is removed', () => {
    const keywords: ActivityKeyword[] = [{ label: 'Chest', source: 'manual', stickerId: 'chest' }];
    const reassigned = sets.map((set) => set.id === 'fitness' ? { ...set, activityId: 'books' } : set);
    expect(getKeywordStickerMap(keywords, getTagStickerSets('gym', reassigned, stickers)).size).toBe(0);
    expect(getKeywordStickerMap(keywords, getTagStickerSets('gym', sets, stickers.filter((sticker) => sticker.id !== 'chest'))).size).toBe(0);
  });

  it('preserves group associations during storage normalization and protects tag image assets', () => {
    const normalized = normalizeCustomStickerState([sets[1]], [stickers[1]]);
    expect(normalized.customStickerSets[0]).toMatchObject({ purpose: 'tag', activityId: 'gym' });
    expect(Array.from(collectCustomStickerReferencedImages([], normalized.customStickerSets, normalized.customStickers))).toEqual(['chest.png', 'thumb_chest.png']);
  });

  it('preserves the sticker and color when an attribute option is renamed', () => {
    const keywords: ActivityKeyword[] = [{ label: 'Chest', source: 'attribute', attributeId: 'parts', optionId: 'chest', stickerId: 'chest', color: '#123456' }];
    const result = syncActivityKeywordsWithAttribute(keywords, [{
      id: 'parts', name: 'Parts', type: 'multi', isKeywordSource: true, order: 0, createdAt: 1, updatedAt: 1,
      options: [{ id: 'chest', label: 'Upper chest' }]
    }]);
    expect(result[0]).toMatchObject({ label: 'Upper chest', stickerId: 'chest', color: '#123456' });
  });
});
