/**
 * @file noteAutocomplete.test.ts
 * @updated 2026-10-09: Covers dictionary priority, punctuation, long phrases, and cache isolation.
 * @input Historical notes and caret positions
 * @output Regression coverage for local single-suggestion completion
 * @pos Test (Note Autocomplete)
 * @updated 2026-10-09: Covers record frequency, context ranking, casing, phrase matching and protected caret positions.
 */
import { describe, expect, it } from 'vitest';
import type { Log } from '../types';
import { getNoteAutocompleteIndex, getNoteCompletion } from './noteAutocomplete';

const record = (id: string, note: string, overrides: Partial<Log> = {}): Log => ({
  id, note, categoryId: 'study', activityId: 'writing', startTime: 100, endTime: 200, duration: 100, ...overrides
});
const lookup = (logs: Log[], text: string, activityId?: string, caret = text.length, end = caret) =>
  getNoteCompletion(getNoteAutocompleteIndex(logs), text, caret, end, activityId);

describe('note autocomplete', () => {
  it('completes personal terms immediately and prioritizes them over contextual history', () => {
    const logs = Array.from({ length: 20 }, (_, i) => record(String(i), '文学', { activityId: 'reading' }));
    const index = getNoteAutocompleteIndex(logs, ['文献管理', 'TypeScript', 'C++', 'New York City']);
    expect(getNoteCompletion(index, '今天看文', 4, 4, 'reading')).toEqual({ text: '文献管理', suffix: '献管理' });
    expect(getNoteCompletion(index, 'type', 4)?.suffix).toBe('Script');
    expect(getNoteCompletion(index, 'C+', 2)?.suffix).toBe('+');
    expect(getNoteCompletion(index, 'New York C', 10)?.suffix).toBe('ity');
    expect(getNoteCompletion(index, 'Prototype', 9)).toBeNull();
    const empty = getNoteAutocompleteIndex([], ['科研项目复盘', '论文', '文献管理']);
    expect(getNoteCompletion(empty, '科研项', 3)?.suffix).toBe('目复盘');
    expect(getNoteCompletion(empty, '论文', 2)).toBeNull();
    expect(getNoteCompletion(empty, '[[科研项', 5)).toBeNull();
    expect(getNoteCompletion(empty, '科研项后文', 3)).toBeNull();
  });

  it('keeps dictionary caches isolated and restores historical suggestions after removal', () => {
    const logs = [record('1', '文学'), record('2', '文学')];
    const words = ['文献管理'];
    const index = getNoteAutocompleteIndex(logs, words);
    expect(getNoteAutocompleteIndex(logs, words)).toBe(index);
    expect(getNoteCompletion(index, '文', 1)?.text).toBe('文献管理');
    expect(getNoteCompletion(getNoteAutocompleteIndex(logs, ['文章编辑']), '文', 1)?.text).toBe('文章编辑');
    expect(getNoteCompletion(getNoteAutocompleteIndex(logs), '文', 1)?.text).toBe('文学');
    expect(getNoteCompletion(getNoteAutocompleteIndex([], ['论文', '论文修改']), '论文修', 3)?.suffix).toBe('改');
    expect(getNoteCompletion(getNoteAutocompleteIndex([], ['一个超过二十四字的个性化词典词条用于确认完整长短语也可以补全']), '一个超过二十四字', 8)?.suffix)
      .toBe('的个性化词典词条用于确认完整长短语也可以补全');
  });

  it('counts records instead of occurrences and excludes planned notes and numbers', () => {
    const logs = [record('1', '论文 论文 论文 1234'), record('p', '论文', { isPlanned: true })];
    expect(lookup(logs, '论')).toBeNull();
    const updatedLogs = [...logs, record('2', '论文 1234')];
    expect(lookup(updatedLogs, '论')?.suffix).toBe('文');
    expect(lookup(updatedLogs, '123')).toBeNull();
    expect(lookup([record('same', '论文'), record('same', '论文')], '论')).toBeNull();
  });

  it('finds the suffix of a Chinese sentence without changing its prefix', () => {
    const result = lookup([record('1', '论文'), record('2', '论文')], '今天写论');
    expect(result).toMatchObject({ text: '论文', suffix: '文' });
    expect(lookup([record('a', '论文修改 TypeScript'), record('b', '论文修改 TypeScript')], '今天写论')?.suffix).toBe('文');
  });

  it('prefers the current activity and uses frequency then recency for ties', () => {
    const logs = [record('1', '文学', { activityId: 'reading' }), record('2', '文学', { activityId: 'reading' }),
      record('3', '文献'), record('4', '文献'), record('5', '文学', { activityId: 'reading' })];
    expect(lookup(logs, '文', 'writing')?.text).toBe('文献');
    expect(lookup(logs, '文', 'reading')?.text).toBe('文学');
    expect(lookup([...logs, ...Array.from({ length: 20 }, (_, i) => record(`many-${i}`, '文学', { activityId: 'reading' }))], '文', 'writing')?.text).toBe('文献');
    expect(lookup(logs, '文')?.text).toBe('文学');
    expect(lookup([record('a', '文献'), record('b', '文献'), record('c', '文学', { startTime: 1000 }), record('d', '文学', { startTime: 1000 })], '文')?.text).toBe('文学');
  });

  it('completes frequent adjacent phrases and prefers the longest matching prefix', () => {
    const logs = [record('1', '论文修改'), record('2', '论文修改'), record('3', '文学'), record('4', '文学')];
    expect(lookup(logs, '今天做论文修')?.suffix).toBe('改');
    expect(lookup(logs, '论文')?.text).toBe('论文修改');
    expect(lookup([record('1', '论文'), record('2', '论文'), record('3', '文学'), record('4', '文学')], '论文')).toBeNull();
  });

  it('matches English case-insensitively while preserving stored casing and word boundaries', () => {
    const logs = [record('1', 'TypeScript'), record('2', 'TypeScript')];
    expect(lookup(logs, 'Learn Type')?.suffix).toBe('Script');
    expect(lookup(logs, 'Learn type')?.suffix).toBe('Script');
    expect(lookup(logs, 'Prototype')).toBeNull();
  });

  it('skips empty prefixes, selections, a caret inside words and unfinished wiki links', () => {
    const logs = [record('1', '论文'), record('2', '论文')];
    for (const text of ['', '今天 ', '今天，', '[[论', '［［论']) expect(lookup(logs, text)).toBeNull();
    expect(lookup(logs, '论文', undefined, 1)).toBeNull();
    expect(lookup(logs, '论，后文', undefined, 1)).toBeNull();
    expect(lookup(logs, '论', undefined, 0, 1)).toBeNull();
    expect(lookup(logs, '论\n保留后文', undefined, 1)?.suffix).toBe('文');
    expect(lookup(logs, '[[其他]]论')?.suffix).toBe('文');
  });

  it('caches an unchanged history and refreshes after edited or removed records', () => {
    const logs = [record('1', '论文'), record('2', '论文')];
    expect(getNoteAutocompleteIndex(logs)).toBe(getNoteAutocompleteIndex(logs));
    expect(lookup([logs[0], { ...logs[1], note: '文献' }], '论')).toBeNull();
    expect(lookup(logs.slice(0, 1), '论')).toBeNull();
  });
});
