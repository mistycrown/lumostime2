import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENT_BOTTLE_ICON_PACK_OPTIONS,
  DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK,
  getAchievementBottleIconPackFramePaths,
  getAchievementBottleIconPackOption,
} from './achievementBottleIconPackService';

describe('achievementBottleIconPackService', () => {
  it('builds stable public URLs for each icon pack frame', () => {
    expect(getAchievementBottleIconPackFramePaths('star1')).toEqual([
      '/stars/star1/01.webp',
      '/stars/star1/02.webp',
      '/stars/star1/03.webp',
      '/stars/star1/04.webp',
      '/stars/star1/05.webp',
      '/stars/star1/06.webp',
      '/stars/star1/07.webp',
      '/stars/star1/08.webp',
      '/stars/star1/09.webp',
      '/stars/star1/10.webp',
      '/stars/star1/11.webp',
      '/stars/star1/12.webp',
      '/stars/star1/13.webp',
      '/stars/star1/14.webp',
      '/stars/star1/15.webp',
      '/stars/star1/16.webp',
      '/stars/star1/17.webp',
      '/stars/star1/18.webp',
    ]);
    expect(getAchievementBottleIconPackFramePaths('stone')).toEqual([
      '/stars/stone/01.webp',
      '/stars/stone/02.webp',
      '/stars/stone/03.webp',
      '/stars/stone/04.webp',
      '/stars/stone/05.webp',
      '/stars/stone/06.webp',
      '/stars/stone/07.webp',
      '/stars/stone/08.webp',
      '/stars/stone/09.webp',
      '/stars/stone/10.webp',
      '/stars/stone/11.webp',
      '/stars/stone/12.webp',
      '/stars/stone/13.webp',
      '/stars/stone/14.webp',
      '/stars/stone/15.webp',
      '/stars/stone/16.webp',
    ]);
    expect(getAchievementBottleIconPackFramePaths('missing-pack')).toEqual([]);
  });

  it('keeps the default pack first and uses the first frame as preview', () => {
    expect(ACHIEVEMENT_BOTTLE_ICON_PACK_OPTIONS[0]?.value).toBe(DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK);
    expect(getAchievementBottleIconPackOption('stone').previewImageSrc).toBe('/stars/stone/01.webp');
  });
});
