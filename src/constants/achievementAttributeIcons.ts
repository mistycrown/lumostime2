/**
 * @file achievementAttributeIcons.ts
 * @input Lucide icon components
 * @output Icon registry for achievement character attributes
 * @pos Constants (Achievement)
 * @description Keeps persisted Lucide icon names mapped to renderable components.
 * @updated 2026-08-09: Added the character attribute icon registry.
 */

import {
  BookOpen,
  Brain,
  Dumbbell,
  Flame,
  HeartPulse,
  Leaf,
  Lightbulb,
  MessagesSquare,
  Shield,
  Smile,
  Sparkles,
  Sun,
  Target,
  Users
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const ACHIEVEMENT_ATTRIBUTE_ICON_MAP: Record<string, LucideIcon> = {
  BookOpen,
  Brain,
  Dumbbell,
  Flame,
  HeartPulse,
  Leaf,
  Lightbulb,
  MessagesSquare,
  Shield,
  Smile,
  Sparkles,
  Sun,
  Target,
  Users
};

export const ACHIEVEMENT_ATTRIBUTE_ICON_OPTIONS = Object.keys(ACHIEVEMENT_ATTRIBUTE_ICON_MAP);

export const getAchievementAttributeIcon = (iconName: string): LucideIcon => (
  ACHIEVEMENT_ATTRIBUTE_ICON_MAP[iconName] || Sparkles
);
