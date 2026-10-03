/**
 * @file feishuSyncPlan.test.ts
 * @input Complete local snapshots and previous account-bound imports.
 * @output Coverage for deleted IDs, moved times and ignored-category preservation.
 * @pos Synchronization planning tests.
 */
import { expect, it } from 'vitest';
import type { Category, Log } from '../types';
import { prepareFeishuSyncPlan } from './feishuSyncPlan';
const categories: Category[] = [{ id: 'work', name: '工作', icon: '', themeColor: '#336699', activities: [{ id: 'read', name: '阅读', icon: '', color: 'bg-blue-100' }] }];
const date = (day: number) => new Date(2026, 9, day).getTime();
const log: Log = { id: 'log-1', categoryId: 'work', activityId: 'read', startTime: date(2), endTime: date(2) + 3600000, duration: 3600 };
const range = { startDate: '20261002', endDate: '20261002' };

it('updates a previously imported log moved outside the range and deletes only truly absent IDs', () => {
  const selected = prepareFeishuSyncPlan([{ ...log, startTime: date(5), endTime: date(5) + 3600000 }], categories, range,
    [{ id: log.id, startTime: date(2), categoryIds: ['work'] }, { id: 'deleted', startTime: date(2), categoryIds: ['work'] }]);
  expect(selected.records[0].startTime).toBe(date(5));
  expect(selected.deleteIds).toEqual(['deleted']);
});

it('does not mistake planned, invalid or missing-category records for deleted local IDs', () => {
  const logs = [{ ...log, id: 'plan', isPlanned: true }, { ...log, id: 'invalid', endTime: log.startTime }, { ...log, id: 'missing', categoryId: 'missing' }];
  const selected = prepareFeishuSyncPlan(logs, categories, range, logs.map((item) => ({ id: item.id, startTime: item.startTime, categoryIds: [item.categoryId] })));
  expect(selected.records).toEqual([]);
  expect(selected.deleteIds).toEqual([]);
  expect(prepareFeishuSyncPlan([], categories, range, [{ id: log.id, startTime: date(2), categoryIds: ['work'] }]).deleteIds).toEqual([log.id]);
});

it('preserves excluded local IDs, deleted remote IDs and migrations out of an ignored source category', () => {
  const other = { ...categories[0], id: 'life', name: '生活' };
  const references = [
    { id: 'deleted-work', startTime: date(2), categoryIds: ['work'] },
    { id: 'deleted-life', startTime: date(2), categoryIds: ['life'] },
    { id: 'moved', startTime: date(2), categoryIds: ['work'] }
  ];
  const selected = prepareFeishuSyncPlan([log, { ...log, id: 'moved', categoryId: 'life' }, { ...log, id: 'included', categoryId: 'life' }],
    [...categories, other], range, references, { ignoredCategoryIds: new Set(['work']) });
  expect(selected.records.map((record) => record.id)).toEqual(['included']);
  expect(selected.deleteIds).toEqual(['deleted-life']);
  expect(selected.categories.map((category) => category.id)).toEqual(['life']);
});

it('ignores multiple categories, migration into an ignored category and unfinished migration locations', () => {
  const refs = [{ id: log.id, startTime: date(2), categoryIds: ['work'] },
    { id: 'pending-move', startTime: date(2), categoryIds: ['work', 'life'] }];
  const selected = prepareFeishuSyncPlan([{ ...log, categoryId: 'life' }], categories, range, refs,
    { ignoredCategoryIds: new Set(['life', 'other']) });
  expect(selected.records).toEqual([]);
  expect(selected.deleteIds).toEqual([]);
});

it('restores normal synchronization after categories are unselected', () => {
  const refs = [{ id: log.id, startTime: date(2), categoryIds: ['work'] }];
  expect(prepareFeishuSyncPlan([], categories, range, refs, { ignoredCategoryIds: new Set(['work']) }).deleteIds).toEqual([]);
  expect(prepareFeishuSyncPlan([], categories, range, refs).deleteIds).toEqual([log.id]);
  expect(prepareFeishuSyncPlan([log], categories, range, refs).records).toHaveLength(1);
});
