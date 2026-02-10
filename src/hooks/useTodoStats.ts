/**
 * @file useTodoStats.ts
 * @input logs, todos, todoCategories, dateRange
 * @output todoStats (totalDuration, categoryStats), previousTodoStats
 * @pos Hook (Statistics Calculation)
 * @description 待办专注时间统计 Hook - 计算待办相关的时长统计
 * 
 * 使用场景：
 * - StatsView (Pie Chart View - Todos Section)
 * - StatsView (Line Chart View - Todos Trend)
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { useMemo } from 'react';
import { Log, TodoItem, TodoCategory } from '../types';

export interface TodoItemStat {
  id: string;
  name: string;
  duration: number;
}

export interface TodoCategoryStat extends TodoCategory {
  duration: number;
  percentage: number;
  items: TodoItemStat[];
  assignedColor: string;
}

export interface TodoStatsData {
  totalDuration: number;
  categoryStats: TodoCategoryStat[];
}

export interface PreviousTodoStatsData {
  totalDuration: number;
  categoryDurations: Map<string, number>;
  todoDurations: Map<string, number>;
}

export interface UseTodoStatsOptions {
  logs: Log[];
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  dateRange: { start: Date; end: Date };
  includePrevious?: boolean;
}

export interface UseTodoStatsReturn {
  todoStats: TodoStatsData;
  previousTodoStats: PreviousTodoStatsData | null;
}

// 预定义的颜色池（用于待办分类）
const TODO_COLORS = [
  '#fee2e2', '#ffedd5', '#fef9c3', '#dcfce7', '#ccfbf1',
  '#dbeafe', '#e0e7ff', '#f3e8ff', '#fce7f3', '#ffe4e6'
];

/**
 * 计算待办统计数据
 * 
 * @param options - 配置选项
 * @returns 待办统计数据和前一周期数据
 * 
 * @example
 * ```typescript
 * const { todoStats, previousTodoStats } = useTodoStats({
 *   logs,
 *   todos,
 *   todoCategories,
 *   dateRange: { start: rangeStart, end: rangeEnd },
 *   includePrevious: true
 * });
 * 
 * // todoStats.totalDuration - 待办总时长（秒）
 * // todoStats.categoryStats - 待办分类统计数组
 * ```
 */
export const useTodoStats = ({
  logs,
  todos,
  todoCategories,
  dateRange,
  includePrevious = false
}: UseTodoStatsOptions): UseTodoStatsReturn => {
  
  // 计算当前周期待办统计
  const todoStats = useMemo(() => {
    // 过滤有待办关联的日志
    const logsWithTodos = logs.filter(
      l => l.linkedTodoId &&
      l.startTime >= dateRange.start.getTime() &&
      l.endTime <= dateRange.end.getTime()
    );

    const totalDuration = logsWithTodos.reduce(
      (acc, log) => acc + Math.max(0, (log.endTime - log.startTime) / 1000),
      0
    );

    // 计算每个待办的时长
    const todoDurations: Record<string, number> = {};
    logsWithTodos.forEach(l => {
      const d = Math.max(0, (l.endTime - l.startTime) / 1000);
      todoDurations[l.linkedTodoId!] = (todoDurations[l.linkedTodoId!] || 0) + d;
    });

    // 按分类聚合
    const categoryStats = todoCategories
      .map((cat, index) => {
        const catTodos = todos.filter(t => t.categoryId === cat.id);
        let catDuration = 0;

        const items = catTodos
          .map(t => {
            const d = todoDurations[t.id] || 0;
            catDuration += d;
            return {
              id: t.id,
              name: t.title,
              duration: d,
            };
          })
          .filter(i => i.duration > 0)
          .sort((a, b) => b.duration - a.duration);

        return {
          ...cat,
          duration: catDuration,
          percentage: totalDuration > 0 ? (catDuration / totalDuration) * 100 : 0,
          items,
          assignedColor: TODO_COLORS[index % TODO_COLORS.length]
        };
      })
      .filter(c => c.duration > 0)
      .sort((a, b) => b.duration - a.duration);

    return { totalDuration, categoryStats };
  }, [logs, todos, todoCategories, dateRange]);

  // 计算前一周期待办统计（如果需要）
  const previousTodoStats = useMemo(() => {
    if (!includePrevious) return null;

    // 计算前一周期的日期范围
    const duration = dateRange.end.getTime() - dateRange.start.getTime();
    const previousStart = new Date(dateRange.start.getTime() - duration);
    const previousEnd = new Date(dateRange.end.getTime() - duration);

    const logsWithTodos = logs.filter(
      l => l.linkedTodoId &&
      l.startTime >= previousStart.getTime() &&
      l.endTime <= previousEnd.getTime()
    );

    const totalDuration = logsWithTodos.reduce(
      (acc, log) => acc + Math.max(0, (log.endTime - log.startTime) / 1000),
      0
    );

    const todoDurations = new Map<string, number>();
    logsWithTodos.forEach(l => {
      const d = Math.max(0, (l.endTime - l.startTime) / 1000);
      todoDurations.set(l.linkedTodoId!, (todoDurations.get(l.linkedTodoId!) || 0) + d);
    });

    // 按分类聚合
    const categoryDurations = new Map<string, number>();
    todoCategories.forEach(cat => {
      const catTodos = todos.filter(t => t.categoryId === cat.id);
      let d = 0;
      catTodos.forEach(t => d += (todoDurations.get(t.id) || 0));
      categoryDurations.set(cat.id, d);
    });

    return { totalDuration, categoryDurations, todoDurations };
  }, [logs, todos, todoCategories, dateRange, includePrevious]);

  return {
    todoStats,
    previousTodoStats
  };
};
