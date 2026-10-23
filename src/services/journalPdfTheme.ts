/**
 * @file journalPdfTheme.ts
 * @input Radix template tokens and original authored data colors
 * @output PDF RGB colors with shared background, border and text semantics
 * @pos Service (Journal PDF theme)
 * @updated 2026-10-23: Uses Radix for templates while preserving original data colors and neutral missing-color fallbacks.
 */
import { rgb } from 'pdf-lib';
import { JOURNAL_HEX } from '../utils/journalTheme';
import { getColorHexForCharts } from '../utils/colorAdapterUtils';
export const journalPdfColor = (hex: string) => rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);
export const JOURNAL_COLORS = Object.fromEntries(Object.entries(JOURNAL_HEX).map(([key, value]) => [key, journalPdfColor(value)])) as Record<keyof typeof JOURNAL_HEX, ReturnType<typeof rgb>>;
// Authored data colors keep their original hue; Radix remains the template palette.
export const journalDataColor = (_key: string, color?: string, tint = 0) => {
  const hex = color ? getColorHexForCharts(color) : '#8a918e';
  const amount = Math.max(0, Math.min(1, tint));
  return rgb(...[1, 3, 5].map((offset) => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel + (1 - channel) * amount;
  }) as [number, number, number]);
};
