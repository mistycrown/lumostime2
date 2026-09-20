/**
 * @file chartPalette.test.ts
 * @input Statistic palette definitions and lookup identifiers.
 * @output Regression coverage for grouped chart palette selection.
 * @description Verifies every palette remains usable by categorical and heatmap charts.
 * @updated 2026-09-20: Covers the eight fish-snack built-in palette sequences.
 */
import { describe, expect, it } from 'vitest';
import { CHART_PALETTES, getChartPalette } from './chartPalette';

describe('chart palettes', () => {
  it('exposes a multi-color sequence for every palette', () => {
    expect(CHART_PALETTES.length).toBeGreaterThanOrEqual(9);
    CHART_PALETTES.forEach((palette) => {
      expect(palette.colors.length).toBeGreaterThanOrEqual(6);
      expect(palette.colors[0]).toBeTruthy();
      if (palette.id !== 'theme') expect(new Set(palette.colors).size).toBe(palette.colors.length);
    });
  });

  it('falls back to the dynamic theme palette for unknown ids', () => {
    expect(getChartPalette('not-a-palette' as never).id).toBe('theme');
    expect(getChartPalette('theme').colors[0]).toBe('var(--accent-color)');
  });

  it('uses the eight fish-snack palette sequences', () => {
    expect(CHART_PALETTES.slice(1).map((palette) => [palette.label, palette.colors])).toEqual([
      ['温暖复古', ['#8B4E3C', '#D69B72', '#E8C9A7', '#A68F6B', '#B14E3F', '#6B6F72', '#2F3E46', '#EADFCB']],
      ['海岸暮色', ['#2E5B7F', '#F4A261', '#E76F51', '#FFD8A8', '#8AB6D6', '#6C7A89', '#1F2D3D', '#F0F4F8']],
      ['糖果活力', ['#FF6B6B', '#FFB703', '#FFD166', '#7BDFF2', '#C77DFF', '#FF9ED1', '#06D6A0', '#118AB2']],
      ['秋日大地', ['#A0522D', '#D97706', '#E0A458', '#F2D1A7', '#8B4513', '#6B705C', '#3E3A32', '#EAE0D5']],
      ['雾感莫兰迪', ['#A7B1B2', '#C9B8AF', '#8DA0CB', '#B7C4A7', '#D9A5A5', '#9E9E9E', '#6B7C93', '#E8E4DF']],
      ['春日东方', ['#F6BDC0', '#A7D7C5', '#FDE68A', '#9BC1BC', '#E07A5F', '#81B29A', '#3D405B', '#F8F9FA']],
      ['雨后花园', ['#52796F', '#84A98C', '#A7C957', '#E9C46A', '#E76F51', '#6D597A', '#4D7EA8', '#D8E2DC']],
      ['夏夜汽水', ['#457B9D', '#66C7C5', '#A8DADC', '#F4D35E', '#EE964B', '#E76F8A', '#8067B7', '#344E5C']],
    ]);
  });
});
