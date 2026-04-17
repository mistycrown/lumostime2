/**
 * @file colorAdapterUtils.ts
 * @input Stored color value (Tailwind class or HEX)
 * @output Unified render adapters for charts, cards, schedules, heatmaps and tag selectors
 * @pos Utility (Color Rendering)
 * @description 统一颜色消费端适配逻辑，避免不同页面对 Tailwind class / HEX 的渲染规则分叉。
 */

import type { CSSProperties } from 'react';
import { COLOR_OPTIONS } from '../constants';
import { hexToRgba, normalizeHexColor, toCssColor } from './colorUtils';

export interface ColorRenderPresentation {
  className: string;
  style?: CSSProperties;
}

export interface SceneCardColorPresentation {
  accentColor: string;
  frontBorderColor: string;
  backBorderColor: string;
  swipeBackgroundColor: string;
}

export type ScheduleThemeVariant = 'default' | 'classic' | 'minimal' | 'solid';

export const CHART_STROKE_COLORS: Record<string, string> = {
  red: '#fca5a5',
  blue: '#93c5fd',
  orange: '#fdba74',
  purple: '#d8b4fe',
  emerald: '#6ee7b7',
  fuchsia: '#f0abfc',
  yellow: '#fde047',
  cyan: '#67e8f9',
  rose: '#fda4af',
  indigo: '#a5b4fc',
  lime: '#bef264',
  violet: '#c4b5fd',
  amber: '#fcd34d',
  sky: '#7dd3fc',
  green: '#86efac',
  pink: '#f9a8d4',
  teal: '#5eead4',
};

const SCHEDULE_CLASS_MAP: Record<string, string> = {
  stone: 'bg-stone-100/90 text-stone-700 border-stone-200',
  slate: 'bg-slate-100/90 text-slate-700 border-slate-200',
  gray: 'bg-gray-100/90 text-gray-700 border-gray-200',
  zinc: 'bg-zinc-100/90 text-zinc-700 border-zinc-200',
  neutral: 'bg-neutral-100/90 text-neutral-700 border-neutral-200',
  red: 'bg-red-100/90 text-red-700 border-red-200',
  orange: 'bg-orange-100/90 text-orange-700 border-orange-200',
  amber: 'bg-amber-100/90 text-amber-700 border-amber-200',
  yellow: 'bg-yellow-100/90 text-yellow-700 border-yellow-200',
  lime: 'bg-lime-100/90 text-lime-700 border-lime-200',
  green: 'bg-green-100/90 text-green-700 border-green-200',
  emerald: 'bg-emerald-100/90 text-emerald-700 border-emerald-200',
  teal: 'bg-teal-100/90 text-teal-700 border-teal-200',
  cyan: 'bg-cyan-100/90 text-cyan-700 border-cyan-200',
  sky: 'bg-sky-100/90 text-sky-700 border-sky-200',
  blue: 'bg-blue-100/90 text-blue-700 border-blue-200',
  indigo: 'bg-indigo-100/90 text-indigo-700 border-indigo-200',
  violet: 'bg-violet-100/90 text-violet-700 border-violet-200',
  purple: 'bg-purple-100/90 text-purple-700 border-purple-200',
  fuchsia: 'bg-fuchsia-100/90 text-fuchsia-700 border-fuchsia-200',
  pink: 'bg-pink-100/90 text-pink-700 border-pink-200',
  rose: 'bg-rose-100/90 text-rose-700 border-rose-200',
};

const getTailwindColorId = (colorValue: string): string => {
  const match = colorValue.match(/(?:text|bg)-([a-z]+)-/);
  return match ? match[1] : 'stone';
};

export const getChartStrokeColor = (colorValue: string = ''): string => {
  const normalizedHex = normalizeHexColor(colorValue);
  if (normalizedHex) return normalizedHex;

  const colorId = getTailwindColorId(colorValue);
  return CHART_STROKE_COLORS[colorId] || '#d6d3d1';
};

export const getSoftColorCircleStyle = (
  colorValue: string = '',
  alpha: number = 0.15
): CSSProperties => {
  return {
    backgroundColor: toCssColor(colorValue, 'background', alpha),
  };
};

