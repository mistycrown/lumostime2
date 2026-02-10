/**
 * @file useStatsCalculation.ts
 * @input logs, categories, dateRange, excludedCategoryIds
 * @output stats (totalDuration, categoryStats), previousStats
 * @pos Hook (Statistics Calculation)
 * @description 统一的活动统计计算 Hook - 计算当前周期和前一周期的活动时长统计
 * 
 * 使用场景：
 * - StatsView (Pie Chart View)
 * - StatsView (Line Chart View)
 * - 其他需要活动统计的地方
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { useMemo } from 'react';
import { Log, Category, Activity } from '../types';

export interface ActivityStat extends Activity {
  duration: number;
}

export interface CategoryStat extends Category {
  duration: number;
  percentage: number;
  items: ActivityStat[];
}

export interface StatsData {
  totalDuration: number;
  categoryStats: CategoryStat[];
}

export interface PreviousStatsData {
  totalDuration: number;
  catDurations: Map<string, number>;
  actDurations: Map<string, number>;
}

export interface UseStatsCalculationOptions {
  logs: Log[];
  categories: Category[];
  dateRange: { start: Date; end: Date };
  excludedCategoryIds?: string[];
  includePrevious?: boolean;
}

export interface UseStatsCalculationReturn {
  stats: StatsData;
  previousStats: PreviousStatsData | null;
  filteredLogs: Log[];
}

/**
 * 计算活动统计数据
 * 
 * @param options - 配置选项
 * @returns 统计数据和前一周期数据
 * 
 * @example
 * ```typescript
 * const { stats, previousStats } = useStatsCalculation({
 *   logs,
 *   categories,
 *   dateRange: { start: rangeStart, end: rangeEnd },
 *   excludedCategoryIds,
 *   includePrevious: true
 * });
 * 
 * // stats.totalDuration - 总时长（秒）
 * // stats.categoryStats - 分类统计数组
 * // previousStats.catDurations - 前一周期分类时长 Map
 * ```
 */
export const useStatsCalculation = ({
  logs,
  categories,
  dateRange,
  excludedCategoryIds = [],
  includePrevious = false
}: UseStatsCalculationOptions): UseStatsCalculationReturn => {
  
  // 过滤当前周期的日志
  const filteredLogs = useMemo(() => {
    return logs.filter(log =>
      log.startTime >= dateRange.start.getTime() &&
      log.endTime <= dateRange.end.getTime() &&
      !excludedCategoryIds.includes(log.categoryId)
    );
  }, [logs, dateRange.start, dateRange.end, excludedCategoryIds]);

  // 计算当前周期统计
  const stats = useMemo(() => {
    const totalDuration = filteredLogs.reduce(
      (acc, log) => acc + Math.max(0, (log.endTime - log.startTime) / 1000),
      0
    );

    const categoryStats: CategoryStat[] = categories
      .map(cat => {
        const catLogs = filteredLogs.filter(l => l.categoryId === cat.id);
        const catDuration = catLogs.reduce(
          (acc, l) => acc + Math.max(0, (l.endTime - l.startTime) / 1000),
          0
        );

        const activityStats: ActivityStat[] = cat.activities
          .map(act => {
            const actLogs = catLogs.filter(l => l.activityId === act.id);
            const actDuration = actLogs.reduce(
              (acc, l) => acc + Math.max(0, (l.endTime - l.startTime) / 1000),
              0
            );
            return { ...act, duration: actDuration };
          })
          .filter(a => a.duration > 0)
          .sort((a, b) => b.duration - a.duration);

        return {
          ...cat,
          duration: catDuration,
          percentage: totalDuration > 0 ? (catDuration / totalDuration) * 100 : 0,
          items: activityStats
        };
      })
      .filter(s => s.duration > 0)
      .sort((a, b) => b.duration - a.duration);

    return { totalDuration, categoryStats };
  }, [filteredLogs, categories]);

  // 计算前一周期统计（如果需要）
  const previousStats = useMemo(() => {
    if (!includePrevious) return null;

    // 计算前一周期的日期范围
    const duration = dateRange.end.getTime() - dateRange.start.getTime();
    const previousStart = new Date(dateRange.start.getTime() - duration);
    const previousEnd = new Date(dateRange.end.getTime() - duration);

    const previousFilteredLogs = logs.filter(log =>
      log.startTime >= previousStart.getTime() &&
      log.endTime <= previousEnd.getTime() &&
      !excludedCategoryIds.includes(log.categoryId)
    );

    const totalDuration = previousFilteredLogs.reduce(
      (acc, log) => acc + Math.max(0, (log.endTime - log.startTime) / 1000),
      0
    );

    const catDurations = new Map<string, number>();
    const actDurations = new Map<string, number>();

    previousFilteredLogs.forEach(log => {
      const d = Math.max(0, (log.endTime - log.startTime) / 1000);
      catDurations.set(log.categoryId, (catDurations.get(log.categoryId) || 0) + d);
      actDurations.set(log.activityId, (actDurations.get(log.activityId) || 0) + d);
    });

    return { totalDuration, catDurations, actDurations };
  }, [logs, dateRange, excludedCategoryIds, includePrevious]);

  return {
    stats,
    previousStats,
    filteredLogs
  };
};
