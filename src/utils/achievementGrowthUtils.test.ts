/**
 * @file achievementGrowthUtils.test.ts
 * @input Fixed achievement rules, logs, and character attributes
 * @output Regression coverage for character growth experience and level calculations
 * @pos Test (Achievement)
 * @description Covers proportional fixed-rule attribute experience, deleted-attribute aggregation, and the cumulative level curve.
 * @updated 2026-08-12: Added negative attribute experience and zero-clamped visual level regression coverage.
 * @updated 2026-08-11: Added proportional daily experience, multi-attribute effects, and attribute deletion reference regression coverage.
 */

import { describe, expect, it } from 'vitest';
import type { AchievementAttribute, AchievementRule, Log } from '../types';
import {
  calculateAchievementAttributeExperience,
  calculateAchievementTotalExperience,
  computeAchievementGrowthDailySnapshot,
  getAchievementAttributeReferencingRules,
  getAchievementExperienceRequiredForLevel,
  getAchievementLevelProgress,
  getAchievementTotalExperienceRequiredForLevel,
  getAchievementTotalLevelProgress
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

const hiddenAttribute: AchievementAttribute = {
  ...attribute,
  id: 'attribute-willpower',
  name: '意志',
  enabled: false,
  sortOrder: 1
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
      deltaExp: 25
    });
    expect(snapshot.attributeChanges[0]?.ruleBreakdown[0]).toMatchObject({
      matchedValue: 75,
      appliedUnits: 2.5,
      expPerUnit: 10,
      deltaExp: 25
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
      [attribute.id]: 50
    });
    expect(calculateAchievementTotalExperience([first, second])).toBe(50);
  });

  it('floors proportional experience once for each daily rule', () => {
    const halfUnitRule: AchievementRule = {
      ...rule,
      unitAmount: 60
    };
    const halfUnitLog: Log = {
      ...log,
      duration: 30 * 60
    };

    const snapshot = computeAchievementGrowthDailySnapshot(
      '2026-08-09',
      [halfUnitLog],
      [],
      [],
      [halfUnitRule],
      [attribute]
    );

    expect(snapshot.attributeChanges[0]).toMatchObject({ deltaExp: 5 });
    expect(snapshot.attributeChanges[0]?.ruleBreakdown[0]).toMatchObject({
      appliedUnits: 0.5,
      deltaExp: 5
    });
  });

  it('applies independent experience values to multiple attributes, including hidden attributes', () => {
    const multiAttributeRule: AchievementRule = {
      ...rule,
      attributeEffects: [
        { attributeId: attribute.id, expPerUnit: 10 },
        { attributeId: hiddenAttribute.id, expPerUnit: 4 }
      ],
      attributeEffect: undefined
    };

    const snapshot = computeAchievementGrowthDailySnapshot(
      '2026-08-09',
      [log],
      [],
      [],
      [multiAttributeRule],
      [attribute, hiddenAttribute]
    );

    expect(snapshot.attributeChanges).toHaveLength(2);
    expect(snapshot.attributeChanges).toEqual(expect.arrayContaining([
      expect.objectContaining({ attributeId: attribute.id, deltaExp: 25 }),
      expect.objectContaining({ attributeId: hiddenAttribute.id, deltaExp: 10 })
    ]));
    expect(calculateAchievementTotalExperience([snapshot], [attribute, hiddenAttribute])).toBe(35);
  });

  it('keeps negative attribute experience for future recovery while clamping the displayed level to zero', () => {
    const lossRule: AchievementRule = {
      ...rule,
      attributeEffects: [{ attributeId: attribute.id, expPerUnit: 10, direction: 'loss' }],
      attributeEffect: undefined
    };
    const snapshot = computeAchievementGrowthDailySnapshot(
      '2026-08-09',
      [log],
      [],
      [],
      [lossRule],
      [attribute]
    );

    expect(snapshot.attributeChanges[0]).toMatchObject({ deltaExp: -25 });
    expect(calculateAchievementAttributeExperience([snapshot], [attribute])).toEqual({ [attribute.id]: -25 });
    expect(calculateAchievementTotalExperience([snapshot], [attribute])).toBe(-25);
    expect(getAchievementLevelProgress(-25)).toMatchObject({ level: 1, currentExperience: 0, progress: 0 });
  });

  it('treats deleted attributes as unowned historical experience', () => {
    const snapshot = computeAchievementGrowthDailySnapshot(
      '2026-08-09',
      [log],
      [],
      [],
      [rule],
      [attribute]
    );

    expect(calculateAchievementAttributeExperience([snapshot], [])).toEqual({});
    expect(calculateAchievementTotalExperience([snapshot], [])).toBe(0);
  });

  it('finds disabled and enabled rules that still reference an attribute', () => {
    expect(getAchievementAttributeReferencingRules([
      rule,
      { ...rule, id: 'rule-disabled', enabled: false }
    ], attribute.id)).toHaveLength(2);
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

  it('uses a fixed five-attribute threshold for the total character level', () => {
    expect(getAchievementTotalExperienceRequiredForLevel(2)).toBe(500);
    expect(getAchievementTotalExperienceRequiredForLevel(3)).toBe(1500);
    expect(getAchievementTotalLevelProgress(499)).toMatchObject({ level: 1, nextLevelExperience: 500 });
    expect(getAchievementTotalLevelProgress(500)).toMatchObject({ level: 2, currentExperience: 0, nextLevelExperience: 1500 });
  });
});
