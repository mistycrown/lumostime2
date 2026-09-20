/**
 * @file chartPalette.test.ts
 * @input Statistic palette definitions and lookup identifiers.
 * @output Regression coverage for grouped chart palette selection.
 * @description Verifies every palette remains usable by categorical and heatmap charts.
 * @updated 2026-09-20: Added grouped chart palette tests.
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
});
