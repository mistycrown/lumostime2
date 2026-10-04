/**
 * @file calendarImport.test.ts
 * @input Provider fixtures, actual log batches and encrypted SQLite persistence.
 * @output Coverage for category colors, reuse, cross-device dedupe and uncertain-write recovery.
 * @pos Formal Feishu import tests.
 * @updated 2026-10-03: Verifies same-ID calendar renaming while preserving imported event deduplication.
 */
import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FeishuCalendarImport, validateImportBatch } from './calendarImport';
import { OAuthStore } from './oauthStore';
import { CalendarTestError } from './calendarTest';
import { prepareFeishuLogImport } from '../../src/utils/feishuLogImport';

const category = { id: 'work', name: '工作', color: '#336699' };
const record = { id: 'log-1', categoryId: 'work', title: '读文献', note: '笔记', startTime: 1780000000000, endTime: 1780003600000 };
const batch = () => ({ categories: [category], records: [record], timezone: 'Asia/Shanghai', range: { startTime: record.startTime - 1000, endTimeExclusive: record.startTime + 86400000 } });
let store: OAuthStore;
let importer: FeishuCalendarImport;
let call: ReturnType<typeof vi.fn>;
beforeEach(() => {
  store = new OAuthStore(':memory:', randomBytes(32).toString('base64'));
  importer = new FeishuCalendarImport(store);
  call = vi.fn();
});
afterEach(() => store.close());

function initialCalendar() {
  call.mockResolvedValueOnce({ calendar_list: [], has_more: false })
    .mockResolvedValueOnce({ calendar: { calendar_id: 'work-calendar', summary: 'LumosTime · 工作' } })
    .mockResolvedValueOnce({});
}

it('creates one private calendar per category with the RGB color, subscribes and imports a free event', async () => {
  initialCalendar();
  call.mockResolvedValueOnce({ items: [], has_more: false }).mockResolvedValueOnce({ event: { event_id: 'event-1' } });
  expect((await importer.run('alice', batch(), call)).results).toEqual([{ id: 'log-1', status: 'created' }]);
  expect(call.mock.calls[1]).toEqual(['calendars', 'POST', expect.objectContaining({ summary: 'LumosTime · 工作', permissions: 'private', color: 0x336699 })]);
  expect(call.mock.calls[2][0]).toBe('calendars/work-calendar/subscribe');
  const event = call.mock.calls.at(-1)!;
  expect(event[0]).toContain('work-calendar/events?idempotency_key=');
  expect(event[2]).toMatchObject({ summary: '读文献', color: -1, free_busy_status: 'free', need_notification: false, reminders: [] });
  expect(event[2].description).toBe('笔记\n\n[LumosTime:log:log-1]');
  expect(importer.mappings('alice')).toHaveLength(1);
  expect(importer.mappings('bob')).toEqual([]);
});

it('sends formatted log metadata intact and reconciles its source marker without duplicate events', async () => {
  const longNote = '这是完整的原始备注。'.repeat(250);
  const prepared = prepareFeishuLogImport([{ ...record, activityId: 'read', duration: 3600, note: longNote,
    focusScore: 4, moodScore: 3, linkedTodoId: 'todo-1', scopeIds: ['growth'],
    attributeValues: [{ attributeId: 'pages', value: 0 }] }], [{ ...category, icon: '', themeColor: category.color,
    activities: [{ id: 'read', name: '阅读', icon: '', color: 'bg-blue-100', attributes: [
      { id: 'pages', name: '页数', type: 'number', unit: '页', order: 0, createdAt: 1, updatedAt: 1 }
    ] }] }], { startDate: '20260528', endDate: '20260530' }, {
    todos: [{ id: 'todo-1', title: '完成阅读' }], scopes: [{ id: 'growth', name: '个人成长' }]
  });
  const request = { ...prepared, timezone: 'Asia/Shanghai' };
  initialCalendar();
  call.mockResolvedValueOnce({ items: [], has_more: false }).mockResolvedValueOnce({ event: { event_id: 'metadata-event' } });
  expect((await importer.run('alice', request, call)).results[0].status).toBe('created');
  const description = call.mock.calls.at(-1)![2].description;
  for (const content of [longNote, '页数：0 页', '专注度：4 / 5', '情绪度：3 / 5', '@完成阅读', '%个人成长', '#阅读']) {
    expect(description).toContain(content);
  }
  expect(description.endsWith('\n\n[LumosTime:log:log-1]')).toBe(true);
  expect(description.match(/log-1/g)).toHaveLength(1);
  expect(description).not.toMatch(/todo-1|growth|待办 ID|关联待办|关联领域|记录来源|Log ID/);
  // Another installation has no local ledger; the readable layout must keep remote deduplication working.
  const otherStore = new OAuthStore(':memory:', randomBytes(32).toString('base64'));
  try {
    const mapping = importer.mappings('alice')[0];
    call.mockResolvedValueOnce({ calendar_list: [{ calendar_id: mapping.id, role: 'owner', description: call.mock.calls[1][2].description }], has_more: false })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ items: [{ event_id: 'metadata-event', description, status: 'confirmed' }], has_more: false });
    expect((await new FeishuCalendarImport(otherStore).run('alice', request, call)).results[0].status).toBe('skipped');
    expect(call.mock.calls.filter(([path, method]) => path.includes('/events?') && method === 'POST')).toHaveLength(1);
  } finally { otherStore.close(); }
  expect(() => validateImportBatch({ ...request, records: [{ ...prepared.records[0], note: '文'.repeat(12001) }] })).toThrow();
});

