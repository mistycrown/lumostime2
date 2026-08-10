/**
 * @file dailyCheckColorUtils.ts
 * @input Stored daily-check color values
 * @output Resolved surface and primary CSS colors for daily-check UI
 * @pos Utils (Daily Check)
 * @description Resolves legacy Tailwind color tokens and custom HEX values into shared daily-check colors.
 * @created 2026-08-09
 */
import { getColorPreviewValue, normalizeHexColor, toCssColor } from './colorUtils';

export interface DailyCheckColorValues {
  surface: string;
  primary: string;
}

export const getDailyCheckColorValues = (color?: string): DailyCheckColorValues | null => {
  const normalizedColor = color?.trim();
  if (!normalizedColor) {
    return null;
  }

  return {
    surface: normalizeHexColor(normalizedColor)
      ? toCssColor(normalizedColor, 'background', 0.16)
      : getColorPreviewValue(normalizedColor, 'activity'),
    primary: toCssColor(normalizedColor, 'fill')
  };
};
