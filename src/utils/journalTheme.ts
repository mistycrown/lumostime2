/**
 * @file journalTheme.ts
 * @input Semantic template color roles
 * @output Radix template colors, print sizes and a half-pixel print stroke
 * @pos Utility (Journal design tokens)
 * @updated 2026-10-23: Uses Radix backgrounds 1–3, borders 6, solids 9 and text 11–12.
 */
import { sand, sage, jade, red } from '@radix-ui/colors';

export const JOURNAL_HEX = { paper: sand.sand1, surface: sand.sand2, fill: sage.sage3, ink: sage.sage12, muted: sage.sage11, line: sage.sage6, accent: jade.jade11, danger: red.red11 };
export const JOURNAL_TYPE = { body: 9, heading: 12, title: 24, display: 64 } as const;
export const JOURNAL_STROKE = 0.375; // 0.5 CSS px at 96 dpi, in PDF points.
