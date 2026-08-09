/**
 * @file achievementGrowthUtils.test.ts
 * @input Fixed achievement rules, logs, and character attributes
 * @output Regression coverage for character growth experience and level calculations
 * @pos Test (Achievement)
 * @description Covers fixed-rule attribute experience accumulation and the cumulative level curve.
 * @updated 2026-08-09: Added initial character growth calculation tests.
 */

import { describe, expect, it } from 'vitest';
import type { AchievementAttribute, AchievementRule, Log } from '../types';
import {
  calculateAchievementAttributeExperience,
  calculateAchievementTotalExperience,
  computeAchievementGrowthDailySnapshot,
  getAchievementExperienceRequiredForLevel,
  getAchievementLevelProgress
} from './achievementUtils';

const attribute: AchievementAttribute = {
  id: 'attribute-intellect',
  name: '智识',
  subtitle: 'INTELLECT',
  icon: 'BookOpen',
  color: '#7D9687',
  enabled: true,
  sortOrder: 0,
  createdAt: 0,
  updatedAt: 0
};

const rule: AchievementRule = {
  id: 'rule-reading',
  name: '阅读时长',
  enabled: true,
  effectType: 'earn',
  targetType: 'activity',
  targetIds: ['activity-reading'],
  unitAmount: 30,
  deltaPerUnit: 1,
  attributeEffect: {
    attributeId: attribute.id,
    expPerUnit: 10
  },
  roundingMode: 'floor',
  createdAt: 0,
  updatedAt: 0
};

const log: Log = {
  id: 'log-reading',
  activityId: 'activity-reading',
  categoryId: 'category-reading',
  startTime: new Date('2026-08-09T09:00:00+08:00').getTime(),
  endTime: new Date('2026-08-09T10:15:00+08:00').getTime(),
  duration: 75 * 60
};

describe('achievement character growth', () => {
  it('converts matched rule units into positive integer attribute experience', () => {
    const snapshot = computeAchievementGrowthDailySnapshot(
      '2026-08-09',
      [log],
      [],
      [],
      [rule],
      [attribute]
    );

    expect(snapshot.attributeChanges).toHaveLength(1);
    expect(snapshot.attributeChanges[0]).toMatchObject({
      attributeId: attribute.id,
      deltaExp: 20
    });
    expect(snapshot.attributeChanges[0]?.ruleBreakdown[0]).toMatchObject({
      matchedValue: 75,
      appliedUnits: 2,
      expPerUnit: 10,
      deltaExp: 20
    });
  });

  it('sums attribute and total experience independently from star snapshots', () => {
    const first = computeAchievementGrowthDailySnapshot(
      '2026-08-09',
      [log],
      [],
      [],
      [rule],
      [attribute]
    );
    const second = {
      ...first,
      id: 'growth-2',
      date: '2026-08-10'
    };

    expect(calculateAchievementAttributeExperience([first, second], [attribute])).toEqual({
      [attribute.id]: 40
    });
    expect(calculateAchievementTotalExperience([first, second])).toBe(40);
  });

  it('uses a cumulative quadratic level curve without a maximum level', () => {
    expect(getAchievementExperienceRequiredForLevel(1)).toBe(0);
    expect(getAchievementExperienceRequiredForLevel(2)).toBe(100);
    expect(getAchievementExperienceRequiredForLevel(3)).toBe(300);
    expect(getAchievementLevelProgress(0)).toMatchObject({
      level: 1,
      currentExperience: 0,
      nextLevelExperience: 100,
      progress: 0
    });
    expect(getAchievementLevelProgress(350)).toMatchObject({
      level: 3,
      currentExperience: 50,
      nextLevelExperience: 600
    });
  });
});
