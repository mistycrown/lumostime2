/**
 * @file achievementUtils.ts
 * @input Achievement rules, logs, and date ranges
 * @output Achievement daily snapshot helpers and summary calculations
 * @pos Utility (Achievement)
 * @description 成就系统计算工具 - 负责每日快照计算、日期枚举和账本汇总。
 *
 * @updated 2026-06-30: Added shared seal validation so bottles cannot be sealed while the current active balance is negative.
 * @updated 2026-07-07: Added explicit current/history account summaries and made seal previews use the current-bottle account balance.
 * @updated 2026-04-25: Added check-category streak weighting so daily check rules can sum per-item multiplier contributions.
 * @updated 2026-04-17: Added filter-expression duration rules that reuse the shared custom-filter matching logic.
 * @updated 2026-04-07: Separates live-period spending from remaining carryover so archived carryover-funded redemptions do not inflate the active balance.
 */
import {
  AchievementArchivedBottle,
  AchievementBottleActionRecord,
  AchievementCollectionRecord,
  AchievementDailySnapshot,
  AchievementDailyRuleBreakdown,
  AchievementAccountSummary,
  CheckStreakConfig,
  CheckTemplate,
  AchievementRedemptionRecord,
  AchievementSealPreview,
  AchievementRule,
  DailyReview,
  Log,
  TodoItem
} from '../types';
import { getLocalDateStr } from './dateUtils';
import { getCheckCategoryWeightedCompletionValue } from './checkStreakUtils';
import { FilterContext, matchesFilter, parseFilterExpression } from './filterUtils';

const DAY_MS = 24 * 60 * 60 * 1000;
const ACHIEVEMENT_STAR_DECIMALS = 1;
const ACHIEVEMENT_STAR_FACTOR = 10 ** ACHIEVEMENT_STAR_DECIMALS;

interface AchievementSpendRecordLike {
  id?: string;
  rewardName?: string;
  collectionName?: string;
  cost: number;
  redeemedAt?: number;
  paidFromCarryover?: number;
  paidFromLiveStars?: number;
}

interface AchievementActionRecordLike {
  actionType: AchievementBottleActionRecord['actionType'];
  amount: number;
}

interface AchievementFundingLike {
  cost: number;
  paidFromCarryover?: number;
  paidFromLiveStars?: number;
}

interface AchievementSealRedemptionFragment extends AchievementRedemptionRecord {
  sourceRecordId: string;
}

const createDateAtNoon = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
};

const shiftAchievementDate = (dateStr: string, deltaDays: number): string => {
  const nextDate = createDateAtNoon(dateStr);
  nextDate.setDate(nextDate.getDate() + deltaDays);
  nextDate.setHours(12, 0, 0, 0);
  return getLocalDateStr(nextDate);
};

const isAchievementDateInRange = (date: string, startDate: string, endDate: string): boolean => {
  return date >= startDate && date <= endDate;
};

const normalizeUnitAmount = (rule: AchievementRule | (AchievementRule & { unitMinutes?: number })): number => {
  return Math.max(1, Math.floor(rule.unitAmount ?? rule.unitMinutes ?? 1));
};

const getDurationMinutesFromLogs = (logs: Log[]): number => {
  const matchedSeconds = logs.reduce((sum, log) => sum + Math.max(0, log.duration || 0), 0);
  return Math.floor(matchedSeconds / 60);
};

export const normalizeAchievementStarValue = (value: number): number => {
  const safeValue = Number.isFinite(value) ? value : 0;
  const rounded = Math.round((safeValue + Number.EPSILON) * ACHIEVEMENT_STAR_FACTOR) / ACHIEVEMENT_STAR_FACTOR;
  return Object.is(rounded, -0) ? 0 : rounded;
};

export const normalizeAchievementRedemptionRecordFunding = <T extends AchievementFundingLike>(record: T) => {
  const normalizedCost = Math.max(0, normalizeAchievementStarValue(record.cost || 0));
  const normalizedCarryover = Math.max(
    0,
    Math.min(normalizedCost, normalizeAchievementStarValue(record.paidFromCarryover || 0))
  );
  const normalizedLive = Math.max(
    0,
    Math.min(
      normalizeAchievementStarValue(
        record.paidFromLiveStars === undefined
          ? normalizedCost - normalizedCarryover
          : record.paidFromLiveStars || 0
      ),
      normalizeAchievementStarValue(normalizedCost - normalizedCarryover)
    )
  );

  return {
    ...record,
    cost: normalizedCost,
    paidFromCarryover: normalizedCarryover,
    paidFromLiveStars: normalizedLive
  };
};

