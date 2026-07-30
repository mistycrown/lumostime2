/**
 * @file timelineSidebarRatioUtils.ts
 * @input Persisted sidebar ratio or legacy pixel width and the current viewport width
 * @output Normalized Chronicle right-sidebar ratios constrained to the supported split range
 * @pos Utility (Timeline layout persistence)
 * @updated 2026-07-30: Adds responsive ratio persistence for the Chronicle todo sidebar.
 * @updated 2026-07-30: Shares the compact 26%-70% ratio bounds with the quick-color sidebar and migrates its legacy pixel width.
 */

export const TIMELINE_SIDEBAR_MIN_RATIO = 0.26;
export const TIMELINE_SIDEBAR_MAX_RATIO = 0.7;
export const TIMELINE_TODO_SIDEBAR_MIN_RATIO = TIMELINE_SIDEBAR_MIN_RATIO;
export const TIMELINE_TODO_SIDEBAR_MAX_RATIO = TIMELINE_SIDEBAR_MAX_RATIO;
export const DEFAULT_TIMELINE_TODO_SIDEBAR_RATIO = 0.4;
export const DEFAULT_TIMELINE_QUICK_COLOR_SIDEBAR_RATIO = 0.4;

export const clampTimelineSidebarRatio = (
  ratio: number,
  fallbackRatio = DEFAULT_TIMELINE_TODO_SIDEBAR_RATIO
): number => {
  if (!Number.isFinite(ratio)) return fallbackRatio;
  return Math.min(TIMELINE_SIDEBAR_MAX_RATIO, Math.max(TIMELINE_SIDEBAR_MIN_RATIO, ratio));
};

export const clampTimelineTodoSidebarRatio = (ratio: number): number => clampTimelineSidebarRatio(ratio);

export const readTimelineTodoSidebarRatio = (
  storedRatio: string | null,
  legacyPixelWidth: string | null,
  viewportWidth: number
): number => {
  const ratio = Number(storedRatio);
  if (Number.isFinite(ratio) && ratio > 0 && ratio <= 1) {
    return clampTimelineSidebarRatio(ratio, DEFAULT_TIMELINE_TODO_SIDEBAR_RATIO);
  }

  const legacyWidth = Number(legacyPixelWidth);
  if (Number.isFinite(legacyWidth) && legacyWidth > 0 && viewportWidth > 0) {
    return clampTimelineSidebarRatio(legacyWidth / viewportWidth, DEFAULT_TIMELINE_TODO_SIDEBAR_RATIO);
  }

  return DEFAULT_TIMELINE_TODO_SIDEBAR_RATIO;
};

export const readTimelineQuickColorSidebarRatio = (
  storedRatio: string | null,
  legacyPixelWidth: string | null,
  viewportWidth: number
): number => {
  const ratio = Number(storedRatio);
  if (Number.isFinite(ratio) && ratio > 0 && ratio <= 1) {
    return clampTimelineSidebarRatio(ratio, DEFAULT_TIMELINE_QUICK_COLOR_SIDEBAR_RATIO);
  }

  const legacyWidth = Number(legacyPixelWidth);
  if (Number.isFinite(legacyWidth) && legacyWidth > 0 && viewportWidth > 0) {
    return clampTimelineSidebarRatio(legacyWidth / viewportWidth, DEFAULT_TIMELINE_QUICK_COLOR_SIDEBAR_RATIO);
  }

  return DEFAULT_TIMELINE_QUICK_COLOR_SIDEBAR_RATIO;
};
