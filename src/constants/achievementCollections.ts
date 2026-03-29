/**
 * @file achievementCollections.ts
 * @input Static bottle assets stored under public/bottle
 * @output Default achievement collection catalog metadata used by the achievement collection tab
 * @pos Constant (Achievement Collections)
 * @description Provides the default collectible bottle catalog for the achievement ledger collection tab.
 *
 * @updated 2026-03-29: Replaced placeholder bottle names with curated names and descriptions for all 16 bundled collectibles.
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
    name: '缤纷彩糖瓶',
    description: '装满彩色包装糖果和水果硬糖的圆肚小瓶。'
  },
  {
    assetId: '02',
    name: '岁月留香瓶',
    description: '装着干枯玫瑰和花瓣的复古带塞小瓶，带有手工香丸般的古典气息。'
  },
  {
    assetId: '03',
    name: '摘星许愿瓶',
    description: '散发着温暖光芒，装满小星星的方形玻璃瓶，带着占星与祈愿的氛围。'
  },
  {
    assetId: '04',
    name: '魔法微光瓶',
    description: '装满细碎闪烁珠光色彩的小颗粒，像把柔和魔法收进了细长瓶身。'
  },
  {
    assetId: '05',
    name: '小熊软糖罐',
    description: '装着五颜六色经典小熊软糖的广口密封罐。'
  },
  {
    assetId: '06',
    name: '微观多肉瓶',
    description: '层层叠叠种着多肉植物的细长生态柱。'
  },
  {
    assetId: '07',
    name: '夏日星砂瓶',
    description: '装着彩虹色分层沙子和海贝壳的软木塞瓶。'
  },
  {
    assetId: '08',
    name: '星月夜明瓶',
    description: '装着发光弯月和群星的心形瓶，像收藏了一段宁静夜色。'
  },
  {
    assetId: '09',
    name: '彩虹豆豆瓶',
    description: '装满彩色巧克力豆的矮胖玻璃瓶。'
  },
  {
    assetId: '10',
    name: '萤火之森瓶',
    description: '装着飞舞萤火虫的钟形瓶，暗夜里透出温柔微光。'
  },
  {
    assetId: '11',
    name: '复古纽扣瓶',
    description: '装满各种颜色四孔小纽扣的瓶子，带着手作与编织的温度。'
  },
  {
    assetId: '12',
    name: '时光信笺瓶',
    description: '装满彩色卷轴、信纸和笑脸小纸条的瓶子，像收纳被记录下来的灵感。'
  },
  {
    assetId: '13',
    name: '幸运四叶草瓶',
    description: '瓶口系着质朴麻绳，里面装满了绿色四叶草。'
  },
  {
    assetId: '14',
    name: '绒绒毛球瓶',
    description: '装着马卡龙色系毛茸茸小球的多边形玻璃瓶。'
  },
  {
    assetId: '15',
    name: '绿意微景罐',
    description: '装着多肉、迷你绿植和造景小石头的圆形生态瓶。'
  },
  {
    assetId: '16',
    name: '水果方糖罐',
    description: '装着五颜六色方形软糖或水果块的广口罐。'
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
