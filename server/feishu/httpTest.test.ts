/**
 * @file httpTest.test.ts
 * @input HTTP streams, cookie sessions and OAuth provider fixtures.
 * @output Coverage for HTTP-only sessions, callback isolation, CORS and body limits.
 * @pos Unified Feishu API tests.
 */
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { OAuthStore } from './oauthStore';
import { FeishuOAuthService } from './oauthService';
import { createFeishuHandler } from './httpApi';

let store: OAuthStore;
let fetchFn: ReturnType<typeof vi.fn>;
let handler: ReturnType<typeof createFeishuHandler>;
beforeEach(() => {
  store = new OAuthStore(':memory:', randomBytes(32).toString('base64'));
  fetchFn = vi.fn();
  const service = new FeishuOAuthService({ appId: 'id', appSecret: 'secret', redirectUri: 'https://connect.example/api/feishu/callback' }, store, fetchFn);
  handler = createFeishuHandler(service, ['https://app.example']);
});
afterEach(() => store.close());

async function invoke(options: { path?: string; method?: string; origin?: string; cookie?: string; body?: string; header?: string; contentType?: string } = {}) {
  const req = Readable.from([options.body ?? '{}']) as IncomingMessage;
  req.url = options.path || '/api/feishu/connect';
  req.method = options.method || 'POST';
  req.headers = { 'content-type': options.contentType || 'application/json', 'x-lumos-feishu-client': options.header ?? '1', cookie: options.cookie };
  if (options.origin) req.headers.origin = options.origin;
  Object.defineProperty(req, 'socket', { value: { remoteAddress: '127.0.0.1' } });
  const headers: Record<string, any> = {};
  let output = '';
  const res = { statusCode: 200, setHeader: (name: string, value: unknown) => { headers[name] = value; }, end: (value?: string) => { output = value || ''; } };
  await handler(req, res as unknown as ServerResponse);
  return { status: res.statusCode, data: output.startsWith('{') ? JSON.parse(output) : output, headers };
}

it('issues an HttpOnly secure cookie without returning session credentials in JSON', async () => {
  const started = await invoke({ origin: 'https://app.example' });
  expect(started.status).toBe(200);
  expect(started.headers['Set-Cookie']).toContain('HttpOnly');
  expect(started.headers['Set-Cookie']).toContain('Secure; SameSite=None');
  expect(started.headers['Access-Control-Allow-Credentials']).toBe('true');
  const cookie = started.headers['Set-Cookie'].split(';')[0];
  expect(JSON.stringify(started.data)).not.toContain(cookie.split('=')[1]);
  expect(started.data.authorizeUrl).not.toContain('secret');
  expect((await invoke({ path: '/api/feishu/status', method: 'GET', cookie })).data.status).toBe('pending');
  expect((await invoke({ path: '/api/feishu/status', method: 'GET' })).data.status).toBe('disconnected');
  expect(fetchFn).not.toHaveBeenCalled();
});

it('rejects untrusted and opaque origins and unsafe browser form requests', async () => {
  expect((await invoke({ origin: 'https://evil.example' })).status).toBe(403);
  expect((await invoke({ origin: 'null' })).status).toBe(403);
  expect((await invoke({ header: '' })).status).toBe(403);
  expect((await invoke({ contentType: 'text/plain' })).status).toBe(403);
  const preflight = await invoke({ origin: 'https://app.example', method: 'OPTIONS' });
  expect(preflight.status).toBe(204);
  expect(preflight.headers['Access-Control-Allow-Origin']).toBe('https://app.example');
  expect(fetchFn).not.toHaveBeenCalled();
});

it('handles wrong methods, body limits and unauthorized imports', async () => {
  expect((await invoke({ method: 'GET' })).status).toBe(405);
  expect((await invoke({ body: '{bad' })).status).toBe(400);
  expect((await invoke({ body: 'x'.repeat(5000) })).status).toBe(413);
  expect((await invoke({ path: '/api/feishu/test', body: JSON.stringify({ requestId: '28acddbc-4156-4f49-8ce0-1f9ecb10fef9', startTime: Date.now(), timezone: 'Asia/Shanghai' }) })).status).toBe(401);
  expect((await invoke({ path: '/api/feishu/import', body: JSON.stringify({ records: [] }) })).status).toBe(401);
  expect((await invoke({ path: '/api/feishu/import', body: 'x'.repeat(256 * 1024 + 1) })).status).toBe(413);
  expect(fetchFn).not.toHaveBeenCalled();
});

it('does not let a bad callback create a session or import a calendar block', async () => {
  const callback = await invoke({ path: '/api/feishu/callback?state=wrong&code=bad', method: 'GET' });
  expect(callback.status).toBe(400);
  expect(callback.headers['Set-Cookie']).toBeUndefined();
  expect(callback.headers['Content-Security-Policy']).toContain("default-src 'none'");
  expect(callback.data).not.toContain('bad');
  expect(fetchFn).not.toHaveBeenCalled();
});