export const formatAchievementStars = (value: number): string => {
  return normalizeAchievementStarValue(value).toFixed(ACHIEVEMENT_STAR_DECIMALS);
};

export const formatAchievementSignedStars = (value: number): string => {
  const normalized = normalizeAchievementStarValue(value);
  return normalized > 0 ? `+${formatAchievementStars(normalized)}` : formatAchievementStars(normalized);
};

export const getAchievementRenderableStarCount = (value: number): number => {
  return Math.max(0, Math.floor(normalizeAchievementStarValue(value)));
};

export const normalizeAchievementRule = (
  rule: AchievementRule | (AchievementRule & { unitMinutes?: number; targetType?: AchievementRule['targetType'] })
): AchievementRule => ({
  ...rule,
  targetType: rule.targetType ?? 'activity',
  useCheckStreakMultiplier: rule.useCheckStreakMultiplier === true,
  filterExpression: rule.filterExpression?.trim() || undefined,
  unitAmount: normalizeUnitAmount(rule),
  deltaPerUnit: Math.max(0.1, normalizeAchievementStarValue(rule.deltaPerUnit || 1)),
  targetIds: Array.isArray(rule.targetIds) ? rule.targetIds : []
});

export const normalizeAchievementSnapshot = (
  snapshot: AchievementDailySnapshot | (AchievementDailySnapshot & {
    ruleBreakdown?: Array<AchievementDailyRuleBreakdown & {
      matchedMinutes?: number;
      unitMinutes?: number;
      targetType?: AchievementRule['targetType'];
    }>;
  })
): AchievementDailySnapshot => ({
  ...snapshot,
  netDelta: normalizeAchievementStarValue(snapshot.netDelta || 0),
  ruleBreakdown: (snapshot.ruleBreakdown || []).map((item) => ({
    ...item,
    targetType: item.targetType ?? 'activity',
    useCheckStreakMultiplier: item.useCheckStreakMultiplier === true,
    filterExpression: item.filterExpression?.trim() || undefined,
    matchedValue: Math.max(0, normalizeAchievementStarValue(item.matchedValue ?? item.matchedMinutes ?? 0)),
    unitAmount: Math.max(1, Math.floor(item.unitAmount ?? item.unitMinutes ?? 1)),
    deltaPerUnit: Math.max(0.1, normalizeAchievementStarValue(item.deltaPerUnit || 1)),
    delta: normalizeAchievementStarValue(item.delta || 0),
    targetIds: Array.isArray(item.targetIds) ? item.targetIds : []
  }))
});

interface AchievementComputationContext extends FilterContext {
  checkTemplates?: CheckTemplate[];
  checkStreakConfig?: CheckStreakConfig | null;
}

export const getAchievementYesterday = (baseDate: Date = new Date()): string => {
  const yesterday = new Date(baseDate.getTime() - DAY_MS);
  return getLocalDateStr(yesterday);
};

export const enumerateAchievementDates = (startDate: string, endDate: string): string[] => {
  if (!startDate || !endDate) {
    return [];
  }

  const result: string[] = [];
  const current = createDateAtNoon(startDate);
  const end = createDateAtNoon(endDate);

  while (current.getTime() <= end.getTime()) {
    result.push(getLocalDateStr(current));
    current.setDate(current.getDate() + 1);
    current.setHours(12, 0, 0, 0);
  }

  return result;
};

