/**
 * @file journalPdfTheme.ts
 * @input Official Radix design tokens
 * @output PDF RGB colors with shared background, border and text semantics
 * @pos Service (Journal PDF theme)
 * @updated 2026-10-23: Keeps all generated print colors on official Radix scales.
 */
import { rgb } from 'pdf-lib';
import { JOURNAL_HEX, journalRadixHex } from '../utils/journalTheme';
export const journalPdfColor = (hex: string) => rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);
export const JOURNAL_COLORS = Object.fromEntries(Object.entries(JOURNAL_HEX).map(([key, value]) => [key, journalPdfColor(value)])) as Record<keyof typeof JOURNAL_HEX, ReturnType<typeof rgb>>;
export const journalRadixColor = (key: string, hex?: string, tint = 0.74) => journalPdfColor(journalRadixHex(hex, key, tint >= 0.85 ? 3 : tint >= 0.6 ? 4 : tint >= 0.4 ? 6 : 9));
