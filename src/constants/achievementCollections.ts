/**
 * @file achievementCollections.ts
 * @input Static bottle assets stored under public/bottle
 * @output Default achievement collection catalog metadata used by the achievement collection tab
 * @pos Constant (Achievement Collections)
 * @description Provides the default collectible bottle catalog for the achievement ledger collection tab.
 *
 * @updated 2026-04-06: Renamed the bundled 16 bottle presets to match the refreshed bottle artwork set.
 */
import { AchievementCollection } from '../types';

export const DEFAULT_ACHIEVEMENT_COLLECTION_COST = 200;

interface DefaultAchievementCollectionDefinition {
  assetId: string;
  name: string;
  description: string;
}

const DEFAULT_ACHIEVEMENT_COLLECTION_DEFINITIONS: DefaultAchievementCollectionDefinition[] = [
  {
    assetId: '01',
    name: '小熊糖果罐',
    description: '装着彩色小熊软糖的高罐，像把童年的甜味整齐封进了玻璃里。'
  },
  {
    assetId: '02',
    name: '蓝珠标本瓶',
    description: '三颗蓝色玻璃珠静静叠放，像被封存起来的清凉海潮。'
  },
  {
    assetId: '03',
    name: '金砂许愿瓶',
    description: '细闪金砂落在小小玻璃瓶里，像一枚可以握住的微光愿望。'
  },
  {
    assetId: '04',
    name: '柑橘切片瓶',
    description: '糖渍橘片和果香被层层叠进瓶里，带着明亮又温暖的夏日气味。'
  },
  {
    assetId: '05',
    name: '金花花瓣瓶',
    description: '蓬松的金色花瓣被收进圆腹瓶中，像一束不会褪色的小太阳。'
  },
  {
    assetId: '06',
    name: '彩糖圆球瓶',
    description: '饱满的彩色糖球把圆瓶塞得满满当当，看起来像一整瓶开心。'
  },
  {
    assetId: '07',
    name: '星光锥瓶',
    description: '亮亮的小星星漂浮在锥形瓶里，像被收拢的一捧夜空。'
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
    name: '纸卷细瓶',
    description: '窄长的小瓶里收着卷起的纸条，像一支等待展开的秘密注脚。'
  },
  {
    assetId: '15',
    name: '紫瓣香氛罐',
    description: '紫色花瓣堆在小圆罐里，像把轻柔香气和黄昏一起拧上了盖子。'
  },
  {
    assetId: '16',
    name: '珍珠泡泡瓶',
    description: '圆腹瓶里堆着粉蓝白的珠球，像一整瓶柔软又轻快的泡泡。'
  }
];

export const DEFAULT_ACHIEVEMENT_COLLECTION_IMAGE_PATHS = DEFAULT_ACHIEVEMENT_COLLECTION_DEFINITIONS.map(({ assetId }) => (
  `/bottle/${assetId}.png`
));

const DEFAULT_ACHIEVEMENT_COLLECTION_PRESET_BY_ID = DEFAULT_ACHIEVEMENT_COLLECTION_DEFINITIONS.reduce<Record<string, DefaultAchievementCollectionDefinition>>((accumulator, definition) => {
  accumulator[`default-bottle-${definition.assetId}`] = definition;
  return accumulator;
}, {});

export const getDefaultAchievementCollectionPreset = (collectionId: string) => {
  const preset = DEFAULT_ACHIEVEMENT_COLLECTION_PRESET_BY_ID[collectionId];
  if (!preset) {
    return null;
  }

  return {
    ...preset,
    imagePath: `/bottle/${preset.assetId}.png`
  };
};

const DEFAULT_COLLECTION_TIMESTAMP = Date.UTC(2026, 2, 28, 12, 0, 0, 0);

export const DEFAULT_ACHIEVEMENT_COLLECTIONS: AchievementCollection[] = DEFAULT_ACHIEVEMENT_COLLECTION_DEFINITIONS.map((definition, index) => {
  const timestamp = DEFAULT_COLLECTION_TIMESTAMP + index;

  return {
    id: `default-bottle-${definition.assetId}`,
    name: definition.name,
    cost: DEFAULT_ACHIEVEMENT_COLLECTION_COST,
    imagePath: `/bottle/${definition.assetId}.png`,
    description: definition.description,
    enabled: true,
    createdAt: timestamp,
    updatedAt: timestamp
  };
});
