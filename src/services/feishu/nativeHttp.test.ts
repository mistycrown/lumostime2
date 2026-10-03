/**
 * @file nativeHttp.test.ts
 * @input Feishu JSON/form requests and mocked Capacitor HTTP responses.
 * @output Checks for faithful body encoding, official origins, redirect refusal and malformed response handling.
 * @pos Android Feishu transport regression tests.
 */
import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('@capacitor/core', () => ({ CapacitorHttp: { request: vi.fn() } }));
import { CapacitorHttp } from '@capacitor/core';
import { nativeFeishuFetch } from './nativeHttp';
beforeEach(() => vi.clearAllMocks());

it('sends form and JSON bodies through native HTTP with redirects disabled', async () => {
  vi.mocked(CapacitorHttp.request).mockResolvedValue({ status: 200, data: { code: 0 }, headers: {}, url: 'https://accounts.feishu.cn/oauth/v3/token' });
  const form = 'client_id=app&device_code=secret%2Bcode';
  expect(await (await nativeFeishuFetch('https://accounts.feishu.cn/oauth/v1/device_authorization', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic fixture' }, body: form
  })).json()).toEqual({ code: 0 });
  expect(CapacitorHttp.request).toHaveBeenCalledWith(expect.objectContaining({
    data: form, disableRedirects: true, headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: 'Basic fixture' }
  }));
  await nativeFeishuFetch('https://open.feishu.cn/open-apis/calendar/v4/calendars', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ summary: '工作' })
  });
  expect(CapacitorHttp.request).toHaveBeenLastCalledWith(expect.objectContaining({ data: { summary: '工作' }, disableRedirects: true }));
});

it('rejects arbitrary origins before HTTP and preserves upstream errors and malformed JSON', async () => {
  for (const url of ['http://accounts.feishu.cn/oauth/v3/token', 'https://evil.example/open-apis/calendar',
    'https://accounts.feishu.cn.evil.example/oauth/v3/token', 'https://secret@accounts.feishu.cn/oauth/v3/token',
    'https://open.feishu.cn/page/launcher']) {
    await expect(nativeFeishuFetch(url)).rejects.toThrow('origin');
  }
  expect(CapacitorHttp.request).not.toHaveBeenCalled();
  vi.mocked(CapacitorHttp.request).mockResolvedValue({ status: 429, data: '<html>upstream</html>', headers: {}, url: '' });
  const response = await nativeFeishuFetch('https://open.feishu.cn/open-apis/calendar/v4/calendars');
  expect(response.status).toBe(429);
  await expect(response.json()).rejects.toThrow();
});
