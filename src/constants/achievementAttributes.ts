/**
 * @file achievementAttributes.ts
 * @input Character attribute preset definitions
 * @output Default achievement character attributes
 * @pos Constants (Achievement)
 * @description Provides the five initial character attributes used when an existing account first enters the growth system.
 * @updated 2026-08-09: Added the initial character attribute presets for the fixed-rule growth system.
 */

import type { AchievementAttribute } from '../types';

type AchievementAttributePreset = Omit<AchievementAttribute, 'createdAt' | 'updatedAt'>;

export const DEFAULT_ACHIEVEMENT_ATTRIBUTE_PRESETS: AchievementAttributePreset[] = [
  {
    id: 'preset-intellect',
    name: '智识',
    subtitle: 'INTELLECT',
    icon: 'BookOpen',
    color: '#7D9687',
    enabled: true,
    sortOrder: 0
  },
  {
    id: 'preset-vitality',
    name: '体魄',
    subtitle: 'VITALITY',
    icon: 'Dumbbell',
    color: '#738CA4',
    enabled: true,
    sortOrder: 1
  },
  {
    id: 'preset-willpower',
    name: '意志',
    subtitle: 'WILLPOWER',
    icon: 'Target',
    color: '#B56F72',
    enabled: true,
    sortOrder: 2
  },
  {
    id: 'preset-joy',
    name: '快乐',
    subtitle: 'JOY',
    icon: 'Smile',
    color: '#C4A66D',
    enabled: true,
    sortOrder: 3
  },
  {
    id: 'preset-social',
    name: '友好',
    subtitle: 'SOCIAL',
    icon: 'MessagesSquare',
    color: '#8E829F',
    enabled: true,
    sortOrder: 4
  }
];

export const buildDefaultAchievementAttributes = (createdAt = Date.now()): AchievementAttribute[] => (
  DEFAULT_ACHIEVEMENT_ATTRIBUTE_PRESETS.map((preset) => ({
    ...preset,
    createdAt,
    updatedAt: createdAt
  }))
);
