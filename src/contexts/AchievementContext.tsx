/**
 * @file AchievementContext.tsx
 * @description Manages achievement bottle data, daily snapshots, rewards, and redemption records with repository hydration and selective recent-day recomputation.
 * @updated 2026-03-28: Keep the context instance stable across Fast Refresh so updated consumers still connect to the mounted provider.
 */
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { dataRepository } from '../repositories/dataRepository';
import {
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
  normalizeAchievementRule,
  normalizeAchievementSnapshot,
  sortAchievementSnapshots
} from '../utils/achievementUtils';
import { getLocalDateStr } from '../utils/dateUtils';
import {
  getLocalDataTimestamp,
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

interface AchievementContextType {
  isReady: boolean;
  achievementStartDate: string | null;
  rules: AchievementRule[];
  rewards: AchievementReward[];
  dailySnapshots: AchievementDailySnapshot[];
  redemptionRecords: AchievementRedemptionRecord[];
  availableStars: number;
  totalEarnedStars: number;
  totalRedeemedStars: number;
  ensureRecentSnapshots: () => Promise<void>;
  createRule: (input: CreateAchievementRuleInput) => void;
  updateRule: (rule: AchievementRule) => void;
  deleteRule: (ruleId: string) => void;
  createReward: (input: CreateAchievementRewardInput) => void;
  updateReward: (reward: AchievementReward) => void;
  deleteReward: (rewardId: string) => void;
  redeemReward: (reward: AchievementReward, note?: string) => { ok: boolean; message?: string };
  deleteRedemptionRecord: (recordId: string) => void;
}

const achievementContextStore = globalThis as typeof globalThis & {
  __lumostimeAchievementContext__?: React.Context<AchievementContextType | undefined>;
};

// Reuse the same context object across module reloads to avoid provider/consumer
// mismatches while Vite Fast Refresh keeps the app tree mounted.
const AchievementContext = achievementContextStore.__lumostimeAchievementContext__
  ?? createContext<AchievementContextType | undefined>(undefined);

AchievementContext.displayName = 'AchievementContext';
achievementContextStore.__lumostimeAchievementContext__ = AchievementContext;

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
  const [dailySnapshots, setDailySnapshots] = useState<AchievementDailySnapshot[]>([]);
  const [redemptionRecords, setRedemptionRecords] = useState<AchievementRedemptionRecord[]>([]);

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
        setRewards(snapshot.rewards);
        setDailySnapshots(sortAchievementSnapshots(snapshot.dailySnapshots.map(normalizeAchievementSnapshot)));
        setRedemptionRecords(snapshot.redemptionRecords);
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
      deltaPerUnit: Math.max(1, Math.floor(input.deltaPerUnit)),
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
          deltaPerUnit: Math.max(1, Math.floor(rule.deltaPerUnit)),
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
      cost: Math.max(1, Math.floor(input.cost)),
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
          cost: Math.max(1, Math.floor(reward.cost)),
          updatedAt: Date.now()
        }
        : item
    )));
  };

  const deleteReward = (rewardId: string) => {
    setRewards((previous) => previous.filter((item) => item.id !== rewardId));
  };

  const redeemReward = (reward: AchievementReward, note?: string) => {
    const currentAvailableStars = calculateAchievementAvailableStars(dailySnapshots, redemptionRecords);
    if (currentAvailableStars < reward.cost) {
      return {
        ok: false,
        message: '当前光点不足，暂时无法兑换'
      };
    }

    const nextRecord: AchievementRedemptionRecord = {
      id: crypto.randomUUID(),
      rewardId: reward.id,
      rewardName: reward.name,
      cost: reward.cost,
      redeemedAt: Date.now(),
      note: note?.trim() || undefined
    };

    setRedemptionRecords((previous) => [nextRecord, ...previous]);
    return { ok: true };
  };

  const deleteRedemptionRecord = (recordId: string) => {
    setRedemptionRecords((previous) => previous.filter((item) => item.id !== recordId));
  };

  const availableStars = calculateAchievementAvailableStars(dailySnapshots, redemptionRecords);
  const totalEarnedStars = calculateAchievementTotalEarned(dailySnapshots);
  const totalRedeemedStars = calculateAchievementTotalRedeemed(redemptionRecords);

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
    if (!isReady || !canPersist || isHydratingRef.current) {
      return;
    }

    if (isLocalDataTimestampUpdateLocked()) {
      return;
    }

    updateLocalDataTimestamp();
  }, [canPersist, dailySnapshots, isReady, meta, redemptionRecords, rewards, rules]);

  return (
    <AchievementContext.Provider
      value={{
        isReady,
        achievementStartDate: meta.achievementStartDate,
        rules,
        rewards,
        dailySnapshots,
        redemptionRecords,
        availableStars,
        totalEarnedStars,
        totalRedeemedStars,
        ensureRecentSnapshots,
        createRule,
        updateRule,
        deleteRule,
        createReward,
        updateReward,
        deleteReward,
        redeemReward,
        deleteRedemptionRecord
      }}
    >
      {children}
    </AchievementContext.Provider>
  );
};
