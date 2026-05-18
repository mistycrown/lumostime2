import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ACHIEVEMENT_COLLECTIONS,
  getDefaultAchievementCollectionAssetIdFromImagePath,
  getDefaultAchievementCollectionPreset,
  getDefaultAchievementCollectionPresetFromReference,
  repairAchievementCollectionImagePath,
  resolveAchievementCollectionImagePath,
} from './achievementCollections';

const ELECTRON_BASE_URI = 'file:///E:/lumostime/resources/app.asar/dist/index.html';

describe('achievementCollections', () => {
  it('resolves bottle asset paths for Electron desktop builds', () => {
    expect(resolveAchievementCollectionImagePath('/bottle/01.png', ELECTRON_BASE_URI))
      .toBe('file:///E:/lumostime/resources/app.asar/dist/bottle/01.png');
  });

  it('uses bottle assets for built-in presets', () => {
    expect(getDefaultAchievementCollectionPreset('default-bottle-01')?.imagePath)
      .toContain('/bottle/01.png');
    expect(DEFAULT_ACHIEVEMENT_COLLECTIONS[0]?.imagePath).toContain('/bottle/01.png');
  });

  it('extracts built-in asset ids from stale desktop bottle URLs', () => {
    expect(getDefaultAchievementCollectionAssetIdFromImagePath('file:///C:/Program Files/LumosTime/resources/app.asar/dist/bottle/08.png'))
      .toBe('08');
  });

  it('repairs stale default bottle references back to the current bundled asset path', () => {
    expect(repairAchievementCollectionImagePath({
      imagePath: 'file:///C:/Program Files/LumosTime/resources/app.asar/dist/bottle/08.png'
    }, ELECTRON_BASE_URI)).toBe('file:///E:/lumostime/resources/app.asar/dist/bottle/08.png');

    expect(getDefaultAchievementCollectionPresetFromReference({
      imagePath: 'file:///C:/Program Files/LumosTime/resources/app.asar/dist/bottle/08.png'
    }, ELECTRON_BASE_URI)?.assetId).toBe('08');
  });
});
