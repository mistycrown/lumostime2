/**
 * @file httpApi.ts
 * @input HTTP requests, trusted app origins and the configured OAuth service.
 * @output Cookie-bound authorization/session APIs and a token-free callback page.
 * @pos Unified service HTTP boundary.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { CalendarTestError } from './calendarTest.ts';
import { FeishuOAuthService } from './oauthService.ts';
import { SESSION_MAX_AGE } from './oauthStore.ts';

const COOKIE = 'lumos_feishu_session';

async function readBody(req: IncomingMessage, maximum = 4096): Promise<any> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maximum) throw new CalendarTestError('请求内容过大。', 413);
    chunks.push(buffer);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { throw new CalendarTestError('请求格式无效。', 400); }
}

export function createFeishuHandler(service: FeishuOAuthService | null, allowedOrigins: string[]) {
  // Only authorization starts are rate limited here. The production ingress also needs a global limit.
  const starts = new Map<string, { count: number; until: number }>();
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = new URL(req.url || '/', 'http://localhost');
    const action = url.pathname.replace('/api/feishu/', '');
    const callback = action === 'callback';
    const origin = req.headers.origin;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const json = (status: number, data: unknown) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(data));
    };
    const sessionToken = req.headers.cookie?.split(';').map((part) => part.trim())
      .find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    const token = sessionToken && /^[A-Za-z0-9_-]{43}$/.test(sessionToken) ? sessionToken : undefined;
    const setCookie = (value: string, clear = false) => {
      res.setHeader('Set-Cookie', `${COOKIE}=${value}; HttpOnly; Path=/api/feishu; Max-Age=${clear ? 0 : SESSION_MAX_AGE}; ${service?.secureCookies ? 'Secure; SameSite=None' : 'SameSite=Lax'}`);
    };
    if (!callback && origin) {
      if (origin === 'null' || !allowedOrigins.includes(origin)) { json(403, { error: '此应用来源未获允许。' }); return; }
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS' && !callback) {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Lumos-Feishu-Client');
      res.statusCode = 204;
      res.end();
      return;
    }
    const expected = ['status', 'callback'].includes(action) ? 'GET' : 'POST';
    if (!['status', 'connect', 'callback', 'calendar', 'test', 'import', 'disconnect'].includes(action)) { json(404, { error: '接口不存在。' }); return; }
    if (req.method !== expected) { res.setHeader('Allow', expected); json(405, { error: '请求方法无效。' }); return; }
    if (expected === 'POST' && (req.headers['x-lumos-feishu-client'] !== '1' || !req.headers['content-type']?.startsWith('application/json'))) {
      json(403, { error: '请从 LumosTime 发起连接操作。' }); return;
    }
    if (!service) {
      json(action === 'status' ? 200 : 503, action === 'status'
        ? { configured: false, status: 'disconnected', error: '飞书连接服务尚未开通，请联系 LumosTime 服务维护者。' }
        : { error: '飞书连接服务尚未开通。' });
      return;
    }
    try {
      if (callback) {
        let success = false;
        try { await service.callback(url.searchParams); success = true; } catch { /* Details are delivered to the originating app session. */ }
        res.statusCode = success ? 200 : 400;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
        res.end(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LumosTime 飞书授权</title><h1>${success ? '飞书连接成功' : '飞书连接未完成'}</h1><p>请返回 LumosTime ${success ? '测试或导入记录。' : '查看连接状态并重新授权。'}</p></html>`);
        return;
      }
      if (action === 'status') { json(200, service.status(token)); return; }
      const body = await readBody(req, action === 'import' ? 256 * 1024 : 4096);
      if (action === 'connect') {
        const ip = req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        for (const [key, entry] of starts) if (entry.until < now) starts.delete(key);
        const limit = starts.get(ip) ?? { count: 0, until: now + 60000 };
        if (limit.count >= 100) throw new CalendarTestError('连接请求过于频繁，请稍后重试。', 429);
        limit.count++;
        starts.set(ip, limit);
        const connection = service.connect(token);
        setCookie(connection.sessionToken);
        json(200, { authorizeUrl: connection.authorizeUrl });
      } else if (action === 'disconnect') {
        service.disconnect(token);
        setCookie('', true);
        json(200, { ok: true });
      } else if (action === 'calendar') {
        await service.selectCalendar(token, body.calendarId);
        json(200, service.status(token));
      } else if (action === 'import') {
        json(200, await service.importLogs(token, body));
      } else {
        json(200, await service.test(token, body));
      }
    } catch (error) {
      json(error instanceof CalendarTestError ? error.status : 500, {
        error: error instanceof CalendarTestError ? error.message : '飞书连接服务暂时不可用，请稍后重试。'
      });
    }
  };
}
