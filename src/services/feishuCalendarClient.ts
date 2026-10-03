/**
 * @file feishuCalendarClient.ts
 * @input Build-time service address and cookie-bound user connection.
 * @output OAuth status, category calendars, test events and manual Log batch import results.
 * @pos App integration client; Feishu tokens stay exclusively on the server.
 * @updated 2026-10-02: Distinguishes unavailable API responses from transport failures without asking users to configure services.
 */
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import type { FeishuImportBatch } from '../utils/feishuLogImport';

export interface FeishuTestRequest { requestId: string; startTime: number; timezone: string; category?: FeishuImportBatch['categories'][number] }
export interface FeishuTestResult {
  calendarId: string;
  calendarName: string;
  eventId: string;
  startTime: number;
  endTime: number;
  timezone: string;
}
export interface FeishuConnectionStatus {
  configured: boolean;
  status: 'disconnected' | 'pending' | 'connected' | 'error' | 'expired';
  error?: string;
  accountId?: string;
  userName?: string;
  calendars?: { id: string; name: string }[];
  calendarId?: string;
  categoryCalendars?: { categoryId: string; categoryName: string; id: string; name: string; color: string }[];
}
export type FeishuAction = 'status' | 'connect' | 'calendar' | 'test' | 'import' | 'disconnect';

export function getFeishuServiceEndpoint(action: FeishuAction): string {
  const root = (import.meta.env.VITE_FEISHU_SERVICE_URL || '').trim();
  if (!root) {
    if (Capacitor.isNativePlatform() || window.location.protocol === 'file:') {
      throw new Error('飞书连接服务尚未开通，请稍后再试。');
    }
    return `/api/feishu/${action}`;
  }
  let url: URL;
  try { url = new URL(root); } catch { throw new Error('飞书连接服务配置无效，请联系服务维护者。'); }
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
    || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('飞书连接服务配置无效，请联系服务维护者。');
  }
  return `${url.origin}/api/feishu/${action}`;
}

export async function requestFeishu(action: FeishuAction, body?: unknown): Promise<any> {
  const method = action === 'status' ? 'GET' : 'POST';
  let status: number;
  let data: any;
  try {
    if (window.feishuConnection) {
      const response = await window.feishuConnection.request(action, body);
      status = response.status;
      data = response.data;
    } else {
      const url = getFeishuServiceEndpoint(action);
      const headers = { 'Content-Type': 'application/json', 'X-Lumos-Feishu-Client': '1' };
      if (Capacitor.isNativePlatform()) {
        // Native HTTP owns the HttpOnly cookie jar; never read cookies into JavaScript.
        const response = await CapacitorHttp.request({
          url, method, headers, data: method === 'GET' ? undefined : body ?? {},
          connectTimeout: 10000, readTimeout: 40000, responseType: 'json'
        });
        status = response.status;
        if (typeof response.data === 'string') {
          try { data = JSON.parse(response.data); } catch { data = null; }
        } else data = response.data;
      } else {
        const response = await fetch(url, {
          method, headers, credentials: 'include', redirect: 'error',
          body: method === 'GET' ? undefined : JSON.stringify(body ?? {}), signal: AbortSignal.timeout(40000)
        });
        status = response.status;
        data = await response.json().catch(() => null);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('飞书连接服务')) throw error;
    throw new Error(action === 'test'
      ? '无法确认测试导入结果，请检查网络后重试；将复用原请求编号。'
      : action === 'import' ? '无法确认导入结果，请稍后重试核查；已导入记录会保留。'
      : '无法连接飞书服务，请稍后再试。');
  }
  if (!data || typeof data !== 'object') {
    throw new Error(action === 'test' ? '无法确认测试导入结果，请稍后使用原请求重试。'
      : action === 'import' ? '无法确认导入结果，请稍后重试核查；已导入记录会保留。'
      : '飞书连接服务暂不可用，请稍后再试。');
  }
  if (status < 200 || status >= 300) throw new Error(typeof data?.error === 'string' ? data.error : '飞书连接服务暂时不可用。');
  return data;
}

export async function getFeishuConnection(): Promise<FeishuConnectionStatus> {
  const data = await requestFeishu('status');
  if (typeof data?.configured !== 'boolean' || !['disconnected', 'pending', 'connected', 'error', 'expired'].includes(data.status)) {
    throw new Error('飞书服务未返回有效的连接状态。');
  }
  if (data.status === 'connected' && (typeof data.accountId !== 'string' || typeof data.calendarId !== 'string'
    || !Array.isArray(data.calendars) || !data.calendars.some((item: any) => item?.id === data.calendarId)
    || data.calendars.some((item: any) => !item || typeof item.id !== 'string' || typeof item.name !== 'string'))) {
    throw new Error('飞书服务未返回有效的日历。');
  }
  if (data.categoryCalendars !== undefined && (!Array.isArray(data.categoryCalendars)
    || data.categoryCalendars.some((item: any) => !item || typeof item.categoryId !== 'string' || typeof item.id !== 'string' || typeof item.name !== 'string'))) {
    throw new Error('飞书服务未返回有效的分类日历。');
  }
  return data;
}

export async function startFeishuAuthorization(): Promise<string> {
  const data = await requestFeishu('connect');
  const url = new URL(data.authorizeUrl);
  if (url.origin !== 'https://accounts.feishu.cn' || url.pathname !== '/open-apis/authen/v1/authorize' || url.username || url.password) {
    throw new Error('飞书服务未返回有效的授权地址。');
  }
  if ((await getFeishuConnection()).status !== 'pending') {
    throw new Error('无法保存连接会话，请允许此站点的 Cookie 后重新连接。');
  }
  return url.href;
}

export async function testFeishuCalendar(request: FeishuTestRequest): Promise<FeishuTestResult> {
  const data = await requestFeishu('test', request);
  if (typeof data?.calendarId !== 'string' || !data.calendarId || typeof data.eventId !== 'string' || !data.eventId
    || typeof data.calendarName !== 'string' || data.timezone !== request.timezone
    || !Number.isFinite(data.startTime) || !Number.isFinite(data.endTime) || data.endTime <= data.startTime) {
    throw new Error('服务端未返回有效的测试块；请使用原请求重试。');
  }
  return data;
}

export interface FeishuImportResult {
  results: { id: string; status: 'created' | 'skipped' | 'failed'; error?: string }[];
  calendars: NonNullable<FeishuConnectionStatus['categoryCalendars']>;
}

export async function importFeishuLogs(batch: FeishuImportBatch): Promise<FeishuImportResult> {
  const data = await requestFeishu('import', batch);
  const expected = new Set(batch.records.map((record) => record.id));
  if (!Array.isArray(data?.results) || data.results.length !== batch.records.length || !Array.isArray(data.calendars)
    || data.results.some((item: any) => !item || !expected.delete(item.id) || !['created', 'skipped', 'failed'].includes(item.status))) {
    throw new Error('导入结果未确认，请稍后重试核查。');
  }
  return data;
}
