/**
 * @file achievementBottleStyleService.ts
 * @description Shared achievement bottle style definitions used by settings previews, persistence, and the main achievement view.
 */

export type AchievementBottleStyle = 'sunlit' | 'seaGlass' | 'midnight' | 'blushBloom';

export interface AchievementBottleStyleOption {
  value: AchievementBottleStyle;
  label: string;
  description: string;
  previewStars: number;
}

export const DEFAULT_ACHIEVEMENT_BOTTLE_STYLE: AchievementBottleStyle = 'sunlit';

export const ACHIEVEMENT_BOTTLE_STYLE_OPTIONS: AchievementBottleStyleOption[] = [
  {
    value: 'sunlit',
    label: '琥珀暖金',
    description: '像午后蜂蜜玻璃罐，暖调、清透、偏奖励感。',
    previewStars: 18
  },
  {
    value: 'seaGlass',
    label: '海盐玻璃',
    description: '偏薄荷青和海雾感，轻盈、清爽、像收藏漂流星屑。',
    previewStars: 16
  },
  {
    value: 'midnight',
    label: '夜空秘藏',
    description: '深蓝瓶身配月光高光，更像夜里积攒下来的光。',
    previewStars: 20
  },
  {
    value: 'blushBloom',
    label: '花雾绯光',
    description: '带一点珍珠粉和花瓣雾感，柔和但不甜腻。',
    previewStars: 14
  }
];

export const getAchievementBottleStyleOption = (
  style: AchievementBottleStyle
): AchievementBottleStyleOption => {
  return ACHIEVEMENT_BOTTLE_STYLE_OPTIONS.find((option) => option.value === style)
    || ACHIEVEMENT_BOTTLE_STYLE_OPTIONS[0];
};
