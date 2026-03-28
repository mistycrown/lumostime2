/**
 * @file achievementUtils.ts
 * @input Achievement rules, logs, and date ranges
 * @output Achievement daily snapshot helpers and summary calculations
 * @pos Utility (Achievement)
 * @description 成就系统计算工具 - 负责每日快照计算、日期枚举和账本汇总。
 *
 * @updated 2026-03-28: Added decimal-safe star helpers so achievement balances and rule settlement keep one decimal place while bottle rendering can floor the visible star count.
 */
import {
  AchievementDailySnapshot,
  AchievementDailyRuleBreakdown,
  AchievementRedemptionRecord,
  AchievementRule,
  DailyReview,
  Log,
  TodoItem
} from '../types';
import { getLocalDateStr } from './dateUtils';

const DAY_MS = 24 * 60 * 60 * 1000;
const ACHIEVEMENT_STAR_DECIMALS = 1;
const ACHIEVEMENT_STAR_FACTOR = 10 ** ACHIEVEMENT_STAR_DECIMALS;

const createDateAtNoon = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
};

const normalizeUnitAmount = (rule: AchievementRule | (AchievementRule & { unitMinutes?: number })): number => {
  return Math.max(1, Math.floor(rule.unitAmount ?? rule.unitMinutes ?? 1));
};

export const normalizeAchievementStarValue = (value: number): number => {
  const safeValue = Number.isFinite(value) ? value : 0;
  const rounded = Math.round((safeValue + Number.EPSILON) * ACHIEVEMENT_STAR_FACTOR) / ACHIEVEMENT_STAR_FACTOR;
  return Object.is(rounded, -0) ? 0 : rounded;
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
    matchedValue: Math.max(0, Math.floor(item.matchedValue ?? item.matchedMinutes ?? 0)),
    unitAmount: Math.max(1, Math.floor(item.unitAmount ?? item.unitMinutes ?? 1)),
    deltaPerUnit: Math.max(0.1, normalizeAchievementStarValue(item.deltaPerUnit || 1)),
    delta: normalizeAchievementStarValue(item.delta || 0),
    targetIds: Array.isArray(item.targetIds) ? item.targetIds : []
  }))
});

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
  rules: AchievementRule[]
): AchievementDailySnapshot => {
  const activeRules = rules
    .map(normalizeAchievementRule)
    .filter((rule) => rule.enabled && rule.targetIds.length > 0 && rule.unitAmount > 0 && rule.deltaPerUnit > 0);
  const dayLogs = logs.filter((log) => getLocalDateStr(new Date(log.startTime)) === date);
  const completedTodos = todos.filter((todo) => (
    todo.isCompleted &&
    todo.completedAt &&
    getLocalDateStr(new Date(todo.completedAt)) === date
  ));
  const dayReview = dailyReviews.find((review) => review.date === date);
  const completedCheckItems = (dayReview?.checkItems || []).filter((item) => item.isCompleted && item.category);

  const ruleBreakdown: AchievementDailyRuleBreakdown[] = activeRules.map((rule) => {
    const matchedValue = (() => {
      if (rule.targetType === 'activity') {
        const matchedSeconds = dayLogs
          .filter((log) => rule.targetIds.includes(log.activityId))
          .reduce((sum, log) => sum + Math.max(0, log.duration || 0), 0);
        return Math.floor(matchedSeconds / 60);
      }

      if (rule.targetType === 'scope') {
        const matchedSeconds = dayLogs
          .filter((log) => (
            Array.isArray(log.scopeIds) &&
            log.scopeIds.some((scopeId) => rule.targetIds.includes(scopeId))
          ))
          .reduce((sum, log) => sum + Math.max(0, log.duration || 0), 0);
        return Math.floor(matchedSeconds / 60);
      }

      if (rule.targetType === 'todoCategory') {
        return completedTodos.filter((todo) => rule.targetIds.includes(todo.categoryId)).length;
      }

      return completedCheckItems.filter((item) => item.category && rule.targetIds.includes(item.category)).length;
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

export const calculateAchievementAvailableStars = (
  snapshots: AchievementDailySnapshot[],
  redemptionRecords: AchievementRedemptionRecord[]
): number => {
  const earned = snapshots.reduce((sum, item) => sum + item.netDelta, 0);
  const spent = redemptionRecords.reduce((sum, item) => sum + item.cost, 0);
  return normalizeAchievementStarValue(earned - spent);
};

export const calculateAchievementTotalEarned = (snapshots: AchievementDailySnapshot[]): number => {
  return normalizeAchievementStarValue(snapshots.reduce((sum, item) => sum + Math.max(0, item.netDelta), 0));
};

export const calculateAchievementTotalRedeemed = (redemptionRecords: AchievementRedemptionRecord[]): number => {
  return normalizeAchievementStarValue(redemptionRecords.reduce((sum, item) => sum + item.cost, 0));
};
