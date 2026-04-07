/**
 * @file timePalConfig.ts
 * @description 时间小友配置，统一管理所有预设时间小友类型与图片路径。
 */

import { resolveAssetPath } from '../utils/assetPath';

export type TimePalType =
  | 'cat' | 'rabbit' | 'prince' | 'girl'
  | 'buddist' | 'cat2' | 'dog2' | 'flower' | 'Ghost' | 'girl3'
  | 'pigen' | 'prince2' | 'taoist'
  | 'boy' | 'boy2' | 'butterfly' | 'girl5' | 'knit' | 'paper';

export interface TimePalOption {
  type: TimePalType;
  name: string;
  preview: string;
  emoji: string;
}

export const CUSTOM_TIMEPAL_PREFIX = 'custom:';

export const getTimePalPreviewPath = (type: TimePalType, baseUri?: string): string => {
  return resolveAssetPath(`/time_pal_origin/${type}/1.webp`, baseUri);
};

export const TIMEPAL_OPTIONS: TimePalOption[] = [
  { type: 'cat', name: '猫咪', preview: getTimePalPreviewPath('cat'), emoji: '🐱' },
  { type: 'rabbit', name: '兔子', preview: getTimePalPreviewPath('rabbit'), emoji: '🐰' },
  { type: 'prince', name: '小王子', preview: getTimePalPreviewPath('prince'), emoji: '🤴' },
  { type: 'girl', name: '女孩', preview: getTimePalPreviewPath('girl'), emoji: '👧' },
  { type: 'buddist', name: '佛系', preview: getTimePalPreviewPath('buddist'), emoji: '🪷' },
  { type: 'cat2', name: '猫咪2', preview: getTimePalPreviewPath('cat2'), emoji: '🐱' },
  { type: 'dog2', name: '小狗2', preview: getTimePalPreviewPath('dog2'), emoji: '🐶' },
  { type: 'flower', name: '花朵', preview: getTimePalPreviewPath('flower'), emoji: '🌸' },
  { type: 'Ghost', name: '幽灵', preview: getTimePalPreviewPath('Ghost'), emoji: '👻' },
  { type: 'girl3', name: '女孩3', preview: getTimePalPreviewPath('girl3'), emoji: '👧' },
  { type: 'pigen', name: '鸽子', preview: getTimePalPreviewPath('pigen'), emoji: '🕊️' },
  { type: 'prince2', name: '小王子2', preview: getTimePalPreviewPath('prince2'), emoji: '🤴' },
  { type: 'taoist', name: '道士', preview: getTimePalPreviewPath('taoist'), emoji: '🧙' },
  { type: 'boy', name: '男孩', preview: getTimePalPreviewPath('boy'), emoji: '👦' },
  { type: 'boy2', name: '男孩2', preview: getTimePalPreviewPath('boy2'), emoji: '👦' },
  { type: 'butterfly', name: '蝴蝶', preview: getTimePalPreviewPath('butterfly'), emoji: '🦋' },
  { type: 'girl5', name: '女孩5', preview: getTimePalPreviewPath('girl5'), emoji: '👧' },
  { type: 'knit', name: '编织', preview: getTimePalPreviewPath('knit'), emoji: '🧶' },
  { type: 'paper', name: '纸艺', preview: getTimePalPreviewPath('paper'), emoji: '📄' },
];

export const getTimePalImagePath = (type: TimePalType, level: number, baseUri?: string): string => {
  return resolveAssetPath(`/time_pal_origin/${type}/${level}.png`, baseUri);
};

export const getTimePalImagePathFallback = (type: TimePalType, level: number, baseUri?: string): string => {
  return resolveAssetPath(`/time_pal_origin/${type}/${level}.webp`, baseUri);
};

export const getTimePalEmoji = (type: TimePalType): string => {
  const option = TIMEPAL_OPTIONS.find((candidate) => candidate.type === type);
  return option?.emoji || '🐥';
};

export const getAllTimePalTypes = (): TimePalType[] => {
  return TIMEPAL_OPTIONS.map((option) => option.type);
};

export const isPresetTimePalType = (type: string): type is TimePalType => {
  return TIMEPAL_OPTIONS.some((option) => option.type === type);
};

export const isCustomTimePalType = (type: string | null | undefined): boolean => {
  return !!type && type.startsWith(CUSTOM_TIMEPAL_PREFIX);
};

export const extractCustomTimePalId = (type: string | null | undefined): string | null => {
  if (!isCustomTimePalType(type)) {
    return null;
  }

  return type.slice(CUSTOM_TIMEPAL_PREFIX.length) || null;
};
