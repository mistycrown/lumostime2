/**
 * @file stickerSelectorLayoutService.ts
 * @input Persisted sticker selector layout configuration and runtime sticker sets
 * @output Normalized large-group configuration and resolved picker groups
 * @pos Service (Sticker Selector)
 * @description Keeps the new sticker selector layout independent from the legacy page-based picker.
 */

import { StickerSet } from './stickerService';

export interface StickerSelectorGroup {
  id: string;
  name: string;
  sourceSetIds: string[];
}

export interface StickerSelectorConfig {
  enabled: boolean;
  groups: StickerSelectorGroup[];
}

export interface ResolvedStickerSelectorGroup extends StickerSelectorGroup {
  stickers: StickerSet['stickers'];
  sourceSets: StickerSet[];
}

export const DEFAULT_STICKER_SELECTOR_CONFIG: StickerSelectorConfig = {
  enabled: false,
  groups: []
};

export const buildDefaultStickerSelectorGroups = (): StickerSelectorGroup[] => ([
  {
    id: 'sticker-group-watercolor',
    name: '水彩',
    sourceSetIds: ['water1', 'water2', 'water3']
  }
]);

const normalizeGroup = (value: unknown, index: number): StickerSelectorGroup | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<StickerSelectorGroup>;
  const sourceSetIds = Array.isArray(candidate.sourceSetIds)
    ? candidate.sourceSetIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : [];

  if (sourceSetIds.length === 0) {
    return null;
  }

  return {
    id: typeof candidate.id === 'string' && candidate.id.trim().length > 0
      ? candidate.id
      : `sticker-group-${index + 1}`,
    name: typeof candidate.name === 'string' && candidate.name.trim().length > 0
      ? candidate.name.trim()
      : `Sticker ${index + 1}`,
    sourceSetIds: Array.from(new Set(sourceSetIds))
  };
};

export const normalizeStickerSelectorConfig = (value: unknown): StickerSelectorConfig => {
  if (!value || typeof value !== 'object') {
    return DEFAULT_STICKER_SELECTOR_CONFIG;
  }

  const candidate = value as Partial<StickerSelectorConfig>;
  const groups = Array.isArray(candidate.groups)
    ? candidate.groups.map(normalizeGroup).filter((group): group is StickerSelectorGroup => group !== null)
    : [];

  return {
    enabled: candidate.enabled === true,
    groups
  };
};

export const resolveStickerSelectorGroups = (
  config: StickerSelectorConfig,
  stickerSets: StickerSet[]
): ResolvedStickerSelectorGroup[] => {
  const stickerSetsById = new Map(stickerSets.map((set) => [set.id, set]));
  const assignedSetIds = new Set<string>();
  const resolvedGroups: ResolvedStickerSelectorGroup[] = [];

  config.groups.forEach((group) => {
    const sourceSets = group.sourceSetIds
      .map((setId) => stickerSetsById.get(setId))
      .filter((set): set is StickerSet => Boolean(set) && !assignedSetIds.has(set.id));

    if (sourceSets.length === 0) {
      return;
    }

    sourceSets.forEach((set) => assignedSetIds.add(set.id));
    resolvedGroups.push({
      ...group,
      sourceSetIds: sourceSets.map((set) => set.id),
      sourceSets,
      stickers: sourceSets.flatMap((set) => set.stickers)
    });
  });

  stickerSets.forEach((set) => {
    if (assignedSetIds.has(set.id)) {
      return;
    }

    resolvedGroups.push({
      id: `sticker-single-${set.id}`,
      name: set.name,
      sourceSetIds: [set.id],
      sourceSets: [set],
      stickers: set.stickers
    });
  });

  return resolvedGroups;
};