export const computeAchievementDailySnapshot = (
  date: string,
  logs: Log[],
  todos: TodoItem[],
  dailyReviews: DailyReview[],
  rules: AchievementRule[],
  filterContext?: AchievementComputationContext
): AchievementDailySnapshot => {
  const effectiveFilterContext: AchievementComputationContext = filterContext ?? {
    categories: [],
    scopes: [],
    todos,
    todoCategories: [],
    checkTemplates: [],
    checkStreakConfig: null
  };
  const activeRules = rules
    .map(normalizeAchievementRule)
    .filter((rule) => (
      rule.enabled
      && rule.unitAmount > 0
      && rule.deltaPerUnit > 0
      && (
        (rule.targetType === 'filterDuration' && Boolean(rule.filterExpression?.trim()))
        || rule.targetIds.length > 0
      )
    ));
  const dayLogs = logs.filter((log) => getLocalDateStr(new Date(log.startTime)) === date);
  const completedTodos = todos.filter((todo) => (
    todo.isCompleted
    && todo.completedAt
    && getLocalDateStr(new Date(todo.completedAt)) === date
  ));
  const dayReview = dailyReviews.find((review) => review.date === date);

  const ruleBreakdown: AchievementDailyRuleBreakdown[] = activeRules.map((rule) => {
    const matchedValue = (() => {
      if (rule.targetType === 'activity') {
        return getDurationMinutesFromLogs(
          dayLogs.filter((log) => rule.targetIds.includes(log.activityId))
        );
      }

      if (rule.targetType === 'scope') {
        return getDurationMinutesFromLogs(
          dayLogs.filter((log) => (
            Array.isArray(log.scopeIds)
            && log.scopeIds.some((scopeId) => rule.targetIds.includes(scopeId))
          ))
        );
      }

      if (rule.targetType === 'filterDuration') {
        const condition = parseFilterExpression(rule.filterExpression || '');
        return getDurationMinutesFromLogs(
          dayLogs.filter((log) => matchesFilter(log, condition, effectiveFilterContext))
        );
      }

      if (rule.targetType === 'todoCategory') {
        return completedTodos.filter((todo) => rule.targetIds.includes(todo.categoryId)).length;
      }

      return normalizeAchievementStarValue(rule.targetIds.reduce((sum, categoryId) => {
        if (!dayReview) {
          return sum;
        }

        return sum + getCheckCategoryWeightedCompletionValue({
          category: categoryId,
          dayReview,
          dailyReviews,
          checkTemplates: effectiveFilterContext.checkTemplates || [],
          targetDate: createDateAtNoon(date),
          checkStreakConfig: effectiveFilterContext.checkStreakConfig,
          useStreakMultiplier: rule.useCheckStreakMultiplier === true
        });
      }, 0));
    })();

    const appliedUnits = normalizeAchievementStarValue(matchedValue / rule.unitAmount);
    const rawDelta = normalizeAchievementStarValue(appliedUnits * rule.deltaPerUnit);
    const delta = normalizeAchievementStarValue(rule.effectType === 'spend' ? -rawDelta : rawDelta);

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      effectType: rule.effectType,
      targetType: rule.targetType,
      matchedValue,
      useCheckStreakMultiplier: rule.useCheckStreakMultiplier === true,
      filterExpression: rule.filterExpression,
      unitAmount: rule.unitAmount,
      deltaPerUnit: rule.deltaPerUnit,
      appliedUnits,
      delta,
      targetIds: [...rule.targetIds]
    };
  }).filter((item) => item.appliedUnits > 0 && item.delta !== 0);

  return {
    id: crypto.randomUUID(),
    date,
    netDelta: normalizeAchievementStarValue(ruleBreakdown.reduce((sum, item) => sum + item.delta, 0)),
    ruleBreakdown,
    computedAt: Date.now()
  };
};

export const sortAchievementSnapshots = (snapshots: AchievementDailySnapshot[]): AchievementDailySnapshot[] => {
  return [...snapshots].sort((first, second) => first.date.localeCompare(second.date));
};

export const calculateAchievementSnapshotFlows = (snapshots: AchievementDailySnapshot[]) => {
  const earnedStars = normalizeAchievementStarValue(
    snapshots.reduce((sum, item) => sum + Math.max(0, item.netDelta), 0)
  );
  const spentStars = normalizeAchievementStarValue(
    snapshots.reduce((sum, item) => sum + Math.abs(Math.min(0, item.netDelta)), 0)
  );
  const netStars = normalizeAchievementStarValue(
    snapshots.reduce((sum, item) => sum + item.netDelta, 0)
  );

  return {
    earnedStars,
    spentStars,
    netStars
  };
};

export const calculateAchievementAvailableStars = (
  snapshots: AchievementDailySnapshot[],
  spendRecords: AchievementSpendRecordLike[],
  actionRecords: AchievementActionRecordLike[] = [],
  activeBottleCarryoverStars?: number
): number => {
  return calculateAchievementAccountSummary(
    snapshots,
    spendRecords,
    actionRecords,
    activeBottleCarryoverStars
  ).totalStars;
};

