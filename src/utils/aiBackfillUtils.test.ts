/**
 * @file aiBackfillUtils.test.ts
 * @input Synthetic AI backfill tool-call payloads
 * @output Regression coverage for AI backfill date normalization and midnight splitting
 * @pos Test (AI backfill utility)
 * @description Verifies that AI backfill tool calls default to today, split cross-midnight records, and dedupe identical payloads.
 * @updated 2026-04-22: Added coverage for date fallback, cross-day splitting, and duplicate create_log removal.
 */

import { describe, expect, it } from 'vitest';
import { normalizeAIBackfillToolCalls, parseTimeOnDateKey } from './aiBackfillUtils';

describe('normalizeAIBackfillToolCalls', () => {
  it('fills missing dates with the provided fallback date', () => {
    const normalized = normalizeAIBackfillToolCalls([
      {
        toolName: 'create_log',
        args: {
          date: '',
          startTime: '09:00',
          endTime: '10:00',
          description: '写周报',
          categoryId: 'cat-1',
          activityId: 'act-1'
        }
      }
    ], '2026-04-22');

    expect(normalized).toHaveLength(1);
    expect(normalized[0].args.date).toBe('2026-04-22');
  });

  it('splits a cross-midnight record into two date-scoped tool calls', () => {
    const normalized = normalizeAIBackfillToolCalls([
      {
        toolName: 'create_log',
        args: {
          date: '2026-04-22',
          startTime: '23:30',
          endTime: '01:15',
          description: '加班收尾',
          categoryId: 'cat-1',
          activityId: 'act-1'
        }
      }
    ], '2026-04-22');

    expect(normalized).toHaveLength(2);
    expect(normalized[0].args.date).toBe('2026-04-22');
    expect(normalized[0].args.endTime).toBe('23:59');
    expect(normalized[1].args.date).toBe('2026-04-23');
    expect(normalized[1].args.startTime).toBe('00:00');
    expect(normalized[1].args.endTime).toBe('01:15');
  });

  it('removes duplicate tool calls after normalization', () => {
    const normalized = normalizeAIBackfillToolCalls([
      {
        toolName: 'create_log',
        args: {
          date: '2026-04-22',
          startTime: '09:00',
          endTime: '10:00',
          description: '整理邮件',
          categoryId: 'cat-1',
          activityId: 'act-1',
          scopeIds: ['scope-b', 'scope-a']
        }
      },
      {
        toolName: 'create_log',
        args: {
          date: '2026-04-22',
          startTime: '09:00',
          endTime: '10:00',
          description: '整理邮件',
          categoryId: 'cat-1',
          activityId: 'act-1',
          scopeIds: ['scope-a', 'scope-b']
        }
      }
    ], '2026-04-22');

    expect(normalized).toHaveLength(1);
  });
});

describe('parseTimeOnDateKey', () => {
  it('parses an HH:mm string onto the provided date key', () => {
    const parsed = parseTimeOnDateKey('2026-04-22', '08:45');
    expect(parsed).not.toBeNull();
    expect(new Date(parsed!).getHours()).toBe(8);
    expect(new Date(parsed!).getMinutes()).toBe(45);
  });
});
