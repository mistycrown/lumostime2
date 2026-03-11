/**
 * @file statsUtils.ts
 * @description Utility functions for StatsView - color mapping, date handling, formatting
 */

import {
  getHexColor as getSharedHexColor,
  getScheduleStyle as getSharedScheduleStyle,
  type ScheduleStyleResult,
} from '../../utils/chartUtils';

export const getHexColor = (className: string = ''): string => {
  return getSharedHexColor(className);
};

export const getScheduleStyle = (className: string = ''): ScheduleStyleResult => {
  return getSharedScheduleStyle(className);
};

export const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}小时 ${m}分钟`;
  return `${m}分钟`;
};

export const getDurationHM = (seconds: number) => {
  return {
    h: Math.floor(seconds / 3600),
    m: Math.floor((seconds % 3600) / 60)
  };
};

export type PieRange = 'day' | 'week' | 'month' | 'year';
export type ScheduleRange = 'day' | 'week' | 'month';
export type ViewType = 'pie' | 'matrix' | 'schedule' | 'line' | 'check';

export const getDateRange = (date: Date, rangeType: PieRange | 'week_fixed' | 'day_fixed' | 'month') => {
  const start = new Date(date);
  const end = new Date(date);

  if (rangeType === 'day' || rangeType === 'day_fixed') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (rangeType === 'week' || rangeType === 'week_fixed') {
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (rangeType === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(start.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
  } else if (rangeType === 'year') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(11, 31);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
};

export const getDynamicTitle = (date: Date, rangeType: PieRange | 'week_fixed' | 'day_fixed' | 'month'): string => {
  if (rangeType === 'day' || rangeType === 'day_fixed') {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  } else if (rangeType === 'week' || rangeType === 'week_fixed') {
    const startDate = new Date(date);
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    startDate.setDate(diff);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const startMonth = startDate.getMonth() + 1;
    const startDay = startDate.getDate();
    const endMonth = endDate.getMonth() + 1;
    const endDay = endDate.getDate();

    if (startMonth === endMonth) {
      return `${startMonth}月${startDay}日 - ${endDay}日`;
    } else {
      return `${startMonth}月${startDay}日 - ${endMonth}月${endDay}日`;
    }
  } else if (rangeType === 'month') {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  } else if (rangeType === 'year') {
    return `${date.getFullYear()}年`;
  }

  return '';
};

export const getPreviousDateRange = (currentStart: Date, currentEnd: Date, rangeType: PieRange | 'week_fixed' | 'day_fixed' | 'month') => {
  const start = new Date(currentStart);
  const end = new Date(currentEnd);

  if (rangeType === 'day' || rangeType === 'day_fixed') {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (rangeType === 'week' || rangeType === 'week_fixed') {
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() - 7);
  } else if (rangeType === 'month') {
    const prevMonth = new Date(start);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    return getDateRange(prevMonth, 'month');
  } else if (rangeType === 'year') {
    start.setFullYear(start.getFullYear() - 1);
    return getDateRange(start, 'year');
  }
  return { start, end };
};

export const layoutDayEvents = (dayLogs: any[]) => {
  const sorted = [...dayLogs].sort((a, b) => a.startTime - b.startTime);
  const clusters: any[][] = [];
  if (sorted.length === 0) return new Map();
  let currentCluster: any[] = [sorted[0]];
  let clusterEnd = sorted[0].endTime;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startTime < clusterEnd) {
      currentCluster.push(sorted[i]);
      clusterEnd = Math.max(clusterEnd, sorted[i].endTime);
    } else {
      clusters.push(currentCluster);
      currentCluster = [sorted[i]];
      clusterEnd = sorted[i].endTime;
    }
  }
  clusters.push(currentCluster);
  const layoutMap = new Map();
  clusters.forEach(cluster => {
    cluster.forEach((log, idx) => {
      layoutMap.set(log.id, {
        left: `${(idx / cluster.length) * 100}%`,
        width: `${(1 / cluster.length) * 100}%`
      });
    });
  });
  return layoutMap;
};
