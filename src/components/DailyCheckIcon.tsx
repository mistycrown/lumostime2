/**
 * @file DailyCheckIcon.tsx
 * @input Stored daily-check emoji/UI icon and display type
 * @output Stored icon presentation for daily-check pages
 * @pos Component (Daily Check)
 * @description Reuses the application's existing emoji/UI-icon renderer without changing stored template data.
 * @created 2026-08-09
 * @updated 2026-08-09: Replaced semantic Lucide mapping with stored emoji/UI-icon rendering.
 */
import React from 'react';
import { IconRenderer } from './IconRenderer';
import { DailyCheckDisplayType } from '../utils/dailyCheckStatsUtils';

interface DailyCheckIconProps {
  content: string;
  icon?: string;
  uiIcon?: string;
  size?: number;
  className?: string;
}

export const DailyCheckIcon: React.FC<DailyCheckIconProps> = ({
  content,
  icon,
  uiIcon,
  size = 20,
  className = ''
}) => {
  return (
    <IconRenderer
      icon={icon || content.trim().slice(0, 1) || '✓'}
      uiIcon={uiIcon}
      size={size}
      className={className}
      alt={content}
    />
  );
};

export const getDailyCheckIconTone = (type: DailyCheckDisplayType): {
  icon: string;
  surface: string;
  text: string;
} => {
  switch (type) {
    case 'count':
      return {
        icon: 'text-sky-700',
        surface: 'bg-sky-100',
        text: 'text-sky-700'
      };
    case 'duration':
      return {
        icon: 'text-violet-700',
        surface: 'bg-violet-100',
        text: 'text-violet-700'
      };
    case 'time':
      return {
        icon: 'text-amber-700',
        surface: 'bg-amber-100',
        text: 'text-amber-700'
      };
    default:
      return {
        icon: 'text-emerald-700',
        surface: 'bg-emerald-100',
        text: 'text-emerald-700'
      };
  }
};
