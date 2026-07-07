import { describe, expect, it } from 'vitest';

import type { AchievementSnapshot } from '../repositories/dataRepository';
import { achievementBackupService } from './achievementBackupService';

const createAchievementSnapshot = (): AchievementSnapshot => ({
  meta: {
    achievementStartDate: '2026-05-01',
    activeBottleCarryoverStars: 6,
    checkStreakConfig: {
      enabled: true,
      tiers: [
        { thresholdDays: 3, multiplier: 1.2 }
      ]
    }
  },
  rules: [
    {
      id: 'rule-1',
      name: 'Daily focus',
      enabled: true,
      effectType: 'earn',
      targetType: 'activity',
      targetIds: ['activity-1'],
      unitAmount: 60,
      deltaPerUnit: 1,
      roundingMode: 'floor',
      createdAt: 1,
      updatedAt: 2
    }
  ],
  rewards: [
    {
      id: 'reward-1',
      name: 'Coffee',
      cost: 3,
      enabled: true,
      createdAt: 3,
      updatedAt: 4
    }
  ],
  collections: [
    {
      id: 'collection-1',
      name: 'Glass bottle',
      cost: 5,
      imagePath: '/bottle/01.png',
      enabled: true,
      createdAt: 5,
      updatedAt: 6
    }
  ],
  dailySnapshots: [
    {
      id: 'snapshot-1',
      date: '2026-05-02',
      netDelta: 2,
      ruleBreakdown: [],
      computedAt: 7
    }
  ],
  redemptionRecords: [
    {
      id: 'redeem-1',
      rewardId: 'reward-1',
      rewardName: 'Coffee',
      cost: 3,
      redeemedAt: 8
    }
  ],
  collectionRecords: [
    {
      id: 'collection-record-1',
      collectionId: 'collection-1',
      collectionName: 'Glass bottle',
      cost: 5,
      imagePath: '/bottle/01.png',
      redeemedAt: 9
    }
  ],
  archivedBottles: [
    {
      id: 'archive-1',
      collectionId: 'collection-1',
      collectionName: 'Glass bottle',
      imagePath: '/bottle/01.png',
      periodStartDate: '2026-05-01',
      periodEndDate: '2026-05-10',
      earnedStars: 10,
      spentStars: 3,
      sealedAmount: 7,
      status: 'sealed',
      sealedAt: 10,
      dailySnapshots: [],
      redemptionRecords: []
    }
  ],
  bottleActionRecords: [
    {
      id: 'action-1',
      bottleId: 'archive-1',
      actionType: 'seal',
      amount: 7,
      occurredAt: 11
    }
  ]
});

describe('achievementBackupService', () => {
  it('round-trips a complete achievement snapshot through the unified backup payload', () => {
    const snapshot = createAchievementSnapshot();

    const payload = achievementBackupService.buildBackupPayload(snapshot);
    const restored = achievementBackupService.readBackupPayload(payload);

    expect(payload.version).toBe(1);
    expect(typeof payload.exportedAt).toBe('string');
    expect(restored).toEqual(snapshot);
  });

  it('ignores objects that do not contain any recognized achievement backup fields', () => {
    expect(achievementBackupService.readBackupPayload({ version: 1, exportedAt: '2026-05-18T00:00:00.000Z' })).toBeNull();
  });

  it('rebuilds missing carryover meta when reading an older backup with shattered bottles', () => {
    const restored = achievementBackupService.readBackupPayload({
      meta: {
        achievementStartDate: '2026-05-01'
      },
      redemptionRecords: [
        {
          id: 'redeem-1',
          rewardId: 'reward-1',
          rewardName: 'Coffee',
          cost: 2,
          redeemedAt: 8,
          paidFromCarryover: 2,
          paidFromLiveStars: 0
        }
      ],
      collectionRecords: [],
      archivedBottles: [
        {
          id: 'archive-1',
          collectionId: 'collection-1',
          collectionName: 'Glass bottle',
          periodStartDate: '2026-05-01',
          periodEndDate: '2026-05-10',
          earnedStars: 10,
          spentStars: 3,
          sealedAmount: 7,
          status: 'shattered',
          sealedAt: 10,
          shatteredAt: 11,
          dailySnapshots: [],
          redemptionRecords: []
        }
      ]
    });

    expect(restored?.meta.activeBottleCarryoverStars).toBe(5);
  });
});
