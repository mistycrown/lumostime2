/**
 * @file scheduleUtils.ts
 * @description Schedule View 工具函数 - 用于日程视图的事件布局计算
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

import { Log } from '../types';

/**
 * 布局信息接口
 */
export interface LayoutInfo {
  left: string;
  width: string;
}

/**
 * 计算一天内事件的布局
 * 
 * 算法说明：
 * 1. 按开始时间排序所有事件
 * 2. 将重叠的事件分组到同一个 cluster
 * 3. 在每个 cluster 内，事件按索引平均分配宽度
 * 
 * @param dayLogs - 一天内的所有日志
 * @returns Map<logId, LayoutInfo> - 每个日志的布局信息
 */
export function layoutDayEvents(dayLogs: Log[]): Map<string, LayoutInfo> {
  const sorted = [...dayLogs].sort((a, b) => a.startTime - b.startTime);
  const clusters: Log[][] = [];
  
  if (sorted.length === 0) return new Map();
  
  let currentCluster: Log[] = [sorted[0]];
  let clusterEnd = sorted[0].endTime;
  
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startTime < clusterEnd) {
      // 事件重叠，加入当前 cluster
      currentCluster.push(sorted[i]);
      clusterEnd = Math.max(clusterEnd, sorted[i].endTime);
    } else {
      // 事件不重叠，开始新 cluster
      clusters.push(currentCluster);
      currentCluster = [sorted[i]];
      clusterEnd = sorted[i].endTime;
    }
  }
  clusters.push(currentCluster);
  
  // 为每个 cluster 内的事件分配布局
  const layoutMap = new Map<string, LayoutInfo>();
  clusters.forEach(cluster => {
    cluster.forEach((log, idx) => {
      layoutMap.set(log.id, {
        left: `${(idx / cluster.length) * 100}%`,
        width: `${(1 / cluster.length) * 100}%`
      });
    });
  });
  
  return layoutMap;
}

/**
 * 日程视图常量
 */
export const SCHEDULE_CONSTANTS = {
  HOUR_HEIGHT: 50,
  TOTAL_HEIGHT: 24 * 50, // 24 hours * 50px
  MIN_EVENT_HEIGHT: 10,
  EVENT_PADDING: 2,
} as const;

/**
 * 计算事件在时间轴上的位置
 * 
 * @param startTime - 事件开始时间（毫秒时间戳）
 * @param hourHeight - 每小时的像素高度
 * @returns 事件顶部位置（像素）
 */
export function calculateEventTop(startTime: number, hourHeight: number = SCHEDULE_CONSTANTS.HOUR_HEIGHT): number {
  const date = new Date(startTime);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return (hours * 60 + minutes) * (hourHeight / 60);
}

/**
 * 计算事件的高度
 * 
 * @param duration - 事件时长（秒）
 * @param hourHeight - 每小时的像素高度
 * @returns 事件高度（像素）
 */
export function calculateEventHeight(duration: number, hourHeight: number = SCHEDULE_CONSTANTS.HOUR_HEIGHT): number {
  return Math.max(
    SCHEDULE_CONSTANTS.MIN_EVENT_HEIGHT,
    (duration / 60) * (hourHeight / 60) - SCHEDULE_CONSTANTS.EVENT_PADDING
  );
}

/**
 * 过滤指定日期的日志
 * 
 * @param logs - 所有日志
 * @param targetDate - 目标日期
 * @returns 该日期的日志列表
 */
export function filterLogsByDate(logs: Log[], targetDate: Date): Log[] {
  return logs.filter(log => {
    const logDate = new Date(log.startTime);
    return (
      logDate.getDate() === targetDate.getDate() &&
      logDate.getMonth() === targetDate.getMonth() &&
      logDate.getFullYear() === targetDate.getFullYear()
    );
  });
}

/**
 * 生成一周的日期数组
 * 
 * @param startDate - 周的开始日期（通常是周一）
 * @returns 7 天的日期数组
 */
export function generateWeekDays(startDate: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return date;
  });
}
