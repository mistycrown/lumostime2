/**
 * @file shareCardTheme.ts
 * @input Six-digit theme color
 * @output A darker card color that preserves the selected hue
 * @pos Helper (ShareCard)
 * @updated 2026-10-12: Shares the deepened palette between text and photo layouts.
 */
export const deepenThemeColor = (color: string): string => '#' + [1, 3, 5]
  .map((offset) => Math.round(parseInt(color.slice(offset, offset + 2), 16) * 0.82).toString(16).padStart(2, '0'))
  .join('');
