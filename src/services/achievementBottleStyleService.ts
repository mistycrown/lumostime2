/**
 * @file achievementBottleStyleService.ts
 * @description Shared achievement bottle style definitions used by settings previews, persistence, and the main achievement view.
 *
 * @updated 2026-03-28: Lightened the existing bottle skins and added pearl, linen, and mint variants for a softer bottle collection.
 */

export type AchievementBottleStyle =
  | 'sunlit'
  | 'seaGlass'
  | 'midnight'
  | 'blushBloom'
  | 'pearlMist'
  | 'linenCream'
  | 'mintHaze';

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
    label: '暖金晨光',
    description: '更轻盈的暖金玻璃感，像被早晨阳光照亮的收藏瓶。',
    previewStars: 18
  },
  {
    value: 'seaGlass',
    label: '海盐玻璃',
    description: '通透的浅海盐薄荷调，整体更清亮、更柔和。',
    previewStars: 16
  },
  {
    value: 'midnight',
    label: '夜幕藏蓝',
    description: '保留夜色感，但压低了厚重度，更像月光下的蓝灰玻璃。',
    previewStars: 20
  },
  {
    value: 'blushBloom',
    label: '雾粉花绽',
    description: '浅雾粉和柔白叠层，比原来更轻，像花瓣浸在玻璃里。',
    previewStars: 14
  },
  {
    value: 'pearlMist',
    label: '珍珠雾灰',
    description: '偏白的灰玻璃配色，克制、安静，适合你想要的浅灰感。',
    previewStars: 15
  },
  {
    value: 'linenCream',
    label: '亚麻奶霜',
    description: '奶白偏米色的玻璃瓶，整体更温柔，也更日常。',
    previewStars: 17
  },
  {
    value: 'mintHaze',
    label: '薄荷雾',
    description: '非常浅的薄荷雾色，轻透感最强，适合清新路线。',
    previewStars: 16
  }
];

export const isAchievementBottleStyle = (
  value: string | null | undefined
): value is AchievementBottleStyle => {
  return ACHIEVEMENT_BOTTLE_STYLE_OPTIONS.some((option) => option.value === value);
};

export const getAchievementBottleStyleOption = (
  style: AchievementBottleStyle
): AchievementBottleStyleOption => {
  return ACHIEVEMENT_BOTTLE_STYLE_OPTIONS.find((option) => option.value === style)
    || ACHIEVEMENT_BOTTLE_STYLE_OPTIONS[0];
};
