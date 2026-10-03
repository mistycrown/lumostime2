/**
 * @file calendarTest.test.ts
 * @input Mock Feishu responses and malformed/manual test requests.
 * @output Regression coverage for access checks, event payloads, retries, and sanitized failures.
 * @pos Server integration tests.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runCalendarTest, validateTestRequest } from './calendarTest';

const request = () => ({
  requestId: '28acddbc-4156-4f49-8ce0-1f9ecb10fef9', startTime: Date.now(), timezone: 'Asia/Shanghai'
});
const calendar = { calendar_id: 'feishu.cn_test@group.calendar.feishu.cn', summary: '测试日历', role: 'owner' };
const ok = (data: unknown) => new Response(JSON.stringify({ code: 0, data }));
afterEach(() => vi.unstubAllGlobals());

describe('Feishu calendar test', () => {
  it('checks the primary calendar before creating a free, private 15-minute event', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(ok({ calendars: [{ calendar }] }))
      .mockResolvedValueOnce(ok({ event: { event_id: 'event-1' } }));
    const input = request();
    const result = await runCalendarTest(input, { userAccessToken: 'server-token' }, fetchFn);
    expect(fetchFn.mock.calls[0][0]).toContain('/calendars/primary');
    expect(fetchFn.mock.calls[0][1].method).toBe('POST');
    expect(fetchFn.mock.calls[1][0]).toContain(`idempotency_key=${input.requestId}`);
    const payload = JSON.parse(fetchFn.mock.calls[1][1].body);
    expect(payload).toMatchObject({
      summary: 'LumosTime 连通性测试', free_busy_status: 'free', visibility: 'private', need_notification: false, reminders: []
    });
    expect(payload.description).toContain(`[LumosTime:test:${input.requestId}]`);
    expect(payload.start_time).toEqual({ timestamp: String(Math.floor(input.startTime / 1000)), timezone: 'Asia/Shanghai' });
    expect(Number(payload.end_time.timestamp) - Number(payload.start_time.timestamp)).toBe(900);
    expect(result).toMatchObject({ calendarName: '测试日历', eventId: 'event-1' });
    expect(JSON.stringify(result)).not.toContain('server-token');
  });

  it('reads the explicitly configured calendar and accepts writer access', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(ok({ ...calendar, role: 'writer' }))
      .mockResolvedValueOnce(ok({ event: { event_id: 'event-1' } }));
    await runCalendarTest(request(), { userAccessToken: 'token', calendarId: calendar.calendar_id }, fetchFn);
    expect(fetchFn.mock.calls[0][0]).toContain(encodeURIComponent(calendar.calendar_id));
    expect(fetchFn.mock.calls[0][1].method).toBe('GET');
  });

  it.each(['reader', 'free_busy_reader', 'unknown', undefined])('never writes a non-writable calendar (%s)', async (role) => {
    const fetchFn = vi.fn().mockResolvedValue(ok({ calendars: [{ calendar: { ...calendar, role } }] }));
    await expect(runCalendarTest(request(), { userAccessToken: 'token' }, fetchFn)).rejects.toThrow('写入权限');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('stops on missing credentials without calling Feishu', async () => {
    const fetchFn = vi.fn();
    await expect(runCalendarTest(request(), {}, fetchFn)).rejects.toThrow('授权飞书');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('does not write after an expired-token response and strips upstream messages', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 99991663, msg: 'secret-token' })));
    await expect(runCalendarTest(request(), { userAccessToken: 'token' }, fetchFn)).rejects.toThrow('99991663');
    await expect(runCalendarTest(request(), { userAccessToken: 'token' }, fetchFn)).rejects.not.toThrow('secret-token');
    expect(fetchFn.mock.calls.every((call) => call[0].endsWith('/primary'))).toBe(true);
  });

  it('reports unknown creation results and uses exactly the same key/payload on a manual retry', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(ok({ calendars: [{ calendar }] }))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(ok({ calendars: [{ calendar }] }))
      .mockResolvedValueOnce(ok({ event: { event_id: 'event-1' } }));
    const input = request();
    await expect(runCalendarTest(input, { userAccessToken: 'token' }, fetchFn)).rejects.toThrow('原请求重试');
    await runCalendarTest(input, { userAccessToken: 'token' }, fetchFn);
    expect(fetchFn.mock.calls[1][0]).toBe(fetchFn.mock.calls[3][0]);
    expect(fetchFn.mock.calls[1][1].body).toBe(fetchFn.mock.calls[3][1].body);
  });

  it('treats a missing event ID as an unconfirmed write', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(ok({ calendars: [{ calendar }] })).mockResolvedValueOnce(ok({ event: {} }));
    await expect(runCalendarTest(request(), { userAccessToken: 'token' }, fetchFn)).rejects.toThrow('原请求重试');
  });

  it('validates UUIDs, timestamps, timezones and expired retries', () => {
    const valid = request();
    expect(validateTestRequest(valid)).toEqual(valid);
    for (const input of [null, {}, { ...request(), requestId: 'bad' }, { ...request(), startTime: NaN },
      { ...request(), startTime: Date.now() - 2 * 86400000 }, { ...request(), timezone: 'bad/timezone' }]) {
      expect(() => validateTestRequest(input)).toThrow();
    }
  });
});
