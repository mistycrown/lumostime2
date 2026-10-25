/**
 * @file calendarHeatmap.ts
 * @input Recorded calendar values, shared range bounds and a palette color.
 * @output Five monotonic heat levels and contrasting shades that retain the selected hue.
 * @updated 2026-10-25: Shares higher-contrast calendar shading across cross-day and duration statistics.
 */

export const CALENDAR_HEATMAP_LEVELS = [0, 1, 2, 3, 4] as const;

/** Equal-width value bands use one scale for the complete selected range, not each month. */
export const getCalendarHeatmapLevel = (value: number, minimum: number, maximum: number): number => {
  if (!Number.isFinite(value) || !Number.isFinite(minimum) || !Number.isFinite(maximum) || maximum <= minimum) return 2;
  const ratio = Math.max(0, Math.min(1, (value - minimum) / (maximum - minimum)));
  return Math.min(4, Math.floor(ratio * 5));
};

export const getCalendarHeatmapColor = (color: string, level: number): string => {
  const shades = [
    `color-mix(in srgb, ${color} 18%, white)`,
    `color-mix(in srgb, ${color} 42%, white)`,
    `color-mix(in srgb, ${color} 70%, white)`,
    `color-mix(in srgb, ${color} 90%, black)`,
    `color-mix(in srgb, ${color} 60%, black)`,
  ];
  return shades[Math.max(0, Math.min(4, Math.round(level)))];
};
