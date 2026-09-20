/**
 * @file quickAddBackfill.ts
 * @input User-entered AI chat text
 * @output Quick-add-backfill command prefix and extracted description
 * @pos Utility (AI Backfill Shortcut)
 * @description Centralizes the explicit command marker used by the AI quick-add-backfill flow.
 */

export const QUICK_ADD_BACKFILL_PREFIX = '快速添加补记：';

export const extractQuickAddBackfillDescription = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed.startsWith(QUICK_ADD_BACKFILL_PREFIX)) {
    return null;
  }

  return trimmed.slice(QUICK_ADD_BACKFILL_PREFIX.length).trim() || null;
};

export const isQuickAddBackfillCommand = (value: string): boolean => (
  extractQuickAddBackfillDescription(value) !== null
);
