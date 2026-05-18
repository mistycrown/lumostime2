/**
 * @file achievementCollections.ts
 * @input Static bottle assets stored under public/bottle
 * @output Default achievement collection catalog metadata used by the achievement collection tab
 * @pos Constant (Achievement Collections)
 * @description Provides the default collectible bottle catalog for the achievement ledger collection tab.
 *
 * @updated 2026-05-18: Added default-bottle preset lookup by id, preset name, and stale bottle asset URLs so Electron can repair outdated desktop image paths.
 * @updated 2026-04-07: Resolve bottle image paths through the shared asset-path helper so Electron desktop builds can load bundled bottle images.
 */
import { AchievementCollection } from '../types';
import { resolveAssetPath } from '../utils/assetPath';

export const DEFAULT_ACHIEVEMENT_COLLECTION_COST = 200;
const DEFAULT_ACHIEVEMENT_COLLECTION_ID_PATTERN = /^default-bottle-(\d{2})$/i;
const DEFAULT_ACHIEVEMENT_COLLECTION_IMAGE_PATH_PATTERN = /(?:^|[\\/])bottle[\\/](\d{2})\.png(?:$|[?#])/i;

export const resolveAchievementCollectionImagePath = (imagePath: string, baseUri?: string): string => {
  return resolveAssetPath(imagePath, baseUri);
};

interface DefaultAchievementCollectionDefinition {
  assetId: string;
  name: string;
  description: string;
}

export interface DefaultAchievementCollectionPreset extends DefaultAchievementCollectionDefinition {
  imagePath: string;
}

const DEFAULT_ACHIEVEMENT_COLLECTION_DEFINITIONS: DefaultAchievementCollectionDefinition[] = [
  {
    assetId: '01',
    name: '小熊糖果罐',
    description: '装着彩色小熊软糖的高罐子，像把童年的甜味整齐地封进了玻璃里。'
  },
  {
    assetId: '02',
    name: '蓝珠标本瓶',
    description: '三颗蓝色玻璃珠安静叠放，像被封存起来的清凉海潮。'
  },
  {
    assetId: '03',
    name: '金沙许愿瓶',
    description: '细闪金砂落在小小玻璃瓶里，像一枚可以握住的微光愿望。'
  },
  {
    assetId: '04',
    name: '柑橘切片瓶',
    description: '糖渍橙片和果香被层层叠进瓶里，带着明亮又温暖的夏日气味。'
  },
  {
    assetId: '05',
    name: '金花花瓣瓶',
    description: '蓬松的金色花瓣被收进圆肚玻璃瓶中，像一束不会褪色的小太阳。'
  },
  {
    assetId: '06',
    name: '彩糖圆球瓶',
    description: '饱满的彩色糖球把圆瓶塞得满满当当，看起来像一整瓶开心。'
  },
  {
    assetId: '07',
    name: '星光钥匙瓶',
    description: '亮晶晶的小星星漂浮在钥匙形瓶里，像被收藏的一捧夜空。'
  },
  {
    assetId: '08',
    name: '樱花花瓣罐',
    description: '粉色花瓣轻轻叠放在方形玻璃罐里，像把一小段春天的樱色留了下来。'
  },
  {
    assetId: '09',
    name: '薰衣草瓶',
    description: '细长瓶里插着一束安静的薰衣草，像把傍晚的香气也一起留住。'
  },
  {
    assetId: '10',
    name: '青柠切片瓶',
    description: '一片片青柠整齐排开，瓶子里像装着清爽的薄荷汽水。'
  },
  {
    assetId: '11',
    name: '黄玫瑰花瓣瓶',
    description: '浅金黄色的花瓣安静盛在透明方杯里，像一束被封存下来的黄玫瑰余香。'
  },
  {
    assetId: '12',
    name: '心愿漂流瓶',
    description: '心形糖片和柔软粉色被收进吊环玻璃瓶，像一封没有寄出的心事。'
  },
  {
    assetId: '13',
    name: '星月玻璃杯',
    description: '把手杯里浮着月亮和星星，像深夜里一杯微微发光的牛奶。'
  },
  {
    assetId: '14',
    name: '尤加利标本瓶',
    description: '透明细瓶里留着一枝淡绿色叶片，像把安静生长的一点清新封存在光里。'
  },
  {
    assetId: '15',
    name: '紫瓣香氛罐',
    description: '紫色花瓣堆在小圆罐里，像把轻柔香气和黄昏一起拢上了盖子。'
  },
  {
    assetId: '16',
    name: '珍珠泡泡瓶',
    description: '圆肚瓶里堆着粉蓝白的珠球，像一整瓶柔软又轻快的泡泡。'
  }
];

export const DEFAULT_ACHIEVEMENT_COLLECTION_IMAGE_PATHS = DEFAULT_ACHIEVEMENT_COLLECTION_DEFINITIONS.map(({ assetId }) => (
  resolveAchievementCollectionImagePath(`/bottle/${assetId}.png`)
));

const DEFAULT_ACHIEVEMENT_COLLECTION_PRESET_BY_ID = DEFAULT_ACHIEVEMENT_COLLECTION_DEFINITIONS.reduce<Record<string, DefaultAchievementCollectionDefinition>>((accumulator, definition) => {
  accumulator[`default-bottle-${definition.assetId}`] = definition;
  return accumulator;
}, {});

const DEFAULT_ACHIEVEMENT_COLLECTION_PRESET_BY_NAME = DEFAULT_ACHIEVEMENT_COLLECTION_DEFINITIONS.reduce<Record<string, DefaultAchievementCollectionDefinition>>((accumulator, definition) => {
  accumulator[definition.name] = definition;
  return accumulator;
}, {});

const buildDefaultAchievementCollectionPreset = (
  definition: DefaultAchievementCollectionDefinition,
  baseUri?: string
): DefaultAchievementCollectionPreset => ({
  ...definition,
  imagePath: resolveAchievementCollectionImagePath(`/bottle/${definition.assetId}.png`, baseUri)
});

const getDefaultAchievementCollectionAssetIdFromCollectionId = (
  collectionId?: string | null
): string | null => {
  if (!collectionId) {
    return null;
  }

  const match = collectionId.match(DEFAULT_ACHIEVEMENT_COLLECTION_ID_PATTERN);
  return match?.[1] || null;
};

export const getDefaultAchievementCollectionAssetIdFromImagePath = (
  imagePath?: string | null
): string | null => {
  if (!imagePath) {
    return null;
  }

  const match = imagePath.trim().match(DEFAULT_ACHIEVEMENT_COLLECTION_IMAGE_PATH_PATTERN);
  return match?.[1] || null;
};

export const getDefaultAchievementCollectionPresetByAssetId = (
  assetId: string,
  baseUri?: string
): DefaultAchievementCollectionPreset | null => {
  const definition = DEFAULT_ACHIEVEMENT_COLLECTION_DEFINITIONS.find((item) => item.assetId === assetId);
  return definition ? buildDefaultAchievementCollectionPreset(definition, baseUri) : null;
};

export const getDefaultAchievementCollectionPreset = (
  collectionId: string,
  baseUri?: string
): DefaultAchievementCollectionPreset | null => {
  const preset = DEFAULT_ACHIEVEMENT_COLLECTION_PRESET_BY_ID[collectionId];
  if (!preset) {
    return null;
  }

  return buildDefaultAchievementCollectionPreset(preset, baseUri);
};

export const getDefaultAchievementCollectionPresetFromReference = (
  reference: {
    collectionId?: string | null;
    imagePath?: string | null;
    name?: string | null;
  },
  baseUri?: string
): DefaultAchievementCollectionPreset | null => {
  const assetIdFromCollectionId = getDefaultAchievementCollectionAssetIdFromCollectionId(reference.collectionId);
  if (assetIdFromCollectionId) {
    return getDefaultAchievementCollectionPresetByAssetId(assetIdFromCollectionId, baseUri);
  }

  const assetIdFromImagePath = getDefaultAchievementCollectionAssetIdFromImagePath(reference.imagePath);
  if (assetIdFromImagePath) {
    return getDefaultAchievementCollectionPresetByAssetId(assetIdFromImagePath, baseUri);
  }

  const definition = reference.name
    ? DEFAULT_ACHIEVEMENT_COLLECTION_PRESET_BY_NAME[reference.name]
    : undefined;
  return definition ? buildDefaultAchievementCollectionPreset(definition, baseUri) : null;
};

export const repairAchievementCollectionImagePath = (
  reference: {
    collectionId?: string | null;
    imagePath?: string | null;
    name?: string | null;
  },
  baseUri?: string
): string | undefined => {
  const preset = getDefaultAchievementCollectionPresetFromReference(reference, baseUri);
  if (preset) {
    return preset.imagePath;
  }

  const imagePath = reference.imagePath?.trim();
  return imagePath ? resolveAchievementCollectionImagePath(imagePath, baseUri) : undefined;
};

const DEFAULT_COLLECTION_TIMESTAMP = Date.UTC(2026, 2, 28, 12, 0, 0, 0);

export const DEFAULT_ACHIEVEMENT_COLLECTIONS: AchievementCollection[] = DEFAULT_ACHIEVEMENT_COLLECTION_DEFINITIONS.map((definition, index) => {
  const timestamp = DEFAULT_COLLECTION_TIMESTAMP + index;

  return {
    id: `default-bottle-${definition.assetId}`,
    name: definition.name,
    cost: DEFAULT_ACHIEVEMENT_COLLECTION_COST,
    imagePath: resolveAchievementCollectionImagePath(`/bottle/${definition.assetId}.png`),
    description: definition.description,
    enabled: true,
    createdAt: timestamp,
    updatedAt: timestamp
  };
});
