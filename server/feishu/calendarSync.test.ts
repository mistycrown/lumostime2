/**
 * @file calendarSync.test.ts
 * @input Encrypted SQLite and a stateful calendar provider with injected failures.
 * @output Coverage for updates, explicit deletions, account isolation and resumable category migrations.
 * @pos Manual synchronization regression tests; no live Feishu writes.
 * @updated 2026-10-03: Seeds canonical category calendar names for metadata reconciliation.
 */
import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FeishuCalendarImport, type ImportRecord } from './calendarImport';
import { CalendarTestError } from './calendarTest';
import { OAuthStore, tokenHash } from './oauthStore';

const categories = [{ id: 'work', name: '工作', color: '#336699' }, { id: 'life', name: '生活', color: '#996633' }];
const original = { id: 'log-1', categoryId: 'work', title: '阅读', note: '备注', startTime: 100000, endTime: 200000 };
const range = { startTime: 0, endTimeExclusive: 1000000 };
const body = (records: ImportRecord[] = [original], deleteIds: string[] = []) => ({ sync: true, categories, records, deleteIds, range, timezone: 'Asia/Shanghai' });
let store: OAuthStore;
let importer: FeishuCalendarImport;
let events: Map<string, any>;
let call: ReturnType<typeof vi.fn>;
let failure: { method: string; afterWrite?: boolean } | undefined;
let sequence: number;
beforeEach(() => {
  store = new OAuthStore(':memory:', randomBytes(32).toString('base64'));
  importer = new FeishuCalendarImport(store);
  events = new Map(); sequence = 0; failure = undefined;
  for (const category of categories) store.setValue('category_calendars', tokenHash(`category:alice:${category.id}`), {
    categoryId: category.id, categoryName: category.name, id: `${category.id}-calendar`, name: `LumosTime · ${category.name}`, color: category.color, subscribed: true
  }, 'alice');
  call = vi.fn(async (path: string, method = 'GET', payload?: any) => {
    const url = new URL(path, 'https://fixture/');
    const parts = url.pathname.split('/');
    const calendarId = parts[2];
    const eventId = parts[4];
    const injected = failure?.method === method ? failure : undefined;
    if (injected) failure = undefined;
    if (injected && !injected.afterWrite) throw new CalendarTestError('请求被拒绝', 403, true);
    let data: any;
    if (parts.length === 3) data = { calendar_id: calendarId, role: 'owner' };
    else if (method === 'GET' && !eventId) data = { items: [...events.values()].filter((event) => event.calendarId === calendarId), has_more: false };
    else if (method === 'POST') {
      const event = { ...payload, calendarId, event_id: `event-${++sequence}`, status: 'confirmed' };
      events.set(event.event_id, event); data = { event };
    } else {
      const event = events.get(eventId);
      if (!event || event.calendarId !== calendarId) throw new CalendarTestError('不存在', 404, true);
      if (method === 'PATCH') Object.assign(event, payload);
      if (method === 'DELETE') event.status = 'cancelled';
      data = method === 'DELETE' ? {} : { event: { ...event } };
    }
    if (injected?.afterWrite) throw new CalendarTestError('网络结果未知');
    return data;
  });
});
afterEach(() => store.close());
const statuses = async (request = body()) => ((await importer.run('alice', request, call)) as any).results.map((item: any) => item.status);
const writes = () => call.mock.calls.filter(([, method]) => ['POST', 'PATCH', 'DELETE'].includes(method));
const active = () => [...events.values()].filter((event) => event.status !== 'cancelled');

it('upgrades a legacy ledger, updates title/note/time and skips the unchanged next run', async () => {
  await importer.run('alice', { ...body(), sync: undefined }, call);
  // Exercise migration of the original owner-less ledger.
  const key = tokenHash('log:alice:work-calendar:log-1');
  store.setValue('import_ledger', key, store.getValue('import_ledger', key));
  expect((await importer.run('alice', { operation: 'catalog', range }, call)) as any).toMatchObject({ records: [{ id: 'log-1' }] });
  const changed = { ...original, title: '新标题', note: '属性和情绪已修改', startTime: 2000000, endTime: 2100000 };
  expect(await statuses(body([changed]))).toEqual(['updated']);
  expect(active()[0]).toMatchObject({ summary: changed.title, description: `${changed.note}\n\n[LumosTime:log:log-1]`, start_time: { timestamp: '2000' } });
  expect(await statuses({ ...body([changed]), range: { startTime: 2000000, endTimeExclusive: 3000000 } })).toEqual(['skipped']);
  expect(writes().map(([, method]) => method)).toEqual(['POST', 'PATCH']);
  expect((await importer.run('alice', { operation: 'catalog', range }, call)) as any).toMatchObject({ records: [] });
});

