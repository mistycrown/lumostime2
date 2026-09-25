import { describe, expect, test } from 'vitest';
import { StickerSet } from './stickerService';
import {
  buildDefaultStickerSelectorGroups,
  normalizeStickerSelectorConfig,
  resolveStickerSelectorGroups
} from './stickerSelectorLayoutService';

const makeSet = (id: string, count = 2): StickerSet => ({
  id,
  name: id,
  isCustom: false,
  stickers: Array.from({ length: count }, (_, index) => ({ path: `/${id}/${index + 1}` }))
});

describe('stickerSelectorLayoutService', () => {
  test('creates the default watercolor merge', () => {
    expect(buildDefaultStickerSelectorGroups()).toEqual([
      {
        id: 'sticker-group-watercolor',
        name: '水彩',
        sourceSetIds: ['water1', 'water2', 'water3']
      }
    ]);
  });

  test('normalizes invalid groups and removes duplicate source ids', () => {
    expect(normalizeStickerSelectorConfig({
      enabled: true,
      groups: [{ id: 'g1', name: 'Merged', sourceSetIds: ['a', 'a', 1] }]
    })).toEqual({
      enabled: true,
      groups: [{ id: 'g1', name: 'Merged', sourceSetIds: ['a'] }]
    });
  });

  test('flattens merged stickers and keeps unassigned sets as single groups', () => {
    const result = resolveStickerSelectorGroups({
      enabled: true,
      groups: [{ id: 'merged', name: 'Merged', sourceSetIds: ['a', 'b'] }]
    }, [makeSet('a'), makeSet('b'), makeSet('c')]);

    expect(result.map((group) => group.id)).toEqual(['merged', 'sticker-single-c']);
    expect(result[0].stickers).toHaveLength(4);
    expect(result[1].sourceSetIds).toEqual(['c']);
  });
});
