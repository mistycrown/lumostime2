/**
 * @file personalService.test.ts
 * @input Official registration/device-flow response fixtures and encrypted session persistence.
 * @output Coverage for private apps, staged consent, cancellation, retries and secret isolation.
 * @pos Personal Feishu authorization regression tests; no live user authorization.
 */
import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { OAuthStore, tokenHash } from './oauthStore';
import { PersonalFeishuService, validatePersonalAuthorizationUrl } from './personalService';

let store: OAuthStore;
let fetchFn: ReturnType<typeof vi.fn>;
let service: PersonalFeishuService;
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const registration = () => ({ device_code: 'registration-secret', user_code: 'USER-CODE',
  verification_uri_complete: 'https://open.feishu.cn/page/launcher?user_code=USER-CODE', expires_in: 3600, interval: 5 });
const authorization = () => ({ device_code: 'authorization-secret', user_code: 'AUTH-CODE',
  verification_uri_complete: 'https://accounts.feishu.cn/oauth/v1/device?user_code=AUTH-CODE', expires_in: 600, interval: 5 });
const credentials = { access_token: 'user-token', refresh_token: 'refresh-secret', expires_in: 3600, refresh_token_expires_in: 86400 };

beforeEach(() => {
  store = new OAuthStore(':memory:', randomBytes(32).toString('base64'));
  fetchFn = vi.fn();
  service = new PersonalFeishuService(store, 'https://connect.example', fetchFn);
});
afterEach(() => { store.close(); vi.restoreAllMocks(); });
const due = (token: string) => {
  const id = tokenHash(token);
  const connection = store.get(id)!;
  connection.device!.nextPoll = 0;
  store.save(id, connection);
};
async function begin() {
  fetchFn.mockResolvedValueOnce(json(registration()));
  return service.startConnection();
}
async function appReady(token: string, applicationId = 'own-app') {
  due(token);
  fetchFn.mockResolvedValueOnce(json({ client_id: applicationId, client_secret: 'own-secret', user_info: { tenant_brand: 'feishu' } }))
    .mockResolvedValueOnce(json(authorization()));
  return service.readStatus(token);
}
async function connected(openId = 'owner', applicationId = 'own-app') {
  const { sessionToken } = await begin();
  await appReady(sessionToken, applicationId);
  due(sessionToken);
  fetchFn.mockResolvedValueOnce(json(credentials))
    .mockResolvedValueOnce(json({ code: 0, data: { open_id: openId, tenant_key: 'tenant', name: '用户' } }))
    .mockResolvedValueOnce(json({ code: 0, data: { calendars: [{ calendar: { calendar_id: 'primary', role: 'owner', summary: '主日历' } }] } }))
    .mockResolvedValueOnce(json({ code: 0, data: { calendar_list: [], has_more: false } }));
  const status = await service.readStatus(sessionToken);
  return { token: sessionToken, status };
}

it('opens official app creation without any shared app credentials or exposing device codes', async () => {
  const result = await begin();
  expect(result.authorizeUrl).toContain('https://open.feishu.cn/page/launcher');
  expect(fetchFn.mock.calls[0][0]).toBe('https://accounts.feishu.cn/oauth/v1/app/registration');
  expect(new URLSearchParams(fetchFn.mock.calls[0][1].body).get('archetype')).toBe('PersonalAgent');
  expect(fetchFn.mock.calls[0][1].headers.Authorization).toBeUndefined();
  expect(await service.readStatus(result.sessionToken)).toMatchObject({ connectionMode: 'personal', status: 'pending', phase: 'create' });
  expect(JSON.stringify(service.status(result.sessionToken))).not.toContain('registration-secret');
  expect(fetchFn).toHaveBeenCalledTimes(1);
});

it('keeps each app encrypted and requests calendar read/write and offline authorization with its own credentials', async () => {
  const first = await begin();
  const second = await begin();
  const status = await appReady(first.sessionToken);
  expect(status).toMatchObject({ phase: 'authorize', applicationId: 'own-app' });
  expect(service.status(second.sessionToken)).toMatchObject({ phase: 'create' });
  const request = fetchFn.mock.calls[3][1];
  expect(request.headers.Authorization).toBe(`Basic ${Buffer.from('own-app:own-secret').toString('base64')}`);
  expect(new URLSearchParams(request.body).get('scope')?.split(' ')).toEqual(['calendar:calendar', 'calendar:calendar:readonly', 'offline_access']);
  expect(JSON.stringify(status)).not.toMatch(/own-secret|registration-secret|authorization-secret/);
});

it('finishes user consent, keeps credentials private and refreshes with the personal app', async () => {
  const { token, status } = await connected();
  expect(status).toMatchObject({ status: 'connected', userName: '用户', calendarId: 'primary' });
  expect(JSON.stringify(status)).not.toMatch(/user-token|refresh-secret|own-secret|device/);
  const connection = store.get(tokenHash(token))!;
  connection.accessExpiresAt = 0;
  store.save(tokenHash(token), connection);
  fetchFn.mockResolvedValueOnce(json(credentials))
    .mockResolvedValueOnce(json({ code: 0, data: { calendar_id: 'primary', role: 'owner' } }));
  await service.selectCalendar(token, 'primary');
  const exchange = JSON.parse(fetchFn.mock.calls[7][1].body);
  expect(exchange).toMatchObject({ client_id: 'own-app', client_secret: 'own-secret', grant_type: 'refresh_token' });
});

it('reuses an existing private app on reconnect instead of registering a new one', async () => {
  const { token } = await connected();
  fetchFn.mockResolvedValueOnce(json(authorization()));
  const next = await service.startConnection(token);
  expect(fetchFn.mock.calls.at(-1)![0]).toBe('https://accounts.feishu.cn/oauth/v1/device_authorization');
  expect(service.status(next.sessionToken)).toMatchObject({ phase: 'authorize', applicationId: 'own-app' });
  expect(service.status(token).status).toBe('disconnected');
});