it('deletes only explicit known logs, supports an empty local range and repeats safely', async () => {
  await statuses(body([original, { ...original, id: 'log-2' }]));
  call.mockClear();
  expect(await statuses(body([original]))).toEqual(['skipped']);
  expect(active()).toHaveLength(2); // A partial batch never implies deletion.
  expect(await statuses(body([], ['log-1']))).toEqual(['deleted']);
  expect(await statuses(body([], ['log-1']))).toEqual(['deleted']);
  expect(active().map((event) => event.description)).toEqual([expect.stringContaining('log-2')]);
  expect(writes()).toEqual([[expect.stringContaining('?need_notification=false'), 'DELETE']]);
  expect((await importer.run('alice', { operation: 'catalog', range }, call)) as any).toMatchObject({ records: [{ id: 'log-2' }] });
  expect(await statuses()).toEqual(['created']); // Restoring the same Log ID creates a new event.
});

it('refuses foreign IDs, out-of-range deletions and unrelated remote events before destructive writes', async () => {
  await statuses(); call.mockClear();
  await expect(importer.run('bob', body([], ['log-1']), call)).rejects.toMatchObject({ status: 400 });
  await expect(importer.run('alice', { ...body([], ['log-1']), range: { startTime: 1000000, endTimeExclusive: 2000000 } }, call)).rejects.toMatchObject({ status: 400 });
  await expect(importer.run('alice', body([], ['unknown']), call)).rejects.toMatchObject({ status: 400 });
  expect(call).not.toHaveBeenCalled();
  active()[0].description = '用户自行创建的日程';
  expect(await statuses(body([], ['log-1']))).toEqual(['failed']);
  expect(await statuses(body([{ ...original, title: '修改' }]))).toEqual(['failed']);
  expect(writes()).toEqual([]);
});

it('deletes before creating on a category move, retries rejection and can move back without a stale ledger', async () => {
  await statuses(); call.mockClear();
  const moved = { ...original, categoryId: 'life' };
  failure = { method: 'POST' };
  expect(await statuses(body([moved]))).toEqual(['failed']);
  expect(active()).toHaveLength(0);
  expect(writes().map(([, method]) => method)).toEqual(['DELETE', 'POST']);
  importer = new FeishuCalendarImport(store); // Continue from persisted migration progress.
  expect(await statuses(body([moved]))).toEqual(['moved']);
  expect(active()).toHaveLength(1);
  expect(active()[0].calendarId).toBe('life-calendar');
  expect(await statuses()).toEqual(['moved']);
  expect(active()).toHaveLength(1);
  expect(active()[0].calendarId).toBe('work-calendar');
  expect(writes().map(([, method]) => method)).toEqual(['DELETE', 'POST', 'POST', 'DELETE', 'POST']);
});

it('recovers a deletion timeout without deleting twice and finishes migration on retry', async () => {
  await statuses(); call.mockClear();
  failure = { method: 'DELETE', afterWrite: true };
  const moved = { ...original, categoryId: 'life' };
  expect(await statuses(body([moved]))).toEqual(['failed']);
  expect(writes().map(([, method]) => method)).toEqual(['DELETE']);
  expect(await statuses(body([moved]))).toEqual(['moved']);
  expect(writes().map(([, method]) => method)).toEqual(['DELETE', 'POST']);
  expect(active()).toHaveLength(1);
});

it('reconciles an uncertain create and applies edits made before the retry without another POST', async () => {
  failure = { method: 'POST', afterWrite: true };
  expect(await statuses()).toEqual(['failed']);
  const changed = { ...original, note: '重试前修改' };
  expect(await statuses(body([changed]))).toEqual(['updated']);
  expect(active()[0].description).toContain(changed.note);
  expect(writes().map(([, method]) => method)).toEqual(['POST', 'PATCH']);
});

it('keeps unknown writes pending when invisible, and does not create in the new category prematurely', async () => {
  failure = { method: 'POST', afterWrite: true };
  await statuses(); events.clear(); call.mockClear();
  expect(await statuses(body([{ ...original, categoryId: 'life' }]))).toEqual(['failed']);
  expect(writes()).toEqual([]);
});

it('treats an already missing event as deleted and rejects malformed mixed intent', async () => {
  await statuses(); events.clear(); call.mockClear();
  expect(await statuses(body([], ['log-1']))).toEqual(['deleted']);
  expect(writes()).toEqual([]);
  await expect(importer.run('alice', body([original], ['log-1']), call)).rejects.toMatchObject({ status: 400 });
});

it('provides source categories and blocks ignored updates, deletions and migrations before any provider call', async () => {
  await statuses(); call.mockClear();
  expect((await importer.run('alice', { operation: 'catalog', range }, call)) as any).toMatchObject({ records: [{ id: 'log-1', categoryIds: ['work'] }] });
  for (const request of [body([], ['log-1']), body([{ ...original, note: '编辑' }]), body([{ ...original, categoryId: 'life' }])]) {
    await expect(importer.run('alice', { ...request, ignoredCategoryIds: ['work'] }, call)).rejects.toMatchObject({ status: 400 });
  }
  await expect(importer.run('alice', { ...body([{ ...original, categoryId: 'life' }]), ignoredCategoryIds: ['life'] }, call)).rejects.toMatchObject({ status: 400 });
  expect(call).not.toHaveBeenCalled();
  expect(active()).toHaveLength(1);
  expect(await statuses({ ...body([], ['log-1']), ignoredCategoryIds: ['life'] })).toEqual(['deleted']);
});

