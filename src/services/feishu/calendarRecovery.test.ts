/**
 * @file calendarRecovery.test.ts
 * @input Stateful provider fixtures and both native/shared and standalone server execution cores.
 * @output Regression coverage for metadata reconciliation and confirmed calendar deletion recovery.
 * @pos Feishu synchronization tests; no live account writes.
 */
import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { FeishuCalendarImport as SharedImport, type CalendarCall } from './calendarImport';
import { CalendarTestError as SharedError, calendarResourceError as sharedResourceError } from './calendarTest';
import { NativeConnectionStore } from './nativeStore';
import { tokenHash } from './crypto';
import { FeishuCalendarImport as ServerImport } from '../../../server/feishu/calendarImport';
import { CalendarTestError as ServerError, calendarResourceError as serverResourceError } from '../../../server/feishu/calendarTest';
import { OAuthStore } from '../../../server/feishu/oauthStore';
import type { ConnectionStore } from './connectionStore';

const category = { id: 'life', name: 'life', color: '#996633' };
const record = { id: 'log-1', categoryId: 'life', title: '阅读', note: '备注', startTime: 100000, endTime: 200000 };
const range = { startTime: 0, endTimeExclusive: 1000000 };
const body = (records = [record], deleteIds: string[] = []) => ({ sync: true, categories: [category], records, deleteIds, range, timezone: 'Asia/Shanghai' });
const calendarKey = tokenHash('category:alice:life');
const ledgerKey = (id: string) => tokenHash(`log:alice:old-calendar:${id}`);

