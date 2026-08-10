/**
 * @file dailyCheckStatsUtils.ts
 * @input Check templates, daily reviews, logs, and filter context
 * @output Daily-check snapshots, rolling metrics, calendar heatmap data, and display formatting
 * @pos Utility (Daily Check Statistics)
 * @description Provides pure helpers for the daily-check overview and its type-specific detail page.
 * @created 2026-08-09
 * @updated 2026-08-09: Added initial daily-check overview statistics.
 * @updated 2026-08-09: Preserved automatic time metrics and nullable missing values for detail views.
 * @updated 2026-08-09: Made daily-review snapshots authoritative and exposed review existence on history points.
 * @updated 2026-08-09: Added all-history effective-record metrics and calendar-aware completion streaks.
 */
import { CheckItem, CheckTemplate, DailyReview, Log } from '../types';
import { getLocalDateStr } from './dateUtils';
import {
  buildDailyCheckItems,
  findCheckItemIndexInReview,
  getCheckItemCountState
} from './dailyCheckUtils';
import { normalizeCheckItem } from './checkItemNormalizer';
import { FilterContext } from './filterUtils';
import { getAutoCheckMetricForDate } from './autoCheckUtils';

export type DailyCheckDisplayType = 'binary' | 'count' | 'duration' | 'time';

export interface DailyCheckHistoryPoint {
  date: Date;
  dateLabel: string;
  value: number | null;
  isCompleted: boolean;
  hasReview: boolean;
  hasRecord: boolean;
}

export interface DailyCheckCalendarPoint extends DailyCheckHistoryPoint {
  inMonth: boolean;
}

export const addDays = (date: Date, amount: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

export const formatDurationMinutes = (minutes: number): string => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
};

const TIME_COMPARISON_TYPES = new Set([
  'earliestStart',
  'latestStart',
  'nightLatestStart',
  'earliestEnd',
  'latestEnd'
]);

export const getDailyCheckDisplayType = (item: CheckItem): DailyCheckDisplayType => {
  if (item.type === 'auto') {
    const comparisonType = item.autoConfig?.comparisonType;
    if (comparisonType === 'duration') {
      return 'duration';
    }
    if (comparisonType === 'count') {
      return 'count';
    }
    if (comparisonType && TIME_COMPARISON_TYPES.has(comparisonType)) {
      return 'time';
    }
    return 'binary';
  }

  if (item.manualMode === 'count') {
    return 'count';
  }

  return 'binary';
};

export const getDailyCheckTypeLabel = (item: CheckItem): string => {
  const prefix = item.type === 'auto' ? '自动' : '手动';
  switch (getDailyCheckDisplayType(item)) {
    case 'count':
      return `${prefix} · 数字`;
    case 'duration':
      return `${prefix} · 时长`;
    case 'time':
      return `${prefix} · 时刻`;
    default:
      return `${prefix} · 布尔值`;
  }
};

const getTemplateItem = (checkTemplates: CheckTemplate[], itemId: string): CheckItem | null => {
  const item = buildDailyCheckItems(checkTemplates).find((entry) => entry.id === itemId);
  return item ? normalizeCheckItem(item) : null;
};

export const getDailyCheckTemplateItem = (
  checkTemplates: CheckTemplate[],
  itemId: string
): CheckItem | null => getTemplateItem(checkTemplates, itemId);

export const getDailyCheckItemForDate = ({
  itemId,
  date,
  dailyReviews,
  checkTemplates,
  logs,
  filterContext
}: {
  itemId: string;
  date: Date;
  dailyReviews: DailyReview[];
  checkTemplates: CheckTemplate[];
  logs: Log[];
  filterContext: FilterContext;
}): CheckItem | null => {
  const templateItem = getTemplateItem(checkTemplates, itemId);
  if (!templateItem) {
    return null;
  }

  const review = dailyReviews.find((entry) => entry.date === getLocalDateStr(date));
  if (!review) {
    return null;
  }

  const index = findCheckItemIndexInReview(review, checkTemplates, itemId);
  if (index < 0 || !review.checkItems?.[index]) {
    return null;
  }

  const item = normalizeCheckItem(review.checkItems[index]);

  return item;
};