it('deletes the session and clears the cookie on disconnect', async () => {
  const started = await invoke();
  const cookie = started.headers['Set-Cookie'].split(';')[0];
  const ended = await invoke({ path: '/api/feishu/disconnect', cookie });
  expect(ended.headers['Set-Cookie']).toContain('Max-Age=0');
  expect((await invoke({ path: '/api/feishu/status', method: 'GET', cookie })).data.status).toBe('disconnected');
});

it('completes OAuth from an external browser without its cookie, then imports from the original session', async () => {
  const started = await invoke();
  const cookie = started.headers['Set-Cookie'].split(';')[0];
  const state = new URL(started.data.authorizeUrl).searchParams.get('state')!;
  const ok = (data: unknown) => new Response(JSON.stringify({ code: 0, data }));
  const calendar = { calendar_id: 'own-calendar', summary: '我的日历', role: 'owner' };
  fetchFn.mockResolvedValueOnce(ok({ access_token: 'user-access', refresh_token: 'user-refresh', expires_in: 7200, refresh_token_expires_in: 2592000 }))
    .mockResolvedValueOnce(ok({ open_id: 'user', name: '用户' }))
    .mockResolvedValueOnce(ok({ calendars: [{ calendar }] }))
    .mockResolvedValueOnce(ok({ calendar_list: [calendar], has_more: false }));
  const callback = await invoke({ path: `/api/feishu/callback?state=${state}&code=code`, method: 'GET' });
  expect(callback.status).toBe(200);
  expect(callback.headers['Set-Cookie']).toBeUndefined();
  expect(callback.data).not.toMatch(/user-access|user-refresh/);
  const connected = await invoke({ path: '/api/feishu/status', method: 'GET', cookie });
  expect(connected.data).toMatchObject({ status: 'connected', calendarId: 'own-calendar' });
  expect(JSON.stringify(connected)).not.toMatch(/user-access|user-refresh/);
  expect(fetchFn).toHaveBeenCalledTimes(4); // Authorization never creates events.
  fetchFn.mockResolvedValueOnce(ok({ calendar })).mockResolvedValueOnce(ok({ event: { event_id: 'test-event' } }));
  const imported = await invoke({ path: '/api/feishu/test', cookie, body: JSON.stringify({ requestId: '28acddbc-4156-4f49-8ce0-1f9ecb10fef9', startTime: Date.now(), timezone: 'Asia/Shanghai' }) });
  expect(imported.data).toMatchObject({ calendarId: 'own-calendar', eventId: 'test-event' });
  expect(fetchFn.mock.calls.at(-1)![1].headers.Authorization).toBe('Bearer user-access');
  fetchFn.mockResolvedValueOnce(ok({ calendar_list: [], has_more: false }))
    .mockResolvedValueOnce(ok({ calendar: { calendar_id: 'work-calendar' } })).mockResolvedValueOnce(ok({}))
    .mockResolvedValueOnce(ok({ items: [], has_more: false })).mockResolvedValueOnce(ok({ event: { event_id: 'log-event' } }))
    .mockResolvedValueOnce(ok({ items: [], has_more: false })).mockResolvedValueOnce(ok({ event: { event_id: 'log-event-2' } }));
  const time = Date.now();
  const formal = await invoke({ path: '/api/feishu/import', cookie, body: JSON.stringify({
    categories: [{ id: 'work', name: '工作', color: '#336699' }],
    records: [{ id: 'log-1', categoryId: 'work', title: '工作记录', note: 'x'.repeat(2000), startTime: time, endTime: time + 60000 },
      { id: 'log-2', categoryId: 'work', title: '工作记录', note: 'x'.repeat(2000), startTime: time, endTime: time + 60000 }],
    timezone: 'Asia/Shanghai', range: { startTime: time - 1000, endTimeExclusive: time + 86400000 }
  }) });
  expect(formal.status).toBe(200); // Valid import bodies can exceed the other endpoints' 4 KiB limit.
  expect(formal.data.results[0]).toMatchObject({ id: 'log-1', status: 'created' });
  expect(formal.data.results[1]).toMatchObject({ id: 'log-2', status: 'created' });
  expect(fetchFn.mock.calls.at(-1)![1].headers.Authorization).toBe('Bearer user-access');
});

it('reports service availability without exposing maintainer configuration', async () => {
  handler = createFeishuHandler(null, []);
  expect((await invoke({ path: '/api/feishu/status', method: 'GET' })).data).toMatchObject({ configured: false, status: 'disconnected' });
  expect((await invoke()).status).toBe(503);
});
