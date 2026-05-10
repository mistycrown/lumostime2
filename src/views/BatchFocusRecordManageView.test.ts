/**
 * @file BatchFocusRecordManageView.test.ts
 * @input Pure batch note helpers from BatchFocusRecordManageView
 * @output Regression coverage for batch note update rules
 * @pos Test
 * @description Verifies that batch note deletion, append behavior, replacement normalization, and execution validation stay aligned with the batch-manage UI.
 * @updated 2026-05-10: Added coverage for batch note operations.
 */
import { describe, expect, it } from 'vitest';
import { Log } from '../types';
import {
  appendNoteToLogs,
  canExecuteBatchOperation,
  deleteNoteFromLogs,
  replaceNoteInLogs
} from './BatchFocusRecordManageView';

const logs: Log[] = [
  {
    id: 'log-1',
    activityId: 'activity-1',
    categoryId: 'category-1',
    startTime: 1,
    endTime: 2,
    duration: 1,
    note: 'existing note'
  },
  {
    id: 'log-2',
    activityId: 'activity-2',
    categoryId: 'category-2',
    startTime: 3,
    endTime: 4,
    duration: 1
  },
  {
    id: 'log-3',
    activityId: 'activity-3',
    categoryId: 'category-3',
    startTime: 5,
    endTime: 6,
    duration: 1,
    note: 'untouched note'
  }
];

describe('batch note helpers', () => {
  it('deletes notes only from selected logs', () => {
    const result = deleteNoteFromLogs(logs, new Set(['log-1', 'log-2']));

    expect(result[0].note).toBeUndefined();
    expect(result[1].note).toBeUndefined();
    expect(result[2].note).toBe('untouched note');
  });

  it('appends note text with an automatic line break when the original note is non-empty', () => {
    const result = appendNoteToLogs(logs, new Set(['log-1', 'log-2']), 'follow-up');

    expect(result[0].note).toBe('existing note\nfollow-up');
    expect(result[1].note).toBe('follow-up');
    expect(result[2].note).toBe('untouched note');
  });

  it('replaces all matching note text occurrences inside selected logs', () => {
    const result = replaceNoteInLogs(logs, new Set(['log-1', 'log-2']), 'note', 'memo');

    expect(result[0].note).toBe('existing memo');
    expect(result[1].note).toBeUndefined();
    expect(result[2].note).toBe('untouched note');
  });

  it('allows replace-note execution with a search string and an optional empty replacement, but blocks append-note without real content', () => {
    expect(canExecuteBatchOperation('replace_note', { noteSearchText: 'old', noteReplaceText: '' }, 2)).toBe(true);
    expect(canExecuteBatchOperation('replace_note', { noteSearchText: '', noteReplaceText: 'new' }, 2)).toBe(false);
    expect(canExecuteBatchOperation('replace_note', null, 2)).toBe(false);
    expect(canExecuteBatchOperation('append_note', { noteText: '   ' }, 2)).toBe(false);
    expect(canExecuteBatchOperation('append_note', { noteText: 'new content' }, 2)).toBe(true);
  });
});
