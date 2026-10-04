/**
 * @file calendarImport.ts
 * @input Validated category descriptors and small batches of actual log records.
 * @output Category calendars, durable manual sync results and safe reconciliation of uncertain writes.
 * @updated 2026-10-03: Synchronizes edits, explicit deletions and category moves while accepting legacy create-only requests.
 * @pos Shared desktop/Android import service; all writes require an explicit user action.
 * @updated 2026-10-03: Keeps source markers and ledger identities compatible across platforms.
 * @updated 2026-10-03: Reconciles category names and rebuilds confirmed deleted calendars on manual sync.
 */
import { randomUUID, tokenHash } from './crypto.ts';
import { CalendarTestError } from './calendarTest.ts';
import type { ConnectionStore } from './connectionStore.ts';
import { FeishuCalendarSync } from './calendarSync.ts';

export interface ImportCategory { id: string; name: string; color: string }
export interface ImportRecord { id: string; categoryId: string; title: string; note: string; startTime: number; endTime: number }
export interface CategoryCalendar { categoryId: string; categoryName: string; id: string; name: string; color: string; subscribed: boolean }
export interface ImportLedgerEntry {
  status: 'pending' | 'complete' | 'unknown' | 'failed';
  requestId: string;
  record: ImportRecord;
  timezone: string;
  eventId?: string;
}
export type CalendarCall = (path: string, method?: string, body?: unknown) => Promise<any>;

export function validateCategory(value: any): ImportCategory {
  if (!value || typeof value.id !== 'string' || !/^[\w-]{1,128}$/.test(value.id)
    || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 80
    || typeof value.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(value.color)) {
    throw new CalendarTestError('分类信息无效，请刷新页面后重试。', 400);
  }
  return { id: value.id, name: value.name.trim(), color: value.color };
}

export function validateImportBatch(body: any, syncing = false): { categories: ImportCategory[]; records: ImportRecord[]; timezone: string } {
  if (!body || !Array.isArray(body.categories) || !syncing && !body.categories.length || body.categories.length > 20
    || !Array.isArray(body.records) || !syncing && !body.records.length || body.records.length > 20
    || typeof body.timezone !== 'string' || body.timezone.length > 100
    || !Number.isSafeInteger(body.range?.startTime) || !Number.isSafeInteger(body.range?.endTimeExclusive)
    || body.range.endTimeExclusive <= body.range.startTime) throw new CalendarTestError('导入请求无效。', 400);
  try { new Intl.DateTimeFormat('en', { timeZone: body.timezone }); }
  catch { throw new CalendarTestError('导入时区无效。', 400); }
  const categories = body.categories.map(validateCategory);
  if (new Set(categories.map((category: ImportCategory) => category.id)).size !== categories.length) throw new CalendarTestError('分类重复。', 400);
  const seen = new Set<string>();
  const records = body.records.map((record: any): ImportRecord => {
    if (!record || typeof record.id !== 'string' || !/^[\w-]{1,128}$/.test(record.id) || seen.has(record.id)
      || !categories.some((category: ImportCategory) => category.id === record.categoryId)
      || typeof record.title !== 'string' || !record.title.trim() || record.title.length > 200
      || typeof record.note !== 'string' || record.note.length > 12000
      || !Number.isSafeInteger(record.startTime) || !Number.isSafeInteger(record.endTime)
      || !syncing && (record.startTime < body.range.startTime || record.startTime >= body.range.endTimeExclusive)
      || Math.floor(record.endTime / 1000) <= Math.floor(record.startTime / 1000)) {
      throw new CalendarTestError('导入记录无效，请检查日期和分类。', 400);
    }
    seen.add(record.id);
    return { id: record.id, categoryId: record.categoryId, title: record.title.trim(), note: record.note,
      startTime: record.startTime, endTime: record.endTime };
  });
  return { categories, records, timezone: body.timezone };
}

