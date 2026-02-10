/**
 * @file statsUtils.ts
 * @description Utility functions for StatsView - color mapping, date handling, formatting
 */

import { COLOR_OPTIONS } from '../../constants';

export const getHexColor = (className: string = '') => {
  if (typeof className !== 'string') return '#e7e5e4';
  const match = className.match(/(?:text|bg)-([a-z]+)-/);
  const colorId = match ? match[1] : 'stone';
  const option = COLOR_OPTIONS.find(opt => opt.id === colorId);
  return option ? (option.lightHex || option.hex) : '#e7e5e4';
};

export const getScheduleStyle = (className: string = '') => {
  if (typeof className !== 'string') return 'bg-stone-100/90 text-stone-700 border-stone-200';
  const match = className.match(/(?:text|bg)-([a-z]+)-/);
  const color = match ? match[1] : 'stone';
  const styles: Record<string, string> = {
    stone: 'bg-stone-100/90 text-stone-700 border-stone-200',
    slate: 'bg-slate-100/90 text-slate-700 border-slate-200',
    gray: 'bg-gray-100/90 text-gray-700 border-gray-200',
    zinc: 'bg-zinc-100/90 text-zinc-700 border-zinc-200',
    neutral: 'bg-neutral-100/90 text-neutral-700 border-neutral-200',
    red: 'bg-red-100/90 text-red-700 border-red-200',
    orange: 'bg-orange-100/90 text-orange-700 border-orange-200',
    amber: 'bg-amber-100/90 text-amber-700 border-amber-200',
    yellow: 'bg-yellow-100/90 text-yellow-700 border-yellow-200',
    lime: 'bg-lime-100/90 text-lime-700 border-lime-200',
    green: 'bg-green-100/90 text-green-700 border-green-200',
    emerald: 'bg-emerald-100/90 text-emerald-700 border-emerald-200',
    teal: 'bg-teal-100/90 text-teal-700 border-teal-200',
    cyan: 'bg-cyan-100/90 text-cyan-700 border-cyan-200',
    sky: 'bg-sky-100/90 text-sky-700 border-sky-200',
    blue: 'bg-blue-100/90 text-blue-700 border-blue-200',
    indigo: 'bg-indigo-100/90 text-indigo-700 border-indigo-200',
    violet: 'bg-violet-100/90 text-violet-700 border-violet-200',
    purple: 'bg-purple-100/90 text-purple-700 border-purple-200',
    fuchsia: 'bg-fuchsia-100/90 text-fuchsia-700 border-fuchsia-200',
    pink: 'bg-pink-100/90 text-pink-700 border-pink-200',
    rose: 'bg-rose-100/90 text-rose-700 border-rose-200',
  };
  return styles[color] || styles['stone'];
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
