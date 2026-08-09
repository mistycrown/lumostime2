/**
 * @file AchievementContext.tsx
 * @description Manages achievement bottle data, live snapshots, archived bottles, and reward redemption records with repository hydration and selective recent-day recomputation.
 * @updated 2026-08-09: Added fixed-rule character attributes, independent growth snapshots, and cumulative experience progress.
 * @updated 2026-07-11: Persists per-rule todo subtask inclusion settings for todo-category achievement rules.
 * @updated 2026-07-11: Added full achievement recomputation that clears archived bottles, restores historical ledgers, and rebuilds all daily snapshots.
 * @updated 2026-07-04: Auto-resyncs active achievement snapshots whenever source logs, todos, reviews, or filter context data change so balances stay fresh outside the achievement page.
 * @updated 2026-07-07: Exposed explicit current/history achievement accounts and made sealing migrate only current-account stars.
 * @updated 2026-06-30: Prevents sealing bottles while the current active star balance is negative, with a shared validation message for UI and logic.
 * @updated 2026-05-18: Added unified achievement backup export/restore helpers so bottle data can travel through app export/import and cloud sync.
 * @updated 2026-04-25: Added global check streak config plus active-period recomputation for streak-weighted check-category rules.
 * @updated 2026-04-17: Added filter-duration achievement rules that reuse the shared custom filter expression logic.
 * @updated 2026-04-07: Separates live and carryover redemption funding so sealing only archives live-period spending.
 */
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { buildDefaultAchievementAttributes } from '../constants/achievementAttributes';
import { AchievementSnapshot, dataRepository } from '../repositories/dataRepository';
import {
  AchievementArchivedBottle,
  AchievementAttribute,
  AchievementAccountSummary,
  AchievementBottleActionRecord,
  AchievementCollection,
  AchievementCollectionRecord,
  AchievementDailySnapshot,
  AchievementGrowthDailySnapshot,
  AchievementLevelProgress,
  CheckStreakConfig,
  AchievementMeta,
  AchievementRedemptionRecord,
  AchievementReward,
  AchievementSealPreview,
  AchievementRule
} from '../types';
import {
  calculateAchievementAvailableStars,
  calculateAchievementAccountSummary,
  calculateAchievementAttributeExperience,
  calculateAchievementTotalExperience,
  calculateAchievementTotalEarned,
  calculateAchievementTotalRedeemed,
  computeAchievementDailySnapshot,
  computeAchievementGrowthDailySnapshot,
  enumerateAchievementDates,
  getAchievementActiveStartDate,
  getAchievementLevelProgress,
  getAchievementRecentGrowthStartDate,
  getAchievementSealBlockedReason,
  getAchievementSealPreview,
  getAchievementYesterday,
  normalizeAchievementRedemptionRecordFunding,
  normalizeAchievementAttribute,
  normalizeAchievementStarValue,
  normalizeAchievementRule,
  normalizeAchievementGrowthSnapshot,
  normalizeAchievementSnapshot,
  partitionAchievementCollectionRecordsForSeal,
  partitionAchievementRedemptionsForSeal,
  rebuildAchievementRedemptionRecordsForFullRecompute,
  sortAchievementSnapshots
} from '../utils/achievementUtils';
import { getDefaultCheckStreakConfig, normalizeCheckStreakConfig } from '../utils/checkStreakUtils';
import { getLocalDateStr } from '../utils/dateUtils';
import { achievementBackupService, type AchievementBackupPayload } from '../services/achievementBackupService';
import {
  isLocalDataTimestampUpdateLocked,
  updateLocalDataTimestamp
} from '../utils/localDataTimestamp';
import { useData } from './DataContext';
import { useCategoryScope } from './CategoryScopeContext';
import { useReview } from './ReviewContext';

interface CreateAchievementRuleInput {
  name: string;
  effectType: 'earn' | 'spend';
  targetType: AchievementRule['targetType'];
  targetIds: string[];
  useCheckStreakMultiplier?: boolean;
  includeSubtasks?: boolean;
  filterExpression?: string;
  unitAmount: number;
  deltaPerUnit: number;
  attributeEffect?: {
    attributeId: string;
    expPerUnit: number;
  };
  note?: string;
}

