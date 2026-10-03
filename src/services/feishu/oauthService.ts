/**
 * @file oauthService.ts
 * @input Feishu application configuration, encrypted persistence and per-user sessions.
 * @output OAuth authorization, safe connection status and user-triggered calendar imports.
 * @updated 2026-10-03: Requests primary-calendar read access alongside calendar writes and reports safe permission codes.
 * @pos Shared Feishu execution core for Electron and Android; safe results only reach UI.
 * @updated 2026-10-03: Uses portable crypto and platform-owned connection persistence.
 * @updated 2026-10-03: Classifies provider calendar deletion codes for automatic recovery.
 */
import { opaqueToken, tokenHash, sha256Base64Url } from './crypto.ts';
import { CalendarTestError, calendarResourceError, FEISHU_AUTH_ERROR_CODES, FEISHU_PERMISSION_ERROR_CODES, runCalendarTest, validateTestRequest } from './calendarTest.ts';
import type { ConnectionStore, UserConnection } from './connectionStore.ts';
import { FeishuCalendarImport, validateCategory } from './calendarImport.ts';

export interface OAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
  scopes?: string;
}
const API = 'https://open.feishu.cn/open-apis';
const OAUTH_TOKEN_URL = 'https://accounts.feishu.cn/oauth/v3/token';
// calendar:calendar permits writes but is not accepted by calendars/primary.
export const FEISHU_CALENDAR_SCOPES = 'calendar:calendar calendar:calendar:readonly offline_access';

export class FeishuOAuthService {
  private config: OAuthConfig;
  protected store: ConnectionStore;
  protected fetchFn: typeof fetch;
  private refreshing = new Map<string, Promise<UserConnection>>();
  private importer: FeishuCalendarImport;

