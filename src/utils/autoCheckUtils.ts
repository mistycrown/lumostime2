/**
 * @file autoCheckUtils.ts
 * @updated 2026-08-28: Uses the previous local date when refreshing night-earliest checks from a daily review.
 * @input CheckItem, Logs, FilterContext
 * @output Auto-check completion status
 * @pos Utility (Auto Check)
 * @description 自动日课判断逻辑 - 根据筛选条件和统计规则自动判断日课完成状态
 * @updated 2026-07-30: Added reorder-safe auto-check completion change detection for Daily Review refreshes.
 * @updated 2026-08-11: Formats cross-midnight times as `HH:MM 次日` so narrow screens retain the actual time first.
 * @updated 2026-08-09: Exposed the evaluated metric for daily-check statistics.
 * @updated 2026-08-09: Planned timeline blocks are excluded from auto-check statistics.
 *
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { CheckItem, Log, AutoCheckConfig } from '../types';
import { parseFilterExpression, matchesFilter, FilterContext } from './filterUtils';
import { filterCountableLogs } from './statLogUtils';

/**
 * 计算匹配记录的统计信息
 */
interface LogStats {
  totalDuration: number; // 总时长（分钟）
  earliestStart: number | null; // 最早开始时间（分钟，从 0:00 开始）
  latestStart: number | null; // 最晚开始时间（分钟）
  nightEarliestStart: number | null; // 夜间最早开始时间（18:00-次日04:00，跨零点按延长时刻比较）
  earliestEnd: number | null; // 最早结束时间（分钟）
  latestEnd: number | null; // 最晚结束时间（分钟）
  count: number; // 匹配记录的次数
}

interface CachedLogStats {
  dayStats: Map<string, LogStats>;
  nightEarliestStarts: Map<string, number>;
}

const logStatsCache = new WeakMap<Log[], WeakMap<FilterContext, Map<string, CachedLogStats>>>();

const createEmptyStats = (): LogStats => ({
  totalDuration: 0,
  earliestStart: null,
  latestStart: null,
  nightEarliestStart: null,
  earliestEnd: null,
  latestEnd: null,
  count: 0
});

const getLocalDateKey = (date: Date): string => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

const getPreviousLocalDateKey = (timestamp: number): string => {
  const date = new Date(timestamp);
  date.setDate(date.getDate() - 1);
  return getLocalDateKey(date);
};

/**
 * 将时间戳转换为分钟数（从 0:00 开始）
 */
function timestampToMinutes(timestamp: number): number {
  const date = new Date(timestamp);
  return date.getHours() * 60 + date.getMinutes();
}

function timestampToNightMinutes(timestamp: number): number {
  const minutes = timestampToMinutes(timestamp);
  return minutes < 4 * 60 ? minutes + 24 * 60 : minutes;
}

const getCachedLogStats = (
  logs: Log[],
  filterExpression: string,
  context: FilterContext
): CachedLogStats => {
  let contextCache = logStatsCache.get(logs);
  if (!contextCache) {
    contextCache = new WeakMap<FilterContext, Map<string, CachedLogStats>>();
    logStatsCache.set(logs, contextCache);
  }

  let expressionCache = contextCache.get(context);
  if (!expressionCache) {
    expressionCache = new Map<string, CachedLogStats>();
    contextCache.set(context, expressionCache);
  }

  const existing = expressionCache.get(filterExpression);
  if (existing) {
    return existing;
  }

  const condition = parseFilterExpression(filterExpression);
  const cached: CachedLogStats = {
    dayStats: new Map<string, LogStats>(),
    nightEarliestStarts: new Map<string, number>()
  };

  filterCountableLogs(logs).forEach((log) => {
    if (!matchesFilter(log, condition, context)) {
      return;
    }

    const dayKey = getLocalDateKey(new Date(log.startTime));
    let stats = cached.dayStats.get(dayKey);
    if (!stats) {
      stats = createEmptyStats();
      cached.dayStats.set(dayKey, stats);
    }

    stats.totalDuration += Math.round(log.duration / 60);
    stats.count += 1;

    const startMinutes = timestampToMinutes(log.startTime);
    const endMinutes = timestampToMinutes(log.endTime);
    if (stats.earliestStart === null || startMinutes < stats.earliestStart) {
      stats.earliestStart = startMinutes;
    }
    if (stats.latestStart === null || startMinutes > stats.latestStart) {
      stats.latestStart = startMinutes;
    }
    if (stats.earliestEnd === null || endMinutes < stats.earliestEnd) {
      stats.earliestEnd = endMinutes;
    }
    if (stats.latestEnd === null || endMinutes > stats.latestEnd) {
      stats.latestEnd = endMinutes;
    }

    const isNightStart = startMinutes >= 18 * 60 || startMinutes < 4 * 60;
    if (!isNightStart) {
      return;
    }

    const nightDateKey = startMinutes < 4 * 60
      ? getPreviousLocalDateKey(log.startTime)
      : dayKey;
    const nightStart = timestampToNightMinutes(log.startTime);
    const existingNightStart = cached.nightEarliestStarts.get(nightDateKey);
    if (existingNightStart === undefined || nightStart < existingNightStart) {
      cached.nightEarliestStarts.set(nightDateKey, nightStart);
    }
  });

  expressionCache.set(filterExpression, cached);
  return cached;
};