export class FeishuCalendarImport {
  private store: ConnectionStore;
  private running = new Set<string>();
  private sync: FeishuCalendarSync;

  constructor(store: ConnectionStore) {
    this.store = store;
    this.sync = new FeishuCalendarSync(store, { mappings: (accountId) => this.mappings(accountId),
      calendar: (accountId, category, call) => this.calendar(accountId, category, call),
      create: (accountId, body, call) => this.runLegacy(accountId, body, call, true),
      validate: (body) => validateImportBatch(body, true) });
  }

  private marker(accountId: string, categoryId: string): string { return `[LumosTime:category:${tokenHash(`${accountId}:${categoryId}`)}]`; }

  private async updateMetadata(accountId: string, category: ImportCategory, existing: CategoryCalendar, remote: any, call: CalendarCall) {
    const name = `LumosTime · ${category.name}`;
    const patch: Record<string, unknown> = {};
    // An alias takes precedence in Feishu. Writers can change their own alias, but not the shared title.
    if (remote.role === 'writer') {
      if ((remote.summary_alias || remote.summary || existing.name) !== name || existing.categoryName !== category.name) patch.summary_alias = name;
    } else {
      if ((remote.summary || existing.name) !== name || existing.categoryName !== category.name) patch.summary = name;
      if (remote.summary_alias && remote.summary_alias !== name) patch.summary_alias = name;
    }
    // Preserve a color chosen in Feishu unless the local category color itself changed.
    if (existing.color.toLowerCase() !== category.color.toLowerCase()) patch.color = parseInt(category.color.slice(1), 16);
    if (Object.keys(patch).length) await call(`calendars/${encodeURIComponent(existing.id)}`, 'PATCH', patch);
    const result = { ...existing, categoryName: category.name, name, color: category.color };
    this.store.setValue('category_calendars', tokenHash(`category:${accountId}:${category.id}`), result, accountId);
    return result;
  }

  async calendar(accountId: string, category: ImportCategory, call: CalendarCall): Promise<CategoryCalendar> {
    const key = tokenHash(`category:${accountId}:${category.id}`);
    let existing = this.store.getValue<CategoryCalendar>('category_calendars', key);
    if (existing) {
      let calendar: any;
      try {
        const data = await call(`calendars/${encodeURIComponent(existing.id)}`);
        calendar = data.calendar ?? data;
      } catch (error) {
        // A missing calendar GET is definitive; permission/network failures must retain the binding.
        if (!(error instanceof CalendarTestError && error.status === 404 && error.resource !== 'event')) throw error;
        calendar = { is_deleted: true };
      }
      if (calendar?.is_deleted) {
        this.sync.forgetCalendar(accountId, existing.id);
        existing = null;
      } else {
        if (!['owner', 'writer'].includes(calendar?.role)) throw new CalendarTestError('分类日历不可写，请在飞书恢复日历权限后重试。', 403);
        existing = await this.updateMetadata(accountId, category, existing, calendar, call);
        if (!existing.subscribed) {
          await call(`calendars/${encodeURIComponent(existing.id)}/subscribe`, 'POST', {});
          existing.subscribed = true;
          this.store.setValue('category_calendars', key, existing, accountId);
        }
        return existing;
      }
    }
    // Scan by a stable source marker, never by title: names can collide or change.
    const marker = this.marker(accountId, category.id);
    let pageToken = '';
    let found: any;
    for (let page = 0; page < 100; page++) {
      const data = await call(`calendars?page_size=100${pageToken ? `&page_token=${encodeURIComponent(pageToken)}` : ''}`);
      if (!Array.isArray(data.calendar_list)) throw new CalendarTestError('无法核查分类日历，请稍后重试。');
      found = data.calendar_list.find((item: any) => String(item.description || '').includes(marker) && ['owner', 'writer'].includes(item.role) && !item.is_deleted
        && !this.store.getValue<boolean>('deleted_calendars', tokenHash(`deleted:${accountId}:${item.calendar_id}`)));
      if (found || !data.has_more) break;
      if (!data.page_token || data.page_token === pageToken || page === 99) throw new CalendarTestError('无法完整核查分类日历，请稍后重试。');
      pageToken = data.page_token;
    }
    if (!found) {
      // Calendar creation has no documented idempotency key. Persist uncertainty and stop before retrying a POST.
      if (this.store.getValue<boolean>('category_uncertain', key)) {
        throw new CalendarTestError('上次分类日历创建结果尚未确认，请先到飞书检查日历，稍后重试。');
      }
      this.store.setValue('category_uncertain', key, true);
      let data: any;
      try {
        data = await call('calendars', 'POST', {
          summary: `LumosTime · ${category.name}`, description: `LumosTime 活动分类日历\n${marker}`,
          permissions: 'private', color: parseInt(category.color.slice(1), 16)
        });
      } catch (error) {
        if (error instanceof CalendarTestError && error.rejected) this.store.removeValue('category_uncertain', key);
        throw error;
      }
      if (!data.calendar?.calendar_id) throw new CalendarTestError('分类日历创建结果尚未确认，请稍后重试。');
      found = data.calendar;
    }
    let result = { categoryId: category.id, categoryName: category.name, id: found.calendar_id,
      name: String(found.summary || `LumosTime · ${category.name}`), color: category.color, subscribed: false };
    this.store.setValue('category_calendars', key, result, accountId);
    this.store.removeValue('category_uncertain', key);
    result = await this.updateMetadata(accountId, category, result, found, call);
    // Save the ID before subscribing, so a subscription failure never causes a duplicate calendar.
    await call(`calendars/${encodeURIComponent(result.id)}/subscribe`, 'POST', {});
    result.subscribed = true;
    this.store.setValue('category_calendars', key, result, accountId);
    return result;
  }

