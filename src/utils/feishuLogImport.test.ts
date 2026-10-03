/**
 * @file feishuLogImport.test.ts
 * @input Actual/planned log fixtures, category colors and eight-digit date bounds.
 * @output Coverage for compact descriptions, excluded assets and inclusive date filtering.
 * @pos Feishu import utility tests.
 */
import { expect, it } from 'vitest';
import type { Category, Log } from '../types';
import { prepareFeishuLogImport } from './feishuLogImport';
import { getFeishuImportRangeBounds } from './feishuImportRange';

const categories: Category[] = [{ id: 'work', name: '工作', icon: '', themeColor: '#336699', activities: [{ id: 'read', name: '阅读', icon: '', color: 'bg-blue-100' }] }];
const date = (day: number, hour = 0) => new Date(2026, 9, day, hour).getTime();
const log: Log = { id: 'log-1', categoryId: 'work', activityId: 'read', startTime: date(2, 23), endTime: date(3, 1), duration: 7200 };

it('accepts eight-digit dates and includes the final day while preserving overnight duration', () => {
  const selected = prepareFeishuLogImport([log, { ...log, id: 'outside', startTime: date(3), endTime: date(3, 1) }], categories, { startDate: '20261002', endDate: '20261002' });
  expect(selected.records).toHaveLength(1);
  expect(selected.records[0]).toMatchObject({ title: '阅读', startTime: date(2, 23), endTime: date(3, 1) });
  expect(selected.categories).toEqual([{ id: 'work', name: '工作', color: '#336699' }]);
});

it('excludes plans, invalid durations, duplicate IDs and missing categories without copying private fields', () => {
  const input = { ...log, title: '标题', note: '备注', images: ['secret-image'], comments: [{ text: 'secret-comment' }] } as unknown as Log;
  const selected = prepareFeishuLogImport([input, input, { ...log, id: 'plan', isPlanned: true },
    { ...log, id: 'invalid', endTime: log.startTime }, { ...log, id: 'missing', categoryId: 'missing' }], categories, { startDate: '20261002', endDate: '20261002' });
  expect(selected.records).toHaveLength(1);
  expect(selected.excluded).toBe(4);
  expect(JSON.stringify(selected)).not.toMatch(/secret-image|secret-comment|images|comments/);
  expect(selected.records[0]).toMatchObject({ title: '标题' });
  expect(selected.records[0].note).toContain('【备注】\n备注');
  expect(selected.records[0].note).toContain('#阅读');
  expect(selected.records[0].note).not.toContain('log-1');
});

it('rejects incomplete, impossible and reversed eight-digit dates', () => {
  for (const [startDate, endDate] of [['202610', '20261002'], ['20260230', '20261002'], ['20261003', '20261002']]) {
    expect(() => getFeishuImportRangeBounds({ startDate, endDate })).toThrow();
  }
  expect(getFeishuImportRangeBounds({ startDate: '20240229', endDate: '20240229' }).endTimeExclusive).toBe(new Date(2024, 2, 1).getTime());
});