for (const core of [
  { name: 'shared desktop/Android', makeStore: () => new NativeConnectionStore(null),
    makeImport: (store: any) => new SharedImport(store), Error: SharedError, resourceError: sharedResourceError },
  { name: 'standalone server', makeStore: () => new OAuthStore(':memory:', randomBytes(32).toString('base64')),
    makeImport: (store: any) => new ServerImport(store), Error: ServerError, resourceError: serverResourceError }
]) describe(core.name, () => {
  let store: ConnectionStore;
  let importer: Pick<SharedImport, 'prepare' | 'mappings'> & {
    run: (accountId: string, request: unknown, call: CalendarCall) => Promise<any>;
  };
  let remote: Map<string, any>;
  let events: Map<string, any>;
  let call: Mock<CalendarCall>;
  let sequence: number;
  let blocked: Error | null;
  let patchFailure: boolean;
  let createTimeout: boolean;
  const calendarWrites = () => call.mock.calls.filter(([path, method]) => path === 'calendars' && method === 'POST');
  const eventWrites = () => call.mock.calls.filter(([path, method]) => path.includes('/events?') && method === 'POST');
  const seed = (item = record, status = 'complete', owner?: string) => {
    const entry = { status, requestId: 'saved-request', record: item, timezone: 'Asia/Shanghai',
      ...(status === 'complete' ? { eventId: `old-${item.id}` } : {}) };
    store.setValue('import_ledger', ledgerKey(item.id), entry, owner);
    if (status === 'complete') events.set(entry.eventId!, { event_id: entry.eventId, calendarId: 'old-calendar',
      description: `[LumosTime:log:${item.id}]`, status: 'confirmed' });
  };
  beforeEach(() => {
    store = core.makeStore(); importer = core.makeImport(store); sequence = 0;
    blocked = null; patchFailure = false; createTimeout = false;
    remote = new Map([['old-calendar', { calendar_id: 'old-calendar', role: 'owner', summary: 'LumosTime · life',
      color: 0x123456, description: `[LumosTime:category:${tokenHash('alice:life')}]` }]]);
    events = new Map();
    store.setValue('category_calendars', calendarKey, { categoryId: 'life', categoryName: 'life', id: 'old-calendar',
      name: 'LumosTime · life', color: category.color, subscribed: true }, 'alice');
    call = vi.fn(async (path: string, method = 'GET', payload?: any) => {
      if (blocked) throw blocked;
      const parts = new URL(path, 'https://fixture/').pathname.split('/').filter(Boolean);
      if (parts.length === 1) {
        if (method === 'GET') return { calendar_list: [...remote.values()].filter((item) => !item.is_deleted), has_more: false };
        const calendar = { ...payload, role: 'owner', calendar_id: `new-calendar-${++sequence}` };
        remote.set(calendar.calendar_id, calendar);
        if (createTimeout) { createTimeout = false; throw new core.Error('创建结果未知'); }
        return { calendar };
      }
      const calendar = remote.get(parts[1]);
      if (!calendar || calendar.is_deleted) throw new core.Error('日历已删除', 404, true, 'calendar');
      if (parts.length === 2) {
        if (method === 'PATCH') {
          if (patchFailure) throw new core.Error('日历更新失败', 403, true);
          Object.assign(calendar, payload);
        }
        return { ...calendar };
      }
      if (parts[2] === 'subscribe') return {};
      if (parts.length === 3) {
        if (method === 'GET') return { items: [...events.values()].filter((event) => event.calendarId === calendar.calendar_id), has_more: false };
        const event = { ...payload, calendarId: calendar.calendar_id, event_id: `event-${++sequence}`, status: 'confirmed' };
        events.set(event.event_id, event); return { event };
      }
      const event = events.get(parts[3]);
      if (!event) throw new core.Error('日程已删除', 404, true, 'event');
      if (method === 'PATCH') Object.assign(event, payload);
      if (method === 'DELETE') event.status = 'cancelled';
      return { event: { ...event } };
    });
  });
  afterEach(() => { if (store instanceof OAuthStore) store.close(); });

  it('corrects an old localized title and alias without translating life or creating a calendar', async () => {
    Object.assign(remote.get('old-calendar'), { summary: 'LumosTime · 生活', summary_alias: '生活' });
    const result = await importer.prepare('alice', category, call);
    expect(result).toMatchObject({ id: 'old-calendar', categoryName: 'life', name: 'LumosTime · life' });
    expect(call.mock.calls.at(-1)).toEqual(['calendars/old-calendar', 'PATCH', { summary: 'LumosTime · life', summary_alias: 'LumosTime · life' }]);
    expect(calendarWrites()).toHaveLength(0);
    call.mockClear(); await importer.prepare('alice', category, call);
    expect(call).toHaveBeenCalledTimes(1);
    expect(remote.get('old-calendar').color).toBe(0x123456);
  });

  it('renames the same bound calendar across a restart and keeps already synchronized log IDs', async () => {
    seed(); importer = core.makeImport(store);
    const renamed = { ...body(), categories: [{ ...category, name: '日常' }] };
    expect((await importer.run('alice', renamed, call)).results).toEqual([{ id: record.id, status: 'skipped' }]);
    expect(remote.get('old-calendar').summary).toBe('LumosTime · 日常');
    expect(importer.mappings('alice')[0].categoryName).toBe('日常');
    expect(calendarWrites()).toHaveLength(0); expect(eventWrites()).toHaveLength(0);
  });

  it('changes only the current identity alias for a writer and updates an explicitly changed local color', async () => {
    remote.get('old-calendar').role = 'writer';
    await importer.prepare('alice', { ...category, name: '日常', color: '#112233' }, call);
    expect(call.mock.calls.at(-1)).toEqual(['calendars/old-calendar', 'PATCH', { summary_alias: 'LumosTime · 日常', color: 0x112233 }]);
    expect(remote.get('old-calendar').summary).toBe('LumosTime · life');
  });

  it('retains the previous metadata when the rename is rejected, then retries the same calendar', async () => {
    patchFailure = true;
    await expect(importer.prepare('alice', { ...category, name: '日常' }, call)).rejects.toThrow('更新失败');
    expect(importer.mappings('alice')[0].categoryName).toBe('life');
    patchFailure = false;
    await importer.prepare('alice', { ...category, name: '日常' }, call);
    expect(importer.mappings('alice')[0].categoryName).toBe('日常'); expect(calendarWrites()).toHaveLength(0);
  });

  it('reconciles a stale title discovered from another device by the stable category marker', async () => {
    store.removeValue('category_calendars', calendarKey);
    remote.get('old-calendar').summary = '生活';
    expect((await importer.prepare('alice', category, call)).id).toBe('old-calendar');
    expect(remote.get('old-calendar').summary).toBe('LumosTime · life');
    expect(calendarWrites()).toHaveLength(0);
  });

  it.each(['missing', 'deleted flag'])('rebuilds a %s calendar and restores only this range, retaining other accounts and local IDs', async (mode) => {
    seed(); const outside = { ...record, id: 'outside', startTime: 2000000, endTime: 2100000 }; seed(outside);
    const foreignKey = tokenHash('log:bob:old-calendar:log-1');
    store.setValue('import_ledger', foreignKey, { status: 'complete', record, timezone: 'Asia/Shanghai' }, 'bob');
    if (mode === 'missing') remote.delete('old-calendar');
    else { remote.get('old-calendar').is_deleted = true;
      call.mockImplementationOnce(async () => ({ ...remote.get('old-calendar') })); }
    expect((await importer.run('alice', body(), call)).results[0].status).toBe('created');
    expect(importer.mappings('alice')[0].id).toMatch(/^new-calendar-/);
    expect(store.getValue('import_ledger', ledgerKey(record.id))).toBeNull();
    expect(store.getValue('import_ledger', foreignKey)).not.toBeNull();
    expect(calendarWrites()).toHaveLength(1); expect(eventWrites()).toHaveLength(1);
    expect((await importer.run('alice', { operation: 'catalog', range: { startTime: 2000000, endTimeExclusive: 3000000 } }, call)).records)
      .toEqual([{ id: 'outside', startTime: outside.startTime, categoryIds: ['life'] }]);
    importer = core.makeImport(store);
    expect((await importer.run('alice', body(), call)).results[0].status).toBe('skipped');
    expect(calendarWrites()).toHaveLength(1); expect(eventWrites()).toHaveLength(1);
  });

  it('drops an uncertain old event only after the whole calendar is confirmed gone', async () => {
    seed(record, 'unknown'); remote.delete('old-calendar');
    expect((await importer.run('alice', body(), call)).results[0].status).toBe('created');
    expect(eventWrites()).toHaveLength(1);
  });

  it.each([403, 502])('preserves bindings and ledgers on a %i failure without creating duplicates', async (status) => {
    seed(); blocked = new core.Error('访问失败', status, status === 403);
    expect((await importer.run('alice', body(), call)).results[0].status).toBe('failed');
    expect(importer.mappings('alice')[0].id).toBe('old-calendar');
    expect(store.getValue('import_ledger', ledgerKey(record.id))).not.toBeNull();
    expect(calendarWrites()).toHaveLength(0); expect(eventWrites()).toHaveLength(0);
  });

  it('completes deletion-only batches against a deleted calendar without creating an empty replacement', async () => {
    seed(); seed({ ...record, id: 'pending' }, 'unknown'); remote.delete('old-calendar');
    expect((await importer.run('alice', body([], ['log-1', 'pending']), call)).results.map((item: any) => item.status)).toEqual(['deleted', 'deleted']);
    expect(calendarWrites()).toHaveLength(0); expect(eventWrites()).toHaveLength(0);
    expect(importer.mappings('alice')).toEqual([]);
    expect((await importer.run('alice', { operation: 'catalog', range }, call)).records).toEqual([]);
  });

  it('adopts a replacement whose create timed out after restart instead of making a second calendar', async () => {
    seed(); remote.delete('old-calendar'); createTimeout = true;
    expect((await importer.run('alice', body(), call)).results[0].status).toBe('failed');
    expect(store.getValue('import_ledger', ledgerKey(record.id))).toBeNull();
    importer = core.makeImport(store);
    expect((await importer.run('alice', body(), call)).results[0].status).toBe('created');
    expect(calendarWrites()).toHaveLength(1); expect(eventWrites()).toHaveLength(1);
  });

  it('distinguishes calendar deletion from event deletion and generic permission failures', () => {
    expect(core.resourceError('calendars/old-calendar/events/event', 403, 191003)).toMatchObject({ status: 404, resource: 'calendar' });
    expect(core.resourceError('calendars/old-calendar', 404, 191000)).toMatchObject({ resource: 'calendar' });
    expect(core.resourceError('calendars/old-calendar/events/event', 403, 193003)).toMatchObject({ resource: 'event' });
    expect(core.resourceError('calendars/old-calendar/events/event', 404, undefined)).toMatchObject({ resource: 'event' });
    expect(core.resourceError('calendars/old-calendar/events?page_size=500', 404, undefined)).toMatchObject({ resource: 'calendar' });
    expect(core.resourceError('calendars/old-calendar', 403, 191002)).toBeNull();
  });

  it('keeps using the replacement if a formerly deleted calendar reappears in the remote list', async () => {
    seed(); const old = remote.get('old-calendar'); remote.delete('old-calendar');
    await importer.run('alice', body(), call);
    const replacement = importer.mappings('alice')[0].id;
    // Simulate a lost binding after recovery with an old calendar restored by the user.
    const savedReplacement = remote.get(replacement);
    remote.clear(); remote.set('old-calendar', old); remote.set(replacement, savedReplacement);
    store.removeValue('category_calendars', calendarKey);
    expect((await importer.prepare('alice', category, call)).id).toBe(replacement);
    expect(calendarWrites()).toHaveLength(1);
  });

  it('clears an interrupted uncertainty flag when the saved calendar ID is confirmed deleted', async () => {
    seed(); store.setValue('category_uncertain', calendarKey, true); remote.delete('old-calendar');
    expect((await importer.run('alice', body(), call)).results[0].status).toBe('created');
    expect(store.getValue('category_uncertain', calendarKey)).toBeNull();
    expect(calendarWrites()).toHaveLength(1);
  });
});