  mappings(accountId: string): CategoryCalendar[] { return this.store.listValues<CategoryCalendar>('category_calendars', accountId); }

  async prepare(accountId: string, category: ImportCategory, call: CalendarCall): Promise<CategoryCalendar> {
    if (this.running.has(accountId)) throw new CalendarTestError('正在导入，请等待当前操作完成。', 409);
    this.running.add(accountId);
    try { return await this.calendar(accountId, category, call); }
    finally { this.running.delete(accountId); }
  }

  private async findEvent(calendarId: string, entry: ImportLedgerEntry, call: CalendarCall): Promise<string | null> {
    const marker = `[LumosTime:log:${entry.record.id}]`;
    let pageToken = '';
    for (let page = 0; page < 100; page++) {
      const params = new URLSearchParams({ page_size: '500', start_time: String(Math.floor(entry.record.startTime / 1000)),
        end_time: String(Math.ceil(entry.record.endTime / 1000)), ...(pageToken ? { page_token: pageToken } : {}) });
      const data = await call(`calendars/${encodeURIComponent(calendarId)}/events?${params}`);
      const items = data.items ?? (data.has_more === false ? [] : null);
      if (!Array.isArray(items)) throw new CalendarTestError('无法核查已有日程，已停止导入。');
      const found = items.find((event: any) => event.status !== 'cancelled' && typeof event.event_id === 'string' && String(event.description || '').split('\n').includes(marker));
      if (found) return found.event_id;
      if (!data.has_more) return null;
      if (!data.page_token || data.page_token === pageToken) throw new CalendarTestError('日程核查分页无效，已停止导入。');
      pageToken = data.page_token;
    }
    throw new CalendarTestError('日程数量过多，无法完成核查，已停止导入。');
  }

  async run(accountId: string, body: unknown, call: CalendarCall) {
    if ((body as any)?.operation === 'catalog' || (body as any)?.sync === true) {
      if (this.running.has(accountId)) throw new CalendarTestError('正在同步，请等待当前操作完成。', 409);
      this.running.add(accountId);
      try {
        return (body as any).operation === 'catalog' ? this.sync.catalog(accountId, body) : await this.sync.run(accountId, body, call);
      } finally { this.running.delete(accountId); }
    }
    return this.runLegacy(accountId, body, call);
  }