export const getDailyCheckValue = ({
  item,
  date,
  logs,
  filterContext
}: {
  item: CheckItem;
  date: Date;
  logs: Log[];
  filterContext: FilterContext;
}): number | null => {
  const type = getDailyCheckDisplayType(item);

  if (item.type === 'auto') {
    return getAutoCheckMetricForDate(item, logs, filterContext, date) ?? null;
  }

  if (type === 'count') {
    return getCheckItemCountState(item).current;
  }

  return item.isCompleted ? 1 : 0;
};

export const getDailyCheckTarget = (item: CheckItem): number => {
  if (item.type === 'auto') {
    return item.autoConfig?.targetValue || 0;
  }

  return getDailyCheckDisplayType(item) === 'count'
    ? getCheckItemCountState(item).target
    : 1;
};

export const isDailyCheckComplete = (item: CheckItem): boolean => {
  if (item.type === 'auto') {
    return Boolean(item.isCompleted);
  }

  return getDailyCheckDisplayType(item) === 'count'
    ? getCheckItemCountState(item).isCompleted
    : Boolean(item.isCompleted);
};

export const getDailyCheckHistory = ({
  itemId,
  anchorDate,
  days = 7,
  dailyReviews,
  checkTemplates,
  logs,
  filterContext
}: {
  itemId: string;
  anchorDate: Date;
  days?: number;
  dailyReviews: DailyReview[];
  checkTemplates: CheckTemplate[];
  logs: Log[];
  filterContext: FilterContext;
}): DailyCheckHistoryPoint[] => {
  const firstDate = addDays(anchorDate, -(days - 1));

  return Array.from({ length: days }, (_, index) => {
    const date = addDays(firstDate, index);
    const item = getDailyCheckItemForDate({
      itemId,
      date,
      dailyReviews,
      checkTemplates,
      logs,
      filterContext
    });

    const hasReview = Boolean(dailyReviews.find((entry) => entry.date === getLocalDateStr(date)));

    return {
      date,
      dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
      value: item
        ? getDailyCheckValue({ item, date, logs, filterContext })
        : null,
      isCompleted: item ? isDailyCheckComplete(item) : false,
      hasReview,
      hasRecord: Boolean(item)
    };
  });
};

export const getDailyCheckRecordedHistory = ({
  itemId,
  anchorDate,
  dailyReviews,
  checkTemplates,
  logs,
  filterContext
}: {
  itemId: string;
  anchorDate: Date;
  dailyReviews: DailyReview[];
  checkTemplates: CheckTemplate[];
  logs: Log[];
  filterContext: FilterContext;
}): DailyCheckHistoryPoint[] => {
  const anchorDateStr = getLocalDateStr(anchorDate);
  const reviewsByDate = new Map<string, DailyReview>();

  dailyReviews.forEach((review) => {
    if (review.date <= anchorDateStr) {
      reviewsByDate.set(review.date, review);
    }
  });

  return Array.from(reviewsByDate.values())
    .sort((first, second) => first.date.localeCompare(second.date))
    .flatMap((review) => {
      const date = new Date(`${review.date}T12:00:00`);
      const item = getDailyCheckItemForDate({
        itemId,
        date,
        dailyReviews,
        checkTemplates,
        logs,
        filterContext
      });

      if (!item) {
        return [];
      }

      return [{
        date,
        dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
        value: getDailyCheckValue({ item, date, logs, filterContext }),
        isCompleted: isDailyCheckComplete(item),
        hasReview: true,
        hasRecord: true
      }];
    });
};

