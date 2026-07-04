import { describe, expect, it } from 'vitest';
import {
  calculateAchievementAvailableStars,
  getAchievementActiveStartDate,
  getAchievementSealBlockedReason,
  getAchievementSealPreview,
  computeAchievementDailySnapshot,
  formatAchievementSignedStars,
  formatAchievementStars,
  getAchievementRenderableStarCount,
  normalizeAchievementRedemptionRecordFunding,
  normalizeAchievementRule,
  normalizeAchievementStarValue,
  partitionAchievementRedemptionsForSeal
} from './achievementUtils';
import type { AchievementRule, CheckStreakConfig, CheckTemplate, DailyReview, Log, TodoItem } from '../types';

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

  it('matches filter-duration rules via the shared filter expression logic', () => {
    const rules: AchievementRule[] = [
      {
        id: 'rule-filter-1',
        name: '阅读学习筛选',
        enabled: true,
        effectType: 'earn',
        targetType: 'filterDuration',
        targetIds: [],
        filterExpression: '#阅读 %学习',
        unitAmount: 30,
        deltaPerUnit: 1,
        roundingMode: 'floor',
        createdAt: 0,
        updatedAt: 0
      }
    ];
    const logs: Log[] = [
      {
        id: 'log-filter-1',
        activityId: 'activity-read',
        categoryId: 'category-read',
        startTime: new Date('2026-03-28T09:00:00+08:00').getTime(),
        endTime: new Date('2026-03-28T09:50:00+08:00').getTime(),
        duration: 50 * 60,
        scopeIds: ['scope-study']
      },
      {
        id: 'log-filter-2',
        activityId: 'activity-read',
        categoryId: 'category-read',
        startTime: new Date('2026-03-28T10:00:00+08:00').getTime(),
        endTime: new Date('2026-03-28T10:20:00+08:00').getTime(),
        duration: 20 * 60,
        scopeIds: ['scope-life']
      }
    ];

    const snapshot = computeAchievementDailySnapshot(
      '2026-03-28',
      logs,
      [],
      [],
      rules,
      {
        categories: [
          {
            id: 'category-read',
            name: '阅读',
            icon: 'Book',
            color: 'bg-stone-100 text-stone-700',
            themeColor: '#a8a29e',
            activities: [
              {
                id: 'activity-read',
                name: '读书',
                icon: 'Book',
                color: 'bg-stone-100 text-stone-700'
              }
            ]
          }
        ],
        scopes: [
          {
            id: 'scope-study',
            name: '学习',
            icon: 'Brain',
            isArchived: false,
            order: 0,
            themeColor: '#e7e5e4'
          },
          {
            id: 'scope-life',
            name: '生活',
            icon: 'Home',
            isArchived: false,
            order: 1,
            themeColor: '#d6d3d1'
          }
        ],
        todos: [],
        todoCategories: []
      }
    );

    expect(snapshot.netDelta).toBe(1.7);
    expect(snapshot.ruleBreakdown[0]).toMatchObject({
      targetType: 'filterDuration',
      matchedValue: 50,
      appliedUnits: 1.7,
      filterExpression: '#阅读 %学习'
    });
  });

  it('normalizes legacy redemption records into explicit carryover and live funding', () => {
    expect(normalizeAchievementRedemptionRecordFunding({
      id: 'redeem-1',
      rewardId: 'reward-1',
      rewardName: 'Tea',
      cost: 10,
      redeemedAt: 1,
      paidFromCarryover: 3
    })).toMatchObject({
      cost: 10,
      paidFromCarryover: 3,
      paidFromLiveStars: 7
    });
  });

  it('adds shattered bottle returns back into the active bottle while ignoring seal actions', () => {
    expect(calculateAchievementAvailableStars(
      [
        {
          id: 'snapshot-1',
          date: '2026-04-01',
          netDelta: 3,
          ruleBreakdown: [],
          computedAt: 1
        },
        {
          id: 'snapshot-2',
          date: '2026-04-02',
          netDelta: 2,
          ruleBreakdown: [],
          computedAt: 2
        }
      ],
      [
        {
          id: 'redeem-1',
          rewardId: 'reward-1',
          rewardName: 'Movie',
          cost: 1,
          redeemedAt: 3
        }
      ],
      [
        {
          id: 'action-1',
          bottleId: 'bottle-1',
          actionType: 'seal',
          amount: 4,
          occurredAt: 4
        },
        {
          id: 'action-2',
          bottleId: 'bottle-1',
          actionType: 'shatter',
          amount: 2.5,
          occurredAt: 5
        }
      ]
    )).toBe(6.5);
  });

  it('preserves the remaining carryover balance after carryover-funded redemptions are archived out of the live ledger', () => {
    expect(calculateAchievementAvailableStars(
      [],
      [],
      [
        {
          id: 'action-1',
          bottleId: 'bottle-1',
          actionType: 'shatter',
          amount: 3000,
          occurredAt: 1
        }
      ],
      1000
    )).toBe(1000);
  });

  it('excludes carryover-funded redemption cost from the sealable live balance', () => {
    const preview = getAchievementSealPreview({
      achievementStartDate: '2026-04-01',
      archivedBottles: [],
      dailySnapshots: [
        {
          id: 'snapshot-1',
          date: '2026-04-01',
          netDelta: 1000,
          ruleBreakdown: [],
          computedAt: 1
        }
      ],
      redemptionRecords: [
        {
          id: 'redeem-1',
          rewardId: 'reward-1',
          rewardName: 'Tea',
          cost: 700,
          redeemedAt: new Date('2026-04-01T12:00:00+08:00').getTime(),
          paidFromCarryover: 300,
          paidFromLiveStars: 400
        }
      ],
      today: new Date('2026-04-02T12:00:00+08:00')
    });

    expect(preview?.sealableStars).toBe(600);
    expect(preview?.spentStars).toBe(700);
  });

  it('archives only the live-funded portion of mixed redemptions during sealing', () => {
    const result = partitionAchievementRedemptionsForSeal({
      startDate: '2026-04-01',
      endDate: '2026-04-02',
      redemptionRecords: [
        {
          id: 'redeem-1',
          rewardId: 'reward-1',
          rewardName: 'Tea',
          cost: 1000,
          redeemedAt: new Date('2026-04-01T12:00:00+08:00').getTime(),
          paidFromCarryover: 300,
          paidFromLiveStars: 700
        }
      ]
    });

    expect(result.archivedRecords).toEqual([
      expect.objectContaining({
        sourceRecordId: 'redeem-1',
        cost: 700,
        paidFromCarryover: 0,
        paidFromLiveStars: 700
      })
    ]);

    expect(result.remainingActiveRecords).toEqual([
      expect.objectContaining({
        sourceRecordId: 'redeem-1',
        cost: 300,
        paidFromCarryover: 300,
        paidFromLiveStars: 0
      })
    ]);
  });

  it('keeps pure carryover redemptions active when sealing a period', () => {
    const result = partitionAchievementRedemptionsForSeal({
      startDate: '2026-04-01',
      endDate: '2026-04-02',
      redemptionRecords: [
        {
          id: 'redeem-1',
          rewardId: 'reward-1',
          rewardName: 'Tea',
          cost: 2000,
          redeemedAt: new Date('2026-04-01T12:00:00+08:00').getTime(),
          paidFromCarryover: 2000,
          paidFromLiveStars: 0
        }
      ]
    });

    expect(result.archivedRecords).toEqual([]);
    expect(result.remainingActiveRecords).toEqual([
      expect.objectContaining({
        sourceRecordId: 'redeem-1',
        cost: 2000,
        paidFromCarryover: 2000,
        paidFromLiveStars: 0
      })
    ]);
  });

  it('builds the fixed seal preview from the day after the last sealed bottle through yesterday', () => {
    const preview = getAchievementSealPreview({
      achievementStartDate: '2026-04-01',
      archivedBottles: [
        {
          id: 'archive-1',
          collectionId: 'default-bottle-01',
          collectionName: '旧瓶',
          sealedAmount: 5,
          earnedStars: 6,
          spentStars: 1,
          periodStartDate: '2026-04-01',
          periodEndDate: '2026-04-02',
          status: 'sealed',
          sealedAt: 10,
          dailySnapshots: [],
          redemptionRecords: []
        }
      ],
      dailySnapshots: [
        {
          id: 'snapshot-3',
          date: '2026-04-03',
          netDelta: 5,
          ruleBreakdown: [],
          computedAt: 11
        },
        {
          id: 'snapshot-4',
          date: '2026-04-04',
          netDelta: -1,
          ruleBreakdown: [],
          computedAt: 12
        },
        {
          id: 'snapshot-5',
          date: '2026-04-05',
          netDelta: 2,
          ruleBreakdown: [],
          computedAt: 13
        },
        {
          id: 'snapshot-6',
          date: '2026-04-06',
          netDelta: 9,
          ruleBreakdown: [],
          computedAt: 14
        }
      ],
      redemptionRecords: [
        {
          id: 'redeem-2',
          rewardId: 'reward-2',
          rewardName: 'Tea',
          cost: 2,
          redeemedAt: new Date('2026-04-04T12:00:00+08:00').getTime()
        },
        {
          id: 'redeem-3',
          rewardId: 'reward-3',
          rewardName: 'Snack',
          cost: 1,
          redeemedAt: new Date('2026-04-06T12:00:00+08:00').getTime()
        }
      ],
      today: new Date('2026-04-06T22:00:00+08:00')
    });

    expect(preview).toEqual({
      startDate: '2026-04-03',
      endDate: '2026-04-05',
      earnedStars: 7,
      spentStars: 3,
      sealableStars: 4,
      snapshotIds: ['snapshot-3', 'snapshot-4', 'snapshot-5'],
      redemptionRecordIds: ['redeem-2']
    });
  });

  it('blocks sealing when the current available stars are negative even if the period preview is positive', () => {
    const sealPreview = getAchievementSealPreview({
      achievementStartDate: '2026-04-01',
      archivedBottles: [],
      dailySnapshots: [
        {
          id: 'snapshot-1',
          date: '2026-04-01',
          netDelta: 5,
          ruleBreakdown: [],
          computedAt: 1
        }
      ],
      redemptionRecords: [],
      today: new Date('2026-04-02T12:00:00+08:00')
    });

    expect(sealPreview?.sealableStars).toBe(5);
    expect(getAchievementSealBlockedReason({
      sealPreview,
      availableStars: -0.1
    })).toBe('当前光点为负，暂时不能封瓶');
  });

  it('moves the live snapshot start date to the day after the latest archived bottle', () => {
    expect(getAchievementActiveStartDate(
      '2026-04-01',
      [
        {
          id: 'archive-1',
          collectionId: 'default-bottle-01',
          collectionName: '旧瓶',
          sealedAmount: 5,
          earnedStars: 6,
          spentStars: 1,
          periodStartDate: '2026-04-01',
          periodEndDate: '2026-04-02',
          status: 'sealed',
          sealedAt: 10,
          dailySnapshots: [],
          redemptionRecords: []
        },
        {
          id: 'archive-2',
          collectionId: 'default-bottle-02',
          collectionName: '新瓶',
          sealedAmount: 4,
          earnedStars: 5,
          spentStars: 1,
          periodStartDate: '2026-04-03',
          periodEndDate: '2026-04-05',
          status: 'shattered',
          sealedAt: 20,
          dailySnapshots: [],
          redemptionRecords: []
        }
      ]
    )).toBe('2026-04-06');
  });

  it('weights check-category completion by per-item streak multipliers when the category toggle is enabled', () => {
    const rules: AchievementRule[] = [
      {
        id: 'rule-check-1',
        name: 'Morning checks',
        enabled: true,
        effectType: 'earn',
        targetType: 'checkCategory',
        targetIds: ['Morning'],
        useCheckStreakMultiplier: true,
        unitAmount: 1,
        deltaPerUnit: 1,
        roundingMode: 'floor',
        createdAt: 0,
        updatedAt: 0
      }
    ];
    const checkTemplates: CheckTemplate[] = [
      {
        id: 'template-morning',
        title: 'Morning',
        items: [
          { id: 'drink-water', content: 'Drink water', type: 'manual', manualMode: 'binary' },
          { id: 'stretch', content: 'Stretch', type: 'manual', manualMode: 'binary' }
        ],
        enabled: true,
        order: 0,
        isDaily: true
      } as CheckTemplate
    ];
    const checkStreakConfig: CheckStreakConfig = {
      enabled: true,
      tiers: [
        { thresholdDays: 2, multiplier: 1.2 },
        { thresholdDays: 3, multiplier: 1.5 }
      ]
    };
    const dailyReviews: DailyReview[] = [
      {
        id: 'review-1',
        date: '2026-03-26',
        createdAt: 1,
        updatedAt: 1,
        answers: [],
        checkItems: [
          { id: 'drink-water', category: 'Morning', content: 'Drink water', isCompleted: true, type: 'manual', manualMode: 'binary', currentCount: 1, targetCount: 1 }
        ]
      },
      {
        id: 'review-2',
        date: '2026-03-27',
        createdAt: 2,
        updatedAt: 2,
        answers: [],
        checkItems: [
          { id: 'drink-water', category: 'Morning', content: 'Drink water', isCompleted: true, type: 'manual', manualMode: 'binary', currentCount: 1, targetCount: 1 },
          { id: 'stretch', category: 'Morning', content: 'Stretch', isCompleted: true, type: 'manual', manualMode: 'binary', currentCount: 1, targetCount: 1 }
        ]
      },
      {
        id: 'review-3',
        date: '2026-03-28',
        createdAt: 3,
        updatedAt: 3,
        answers: [],
        checkItems: [
          { id: 'drink-water', category: 'Morning', content: 'Drink water', isCompleted: true, type: 'manual', manualMode: 'binary', currentCount: 1, targetCount: 1 },
          { id: 'stretch', category: 'Morning', content: 'Stretch', isCompleted: true, type: 'manual', manualMode: 'binary', currentCount: 1, targetCount: 1 }
        ]
      }
    ];

    const snapshot = computeAchievementDailySnapshot(
      '2026-03-28',
      [],
      [],
      dailyReviews,
      rules,
      {
        categories: [],
        scopes: [],
        todos: [],
        todoCategories: [],
        checkTemplates,
        checkStreakConfig
      }
    );

    expect(snapshot.netDelta).toBe(2.7);
    expect(snapshot.ruleBreakdown[0]).toMatchObject({
      targetType: 'checkCategory',
      matchedValue: 2.7,
      appliedUnits: 2.7,
      delta: 2.7
    });
  });
});