  private async runLegacy(accountId: string, body: unknown, call: CalendarCall, lockHeld = false) {
    const batch = validateImportBatch(body);
    if (!lockHeld && this.running.has(accountId)) throw new CalendarTestError('正在导入，请等待当前操作完成。', 409);
    if (!lockHeld) this.running.add(accountId);
    const results: { id: string; status: 'created' | 'skipped' | 'failed'; error?: string }[] = [];
    const calendars: CategoryCalendar[] = [];
    try {
      for (const category of batch.categories) {
        const records = batch.records.filter((record) => record.categoryId === category.id);
        if (!records.length) continue;
        let calendar: CategoryCalendar;
        try { calendar = await this.calendar(accountId, category, call); calendars.push(calendar); }
        catch (error) {
          if (error instanceof CalendarTestError && [401, 429].includes(error.status)) throw error;
          const message = error instanceof CalendarTestError ? error.message : '分类日历准备失败。';
          results.push(...records.map((record) => ({ id: record.id, status: 'failed' as const, error: message })));
          continue;
        }
        for (const record of records) {
          const key = tokenHash(`log:${accountId}:${calendar.id}:${record.id}`);
          let entry = this.store.getValue<ImportLedgerEntry>('import_ledger', key);
          if (entry?.status === 'complete') { results.push({ id: record.id, status: 'skipped' }); continue; }
          entry ??= { status: 'pending', requestId: randomUUID(), record, timezone: batch.timezone };
          try {
            const found = await this.findEvent(calendar.id, entry, call);
            if (found) {
              this.store.setValue('import_ledger', key, { ...entry, status: 'complete', eventId: found }, accountId);
              results.push({ id: record.id, status: 'skipped' });
              continue;
            }
            // After an unknown write, an empty list can be eventual consistency. Never blindly POST again.
            if (entry.status === 'unknown' || this.store.getValue<ImportLedgerEntry>('import_ledger', key)?.status === 'pending') {
              throw new CalendarTestError('上次日程创建结果仍未确认，已保留记录，稍后重试核查。');
            }
            entry.status = 'pending';
            this.store.setValue('import_ledger', key, entry, accountId);
            const data = await call(`calendars/${encodeURIComponent(calendar.id)}/events?idempotency_key=${entry.requestId}`, 'POST', {
              summary: entry.record.title, description: `${entry.record.note}${entry.record.note ? '\n\n' : ''}[LumosTime:log:${record.id}]`,
              start_time: { timestamp: String(Math.floor(entry.record.startTime / 1000)), timezone: entry.timezone },
              end_time: { timestamp: String(Math.floor(entry.record.endTime / 1000)), timezone: entry.timezone },
              free_busy_status: 'free', visibility: 'private', need_notification: false, color: -1, reminders: []
            });
            if (!data.event?.event_id) throw new CalendarTestError('日程创建结果尚未确认。');
            this.store.setValue('import_ledger', key, { ...entry, status: 'complete', eventId: data.event.event_id }, accountId);
            results.push({ id: record.id, status: 'created' });
          } catch (error) {
            const stored = this.store.getValue<ImportLedgerEntry>('import_ledger', key);
            if (stored?.status === 'pending') this.store.setValue('import_ledger', key, { ...stored,
              status: error instanceof CalendarTestError && error.rejected ? 'failed' : 'unknown' }, accountId);
            if (error instanceof CalendarTestError && [401, 429].includes(error.status)) throw error;
            results.push({ id: record.id, status: 'failed', error: error instanceof CalendarTestError ? error.message : '导入未完成，请稍后重试。' });
          }
        }
      }
      return { results, calendars };
    } finally { if (!lockHeld) this.running.delete(accountId); }
  }
}
