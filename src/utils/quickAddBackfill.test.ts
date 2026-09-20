/**
 * @file quickAddBackfill.test.ts
 * @input Quick-add-backfill command strings
 * @output Regression coverage for prefix extraction
 * @pos Test (AI Backfill Shortcut)
 */

import { describe, expect, it } from 'vitest';
import {
  extractQuickAddBackfillDescription,
  isQuickAddBackfillCommand,
  QUICK_ADD_BACKFILL_PREFIX
} from './quickAddBackfill';

describe('quickAddBackfill', () => {
  it('extracts the description after the command prefix', () => {
    expect(extractQuickAddBackfillDescription(`  ${QUICK_ADD_BACKFILL_PREFIX} 昨天下午开会  `)).toBe('昨天下午开会');
  });

  it('rejects an empty or unrelated message', () => {
    expect(extractQuickAddBackfillDescription(QUICK_ADD_BACKFILL_PREFIX)).toBeNull();
    expect(isQuickAddBackfillCommand('帮我补记昨天下午的会议')).toBe(false);
  });
});
