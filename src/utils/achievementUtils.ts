/**
 * @file achievementUtils.ts
 * @input Achievement rules, logs, and date ranges
 * @output Achievement daily snapshot helpers and summary calculations
 * @pos Utility (Achievement)
 * @description 成就系统计算工具 - 负责每日快照计算、日期枚举和账本汇总。
 *
 * @updated 2026-03-28: Added initial achievement snapshot and balance helpers for the achievement bottle system.
 */
import {
  AchievementDailySnapshot,
  AchievementDailyRuleBreakdown,
  AchievementRedemptionRecord,
  AchievementRule,
  Log
} from '../types';
import { getLocalDateStr } from './dateUtils';

const DAY_MS = 24 * 60 * 60 * 1000;

const createDateAtNoon = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
};

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
  rules: AchievementRule[]
): AchievementDailySnapshot => {
  const activeRules = rules.filter((rule) => rule.enabled && rule.targetIds.length > 0 && rule.unitMinutes > 0 && rule.deltaPerUnit > 0);
  const dayLogs = logs.filter((log) => getLocalDateStr(new Date(log.startTime)) === date);

  const ruleBreakdown: AchievementDailyRuleBreakdown[] = activeRules.map((rule) => {
    const matchedSeconds = dayLogs
      .filter((log) => rule.targetIds.includes(log.activityId))
      .reduce((sum, log) => sum + Math.max(0, log.duration || 0), 0);

    const matchedMinutes = Math.floor(matchedSeconds / 60);
    const appliedUnits = Math.floor(matchedMinutes / rule.unitMinutes);
    const rawDelta = appliedUnits * rule.deltaPerUnit;
    const delta = rule.effectType === 'spend' ? -rawDelta : rawDelta;

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      effectType: rule.effectType,
      matchedMinutes,
      unitMinutes: rule.unitMinutes,
      deltaPerUnit: rule.deltaPerUnit,
      appliedUnits,
      delta,
      targetIds: [...rule.targetIds]
    };
  }).filter((item) => item.appliedUnits > 0 && item.delta !== 0);

  return {
    id: crypto.randomUUID(),
    date,
    netDelta: ruleBreakdown.reduce((sum, item) => sum + item.delta, 0),
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
  return earned - spent;
};

export const calculateAchievementTotalEarned = (snapshots: AchievementDailySnapshot[]): number => {
  return snapshots.reduce((sum, item) => sum + Math.max(0, item.netDelta), 0);
};

export const calculateAchievementTotalRedeemed = (redemptionRecords: AchievementRedemptionRecord[]): number => {
  return redemptionRecords.reduce((sum, item) => sum + item.cost, 0);
};
