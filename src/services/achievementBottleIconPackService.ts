/**
 * @file achievementBottleIconPackService.ts
 * @description Shared achievement bottle icon-pack metadata used by settings persistence, sponsorship controls, and bottle rendering.
 *
 * @updated 2026-03-28: Auto-discovers bundled icon packs from public/stars so newly added sprite folders appear in settings automatically.
 */

export type AchievementBottleIconPack = string;

export interface AchievementBottleIconPackOption {
  value: AchievementBottleIconPack;
  label: string;
  description: string;
}

export const DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK: AchievementBottleIconPack = 'star1';
const FALLBACK_ICON_PACKS: AchievementBottleIconPack[] = ['star1', 'flower1', 'sea', 'coin', 'candy'];

const ICON_PACK_FILE_PATHS = Object.keys(import.meta.glob('../../../public/stars/*/*.{png,jpg,jpeg,webp,svg}'));

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

const discoveredIconPacks = Array.from(new Set(
  ICON_PACK_FILE_PATHS
    .map((filePath) => filePath.split('/').at(-2))
    .filter((packName): packName is string => Boolean(packName))
))
  .sort((first, second) => {
    if (first === DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK) return -1;
    if (second === DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK) return 1;
    return first.localeCompare(second, undefined, { numeric: true });
  });

const availableIconPacks = discoveredIconPacks.length > 0 ? discoveredIconPacks : FALLBACK_ICON_PACKS;

export const ACHIEVEMENT_BOTTLE_ICON_PACK_OPTIONS: AchievementBottleIconPackOption[] = availableIconPacks.map((packName) => {
  const meta = ICON_PACK_META[packName];

  return {
    value: packName,
    label: meta?.label || toTitleCase(packName),
    description: meta?.description || `${packName} sprite pack.`
  };
});

export const isAchievementBottleIconPack = (
  value: string | null | undefined
): value is AchievementBottleIconPack => {
  return ACHIEVEMENT_BOTTLE_ICON_PACK_OPTIONS.some((option) => option.value === value);
};

export const getAchievementBottleIconPackOption = (
  pack: AchievementBottleIconPack
): AchievementBottleIconPackOption => {
  return ACHIEVEMENT_BOTTLE_ICON_PACK_OPTIONS.find((option) => option.value === pack)
    || ACHIEVEMENT_BOTTLE_ICON_PACK_OPTIONS[0]
    || {
      value: DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK,
      label: 'Star',
      description: 'Default star sprite pack.'
    };
};
