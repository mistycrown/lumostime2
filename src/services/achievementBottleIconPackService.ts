/**
 * @file achievementBottleIconPackService.ts
 * @description Shared achievement bottle icon-pack metadata used by settings persistence, sponsorship controls, and bottle rendering.
 *
 * @updated 2026-04-06: Replaced invalid public asset imports with generated public URL paths shared by settings and bottle rendering.
 * @updated 2026-09-26: Added imported image-backed achievement-bottle icon packs.
 * @updated 2026-09-26: Persists user names, supports pack removal, and rehydrates custom packs after appearance restore.
 */

import { resolveAssetPath } from '../utils/assetPath';
import { imageService } from './imageService';

export type AchievementBottleIconPack = string;

export interface AchievementBottleIconPackOption {
  value: AchievementBottleIconPack;
  label: string;
  description: string;
  previewImageSrc?: string;
}

export const DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK: AchievementBottleIconPack = 'star1';
const ICON_PACK_FRAME_COUNTS: Record<AchievementBottleIconPack, number> = {
  candy: 16,
  coin: 13,
  flower1: 22,
  leaf: 16,
  paper: 16,
  planet: 19,
  sea: 16,
  star1: 18,
  stone: 16
};

const FALLBACK_ICON_PACKS: AchievementBottleIconPack[] = [
  'star1',
  'flower1',
  'sea',
  'coin',
  'candy',
  'leaf',
  'paper',
  'planet',
  'stone'
];
const CUSTOM_ICON_PACKS_KEY = 'lumostime_achievement_bottle_custom_icon_packs_v1';
export const ACHIEVEMENT_BOTTLE_CUSTOM_ICON_PACKS_KEY = CUSTOM_ICON_PACKS_KEY;
export const ACHIEVEMENT_BOTTLE_ICON_PACKS_CHANGED_EVENT = 'achievement-bottle-icon-packs-changed';
const customFramePaths: Record<string, string[]> = {};

interface StoredCustomIconPack {
  name: string;
  filenames: string[];
}

const readCustomIconPacks = (): Record<string, StoredCustomIconPack> => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_ICON_PACKS_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).flatMap(([id, value]) => {
      if (Array.isArray(value)) {
        return [[id, { name: toTitleCase(id), filenames: value.filter((item): item is string => typeof item === 'string') }]];
      }
      if (value && typeof value === 'object' && Array.isArray((value as StoredCustomIconPack).filenames)) {
        const pack = value as StoredCustomIconPack;
        return [[id, {
          name: typeof pack.name === 'string' && pack.name.trim() ? pack.name.trim() : toTitleCase(id),
          filenames: pack.filenames.filter((item): item is string => typeof item === 'string')
        }]];
      }
      return [];
    }));
  } catch {
    return {};
  }
};

const hydrateCustomIconPacks = async (): Promise<void> => {
  const stored = readCustomIconPacks();
  for (const [packId, pack] of Object.entries(stored)) {
    const paths = await Promise.all(pack.filenames.map((filename) => imageService.getImageUrl(filename).catch(() => '')));
    customFramePaths[packId] = paths.filter(Boolean);
  }
  refreshAchievementBottleIconPackOptions();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ACHIEVEMENT_BOTTLE_ICON_PACKS_CHANGED_EVENT));
  }
};

export const registerCustomAchievementBottleIconPack = async (
  packId: string,
  filenames: string[],
  name = toTitleCase(packId)
): Promise<void> => {
  if (filenames.length === 0) throw new Error('图标包至少需要一张图片');
  const stored = readCustomIconPacks();
  stored[packId] = { name: name.trim() || toTitleCase(packId), filenames };
  localStorage.setItem(CUSTOM_ICON_PACKS_KEY, JSON.stringify(stored));
  const paths = await Promise.all(filenames.map((filename) => imageService.getImageUrl(filename).catch(() => '')));
  customFramePaths[packId] = paths.filter(Boolean);
  refreshAchievementBottleIconPackOptions();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ACHIEVEMENT_BOTTLE_ICON_PACKS_CHANGED_EVENT));
  }
};

export const removeCustomAchievementBottleIconPack = (packId: string): boolean => {
  const stored = readCustomIconPacks();
  if (!Object.prototype.hasOwnProperty.call(stored, packId)) return false;
  delete stored[packId];
  localStorage.setItem(CUSTOM_ICON_PACKS_KEY, JSON.stringify(stored));
  delete customFramePaths[packId];
  refreshAchievementBottleIconPackOptions();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ACHIEVEMENT_BOTTLE_ICON_PACKS_CHANGED_EVENT));
  }
  return true;
};

const getAchievementBottleIconPackFrameFileName = (frameNumber: number): string => {
  return `${String(frameNumber).padStart(2, '0')}.webp`;
};