it('reuses a category ID despite renaming, and skips imported IDs across service instances', async () => {
  initialCalendar();
  call.mockResolvedValueOnce({ items: [], has_more: false }).mockResolvedValueOnce({ event: { event_id: 'event-1' } });
  await importer.run('alice', batch(), call);
  const restarted = new FeishuCalendarImport(store);
  call.mockResolvedValueOnce({ calendar_id: 'work-calendar', role: 'owner', summary: 'LumosTime · 工作' }) // Real GET response is flat.
    .mockResolvedValueOnce({ calendar: { calendar_id: 'work-calendar', summary: 'LumosTime · 工作改名' } });
  const changed = { ...batch(), categories: [{ ...category, name: '工作改名' }], records: [{ ...record, title: '修改标题' }] };
  expect((await restarted.run('alice', changed, call)).results[0].status).toBe('skipped');
  expect(call.mock.calls.filter(([, method]) => method === 'POST')).toHaveLength(3);
  expect(call.mock.calls.at(-1)).toEqual(['calendars/work-calendar', 'PATCH', { summary: 'LumosTime · 工作改名' }]);
});

it('recovers a timed-out event from its source marker without issuing another create', async () => {
  initialCalendar();
  call.mockResolvedValueOnce({ items: [], has_more: false }).mockRejectedValueOnce(new CalendarTestError('网络结果未知'));
  expect((await importer.run('alice', batch(), call)).results[0].status).toBe('failed');
  call.mockResolvedValueOnce({ calendar_id: 'work-calendar', role: 'owner' })
    .mockResolvedValueOnce({ items: [{ event_id: 'recovered', description: '笔记\n[LumosTime:log:log-1]', status: 'confirmed' }], has_more: false });
  expect((await importer.run('alice', batch(), call)).results[0].status).toBe('skipped');
  expect(call.mock.calls.filter(([path, method]) => method === 'POST' && path.includes('/events?'))).toHaveLength(1);
});

it('does not recreate uncertain events when a remote list is empty or fails', async () => {
  initialCalendar();
  call.mockResolvedValueOnce({ items: [], has_more: false }).mockRejectedValueOnce(new CalendarTestError('unknown'));
  await importer.run('alice', batch(), call);
  call.mockResolvedValueOnce({ calendar_id: 'work-calendar', role: 'owner' }).mockResolvedValueOnce({ items: [], has_more: false });
  expect((await importer.run('alice', batch(), call)).results[0]).toMatchObject({ status: 'failed', error: expect.stringContaining('仍未确认') });
  expect(call.mock.calls.filter(([path, method]) => method === 'POST' && path.includes('/events?'))).toHaveLength(1);
});

it('retries a definitively rejected event with the same key after permission is restored', async () => {
  initialCalendar();
  call.mockResolvedValueOnce({ items: [], has_more: false }).mockRejectedValueOnce(new CalendarTestError('权限不足', 403, true));
  await importer.run('alice', batch(), call);
  const first = call.mock.calls.at(-1)![0];
  call.mockResolvedValueOnce({ calendar_id: 'work-calendar', role: 'owner' })
    .mockResolvedValueOnce({ items: [], has_more: false }).mockResolvedValueOnce({ event: { event_id: 'event-1' } });
  expect((await importer.run('alice', batch(), call)).results[0].status).toBe('created');
  expect(call.mock.calls.at(-1)![0]).toBe(first);
});

