/**
 * @file feishuSyncPlan.ts
 * @input Complete hydrated local logs, linked names, date range and account-bound imported references.
 * @output Explicit upserts/deletions without treating filtered, planned or invalid records as deleted.
 * @pos Manual Feishu synchronization planning.
 * @updated 2026-10-03: Protects ignored categories from uploads, deletions and category migrations.
 */
import type { Category, Log } from '../types';
import type { FeishuLogDescriptionContext } from './feishuLogDescription';
import type { FeishuImportRange } from './feishuImportRange';
import { prepareFeishuLogImport } from './feishuLogImport';

export interface FeishuImportedReference { id: string; startTime: number; categoryIds: string[] }

export function prepareFeishuSyncPlan(logs: Log[], categories: Category[], range: FeishuImportRange,
  references: FeishuImportedReference[], context: FeishuLogDescriptionContext & { ignoredCategoryIds?: ReadonlySet<string> } = {}) {
  const localIds = new Set(logs.map((log) => log.id));
  const ignored = context.ignoredCategoryIds || new Set<string>();
  const protectedIds = new Set(references.filter((reference) => reference.categoryIds.some((id) => ignored.has(id))).map((reference) => reference.id));
  const includeLogIds = new Set(references.filter((reference) => !protectedIds.has(reference.id)).map((reference) => reference.id));
  const prepared = prepareFeishuLogImport(logs.filter((log) => !protectedIds.has(log.id)), categories, range, { ...context, includeLogIds });
  return { ...prepared, sync: true as const, ignoredCategoryIds: [...ignored],
    deleteIds: [...includeLogIds].filter((id) => !localIds.has(id)) };
}
