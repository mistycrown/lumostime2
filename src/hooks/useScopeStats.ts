/**
 * @file useScopeStats.ts
 * @input logs, scopes, categories, dateRange
 * @output scopeStats (totalDuration, categoryStats), previousScopeStats
 * @pos Hook (Statistics Calculation)
 * @description Scope statistics hook. Counts the full duration for every linked scope on a log.
 * @updated 2026-03-16 Unified scope aggregation so multi-scope logs no longer split duration.
 * @updated 2026-09-10: Reused inclusive previous-period boundaries for consistent trend comparisons.
 * @updated 2026-08-09: Planned timeline blocks are excluded from scope statistics.
 */

import { useMemo } from 'react';
import { Log, Scope, Category } from '../types';
import { getLogDurationSeconds, getNormalizedScopeIds, summarizeScopeDurations } from '../utils/scopeStatsUtils';
import { filterCountableLogs, getPreviousStatsDateRange } from '../utils/statLogUtils';

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

export const useScopeStats = ({
  logs,
  scopes,
  categories,
  dateRange,
  includePrevious = false
}: UseScopeStatsOptions): UseScopeStatsReturn => {
  const scopeStats = useMemo(() => {
    const logsWithScopes = filterCountableLogs(logs).filter(
      (log) =>
        getNormalizedScopeIds(log.scopeIds).length > 0 &&
        log.startTime >= dateRange.start.getTime() &&
        log.endTime <= dateRange.end.getTime()
    );

    const { totalAttributedDuration, scopeDurations } = summarizeScopeDurations(logsWithScopes);
    const scopeActivityBreakdown: Record<string, Record<string, number>> = {};

    logsWithScopes.forEach((log) => {
      const duration = getLogDurationSeconds(log);
      const scopeIds = getNormalizedScopeIds(log.scopeIds);
      const category = categories.find((item) => item.id === log.categoryId);
      const activity = category?.activities.find((item) => item.id === log.activityId);
      const activityName = activity?.name || 'Unknown';

      scopeIds.forEach((scopeId) => {
        if (!scopeActivityBreakdown[scopeId]) {
          scopeActivityBreakdown[scopeId] = {};
        }

        scopeActivityBreakdown[scopeId][activityName] =
          (scopeActivityBreakdown[scopeId][activityName] || 0) + duration;
      });
    });

    const categoryStats = scopes
      .map((scope) => {
        const duration = scopeDurations.get(scope.id) || 0;
        const breakdown = scopeActivityBreakdown[scope.id] || {};
        const items = Object.entries(breakdown)
          .map(([name, value]) => ({
            id: name,
            name,
            duration: value,
            icon: '',
            color: ''
          }))
          .sort((a, b) => b.duration - a.duration);

        return {
          ...scope,
          duration,
          percentage: totalAttributedDuration > 0 ? (duration / totalAttributedDuration) * 100 : 0,
          items,
          themeColor: scope.themeColor || 'stone'
        };
      })
      .filter((scope) => scope.duration > 0)
      .sort((a, b) => b.duration - a.duration);

    return {
      totalDuration: totalAttributedDuration,
      categoryStats
    };
  }, [logs, scopes, categories, dateRange]);

  const previousScopeStats = useMemo(() => {
    if (!includePrevious) {
      return null;
    }

    const { start: previousStart, end: previousEnd } = getPreviousStatsDateRange(dateRange);

    const logsWithScopes = filterCountableLogs(logs).filter(
      (log) =>
        getNormalizedScopeIds(log.scopeIds).length > 0 &&
        log.startTime >= previousStart.getTime() &&
        log.endTime <= previousEnd.getTime()
    );

    const { totalAttributedDuration, scopeDurations } = summarizeScopeDurations(logsWithScopes);

    return {
      totalDuration: totalAttributedDuration,
      scopeDurations
    };
  }, [logs, dateRange, includePrevious]);

  return {
    scopeStats,
    previousScopeStats
  };
};
