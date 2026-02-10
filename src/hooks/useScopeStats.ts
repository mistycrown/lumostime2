/**
 * @file useScopeStats.ts
 * @input logs, scopes, categories, dateRange
 * @output scopeStats (totalDuration, categoryStats), previousScopeStats
 * @pos Hook (Statistics Calculation)
 * @description 领域专注时间统计 Hook - 计算领域相关的时长统计（支持多领域分割）
 * 
 * 使用场景：
 * - StatsView (Pie Chart View - Scopes Section)
 * - StatsView (Line Chart View - Scopes Trend)
 * 
 * 特殊处理：
 * - 如果一个 log 有多个 scope，时长会被平均分配
 * - 例如：1小时的 log 有 2 个 scope，每个 scope 计 30 分钟
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { useMemo } from 'react';
import { Log, Scope, Category } from '../types';

export interface ScopeActivityStat {
  id: string;
  name: string;
  duration: number;
  icon: string;
  color: string;
}

export interface ScopeStat extends Scope {
  duration: number;
  percentage: number;
  items: ScopeActivityStat[];
}

export interface ScopeStatsData {
  totalDuration: number;
  categoryStats: ScopeStat[];
}

export interface PreviousScopeStatsData {
  totalDuration: number;
  scopeDurations: Map<string, number>;
}

export interface UseScopeStatsOptions {
  logs: Log[];
  scopes: Scope[];
  categories: Category[];
  dateRange: { start: Date; end: Date };
  includePrevious?: boolean;
}

export interface UseScopeStatsReturn {
  scopeStats: ScopeStatsData;
  previousScopeStats: PreviousScopeStatsData | null;
}

/**
 * 计算领域统计数据
 * 
 * @param options - 配置选项
 * @returns 领域统计数据和前一周期数据
 * 
 * @example
 * ```typescript
 * const { scopeStats, previousScopeStats } = useScopeStats({
 *   logs,
 *   scopes,
 *   categories,
 *   dateRange: { start: rangeStart, end: rangeEnd },
 *   includePrevious: true
 * });
 * 
 * // scopeStats.totalDuration - 领域总时长（秒）
 * // scopeStats.categoryStats - 领域统计数组
 * ```
 */
export const useScopeStats = ({
  logs,
  scopes,
  categories,
  dateRange,
  includePrevious = false
}: UseScopeStatsOptions): UseScopeStatsReturn => {
  
  // 计算当前周期领域统计
  const scopeStats = useMemo(() => {
    // 过滤有领域关联的日志
    const logsWithScopes = logs.filter(
      l => l.scopeIds && l.scopeIds.length > 0 &&
      l.startTime >= dateRange.start.getTime() &&
      l.endTime <= dateRange.end.getTime()
    );

    // 计算每个领域的时长（支持多领域分割）
    const scopeDurations: Record<string, number> = {};
    const scopeActivityBreakdown: Record<string, Record<string, number>> = {};

    logsWithScopes.forEach(l => {
      const d = Math.max(0, (l.endTime - l.startTime) / 1000);
      const count = l.scopeIds!.length;
      const splitDuration = d / count;

      // 查找活动名称
      const cat = categories.find(c => c.id === l.categoryId);
      const act = cat?.activities.find(a => a.id === l.activityId);
      const actName = act?.name || 'Unknown';

      l.scopeIds!.forEach(sId => {
        scopeDurations[sId] = (scopeDurations[sId] || 0) + splitDuration;

        if (!scopeActivityBreakdown[sId]) scopeActivityBreakdown[sId] = {};
        scopeActivityBreakdown[sId][actName] = 
          (scopeActivityBreakdown[sId][actName] || 0) + splitDuration;
      });
    });

    // 计算总时长（不重复计算）
    const distinctTotalDuration = logsWithScopes.reduce(
      (acc, l) => acc + Math.max(0, (l.endTime - l.startTime) / 1000),
      0
    );

    // 按领域聚合
    const categoryStats = scopes
      .map(scope => {
        const duration = scopeDurations[scope.id] || 0;

        // 活动分解
        const breakdown = scopeActivityBreakdown[scope.id] || {};
        const items = Object.entries(breakdown)
          .map(([name, d]) => ({
            id: name,
            name: name,
            duration: d,
            icon: '',
            color: ''
          }))
          .sort((a, b) => b.duration - a.duration);

        return {
          ...scope,
          duration,
          percentage: distinctTotalDuration > 0 
            ? (duration / distinctTotalDuration) * 100 
            : 0,
          items,
          themeColor: scope.themeColor || 'stone'
        };
      })
      .filter(s => s.duration > 0)
      .sort((a, b) => b.duration - a.duration);

    return { totalDuration: distinctTotalDuration, categoryStats };
  }, [logs, scopes, categories, dateRange]);

  // 计算前一周期领域统计（如果需要）
  const previousScopeStats = useMemo(() => {
    if (!includePrevious) return null;

    // 计算前一周期的日期范围
    const duration = dateRange.end.getTime() - dateRange.start.getTime();
    const previousStart = new Date(dateRange.start.getTime() - duration);
    const previousEnd = new Date(dateRange.end.getTime() - duration);

    const logsWithScopes = logs.filter(
      l => l.scopeIds && l.scopeIds.length > 0 &&
      l.startTime >= previousStart.getTime() &&
      l.endTime <= previousEnd.getTime()
    );

    const scopeDurations = new Map<string, number>();

    logsWithScopes.forEach(l => {
      const d = Math.max(0, (l.endTime - l.startTime) / 1000);
      const count = l.scopeIds!.length;
      const splitDuration = d / count;

      l.scopeIds!.forEach(sId => {
        scopeDurations.set(sId, (scopeDurations.get(sId) || 0) + splitDuration);
      });
    });

    const totalDuration = logsWithScopes.reduce(
      (acc, l) => acc + Math.max(0, (l.endTime - l.startTime) / 1000),
      0
    );

    return { totalDuration, scopeDurations };
  }, [logs, scopes, dateRange, includePrevious]);

  return {
    scopeStats,
    previousScopeStats
  };
};
