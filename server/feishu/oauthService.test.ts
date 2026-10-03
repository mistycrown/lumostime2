/**
 * @file oauthService.test.ts
 * @input OAuth/provider fixtures and real encrypted SQLite stores.
 * @output Regression coverage for state security, isolation, persistence and explicit test imports.
 * @pos Feishu integration tests.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { OAuthStore, tokenHash } from './oauthStore';
import { FeishuOAuthService } from './oauthService';

const key = randomBytes(32).toString('base64');
const config = { appId: 'app-id', appSecret: 'app-secret', redirectUri: 'https://connect.example/api/feishu/callback' };
const response = (data: unknown) => new Response(JSON.stringify({ code: 0, data }));
const credentials = (name: string) => ({ access_token: `access-${name}`, refresh_token: `refresh-${name}`, expires_in: 7200, refresh_token_expires_in: 2592000 });
const tokenResponse = (name: string) => new Response(JSON.stringify({ code: 0, ...credentials(name) }));
const calendar = (id: string, role = 'owner') => ({ calendar_id: id, role, summary: `日历-${id}` });
let store: OAuthStore;
let fetchFn: ReturnType<typeof vi.fn>;
let service: FeishuOAuthService;
const input = () => ({ requestId: '28acddbc-4156-4f49-8ce0-1f9ecb10fef9', startTime: Date.now(), timezone: 'Asia/Shanghai' });

beforeEach(() => {
  store = new OAuthStore(':memory:', key);
  fetchFn = vi.fn();
  service = new FeishuOAuthService(config, store, fetchFn);
});
afterEach(() => { store.close(); vi.restoreAllMocks(); });

async function authorize(name = 'alice') {
  const started = service.connect();
  const params = new URL(started.authorizeUrl).searchParams;
  fetchFn.mockResolvedValueOnce(tokenResponse(name))
    .mockResolvedValueOnce(response({ open_id: name, tenant_key: 'tenant', name }))
    .mockResolvedValueOnce(response({ calendars: [{ calendar: calendar(name) }] }))
    .mockResolvedValueOnce(response({ calendar_list: [calendar(name), calendar(`${name}-shared`, 'writer'), calendar('read-only', 'reader')], has_more: false }));
  await service.callback(new URLSearchParams({ state: params.get('state')!, code: `code-${name}` }));
  return { ...started, state: params.get('state')! };
}

it('starts OAuth with random state and PKCE; a pending user cannot import', async () => {
  const { sessionToken, authorizeUrl } = service.connect();
  const url = new URL(authorizeUrl);
  expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  expect(url.searchParams.get('prompt')).toBe('consent');
  expect(url.searchParams.get('code_challenge')).toHaveLength(43);
  expect(url.searchParams.get('scope')).toContain('offline_access');
  expect(url.searchParams.get('scope')?.split(' ')).toContain('calendar:calendar:readonly');
  expect(authorizeUrl).not.toContain('app-secret');
  expect(service.status(sessionToken).status).toBe('pending');
  await expect(service.test(sessionToken, input())).rejects.toMatchObject({ status: 401 });
  expect(fetchFn).not.toHaveBeenCalled();
});

it('uses one-use states and exchanges the code on the server without creating an event', async () => {
  const user = await authorize();
  expect(service.status(user.sessionToken)).toMatchObject({ status: 'connected', userName: 'alice', calendarId: 'alice', calendars: [{ id: 'alice' }, { id: 'alice-shared' }] });
  expect(fetchFn).toHaveBeenCalledTimes(4);
  expect(fetchFn.mock.calls.every(([url]) => !url.includes('/events'))).toBe(true);
  const exchange = JSON.parse(fetchFn.mock.calls[0][1].body);
  expect(fetchFn.mock.calls[0][0]).toBe('https://accounts.feishu.cn/oauth/v3/token');
  expect(exchange).toMatchObject({ client_id: 'app-id', client_secret: 'app-secret', grant_type: 'authorization_code', code: 'code-alice' });
  expect(exchange.code_verifier).toHaveLength(43);
  expect(JSON.stringify(service.status(user.sessionToken))).not.toMatch(/access-|refresh-|app-secret/);
  await expect(service.callback(new URLSearchParams({ state: user.state, code: 'replay' }))).rejects.toMatchObject({ status: 400 });
  await expect(service.callback(new URLSearchParams({ state: 'wrong', code: 'invalid' }))).rejects.toMatchObject({ status: 400 });
  expect(fetchFn).toHaveBeenCalledTimes(4);
});

it('handles declined, expired and cancelled authorization without provider calls', async () => {
  const declined = service.connect();
  await expect(service.callback(new URLSearchParams({ state: new URL(declined.authorizeUrl).searchParams.get('state')!, error: 'access_denied' }))).rejects.toThrow('授权未完成');
  expect(service.status(declined.sessionToken).status).toBe('error');
  const cancelled = service.connect();
  service.disconnect(cancelled.sessionToken);
  await expect(service.callback(new URLSearchParams({ state: new URL(cancelled.authorizeUrl).searchParams.get('state')!, code: 'cancelled' }))).rejects.toThrow();
  const expired = service.connect();
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 11 * 60000);
  expect(service.status(expired.sessionToken).status).toBe('error');
  await expect(service.callback(new URLSearchParams({ state: new URL(expired.authorizeUrl).searchParams.get('state')!, code: 'expired' }))).rejects.toThrow();
  expect(fetchFn).not.toHaveBeenCalled();
});

it('isolates accounts and writes only the chosen calendar with the owner token', async () => {
  const alice = await authorize('alice');
  const bob = await authorize('bob');
  fetchFn.mockResolvedValueOnce(response({ calendar: calendar('alice-shared', 'writer') }));
  await service.selectCalendar(alice.sessionToken, 'alice-shared');
  await expect(service.selectCalendar(alice.sessionToken, 'bob')).rejects.toMatchObject({ status: 400 });
  expect(service.status(bob.sessionToken).calendarId).toBe('bob');
  fetchFn.mockResolvedValueOnce(response({ calendar: calendar('alice-shared', 'writer') }))
    .mockResolvedValueOnce(response({ event: { event_id: 'created' } }));
  const result = await service.test(alice.sessionToken, input());
  expect(result).toMatchObject({ calendarId: 'alice-shared', eventId: 'created' });
  const last = fetchFn.mock.calls.at(-1)!;
  expect(last[0]).toContain('/calendars/alice-shared/events?');
  expect(last[1].headers.Authorization).toBe('Bearer access-alice');
  expect(JSON.parse(last[1].body).need_notification).toBe(false);
});

it('imports into an automatically created category calendar using the authorized user token', async () => {
  const user = await authorize('alice');
  fetchFn.mockResolvedValueOnce(response({ calendar_list: [], has_more: false }))
    .mockResolvedValueOnce(response({ calendar: { calendar_id: 'category-calendar', summary: 'LumosTime · 工作' } }))
    .mockResolvedValueOnce(response({}))
    .mockResolvedValueOnce(response({ items: [], has_more: false }))
    .mockResolvedValueOnce(response({ event: { event_id: 'imported-log' } }));
  const time = Date.now();
  const result = await service.importLogs(user.sessionToken, {
    categories: [{ id: 'work', name: '工作', color: '#336699' }],
    records: [{ id: 'log-1', categoryId: 'work', title: '工作记录', note: '', startTime: time, endTime: time + 60000 }],
    timezone: 'Asia/Shanghai', range: { startTime: time - 1000, endTimeExclusive: time + 86400000 }
  });
  expect(result.results[0]).toMatchObject({ status: 'created' });
  expect(fetchFn.mock.calls.at(-1)![0]).toContain('/category-calendar/events?');
  expect(fetchFn.mock.calls.at(-1)![1].headers.Authorization).toBe('Bearer access-alice');
  expect(service.status(user.sessionToken).categoryCalendars[0].categoryId).toBe('work');
  const reconnected = await authorize('alice');
  expect(service.status(reconnected.sessionToken).categoryCalendars[0].id).toBe('category-calendar');
});

it('refreshes rotated tokens once for concurrent operations and persists them', async () => {
  const user = await authorize();
  const saved = store.get(tokenHash(user.sessionToken))!;
  store.save(tokenHash(user.sessionToken), { ...saved, accessExpiresAt: Date.now() - 1000 });
  fetchFn.mockResolvedValueOnce(tokenResponse('rotated'))
    .mockImplementation(async () => response({ calendar: calendar('alice') }));
  await Promise.all([service.selectCalendar(user.sessionToken, 'alice'), service.selectCalendar(user.sessionToken, 'alice')]);
  const exchanges = fetchFn.mock.calls.filter(([url]) => url === 'https://accounts.feishu.cn/oauth/v3/token');
  expect(exchanges).toHaveLength(2); // Initial exchange plus exactly one refresh.
  expect(JSON.parse(exchanges[1][1].body)).toMatchObject({ grant_type: 'refresh_token', refresh_token: 'refresh-alice' });
  expect(store.get(tokenHash(user.sessionToken))?.refreshToken).toBe('refresh-rotated');
});

it('preserves credentials on transient refresh failure, clears them when revoked', async () => {
  const user = await authorize();
  const id = tokenHash(user.sessionToken);
  store.save(id, { ...store.get(id)!, accessExpiresAt: Date.now() - 1000 });
  fetchFn.mockRejectedValueOnce(new Error('network'));
  await expect(service.test(user.sessionToken, input())).rejects.toThrow('连接飞书失败');
  expect(store.get(id)?.refreshToken).toBe('refresh-alice');
  fetchFn.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'invalid_grant', error_description: 'secret' }), { status: 400 }));
  await expect(service.test(user.sessionToken, input())).rejects.toMatchObject({ status: 401 });
  expect(store.get(id)).toEqual({ status: 'expired', error: '飞书授权已失效，请重新连接。' });
});

it('cannot resurrect a session disconnected during a refresh', async () => {
  const user = await authorize();
  const id = tokenHash(user.sessionToken);
  store.save(id, { ...store.get(id)!, accessExpiresAt: 0 });
  fetchFn.mockImplementationOnce(async () => { service.disconnect(user.sessionToken); return tokenResponse('new'); });
  await expect(service.test(user.sessionToken, input())).rejects.toMatchObject({ status: 401 });
  expect(store.get(id)).toBeNull();
  expect(service.status(user.sessionToken).status).toBe('disconnected');
});

it.each([20026, 20037, 20064, 20073])('recognizes invalid, expired, revoked and consumed refresh tokens (%s)', async (code) => {
  const user = await authorize();
  const id = tokenHash(user.sessionToken);
  store.save(id, { ...store.get(id)!, accessExpiresAt: 0 });
  fetchFn.mockResolvedValueOnce(new Response(JSON.stringify({ code, msg: 'sensitive upstream data' })));
  await expect(service.test(user.sessionToken, input())).rejects.toMatchObject({ status: 401 });
  expect(service.status(user.sessionToken).status).toBe('expired');
  expect(store.get(id)?.refreshToken).toBeUndefined();
});

it('rejects permission loss without event creation and marks invalid access as expired', async () => {
  const user = await authorize();
  fetchFn.mockResolvedValueOnce(response({ calendar: calendar('alice', 'reader') }));
  await expect(service.test(user.sessionToken, input())).rejects.toMatchObject({ status: 403 });
  expect(fetchFn).toHaveBeenCalledTimes(5);
  fetchFn.mockResolvedValueOnce(new Response(JSON.stringify({ code: 99991663, msg: 'access-alice' })));
  await expect(service.test(user.sessionToken, input())).rejects.toMatchObject({ status: 401 });
  expect(service.status(user.sessionToken).status).toBe('expired');
  expect(store.get(tokenHash(user.sessionToken))?.accessToken).toBeUndefined();
});

it('reports HTTP rate limits without clearing the user connection', async () => {
  const user = await authorize();
  fetchFn.mockResolvedValueOnce(new Response('', { status: 429 }));
  await expect(service.test(user.sessionToken, input())).rejects.toMatchObject({ status: 429, rejected: true });
  expect(service.status(user.sessionToken).status).toBe('connected');
});

it.each([20009, 20010])('explains app installation/availability errors instead of telling the user to configure credentials (%s)', async (code) => {
  const started = service.connect();
  fetchFn.mockResolvedValueOnce(new Response(JSON.stringify({ code, error: 'invalid_request' }), { status: 400 }));
  await expect(service.callback(new URLSearchParams({ state: new URL(started.authorizeUrl).searchParams.get('state')!, code: 'code' })))
    .rejects.toMatchObject({ status: 403, message: expect.stringContaining('申请使用') });
  expect(service.status(started.sessionToken).error).toContain('尚未开通 LumosTime');
  expect(fetchFn).toHaveBeenCalledTimes(1);
});

it.each([20002, 20048, 20069])('reports app setup errors as unavailable service without exposing upstream detail (%s)', async (code) => {
  const started = service.connect();
  fetchFn.mockResolvedValueOnce(new Response(JSON.stringify({ code, error: 'invalid_client', error_description: 'sensitive-app-details' }), { status: 400 }));
  await expect(service.callback(new URLSearchParams({ state: new URL(started.authorizeUrl).searchParams.get('state')!, code: 'code' })))
    .rejects.toMatchObject({ status: 503, message: expect.stringContaining('暂未开通') });
  expect(JSON.stringify(service.status(started.sessionToken))).not.toContain('sensitive-app-details');
});

it('keeps encrypted credentials across service restarts and deletes them on disconnect', () => {
  const directory = mkdtempSync(join(tmpdir(), 'lumos-feishu-'));
  const path = join(directory, 'oauth.sqlite');
  let persistent: OAuthStore | undefined;
  try {
    persistent = new OAuthStore(path, key);
    const token = persistent.create({ status: 'connected', accessToken: 'sensitive-access', refreshToken: 'sensitive-refresh' });
    const state = persistent.addState(tokenHash(token), 'sensitive-verifier', Date.now() + 60000);
    persistent.close();
    persistent = undefined;
    const bytes = readFileSync(path).toString('utf8');
    for (const secret of [token, state, 'sensitive-access', 'sensitive-refresh', 'sensitive-verifier']) expect(bytes).not.toContain(secret);
    persistent = new OAuthStore(path, key);
    expect(persistent.get(tokenHash(token))?.accessToken).toBe('sensitive-access');
    persistent.delete(tokenHash(token));
    expect(persistent.get(tokenHash(token))).toBeNull();
    expect(persistent.claimState(state)).toBeNull();
  } finally { persistent?.close(); rmSync(directory, { recursive: true, force: true }); }
});
