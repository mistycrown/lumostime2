/**
 * @file lineChartUtils.ts
 * @description Utilities for preparing line chart series data.
 * @updated 2026-03-16 Scope trend series now count full duration for every linked scope.
 */

import { Log, Category, TodoItem, Scope } from '../types';
import { CHART_STROKE_COLORS, getChartStrokeColor } from './colorAdapterUtils';
import { getLogDurationSeconds, getNormalizedScopeIds, summarizeScopeDurations } from './scopeStatsUtils';

export const CHART_LINE_COLORS: Record<string, string> = {
  ...CHART_STROKE_COLORS,
};

export interface SeriesMeta {
  id: string;
  name: string;
  color: string;
  total?: number;
  categoryId?: string;
}

export function generateDateRange(rangeStart: Date, rangeEnd: Date): Date[] {
  const days: Date[] = [];
  let current = new Date(rangeStart);

  while (current <= rangeEnd) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

export function getDateLabel(date: Date, isMonthView: boolean): string {
  if (isMonthView) {
    return `${date.getDate()}`;
  }

  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
  return dayNames[date.getDay()];
}

export function getMaxValue(dataPoints: number[][]): number {
  let max = 0;

  dataPoints.forEach((series) => {
    series.forEach((value) => {
      if (value > max) {
        max = value;
      }
    });
  });

  return max > 0 ? Math.ceil(max) : 5;
}

export function getStrokeColor(colorClass: string): string {
  return getChartStrokeColor(colorClass);
}

export function prepareActivitySeries(
  filteredLogs: Log[],
  categories: Category[],
  daysOfRange: Date[]
): { series: number[][]; meta: SeriesMeta[] } {
  const allActivitiesMap = new Map<string, SeriesMeta & { total: number; categoryId: string }>();

  filteredLogs.forEach((log) => {
    const category = categories.find((item) => item.id === log.categoryId);
    const activity = category?.activities.find((item) => item.id === log.activityId);
    if (!activity || !category) {
      return;
    }

    const duration = getLogDurationSeconds(log) / 3600;
    if (!allActivitiesMap.has(activity.id)) {
      allActivitiesMap.set(activity.id, {
        id: activity.id,
        name: activity.name,
        color: activity.color,
        total: 0,
        categoryId: category.id
      });
    }

    allActivitiesMap.get(activity.id)!.total += duration;
  });

  const topActivities = Array.from(allActivitiesMap.values()).sort((a, b) => {
    const catIdxA = categories.findIndex((category) => category.id === a.categoryId);
    const catIdxB = categories.findIndex((category) => category.id === b.categoryId);
    if (catIdxA !== catIdxB) {
      return catIdxA - catIdxB;
    }

    return b.total - a.total;
  });

  const series = topActivities.map((activity) =>
    daysOfRange.map((day) => {
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      const dailyTotal = filteredLogs
        .filter(
          (log) =>
            log.activityId === activity.id &&
            log.startTime >= dayStart.getTime() &&
            log.startTime <= dayEnd.getTime()
        )
        .reduce((acc, log) => acc + getLogDurationSeconds(log), 0);

      return dailyTotal / 3600;
    })
  );

  return { series, meta: topActivities };
}

export function prepareTodoSeries(
  logs: Log[],
  todos: TodoItem[],
  rangeStart: Date,
  rangeEnd: Date,
  daysOfRange: Date[]
): { series: number[][]; meta: SeriesMeta[] } {
  const unfilteredLogs = logs.filter(
    (log) => log.startTime >= rangeStart.getTime() && log.endTime <= rangeEnd.getTime()
  );

  const allTodosMap = new Map<string, { name: string; total: number }>();

  unfilteredLogs.forEach((log) => {
    if (!log.linkedTodoId) {
      return;
    }

    const todo = todos.find((item) => item.id === log.linkedTodoId);
    if (!todo) {
      return;
    }

    const duration = getLogDurationSeconds(log) / 3600;
    if (!allTodosMap.has(todo.id)) {
      allTodosMap.set(todo.id, { name: todo.title, total: 0 });
    }

    allTodosMap.get(todo.id)!.total += duration;
  });

  const colorKeys = Object.keys(CHART_LINE_COLORS);
  const topTodos = Array.from(allTodosMap.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([id, info], index) => ({
      id,
      name: info.name,
      color: `bg-${colorKeys[index % colorKeys.length]}-50`,
      total: info.total
    }));

  const series = topTodos.map((todo) =>
    daysOfRange.map((day) => {
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      const dailyTotal = unfilteredLogs
        .filter(
          (log) =>
            log.linkedTodoId === todo.id &&
            log.startTime >= dayStart.getTime() &&
            log.startTime <= dayEnd.getTime()
        )
        .reduce((acc, log) => acc + getLogDurationSeconds(log), 0);

      return dailyTotal / 3600;
    })
  );

  return { series, meta: topTodos };
}

export function prepareScopeSeries(
  logs: Log[],
  scopes: Scope[],
  rangeStart: Date,
  rangeEnd: Date,
  daysOfRange: Date[]
): { series: number[][]; meta: SeriesMeta[] } {
  const unfilteredLogs = logs.filter(
    (log) => log.startTime >= rangeStart.getTime() && log.endTime <= rangeEnd.getTime()
  );

  const { scopeDurations } = summarizeScopeDurations(unfilteredLogs);

  const topScopes = scopes
    .map((scope) => ({
      id: scope.id,
      name: scope.name,
      color: scope.themeColor,
      total: (scopeDurations.get(scope.id) || 0) / 3600
    }))
    .filter((scope) => scope.total > 0)
    .sort((a, b) => b.total - a.total);

  const series = topScopes.map((scope) =>
    daysOfRange.map((day) => {
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      const dailyTotal = unfilteredLogs
        .filter(
          (log) =>
            getNormalizedScopeIds(log.scopeIds).includes(scope.id) &&
            log.startTime >= dayStart.getTime() &&
            log.startTime <= dayEnd.getTime()
        )
        .reduce((acc, log) => acc + getLogDurationSeconds(log), 0);

      return dailyTotal / 3600;
    })
  );

  return { series, meta: topScopes };
}