export const calculateAchievementAccountSummary = (
  snapshots: AchievementDailySnapshot[],
  spendRecords: AchievementSpendRecordLike[],
  actionRecords: AchievementActionRecordLike[] = [],
  activeBottleCarryoverStars?: number
): AchievementAccountSummary => {
  const earned = snapshots.reduce((sum, item) => sum + item.netDelta, 0);
  const returned = actionRecords.reduce((sum, item) => (
    item.actionType === 'shatter' ? sum + item.amount : sum
  ), 0);
  const spentFromCarryover = spendRecords.reduce((sum, item) => {
    const normalized = normalizeAchievementRedemptionRecordFunding(item);
    return sum + normalized.paidFromCarryover;
  }, 0);
  const spentFromLiveStars = spendRecords.reduce((sum, item) => {
    const normalized = normalizeAchievementRedemptionRecordFunding(item);
    return sum + normalized.paidFromLiveStars;
  }, 0);
  const remainingCarryoverStars = activeBottleCarryoverStars === undefined
    ? normalizeAchievementStarValue(returned - spentFromCarryover)
    : normalizeAchievementStarValue(activeBottleCarryoverStars);
  const currentStars = normalizeAchievementStarValue(earned - spentFromLiveStars);
  const historyStars = normalizeAchievementStarValue(remainingCarryoverStars);

  return {
    currentStars,
    historyStars,
    totalStars: normalizeAchievementStarValue(currentStars + historyStars)
  };
};

export const calculateAchievementTotalEarned = (snapshots: AchievementDailySnapshot[]): number => {
  return normalizeAchievementStarValue(snapshots.reduce((sum, item) => sum + Math.max(0, item.netDelta), 0));
};

export const calculateAchievementTotalRedeemed = (spendRecords: AchievementSpendRecordLike[]): number => {
  return normalizeAchievementStarValue(spendRecords.reduce((sum, item) => sum + item.cost, 0));
};

export const getAchievementSealBlockedReason = ({
  sealPreview,
  availableStars
}: {
  sealPreview: AchievementSealPreview | null;
  availableStars: number;
}): string | null => {
  if (!sealPreview) {
    return '昨天之前还没有新的内容可以封瓶';
  }

  if (normalizeAchievementStarValue(availableStars) < 0) {
    return '当前光点为负，暂时不能封瓶';
  }

  if (sealPreview.sealableStars <= 0) {
    return '这段时间还没有可封存的正向余额';
  }

  return null;
};

export const getAchievementSealPreview = ({
  achievementStartDate,
  archivedBottles,
  dailySnapshots,
  spendRecords,
  redemptionRecords,
  today = new Date()
}: {
  achievementStartDate: string | null;
  archivedBottles: AchievementArchivedBottle[];
  dailySnapshots: AchievementDailySnapshot[];
  spendRecords?: AchievementSpendRecordLike[];
  redemptionRecords?: AchievementRedemptionRecord[];
  today?: Date;
}): AchievementSealPreview | null => {
  if (!achievementStartDate) {
    return null;
  }

  const lastArchivedEndDate = archivedBottles.reduce<string | null>((latest, bottle) => {
    if (!latest || bottle.periodEndDate > latest) {
      return bottle.periodEndDate;
    }
    return latest;
  }, null);
  const startDate = lastArchivedEndDate ? shiftAchievementDate(lastArchivedEndDate, 1) : achievementStartDate;
  const endDate = getAchievementYesterday(today);

  if (!startDate || startDate > endDate) {
    return null;
  }

  const snapshotsInRange = dailySnapshots.filter((snapshot) => (
    isAchievementDateInRange(snapshot.date, startDate, endDate)
  ));
  const effectiveRedemptionRecords = redemptionRecords ?? [];
  const redemptionsInRange = effectiveRedemptionRecords.filter((record) => {
    const recordDate = getLocalDateStr(new Date(record.redeemedAt));
    return isAchievementDateInRange(recordDate, startDate, endDate);
  });
  const effectiveSpendRecords = spendRecords ?? effectiveRedemptionRecords;
  const spendRecordsInRange = effectiveSpendRecords.filter((record) => {
    if (!record.redeemedAt) {
      return false;
    }

    const recordDate = getLocalDateStr(new Date(record.redeemedAt));
    return isAchievementDateInRange(recordDate, startDate, endDate);
  });
  const snapshotFlows = calculateAchievementSnapshotFlows(snapshotsInRange);
  const spentFromCarryover = normalizeAchievementStarValue(
    spendRecordsInRange.reduce((sum, record) => {
      const normalized = normalizeAchievementRedemptionRecordFunding(record);
      return sum + normalized.paidFromCarryover;
    }, 0)
  );
  const spentFromLiveStars = normalizeAchievementStarValue(
    spendRecordsInRange.reduce((sum, record) => {
      const normalized = normalizeAchievementRedemptionRecordFunding(record);
      return sum + normalized.paidFromLiveStars;
    }, 0)
  );

  return {
    startDate,
    endDate,
    earnedStars: snapshotFlows.earnedStars,
    spentStars: normalizeAchievementStarValue(snapshotFlows.spentStars + spentFromLiveStars + spentFromCarryover),
    liveSpentStars: normalizeAchievementStarValue(snapshotFlows.spentStars + spentFromLiveStars),
    carryoverSpentStars: spentFromCarryover,
    sealableStars: normalizeAchievementStarValue(snapshotFlows.netStars - spentFromLiveStars),
    snapshotIds: snapshotsInRange.map((snapshot) => snapshot.id),
    redemptionRecordIds: redemptionsInRange.map((record) => record.id)
  };
};

