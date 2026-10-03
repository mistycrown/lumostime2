/**
 * @file nativeHttp.ts
 * @input Shared execution-core requests to official Feishu HTTPS endpoints.
 * @output Fetch-compatible responses from Capacitor's native HTTP implementation.
 * @pos Android execution transport; redirects and arbitrary hosts are refused.
 */
import { CapacitorHttp } from '@capacitor/core';

export const nativeFeishuFetch: typeof fetch = async (input, init: RequestInit = {}) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash
    || !(url.origin === 'https://accounts.feishu.cn' && url.pathname.startsWith('/oauth/')
      || url.origin === 'https://open.feishu.cn' && url.pathname.startsWith('/open-apis/'))) {
    throw new Error('Invalid Feishu request origin');
  }
  const headers = Object.fromEntries(new Headers(init.headers).entries());
  const body = init.body;
  if (body !== undefined && typeof body !== 'string') throw new Error('Invalid Feishu request body');
  const response = await CapacitorHttp.request({
    url: url.href, method: init.method || 'GET', headers,
    data: typeof body === 'string' && headers['content-type']?.includes('application/json') ? JSON.parse(body) : body,
    connectTimeout: 10000, readTimeout: 15000, responseType: 'json', disableRedirects: true
  });
  // Keep malformed upstream responses malformed so the shared core reports uncertainty.
  const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data ?? null);
  return new Response([204, 205, 304].includes(response.status) ? null : content, { status: response.status });
};
