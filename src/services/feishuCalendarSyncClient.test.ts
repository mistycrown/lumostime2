/**
 * @file feishuCalendarSyncClient.test.ts
 * @input Paginated sync catalogs and explicit mixed-operation results.
 * @output Coverage for complete catalog reads and trustworthy operation counts.
 * @pos Feishu client synchronization regression tests.
 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' }, CapacitorHttp: { request: vi.fn() } }));
import { getFeishuImportedLogs, importFeishuLogs } from './feishuCalendarClient';
beforeEach(() => {
  vi.stubGlobal('window', { location: { protocol: 'https:' } });
  vi.stubEnv('VITE_FEISHU_SERVICE_URL', '');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const response = (data: unknown) => new Response(JSON.stringify(data));
const range = { startTime: 0, endTimeExclusive: 1000000 };

it('reads every catalog page before computing deletion intent', async () => {
  const fetchFn = vi.fn().mockResolvedValueOnce(response({ records: [{ id: 'a', startTime: 1000, categoryIds: ['work'] }], after: 'a' }))
    .mockResolvedValueOnce(response({ records: [{ id: 'b', startTime: 2000, categoryIds: ['life'] }] }));
  vi.stubGlobal('fetch', fetchFn);
  expect(await getFeishuImportedLogs(range)).toEqual([{ id: 'a', startTime: 1000, categoryIds: ['work'] }, { id: 'b', startTime: 2000, categoryIds: ['life'] }]);
  expect(JSON.parse(fetchFn.mock.calls[1][1].body)).toEqual({ operation: 'catalog', range, after: 'a' });
});

it('stops on duplicate IDs or malformed cursors instead of returning a partial catalog', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({ records: [{ id: 'a', startTime: 1000, categoryIds: ['work'] }], after: 'a' }))
    .mockResolvedValueOnce(response({ records: [{ id: 'a', startTime: 1000, categoryIds: ['work'] }] }))
    .mockResolvedValueOnce(response({ records: [], after: 'a' })));
  await expect(getFeishuImportedLogs(range)).rejects.toThrow('不完整');
  await expect(getFeishuImportedLogs(range)).rejects.toThrow('不完整');
});

it('rejects missing or invalid source categories before deletion planning', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({ records: [{ id: 'a', startTime: 1000 }] }))
    .mockResolvedValueOnce(response({ records: [{ id: 'a', startTime: 1000, categoryIds: [] }] })));
  await expect(getFeishuImportedLogs(range)).rejects.toThrow('不完整');
  await expect(getFeishuImportedLogs(range)).rejects.toThrow('不完整');
});

it('checks deletion result IDs and rejects a delete result for an upsert', async () => {
  const batch = { sync: true, categories: [], records: [{ id: 'upsert', categoryId: 'work', title: '工作', note: '', startTime: 1000, endTime: 2000 }], deleteIds: ['removed'], timezone: 'Asia/Shanghai', range };
  const results = [{ id: 'upsert', status: 'moved' }, { id: 'removed', status: 'deleted' }];
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({ results, calendars: [] }))
    .mockResolvedValueOnce(response({ results: [{ id: 'upsert', status: 'deleted' }, results[1]], calendars: [] })));
  expect((await importFeishuLogs(batch)).results).toEqual(results);
  await expect(importFeishuLogs(batch)).rejects.toThrow('未确认');
});
