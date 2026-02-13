/**
 * @file autoCheckUtils.ts
 * @input CheckItem, Logs, FilterContext
 * @output Auto-check completion status
 * @pos Utility (Auto Check)
 * @description 自动日课判断逻辑 - 根据筛选条件和统计规则自动判断日课完成状态
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { CheckItem, Log, AutoCheckConfig } from '../types';
import { parseFilterExpression, matchesFilter, FilterContext } from './filterUtils';

/**
 * 计算匹配记录的统计信息
 */
interface LogStats {
  totalDuration: number; // 总时长（分钟）
  earliestStart: number | null; // 最早开始时间（分钟，从 0:00 开始）
  latestStart: number | null; // 最晚开始时间（分钟）
  earliestEnd: number | null; // 最早结束时间（分钟）
  latestEnd: number | null; // 最晚结束时间（分钟）
  count: number; // 匹配记录的次数
}

/**
 * 将时间戳转换为分钟数（从 0:00 开始）
 */
function timestampToMinutes(timestamp: number): number {
  const date = new Date(timestamp);
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * 计算匹配筛选条件的记录统计
 */
function calculateLogStats(
  logs: Log[],
  filterExpression: string,
  context: FilterContext,
  targetDate: Date
): LogStats {
  const stats: LogStats = {
    totalDuration: 0,
    earliestStart: null,
    latestStart: null,
    earliestEnd: null,
    latestEnd: null,
    count: 0
  };

  if (!filterExpression.trim()) {
    return stats;
  }

  const condition = parseFilterExpression(filterExpression);
  
  // 筛选当天的记录
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  const filteredLogs = logs.filter(log => {
    const logStartTime = log.startTime;
    const isInDateRange = logStartTime >= dayStart.getTime() && logStartTime <= dayEnd.getTime();
    const matchesCondition = matchesFilter(log, condition, context);
    
    return isInDateRange && matchesCondition;
  });

  // 计算统计信息
  filteredLogs.forEach(log => {
    // 时长（duration 是秒，转换为分钟）
    stats.totalDuration += Math.round(log.duration / 60);
    
    // 次数
    stats.count++;

    // 时间点（从时间戳转换为当天的分钟数）
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
  });

  return stats;
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
  const stats = calculateLogStats(logs, config.filterExpression, context, targetDate);

  // 根据判断类型获取实际值
  let actualValue: number | null = null;
  
  switch (config.comparisonType) {
    case 'duration':
      actualValue = stats.totalDuration;
      break;
    case 'earliestStart':
      actualValue = stats.earliestStart;
      break;
    case 'latestStart':
      actualValue = stats.latestStart;
      break;
    case 'earliestEnd':
      actualValue = stats.earliestEnd;
      break;
    case 'latestEnd':
      actualValue = stats.latestEnd;
      break;
    case 'count':
      actualValue = stats.count;
      break;
  }

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
      return {
        ...item,
        isCompleted: evaluateAutoCheck(item, logs, context, targetDate)
      };
    }
    return item;
  });
}

/**
 * 格式化时间值为可读字符串
 * @param minutes - 分钟数（从 0:00 开始）
 * @returns 格式化的时间字符串，如 "08:30"
 */
export function formatTimeValue(minutes: number): string {
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
