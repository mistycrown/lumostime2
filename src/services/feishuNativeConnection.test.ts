/**
 * @file feishuNativeConnection.test.ts
 * @input Simulated native secure storage, provider fixtures and process restarts.
 * @output Local authorization, persistence ordering, refresh, sync and failure recovery coverage.
 * @pos Android execution tests; real Keystore encryption is covered by Android instrumentation tests.
 * @updated 2026-10-03: Covers deleted-calendar provider codes and replacement persistence across restarts.
 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('@capacitor/core', () => ({ registerPlugin: vi.fn(() => ({})), CapacitorHttp: { request: vi.fn() } }));
import { createNativeFeishuExecutor } from './feishuNativeConnection';
import { NativeConnectionStore } from './feishu/nativeStore';
import { tokenHash } from './feishu/crypto';

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const provider = (data: unknown) => json({ code: 0, data });
const registration = { device_code: 'registration-secret', user_code: 'CREATE',
  verification_uri_complete: 'https://open.feishu.cn/page/launcher?user_code=CREATE', expires_in: 3600, interval: 5 };
const authorization = { device_code: 'authorization-secret', user_code: 'AUTHORIZE',
  verification_uri_complete: 'https://accounts.feishu.cn/oauth/v1/device?user_code=AUTHORIZE', expires_in: 600, interval: 5 };
const tokens = { access_token: 'access-secret', refresh_token: 'refresh-secret', expires_in: 3600, refresh_token_expires_in: 86400 };
const category = { id: 'work', name: '工作', color: '#336699' };
const record = { id: 'log-1', categoryId: category.id, title: '阅读', note: '笔记', startTime: 100000, endTime: 200000 };
const range = { startTime: 0, endTimeExclusive: 1000000 };
const batch = { sync: true, categories: [category], records: [record], timezone: 'Asia/Shanghai', range };

function secureBridge(initial: string | null = null) {
  let snapshot = initial;
  return {
    read: vi.fn(async () => ({ snapshot })),
    write: vi.fn(async (options: { snapshot: string }) => { snapshot = options.snapshot; }),
    openAuthorization: vi.fn(async () => {}),
    snapshot: () => snapshot
  };
}

function connectedSnapshot(expiredAccess = false) {
  const store = new NativeConnectionStore(null);
  const token = store.create({ status: 'connected', accountId: 'account', userName: '用户', calendarId: 'primary',
    calendars: [{ id: 'primary', name: '主日历' }], application: { id: 'own-app', secret: 'own-secret' },
    accessToken: 'access-secret', refreshToken: 'refresh-secret',
    accessExpiresAt: expiredAccess ? 0 : Date.now() + 3600000, refreshExpiresAt: Date.now() + 86400000 });
  store.setValue('installation', 'session', token);
  store.setValue('category_calendars', tokenHash('category:account:work'), {
    categoryId: 'work', categoryName: '工作', id: 'work-calendar', name: 'LumosTime · 工作', color: '#336699', subscribed: true
  }, 'account');
  return store.serialize();
}

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-03T00:00:00Z')); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
const advance = () => vi.setSystemTime(Date.now() + 5100);
const expectSafe = (data: unknown) => expect(JSON.stringify(data)).not.toMatch(/registration-secret|authorization-secret|access-secret|refresh-secret|own-secret/);

it('creates and authorizes locally, restores both pending stages and returns no private credentials', async () => {
  const bridge = secureBridge();
  const fetchFn = vi.fn().mockResolvedValueOnce(json(registration));
  let request = createNativeFeishuExecutor(bridge, fetchFn);
  expect((await request('status')).data).toMatchObject({ configured: true, status: 'disconnected', connectionMode: 'personal' });
  expect(fetchFn).not.toHaveBeenCalled();
  const start = await request('connect');
  expect(start).toMatchObject({ status: 200, data: { authorizeUrl: registration.verification_uri_complete } });
  expectSafe(start.data);
  request = createNativeFeishuExecutor(bridge, fetchFn);
  expect((await request('status')).data).toMatchObject({ status: 'pending', phase: 'create' });
  expect(fetchFn).toHaveBeenCalledTimes(1);
  advance();
  fetchFn.mockResolvedValueOnce(json({ client_id: 'own-app', client_secret: 'own-secret' }))
    .mockImplementationOnce(async (_url, init) => {
      expect(bridge.snapshot()).toContain('own-secret'); // The app is saved before requesting device consent.
      expect(new URLSearchParams(init.body).get('scope')).toBe('calendar:calendar calendar:calendar:readonly offline_access');
      return json(authorization);
    });
  const ready = await request('status');
  expect(ready.data).toMatchObject({ phase: 'authorize', applicationId: 'own-app' });
  expectSafe(ready.data);
  request = createNativeFeishuExecutor(bridge, fetchFn);
  expect((await request('status')).data).toMatchObject({ phase: 'authorize' });
  advance();
  fetchFn.mockResolvedValueOnce(json(tokens))
    .mockImplementationOnce(async () => {
      expect(bridge.snapshot()).toContain('access-secret'); // Never consume a device code twice after restart.
      return provider({ open_id: 'owner', name: '用户' });
    })
    .mockResolvedValueOnce(provider({ calendars: [{ calendar: { calendar_id: 'primary', role: 'owner' } }] }))
    .mockResolvedValueOnce(provider({ calendar_list: [], has_more: false }));
  const connected = await request('status');
  expect(connected).toMatchObject({ status: 200, data: { status: 'connected', userName: '用户', calendarId: 'primary' } });
  expectSafe(connected.data);
  request = createNativeFeishuExecutor(bridge, fetchFn);
  expect((await request('status')).data.status).toBe('connected');
  expect(fetchFn.mock.calls.filter(([url]) => url.endsWith('/events'))).toHaveLength(0);
  expect(await request('disconnect')).toMatchObject({ status: 200, data: { ok: true } });
  expect(bridge.snapshot()).not.toMatch(/registration-secret|authorization-secret|access-secret|refresh-secret|own-secret/);
  expect((await createNativeFeishuExecutor(bridge, fetchFn)('status')).data.status).toBe('disconnected');
});

it('refreshes with the same private app and durably saves replacement tokens before calendar access', async () => {
  const bridge = secureBridge(connectedSnapshot(true));
  const fetchFn = vi.fn().mockResolvedValueOnce(json({ ...tokens, access_token: 'new-access', refresh_token: 'new-refresh' }))
    .mockImplementationOnce(async () => {
      expect(bridge.snapshot()).toContain('new-refresh');
      return provider({ calendar_id: 'primary', role: 'owner' });
    });
  const result = await createNativeFeishuExecutor(bridge, fetchFn)('calendar', { calendarId: 'primary' });
  expect(result.status).toBe(200);
  expect(JSON.parse(fetchFn.mock.calls[0][1].body)).toMatchObject({ grant_type: 'refresh_token', client_id: 'own-app', client_secret: 'own-secret' });
  expectSafe(result.data);
  expect(JSON.stringify(result.data)).not.toMatch(/new-access|new-refresh/);
});

it('persists an unknown event write before POST and reconciles after restart without duplicate creation', async () => {
  const bridge = secureBridge(connectedSnapshot());
  const fetchFn = vi.fn().mockResolvedValueOnce(provider({ calendar_id: 'work-calendar', role: 'owner' }))
    .mockResolvedValueOnce(provider({ calendar_id: 'work-calendar', role: 'owner' }))
    .mockResolvedValueOnce(provider({ items: [], has_more: false }))
    .mockImplementationOnce(async () => {
      expect(bridge.snapshot()).toContain('"status":"pending"');
      throw new Error('timeout after write');
    });
  const result = await createNativeFeishuExecutor(bridge, fetchFn)('import', batch);
  expect(result.data.results).toEqual([{ id: 'log-1', status: 'failed', error: expect.any(String) }]);
  expect(bridge.snapshot()).toContain('"status":"unknown"');
  fetchFn.mockResolvedValueOnce(provider({ calendar_id: 'work-calendar', role: 'owner' }))
    .mockResolvedValueOnce(provider({ items: [{ event_id: 'recovered-event', description: '[LumosTime:log:log-1]', status: 'confirmed' }], has_more: false }));
  const restored = createNativeFeishuExecutor(bridge, fetchFn);
  expect((await restored('import', batch)).data.results).toEqual([{ id: 'log-1', status: 'skipped' }]);
  expect(fetchFn.mock.calls.filter(([, init]) => init.method === 'POST')).toHaveLength(1);
  expect((await restored('import', { operation: 'catalog', range })).data.records).toEqual([{ id: 'log-1', startTime: record.startTime, categoryIds: ['work'] }]);
});

it('refuses unreadable storage, keeps existing data and permits a later read retry', async () => {
  const bridge = secureBridge(connectedSnapshot());
  const snapshot = bridge.snapshot();
  bridge.read.mockRejectedValueOnce(new Error('Keystore locked'));
  const fetchFn = vi.fn();
  const request = createNativeFeishuExecutor(bridge, fetchFn);
  expect(await request('connect')).toMatchObject({ status: 503, data: { error: expect.stringContaining('安全存储') } });
  expect(fetchFn).not.toHaveBeenCalled();
  expect(bridge.write).not.toHaveBeenCalled();
  expect(bridge.snapshot()).toBe(snapshot);
  expect((await request('status')).data.status).toBe('connected');
  const corrupt = secureBridge('{invalid');
  expect((await createNativeFeishuExecutor(corrupt, fetchFn)('status')).status).toBe(503);
  expect(corrupt.write).not.toHaveBeenCalled();
});

it('recovers HTTP 403 calendar-deleted responses, saves the replacement and skips it after restart', async () => {
  const bridge = secureBridge(connectedSnapshot());
  const seeded = new NativeConnectionStore(bridge.snapshot());
  seeded.setValue('import_ledger', tokenHash('log:account:work-calendar:log-1'), {
    status: 'complete', requestId: 'old-request', eventId: 'old-event', record, timezone: batch.timezone
  }, 'account');
  await bridge.write({ snapshot: seeded.serialize() });
  const fetchFn = vi.fn().mockResolvedValueOnce(json({ code: 191003 }, 403))
    .mockResolvedValueOnce(provider({ calendar_list: [], has_more: false }))
    .mockImplementationOnce(async () => {
      const snapshot = new NativeConnectionStore(bridge.snapshot());
      expect(snapshot.getValue('import_ledger', tokenHash('log:account:work-calendar:log-1'))).toBeNull();
      expect(snapshot.listValues('category_calendars', 'account')).toEqual([]);
      return provider({ calendar: { calendar_id: 'replacement', summary: 'LumosTime · 工作' } });
    }).mockResolvedValueOnce(provider({}))
    .mockResolvedValueOnce(provider({ calendar_id: 'replacement', role: 'owner', summary: 'LumosTime · 工作' }))
    .mockResolvedValueOnce(provider({ items: [], has_more: false }))
    .mockResolvedValueOnce(provider({ event: { event_id: 'replacement-event' } }));
  expect((await createNativeFeishuExecutor(bridge, fetchFn)('import', batch)).data.results)
    .toEqual([{ id: 'log-1', status: 'created' }]);
  expect(new NativeConnectionStore(bridge.snapshot()).listValues('category_calendars', 'account'))
    .toMatchObject([{ id: 'replacement', name: 'LumosTime · 工作' }]);
  fetchFn.mockResolvedValueOnce(provider({ calendar_id: 'replacement', role: 'owner', summary: 'LumosTime · 工作' }));
  expect((await createNativeFeishuExecutor(bridge, fetchFn)('import', batch)).data.results)
    .toEqual([{ id: 'log-1', status: 'skipped' }]);
  expect(fetchFn.mock.calls.filter(([url, init]) => url.endsWith('/calendars') && init.method === 'POST')).toHaveLength(1);
  expect(fetchFn.mock.calls.filter(([url, init]) => url.includes('/events?') && init.method === 'POST')).toHaveLength(1);
});

it('does not POST an event when its pending ledger cannot be saved', async () => {
  const bridge = secureBridge(connectedSnapshot());
  bridge.write.mockRejectedValue(new Error('disk full'));
  const fetchFn = vi.fn().mockResolvedValueOnce(provider({ calendar_id: 'work-calendar', role: 'owner' }))
    .mockResolvedValueOnce(provider({ items: [], has_more: false }));
  const request = createNativeFeishuExecutor(bridge, fetchFn);
  const result = await request('import', batch);
  expect(result).toMatchObject({ status: 503, data: { error: expect.stringContaining('无法保存') } });
  expect(fetchFn.mock.calls.some(([, init]) => init.method === 'POST')).toBe(false);
  const count = fetchFn.mock.calls.length;
  expect((await request('status')).status).toBe(503);
  expect(fetchFn).toHaveBeenCalledTimes(count);
});

it('handles authorization rejection and expiry locally and reuses an existing app on reconnect', async () => {
  const bridge = secureBridge();
  const fetchFn = vi.fn().mockResolvedValueOnce(json(registration));
  const request = createNativeFeishuExecutor(bridge, fetchFn);
  await request('connect');
  advance();
  fetchFn.mockResolvedValueOnce(json({ error: 'access_denied' }, 400));
  expect((await request('status')).data).toMatchObject({ status: 'error', error: expect.stringContaining('取消') });
  const restored = createNativeFeishuExecutor(secureBridge(connectedSnapshot()), fetchFn);
  fetchFn.mockResolvedValueOnce(json(authorization));
  const next = await restored('connect');
  expect(next.status).toBe(200);
  expect(fetchFn.mock.calls.at(-1)?.[0]).toBe('https://accounts.feishu.cn/oauth/v1/device_authorization');
  expect((await restored('status')).data).toMatchObject({ phase: 'authorize', applicationId: 'own-app' });
  vi.setSystemTime(Date.now() + 601000);
  expect((await restored('status')).data).toMatchObject({ status: 'error', error: expect.stringContaining('超时') });
});

it('updates and deletes tracked events after restart using the same source ownership checks as desktop', async () => {
  const bridge = secureBridge(connectedSnapshot());
  const fetchFn = vi.fn().mockResolvedValueOnce(provider({ calendar_id: 'work-calendar', role: 'owner' }))
    .mockResolvedValueOnce(provider({ calendar_id: 'work-calendar', role: 'owner' }))
    .mockResolvedValueOnce(provider({ items: [], has_more: false }))
    .mockResolvedValueOnce(provider({ event: { event_id: 'event-1' } }));
  expect((await createNativeFeishuExecutor(bridge, fetchFn)('import', batch)).data.results).toEqual([{ id: 'log-1', status: 'created' }]);
  const event = { event_id: 'event-1', status: 'confirmed', description: '[LumosTime:log:log-1]' };
  fetchFn.mockResolvedValueOnce(provider({ calendar_id: 'work-calendar', role: 'owner' }))
    .mockResolvedValueOnce(provider({ event }))
    .mockResolvedValueOnce(provider({ event }));
  const restored = createNativeFeishuExecutor(bridge, fetchFn);
  expect((await restored('import', { ...batch, records: [{ ...record, title: '新标题' }] })).data.results).toEqual([{ id: 'log-1', status: 'updated' }]);
  expect(fetchFn.mock.calls.at(-1)?.[1]).toMatchObject({ method: 'PATCH' });
  fetchFn.mockResolvedValueOnce(provider({ event })).mockResolvedValueOnce(provider({}));
  expect((await restored('import', { ...batch, records: [], deleteIds: ['log-1'] })).data.results).toEqual([{ id: 'log-1', status: 'deleted' }]);
  expect(fetchFn.mock.calls.at(-1)?.[1]).toMatchObject({ method: 'DELETE' });
  expect((await createNativeFeishuExecutor(bridge, fetchFn)('import', { operation: 'catalog', range })).data.records).toEqual([]);
});

it('serializes concurrent connect and status actions without reading or overwriting partial snapshots', async () => {
  const bridge = secureBridge();
  let complete!: (response: Response) => void;
  const fetchFn = vi.fn(() => new Promise<Response>((resolve) => { complete = resolve; }));
  const request = createNativeFeishuExecutor(bridge, fetchFn);
  const connecting = request('connect');
  const reading = request('status');
  await vi.waitFor(() => expect(fetchFn).toHaveBeenCalledOnce());
  complete(json(registration));
  expect((await connecting).status).toBe(200);
  expect((await reading).data).toMatchObject({ status: 'pending', phase: 'create' });
  expect(bridge.read).toHaveBeenCalledTimes(1);
  expect(fetchFn).toHaveBeenCalledTimes(1);
});