export const getCompletionRate = (history: DailyCheckHistoryPoint[]): number => {
  const recordedHistory = history.filter((point) => point.hasRecord);
  if (recordedHistory.length === 0) {
    return 0;
  }

  return Math.round((recordedHistory.filter((point) => point.isCompleted).length / recordedHistory.length) * 100);
};

export const getCurrentStreak = (history: DailyCheckHistoryPoint[], anchorDate?: Date): number => {
  const recordedHistory = history
    .filter((point) => point.hasRecord)
    .sort((first, second) => first.date.getTime() - second.date.getTime());
  const expectedEndDate = anchorDate ? getLocalDateStr(anchorDate) : null;
  const lastPoint = recordedHistory[recordedHistory.length - 1];

  if (!lastPoint || (expectedEndDate && getLocalDateStr(lastPoint.date) !== expectedEndDate)) {
    return 0;
  }

  let streak = 0;
  let laterDate: Date | null = null;

  for (let index = recordedHistory.length - 1; index >= 0; index -= 1) {
    const point = recordedHistory[index];
    if (!point.isCompleted) {
      break;
    }

    if (laterDate && Math.round((laterDate.getTime() - point.date.getTime()) / 86400000) !== 1) {
      break;
    }

    streak += 1;
    laterDate = point.date;
  }

  return streak;
};

export const getAverageValue = (history: DailyCheckHistoryPoint[]): number => {
  const recordedHistory = history.filter((point) => point.hasRecord);
  if (recordedHistory.length === 0) {
    return 0;
  }

  return recordedHistory.reduce((sum, point) => sum + (point.value || 0), 0) / recordedHistory.length;
};

export const getDailyCheckMonthHistory = ({
  itemId,
  anchorDate,
  dailyReviews,
  checkTemplates,
  logs,
  filterContext
}: {
  itemId: string;
  anchorDate: Date;
  dailyReviews: DailyReview[];
  checkTemplates: CheckTemplate[];
  logs: Log[];
  filterContext: FilterContext;
}): DailyCheckCalendarPoint[] => {
  const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const monthEnd = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
  const mondayOffset = monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1;
  const totalCells = Math.ceil((mondayOffset + monthEnd.getDate()) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const date = addDays(monthStart, index - mondayOffset);
    const item = getDailyCheckItemForDate({
      itemId,
      date,
      dailyReviews,
      checkTemplates,
      logs,
      filterContext
    });

    const hasReview = Boolean(dailyReviews.find((entry) => entry.date === getLocalDateStr(date)));

    return {
      date,
      dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
      value: item ? getDailyCheckValue({ item, date, logs, filterContext }) : null,
      isCompleted: item ? isDailyCheckComplete(item) : false,
      hasReview,
      hasRecord: Boolean(item),
      inMonth: date.getMonth() === anchorDate.getMonth()
        && date.getFullYear() === anchorDate.getFullYear()
    };
  });
};

export const getWeeklyRange = (date: Date): { start: Date; end: Date } => {
  const day = date.getDay();
  const offset = day === 0 ? 6 : day - 1;
  const start = addDays(date, -offset);
  start.setHours(0, 0, 0, 0);
  const end = addDays(start, 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export const getWeeklyHistory = ({
  itemId,
  anchorDate,
  dailyReviews,
  checkTemplates,
  logs,
  filterContext
}: {
  itemId: string;
  anchorDate: Date;
  dailyReviews: DailyReview[];
  checkTemplates: CheckTemplate[];
  logs: Log[];
  filterContext: FilterContext;
}): DailyCheckHistoryPoint[] => {
  const { start } = getWeeklyRange(anchorDate);
  return getDailyCheckHistory({
    itemId,
    anchorDate: addDays(start, 6),
    days: 7,
    dailyReviews,
    checkTemplates,
    logs,
    filterContext
  });
};

export const getAutoDurationTargetLabel = (item: CheckItem): string => {
  const target = item.autoConfig?.targetValue || 0;
  const operator = item.autoConfig?.operator || '>=';
  return `${operator} ${formatDurationMinutes(target)}`;
};
