/**
 * @file lineChartUtils.ts
 * @description Line Chart 工具函数 - 用于折线图的数据准备和图表渲染
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { Log, Category, TodoItem, Scope } from '../types';

/**
 * 图表线条颜色映射
 */
export const CHART_LINE_COLORS: Record<string, string> = {
  red: '#fca5a5',
  blue: '#93c5fd',
  orange: '#fdba74',
  purple: '#d8b4fe',
  emerald: '#6ee7b7',
  fuchsia: '#f0abfc',
  yellow: '#fde047',
  cyan: '#67e8f9',
  rose: '#fda4af',
  indigo: '#a5b4fc',
  lime: '#bef264',
  violet: '#c4b5fd',
  amber: '#fcd34d',
  sky: '#7dd3fc',
  green: '#86efac',
  pink: '#f9a8d4',
  teal: '#5eead4'
};

/**
 * 系列元数据接口
 */
export interface SeriesMeta {
  id: string;
  name: string;
  color: string;
  total?: number;
  categoryId?: string;
}

/**
 * 生成日期范围数组
 * 
 * @param rangeStart - 开始日期
 * @param rangeEnd - 结束日期
 * @returns 日期数组
 */
export function generateDateRange(rangeStart: Date, rangeEnd: Date): Date[] {
  const days: Date[] = [];
  let current = new Date(rangeStart);
  
  while (current <= rangeEnd) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return days;
}

/**
 * 获取日期标签
 * 
 * @param date - 日期
 * @param isMonthView - 是否为月视图
 * @returns 格式化的标签
 */
export function getDateLabel(date: Date, isMonthView: boolean): string {
  if (isMonthView) {
    return `${date.getDate()}`;
  }
  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
  return dayNames[date.getDay()];
}

/**
 * 获取最大值（用于 Y 轴缩放）
 * 
 * @param dataPoints - 数据点数组
 * @returns 最大值
 */
export function getMaxValue(dataPoints: number[][]): number {
  let max = 0;
  dataPoints.forEach(series => {
    series.forEach(v => {
      if (v > max) max = v;
    });
  });
  return max > 0 ? Math.ceil(max) : 5; // 默认 5 小时
}

/**
 * 从颜色类名提取颜色值
 * 
 * @param colorClass - 颜色类名（如 'text-red-500'）
 * @returns 十六进制颜色值
 */
export function getStrokeColor(colorClass: string): string {
  const match = colorClass?.match(/(?:text|bg)-([a-z]+)-/);
  const colorId = match ? match[1] : 'stone';
  return CHART_LINE_COLORS[colorId] || '#d6d3d1';
}

/**
 * 准备活动数据系列
 * 
 * @param filteredLogs - 过滤后的日志
 * @param categories - 分类列表
 * @param daysOfRange - 日期范围
 * @returns 活动系列数据和元数据
 */
export function prepareActivitySeries(
  filteredLogs: Log[],
  categories: Category[],
  daysOfRange: Date[]
): { series: number[][], meta: SeriesMeta[] } {
  // 聚合所有活动的总时长
  const allActivitiesMap = new Map<string, SeriesMeta & { total: number, categoryId: string }>();

  filteredLogs.forEach(log => {
    const cat = categories.find(c => c.id === log.categoryId);
    const act = cat?.activities.find(a => a.id === log.activityId);
    if (!act || !cat) return;

    const duration = Math.max(0, (log.endTime - log.startTime) / 1000) / 3600; // 小时
    const key = act.id;

    if (!allActivitiesMap.has(key)) {
      allActivitiesMap.set(key, {
        id: key,
        name: act.name,
        color: act.color,
        total: 0,
        categoryId: cat.id
      });
    }
    allActivitiesMap.get(key)!.total += duration;
  });

  // 按分类顺序和总时长排序
  const topActivities = Array.from(allActivitiesMap.entries())
    .sort((a, b) => {
      const catIdxA = categories.findIndex(c => c.id === a[1].categoryId);
      const catIdxB = categories.findIndex(c => c.id === b[1].categoryId);
      if (catIdxA !== catIdxB) return catIdxA - catIdxB;
      return b[1].total - a[1].total;
    })
    .map(([id, info]) => info);

  // 为每个活动生成每日数据
  const series = topActivities.map(act => {
    return daysOfRange.map(day => {
      const dStart = new Date(day);
      dStart.setHours(0, 0, 0, 0);
      const dEnd = new Date(day);
      dEnd.setHours(23, 59, 59, 999);

      const logs = filteredLogs.filter(l =>
        l.activityId === act.id &&
        l.startTime >= dStart.getTime() &&
        l.startTime <= dEnd.getTime()
      );

      const dailyTotal = logs.reduce((acc, l) => 
        acc + Math.max(0, (l.endTime - l.startTime) / 1000), 0
      );
      return dailyTotal / 3600; // 小时
    });
  });

  return { series, meta: topActivities };
}

