/**
 * @file personalService.ts
 * @input User-confirmed application registration and device authorization from Feishu.
 * @output Per-user private applications, encrypted credentials and existing calendar imports.
 * @updated 2026-10-03: Includes read access required by the primary-calendar endpoint.
 * @pos Personal connection executor; no shared application or OAuth callback is needed.
 */
import { FEISHU_CALENDAR_SCOPES, FeishuOAuthService } from './oauthService.ts';
import { OAuthStore, tokenHash, type UserConnection } from './oauthStore.ts';
import { CalendarTestError } from './calendarTest.ts';

const ACCOUNTS = 'https://accounts.feishu.cn';
const REGISTER = `${ACCOUNTS}/oauth/v1/app/registration`;
const DEVICE = `${ACCOUNTS}/oauth/v1/device_authorization`;
const TOKEN = `${ACCOUNTS}/oauth/v3/token`;

export function validatePersonalAuthorizationUrl(value: unknown): string {
  if (typeof value !== 'string') throw new CalendarTestError('飞书未返回有效的确认网页。');
  const url = new URL(value);
  if (url.username || url.password || !(url.origin === 'https://open.feishu.cn' && ['/page/launcher', '/page/cli'].includes(url.pathname)
    || url.origin === ACCOUNTS && (url.pathname.startsWith('/oauth/') || url.pathname === '/open-apis/authen/v1/authorize'))) {
    throw new CalendarTestError('飞书未返回有效的确认网页。');
  }
  return url.href;
}

export class PersonalFeishuService extends FeishuOAuthService {
  private advancing = new Map<string, Promise<void>>();

  constructor(store: OAuthStore, publicOrigin = 'http://localhost:3003', fetchFn: typeof fetch = fetch) {
    super({ appId: 'personal-device-flow', appSecret: 'unused', redirectUri: `${publicOrigin}/api/feishu/callback` }, store, fetchFn);
  }

