import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENT_BOTTLE_ICON_PACK_OPTIONS,
  DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK,
  getAchievementBottleIconPackFramePath,
  getAchievementBottleIconPackFramePaths,
  getAchievementBottleIconPackOption,
} from './achievementBottleIconPackService';

const ELECTRON_BASE_URI = 'file:///E:/lumostime/resources/app.asar/dist/index.html';

describe('achievementBottleIconPackService', () => {
  it('builds stable public URLs for each icon pack frame', () => {
    expect(getAchievementBottleIconPackFramePaths('star1', ELECTRON_BASE_URI)).toEqual([
      'file:///E:/lumostime/resources/app.asar/dist/stars/star1/01.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/star1/02.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/star1/03.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/star1/04.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/star1/05.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/star1/06.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/star1/07.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/star1/08.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/star1/09.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/star1/10.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/star1/11.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/star1/12.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/star1/13.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/star1/14.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/star1/15.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/star1/16.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/star1/17.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/star1/18.webp',
    ]);
    expect(getAchievementBottleIconPackFramePaths('stone', ELECTRON_BASE_URI)).toEqual([
      'file:///E:/lumostime/resources/app.asar/dist/stars/stone/01.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/stone/02.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/stone/03.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/stone/04.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/stone/05.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/stone/06.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/stone/07.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/stone/08.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/stone/09.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/stone/10.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/stone/11.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/stone/12.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/stone/13.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/stone/14.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/stone/15.webp',
      'file:///E:/lumostime/resources/app.asar/dist/stars/stone/16.webp',
    ]);
    expect(getAchievementBottleIconPackFramePaths('missing-pack', ELECTRON_BASE_URI)).toEqual([]);
    expect(getAchievementBottleIconPackFramePath('star1', 1, ELECTRON_BASE_URI))
      .toBe('file:///E:/lumostime/resources/app.asar/dist/stars/star1/01.webp');
  });

  it('keeps the default pack first and uses the first frame as preview', () => {
    expect(ACHIEVEMENT_BOTTLE_ICON_PACK_OPTIONS[0]?.value).toBe(DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK);
    expect(getAchievementBottleIconPackOption('stone').previewImageSrc).toContain('/stars/stone/01.webp');
  });
});
