/**
 * @file journalTheme.ts
 * @input Semantic color roles and optional user color families
 * @output Official Radix scales, print sizes and a half-pixel print stroke
 * @pos Utility (Journal design tokens)
 * @updated 2026-10-23: Uses Radix backgrounds 1–3, borders 6, solids 9 and text 11–12.
 */
import { sand, sage, jade, blue, iris, pink, orange, amber, red, grass, cyan } from '@radix-ui/colors';

export const JOURNAL_HEX = { paper: sand.sand1, surface: sand.sand2, fill: sage.sage3, ink: sage.sage12, muted: sage.sage11, line: sage.sage6, accent: jade.jade11, danger: red.red11, weekend: pink.pink2 };
export const JOURNAL_TYPE = { body: 9, heading: 12, title: 24, display: 64 } as const;
export const JOURNAL_STROKE = 0.375; // 0.5 CSS px at 96 dpi, in PDF points.
const scales = [jade, blue, iris, pink, orange, amber, red, grass, cyan] as const;
const baseNames = ['jade', 'blue', 'iris', 'pink', 'orange', 'amber', 'red', 'grass', 'cyan'];
const channels = (hex: string) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
const hue = (values: number[]) => {
  const [r, g, b] = values;
  const max = Math.max(...values); const min = Math.min(...values); const delta = max - min;
  if (delta < 0.08) return null;
  const value = max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return (value * 60 + 360) % 360;
};
export const journalRadixHex = (hex?: string, key = '', step: 3 | 4 | 6 | 9 = 9): string => {
  let index = [...key].reduce((sum, char) => sum + char.codePointAt(0)!, 0) % scales.length;
  if (/^#[a-f0-9]{6}$/i.test(hex || '')) {
    const target = hue(channels(hex!));
    if (target === null) return (sage as Record<string, string>)[`sage${step}`];
    let closest = Infinity;
    scales.forEach((scale, candidate) => {
      const value = hue(channels((scale as Record<string, string>)[`${baseNames[candidate]}9`]))!;
      const difference = Math.min(Math.abs(target - value), 360 - Math.abs(target - value));
      if (difference < closest) { closest = difference; index = candidate; }
    });
  }
  return (scales[index] as Record<string, string>)[`${baseNames[index]}${step}`];
};
