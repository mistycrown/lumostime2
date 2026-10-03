/**
 * @file feishuCalendarClient.ts
 * @updated 2026-10-03: Coordinates manual/automatic mutations and exposes typed transport failures for safe retry scheduling.
 * @input Desktop/Android local execution or a cookie-bound Web connection service.
 * @output OAuth status, category calendars, test events and manual Log batch import results.
 * @pos App integration client; Feishu credentials never enter UI responses.
 * @updated 2026-10-03: Accepts private-app creation and device consent pages without exposing application credentials.
 * @updated 2026-10-03: Reads complete sync catalogs and validates explicit update, move and deletion results.
 * @updated 2026-10-03: Requires source-category metadata before planning filtered synchronization.
 * @updated 2026-10-03: Uses local personal authorization on Android without a remote service address.
 */
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import type { FeishuImportBatch } from '../utils/feishuLogImport';
import type { FeishuImportedReference } from '../utils/feishuSyncPlan';
import { withFeishuLock } from './feishuSyncLock';

export class FeishuClientError extends Error {
  constructor(message: string, public status = 0) { super(message); this.name = 'FeishuClientError'; }
}
let lastConnectionIdentity = '';

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
  connectionMode?: 'personal';
  phase?: 'create' | 'authorize';
  authorizationUrl?: string;
  applicationId?: string;
  categoryCalendars?: { categoryId: string; categoryName: string; id: string; name: string; color: string }[];
}

