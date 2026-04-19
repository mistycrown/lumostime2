import { describe, expect, test } from 'vitest';
import { normalizeCustomStickerState } from './customStickerAssetService';
import { CustomStickerRecord, CustomStickerSetRecord } from '../types';

describe('normalizeCustomStickerState', () => {
  test('reassigns duplicate and out-of-range slot indices into free positions', () => {
    const customStickerSets: CustomStickerSetRecord[] = [
      {
        id: 'set-1',
        name: 'Set 1',
        stickerIds: ['s1', 's2', 's3'],
        status: 'active',
        createdAt: 1,
        updatedAt: 1
      }
    ];
    const customStickers: CustomStickerRecord[] = [
      {
        id: 's1',
        setId: 'set-1',
        imageFilename: 'a.png',
        sortOrder: 0,
        status: 'active',
        createdAt: 1,
        updatedAt: 1
      },
      {
        id: 's2',
        setId: 'set-1',
        imageFilename: 'b.png',
        sortOrder: 16,
        status: 'active',
        createdAt: 2,
        updatedAt: 2
      },
      {
        id: 's3',
        setId: 'set-1',
        imageFilename: 'c.png',
        sortOrder: 0,
        status: 'active',
        createdAt: 3,
        updatedAt: 3
      }
    ];

    const result = normalizeCustomStickerState(customStickerSets, customStickers);

    expect(result.customStickers.map((sticker) => [sticker.id, sticker.sortOrder])).toEqual([
      ['s1', 0],
      ['s3', 1],
      ['s2', 2]
    ]);
    expect(result.customStickerSets[0].stickerIds).toEqual(['s1', 's3', 's2']);
  });

  test('recovers archived records and drops orphan stickers', () => {
    const customStickerSets: CustomStickerSetRecord[] = [
      {
        id: 'set-1',
        name: 'Archived Set',
        stickerIds: [],
        status: 'archived',
        createdAt: 1,
        updatedAt: 1
      }
    ];
    const customStickers: CustomStickerRecord[] = [
      {
        id: 's1',
        setId: 'set-1',
        imageFilename: 'archived.png',
        sortOrder: 5,
        status: 'archived',
        createdAt: 1,
        updatedAt: 1
      },
      {
        id: 'orphan',
        setId: 'missing',
        imageFilename: 'orphan.png',
        sortOrder: 0,
        status: 'active',
        createdAt: 2,
        updatedAt: 2
      }
    ];

    const result = normalizeCustomStickerState(customStickerSets, customStickers);

    expect(result.customStickerSets).toHaveLength(1);
    expect(result.customStickerSets[0].status).toBe('active');
    expect(result.customStickerSets[0].stickerIds).toEqual(['s1']);
    expect(result.customStickers).toHaveLength(1);
    expect(result.customStickers[0].status).toBe('active');
    expect(result.customStickers[0].thumbnailFilename).toBe('thumb_archived.png');
  });
});
