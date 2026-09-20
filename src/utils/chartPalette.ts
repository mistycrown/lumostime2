/**
 * @file chartPalette.ts
 * @input Activity-level statistic palette identifiers and the current theme CSS variables.
 * @output Reusable color groups for activity statistic charts and palette selectors.
 * @description Keeps categorical chart colors consistent while preserving the active theme as a dynamic palette.
 * @updated 2026-09-20: Added grouped statistic palettes for activity analytics.
 */
import { ActivityStatisticPaletteId } from '../types';

export interface ChartPalette {
  id: ActivityStatisticPaletteId;
  label: string;
  colors: string[];
  accent: string;
  accentSoft: string;
  muted: string;
  grid: string;
  background: string;
}

const shared = (id: ActivityStatisticPaletteId, label: string, colors: string[]): ChartPalette => ({
  id,
  label,
  colors,
  accent: colors[0],
  accentSoft: colors[3] || colors[0],
  muted: colors[4] || colors[1] || colors[0],
  grid: '#e7e5e4',
  background: '#f7f2ec'
});

export const CHART_PALETTES: ChartPalette[] = [
  {
    id: 'theme',
    label: '主题单色',
    colors: [
      'var(--accent-color)',
      'color-mix(in srgb, var(--accent-color) 82%, white)',
      'color-mix(in srgb, var(--accent-color) 66%, white)',
      'color-mix(in srgb, var(--accent-color) 50%, white)',
      'color-mix(in srgb, var(--accent-color) 34%, white)',
      'color-mix(in srgb, var(--accent-color) 20%, white)',
      'color-mix(in srgb, var(--accent-color) 66%, #8f877f)',
      'color-mix(in srgb, var(--accent-color) 42%, #8f877f)'
    ],
    accent: 'var(--accent-color)',
    accentSoft: 'color-mix(in srgb, var(--accent-color) 12%, white)',
    muted: 'color-mix(in srgb, var(--accent-color) 42%, #a8a29e)',
    grid: '#e7e5e4',
    background: '#f7f2ec'
  },
  shared('morandi-mist-blue', '雾蓝', ['#6f8794', '#8fa2a8', '#aeb9b8', '#c9cbc3', '#b1a99f', '#82959a', '#9ea8a4', '#d7d2c8']),
  shared('morandi-sage', '灰绿', ['#718b7b', '#91a68e', '#b0b9a1', '#cbc8b2', '#9a9d88', '#7d988b', '#aeb29a', '#d8d3c2']),
  shared('morandi-clay', '陶土', ['#9b6f63', '#b48777', '#c3a08b', '#d1bdaa', '#8b7b72', '#a27f70', '#c9ad9a', '#ded1c3']),
  shared('morandi-lotus', '藕粉', ['#9b7782', '#b08f98', '#c1a5a9', '#d2beb9', '#8e8790', '#a5898e', '#c5b1aa', '#ddd2ca']),
  shared('traditional-porcelain', '青花', ['#2f5d8c', '#5279a0', '#7796b2', '#a8b9c7', '#234a6f', '#6487a5', '#91abc0', '#ced9e0']),
  shared('traditional-cinnabar', '朱砂', ['#a62b2b', '#bf4438', '#d07051', '#ddb28b', '#7c1f1f', '#b25545', '#cf916d', '#ead1b8']),
  shared('traditional-bamboo', '竹青', ['#2f6b4f', '#528067', '#769779', '#a6b184', '#24523c', '#668961', '#94a576', '#d2d1ae']),
  shared('traditional-dai', '黛紫', ['#5a4a78', '#75628f', '#947fa0', '#b9aab6', '#3f5e78', '#6b7f8d', '#a29491', '#d6cec4'])
];

export const getChartPalette = (id?: ActivityStatisticPaletteId): ChartPalette => CHART_PALETTES.find((palette) => palette.id === id) || CHART_PALETTES[0];

export const getChartPaletteOptions = () => CHART_PALETTES;
