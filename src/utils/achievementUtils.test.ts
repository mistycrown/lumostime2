import { describe, expect, it } from 'vitest';
import {
  calculateAchievementAvailableStars,
  computeAchievementDailySnapshot,
  formatAchievementSignedStars,
  formatAchievementStars,
  getAchievementRenderableStarCount,
  normalizeAchievementRule,
  normalizeAchievementStarValue
} from './achievementUtils';
import type { AchievementRule, DailyReview, Log, TodoItem } from '../types';

describe('achievementUtils decimal stars', () => {
  it('normalizes decimal star values and floors only the rendered bottle count', () => {
    expect(normalizeAchievementStarValue(1.26)).toBe(1.3);
    expect(formatAchievementStars(2)).toBe('2.0');
    expect(formatAchievementSignedStars(0.4)).toBe('+0.4');
    expect(getAchievementRenderableStarCount(3.9)).toBe(3);
    expect(getAchievementRenderableStarCount(-1.2)).toBe(0);
  });

  it('keeps decimal rule deltas in daily snapshots and balance summaries', () => {
    const rules: AchievementRule[] = [
      {
        id: 'rule-1',
        name: 'Focus',
        enabled: true,
        effectType: 'earn',
        targetType: 'activity',
        targetIds: ['activity-1'],
        unitAmount: 30,
        deltaPerUnit: 0.5,
        roundingMode: 'floor',
        createdAt: 0,
        updatedAt: 0
      }
    ];
    const logs: Log[] = [
      {
        id: 'log-1',
        activityId: 'activity-1',
        categoryId: 'category-1',
        startTime: new Date('2026-03-28T09:00:00+08:00').getTime(),
        endTime: new Date('2026-03-28T09:47:00+08:00').getTime(),
        duration: 47 * 60
      }
    ];
    const todos: TodoItem[] = [];
    const dailyReviews: DailyReview[] = [];

    const snapshot = computeAchievementDailySnapshot('2026-03-28', logs, todos, dailyReviews, rules);

    expect(snapshot.netDelta).toBe(0.8);
    expect(snapshot.ruleBreakdown[0]?.deltaPerUnit).toBe(0.5);
    expect(snapshot.ruleBreakdown[0]?.appliedUnits).toBe(1.6);
    expect(calculateAchievementAvailableStars([snapshot], [{ id: 'redeem-1', rewardId: 'reward-1', rewardName: 'Movie', cost: 0.3, redeemedAt: 1 }])).toBe(0.5);
  });

  it('normalizes legacy rule deltas to one decimal place instead of flooring them to integers', () => {
    const legacyRule = normalizeAchievementRule({
      id: 'legacy-1',
      name: 'Legacy',
      enabled: true,
      effectType: 'earn',
      targetType: 'activity',
      targetIds: ['activity-1'],
      unitAmount: 30,
      deltaPerUnit: 0.26,
      roundingMode: 'floor',
      createdAt: 0,
      updatedAt: 0
    });

    expect(legacyRule.deltaPerUnit).toBe(0.3);
  });
});