  private async provider(url: string, fields: Record<string, string>, basic?: UserConnection['application']): Promise<any> {
    let response: Response;
    try {
      response = await this.fetchFn(url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(basic ? { Authorization: `Basic ${Buffer.from(`${basic.id}:${basic.secret}`).toString('base64')}` } : {}) },
        body: new URLSearchParams(fields).toString() });
    } catch { throw new CalendarTestError('暂时无法连接飞书，请稍后重试。'); }
    const data = await response.json().catch(() => null);
    if (response.status === 429) throw new CalendarTestError('飞书请求过于频繁，请稍后再试。', 429);
    if (!data || response.status >= 500 || !response.ok && !data.error && !data.code) throw new CalendarTestError('飞书确认服务暂不可用，请稍后重试。');
    return data.data ?? data;
  }

  private device(data: any, stage: 'create' | 'authorize'): NonNullable<UserConnection['device']> {
    if (typeof data.device_code !== 'string' || !data.device_code || typeof data.user_code !== 'string') {
      throw new CalendarTestError('飞书未能发起确认，请重新连接。');
    }
    const url = validatePersonalAuthorizationUrl(data.verification_uri_complete);
    const interval = Math.min(60, Math.max(5, Number(data.interval) || 5)) * 1000;
    const expiry = Math.min(3600, Math.max(60, Number(data.expires_in ?? data.expire_in) || 600)) * 1000;
    return { code: data.device_code, stage, url, expires: Date.now() + expiry, nextPoll: Date.now() + interval, interval };
  }

  private async authorize(application: NonNullable<UserConnection['application']>) {
    return this.device(await this.provider(DEVICE, { client_id: application.id, scope: FEISHU_CALENDAR_SCOPES }, application), 'authorize');
  }

  override async startConnection(oldToken?: string) {
    const old = oldToken ? this.store.get(tokenHash(oldToken)) : null;
    // Keep the user's existing app when reauthorizing an expired connection.
    const application = old?.application;
    const device = application ? await this.authorize(application) : this.device(await this.provider(REGISTER, {
      action: 'begin', archetype: 'PersonalAgent', auth_method: 'client_secret', request_user_info: 'open_id tenant_brand'
    }), 'create');
    const sessionToken = this.store.create({ status: 'pending', pendingUntil: device.expires, application, device });
    if (oldToken) this.disconnect(oldToken);
    return { sessionToken, authorizeUrl: device.url };
  }

  private async advance(id: string): Promise<void> {
    const connection = this.store.get(id);
    const device = connection?.device;
    if (connection?.status !== 'pending' || !device) return;
    if (device.expires <= Date.now()) {
      this.store.save(id, { status: 'error', error: '飞书确认已超时，请重新连接。', application: connection.application });
      return;
    }
    if (connection.accessToken && connection.refreshToken) {
      await this.finish(id, connection);
      return;
    }
    if (device.nextPoll > Date.now()) return;
    device.nextPoll = Date.now() + device.interval;
    this.store.save(id, connection);
    const application = connection.application;
    if (device.stage === 'create' && application) {
      const next = await this.authorize(application);
      if (this.store.get(id)?.device?.code !== device.code) return;
      this.store.save(id, { ...connection, device: next, pendingUntil: next.expires });
      return;
    }
    const data = device.stage === 'create'
      ? await this.provider(REGISTER, { action: 'poll', device_code: device.code })
      : await this.provider(TOKEN, { grant_type: 'urn:ietf:params:oauth:grant-type:device_code', device_code: device.code,
        client_id: application!.id, client_secret: application!.secret });
    // A cancelled/replaced session must never be restored by a late provider reply.
    if (this.store.get(id)?.device?.code !== device.code) return;
    if (data.error === 'authorization_pending') return;
    if (data.error === 'slow_down') {
      device.interval = Math.min(60000, device.interval + 5000);
      device.nextPoll = Date.now() + device.interval;
      this.store.save(id, connection);
      return;
    }
    if (data.error || data.code && data.code !== 0) {
      this.store.save(id, { status: 'error', application, error: data.error === 'access_denied'
        ? '你已取消飞书确认，可以重新连接。' : '飞书确认未完成，请重新连接并同意日历授权。' });
      return;
    }
    if (device.stage === 'create') {
      if (typeof data.client_id !== 'string' || !data.client_id || typeof data.client_secret !== 'string' || !data.client_secret) return;
      if (data.user_info?.tenant_brand && data.user_info.tenant_brand !== 'feishu') {
        this.store.save(id, { status: 'error', error: '请选择飞书账号，目前不支持 Lark 国际版。' }); return;
      }
      connection.application = { id: data.client_id, secret: data.client_secret };
      // Persist the new application before requesting authorization, so retry never creates another app.
      this.store.save(id, connection);
      connection.device = await this.authorize(connection.application);
      connection.pendingUntil = connection.device.expires;
      this.store.save(id, connection);
    } else {
      if (!data.access_token) return;
      const authorized = { ...connection, ...this.parseTokens(data) };
      if (!this.store.save(id, authorized)) return;
      await this.finish(id, authorized);
    }
  }

  private async finish(id: string, connection: UserConnection) {
    try {
      await this.completeConnection(id, { accessToken: connection.accessToken, refreshToken: connection.refreshToken,
        accessExpiresAt: connection.accessExpiresAt, refreshExpiresAt: connection.refreshExpiresAt }, connection.application);
    } catch (error) {
      if (error instanceof CalendarTestError && [400, 401, 403].includes(error.status)) {
        this.store.save(id, { status: 'error', application: connection.application, error: error.message });
      }
      throw error;
    }
  }

  override async readStatus(token?: string) {
    if (token) {
      const id = tokenHash(token);
      let operation = this.advancing.get(id);
      if (!operation) {
        operation = this.advance(id);
        this.advancing.set(id, operation);
      }
      try { await operation; } finally { if (this.advancing.get(id) === operation) this.advancing.delete(id); }
    }
    return this.status(token);
  }

  override status(token?: string) {
    const result = super.status(token);
    const connection = token ? this.store.get(tokenHash(token)) : null;
    return { ...result, connectionMode: 'personal' as const, applicationId: connection?.application?.id,
      phase: connection?.status === 'pending' ? connection.device?.stage : undefined,
      authorizationUrl: connection?.status === 'pending' ? connection.device?.url : undefined };
  }
}
