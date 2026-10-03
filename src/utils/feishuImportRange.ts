/**
 * @file feishuImportRange.ts
 * @input Local reference date, import preset, or user-entered calendar dates.
 * @output Inclusive date strings and validated half-open local timestamp bounds.
 * @pos Utility (Feishu import date selection).
 * @description Resolves Monday-based weeks and complete months without UTC date shifts or month-end rollover.
 */
import { getDateRange, getPreviousDateRange } from './dateRangeUtils';

export type FeishuImportPreset = 'thisWeek' | 'thisMonth' | 'lastWeek' | 'lastMonth';

export interface FeishuImportRange {
  startDate: string;
  endDate: string;
}

export const FEISHU_IMPORT_PRESETS: { key: FeishuImportPreset; label: string }[] = [
  { key: 'thisWeek', label: '本周' },
  { key: 'thisMonth', label: '本月' },
  { key: 'lastWeek', label: '上周' },
  { key: 'lastMonth', label: '上月' }
];

const formatLocalDate = (date: Date): string => [
  String(date.getFullYear()).padStart(4, '0'),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0')
].join('-');

export function getFeishuImportPreset(preset: FeishuImportPreset, now = new Date()): FeishuImportRange {
  const isMonth = preset === 'thisMonth' || preset === 'lastMonth';
  // Anchor months on day 1 so a reference date such as January 31 cannot overflow February.
  const reference = isMonth ? new Date(now.getFullYear(), now.getMonth(), 1) : now;
  const current = getDateRange(reference, isMonth ? 'month' : 'week');
  const range = preset === 'lastWeek' || preset === 'lastMonth' ? getPreviousDateRange(current) : current;
  return { startDate: formatLocalDate(range.start), endDate: formatLocalDate(range.end) };
}

export function getFeishuImportRangeBounds(range: FeishuImportRange): { startTime: number; endTimeExclusive: number } {
  const parseDate = (value: string): Date => {
    const normalized = value.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) throw new Error('请填写八位数字日期，例如 20261002。');
    const [year, month, day] = normalized.split('-').map(Number);
    const date = new Date(0);
    date.setFullYear(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    if (year < 1 || formatLocalDate(date) !== normalized) throw new Error('日期无效，请检查输入。');
    return date;
  };
  const start = parseDate(range.startDate);
  const end = parseDate(range.endDate);
  if (start > end) throw new Error('开始日期不能晚于结束日期。');
  // Calendar arithmetic includes the whole last date even across daylight-saving transitions.
  end.setDate(end.getDate() + 1);
  return { startTime: start.getTime(), endTimeExclusive: end.getTime() };
}