  constructor(config: OAuthConfig, store: ConnectionStore, fetchFn: typeof fetch = fetch) {
    const url = new URL(config.redirectUri);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
      throw new Error('Feishu callback must use HTTPS');
    }
    if (!config.appId || !config.appSecret || url.pathname !== '/api/feishu/callback' || url.search || url.hash || url.username || url.password) {
      throw new Error('Invalid Feishu OAuth configuration');
    }
    this.config = config;
    this.store = store;
    this.fetchFn = fetchFn;
    this.importer = new FeishuCalendarImport(store);
  }

  get secureCookies(): boolean { return new URL(this.config.redirectUri).protocol === 'https:'; }

  connect(oldToken?: string): { sessionToken: string; authorizeUrl: string } {
    if (oldToken) this.disconnect(oldToken);
    const pendingUntil = Date.now() + 10 * 60000;
    const sessionToken = this.store.create({ status: 'pending', pendingUntil });
    const verifier = opaqueToken();
    const state = this.store.addState(tokenHash(sessionToken), verifier, pendingUntil);
    const url = new URL('https://accounts.feishu.cn/open-apis/authen/v1/authorize');
    url.search = new URLSearchParams({
      client_id: this.config.appId, response_type: 'code', redirect_uri: this.config.redirectUri, prompt: 'consent',
      scope: this.config.scopes || FEISHU_CALENDAR_SCOPES, state, code_challenge_method: 'S256',
      code_challenge: sha256Base64Url(verifier)
    }).toString();
    return { sessionToken, authorizeUrl: url.href };
  }

  private async call(url: string, init: RequestInit): Promise<any> {
    let response: Response;
    try {
      response = await this.fetchFn(url, { ...init, signal: AbortSignal.timeout(15000), redirect: 'error' });
    } catch {
      throw new CalendarTestError('连接飞书失败，请稍后重试。');
    }
    const payload = await response.json().catch(() => null);
    if (response.status === 429) throw new CalendarTestError('飞书请求过于频繁，请稍后重试。', 429, true);
    if (!response.ok || !payload || (payload.code !== undefined && payload.code !== 0) || payload.error) {
      if (url.startsWith(`${API}/calendar/v4/`)) {
        const missing = calendarResourceError(url.slice(`${API}/calendar/v4/`.length), response.status, payload?.code);
        if (missing) throw missing;
      }
      const unauthorized = response.status === 401 || FEISHU_AUTH_ERROR_CODES.includes(payload?.code) || payload?.error === 'invalid_grant';
      if ([20009, 20010].includes(payload?.code)) {
        throw new CalendarTestError('当前飞书账号尚未开通 LumosTime，请在飞书申请使用或联系企业管理员。', 403, true);
      }
      if ([20002, 20048, 20069].includes(payload?.code)) {
        throw new CalendarTestError('飞书连接暂未开通，请稍后再试。', 503, true);
      }
      if (response.status === 403 || FEISHU_PERMISSION_ERROR_CODES.includes(payload?.code)) {
        const code = typeof payload?.code === 'number' ? `（飞书错误码 ${payload.code}）` : '';
        throw new CalendarTestError(`飞书日历授权范围不足${code}，请重新连接并同意日历读取与写入权限。`, 403, true);
      }
      throw new CalendarTestError(unauthorized ? '飞书授权已失效，请重新连接。' : '飞书授权或日历访问失败，请检查授权权限后重试。', unauthorized ? 401 : 502,
        response.status < 500 && Boolean(payload && (payload.error || typeof payload.code === 'number' && payload.code !== 0)));
    }
    return payload.data ?? payload;
  }

  protected async tokens(body: Record<string, string>, application?: UserConnection['application']): Promise<Pick<UserConnection, 'accessToken' | 'refreshToken' | 'accessExpiresAt' | 'refreshExpiresAt'>> {
    const data = await this.call(OAUTH_TOKEN_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: application?.id || this.config.appId, client_secret: application?.secret || this.config.appSecret, ...body })
    });
    return this.parseTokens(data);
  }

  protected parseTokens(data: any): Pick<UserConnection, 'accessToken' | 'refreshToken' | 'accessExpiresAt' | 'refreshExpiresAt'> {
    if (typeof data.access_token !== 'string' || !data.access_token || typeof data.refresh_token !== 'string' || !data.refresh_token
      || !Number.isFinite(data.expires_in) || data.expires_in <= 0 || !Number.isFinite(data.refresh_token_expires_in) || data.refresh_token_expires_in <= 0) {
      throw new CalendarTestError('飞书未返回完整授权，请确认应用已开通离线授权权限。');
    }
    return {
      accessToken: data.access_token, refreshToken: data.refresh_token,
      accessExpiresAt: Date.now() + data.expires_in * 1000,
      refreshExpiresAt: Date.now() + data.refresh_token_expires_in * 1000
    };
  }

  protected api(path: string, token: string, method = 'GET', body?: unknown): Promise<any> {
    return this.call(`${API}/${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  }

  async startConnection(oldToken?: string): Promise<{ sessionToken: string; authorizeUrl: string }> { return this.connect(oldToken); }

  async readStatus(token?: string) { return this.status(token); }

  protected async completeConnection(id: string, credentials: Pick<UserConnection, 'accessToken' | 'refreshToken' | 'accessExpiresAt' | 'refreshExpiresAt'>,
    application?: UserConnection['application']): Promise<void> {
    const token = credentials.accessToken!;
    const user = await this.api('authen/v1/user_info', token);
    if (typeof user.open_id !== 'string' || !user.open_id) throw new CalendarTestError('无法确认飞书账号，请重新授权。');
    const primary = await this.api('calendar/v4/calendars/primary', token, 'POST', {});
    const personalPrimary = primary.calendars?.[0]?.calendar;
    if (application && (typeof personalPrimary?.calendar_id !== 'string' || !personalPrimary.calendar_id || personalPrimary.role !== 'owner')) {
      throw new CalendarTestError('无法确认你的主日历，请重新授权飞书日历。', 403);
    }
    const calendars: { id: string; name: string }[] = [];
    const add = (calendar: any) => {
      if (typeof calendar?.calendar_id === 'string' && ['owner', 'writer'].includes(calendar.role)
        && !calendars.some((item) => item.id === calendar.calendar_id)) calendars.push({ id: calendar.calendar_id, name: String(calendar.summary || '飞书日历') });
    };
    add(primary.calendars?.[0]?.calendar);
    let pageToken = '';
    for (let page = 0; page < 100; page++) {
      const list = await this.api(`calendar/v4/calendars?page_size=100${pageToken ? `&page_token=${encodeURIComponent(pageToken)}` : ''}`, token);
      (list.calendar_list ?? []).forEach(add);
      if (!list.has_more) break;
      if (!list.page_token || list.page_token === pageToken || page === 99) throw new CalendarTestError('飞书日历列表无效，请重新连接。');
      pageToken = list.page_token;
    }
    if (!calendars.length) throw new CalendarTestError('当前账号没有可写入的日历，请检查飞书授权权限。', 403);
    if (!this.store.save(id, { status: 'connected', ...credentials, application, calendars, calendarId: calendars[0].id,
      userName: String(user.name || '飞书用户'), accountId: application
        ? tokenHash(`feishu-primary:${personalPrimary.calendar_id}`) : tokenHash(`${user.tenant_key || ''}:${user.open_id}`) })) {
      throw new CalendarTestError('连接已取消，请返回应用重新连接。', 400);
    }
  }

  async callback(params: URLSearchParams): Promise<void> {
    const state = params.get('state');
    const claim = state && state.length <= 128 ? this.store.claimState(state) : null;
    if (!claim || !this.store.get(claim.session)) throw new CalendarTestError('授权请求已过期或已取消，请返回应用重新连接。', 400);
    try {
      const code = params.get('code');
      if (params.has('error') || !code || code.length > 4096) throw new CalendarTestError('飞书授权未完成，请返回应用重新连接。', 400);
      const credentials = await this.tokens({ grant_type: 'authorization_code', code, redirect_uri: this.config.redirectUri, code_verifier: claim.verifier });
      const token = credentials.accessToken!;
      const user = await this.api('authen/v1/user_info', token);
      if (typeof user.open_id !== 'string' || !user.open_id) throw new CalendarTestError('无法确认飞书账号，请重新授权。');
      const primary = await this.api('calendar/v4/calendars/primary', token, 'POST', {});
      const primaryCalendar = primary.calendars?.[0]?.calendar;
      const calendars: { id: string; name: string }[] = [];
      const add = (calendar: any) => {
        if (typeof calendar?.calendar_id === 'string' && ['owner', 'writer'].includes(calendar.role)
          && !calendars.some((item) => item.id === calendar.calendar_id)) {
          calendars.push({ id: calendar.calendar_id, name: String(calendar.summary || '飞书日历') });
        }
      };
      add(primaryCalendar);
      let pageToken = '';
      for (let page = 0; page < 100; page++) {
        const list = await this.api(`calendar/v4/calendars?page_size=100${pageToken ? `&page_token=${encodeURIComponent(pageToken)}` : ''}`, token);
        (list.calendar_list ?? []).forEach(add);
        if (!list.has_more) break;
        if (!list.page_token || list.page_token === pageToken) throw new CalendarTestError('飞书日历列表无效，请重新连接。');
        pageToken = list.page_token;
        if (page === 99) throw new CalendarTestError('日历数量过多，请联系服务维护者。');
      }
      if (!calendars.length) throw new CalendarTestError('当前账号没有可写入的日历，请检查飞书授权权限。', 403);
      if (!this.store.save(claim.session, {
        status: 'connected', ...credentials, calendars, calendarId: calendars[0].id,
        userName: String(user.name || '飞书用户'), accountId: tokenHash(`${user.tenant_key || ''}:${user.open_id}`)
      })) throw new CalendarTestError('连接已取消，请返回应用重新连接。', 400);
    } catch (error) {
      const failure = error instanceof CalendarTestError ? error : new CalendarTestError('飞书连接失败，请返回应用重试。');
      this.store.save(claim.session, { status: 'error', error: failure.message });
      throw failure;
    }
  }

  status(token?: string) {
    const connection = token ? this.store.get(tokenHash(token)) : null;
    if (!connection) return { configured: true, status: 'disconnected' as const };
    if (connection.status === 'pending' && (connection.pendingUntil || 0) < Date.now()) {
      connection.status = 'error';
      connection.error = '授权等待已超时，请重新连接。';
      this.store.save(tokenHash(token!), connection);
    }
    if (connection.status === 'connected' && (connection.refreshExpiresAt || 0) < Date.now()) {
      this.store.save(tokenHash(token!), { status: 'expired', error: '飞书授权已到期，请重新连接。', application: connection.application });
      return { configured: true, status: 'expired' as const, error: '飞书授权已到期，请重新连接。' };
    }
    return {
      configured: true, status: connection.status, error: connection.error,
      accountId: connection.accountId, userName: connection.userName,
      calendars: connection.calendars, calendarId: connection.calendarId,
      categoryCalendars: connection.accountId ? this.importer.mappings(connection.accountId) : []
    };
  }

  private async authenticated(token?: string): Promise<UserConnection> {
    if (!token) throw new CalendarTestError('请先连接并授权飞书账号。', 401);
    const id = tokenHash(token);
    const connection = this.store.get(id);
    if (connection?.status !== 'connected' || !connection.accessToken || !connection.refreshToken) {
      throw new CalendarTestError('请先连接并授权飞书账号。', 401);
    }
    if ((connection.accessExpiresAt || 0) > Date.now() + 60000) return connection;
    const existing = this.refreshing.get(id);
    if (existing) return existing;
    const operation = (async () => {
      try {
        if ((connection.refreshExpiresAt || 0) <= Date.now()) throw new CalendarTestError('飞书授权已到期，请重新连接。', 401);
        const credentials = await this.tokens({ grant_type: 'refresh_token', refresh_token: connection.refreshToken! }, connection.application);
        const updated = { ...connection, ...credentials };
        // A disconnect while refreshing must never recreate credentials.
        if (!this.store.save(id, updated)) throw new CalendarTestError('连接已取消，请重新连接。', 401);
        return updated;
      } catch (error) {
        if (error instanceof CalendarTestError && error.status === 401) {
          this.store.save(id, { status: 'expired', error: error.message, application: connection.application });
        }
        throw error;
      }
    })();
    this.refreshing.set(id, operation);
    try { return await operation; } finally { this.refreshing.delete(id); }
  }

  async selectCalendar(token: string | undefined, calendarId: unknown): Promise<void> {
    const connection = await this.authenticated(token);
    if (typeof calendarId !== 'string' || !connection.calendars?.some((item) => item.id === calendarId)) {
      throw new CalendarTestError('请选择已授权的日历。', 400);
    }
    let data: any;
    try {
      data = await this.api(`calendar/v4/calendars/${encodeURIComponent(calendarId)}`, connection.accessToken!);
    } catch (error) {
      if (error instanceof CalendarTestError && error.status === 401) {
        this.store.save(tokenHash(token!), { status: 'expired', error: error.message, application: connection.application });
      }
      throw error;
    }
    if (!['owner', 'writer'].includes((data.calendar ?? data)?.role)) throw new CalendarTestError('没有该日历的写入权限。', 403);
    // Read again so a concurrent refresh/selection cannot restore stale credentials.
    const latest = this.store.get(tokenHash(token!));
    if (latest?.status !== 'connected') throw new CalendarTestError('连接已取消。', 401);
    latest.calendarId = calendarId;
    this.store.save(tokenHash(token!), latest);
  }

  async test(token: string | undefined, body: unknown) {
    const request = validateTestRequest(body);
    const connection = await this.authenticated(token);
    if (!connection.calendarId) throw new CalendarTestError('请先选择目标日历。', 400);
    try {
      const category = (body as { category?: unknown })?.category;
      const calendarId = category ? (await this.importer.prepare(connection.accountId!, validateCategory(category),
        (path, method = 'GET', data) => this.api(`calendar/v4/${path}`, connection.accessToken!, method, data))).id : connection.calendarId;
      return await runCalendarTest(request, { userAccessToken: connection.accessToken, calendarId }, this.fetchFn);
    } catch (error) {
      if (error instanceof CalendarTestError && error.status === 401) {
        this.store.save(tokenHash(token!), { status: 'expired', error: error.message, application: connection.application });
      }
      throw error;
    }
  }

  disconnect(token?: string): void { if (token) this.store.delete(tokenHash(token)); }

  async importLogs(token: string | undefined, body: unknown) {
    const connection = await this.authenticated(token);
    try {
      return await this.importer.run(connection.accountId!, body, async (path, method = 'GET', data) => {
        const current = await this.authenticated(token);
        return this.api(`calendar/v4/${path}`, current.accessToken!, method, data);
      });
    } catch (error) {
      if (error instanceof CalendarTestError && error.status === 401) this.store.save(tokenHash(token!), { status: 'expired', error: error.message, application: connection.application });
      throw error;
    }
  }
}