export const getAchievementBottleIconPackFramePath = (
  packName: AchievementBottleIconPack,
  frameNumber: number,
  baseUri?: string
): string => {
  return resolveAssetPath(`/stars/${packName}/${getAchievementBottleIconPackFrameFileName(frameNumber)}`, baseUri);
};

const ICON_PACK_META: Record<string, Omit<AchievementBottleIconPackOption, 'value'>> = {
  star1: {
    label: 'Star',
    description: 'Default star sprite pack.'
  },
  flower1: {
    label: 'Flower',
    description: 'Floral sprite pack with a softer look.'
  },
  sea: {
    label: 'Sea',
    description: 'Ocean-inspired sprite pack.'
  },
  coin: {
    label: 'Coin',
    description: 'Coin-style reward sprite pack.'
  },
  candy: {
    label: 'Candy',
    description: 'Candy-style reward sprite pack.'
  },
  leaf: {
    label: 'Leaf',
    description: 'Leaf-inspired sprite pack.'
  },
  paper: {
    label: 'Paper',
    description: 'Paper-cut style sprite pack.'
  },
  planet: {
    label: 'Planet',
    description: 'Planet-inspired sprite pack.'
  },
  stone: {
    label: 'Stone',
    description: 'Stone-textured sprite pack.'
  }
};

const toTitleCase = (value: string): string => {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const availableIconPacks = Array.from(new Set([
  ...FALLBACK_ICON_PACKS,
  ...Object.keys(ICON_PACK_META),
  ...Object.keys(ICON_PACK_FRAME_COUNTS)
]))
  .sort((first, second) => {
    if (first === DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK) return -1;
    if (second === DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK) return 1;
    return first.localeCompare(second, undefined, { numeric: true });
  });

export const getAchievementBottleIconPackFramePaths = (
  packName: AchievementBottleIconPack,
  baseUri?: string
): string[] => {
  if (customFramePaths[packName]) {
    return customFramePaths[packName];
  }

  const frameCount = ICON_PACK_FRAME_COUNTS[packName];

  if (!frameCount || frameCount < 1) {
    return [];
  }

  return Array.from({ length: frameCount }, (_, index) => {
    return getAchievementBottleIconPackFramePath(packName, index + 1, baseUri);
  });
};

const buildAchievementBottleIconPackOptions = (): AchievementBottleIconPackOption[] => {
  const customPacks = readCustomIconPacks();
  const packNames = [...availableIconPacks, ...Object.keys(customPacks).filter((id) => !availableIconPacks.includes(id))];
  return packNames.map((packName) => {
    const meta = ICON_PACK_META[packName];
    const customPack = customPacks[packName];
    const previewImageSrc = getAchievementBottleIconPackFramePaths(packName)[0]
      || getAchievementBottleIconPackFramePath(packName, 1);

    return {
      value: packName,
      label: customPack?.name || meta?.label || toTitleCase(packName),
      description: meta?.description || (customPack ? 'Custom achievement bottle icon pack.' : `${packName} sprite pack.`),
      previewImageSrc
    };
  });
};

export const ACHIEVEMENT_BOTTLE_ICON_PACK_OPTIONS: AchievementBottleIconPackOption[] = buildAchievementBottleIconPackOptions();

const refreshAchievementBottleIconPackOptions = (): void => {
  ACHIEVEMENT_BOTTLE_ICON_PACK_OPTIONS.splice(0, ACHIEVEMENT_BOTTLE_ICON_PACK_OPTIONS.length, ...buildAchievementBottleIconPackOptions());
};

if (typeof window !== 'undefined') {
  window.addEventListener('lumostime:appearance-restored', () => void hydrateCustomIconPacks());
}

void hydrateCustomIconPacks();

export const isAchievementBottleIconPack = (
  value: string | null | undefined
): value is AchievementBottleIconPack => {
  if (!value) return false;
  return ACHIEVEMENT_BOTTLE_ICON_PACK_OPTIONS.some((option) => option.value === value)
    || Object.prototype.hasOwnProperty.call(readCustomIconPacks(), value);
};

export const getAchievementBottleIconPackOption = (
  pack: AchievementBottleIconPack
): AchievementBottleIconPackOption => {
  return ACHIEVEMENT_BOTTLE_ICON_PACK_OPTIONS.find((option) => option.value === pack)
    || ACHIEVEMENT_BOTTLE_ICON_PACK_OPTIONS[0]
    || {
      value: DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK,
      label: 'Star',
      description: 'Default star sprite pack.',
      previewImageSrc: getAchievementBottleIconPackFramePaths(DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK)[0]
        || getAchievementBottleIconPackFramePath(DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK, 1)
    };
};
