/**
 * @file AchievementContext.tsx
 * @description Manages achievement bottle data, daily snapshots, rewards, collectible bottles, and redemption records with repository hydration and selective recent-day recomputation.
 * @updated 2026-03-29: Added single-day snapshot recomputation so a daily record can be recalculated from the current rule set on demand.
 */
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { dataRepository } from '../repositories/dataRepository';
import {
  AchievementCollection,
  AchievementCollectionRecord,
  AchievementDailySnapshot,
  AchievementMeta,
  AchievementRedemptionRecord,
  AchievementReward,
  AchievementRule
} from '../types';
import {
  calculateAchievementAvailableStars,
  calculateAchievementTotalEarned,
  calculateAchievementTotalRedeemed,
  computeAchievementDailySnapshot,
  enumerateAchievementDates,
  getAchievementYesterday,
  normalizeAchievementStarValue,
  normalizeAchievementRule,
  normalizeAchievementSnapshot,
  sortAchievementSnapshots
} from '../utils/achievementUtils';
import { getLocalDateStr } from '../utils/dateUtils';
import {
  isLocalDataTimestampUpdateLocked,
  updateLocalDataTimestamp
} from '../utils/localDataTimestamp';
import { useData } from './DataContext';
import { useReview } from './ReviewContext';

interface CreateAchievementRuleInput {
  name: string;
  effectType: 'earn' | 'spend';
  targetType: AchievementRule['targetType'];
  targetIds: string[];
  unitAmount: number;
  deltaPerUnit: number;
  note?: string;
}

interface CreateAchievementRewardInput {
  name: string;
  cost: number;
  description?: string;
  icon?: string;
}

interface CreateAchievementCollectionInput {
  name: string;
  cost: number;
  imagePath?: string;
  description?: string;
}

interface AchievementContextType {
  isReady: boolean;
  achievementStartDate: string | null;
  rules: AchievementRule[];
  rewards: AchievementReward[];
  collections: AchievementCollection[];
  dailySnapshots: AchievementDailySnapshot[];
  redemptionRecords: AchievementRedemptionRecord[];
  collectionRecords: AchievementCollectionRecord[];
  availableStars: number;
  totalEarnedStars: number;
  totalRedeemedStars: number;
  ensureRecentSnapshots: () => Promise<void>;
  recomputeSnapshotForDate: (date: string) => { ok: boolean; message?: string };
  createRule: (input: CreateAchievementRuleInput) => void;
  updateRule: (rule: AchievementRule) => void;
  deleteRule: (ruleId: string) => void;
  createReward: (input: CreateAchievementRewardInput) => void;
  updateReward: (reward: AchievementReward) => void;
  deleteReward: (rewardId: string) => void;
  redeemReward: (reward: AchievementReward, note?: string) => { ok: boolean; message?: string };
  createCollection: (input: CreateAchievementCollectionInput) => void;
  updateCollection: (collection: AchievementCollection) => void;
  deleteCollection: (collectionId: string) => void;
  redeemCollection: (collection: AchievementCollection, note?: string) => { ok: boolean; message?: string };
  deleteRedemptionRecord: (recordId: string) => void;
  deleteCollectionRecord: (recordId: string) => void;
}

const achievementContextStore = globalThis as typeof globalThis & {
  __lumostimeAchievementContext__?: React.Context<AchievementContextType | undefined>;
};

const AchievementContext = achievementContextStore.__lumostimeAchievementContext__
  ?? createContext<AchievementContextType | undefined>(undefined);

AchievementContext.displayName = 'AchievementContext';
achievementContextStore.__lumostimeAchievementContext__ = AchievementContext;

const normalizeReward = (reward: AchievementReward): AchievementReward => ({
  ...reward,
  cost: Math.max(0.1, normalizeAchievementStarValue(reward.cost || 0.1)),
  description: reward.description?.trim() || undefined,
  icon: reward.icon?.trim() || undefined
});

const normalizeCollection = (collection: AchievementCollection): AchievementCollection => ({
  ...collection,
  cost: Math.max(0.1, normalizeAchievementStarValue(collection.cost || 0.1)),
  imagePath: collection.imagePath?.trim() || undefined,
  description: collection.description?.trim() || undefined
});

const normalizeRedemptionRecord = (record: AchievementRedemptionRecord): AchievementRedemptionRecord => ({
  ...record,
  cost: Math.max(0.1, normalizeAchievementStarValue(record.cost || 0.1)),
  note: record.note?.trim() || undefined
});

const normalizeCollectionRecord = (record: AchievementCollectionRecord): AchievementCollectionRecord => ({
  ...record,
  cost: Math.max(0.1, normalizeAchievementStarValue(record.cost || 0.1)),
  imagePath: record.imagePath?.trim() || undefined,
  note: record.note?.trim() || undefined
});

