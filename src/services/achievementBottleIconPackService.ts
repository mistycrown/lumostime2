/**
 * @file achievementBottleIconPackService.ts
 * @description Shared achievement bottle icon-pack metadata used by settings persistence, sponsorship controls, and bottle rendering.
 *
 * @updated 2026-04-06: Replaced invalid public asset imports with generated public URL paths shared by settings and bottle rendering.
 * @updated 2026-09-26: Added imported image-backed achievement-bottle icon packs.
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

const readCustomIconPacks = (): Record<string, string[]> => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_ICON_PACKS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const hydrateCustomIconPacks = async (): Promise<void> => {
  const stored = readCustomIconPacks();
  for (const [packId, filenames] of Object.entries(stored)) {
    const paths = await Promise.all(filenames.map((filename) => imageService.getImageUrl(filename).catch(() => '')));
    customFramePaths[packId] = paths.filter(Boolean);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ACHIEVEMENT_BOTTLE_ICON_PACKS_CHANGED_EVENT));
  }
};

void hydrateCustomIconPacks();

export const registerCustomAchievementBottleIconPack = async (
  packId: string,
  filenames: string[]
): Promise<void> => {
  const stored = readCustomIconPacks();
  stored[packId] = filenames;
  localStorage.setItem(CUSTOM_ICON_PACKS_KEY, JSON.stringify(stored));
  const paths = await Promise.all(filenames.map((filename) => imageService.getImageUrl(filename).catch(() => '')));
  customFramePaths[packId] = paths.filter(Boolean);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ACHIEVEMENT_BOTTLE_ICON_PACKS_CHANGED_EVENT));
  }
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

export const ACHIEVEMENT_BOTTLE_ICON_PACK_OPTIONS: AchievementBottleIconPackOption[] = availableIconPacks.map((packName) => {
  const meta = ICON_PACK_META[packName];
  const previewImageSrc = getAchievementBottleIconPackFramePaths(packName)[0]
    || getAchievementBottleIconPackFramePath(packName, 1);

  return {
    value: packName,
    label: meta?.label || toTitleCase(packName),
    description: meta?.description || `${packName} sprite pack.`,
    previewImageSrc
  };
});

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
