/**
 * @file calendarTest.ts
 * @input Server-only Feishu user token, optional calendar ID, and a validated test request.
 * @output Writable calendar metadata and a single 15-minute test event.
 * @pos Server integration (never imported by the renderer).
 * @description Checks access before creating a private, free, notification-free event with a retry-stable idempotency key.
 */
export interface CalendarTestRequest {
  requestId: string;
  startTime: number;
  timezone: string;
}

export interface CalendarTestResult {
  calendarId: string;
  calendarName: string;
  eventId: string;
  startTime: number;
  endTime: number;
  timezone: string;
}

export class CalendarTestError extends Error {
  status: number;
  rejected: boolean;

  constructor(message: string, status = 502, rejected = false) {
    super(message);
    this.status = status;
    this.rejected = rejected;
  }
}

// Feishu's official CLI error categories: access-token invalid/expired or consumed refresh token.
export const FEISHU_AUTH_ERROR_CODES = [99991663, 99991668, 99991671, 99991677, 20026, 20037, 20064, 20073];
export const FEISHU_PERMISSION_ERROR_CODES = [99991672, 99991676, 99991679, 230027];

export function validateTestRequest(body: unknown): CalendarTestRequest {
  const value = body as Partial<CalendarTestRequest> | null;
  if (!value || typeof value.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.requestId)
    || !Number.isSafeInteger(value.startTime) || Math.abs(value.startTime! - Date.now()) > 86400000
    || typeof value.timezone !== 'string' || value.timezone.length > 100) {
    throw new CalendarTestError('测试请求无效，请重新打开飞书日历设置。', 400);
  }
  try {
    new Intl.DateTimeFormat('en', { timeZone: value.timezone });
  } catch {
    throw new CalendarTestError('测试时区无效。', 400);
  }
  return { requestId: value.requestId!, startTime: value.startTime!, timezone: value.timezone };
}

export async function runCalendarTest(
  request: CalendarTestRequest,
  config: { userAccessToken?: string; calendarId?: string },
  fetchFn: typeof fetch = fetch
): Promise<CalendarTestResult> {
  const token = config.userAccessToken?.trim();
  if (!token) {
    throw new CalendarTestError('请先连接并授权飞书账号。', 401);
  }
  let stage = '连接';
  const call = async (path: string, method: string, body?: unknown) => {
    let response: Response;
    try {
      response = await fetchFn(`https://open.feishu.cn/open-apis/calendar/v4/${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: 'error',
        signal: AbortSignal.timeout(15000)
      });
    } catch {
      throw new CalendarTestError(stage === '创建'
        ? '日历已连通，但创建结果尚未确认。请使用原请求重试。'
        : '无法连接飞书，请检查服务端网络。');
    }
    const data = await response.json().catch(() => null);
    if (response.status === 429) throw new CalendarTestError('飞书请求过于频繁，请稍后重试。', 429, true);
    if (!response.ok || !data || data.code !== 0) {
      const code = typeof data?.code === 'number' ? `（飞书错误码 ${data.code}）` : '';
      // Never relay upstream messages: they can contain credentials or request details.
      const expired = response.status === 401 || FEISHU_AUTH_ERROR_CODES.includes(data?.code);
      if (expired) throw new CalendarTestError(`飞书授权已失效${code}，请重新连接。`, 401);
      if (response.status === 403 || FEISHU_PERMISSION_ERROR_CODES.includes(data?.code)) {
        throw new CalendarTestError(`飞书日历权限不足${code}，请确认应用权限已发布并重新授权。`, 403);
      }
      throw new CalendarTestError(stage === '创建'
        ? `日历已连通，但测试块未确认创建成功${code}。请检查日历写入权限；重试将复用原请求。`
        : `飞书连接失败${code}。请检查用户令牌是否过期以及日历读取权限。`);
    }
    return data.data;
  };

  const configuredId = config.calendarId?.trim();
  const data = configuredId ? await call(`calendars/${encodeURIComponent(configuredId)}`, 'GET') : null;
  const calendar = configuredId ? data?.calendar ?? data
    : (await call('calendars/primary', 'POST', {}))?.calendars?.[0]?.calendar;
  if (!calendar?.calendar_id) {
    throw new CalendarTestError('飞书未返回目标日历，请检查账号授权和日历权限。');
  }
  if (!['owner', 'writer'].includes(calendar.role)) {
    throw new CalendarTestError('日历已连通，但当前账号没有目标日历的写入权限。', 403);
  }

  stage = '创建';
  const startTime = Math.floor(request.startTime / 1000);
  const endTime = startTime + 15 * 60;
  const result = await call(
    `calendars/${encodeURIComponent(calendar.calendar_id)}/events?idempotency_key=${request.requestId}`,
    'POST',
    {
      summary: 'LumosTime 连通性测试',
      description: `LumosTime 飞书日历测试块\n[LumosTime:test:${request.requestId}]`,
      start_time: { timestamp: String(startTime), timezone: request.timezone },
      end_time: { timestamp: String(endTime), timezone: request.timezone },
      free_busy_status: 'free',
      visibility: 'private',
      need_notification: false,
      reminders: []
    }
  );
  if (!result?.event?.event_id) {
    throw new CalendarTestError('日历已连通，但飞书未返回测试块编号。请使用原请求重试。');
  }
  return {
    calendarId: calendar.calendar_id,
    calendarName: calendar.summary || '飞书日历',
    eventId: result.event.event_id,
    startTime: Number(result.event.start_time?.timestamp || startTime) * 1000,
    endTime: Number(result.event.end_time?.timestamp || endTime) * 1000,
    timezone: request.timezone
  };
}
