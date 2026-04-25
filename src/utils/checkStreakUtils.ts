/**
 * @file checkStreakUtils.ts
 * @input Daily review data, check templates, target dates, and global streak config
 * @output Shared streak helpers for weighted check-category achievement calculations
 * @pos Utility (Daily Check / Achievement)
 * @description Calculates per-item daily streaks, resolves the highest matching multiplier tier, and aggregates weighted check-category completion values for achievement snapshots.
 *
 * @updated 2026-04-25: Added category-level weighted completion helpers driven by a global streak tier config.
 */
import { CheckItem, CheckStreakConfig, CheckTemplate, DailyReview } from '../types';
import { getLocalDateStr } from './dateUtils';
import { findCheckItemIndexInReview } from './dailyCheckUtils';
import { normalizeCheckItem } from './checkItemNormalizer';

const DEFAULT_CHECK_STREAK_CONFIG: CheckStreakConfig = {
  enabled: false,
  tiers: [
    { thresholdDays: 5, multiplier: 1.2 },
    { thresholdDays: 15, multiplier: 1.5 },
    { thresholdDays: 30, multiplier: 2.0 }
  ]
};

const normalizePositiveInt = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.floor(value));
};

const normalizePositiveDecimal = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.round((value + Number.EPSILON) * 10) / 10);
};

const sortTiers = (tiers: CheckStreakConfig['tiers']) => (
  [...tiers].sort((left, right) => left.thresholdDays - right.thresholdDays)
);

const isCheckItemCompleted = (item: CheckItem): boolean => {
  const normalized = normalizeCheckItem(item);

  if (normalized.type === 'auto') {
    return normalized.isCompleted;
  }

  if (normalized.manualMode === 'count') {
    const targetCount = Math.max(1, Math.floor(normalized.targetCount || 1));
    const currentCount = Math.max(0, Math.floor(normalized.currentCount || 0));
    return currentCount >= targetCount;
  }

  return normalized.isCompleted || Math.max(0, Math.floor(normalized.currentCount || 0)) >= 1;
};

export const normalizeCheckStreakConfig = (config?: CheckStreakConfig | null): CheckStreakConfig => {
  const safeConfig = config || DEFAULT_CHECK_STREAK_CONFIG;

  const normalizedTiers = sortTiers(
    (safeConfig.tiers || [])
      .map((tier) => ({
        thresholdDays: normalizePositiveInt(tier?.thresholdDays, 1),
        multiplier: normalizePositiveDecimal(tier?.multiplier, 1)
      }))
      .filter((tier, index, tiers) => tiers.findIndex((entry) => entry.thresholdDays === tier.thresholdDays) === index)
  );

  return {
    enabled: safeConfig.enabled === true,
    tiers: normalizedTiers.length > 0 ? normalizedTiers : DEFAULT_CHECK_STREAK_CONFIG.tiers
  };
};

export const getCheckItemStreakMultiplier = (
  streakDays: number,
  config?: CheckStreakConfig | null
): number => {
  const normalizedConfig = normalizeCheckStreakConfig(config);

  if (!normalizedConfig.enabled || streakDays <= 0) {
    return 1;
  }

  return normalizedConfig.tiers.reduce((resolvedMultiplier, tier) => (
    streakDays >= tier.thresholdDays ? tier.multiplier : resolvedMultiplier
  ), 1);
};

export const calculateCheckItemStreakById = ({
  checkItemId,
  dailyReviews,
  checkTemplates,
  targetDate = new Date()
}: {
  checkItemId: string;
  dailyReviews: DailyReview[];
  checkTemplates: CheckTemplate[];
  targetDate?: Date;
}): number => {
  const completedDateSet = new Set(
    dailyReviews
      .filter((review) => {
        const itemIndex = findCheckItemIndexInReview(review, checkTemplates, checkItemId);
        if (itemIndex === -1 || !review.checkItems) {
          return false;
        }

        return isCheckItemCompleted(review.checkItems[itemIndex]);
      })
      .map((review) => review.date)
  );

  const targetDateStr = getLocalDateStr(targetDate);
  const rollingDate = new Date(targetDate);
  rollingDate.setHours(0, 0, 0, 0);

  let currentStreak = 0;

  while (true) {
    const dateStr = getLocalDateStr(rollingDate);

    if (completedDateSet.has(dateStr)) {
      currentStreak += 1;
      rollingDate.setDate(rollingDate.getDate() - 1);
    } else if (dateStr === targetDateStr) {
      rollingDate.setDate(rollingDate.getDate() - 1);
    } else {
      break;
    }

    if (currentStreak > 1000) {
      break;
    }
  }

  return currentStreak;
};

export const getCheckCategoryWeightedCompletionValue = ({
  category,
  dayReview,
  dailyReviews,
  checkTemplates,
  targetDate,
  checkStreakConfig,
  useStreakMultiplier
}: {
  category: string;
  dayReview?: DailyReview;
  dailyReviews: DailyReview[];
  checkTemplates: CheckTemplate[];
  targetDate: Date;
  checkStreakConfig?: CheckStreakConfig | null;
  useStreakMultiplier?: boolean;
}): number => {
  const completedCheckItems = (dayReview?.checkItems || []).filter((item) => (
    item.category === category && isCheckItemCompleted(item)
  ));

  if (completedCheckItems.length === 0) {
    return 0;
  }

  const normalizedConfig = normalizeCheckStreakConfig(checkStreakConfig);
  const isCategoryStreakEnabled = Boolean(
    normalizedConfig.enabled
    && useStreakMultiplier === true
  );

  if (!isCategoryStreakEnabled) {
    return completedCheckItems.length;
  }

  return completedCheckItems.reduce((sum, item) => {
    const streakDays = calculateCheckItemStreakById({
      checkItemId: item.id,
      dailyReviews,
      checkTemplates,
      targetDate
    });
    return sum + getCheckItemStreakMultiplier(streakDays, normalizedConfig);
  }, 0);
};

export const getDefaultCheckStreakConfig = (): CheckStreakConfig => ({
  enabled: DEFAULT_CHECK_STREAK_CONFIG.enabled,
  tiers: DEFAULT_CHECK_STREAK_CONFIG.tiers.map((tier) => ({ ...tier }))
});
