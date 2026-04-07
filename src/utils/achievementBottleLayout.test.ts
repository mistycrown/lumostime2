import { describe, expect, it } from 'vitest';
import { getAchievementBottleSpawnPoint } from './achievementBottleLayout';

describe('achievementBottleLayout', () => {
  it('keeps low-count spawn points inside the bottle chamber even at random extremes', () => {
    const width = 320;
    const height = 720;
    const starRadius = 14;
    const padding = 16;

    const topSpawn = getAchievementBottleSpawnPoint({
      index: 0,
      visibleCount: 3,
      width,
      height,
      starRadius,
      padding,
      randomX: 0,
      randomY: 0
    });
    const middleSpawn = getAchievementBottleSpawnPoint({
      index: 1,
      visibleCount: 3,
      width,
      height,
      starRadius,
      padding,
      randomX: 0.5,
      randomY: 0.5
    });
    const bottomSpawn = getAchievementBottleSpawnPoint({
      index: 2,
      visibleCount: 3,
      width,
      height,
      starRadius,
      padding,
      randomX: 1,
      randomY: 1
    });

    const minY = padding + starRadius;
    const maxY = height - padding - starRadius;

    expect(topSpawn.y).toBeGreaterThanOrEqual(minY);
    expect(topSpawn.y).toBeLessThanOrEqual(maxY);
    expect(middleSpawn.y).toBeGreaterThanOrEqual(minY);
    expect(middleSpawn.y).toBeLessThanOrEqual(maxY);
    expect(bottomSpawn.y).toBeGreaterThanOrEqual(minY);
    expect(bottomSpawn.y).toBeLessThanOrEqual(maxY);
  });

  it('keeps low-count spawns visually separated by assigning each index its own vertical band', () => {
    const width = 320;
    const height = 720;
    const starRadius = 14;
    const padding = 16;

    const first = getAchievementBottleSpawnPoint({
      index: 0,
      visibleCount: 3,
      width,
      height,
      starRadius,
      padding,
      randomX: 0.5,
      randomY: 0.5
    });
    const second = getAchievementBottleSpawnPoint({
      index: 1,
      visibleCount: 3,
      width,
      height,
      starRadius,
      padding,
      randomX: 0.5,
      randomY: 0.5
    });
    const third = getAchievementBottleSpawnPoint({
      index: 2,
      visibleCount: 3,
      width,
      height,
      starRadius,
      padding,
      randomX: 0.5,
      randomY: 0.5
    });

    expect(first.y).toBeLessThan(second.y);
    expect(second.y).toBeLessThan(third.y);
  });
});
