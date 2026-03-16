/**
 * @file useStatsData.ts
 * @description Custom hook for calculating statistics data
 */

import { useMemo } from 'react';
import { Log, Category, Activity, TodoItem, TodoCategory, Scope, DailyReview } from '../../types';
import { getColorHexForCharts } from '../../utils/colorAdapterUtils';
import { getLogDurationSeconds, getNormalizedScopeIds, summarizeScopeDurations } from '../../utils/scopeStatsUtils';

interface ActivityStat extends Activity {
  duration: number;
}

interface CategoryStat extends Category {
  duration: number;
  percentage: number;
  items: ActivityStat[];
}

export interface StatsData {
  totalDuration: number;
  categoryStats: CategoryStat[];
}

export const useStatsData = (
  filteredLogs: Log[],
  categories: Category[]
): StatsData => {
  return useMemo(() => {
    const totalDuration = filteredLogs.reduce((acc, log) => 
      acc + Math.max(0, (log.endTime - log.startTime) / 1000), 0
    );
    
    const categoryStats: CategoryStat[] = categories.map(cat => {
      const catLogs = filteredLogs.filter(l => l.categoryId === cat.id);
      const catDuration = catLogs.reduce((acc, l) => 
        acc + Math.max(0, (l.endTime - l.startTime) / 1000), 0
      );
      
      const activityStats: ActivityStat[] = cat.activities.map(act => {
        const actLogs = catLogs.filter(l => l.activityId === act.id);
        const actDuration = actLogs.reduce((acc, l) => 
          acc + Math.max(0, (l.endTime - l.startTime) / 1000), 0
        );
        return { ...act, duration: actDuration };
      }).filter(a => a.duration > 0).sort((a, b) => b.duration - a.duration);

      return {
        ...cat,
        duration: catDuration,
        percentage: totalDuration > 0 ? (catDuration / totalDuration) * 100 : 0,
        items: activityStats
      };
    }).filter(s => s.duration > 0).sort((a, b) => b.duration - a.duration);
    
    return { totalDuration, categoryStats };
  }, [filteredLogs, categories]);
};

export const useTodoStats = (
  filteredLogs: Log[],
  todos: TodoItem[],
  todoCategories: TodoCategory[]
) => {
  return useMemo(() => {
    const logsWithTodos = filteredLogs.filter(l => l.linkedTodoId);
    const totalDuration = logsWithTodos.reduce((acc, log) => 
      acc + Math.max(0, (log.endTime - log.startTime) / 1000), 0
    );

    const todoDurations: Record<string, number> = {};
    logsWithTodos.forEach(l => {
      const d = Math.max(0, (l.endTime - l.startTime) / 1000);
      todoDurations[l.linkedTodoId!] = (todoDurations[l.linkedTodoId!] || 0) + d;
    });

    const COLORS = ['#fee2e2', '#ffedd5', '#fef9c3', '#dcfce7', '#ccfbf1', '#dbeafe', '#e0e7ff', '#f3e8ff', '#fce7f3', '#ffe4e6'];

    const categoryStats = todoCategories.map((cat, index) => {
      const catTodos = todos.filter(t => t.categoryId === cat.id);
      let catDuration = 0;
      const items = catTodos.map(t => {
        const d = todoDurations[t.id] || 0;
        catDuration += d;
        return {
          id: t.id,
          name: t.title,
          duration: d,
        };
      }).filter(i => i.duration > 0).sort((a, b) => b.duration - a.duration);

      return {
        ...cat,
        duration: catDuration,
        percentage: totalDuration > 0 ? (catDuration / totalDuration) * 100 : 0,
        items,
        assignedColor: cat.color
          ? getColorHexForCharts(cat.color)
          : COLORS[index % COLORS.length]
      };
    }).filter(c => c.duration > 0).sort((a, b) => b.duration - a.duration);

    return { totalDuration, categoryStats };
  }, [filteredLogs, todos, todoCategories]);
};

export const useScopeStats = (
  filteredLogs: Log[],
  scopes: Scope[],
  categories: Category[]
) => {
  return useMemo(() => {
    const logsWithScopes = filteredLogs.filter(l => getNormalizedScopeIds(l.scopeIds).length > 0);
    const { totalAttributedDuration, scopeDurations } = summarizeScopeDurations(logsWithScopes);
    const scopeActivityBreakdown: Record<string, Record<string, number>> = {};

    logsWithScopes.forEach(l => {
      const duration = getLogDurationSeconds(l);
      const scopeIds = getNormalizedScopeIds(l.scopeIds);

      const cat = categories.find(c => c.id === l.categoryId);
      const act = cat?.activities.find(a => a.id === l.activityId);
      const actName = act?.name || 'Unknown';

      scopeIds.forEach(sId => {
        if (!scopeActivityBreakdown[sId]) scopeActivityBreakdown[sId] = {};
        scopeActivityBreakdown[sId][actName] = (scopeActivityBreakdown[sId][actName] || 0) + duration;
      });
    });

    const categoryStats = scopes.map(scope => {
      const duration = scopeDurations.get(scope.id) || 0;

      const breakdown = scopeActivityBreakdown[scope.id] || {};
      const items = Object.entries(breakdown).map(([name, d]) => ({
        id: name,
        name: name,
        duration: d,
        icon: '',
        color: ''
      })).sort((a, b) => b.duration - a.duration);

      return {
        ...scope,
        duration,
        percentage: totalAttributedDuration > 0 ? (duration / totalAttributedDuration) * 100 : 0,
        items,
        themeColor: scope.themeColor || 'stone'
      };
    }).filter(s => s.duration > 0).sort((a, b) => b.duration - a.duration);

    return { totalDuration: totalAttributedDuration, categoryStats };
  }, [filteredLogs, scopes, categories]);
};

export const usePreviousStats = (
  logs: Log[],
  previousRange: { start: Date; end: Date },
  excludedCategoryIds: string[],
  categories: Category[]
) => {
  const previousFilteredLogs = useMemo(() => {
    return logs.filter(log =>
      log.startTime >= previousRange.start.getTime() &&
      log.endTime <= previousRange.end.getTime() &&
      !excludedCategoryIds.includes(log.categoryId)
    );
  }, [logs, previousRange, excludedCategoryIds]);

  return useMemo(() => {
    const totalDuration = previousFilteredLogs.reduce((acc, log) => 
      acc + Math.max(0, (log.endTime - log.startTime) / 1000), 0
    );

    const catDurations = new Map<string, number>();
    const actDurations = new Map<string, number>();

    previousFilteredLogs.forEach(log => {
      const d = Math.max(0, (log.endTime - log.startTime) / 1000);
      catDurations.set(log.categoryId, (catDurations.get(log.categoryId) || 0) + d);
      actDurations.set(log.activityId, (actDurations.get(log.activityId) || 0) + d);
    });

    return { totalDuration, catDurations, actDurations };
  }, [previousFilteredLogs]);
};
