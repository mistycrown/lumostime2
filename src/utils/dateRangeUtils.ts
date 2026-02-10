/**
 * @file dateRangeUtils.ts
 * @input date, range type, options
 * @output date range (start, end)
 * @pos Utility (Date Calculation)
 * @description 统一的日期范围计算工具 - 支持周、月、年等多种范围类型
 * 
 * 使用场景：
 * - TimelineView
 * - StatsView
 * - DetailTimelineCard
 * - 其他需要日期范围计算的组件
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */

export type DateRangeType = 'day' | 'week' | 'month' | 'year' | 'all';

export interface DateRange {
  start: Date;
  end: Date;
  type: DateRangeType;
}

export interface DateRangeOptions {
  /**
   * 是否以周日为一周的开始
   * @default false
   */
  startWeekOnSunday?: boolean;
  
  /**
   * 是否包含结束日期的最后一刻（23:59:59.999）
   * @default true
   */
  includeEndOfDay?: boolean;
}

/**
 * 获取日期范围
 * 
 * @example
 * ```typescript
 * // 获取某天的范围
 * const dayRange = getDateRange(new Date(), 'day');
 * // { start: 2024-01-15 00:00:00, end: 2024-01-15 23:59:59 }
 * 
 * // 获取某周的范围（周一开始）
 * const weekRange = getDateRange(new Date(), 'week');
 * // { start: 2024-01-15 00:00:00, end: 2024-01-21 23:59:59 }
 * 
 * // 获取某周的范围（周日开始）
 * const weekRange = getDateRange(new Date(), 'week', { startWeekOnSunday: true });
 * // { start: 2024-01-14 00:00:00, end: 2024-01-20 23:59:59 }
 * ```
 */
export const getDateRange = (
  date: Date,
  type: DateRangeType,
  options: DateRangeOptions = {}
): DateRange => {
  const { startWeekOnSunday = false, includeEndOfDay = true } = options;
  
  const start = new Date(date);
  const end = new Date(date);
  
  // 设置开始时间为当天 00:00:00
  start.setHours(0, 0, 0, 0);
  
  switch (type) {
    case 'day':
      // 当天范围
      end.setHours(23, 59, 59, 999);
      break;
      
    case 'week': {
      // 周范围
      const day = start.getDay();
      let diff: number;
      
      if (startWeekOnSunday) {
        // 周日为一周的开始
        diff = day;
      } else {
        // 周一为一周的开始
        diff = day === 0 ? 6 : day - 1;
      }
      
      start.setDate(start.getDate() - diff);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
      
    case 'month':
      // 月范围
      start.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0); // 上个月的最后一天
      end.setHours(23, 59, 59, 999);
      break;
      
    case 'year':
      // 年范围
      start.setMonth(0, 1);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
      
    case 'all':
      // 全部范围（从 1970 年到现在）
      start.setFullYear(1970, 0, 1);
      end.setTime(Date.now());
      end.setHours(23, 59, 59, 999);
      break;
  }
  
  if (!includeEndOfDay) {
    end.setHours(0, 0, 0, 0);
  }
  
  return { start, end, type };
};

/**
 * 获取上一个日期范围
 * 
 * @example
 * ```typescript
 * const currentWeek = getDateRange(new Date(), 'week');
 * const previousWeek = getPreviousDateRange(currentWeek);
 * ```
 */
export const getPreviousDateRange = (
  currentRange: DateRange,
  options: DateRangeOptions = {}
): DateRange => {
  const { start, type } = currentRange;
  const previousDate = new Date(start);
  
  switch (type) {
    case 'day':
      previousDate.setDate(previousDate.getDate() - 1);
      break;
    case 'week':
      previousDate.setDate(previousDate.getDate() - 7);
      break;
    case 'month':
      previousDate.setMonth(previousDate.getMonth() - 1);
      break;
    case 'year':
      previousDate.setFullYear(previousDate.getFullYear() - 1);
      break;
    case 'all':
      // 'all' 类型没有上一个范围
      return currentRange;
  }
  
  return getDateRange(previousDate, type, options);
};

/**
 * 获取下一个日期范围
 * 
 * @example
 * ```typescript
 * const currentWeek = getDateRange(new Date(), 'week');
 * const nextWeek = getNextDateRange(currentWeek);
 * ```
 */
export const getNextDateRange = (
  currentRange: DateRange,
  options: DateRangeOptions = {}
): DateRange => {
  const { start, type } = currentRange;
  const nextDate = new Date(start);
  
  switch (type) {
    case 'day':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'week':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'month':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'year':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    case 'all':
      // 'all' 类型没有下一个范围
      return currentRange;
  }
  
  return getDateRange(nextDate, type, options);
};

/**
 * 判断日期是否在范围内
 * 
 * @example
 * ```typescript
 * const range = getDateRange(new Date(), 'week');
 * const isInRange = isDateInRange(new Date('2024-01-15'), range);
 * ```
 */
export const isDateInRange = (date: Date, range: DateRange): boolean => {
  const time = date.getTime();
  return time >= range.start.getTime() && time <= range.end.getTime();
};

/**
 * 格式化日期范围为字符串
 * 
 * @example
 * ```typescript
 * const range = getDateRange(new Date(), 'week');
 * const str = formatDateRange(range);
 * // "2024-01-15 ~ 2024-01-21"
 * ```
 */
export const formatDateRange = (
  range: DateRange,
  format: 'short' | 'long' = 'short'
): string => {
  const { start, end, type } = range;
  
  if (type === 'all') {
    return 'All Time';
  }
  
  if (format === 'short') {
    const startStr = `${start.getMonth() + 1}/${start.getDate()}`;
    const endStr = `${end.getMonth() + 1}/${end.getDate()}`;
    
    if (type === 'day') {
      return startStr;
    }
    
    return `${startStr} ~ ${endStr}`;
  }
  
  // long format
  const startStr = start.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const endStr = end.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  if (type === 'day') {
    return startStr;
  }
  
  return `${startStr} ~ ${endStr}`;
};

/**
 * 获取日期范围内的所有日期
 * 
 * @example
 * ```typescript
 * const range = getDateRange(new Date(), 'week');
 * const dates = getDatesInRange(range);
 * // [Date(2024-01-15), Date(2024-01-16), ..., Date(2024-01-21)]
 * ```
 */
export const getDatesInRange = (range: DateRange): Date[] => {
  const dates: Date[] = [];
  const current = new Date(range.start);
  current.setHours(0, 0, 0, 0);
  
  const endTime = new Date(range.end);
  endTime.setHours(0, 0, 0, 0);
  
  while (current <= endTime) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

/**
 * 计算两个日期范围之间的天数差
 * 
 * @example
 * ```typescript
 * const range1 = getDateRange(new Date('2024-01-01'), 'week');
 * const range2 = getDateRange(new Date('2024-01-15'), 'week');
 * const days = getDaysBetweenRanges(range1, range2);
 * // 14
 * ```
 */
export const getDaysBetweenRanges = (range1: DateRange, range2: DateRange): number => {
  const diff = Math.abs(range2.start.getTime() - range1.start.getTime());
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};
