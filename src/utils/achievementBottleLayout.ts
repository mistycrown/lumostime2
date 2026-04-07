/**
 * @file achievementBottleLayout.ts
 * @input Bottle chamber size, star radius, and randomized spawn hints
 * @output Stable in-bounds spawn coordinates for achievement bottle items
 * @pos Utility (Achievement Bottle Layout)
 * @description Prevents low-count bottle items from spawning outside the visible chamber on mobile.
 *
 * @updated 2026-04-07: Clamp spawn points to the chamber bounds and reduce low-count vertical jitter so 3 stars do not render as 1 visible icon.
 */

interface AchievementBottleSpawnPointInput {
  index: number;
  visibleCount: number;
  width: number;
  height: number;
  starRadius: number;
  padding: number;
  randomX: number;
  randomY: number;
}

const clamp = (value: number, min: number, max: number): number => (
  Math.min(max, Math.max(min, value))
);

export const getAchievementBottleSpawnPoint = ({
  index,
  visibleCount,
  width,
  height,
  starRadius,
  padding,
  randomX,
  randomY
}: AchievementBottleSpawnPointInput) => {
  const innerMinX = padding + starRadius - 2;
  const innerMaxX = width - padding - starRadius + 2;
  const innerMinY = padding + starRadius;
  const innerMaxY = height - padding - starRadius;
  const spreadWidth = Math.max(0, innerMaxX - innerMinX);
  const spreadHeight = Math.max(0, innerMaxY - innerMinY);
  const normalizedIndex = visibleCount <= 1 ? 0.5 : (index / (visibleCount - 1));
  const baseX = innerMinX + (spreadWidth * normalizedIndex);
  const baseY = innerMinY + (spreadHeight * normalizedIndex);
  const jitterLimitX = Math.min(22, spreadWidth / Math.max(3, visibleCount * 1.35));
  const jitterLimitY = Math.min(18, spreadHeight / Math.max(6, visibleCount * 3));

  return {
    x: clamp(
      baseX + ((randomX - 0.5) * jitterLimitX * 2),
      innerMinX,
      innerMaxX
    ),
    y: clamp(
      baseY + ((randomY - 0.5) * jitterLimitY * 2),
      innerMinY,
      innerMaxY
    )
  };
};