export const partitionAchievementRedemptionsForSeal = ({
  startDate,
  endDate,
  redemptionRecords
}: {
  startDate: string;
  endDate: string;
  redemptionRecords: AchievementRedemptionRecord[];
}) => {
  const archivedRecords: AchievementSealRedemptionFragment[] = [];
  const remainingActiveRecords: AchievementSealRedemptionFragment[] = [];

  redemptionRecords.forEach((record) => {
    const normalized = normalizeAchievementRedemptionRecordFunding(record);
    const recordDate = getLocalDateStr(new Date(record.redeemedAt));
    const inRange = isAchievementDateInRange(recordDate, startDate, endDate);

    if (!inRange) {
      remainingActiveRecords.push({
        ...normalized,
        sourceRecordId: record.id
      });
      return;
    }

    if (normalized.paidFromLiveStars > 0) {
      archivedRecords.push({
        ...normalized,
        cost: normalized.paidFromLiveStars,
        paidFromCarryover: 0,
        paidFromLiveStars: normalized.paidFromLiveStars,
        sourceRecordId: record.id
      });
    }

    if (normalized.paidFromCarryover > 0) {
      remainingActiveRecords.push({
        ...normalized,
        cost: normalized.paidFromCarryover,
        paidFromCarryover: normalized.paidFromCarryover,
        paidFromLiveStars: 0,
        sourceRecordId: record.id
      });
    }
  });

  return {
    archivedRecords,
    remainingActiveRecords
  };
};

export const partitionAchievementCollectionRecordsForSeal = ({
  startDate,
  endDate,
  collectionRecords
}: {
  startDate: string;
  endDate: string;
  collectionRecords: AchievementCollectionRecord[];
}) => {
  const archivedRecords: AchievementSealRedemptionFragment[] = [];
  const remainingActiveRecords: AchievementCollectionRecord[] = [];

  collectionRecords.forEach((record) => {
    const normalized = normalizeAchievementRedemptionRecordFunding(record);
    const recordDate = getLocalDateStr(new Date(record.redeemedAt));
    const inRange = isAchievementDateInRange(recordDate, startDate, endDate);

    if (!inRange) {
      remainingActiveRecords.push({
        ...record,
        paidFromCarryover: normalized.paidFromCarryover || undefined,
        paidFromLiveStars: normalized.paidFromLiveStars || undefined
      });
      return;
    }

    if (normalized.paidFromLiveStars > 0) {
      archivedRecords.push({
        id: crypto.randomUUID(),
        sourceRecordId: record.id,
        rewardId: `collection:${record.collectionId}`,
        rewardName: `收藏：${record.collectionName}`,
        cost: normalized.paidFromLiveStars,
        redeemedAt: record.redeemedAt,
        paidFromCarryover: 0,
        paidFromLiveStars: normalized.paidFromLiveStars,
        note: record.note
      });
    }

    if (normalized.paidFromCarryover > 0) {
      remainingActiveRecords.push({
        ...record,
        cost: normalized.paidFromCarryover,
        paidFromCarryover: normalized.paidFromCarryover,
        paidFromLiveStars: undefined
      });
    }
  });

  return {
    archivedRecords,
    remainingActiveRecords
  };
};

export const getAchievementActiveStartDate = (
  achievementStartDate: string | null,
  archivedBottles: AchievementArchivedBottle[]
): string | null => {
  if (!achievementStartDate) {
    return null;
  }

  const lastArchivedEndDate = archivedBottles.reduce<string | null>((latest, bottle) => {
    if (!latest || bottle.periodEndDate > latest) {
      return bottle.periodEndDate;
    }
    return latest;
  }, null);

  return lastArchivedEndDate ? shiftAchievementDate(lastArchivedEndDate, 1) : achievementStartDate;
};