interface CreateAchievementAttributeInput {
  name: string;
  subtitle: string;
  icon: string;
  color: string;
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
  growthStartDate: string | null;
  activeBottleCarryoverStars: number;
  checkStreakConfig: CheckStreakConfig;
  rules: AchievementRule[];
  rewards: AchievementReward[];
  collections: AchievementCollection[];
  dailySnapshots: AchievementDailySnapshot[];
  attributes: AchievementAttribute[];
  growthDailySnapshots: AchievementGrowthDailySnapshot[];
  attributeExperience: Record<string, number>;
  totalExperience: number;
  attributeLevels: Record<string, AchievementLevelProgress>;
  totalLevelProgress: AchievementLevelProgress;
  redemptionRecords: AchievementRedemptionRecord[];
  collectionRecords: AchievementCollectionRecord[];
  archivedBottles: AchievementArchivedBottle[];
  bottleActionRecords: AchievementBottleActionRecord[];
  sealPreview: AchievementSealPreview | null;
  accountSummary: AchievementAccountSummary;
  availableStars: number;
  totalEarnedStars: number;
  totalRedeemedStars: number;
  buildBackupPayload: () => AchievementBackupPayload;
  applyBackupPayload: (value: unknown) => boolean;
  ensureRecentSnapshots: () => Promise<void>;
  recomputeSnapshotForDate: (date: string) => { ok: boolean; message?: string };
  recomputeAllAchievementData: () => {
    ok: boolean;
    message?: string;
    snapshotCount?: number;
    growthSnapshotCount?: number;
    redemptionCount?: number;
  };
  updateCheckStreakConfig: (config: CheckStreakConfig) => void;
  createRule: (input: CreateAchievementRuleInput) => void;
  updateRule: (rule: AchievementRule) => void;
  deleteRule: (ruleId: string) => void;
  createAttribute: (input: CreateAchievementAttributeInput) => void;
  updateAttribute: (attribute: AchievementAttribute) => void;
  deleteAttribute: (attributeId: string) => void;
  reorderAttributes: (attributeIds: string[]) => void;
  createReward: (input: CreateAchievementRewardInput) => void;
  updateReward: (reward: AchievementReward) => void;
  deleteReward: (rewardId: string) => void;
  redeemReward: (reward: AchievementReward, note?: string) => { ok: boolean; message?: string };
  sealBottle: (collection: AchievementCollection) => { ok: boolean; message?: string; archivedBottleId?: string };
  shatterBottle: (bottleId: string) => { ok: boolean; message?: string };
  deleteRedemptionRecord: (recordId: string) => void;
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

const normalizeRedemptionRecord = (record: AchievementRedemptionRecord): AchievementRedemptionRecord => {
  const normalizedFunding = normalizeAchievementRedemptionRecordFunding({
    ...record,
    cost: Math.max(0.1, normalizeAchievementStarValue(record.cost || 0.1))
  });

  return {
    ...normalizedFunding,
    paidFromCarryover: normalizedFunding.paidFromCarryover || undefined,
    paidFromLiveStars: normalizedFunding.paidFromLiveStars || undefined,
    note: record.note?.trim() || undefined
  };
};

const normalizeCollectionRecord = (record: AchievementCollectionRecord): AchievementCollectionRecord => ({
  ...normalizeAchievementRedemptionRecordFunding({
    ...record,
    cost: Math.max(0.1, normalizeAchievementStarValue(record.cost || 0.1))
  }),
  imagePath: record.imagePath?.trim() || undefined,
  note: record.note?.trim() || undefined
});

const normalizeAchievementMeta = (meta: AchievementMeta): AchievementMeta => ({
  achievementStartDate: meta.achievementStartDate ?? null,
  growthStartDate: meta.growthStartDate ?? null,
  activeBottleCarryoverStars: Math.max(0, normalizeAchievementStarValue(meta.activeBottleCarryoverStars || 0)),
  checkStreakConfig: normalizeCheckStreakConfig(meta.checkStreakConfig)
});

const normalizeArchivedBottle = (bottle: AchievementArchivedBottle): AchievementArchivedBottle => ({
  ...bottle,
  imagePath: bottle.imagePath?.trim() || undefined,
  earnedStars: Math.max(0, normalizeAchievementStarValue(bottle.earnedStars || 0)),
  spentStars: Math.max(0, normalizeAchievementStarValue(bottle.spentStars || 0)),
  sealedAmount: Math.max(0, normalizeAchievementStarValue(bottle.sealedAmount || 0)),
  dailySnapshots: sortAchievementSnapshots((bottle.dailySnapshots || []).map(normalizeAchievementSnapshot)),
  redemptionRecords: (bottle.redemptionRecords || []).map(normalizeRedemptionRecord)
});

const normalizeBottleActionRecord = (record: AchievementBottleActionRecord): AchievementBottleActionRecord => ({
  ...record,
  amount: Math.max(0, normalizeAchievementStarValue(record.amount || 0))
});

const normalizeAchievementSnapshotState = (snapshot: AchievementSnapshot): AchievementSnapshot => ({
  meta: normalizeAchievementMeta(snapshot.meta),
  rules: snapshot.rules.map(normalizeAchievementRule),
  rewards: snapshot.rewards.map(normalizeReward),
  collections: snapshot.collections.map(normalizeCollection),
  dailySnapshots: sortAchievementSnapshots(snapshot.dailySnapshots.map(normalizeAchievementSnapshot)),
  attributes: snapshot.attributes === undefined
    ? buildDefaultAchievementAttributes()
    : snapshot.attributes.map((attribute, index) => normalizeAchievementAttribute(attribute, index)),
  growthDailySnapshots: (snapshot.growthDailySnapshots || []).map(normalizeAchievementGrowthSnapshot)
    .sort((first, second) => first.date.localeCompare(second.date)),
  redemptionRecords: snapshot.redemptionRecords.map(normalizeRedemptionRecord),
  collectionRecords: snapshot.collectionRecords.map(normalizeCollectionRecord),
  archivedBottles: snapshot.archivedBottles.map(normalizeArchivedBottle),
  bottleActionRecords: snapshot.bottleActionRecords.map(normalizeBottleActionRecord)
});

export const useAchievement = () => {
  const context = useContext(AchievementContext);
  if (!context) {
    throw new Error('useAchievement must be used within an AchievementProvider');
  }
  return context;
};

export const AchievementProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isReady: isDataReady, logs, todos, todoCategories } = useData();
  const { isReady: isCategoryScopeReady, categories, scopes } = useCategoryScope();
  const { isReady: isReviewReady, dailyReviews, checkTemplates } = useReview();
  const [isReady, setIsReady] = useState(false);
  const [canPersist, setCanPersist] = useState(false);
  const isHydratingRef = useRef(true);

  const [meta, setMeta] = useState<AchievementMeta>({
    achievementStartDate: null,
    growthStartDate: null,
    activeBottleCarryoverStars: 0,
    checkStreakConfig: getDefaultCheckStreakConfig()
  });
  const [rules, setRules] = useState<AchievementRule[]>([]);
  const [rewards, setRewards] = useState<AchievementReward[]>([]);
  const [collections, setCollections] = useState<AchievementCollection[]>([]);
  const [dailySnapshots, setDailySnapshots] = useState<AchievementDailySnapshot[]>([]);
  const [attributes, setAttributes] = useState<AchievementAttribute[]>(buildDefaultAchievementAttributes());
  const [growthDailySnapshots, setGrowthDailySnapshots] = useState<AchievementGrowthDailySnapshot[]>([]);
  const [redemptionRecords, setRedemptionRecords] = useState<AchievementRedemptionRecord[]>([]);
  const [collectionRecords, setCollectionRecords] = useState<AchievementCollectionRecord[]>([]);
  const [archivedBottles, setArchivedBottles] = useState<AchievementArchivedBottle[]>([]);
  const [bottleActionRecords, setBottleActionRecords] = useState<AchievementBottleActionRecord[]>([]);

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
        setMeta(normalizeAchievementMeta(snapshot.meta));
        setRules(snapshot.rules.map(normalizeAchievementRule));
        setRewards(snapshot.rewards.map(normalizeReward));
        setCollections(snapshot.collections.map(normalizeCollection));
        setDailySnapshots(sortAchievementSnapshots(snapshot.dailySnapshots.map(normalizeAchievementSnapshot)));
        setAttributes(
          (snapshot.attributes === undefined
            ? buildDefaultAchievementAttributes()
            : snapshot.attributes
          ).map((attribute, index) => normalizeAchievementAttribute(attribute, index))
        );
        setGrowthDailySnapshots(
          (snapshot.growthDailySnapshots || [])
            .map(normalizeAchievementGrowthSnapshot)
            .sort((first, second) => first.date.localeCompare(second.date))
        );
        setRedemptionRecords(snapshot.redemptionRecords.map(normalizeRedemptionRecord));
        setCollectionRecords(snapshot.collectionRecords.map(normalizeCollectionRecord));
        setArchivedBottles(snapshot.archivedBottles.map(normalizeArchivedBottle));
        setBottleActionRecords(snapshot.bottleActionRecords.map(normalizeBottleActionRecord));
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
    rulesSource: AchievementRule[],
    forceRecomputeAllDates = false,
    checkStreakConfigSource: CheckStreakConfig = normalizeCheckStreakConfig(meta.checkStreakConfig)
  ): AchievementDailySnapshot[] => {
    const today = getLocalDateStr(new Date());
    const yesterday = getAchievementYesterday();
    const snapshotMap = new Map(baseSnapshots.map((item) => [item.date, item]));
    const dates = enumerateAchievementDates(startDate, today);

    const nextSnapshots = dates.map((date) => {
      const existing = snapshotMap.get(date);
      const shouldRecompute = forceRecomputeAllDates || !existing || date === today || date === yesterday;

      if (!shouldRecompute && existing) {
        return normalizeAchievementSnapshot(existing);
      }

      const computed = computeAchievementDailySnapshot(date, logs, todos, dailyReviews, rulesSource, {
        categories,
        scopes,
        todos,
        todoCategories,
        checkTemplates,
        checkStreakConfig: checkStreakConfigSource
      });
      if (existing) {
        computed.id = existing.id;
      }
      return computed;
    });

    return sortAchievementSnapshots(nextSnapshots);
  };

  const reconcileGrowthSnapshots = (
    startDate: string,
    baseSnapshots: AchievementGrowthDailySnapshot[],
    rulesSource: AchievementRule[],
    attributesSource: AchievementAttribute[],
    forceRecomputeAllDates = false
  ): AchievementGrowthDailySnapshot[] => {
    const today = getLocalDateStr(new Date());
    const recentStartDate = getAchievementRecentGrowthStartDate();
    const snapshotMap = new Map(
      baseSnapshots.map((item) => [item.date, normalizeAchievementGrowthSnapshot(item)])
    );
    const dates = enumerateAchievementDates(startDate, today);

    const nextSnapshots = dates.map((date) => {
      const existing = snapshotMap.get(date);
      const shouldRecompute = forceRecomputeAllDates
        || !existing
        || date >= recentStartDate;

      if (!shouldRecompute && existing) {
        return existing;
      }

      const computed = computeAchievementGrowthDailySnapshot(
        date,
        logs,
        todos,
        dailyReviews,
        rulesSource,
        attributesSource,
        {
          categories,
          scopes,
          todos,
          todoCategories,
          checkTemplates,
          checkStreakConfig: meta.checkStreakConfig
        }
      );
      if (existing) {
        computed.id = existing.id;
        const disabledAttributeIds = new Set(
          attributesSource
            .filter((attribute) => !attribute.enabled)
            .map((attribute) => attribute.id)
        );
        const preservedChanges = existing.attributeChanges.filter((change) => (
          disabledAttributeIds.has(change.attributeId)
        ));
        if (preservedChanges.length > 0) {
          computed.attributeChanges = [...preservedChanges, ...computed.attributeChanges];
        }
      }
      return computed;
    });

    return nextSnapshots.sort((first, second) => first.date.localeCompare(second.date));
  };

  const syncActiveSnapshots = ({
    forceRecomputeAllDates = false,
    rulesSource = rules,
    checkStreakConfigSource = normalizeCheckStreakConfig(meta.checkStreakConfig),
    attributesSource = attributes,
    forceRecomputeGrowthAllDates = false
  }: {
    forceRecomputeAllDates?: boolean;
    rulesSource?: AchievementRule[];
    checkStreakConfigSource?: CheckStreakConfig;
    attributesSource?: AchievementAttribute[];
    forceRecomputeGrowthAllDates?: boolean;
  } = {}) => {
    const today = getLocalDateStr(new Date());
    const startDate = getAchievementActiveStartDate(meta.achievementStartDate, archivedBottles) || today;
    const growthStartDate = meta.growthStartDate || today;

    if (!meta.achievementStartDate || !meta.growthStartDate) {
      setMeta((previous) => ({
        ...previous,
        achievementStartDate: previous.achievementStartDate || startDate,
        growthStartDate: previous.growthStartDate || growthStartDate
      }));
    }

    setDailySnapshots((previous) => (
      reconcileSnapshots(
        startDate,
        previous,
        rulesSource,
        forceRecomputeAllDates,
        checkStreakConfigSource
      )
    ));
    setGrowthDailySnapshots((previous) => (
      reconcileGrowthSnapshots(
        growthStartDate,
        previous,
        rulesSource,
        attributesSource,
        forceRecomputeGrowthAllDates
      )
    ));
  };

  const ensureRecentSnapshots = async () => {
    syncActiveSnapshots({ forceRecomputeAllDates: true });
  };

  useEffect(() => {
    if (
      !isReady
      || !canPersist
      || isHydratingRef.current
      || !isDataReady
      || !isReviewReady
      || !isCategoryScopeReady
    ) {
      return;
    }

    syncActiveSnapshots({ forceRecomputeAllDates: true });
  }, [
    archivedBottles,
    canPersist,
    categories,
    checkTemplates,
    dailyReviews,
    isCategoryScopeReady,
    isDataReady,
    isReady,
    isReviewReady,
    logs,
    meta.achievementStartDate,
    meta.checkStreakConfig,
    rules,
    scopes,
    todoCategories,
    todos
  ]);

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
        rules,
        {
          categories,
          scopes,
          todos,
          todoCategories,
          checkTemplates,
          checkStreakConfig: meta.checkStreakConfig
        }
      );

      if (existingSnapshot) {
        recomputedSnapshot.id = existingSnapshot.id;
      }

      const nextSnapshots = existingSnapshot
        ? previous.map((item) => (item.date === normalizedDate ? recomputedSnapshot : item))
        : [...previous, recomputedSnapshot];

      return sortAchievementSnapshots(nextSnapshots);
    });
    setGrowthDailySnapshots((previous) => {
      const existingSnapshot = previous.find((item) => item.date === normalizedDate);
      const recomputedSnapshot = computeAchievementGrowthDailySnapshot(
        normalizedDate,
        logs,
        todos,
        dailyReviews,
        rules,
        attributes,
        {
          categories,
          scopes,
          todos,
          todoCategories,
          checkTemplates,
          checkStreakConfig: meta.checkStreakConfig
        }
      );

      if (existingSnapshot) {
        recomputedSnapshot.id = existingSnapshot.id;
        const disabledAttributeIds = new Set(
          attributes
            .filter((attribute) => !attribute.enabled)
            .map((attribute) => attribute.id)
        );
        const preservedChanges = existingSnapshot.attributeChanges.filter((change) => (
          disabledAttributeIds.has(change.attributeId)
        ));
        if (preservedChanges.length > 0) {
          recomputedSnapshot.attributeChanges = [...preservedChanges, ...recomputedSnapshot.attributeChanges];
        }
      }

      const nextSnapshots = existingSnapshot
        ? previous.map((item) => (item.date === normalizedDate ? recomputedSnapshot : item))
        : [...previous, recomputedSnapshot];

      return nextSnapshots.sort((first, second) => first.date.localeCompare(second.date));
    });

    return { ok: true };
  };

  const recomputeAllAchievementData = () => {
    if (!isDataReady || !isReviewReady || !isCategoryScopeReady) {
      return {
        ok: false,
        message: '基础数据还在加载中，请稍后再试'
      };
    }

    const today = getLocalDateStr(new Date());
    const allKnownSnapshotDates = [
      ...dailySnapshots.map((snapshot) => snapshot.date),
      ...archivedBottles.flatMap((bottle) => [
        bottle.periodStartDate,
        ...bottle.dailySnapshots.map((snapshot) => snapshot.date)
      ])
    ].filter(Boolean);
    const startDate = meta.achievementStartDate
      || allKnownSnapshotDates.sort((first, second) => first.localeCompare(second))[0]
      || today;
    const normalizedCheckStreakConfig = normalizeCheckStreakConfig(meta.checkStreakConfig);
    const growthStartDate = meta.growthStartDate || today;
    const recomputedSnapshots = reconcileSnapshots(
      startDate,
      [],
      rules,
      true,
      normalizedCheckStreakConfig
    );
    const recomputedGrowthSnapshots = reconcileGrowthSnapshots(
      growthStartDate,
      growthDailySnapshots,
      rules,
      attributes,
      true
    );
    const recomputedRedemptionRecords = rebuildAchievementRedemptionRecordsForFullRecompute({
      redemptionRecords,
      collectionRecords,
      archivedBottles,
      rewards,
      collections
    }).map(normalizeRedemptionRecord);

    setMeta((previous) => ({
      ...previous,
      achievementStartDate: startDate,
      growthStartDate,
      activeBottleCarryoverStars: 0,
      checkStreakConfig: normalizedCheckStreakConfig
    }));
    setDailySnapshots(recomputedSnapshots);
    setGrowthDailySnapshots(recomputedGrowthSnapshots);
    setRedemptionRecords(recomputedRedemptionRecords);
    setCollectionRecords([]);
    setArchivedBottles([]);
    setBottleActionRecords([]);

    return {
      ok: true,
      snapshotCount: recomputedSnapshots.length,
      growthSnapshotCount: recomputedGrowthSnapshots.length,
      redemptionCount: recomputedRedemptionRecords.length
    };
  };

  const updateCheckStreakConfig = (config: CheckStreakConfig) => {
    const normalizedConfig = normalizeCheckStreakConfig(config);
    setMeta((previous) => ({
      ...previous,
      checkStreakConfig: normalizedConfig
    }));
    syncActiveSnapshots({ forceRecomputeAllDates: true, checkStreakConfigSource: normalizedConfig });
  };

  const createRule = (input: CreateAchievementRuleInput) => {
    const now = Date.now();
    const nextRule: AchievementRule = {
      id: crypto.randomUUID(),
      name: input.name.trim() || '未命名规则',
      enabled: true,
      effectType: input.effectType,
      targetType: input.targetType,
      targetIds: input.targetType === 'filterDuration' ? [] : input.targetIds,
      useCheckStreakMultiplier: input.targetType === 'checkCategory' ? input.useCheckStreakMultiplier === true : false,
      includeSubtasks: input.targetType === 'todoCategory' ? input.includeSubtasks === true : false,
      filterExpression: input.filterExpression?.trim() || undefined,
      unitAmount: Math.max(1, Math.floor(input.unitAmount)),
      deltaPerUnit: Math.max(0.1, normalizeAchievementStarValue(input.deltaPerUnit || 0.1)),
      roundingMode: 'floor',
      attributeEffect: input.attributeEffect
        ? {
          attributeId: input.attributeEffect.attributeId.trim(),
          expPerUnit: Math.max(1, Math.floor(input.attributeEffect.expPerUnit))
        }
        : undefined,
      note: input.note?.trim() || undefined,
      createdAt: now,
      updatedAt: now
    };

    const nextRules = [...rules, nextRule];
    setRules(nextRules);
    syncActiveSnapshots({ forceRecomputeAllDates: true, rulesSource: nextRules });
  };

  const updateRule = (rule: AchievementRule) => {
    const nextRules = rules.map((item) => (
      item.id === rule.id
        ? {
          ...rule,
          name: rule.name.trim() || '未命名规则',
          targetIds: rule.targetType === 'filterDuration' ? [] : rule.targetIds,
          useCheckStreakMultiplier: rule.targetType === 'checkCategory' ? rule.useCheckStreakMultiplier === true : false,
          includeSubtasks: rule.targetType === 'todoCategory' ? rule.includeSubtasks === true : false,
          filterExpression: rule.filterExpression?.trim() || undefined,
          unitAmount: Math.max(1, Math.floor(rule.unitAmount)),
          deltaPerUnit: Math.max(0.1, normalizeAchievementStarValue(rule.deltaPerUnit || 0.1)),
          attributeEffect: rule.attributeEffect
            ? {
              attributeId: rule.attributeEffect.attributeId.trim(),
              expPerUnit: Math.max(1, Math.floor(rule.attributeEffect.expPerUnit))
            }
            : undefined,
          updatedAt: Date.now()
        }
        : item
    ));

    setRules(nextRules);
    syncActiveSnapshots({ forceRecomputeAllDates: true, rulesSource: nextRules });
  };

  const deleteRule = (ruleId: string) => {
    const nextRules = rules.filter((item) => item.id !== ruleId);
    setRules(nextRules);
    syncActiveSnapshots({ forceRecomputeAllDates: true, rulesSource: nextRules });
  };

  const createAttribute = (input: CreateAchievementAttributeInput) => {
    const now = Date.now();
    const nextAttribute = normalizeAchievementAttribute({
      id: crypto.randomUUID(),
      name: input.name,
      subtitle: input.subtitle,
      icon: input.icon,
      color: input.color,
      enabled: true,
      sortOrder: attributes.length,
      createdAt: now,
      updatedAt: now
    });
    const nextAttributes = [...attributes, nextAttribute];
    setAttributes(nextAttributes);
    syncActiveSnapshots({ attributesSource: nextAttributes });
  };

  const updateAttribute = (attribute: AchievementAttribute) => {
    const nextAttribute = normalizeAchievementAttribute({
      ...attribute,
      updatedAt: Date.now()
    });
    const nextAttributes = attributes
      .map((item) => (item.id === nextAttribute.id ? nextAttribute : item))
      .sort((first, second) => first.sortOrder - second.sortOrder);
    const nextRules = nextAttribute.enabled
      ? rules
      : rules.map((rule) => (
        rule.attributeEffect?.attributeId === nextAttribute.id
          ? { ...rule, enabled: false, updatedAt: Date.now() }
          : rule
      ));

    setAttributes(nextAttributes);
    if (nextRules !== rules) {
      setRules(nextRules);
    }
    syncActiveSnapshots({
      rulesSource: nextRules,
      attributesSource: nextAttributes
    });
  };

  const deleteAttribute = (attributeId: string) => {
    const targetAttribute = attributes.find((attribute) => attribute.id === attributeId);
    if (!targetAttribute) {
      return;
    }

    updateAttribute({
      ...targetAttribute,
      enabled: false
    });
  };

  const reorderAttributes = (attributeIds: string[]) => {
    const orderMap = new Map(attributeIds.map((attributeId, index) => [attributeId, index]));
    const nextAttributes = attributes
      .map((attribute) => ({
        ...attribute,
        sortOrder: orderMap.get(attribute.id) ?? attribute.sortOrder,
        updatedAt: orderMap.has(attribute.id) ? Date.now() : attribute.updatedAt
      }))
      .sort((first, second) => first.sortOrder - second.sortOrder);
    setAttributes(nextAttributes);
    syncActiveSnapshots({ attributesSource: nextAttributes });
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

  const redeemReward = (reward: AchievementReward, note?: string) => {
    const currentAvailableStars = calculateAchievementAvailableStars(
      dailySnapshots,
      [...redemptionRecords, ...collectionRecords],
      bottleActionRecords,
      meta.activeBottleCarryoverStars
    );
    const normalizedRewardCost = Math.max(0.1, normalizeAchievementStarValue(reward.cost || 0.1));

    if (currentAvailableStars < normalizedRewardCost) {
      return {
        ok: false,
        message: '当前光点不足，暂时无法兑换'
      };
    }

    const paidFromCarryover = Math.min(meta.activeBottleCarryoverStars, normalizedRewardCost);
    const paidFromLiveStars = normalizeAchievementStarValue(normalizedRewardCost - paidFromCarryover);
    const nextRecord: AchievementRedemptionRecord = {
      id: crypto.randomUUID(),
      rewardId: reward.id,
      rewardName: reward.name,
      cost: normalizedRewardCost,
      redeemedAt: Date.now(),
      paidFromCarryover: paidFromCarryover || undefined,
      paidFromLiveStars: paidFromLiveStars || undefined,
      note: note?.trim() || undefined
    };

    setRedemptionRecords((previous) => [nextRecord, ...previous]);
    if (paidFromCarryover > 0) {
      setMeta((previous) => ({
        ...previous,
        activeBottleCarryoverStars: normalizeAchievementStarValue(previous.activeBottleCarryoverStars - paidFromCarryover)
      }));
    }
    return { ok: true };
  };

  const deleteRedemptionRecord = (recordId: string) => {
    const targetRecord = redemptionRecords.find((item) => item.id === recordId);
    if (targetRecord?.paidFromCarryover) {
      setMeta((currentMeta) => ({
        ...currentMeta,
        activeBottleCarryoverStars: normalizeAchievementStarValue(
          currentMeta.activeBottleCarryoverStars + targetRecord.paidFromCarryover!
        )
      }));
    }
    setRedemptionRecords((previous) => previous.filter((item) => item.id !== recordId));
  };

  const sealPreview = getAchievementSealPreview({
    achievementStartDate: meta.achievementStartDate,
    archivedBottles,
    dailySnapshots,
    spendRecords: [...redemptionRecords, ...collectionRecords],
    redemptionRecords
  });

  const sealBottle = (collection: AchievementCollection) => {
    const sealBlockedReason = getAchievementSealBlockedReason({
      sealPreview,
      availableStars: accountSummary.currentStars
    });

    if (sealBlockedReason) {
      return {
        ok: false,
        message: sealBlockedReason
      };
    }

    const activeSealPreview = sealPreview;
    const snapshotMap = new Set(activeSealPreview.snapshotIds);
    const snapshotsToArchive = dailySnapshots.filter((snapshot) => snapshotMap.has(snapshot.id));
    const { archivedRecords, remainingActiveRecords } = partitionAchievementRedemptionsForSeal({
      startDate: activeSealPreview.startDate,
      endDate: activeSealPreview.endDate,
      redemptionRecords
    });
    const {
      archivedRecords: collectionRecordsToArchive,
      remainingActiveRecords: nextActiveCollectionRecords
    } = partitionAchievementCollectionRecordsForSeal({
      startDate: activeSealPreview.startDate,
      endDate: activeSealPreview.endDate,
      collectionRecords
    });
    const redemptionsToArchive = archivedRecords.map((record) => {
      const originalRecord = redemptionRecords.find((item) => item.id === record.sourceRecordId);
      const normalizedOriginal = originalRecord
        ? normalizeAchievementRedemptionRecordFunding(originalRecord)
        : null;
      const shouldReuseOriginalId = Boolean(
        normalizedOriginal
        && normalizedOriginal.cost === record.cost
        && normalizedOriginal.paidFromCarryover === record.paidFromCarryover
        && normalizedOriginal.paidFromLiveStars === record.paidFromLiveStars
      );
      const { sourceRecordId, ...restRecord } = record;

      return {
        ...restRecord,
        id: shouldReuseOriginalId ? sourceRecordId : crypto.randomUUID()
      };
    });
    const nextActiveRedemptions = remainingActiveRecords.map((record) => {
      const { sourceRecordId, ...restRecord } = record;
      return {
        ...restRecord,
        id: sourceRecordId
      };
    });

    if (!snapshotsToArchive.length && !redemptionsToArchive.length && !collectionRecordsToArchive.length) {
      return {
        ok: false,
        message: '昨天之前还没有新的历史可封存'
      };
    }

    const now = Date.now();
    const nextArchivedBottle: AchievementArchivedBottle = {
      id: crypto.randomUUID(),
      collectionId: collection.id,
      collectionName: collection.name,
      imagePath: collection.imagePath,
      periodStartDate: activeSealPreview.startDate,
      periodEndDate: activeSealPreview.endDate,
      earnedStars: activeSealPreview.earnedStars,
      spentStars: activeSealPreview.spentStars,
      sealedAmount: activeSealPreview.sealableStars,
      status: 'sealed',
      sealedAt: now,
      dailySnapshots: snapshotsToArchive,
      redemptionRecords: [...redemptionsToArchive, ...collectionRecordsToArchive]
    };
    const nextActionRecord: AchievementBottleActionRecord = {
      id: crypto.randomUUID(),
      bottleId: nextArchivedBottle.id,
      actionType: 'seal',
      amount: nextArchivedBottle.sealedAmount,
      occurredAt: now
    };

    setArchivedBottles((previous) => [...previous, nextArchivedBottle]);
    setBottleActionRecords((previous) => [nextActionRecord, ...previous]);
    setDailySnapshots((previous) => previous.filter((snapshot) => !snapshotMap.has(snapshot.id)));
    setRedemptionRecords(nextActiveRedemptions);
    setCollectionRecords(nextActiveCollectionRecords);

    return {
      ok: true,
      archivedBottleId: nextArchivedBottle.id
    };
  };

  const shatterBottle = (bottleId: string) => {
    const targetBottle = archivedBottles.find((bottle) => bottle.id === bottleId);
    if (!targetBottle) {
      return {
        ok: false,
        message: '没有找到这个历史瓶子'
      };
    }

    if (targetBottle.status === 'shattered') {
      return {
        ok: false,
        message: '这个瓶子已经砸碎过了'
      };
    }

    const now = Date.now();
    const nextActionRecord: AchievementBottleActionRecord = {
      id: crypto.randomUUID(),
      bottleId,
      actionType: 'shatter',
      amount: targetBottle.sealedAmount,
      occurredAt: now
    };

    setArchivedBottles((previous) => previous.map((bottle) => (
      bottle.id === bottleId
        ? {
          ...bottle,
          status: 'shattered',
          shatteredAt: now
        }
        : bottle
    )));
    setBottleActionRecords((previous) => [nextActionRecord, ...previous]);
    setMeta((previous) => ({
      ...previous,
      activeBottleCarryoverStars: normalizeAchievementStarValue(previous.activeBottleCarryoverStars + targetBottle.sealedAmount)
    }));

    return { ok: true };
  };

  const buildBackupPayload = (): AchievementBackupPayload => (
    achievementBackupService.buildBackupPayload({
      meta: {
        achievementStartDate: meta.achievementStartDate,
        growthStartDate: meta.growthStartDate ?? null,
        activeBottleCarryoverStars: meta.activeBottleCarryoverStars,
        checkStreakConfig: normalizeCheckStreakConfig(meta.checkStreakConfig)
      },
      rules,
      rewards,
      collections,
      dailySnapshots,
      attributes,
      growthDailySnapshots,
      redemptionRecords,
      collectionRecords,
      archivedBottles,
      bottleActionRecords
    })
  );

  const applyBackupPayload = (value: unknown): boolean => {
    const snapshot = achievementBackupService.readBackupPayload(value);
    if (!snapshot) {
      return false;
    }

    const normalizedSnapshot = normalizeAchievementSnapshotState(snapshot);
    isHydratingRef.current = true;
    setMeta(normalizedSnapshot.meta);
    setRules(normalizedSnapshot.rules);
    setRewards(normalizedSnapshot.rewards);
    setCollections(normalizedSnapshot.collections);
    setDailySnapshots(normalizedSnapshot.dailySnapshots);
    setAttributes(normalizedSnapshot.attributes || buildDefaultAchievementAttributes());
    setGrowthDailySnapshots(normalizedSnapshot.growthDailySnapshots || []);
    setRedemptionRecords(normalizedSnapshot.redemptionRecords);
    setCollectionRecords(normalizedSnapshot.collectionRecords);
    setArchivedBottles(normalizedSnapshot.archivedBottles);
    setBottleActionRecords(normalizedSnapshot.bottleActionRecords);
    window.setTimeout(() => {
      isHydratingRef.current = false;
    }, 0);
    return true;
  };

  const spendRecords = [...redemptionRecords, ...collectionRecords];
  const accountSummary = calculateAchievementAccountSummary(
    dailySnapshots,
    spendRecords,
    bottleActionRecords,
    meta.activeBottleCarryoverStars
  );
  const availableStars = accountSummary.totalStars;
  const totalEarnedStars = calculateAchievementTotalEarned(dailySnapshots);
  const totalRedeemedStars = calculateAchievementTotalRedeemed(spendRecords);
  const attributeExperience = calculateAchievementAttributeExperience(growthDailySnapshots, attributes);
  const totalExperience = calculateAchievementTotalExperience(growthDailySnapshots);
  const attributeLevels = Object.fromEntries(
    attributes.map((attribute) => [attribute.id, getAchievementLevelProgress(attributeExperience[attribute.id] || 0)])
  ) as Record<string, AchievementLevelProgress>;
  const totalLevelProgress = getAchievementLevelProgress(totalExperience);

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

    void dataRepository.saveAchievementAttributes(attributes).catch((error) => {
      console.error('[AchievementContext] Failed to persist achievement attributes', error);
    });
  }, [attributes, canPersist, isReady]);

  useEffect(() => {
    if (!isReady || !canPersist) {
      return;
    }

    void dataRepository.saveAchievementGrowthDailySnapshots(growthDailySnapshots).catch((error) => {
      console.error('[AchievementContext] Failed to persist achievement growth snapshots', error);
    });
  }, [canPersist, growthDailySnapshots, isReady]);

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
    if (!isReady || !canPersist) {
      return;
    }

    void dataRepository.saveAchievementArchivedBottles(archivedBottles).catch((error) => {
      console.error('[AchievementContext] Failed to persist archived achievement bottles', error);
    });
  }, [archivedBottles, canPersist, isReady]);

  useEffect(() => {
    if (!isReady || !canPersist) {
      return;
    }

    void dataRepository.saveAchievementBottleActionRecords(bottleActionRecords).catch((error) => {
      console.error('[AchievementContext] Failed to persist achievement bottle action records', error);
    });
  }, [bottleActionRecords, canPersist, isReady]);

  useEffect(() => {
    if (!isReady || !canPersist || isHydratingRef.current) {
      return;
    }

    if (isLocalDataTimestampUpdateLocked()) {
      return;
    }

    updateLocalDataTimestamp();
  }, [
    archivedBottles,
    attributes,
    bottleActionRecords,
    canPersist,
    collectionRecords,
    collections,
    dailySnapshots,
    growthDailySnapshots,
    isReady,
    meta,
    redemptionRecords,
    rewards,
    rules
  ]);

  return (
    <AchievementContext.Provider
      value={{
        isReady,
        achievementStartDate: meta.achievementStartDate,
        growthStartDate: meta.growthStartDate ?? null,
        activeBottleCarryoverStars: meta.activeBottleCarryoverStars,
        checkStreakConfig: normalizeCheckStreakConfig(meta.checkStreakConfig),
        rules,
        rewards,
        collections,
        dailySnapshots,
        attributes,
        growthDailySnapshots,
        attributeExperience,
        totalExperience,
        attributeLevels,
        totalLevelProgress,
        redemptionRecords,
        collectionRecords,
        archivedBottles,
        bottleActionRecords,
        sealPreview,
        accountSummary,
        availableStars,
        totalEarnedStars,
        totalRedeemedStars,
        buildBackupPayload,
        applyBackupPayload,
        ensureRecentSnapshots,
        recomputeSnapshotForDate,
        recomputeAllAchievementData,
        updateCheckStreakConfig,
        createRule,
        updateRule,
        deleteRule,
        createAttribute,
        updateAttribute,
        deleteAttribute,
        reorderAttributes,
        createReward,
        updateReward,
        deleteReward,
        redeemReward,
        sealBottle,
        shatterBottle,
        deleteRedemptionRecord
      }}
    >
      {children}
    </AchievementContext.Provider>
  );
};
