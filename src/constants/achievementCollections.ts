/**
 * @file achievementCollections.ts
 * @input Static bottle assets stored under public/bottle
 * @output Default achievement collection catalog metadata used by the achievement collection tab
 * @pos Constant (Achievement Collections)
 * @description Provides the default collectible bottle catalog for the achievement ledger collection tab.
 *
 * @updated 2026-03-28: Added the first 16 bottle collectibles sourced from public/bottle with a default price of 500 stars.
 */
import { AchievementCollection } from '../types';

export const DEFAULT_ACHIEVEMENT_COLLECTION_COST = 200;

export const DEFAULT_ACHIEVEMENT_COLLECTION_IMAGE_PATHS = Array.from({ length: 16 }, (_, index) => {
  const assetId = String(index + 1).padStart(2, '0');
  return `/bottle/${assetId}.png`;
});

const DEFAULT_COLLECTION_TIMESTAMP = Date.UTC(2026, 2, 28, 12, 0, 0, 0);

export const DEFAULT_ACHIEVEMENT_COLLECTIONS: AchievementCollection[] = DEFAULT_ACHIEVEMENT_COLLECTION_IMAGE_PATHS.map((imagePath, index) => {
  const assetId = String(index + 1).padStart(2, '0');
  const timestamp = DEFAULT_COLLECTION_TIMESTAMP + index;

  return {
    id: `default-bottle-${assetId}`,
    name: `收藏瓶 ${assetId}`,
    cost: DEFAULT_ACHIEVEMENT_COLLECTION_COST,
    imagePath,
    enabled: true,
    createdAt: timestamp,
    updatedAt: timestamp
  };
});