/**
 * 准备待办数据系列
 * 
 * @param logs - 所有日志
 * @param todos - 待办列表
 * @param rangeStart - 开始日期
 * @param rangeEnd - 结束日期
 * @param daysOfRange - 日期范围
 * @returns 待办系列数据和元数据
 */
export function prepareTodoSeries(
  logs: Log[],
  todos: TodoItem[],
  rangeStart: Date,
  rangeEnd: Date,
  daysOfRange: Date[]
): { series: number[][], meta: SeriesMeta[] } {
  // 过滤范围内的日志
  const unfilteredLogs = logs.filter(log =>
    log.startTime >= rangeStart.getTime() &&
    log.endTime <= rangeEnd.getTime()
  );

  // 聚合待办时长
  const allTodosMap = new Map<string, { name: string, total: number }>();

  unfilteredLogs.forEach(log => {
    if (!log.linkedTodoId) return;

    const todo = todos.find(t => t.id === log.linkedTodoId);
    if (!todo) return;

    const duration = Math.max(0, (log.endTime - log.startTime) / 1000) / 3600;

    if (!allTodosMap.has(todo.id)) {
      allTodosMap.set(todo.id, { name: todo.title, total: 0 });
    }
    allTodosMap.get(todo.id)!.total += duration;
  });

  // 取前 5 个待办，并分配颜色
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

  // 为每个待办生成每日数据
  const series = topTodos.map(todo => {
    return daysOfRange.map(day => {
      const dStart = new Date(day);
      dStart.setHours(0, 0, 0, 0);
      const dEnd = new Date(day);
      dEnd.setHours(23, 59, 59, 999);

      const logs = unfilteredLogs.filter(l =>
        l.linkedTodoId === todo.id &&
        l.startTime >= dStart.getTime() &&
        l.startTime <= dEnd.getTime()
      );

      const dailyTotal = logs.reduce((acc, l) =>
        acc + Math.max(0, (l.endTime - l.startTime) / 1000), 0
      );
      return dailyTotal / 3600;
    });
  });

  return { series, meta: topTodos };
}

/**
 * 准备领域数据系列
 * 
 * @param logs - 所有日志
 * @param scopes - 领域列表
 * @param rangeStart - 开始日期
 * @param rangeEnd - 结束日期
 * @param daysOfRange - 日期范围
 * @returns 领域系列数据和元数据
 */
export function prepareScopeSeries(
  logs: Log[],
  scopes: Scope[],
  rangeStart: Date,
  rangeEnd: Date,
  daysOfRange: Date[]
): { series: number[][], meta: SeriesMeta[] } {
  // 过滤范围内的日志
  const unfilteredLogs = logs.filter(log =>
    log.startTime >= rangeStart.getTime() &&
    log.endTime <= rangeEnd.getTime()
  );

  // 聚合领域时长（分割时长）
  const allScopesMap = new Map<string, { name: string, color: string, total: number }>();

  unfilteredLogs.forEach(log => {
    if (!log.scopeIds || log.scopeIds.length === 0) return;

    const duration = Math.max(0, (log.endTime - log.startTime) / 1000) / 3600;
    const splitDuration = duration / log.scopeIds.length;

    log.scopeIds.forEach(sId => {
      const scope = scopes.find(s => s.id === sId);
      if (!scope) return;

      if (!allScopesMap.has(sId)) {
        allScopesMap.set(sId, {
          name: scope.name,
          color: scope.themeColor,
          total: 0
        });
      }
      allScopesMap.get(sId)!.total += splitDuration;
    });
  });

  // 按总时长排序
  const topScopes = Array.from(allScopesMap.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([id, info]) => ({
      id,
      name: info.name,
      color: info.color,
      total: info.total
    }));

  // 为每个领域生成每日数据
  const series = topScopes.map(scope => {
    return daysOfRange.map(day => {
      const dStart = new Date(day);
      dStart.setHours(0, 0, 0, 0);
      const dEnd = new Date(day);
      dEnd.setHours(23, 59, 59, 999);

      const logs = unfilteredLogs.filter(l =>
        l.scopeIds?.includes(scope.id) &&
        l.startTime >= dStart.getTime() &&
        l.startTime <= dEnd.getTime()
      );

      let dailyTotal = 0;
      logs.forEach(l => {
        const d = Math.max(0, (l.endTime - l.startTime) / 1000);
        dailyTotal += (d / (l.scopeIds?.length || 1));
      });

      return dailyTotal / 3600;
    });
  });

  return { series, meta: topScopes };
}