export const useAchievement = () => {
  const context = useContext(AchievementContext);
  if (!context) {
    throw new Error('useAchievement must be used within an AchievementProvider');
  }
  return context;
};

export const AchievementProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { logs, todos } = useData();
  const { dailyReviews } = useReview();
  const [isReady, setIsReady] = useState(false);
  const [canPersist, setCanPersist] = useState(false);
  const isHydratingRef = useRef(true);

  const [meta, setMeta] = useState<AchievementMeta>({ achievementStartDate: null });
  const [rules, setRules] = useState<AchievementRule[]>([]);
  const [rewards, setRewards] = useState<AchievementReward[]>([]);
  const [collections, setCollections] = useState<AchievementCollection[]>([]);
  const [dailySnapshots, setDailySnapshots] = useState<AchievementDailySnapshot[]>([]);
  const [redemptionRecords, setRedemptionRecords] = useState<AchievementRedemptionRecord[]>([]);
  const [collectionRecords, setCollectionRecords] = useState<AchievementCollectionRecord[]>([]);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      let hydratedSuccessfully = false;

      try {
        const snapshot = await dataRepository.loadAchievementSnapshot();
        if (cancelled) {
          return;
        }

        hydratedSuccessfully = true;
        setMeta(snapshot.meta);
        setRules(snapshot.rules.map(normalizeAchievementRule));
        setRewards(snapshot.rewards.map(normalizeReward));
        setCollections(snapshot.collections.map(normalizeCollection));
        setDailySnapshots(sortAchievementSnapshots(snapshot.dailySnapshots.map(normalizeAchievementSnapshot)));
        setRedemptionRecords(snapshot.redemptionRecords.map(normalizeRedemptionRecord));
        setCollectionRecords(snapshot.collectionRecords.map(normalizeCollectionRecord));
      } catch (error) {
        console.error('[AchievementContext] Failed to hydrate achievement data', error);
      } finally {
        if (!cancelled) {
          setCanPersist(hydratedSuccessfully);
          setIsReady(true);
          window.setTimeout(() => {
            if (!cancelled) {
              isHydratingRef.current = false;
            }
          }, 0);
        }
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  const reconcileSnapshots = (
    startDate: string,
    baseSnapshots: AchievementDailySnapshot[],
    rulesSource: AchievementRule[]
  ): AchievementDailySnapshot[] => {
    const today = getLocalDateStr(new Date());
    const yesterday = getAchievementYesterday();
    const snapshotMap = new Map(baseSnapshots.map((item) => [item.date, item]));
    const dates = enumerateAchievementDates(startDate, today);

    const nextSnapshots = dates.map((date) => {
      const existing = snapshotMap.get(date);
      const shouldRecompute = !existing || date === today || date === yesterday;

      if (!shouldRecompute && existing) {
        return normalizeAchievementSnapshot(existing);
      }

      const computed = computeAchievementDailySnapshot(date, logs, todos, dailyReviews, rulesSource);
      if (existing) {
        computed.id = existing.id;
      }
      return computed;
    });

    return sortAchievementSnapshots(nextSnapshots);
  };

  const ensureRecentSnapshots = async () => {
    const today = getLocalDateStr(new Date());
    const startDate = meta.achievementStartDate || today;

    if (!meta.achievementStartDate) {
      setMeta({ achievementStartDate: startDate });
    }

    setDailySnapshots((previous) => reconcileSnapshots(startDate, previous, rules));
  };

  const recomputeSnapshotForDate = (date: string) => {
    const normalizedDate = date.trim();

    if (!normalizedDate) {
      return {
        ok: false,
        message: '缺少需要重新计算的日期'
      };
    }

    setDailySnapshots((previous) => {
      const existingSnapshot = previous.find((item) => item.date === normalizedDate);
      const recomputedSnapshot = computeAchievementDailySnapshot(
        normalizedDate,
        logs,
        todos,
        dailyReviews,
        rules
      );

      if (existingSnapshot) {
        recomputedSnapshot.id = existingSnapshot.id;
      }

      const nextSnapshots = existingSnapshot
        ? previous.map((item) => (item.date === normalizedDate ? recomputedSnapshot : item))
        : [...previous, recomputedSnapshot];

      return sortAchievementSnapshots(nextSnapshots);
    });

    return { ok: true };
  };

  const createRule = (input: CreateAchievementRuleInput) => {
    const now = Date.now();
    const nextRule: AchievementRule = {
      id: crypto.randomUUID(),
      name: input.name.trim() || '未命名规则',
      enabled: true,
      effectType: input.effectType,
      targetType: input.targetType,
      targetIds: input.targetIds,
      unitAmount: Math.max(1, Math.floor(input.unitAmount)),
      deltaPerUnit: Math.max(0.1, normalizeAchievementStarValue(input.deltaPerUnit || 0.1)),
      roundingMode: 'floor',
      note: input.note?.trim() || undefined,
      createdAt: now,
      updatedAt: now
    };

    const nextRules = [...rules, nextRule];
    setRules(nextRules);

    if (meta.achievementStartDate) {
      setDailySnapshots((previous) => reconcileSnapshots(meta.achievementStartDate!, previous, nextRules));
    }
  };

  const updateRule = (rule: AchievementRule) => {
    const nextRules = rules.map((item) => (
      item.id === rule.id
        ? {
          ...rule,
          name: rule.name.trim() || '未命名规则',
          unitAmount: Math.max(1, Math.floor(rule.unitAmount)),
          deltaPerUnit: Math.max(0.1, normalizeAchievementStarValue(rule.deltaPerUnit || 0.1)),
          updatedAt: Date.now()
        }
        : item
    ));

    setRules(nextRules);

    if (meta.achievementStartDate) {
      setDailySnapshots((previous) => reconcileSnapshots(meta.achievementStartDate!, previous, nextRules));
    }
  };

  const deleteRule = (ruleId: string) => {
    const nextRules = rules.filter((item) => item.id !== ruleId);
    setRules(nextRules);

    if (meta.achievementStartDate) {
      setDailySnapshots((previous) => reconcileSnapshots(meta.achievementStartDate!, previous, nextRules));
    }
  };

  const createReward = (input: CreateAchievementRewardInput) => {
    const now = Date.now();
    const nextReward: AchievementReward = {
      id: crypto.randomUUID(),
      name: input.name.trim() || '未命名奖励',
      cost: Math.max(0.1, normalizeAchievementStarValue(input.cost || 0.1)),
      description: input.description?.trim() || undefined,
      icon: input.icon?.trim() || undefined,
      enabled: true,
      createdAt: now,
      updatedAt: now
    };

    setRewards((previous) => [...previous, nextReward]);
  };

  const updateReward = (reward: AchievementReward) => {
    setRewards((previous) => previous.map((item) => (
      item.id === reward.id
        ? {
          ...reward,
          name: reward.name.trim() || '未命名奖励',
          cost: Math.max(0.1, normalizeAchievementStarValue(reward.cost || 0.1)),
          description: reward.description?.trim() || undefined,
          icon: reward.icon?.trim() || undefined,
          updatedAt: Date.now()
        }
        : item
    )));
  };

  const deleteReward = (rewardId: string) => {
    setRewards((previous) => previous.filter((item) => item.id !== rewardId));
  };

  const createCollection = (input: CreateAchievementCollectionInput) => {
    const now = Date.now();
    const nextCollection: AchievementCollection = {
      id: crypto.randomUUID(),
      name: input.name.trim() || '未命名收藏',
      cost: Math.max(0.1, normalizeAchievementStarValue(input.cost || 0.1)),
      imagePath: input.imagePath?.trim() || undefined,
      description: input.description?.trim() || undefined,
      enabled: true,
      createdAt: now,
      updatedAt: now
    };

    setCollections((previous) => [...previous, nextCollection]);
  };

  const updateCollection = (collection: AchievementCollection) => {
    setCollections((previous) => previous.map((item) => (
      item.id === collection.id
        ? {
          ...collection,
          name: collection.name.trim() || '未命名收藏',
          cost: Math.max(0.1, normalizeAchievementStarValue(collection.cost || 0.1)),
          imagePath: collection.imagePath?.trim() || undefined,
          description: collection.description?.trim() || undefined,
          updatedAt: Date.now()
        }
        : item
    )));
  };

  const deleteCollection = (collectionId: string) => {
    setCollections((previous) => previous.filter((item) => item.id !== collectionId));
  };

  const redeemReward = (reward: AchievementReward, note?: string) => {
    const currentAvailableStars = calculateAchievementAvailableStars(
      dailySnapshots,
      [...redemptionRecords, ...collectionRecords]
    );
    const normalizedRewardCost = Math.max(0.1, normalizeAchievementStarValue(reward.cost || 0.1));

    if (currentAvailableStars < normalizedRewardCost) {
      return {
        ok: false,
        message: '当前光点不足，暂时无法兑换'
      };
    }

    const nextRecord: AchievementRedemptionRecord = {
      id: crypto.randomUUID(),
      rewardId: reward.id,
      rewardName: reward.name,
      cost: normalizedRewardCost,
      redeemedAt: Date.now(),
      note: note?.trim() || undefined
    };

    setRedemptionRecords((previous) => [nextRecord, ...previous]);
    return { ok: true };
  };

  const redeemCollection = (collection: AchievementCollection, note?: string) => {
    const currentAvailableStars = calculateAchievementAvailableStars(
      dailySnapshots,
      [...redemptionRecords, ...collectionRecords]
    );
    const normalizedCollectionCost = Math.max(0.1, normalizeAchievementStarValue(collection.cost || 0.1));

    if (currentAvailableStars < normalizedCollectionCost) {
      return {
        ok: false,
        message: '当前光点不足，暂时无法兑换'
      };
    }

    const nextRecord: AchievementCollectionRecord = {
      id: crypto.randomUUID(),
      collectionId: collection.id,
      collectionName: collection.name,
      cost: normalizedCollectionCost,
      imagePath: collection.imagePath,
      redeemedAt: Date.now(),
      note: note?.trim() || undefined
    };

    setCollectionRecords((previous) => [nextRecord, ...previous]);
    return { ok: true };
  };

  const deleteRedemptionRecord = (recordId: string) => {
    setRedemptionRecords((previous) => previous.filter((item) => item.id !== recordId));
  };

  const deleteCollectionRecord = (recordId: string) => {
    setCollectionRecords((previous) => previous.filter((item) => item.id !== recordId));
  };

  const spendRecords = [...redemptionRecords, ...collectionRecords];
  const availableStars = calculateAchievementAvailableStars(dailySnapshots, spendRecords);
  const totalEarnedStars = calculateAchievementTotalEarned(dailySnapshots);
  const totalRedeemedStars = calculateAchievementTotalRedeemed(spendRecords);

  useEffect(() => {
    if (!isReady || !canPersist) {
      return;
    }

    void dataRepository.saveAchievementMeta(meta).catch((error) => {
      console.error('[AchievementContext] Failed to persist achievement meta', error);
    });
  }, [canPersist, isReady, meta]);

  useEffect(() => {
    if (!isReady || !canPersist) {
      return;
    }

    void dataRepository.saveAchievementRules(rules).catch((error) => {
      console.error('[AchievementContext] Failed to persist achievement rules', error);
    });
  }, [canPersist, isReady, rules]);

  useEffect(() => {
    if (!isReady || !canPersist) {
      return;
    }

    void dataRepository.saveAchievementRewards(rewards).catch((error) => {
      console.error('[AchievementContext] Failed to persist achievement rewards', error);
    });
  }, [canPersist, isReady, rewards]);

  useEffect(() => {
    if (!isReady || !canPersist) {
      return;
    }

    void dataRepository.saveAchievementCollections(collections).catch((error) => {
      console.error('[AchievementContext] Failed to persist achievement collections', error);
    });
  }, [canPersist, collections, isReady]);

  useEffect(() => {
    if (!isReady || !canPersist) {
      return;
    }

    void dataRepository.saveAchievementDailySnapshots(dailySnapshots).catch((error) => {
      console.error('[AchievementContext] Failed to persist achievement daily snapshots', error);
    });
  }, [canPersist, dailySnapshots, isReady]);

  useEffect(() => {
    if (!isReady || !canPersist) {
      return;
    }

    void dataRepository.saveAchievementRedemptionRecords(redemptionRecords).catch((error) => {
      console.error('[AchievementContext] Failed to persist achievement redemption records', error);
    });
  }, [canPersist, isReady, redemptionRecords]);

  useEffect(() => {
    if (!isReady || !canPersist) {
      return;
    }

    void dataRepository.saveAchievementCollectionRecords(collectionRecords).catch((error) => {
      console.error('[AchievementContext] Failed to persist achievement collection records', error);
    });
  }, [canPersist, collectionRecords, isReady]);

  useEffect(() => {
    if (!isReady || !canPersist || isHydratingRef.current) {
      return;
    }

    if (isLocalDataTimestampUpdateLocked()) {
      return;
    }

    updateLocalDataTimestamp();
  }, [canPersist, collectionRecords, collections, dailySnapshots, isReady, meta, redemptionRecords, rewards, rules]);

  return (
    <AchievementContext.Provider
      value={{
        isReady,
        achievementStartDate: meta.achievementStartDate,
        rules,
        rewards,
        collections,
        dailySnapshots,
        redemptionRecords,
        collectionRecords,
        availableStars,
        totalEarnedStars,
        totalRedeemedStars,
        ensureRecentSnapshots,
        recomputeSnapshotForDate,
        createRule,
        updateRule,
        deleteRule,
        createReward,
        updateReward,
        deleteReward,
        redeemReward,
        createCollection,
        updateCollection,
        deleteCollection,
        redeemCollection,
        deleteRedemptionRecord,
        deleteCollectionRecord
      }}
    >
      {children}
    </AchievementContext.Provider>
  );
};