it('recovers a primary-calendar permission rejection by reauthorizing the same app with read access', async () => {
  const { sessionToken } = await begin();
  await appReady(sessionToken);
  due(sessionToken);
  fetchFn.mockResolvedValueOnce(json(credentials))
    .mockResolvedValueOnce(json({ code: 0, data: { open_id: 'owner', name: '用户' } }))
    .mockResolvedValueOnce(json({ code: 99991672, msg: 'private upstream details' }, 403));
  await expect(service.readStatus(sessionToken)).rejects.toMatchObject({ status: 403, message: expect.stringContaining('99991672') });
  expect(service.status(sessionToken)).toMatchObject({ status: 'error', applicationId: 'own-app' });
  expect(service.status(sessionToken).error).not.toContain('private upstream details');
  fetchFn.mockResolvedValueOnce(json(authorization()));
  const next = await service.startConnection(sessionToken);
  const request = fetchFn.mock.calls.at(-1)!;
  expect(request[0]).toBe('https://accounts.feishu.cn/oauth/v1/device_authorization');
  const scopes = new URLSearchParams(request[1].body).get('scope')!.split(' ');
  // Official calendar.primary accepts these read scopes, but not calendar:calendar alone.
  expect(scopes.some((scope) => ['calendar:calendar:readonly', 'calendar:calendar.calendar:readonly', 'calendar:calendar:read'].includes(scope))).toBe(true);
  due(next.sessionToken);
  fetchFn.mockResolvedValueOnce(json(credentials))
    .mockResolvedValueOnce(json({ code: 0, data: { open_id: 'owner', name: '用户' } }))
    .mockResolvedValueOnce(json({ code: 0, data: { calendars: [{ calendar: { calendar_id: 'primary', role: 'owner' } }] } }))
    .mockResolvedValueOnce(json({ code: 0, data: { calendar_list: [], has_more: false } }));
  expect(await service.readStatus(next.sessionToken)).toMatchObject({ status: 'connected', applicationId: 'own-app' });
  expect(fetchFn.mock.calls.filter(([url]) => url.endsWith('/app/registration'))).toHaveLength(2);
  expect(fetchFn.mock.calls.some(([url]) => url.includes('/events'))).toBe(false);
});

it('identifies the same Feishu user by owned primary calendar across different private applications', async () => {
  const first = await connected('open-id-in-app-one', 'private-app-one');
  const second = await connected('open-id-in-app-two', 'private-app-two');
  expect(first.status.accountId).toBe(second.status.accountId);
  expect(first.status.applicationId).not.toBe(second.status.applicationId);
});

it('respects polling intervals and slow_down and turns rejection/expiry into recoverable states', async () => {
  const { sessionToken } = await begin();
  due(sessionToken);
  fetchFn.mockResolvedValueOnce(json({ error: 'slow_down' }, 400));
  await service.readStatus(sessionToken);
  expect(store.get(tokenHash(sessionToken))!.device!.interval).toBe(10000);
  await service.readStatus(sessionToken);
  expect(fetchFn).toHaveBeenCalledTimes(2);
  due(sessionToken);
  fetchFn.mockResolvedValueOnce(json({ error: 'access_denied' }, 400));
  expect(await service.readStatus(sessionToken)).toMatchObject({ status: 'error', error: expect.stringContaining('取消') });
  const next = await begin();
  const state = store.get(tokenHash(next.sessionToken))!;
  state.device!.expires = 0;
  store.save(tokenHash(next.sessionToken), state);
  expect(await service.readStatus(next.sessionToken)).toMatchObject({ status: 'error' });
});

it('does not restore a disconnected session after an in-flight registration poll', async () => {
  const { sessionToken } = await begin();
  due(sessionToken);
  let resolve!: (response: Response) => void;
  fetchFn.mockImplementationOnce(() => new Promise<Response>((done) => { resolve = done; }));
  const reading = service.readStatus(sessionToken);
  service.disconnect(sessionToken);
  resolve(json({ client_id: 'late-app', client_secret: 'late-secret' }));
  expect(await reading).toMatchObject({ status: 'disconnected' });
  expect(fetchFn).toHaveBeenCalledTimes(2);
});

it('retains exchanged tokens after a transient calendar lookup failure instead of consuming the device code twice', async () => {
  const { sessionToken } = await begin();
  await appReady(sessionToken);
  due(sessionToken);
  fetchFn.mockResolvedValueOnce(json(credentials)).mockRejectedValueOnce(new Error('offline'));
  await expect(service.readStatus(sessionToken)).rejects.toThrow('连接');
  fetchFn.mockResolvedValueOnce(json({ code: 0, data: { open_id: 'owner', name: '用户' } }))
    .mockResolvedValueOnce(json({ code: 0, data: { calendars: [{ calendar: { calendar_id: 'primary', role: 'owner' } }] } }))
    .mockResolvedValueOnce(json({ code: 0, data: { calendar_list: [], has_more: false } }));
  expect(await service.readStatus(sessionToken)).toMatchObject({ status: 'connected' });
  expect(fetchFn.mock.calls.filter(([url]) => url === 'https://accounts.feishu.cn/oauth/v3/token')).toHaveLength(1);
});

it('rejects foreign authorization pages', () => {
  for (const url of ['https://evil.example/page/cli', 'http://open.feishu.cn/page/cli', 'https://name:secret@open.feishu.cn/page/cli']) {
    expect(() => validatePersonalAuthorizationUrl(url)).toThrow();
  }
});
