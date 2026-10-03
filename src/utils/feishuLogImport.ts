/**
 * @file feishuLogImport.ts
 * @input Ready actual logs, activity categories, linked todos/scopes and an inclusive local date range.
 * @output Category-routed import records with formatted notes, attributes, ratings, links and Log IDs.
 * @updated 2026-10-03: Includes human-readable metadata in calendar descriptions without silent truncation.
 * @pos Feishu import candidate selection.
 */
import type { Category, Log } from '../types';
import { getFeishuImportRangeBounds, type FeishuImportRange } from './feishuImportRange';
import { formatFeishuLogDescription, type FeishuLogDescriptionContext } from './feishuLogDescription';

export interface FeishuImportCategory { id: string; name: string; color: string }
export interface FeishuImportRecord {
  id: string;
  categoryId: string;
  title: string;
  note: string;
  startTime: number;
  endTime: number;
}
export interface FeishuImportBatch {
  categories: FeishuImportCategory[];
  records: FeishuImportRecord[];
  timezone: string;
  range: { startTime: number; endTimeExclusive: number };
}

export function prepareFeishuLogImport(logs: Log[], categories: Category[], range: FeishuImportRange, context: FeishuLogDescriptionContext = {}) {
  const bounds = getFeishuImportRangeBounds(range);
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const seen = new Set<string>();
  const records: FeishuImportRecord[] = [];
  let excluded = 0;
  for (const log of logs) {
    if (!Number.isFinite(log.startTime) || log.startTime < bounds.startTime || log.startTime >= bounds.endTimeExclusive) continue;
    const category = categoryMap.get(log.categoryId);
    if (log.isPlanned || !Number.isSafeInteger(log.startTime) || !Number.isSafeInteger(log.endTime)
      || Math.floor(log.endTime / 1000) <= Math.floor(log.startTime / 1000) || !category
      || !/^[\w-]{1,128}$/.test(category.id) || !/^[\w-]{1,128}$/.test(log.id) || seen.has(log.id)) {
      excluded++;
      continue;
    }
    const activity = category.activities.find((item) => item.id === log.activityId);
    seen.add(log.id);
    records.push({ id: log.id, categoryId: category.id, startTime: log.startTime, endTime: log.endTime,
      title: (log.title?.trim() || activity?.name || category.name || '活动记录').slice(0, 200),
      note: formatFeishuLogDescription(log, category, activity, context) });
  }
  records.sort((left, right) => left.startTime - right.startTime);
  const used = new Set(records.map((record) => record.categoryId));
  return {
    records, excluded, range: bounds,
    categories: categories.filter((category) => used.has(category.id)).map((category) => ({
      id: category.id, name: (category.name.trim() || '未命名分类').slice(0, 80), color: /^#[0-9a-f]{6}$/i.test(category.themeColor) ? category.themeColor : '#8b7c6b'
    }))
  };
}
