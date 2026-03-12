import { ThemeConfig, ThemeType } from './types';

export const themes: Record<ThemeType, ThemeConfig> = {
  classic: { name: '经典圆点 (Classic)' },
  vine: { name: '自然藤蔓 (Vine & Leaves)' },
  celestial: { name: '星月神话 (Celestial)' },
  track: { name: '时光轨道 (Time Track)' },
  stitches: { name: '手工缝线 (Stitches)' },
  paw: { name: '猫爪印记 (Cat Paws)' },
  music: { name: '岁月如歌 (Melody)' }
};