const blendHexWithWhite = (hexColor: string, ratio: number): string => {
  const normalizedHex = normalizeHexColor(hexColor);
  if (!normalizedHex) {
    return '#e7e5e4';
  }

  const clampedRatio = Math.min(1, Math.max(0, ratio));
  const hex = normalizedHex.replace('#', '');
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);

  const nextRed = red + Math.round((255 - red) * clampedRatio);
  const nextGreen = green + Math.round((255 - green) * clampedRatio);
  const nextBlue = blue + Math.round((255 - blue) * clampedRatio);

  return `#${[nextRed, nextGreen, nextBlue]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
};

export const getWidgetSlotFillColor = (
  colorValue: string = '',
  isEmphasized: boolean = false
): string => {
  const baseColor = normalizeHexColor(toCssColor(colorValue, 'fill', 1)) || '#e7e5e4';
  return isEmphasized ? baseColor : blendHexWithWhite(baseColor, 0.82);
};

export const getTagCirclePresentation = (
  colorValue: string = '',
  alpha: number = 0.2
): ColorRenderPresentation => {
  const normalizedHex = normalizeHexColor(colorValue);
  if (normalizedHex) {
    return {
      className: '',
      style: {
        backgroundColor: hexToRgba(normalizedHex, alpha),
        color: normalizedHex,
        border: `1px solid ${hexToRgba(normalizedHex, Math.min(alpha + 0.12, 0.4))}`,
      },
    };
  }

  return {
    className: colorValue,
  };
};

export const getHeatmapFillColor = (colorValue: string = ''): string => {
  const normalizedHex = normalizeHexColor(colorValue);
  if (normalizedHex) {
    return hexToRgba(normalizedHex, 0.2);
  }

  return toCssColor(colorValue, 'background');
};

export const getSchedulePresentation = (
  colorValue: string = '',
  theme: ScheduleThemeVariant = 'default'
): ColorRenderPresentation => {
  if (theme !== 'default') {
    const baseColor = normalizeHexColor(toCssColor(colorValue, 'fill', 1)) || '#78716c';

    if (theme === 'classic') {
      return {
        className: 'rounded-[4px]',
        style: {
          backgroundColor: hexToRgba(baseColor, 0.12),
          color: baseColor,
          borderColor: hexToRgba(baseColor, 0.18),
          borderLeftColor: hexToRgba(baseColor, 0.52),
          borderLeftWidth: '3px',
        },
      };
    }

    if (theme === 'minimal') {
      return {
        className: '',
        style: {
          backgroundColor: 'transparent',
          color: baseColor,
          borderColor: 'transparent',
          borderLeftColor: baseColor,
          borderLeftWidth: '4px',
        },
      };
    }

    return {
      className: 'rounded-md shadow-sm',
      style: {
        backgroundColor: baseColor,
        color: '#ffffff',
        borderColor: hexToRgba(baseColor, 0.16),
      },
    };
  }

  if (typeof colorValue !== 'string') {
    return { className: SCHEDULE_CLASS_MAP.stone };
  }

  const normalizedHex = normalizeHexColor(colorValue);
  if (normalizedHex) {
    return {
      className: '',
      style: {
        backgroundColor: hexToRgba(normalizedHex, 0.16),
        color: normalizedHex,
        borderColor: hexToRgba(normalizedHex, 0.3),
      },
    };
  }

  const colorId = getTailwindColorId(colorValue);
  return {
    className: SCHEDULE_CLASS_MAP[colorId] || SCHEDULE_CLASS_MAP.stone,
  };
};

export const getSceneCardColorPresentation = (
  colorValue: string = ''
): SceneCardColorPresentation => {
  const accentColor = normalizeHexColor(toCssColor(colorValue, 'fill', 1)) || '#78716c';

  return {
    accentColor,
    frontBorderColor: hexToRgba(accentColor, 0.3),
    backBorderColor: hexToRgba(accentColor, 0.5),
    swipeBackgroundColor: accentColor,
  };
};

export const getColorHexForCharts = (colorValue: string = ''): string => {
  const normalizedHex = normalizeHexColor(colorValue);
  if (normalizedHex) return normalizedHex;

  const colorId = getTailwindColorId(colorValue);
  const option = COLOR_OPTIONS.find((item) => item.id === colorId);
  return option ? option.lightHex || option.hex : '#e7e5e4';
};