it('never duplicates a calendar after creation times out and keeps different accounts isolated', async () => {
  call.mockResolvedValueOnce({ calendar_list: [], has_more: false }).mockRejectedValueOnce(new CalendarTestError('unknown'));
  await expect(importer.prepare('alice', category, call)).rejects.toThrow('unknown');
  call.mockResolvedValueOnce({ calendar_list: [], has_more: false });
  await expect(importer.prepare('alice', category, call)).rejects.toThrow('尚未确认');
  expect(call.mock.calls.filter(([path, method]) => path === 'calendars' && method === 'POST')).toHaveLength(1);
  initialCalendar();
  await importer.prepare('bob', category, call);
  expect(importer.mappings('alice')).toHaveLength(0);
  expect(importer.mappings('bob')).toHaveLength(1);
});

it('persists a created calendar before subscription, so a failed subscription can be retried safely', async () => {
  call.mockResolvedValueOnce({ calendar_list: [], has_more: false })
    .mockResolvedValueOnce({ calendar: { calendar_id: 'work-calendar' } }).mockRejectedValueOnce(new CalendarTestError('订阅失败'));
  await expect(importer.prepare('alice', category, call)).rejects.toThrow('订阅失败');
  call.mockResolvedValueOnce({ calendar_id: 'work-calendar', role: 'owner' }).mockResolvedValueOnce({});
  expect((await importer.prepare('alice', category, call)).subscribed).toBe(true);
  expect(call.mock.calls.filter(([path, method]) => path === 'calendars' && method === 'POST')).toHaveLength(1);
});

it('stops before creating an event if remote reconciliation fails or calendar access becomes read-only', async () => {
  initialCalendar();
  call.mockRejectedValueOnce(new CalendarTestError('列表读取失败'));
  expect((await importer.run('alice', batch(), call)).results[0].status).toBe('failed');
  call.mockResolvedValueOnce({ calendar_id: 'work-calendar', role: 'reader' });
  expect((await importer.run('alice', batch(), call)).results[0].status).toBe('failed');
  expect(call.mock.calls.some(([path, method]) => path.includes('/events?') && method === 'POST')).toBe(false);
});

it('serializes same-account operations and rejects malformed batches before any provider call', async () => {
  let release: (value: any) => void;
  call.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
  const active = importer.run('alice', batch(), call);
  await expect(importer.run('alice', batch(), call)).rejects.toMatchObject({ status: 409 });
  release!({ calendar_list: [], has_more: false });
  call.mockResolvedValueOnce({ calendar: { calendar_id: 'work-calendar' } }).mockResolvedValueOnce({})
    .mockResolvedValueOnce({ items: [], has_more: false }).mockResolvedValueOnce({ event: { event_id: 'event-1' } });
  await active;
  for (const invalid of [null, { ...batch(), timezone: 'bad/zone' }, { ...batch(), records: [{ ...record, endTime: record.startTime }] },
    { ...batch(), records: [record, record] }, { ...batch(), categories: [{ ...category, color: 'red' }] }]) {
    expect(() => validateImportBatch(invalid)).toThrow();
  }
});

it('stops a rate-limited batch and safely resumes definitively rejected records', async () => {
  initialCalendar();
  const multi = { ...batch(), records: [record, { ...record, id: 'log-2' }] };
  call.mockResolvedValueOnce({ items: [], has_more: false }).mockRejectedValueOnce(new CalendarTestError('限流', 429, true));
  await expect(importer.run('alice', multi, call)).rejects.toMatchObject({ status: 429 });
  const originalRequest = call.mock.calls.at(-1)![0];
  expect(call).toHaveBeenCalledTimes(5);
  call.mockResolvedValueOnce({ calendar_id: 'work-calendar', role: 'owner' })
    .mockResolvedValueOnce({ items: [], has_more: false }).mockResolvedValueOnce({ event: { event_id: 'event-1' } })
    .mockResolvedValueOnce({ items: [], has_more: false }).mockResolvedValueOnce({ event: { event_id: 'event-2' } });
  expect((await importer.run('alice', multi, call)).results.map((item) => item.status)).toEqual(['created', 'created']);
  expect(call.mock.calls[7][0]).toBe(originalRequest);
});
