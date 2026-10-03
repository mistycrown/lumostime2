/**
 * @file feishuCalendarClient.test.ts
 * @input Web, Android and Electron transport fixtures.
 * @output Coverage for credential-safe requests, authorization validation and manual import results.
 * @pos Application integration tests.
 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: vi.fn(() => false), getPlatform: vi.fn(() => 'web') }, CapacitorHttp: { request: vi.fn() } }));
vi.mock('./feishuNativeConnection', () => ({ requestNativeFeishu: vi.fn() }));
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { requestNativeFeishu } from './feishuNativeConnection';
import { getFeishuServiceEndpoint, getFeishuConnection, importFeishuLogs, requestFeishu, startFeishuAuthorization, testFeishuCalendar } from './feishuCalendarClient';

const request = { requestId: '28acddbc-4156-4f49-8ce0-1f9ecb10fef9', startTime: Date.now(), timezone: 'Asia/Shanghai' };
const result = { calendarId: 'calendar-1', calendarName: '测试日历', eventId: 'event-1', startTime: 1000, endTime: 901000, timezone: request.timezone };
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('window', { location: { protocol: 'https:' } });
  vi.stubEnv('VITE_FEISHU_SERVICE_URL', '');
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('accepts personal app confirmation pages and validates the second authorization URL', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ authorizeUrl: 'https://open.feishu.cn/page/launcher?user_code=CODE' })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ configured: true, status: 'pending', phase: 'create', authorizationUrl: 'https://open.feishu.cn/page/launcher?user_code=CODE' })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ configured: true, status: 'pending', phase: 'authorize', authorizationUrl: 'https://evil.example/' }))));
  expect(await startFeishuAuthorization()).toContain('open.feishu.cn/page/launcher');
  await expect(getFeishuConnection()).rejects.toThrow('授权地址');
});

it('uses only a maintainer-configured HTTPS service and rejects insecure roots', () => {
  expect(getFeishuServiceEndpoint('status')).toBe('/api/feishu/status');
  vi.stubEnv('VITE_FEISHU_SERVICE_URL', 'https://connect.example');
  expect(getFeishuServiceEndpoint('test')).toBe('https://connect.example/api/feishu/test');
  for (const url of ['http://remote.example', 'https://user:secret@example.com', 'file:///test', 'bad-url', 'https://example.com?key=x', 'https://example.com/path']) {
    vi.stubEnv('VITE_FEISHU_SERVICE_URL', url);
    expect(() => getFeishuServiceEndpoint('test')).toThrow();
  }
  vi.stubEnv('VITE_FEISHU_SERVICE_URL', '');
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  expect(() => getFeishuServiceEndpoint('status')).toThrow('尚未开通');
});

it('uses browser HttpOnly cookies and one manual test request without a test key', async () => {
  const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify(result)));
  vi.stubGlobal('fetch', fetchFn);
  expect(await testFeishuCalendar(request)).toEqual(result);
  expect(fetchFn).toHaveBeenCalledTimes(1);
  expect(fetchFn.mock.calls[0][1]).toMatchObject({ credentials: 'include', headers: { 'X-Lumos-Feishu-Client': '1' } });
  expect(fetchFn.mock.calls[0][1].headers['X-Lumos-Feishu-Key']).toBeUndefined();
  expect(JSON.parse(fetchFn.mock.calls[0][1].body)).toEqual(request);
});

it('opens OAuth only when the cookie-bound waiting session is available', async () => {
  const fetchFn = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ authorizeUrl: 'https://accounts.feishu.cn/open-apis/authen/v1/authorize?state=opaque' })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ configured: true, status: 'pending' })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ authorizeUrl: 'https://evil.example/' })));
  vi.stubGlobal('fetch', fetchFn);
  expect(await startFeishuAuthorization()).toContain('accounts.feishu.cn');
  await expect(startFeishuAuthorization()).rejects.toThrow('授权地址');
  expect(fetchFn).toHaveBeenCalledTimes(3);
});

it('detects blocked cookies, rejects malformed status and does not retry imports automatically', async () => {
  const fetchFn = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ authorizeUrl: 'https://accounts.feishu.cn/open-apis/authen/v1/authorize' })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ configured: true, status: 'disconnected' })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ configured: true, status: 'connected' })))
    .mockRejectedValueOnce(new Error('timeout'));
  vi.stubGlobal('fetch', fetchFn);
  await expect(startFeishuAuthorization()).rejects.toThrow('Cookie');
  await expect(getFeishuConnection()).rejects.toThrow('有效的日历');
  await expect(testFeishuCalendar(request)).rejects.toThrow('原请求');
  expect(fetchFn).toHaveBeenCalledTimes(4);
});

it('uses local Android execution with no configured remote service or HTTP cookie session', async () => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
  vi.mocked(requestNativeFeishu).mockResolvedValue({ status: 200, data: result });
  vi.stubGlobal('fetch', vi.fn());
  expect(await testFeishuCalendar(request)).toEqual(result);
  expect(requestNativeFeishu).toHaveBeenCalledWith('test', request);
  expect(CapacitorHttp.request).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  vi.stubEnv('VITE_FEISHU_SERVICE_URL', 'https://legacy.example');
  expect(await testFeishuCalendar(request)).toEqual(result);
  expect(CapacitorHttp.request).not.toHaveBeenCalled();
});

it('uses native HTTP with its cookie jar on other native platforms', async () => {
  vi.stubEnv('VITE_FEISHU_SERVICE_URL', 'https://connect.example');
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
  vi.mocked(CapacitorHttp.request).mockResolvedValue({ status: 200, data: result, headers: {}, url: 'https://connect.example/api/feishu/test' });
  expect(await testFeishuCalendar(request)).toEqual(result);
  expect(CapacitorHttp.request).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://connect.example/api/feishu/test', method: 'POST', data: request }));
});

it('uses the desktop main-process bridge and sends no credentials to the renderer', async () => {
  const bridge = vi.fn().mockResolvedValue({ status: 200, data: { configured: true, status: 'disconnected' } });
  vi.stubGlobal('window', { location: { protocol: 'file:' }, feishuConnection: { request: bridge } });
  vi.stubGlobal('fetch', vi.fn());
  expect((await requestFeishu('status')).status).toBe('disconnected');
  expect(bridge).toHaveBeenCalledWith('status', undefined);
  expect(fetch).not.toHaveBeenCalled();
});

it('submits explicit import batches and rejects duplicate or missing result IDs without retrying', async () => {
  const batch = { categories: [{ id: 'work', name: '工作', color: '#336699' }], records: [
    { id: 'log-1', categoryId: 'work', title: '工作', note: '', startTime: 1000, endTime: 61000 },
    { id: 'log-2', categoryId: 'work', title: '工作', note: '', startTime: 1000, endTime: 61000 }
  ], timezone: 'Asia/Shanghai', range: { startTime: 0, endTimeExclusive: 86400000 } };
  const valid = { results: [{ id: 'log-1', status: 'created' }, { id: 'log-2', status: 'skipped' }], calendars: [] };
  const fetchFn = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(valid)))
    .mockResolvedValueOnce(new Response(JSON.stringify({ ...valid, results: [valid.results[0], valid.results[0]] })))
    .mockRejectedValueOnce(new Error('timeout'));
  vi.stubGlobal('fetch', fetchFn);
  expect(await importFeishuLogs(batch)).toEqual(valid);
  expect(fetchFn.mock.calls[0][0]).toBe('/api/feishu/import');
  expect(JSON.parse(fetchFn.mock.calls[0][1].body)).toEqual(batch);
  await expect(importFeishuLogs(batch)).rejects.toThrow('未确认');
  await expect(importFeishuLogs(batch)).rejects.toThrow('稍后重试核查');
  expect(fetchFn).toHaveBeenCalledTimes(3);
});

it('reports unavailable API responses without mislabeling them as the user network failing', async () => {
  const fetchFn = vi.fn().mockResolvedValueOnce(new Response('<html>app shell</html>'))
    .mockResolvedValueOnce(new Response('', { status: 500 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ error: '飞书连接服务尚未开通。' }), { status: 503 }))
    .mockRejectedValueOnce(new Error('connection refused'));
  vi.stubGlobal('fetch', fetchFn);
  await expect(getFeishuConnection()).rejects.toThrow('服务暂不可用');
  await expect(startFeishuAuthorization()).rejects.toThrow('服务暂不可用');
  await expect(startFeishuAuthorization()).rejects.toThrow('尚未开通');
  await expect(startFeishuAuthorization()).rejects.toThrow('无法连接飞书服务');
  expect(fetchFn).toHaveBeenCalledTimes(4);
});

it('preserves uncertain import handling for malformed responses on native transports', async () => {
  vi.stubEnv('VITE_FEISHU_SERVICE_URL', 'https://connect.example');
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
  vi.mocked(requestNativeFeishu).mockResolvedValue({ status: 502, data: null });
  await expect(testFeishuCalendar(request)).rejects.toThrow('原请求');
  await expect(requestFeishu('import', {})).rejects.toThrow('稍后重试核查');
});