export function validateFeishuAuthorizationUrl(value: unknown): string {
  if (typeof value !== 'string') throw new Error('飞书服务未返回有效的授权地址。');
  const url = new URL(value);
  const personalPage = url.origin === 'https://open.feishu.cn' && ['/page/launcher', '/page/cli'].includes(url.pathname);
  const authorization = url.origin === 'https://accounts.feishu.cn'
    && (url.pathname === '/open-apis/authen/v1/authorize' || url.pathname.startsWith('/oauth/'));
  if ((!personalPage && !authorization) || url.username || url.password) throw new Error('飞书服务未返回有效的授权地址。');
  return url.href;
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

async function requestFeishuUnlocked(action: FeishuAction, body?: unknown): Promise<any> {
  const method = action === 'status' ? 'GET' : 'POST';
  let status: number;
  let data: any;
  try {
    if (window.feishuConnection) {
      const response = await window.feishuConnection.request(action, body);
      status = response.status;
      data = response.data;
    } else if (Capacitor.getPlatform() === 'android') {
      const { requestNativeFeishu } = await import('./feishuNativeConnection');
      const response = await requestNativeFeishu(action, body);
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
    throw new FeishuClientError(action === 'test'
      ? '无法确认测试导入结果，请检查网络后重试；将复用原请求编号。'
      : action === 'import' ? '无法确认导入结果，请稍后重试核查；已导入记录会保留。'
      : '无法连接飞书服务，请稍后再试。');
  }
  if (!data || typeof data !== 'object') {
    throw new FeishuClientError(action === 'test' ? '无法确认测试导入结果，请稍后使用原请求重试。'
      : action === 'import' ? '无法确认导入结果，请稍后重试核查；已导入记录会保留。'
      : '飞书连接服务暂不可用，请稍后再试。');
  }
  if (status < 200 || status >= 300) throw new FeishuClientError(typeof data?.error === 'string' ? data.error : '飞书连接服务暂时不可用。', status);
  return data;
}

export function requestFeishu(action: FeishuAction, body?: unknown): Promise<any> {
  return withFeishuLock('calendar', () => requestFeishuUnlocked(action, body));
}

export async function getFeishuConnection(request = requestFeishu): Promise<FeishuConnectionStatus> {
  const data = await request('status');
  if (typeof data?.configured !== 'boolean' || !['disconnected', 'pending', 'connected', 'error', 'expired'].includes(data.status)) {
    throw new Error('飞书服务未返回有效的连接状态。');
  }
  if (data.authorizationUrl !== undefined) validateFeishuAuthorizationUrl(data.authorizationUrl);
  if (data.phase !== undefined && !['create', 'authorize'].includes(data.phase)) throw new Error('飞书服务未返回有效的连接阶段。');
  if (data.status === 'connected' && (typeof data.accountId !== 'string' || typeof data.calendarId !== 'string'
    || !Array.isArray(data.calendars) || !data.calendars.some((item: any) => item?.id === data.calendarId)
    || data.calendars.some((item: any) => !item || typeof item.id !== 'string' || typeof item.name !== 'string'))) {
    throw new Error('飞书服务未返回有效的日历。');
  }
  if (data.categoryCalendars !== undefined && (!Array.isArray(data.categoryCalendars)
    || data.categoryCalendars.some((item: any) => !item || typeof item.categoryId !== 'string' || typeof item.id !== 'string' || typeof item.name !== 'string'))) {
    throw new Error('飞书服务未返回有效的分类日历。');
  }
  const identity = `${data.status}:${data.accountId || ''}`;
  if (identity !== lastConnectionIdentity) {
    lastConnectionIdentity = identity;
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event('lumostime:feishu-connection-changed'));
  }
  return data;
}

export async function startFeishuAuthorization(): Promise<string> {
  const data = await requestFeishu('connect');
  const url = validateFeishuAuthorizationUrl(data.authorizeUrl);
  if ((await getFeishuConnection()).status !== 'pending') {
    throw new Error(Capacitor.getPlatform() === 'android' || window.feishuConnection
      ? '无法保存飞书本机连接，请检查系统安全存储后重新连接。'
      : '无法保存连接会话，请允许此站点的 Cookie 后重新连接。');
  }
  return url;
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
  results: { id: string; status: 'created' | 'updated' | 'moved' | 'deleted' | 'skipped' | 'failed'; error?: string }[];
  calendars: NonNullable<FeishuConnectionStatus['categoryCalendars']>;
}

export async function importFeishuLogs(batch: FeishuImportBatch, request = requestFeishu): Promise<FeishuImportResult> {
  const data = await request('import', batch);
  const expected = new Set([...batch.records.map((record) => record.id), ...(batch.deleteIds || [])]);
  const deletes = new Set(batch.deleteIds || []);
  if (expected.size !== batch.records.length + (batch.deleteIds?.length || 0)
    || !Array.isArray(data?.results) || data.results.length !== expected.size || !Array.isArray(data.calendars)
    || data.results.some((item: any) => !item || !expected.delete(item.id)
      || !(batch.sync ? deletes.has(item.id) ? ['deleted', 'failed'] : ['created', 'updated', 'moved', 'skipped', 'failed']
        : ['created', 'skipped', 'failed']).includes(item.status))) {
    throw new Error('导入结果未确认，请稍后重试核查。');
  }
  return data;
}

export async function getFeishuImportedLogs(range: FeishuImportBatch['range'], request = requestFeishu): Promise<FeishuImportedReference[]> {
  const records: FeishuImportedReference[] = [];
  const seen = new Set<string>();
  let after: string | undefined;
  for (let page = 0; page < 1000; page++) {
    const data = await request('import', { operation: 'catalog', range, ...(after ? { after } : {}) });
    if (!Array.isArray(data?.records) || data.records.length > 200 || data.records.some((record: any) => {
      if (!record || typeof record.id !== 'string' || !/^[\w-]{1,128}$/.test(record.id)
        || !Number.isSafeInteger(record.startTime) || seen.has(record.id)
        || !Array.isArray(record.categoryIds) || !record.categoryIds.length
        || record.categoryIds.some((id: unknown) => typeof id !== 'string' || !/^[\w-]{1,128}$/.test(id))
        || new Set(record.categoryIds).size !== record.categoryIds.length) return true;
      seen.add(record.id); return false;
    }) || data.after !== undefined && (typeof data.after !== 'string' || !/^[\w-]{1,128}$/.test(data.after)
      || !data.records.length || data.after !== data.records.at(-1).id || after && data.after <= after)) {
      throw new Error('已同步记录清单不完整，已停止同步。');
    }
    records.push(...data.records);
    if (data.after === undefined) return records;
    after = data.after;
  }
  throw new Error('已同步记录过多，已停止同步。');
}

export interface FeishuCalendarSession {
  connection(): Promise<FeishuConnectionStatus>;
  catalog(range: FeishuImportBatch['range']): Promise<FeishuImportedReference[]>;
  sync(batch: FeishuImportBatch): Promise<FeishuImportResult>;
}
export function withFeishuCalendarSession<T>(run: (session: FeishuCalendarSession) => Promise<T>): Promise<T> {
  return withFeishuLock('calendar', () => run({
    connection: () => getFeishuConnection(requestFeishuUnlocked),
    catalog: (range) => getFeishuImportedLogs(range, requestFeishuUnlocked),
    sync: (batch) => importFeishuLogs(batch, requestFeishuUnlocked)
  }));
}