/**
 * 计算匹配筛选条件的记录统计
 */
function calculateLogStats(
  logs: Log[],
  filterExpression: string,
  context: FilterContext,
  targetDate: Date
): LogStats {
  if (!filterExpression.trim()) {
    return createEmptyStats();
  }

  const cached = getCachedLogStats(logs, filterExpression, context);
  const targetDateKey = getLocalDateKey(targetDate);
  const stats = cached.dayStats.get(targetDateKey) || createEmptyStats();

  return {
    ...stats,
    nightEarliestStart: cached.nightEarliestStarts.get(targetDateKey) ?? null
  };
}

/**
 * 获取自动日课在指定日期的实际指标值。
 */
export function getAutoCheckMetricForDate(
  checkItem: CheckItem,
  logs: Log[],
  context: FilterContext,
  targetDate: Date
): number | null {
  if (checkItem.type !== 'auto' || !checkItem.autoConfig) {
    return null;
  }

  const config = checkItem.autoConfig;
  const stats = calculateLogStats(logs, config.filterExpression, context, targetDate);

  switch (config.comparisonType) {
    case 'duration':
      return stats.totalDuration;
    case 'earliestStart':
      return stats.earliestStart;
    case 'latestStart':
      return stats.latestStart;
    case 'nightEarliestStart':
      return stats.nightEarliestStart;
    case 'earliestEnd':
      return stats.earliestEnd;
    case 'latestEnd':
      return stats.latestEnd;
    case 'count':
      return stats.count;
    default:
      return null;
  }
}

/**
 * 判断自动日课是否完成
 */
export function evaluateAutoCheck(
  checkItem: CheckItem,
  logs: Log[],
  context: FilterContext,
  targetDate: Date
): boolean {
  if (checkItem.type !== 'auto' || !checkItem.autoConfig) {
    return checkItem.isCompleted; // 非自动类型，返回原值
  }

  const config = checkItem.autoConfig;
  const actualValue = getAutoCheckMetricForDate(checkItem, logs, context, targetDate);

  // 如果没有匹配的记录，返回 false
  if (actualValue === null) {
    return false;
  }

  // 根据运算符判断
  switch (config.operator) {
    case '>=':
      return actualValue >= config.targetValue;
    case '<=':
      return actualValue <= config.targetValue;
    case '>':
      return actualValue > config.targetValue;
    case '<':
      return actualValue < config.targetValue;
    case '=':
      return actualValue === config.targetValue;
    default:
      return false;
  }
}

/**
 * Return the local log date used by an automatic check.
 * Night sleep belongs to the night that started on the previous date when
 * the result is displayed in the following day's review.
 */
export function getAutoCheckEvaluationDate(checkItem: CheckItem, targetDate: Date): Date {
  if (checkItem.type !== 'auto' || checkItem.autoConfig?.comparisonType !== 'nightEarliestStart') {
    return targetDate;
  }

  const previousDate = new Date(targetDate);
  previousDate.setDate(previousDate.getDate() - 1);
  return previousDate;
}

/**
 * 批量更新自动日课的完成状态
 */
export function updateAutoCheckItems(
  checkItems: CheckItem[],
  logs: Log[],
  context: FilterContext,
  targetDate: Date
): CheckItem[] {
  return checkItems.map(item => {
    if (item.type === 'auto') {
      const evaluationDate = getAutoCheckEvaluationDate(item, targetDate);
      return {
        ...item,
        isCompleted: evaluateAutoCheck(item, logs, context, evaluationDate)
      };
    }
    return item;
  });
}

export function hasAutoCheckItemCompletionChanges(
  previousItems: CheckItem[] | undefined,
  nextItems: CheckItem[]
): boolean {
  const previousAutoItemsById = new Map(
    (previousItems || [])
      .filter((item) => item.type === 'auto')
      .map((item) => [item.id, item.isCompleted] as const)
  );

  return nextItems.some((item) => (
    item.type === 'auto' && previousAutoItemsById.get(item.id) !== item.isCompleted
  ));
}

/**
 * 格式化时间值为可读字符串
 * @param minutes - 分钟数（从 0:00 开始）
 * @returns 格式化的时间字符串，如 "08:30"
 */
export function formatTimeValue(minutes: number): string {
  if (minutes >= 24 * 60) {
    const adjustedMinutes = minutes - 24 * 60;
    const hours = Math.floor(adjustedMinutes / 60);
    const mins = adjustedMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} 次日`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * 格式化时长为可读字符串
 * @param minutes - 分钟数
 * @returns 格式化的时长字符串，如 "2小时30分钟" 或 "45分钟"
 */
export function formatDurationValue(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}小时`;
  }
  return `${hours}小时${mins}分钟`;
}
