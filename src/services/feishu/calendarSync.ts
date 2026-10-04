/**
 * @file calendarSync.ts
 * @input Account-bound import ledger, explicit sync batches and authenticated calendar calls.
 * @output Durable Log-ID-based updates, deletions and delete-then-create category migrations.
 * @pos Manual Feishu synchronization; deletion never follows from a partial record batch.
 * @updated 2026-10-03: Exposes previous/source categories and rejects mutations of ignored categories.
 * @updated 2026-10-03: Shares account-bound synchronization between Electron and Android.
 * @updated 2026-10-03: Tombstones deleted calendar locations without removing local log identities.
 */
import { CalendarTestError, isMissingCalendar } from './calendarTest.ts';
import type { ConnectionStore } from './connectionStore.ts';
import { tokenHash } from './crypto.ts';
import type { CalendarCall, CategoryCalendar, ImportCategory, ImportLedgerEntry, ImportRecord } from './calendarImport.ts';

interface Location { calendarId: string; entry: ImportLedgerEntry }
interface SyncedLog { id: string; record: ImportRecord; timezone: string; locations: Location[]; deleted?: boolean }
interface Range { startTime: number; endTimeExclusive: number }
type SyncStatus = 'created' | 'updated' | 'moved' | 'deleted' | 'skipped' | 'failed';
interface Dependencies {
  mappings: (accountId: string) => CategoryCalendar[];
  calendar: (accountId: string, category: ImportCategory, call: CalendarCall) => Promise<CategoryCalendar>;
  create: (accountId: string, body: unknown, call: CalendarCall) => Promise<any>;
  validate: (body: any) => { categories: ImportCategory[]; records: ImportRecord[]; timezone: string };
}

const validId = (id: unknown): id is string => typeof id === 'string' && /^[\w-]{1,128}$/.test(id);
const inRange = (time: number, range: Range) => time >= range.startTime && time < range.endTimeExclusive;
const marker = (id: string) => `[LumosTime:log:${id}]`;
const hasMarker = (event: any, id: string) => typeof event?.description === 'string'
  && event.description.replace(/\r\n?/g, '\n').split('\n').includes(marker(id));
const eventPath = (calendarId: string, eventId: string) => `calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
const description = (record: ImportRecord) => `${record.note}${record.note ? '\n\n' : ''}${marker(record.id)}`;
const fields = (record: ImportRecord, timezone: string) => ({ summary: record.title, description: description(record),
  start_time: { timestamp: String(Math.floor(record.startTime / 1000)), timezone },
  end_time: { timestamp: String(Math.floor(record.endTime / 1000)), timezone }, need_notification: false });
const same = (entry: ImportLedgerEntry, record: ImportRecord, timezone: string) => entry.timezone === timezone
  && entry.record.title === record.title && entry.record.note === record.note
  && Math.floor(entry.record.startTime / 1000) === Math.floor(record.startTime / 1000)
  && Math.floor(entry.record.endTime / 1000) === Math.floor(record.endTime / 1000);

export class FeishuCalendarSync {
  private store: ConnectionStore;
  private dependencies: Dependencies;
  constructor(store: ConnectionStore, dependencies: Dependencies) {
    this.store = store;
    this.dependencies = dependencies;
  }
  private key(accountId: string, id: string) { return tokenHash(`sync:${accountId}:${id}`); }
  private ledgerKey(accountId: string, calendarId: string, id: string) { return tokenHash(`log:${accountId}:${calendarId}:${id}`); }
  private missing(accountId: string, calendarId: string) { return this.store.getValue<boolean>('deleted_calendars', tokenHash(`deleted:${accountId}:${calendarId}`)); }
  private save(accountId: string, log: SyncedLog) {
    log.locations = log.locations.filter((location) => !this.missing(accountId, location.calendarId));
    this.store.setValue('sync_logs', this.key(accountId, log.id), log, accountId);
  }

  forgetCalendar(accountId: string, calendarId: string) {
    // Adopt legacy ledgers before removing their location, retaining IDs for explicit local deletions.
    this.upgrade(accountId);
    this.store.setValue('deleted_calendars', tokenHash(`deleted:${accountId}:${calendarId}`), true, accountId);
    for (const row of this.store.listValueEntries<ImportLedgerEntry>('import_ledger', accountId)) {
      if (validId(row.value?.record?.id) && row.id === this.ledgerKey(accountId, calendarId, row.value.record.id)) {
        this.store.removeValue('import_ledger', row.id);
      }
    }
    for (const log of this.store.listValues<SyncedLog>('sync_logs', accountId)) {
      if (log.locations.some((location) => location.calendarId === calendarId)) this.save(accountId, log);
    }
    // Remove the binding last. A restart at any earlier step can safely repeat cleanup.
    for (const calendar of this.dependencies.mappings(accountId)) {
      if (calendar.id === calendarId) {
        const key = tokenHash(`category:${accountId}:${calendar.categoryId}`);
        // The saved calendar ID proves the previous creation finished, including an interrupted checkpoint.
        this.store.removeValue('category_uncertain', key);
        this.store.removeValue('category_calendars', key);
      }
    }
  }

  private upgrade(accountId: string) {
    const calendars = this.dependencies.mappings(accountId);
    for (const row of this.store.listValueEntries<ImportLedgerEntry>('import_ledger', accountId)) {
      const entry = row.value;
      if (!validId(entry?.record?.id)) continue;
      const calendar = calendars.find((item) => this.ledgerKey(accountId, item.id, entry.record.id) === row.id);
      if (!calendar || this.missing(accountId, calendar.id)) continue; // Verify legacy account-bound hashes before adopting.
      const log = this.store.getValue<SyncedLog>('sync_logs', this.key(accountId, entry.record.id))
        || { id: entry.record.id, record: entry.record, timezone: entry.timezone, locations: [] };
      const location = log.locations.find((item) => item.calendarId === calendar.id);
      if (location) location.entry = entry;
      else log.locations.push({ calendarId: calendar.id, entry });
      this.save(accountId, log);
    }
    for (const log of this.store.listValues<SyncedLog>('sync_logs', accountId)) {
      if (log.locations.some((location) => this.missing(accountId, location.calendarId))) this.save(accountId, log);
    }
  }

  catalog(accountId: string, body: any) {
    const range = body?.range;
    if (!Number.isSafeInteger(range?.startTime) || !Number.isSafeInteger(range?.endTimeExclusive)
      || range.endTimeExclusive <= range.startTime || body.after !== undefined && !validId(body.after)) {
      throw new CalendarTestError('同步清单请求无效。', 400);
    }
    this.upgrade(accountId);
    const candidates = this.store.listValues<SyncedLog>('sync_logs', accountId)
      .filter((log) => !log.deleted && (inRange(log.record.startTime, range) || log.locations.some((location) => inRange(location.entry.record.startTime, range)))
        && (!body.after || log.id > body.after))
      .sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
    return { records: candidates.slice(0, 200).map((log) => ({ id: log.id, startTime: log.record.startTime,
      categoryIds: [...new Set([log.record.categoryId, ...log.locations.map((location) => location.entry.record.categoryId)])] })),
      after: candidates.length > 200 ? candidates[199].id : undefined };
  }

  private async ownedEvent(location: Location, id: string, call: CalendarCall): Promise<any | null> {
    if (!location.entry.eventId) return null;
    let data: any;
    try { data = await call(eventPath(location.calendarId, location.entry.eventId)); }
    catch (error) { if (error instanceof CalendarTestError && error.status === 404 && !isMissingCalendar(error)) return null; throw error; }
    const event = data?.event ?? data;
    if (event?.status === 'cancelled') return null;
    if (!event?.event_id || event.event_id !== location.entry.eventId || !hasMarker(event, id)) {
      throw new CalendarTestError('无法确认日程属于这条 LumosTime 记录，已停止修改或删除。', 409);
    }
    return event;
  }

  private async find(location: Location, id: string, call: CalendarCall) {
    let pageToken = '';
    for (let page = 0; page < 100; page++) {
      const params = new URLSearchParams({ page_size: '500', start_time: String(Math.floor(location.entry.record.startTime / 1000)),
        end_time: String(Math.ceil(location.entry.record.endTime / 1000)), ...(pageToken ? { page_token: pageToken } : {}) });
      const data = await call(`calendars/${encodeURIComponent(location.calendarId)}/events?${params}`);
      if (!Array.isArray(data?.items) && data?.has_more !== false) throw new CalendarTestError('无法核查原日程，已停止同步。');
      const matches = (data.items || []).filter((event: any) => event.status !== 'cancelled' && typeof event.event_id === 'string' && hasMarker(event, id));
      if (matches.length > 1) throw new CalendarTestError('发现重复来源日程，请先核查飞书日历。', 409);
      if (matches.length) return matches[0].event_id as string;
      if (!data.has_more) return null;
      if (typeof data.page_token !== 'string' || !data.page_token || data.page_token === pageToken) break;
      pageToken = data.page_token;
    }
    throw new CalendarTestError('无法完整核查原日程，已停止同步。');
  }

  private async resolve(accountId: string, log: SyncedLog, location: Location, call: CalendarCall) {
    if (location.entry.eventId) return;
    const id = await this.find(location, log.id, call);
    if (id) {
      location.entry = { ...location.entry, eventId: id, status: 'complete' };
      this.store.setValue('import_ledger', this.ledgerKey(accountId, location.calendarId, log.id), location.entry, accountId);
      this.save(accountId, log);
    } else if (['pending', 'unknown'].includes(location.entry.status)) {
      throw new CalendarTestError('原日程创建结果仍未确认，请稍后重试核查。');
    }
  }

  private async remove(accountId: string, log: SyncedLog, location: Location, call: CalendarCall) {
    try {
      if (!this.missing(accountId, location.calendarId)) {
        await this.resolve(accountId, log, location, call);
        const event = await this.ownedEvent(location, log.id, call);
        if (event) await call(`${eventPath(location.calendarId, location.entry.eventId!)}?need_notification=false`, 'DELETE');
      }
    } catch (error) {
      if (isMissingCalendar(error)) this.forgetCalendar(accountId, location.calendarId);
      else if (!(error instanceof CalendarTestError && error.status === 404)) throw error;
    }
    // Persist each completed deletion before proceeding; timeout retries first read cancelled status.
    this.store.removeValue('import_ledger', this.ledgerKey(accountId, location.calendarId, log.id));
    log.locations = log.locations.filter((item) => item !== location);
    this.save(accountId, log);
  }

  async run(accountId: string, body: any, call: CalendarCall) {
    const batch = this.dependencies.validate(body);
    const deletes = body.deleteIds ?? [];
    const ignored = body.ignoredCategoryIds ?? [];
    if (!Array.isArray(ignored) || ignored.length > 1000 || ignored.some((id) => !validId(id)) || new Set(ignored).size !== ignored.length) {
      throw new CalendarTestError('忽略分类设置无效。', 400);
    }
    if (!Array.isArray(deletes) || deletes.some((id) => !validId(id)) || new Set(deletes).size !== deletes.length
      || deletes.some((id) => batch.records.some((record) => record.id === id))
      || !batch.records.length && !deletes.length || batch.records.length + deletes.length > 20) {
      throw new CalendarTestError('同步请求无效。', 400);
    }
    this.upgrade(accountId);
    const tracked = (id: string) => this.store.getValue<SyncedLog>('sync_logs', this.key(accountId, id));
    const scoped = (log: SyncedLog | null) => log && (inRange(log.record.startTime, body.range)
      || log.locations.some((location) => inRange(location.entry.record.startTime, body.range)));
    const protectedLog = (log: SyncedLog | null) => log && (ignored.includes(log.record.categoryId)
      || log.locations.some((location) => ignored.includes(location.entry.record.categoryId)));
    if (deletes.some((id) => protectedLog(tracked(id))) || batch.records.some((record) => ignored.includes(record.categoryId) || protectedLog(tracked(record.id)))) {
      throw new CalendarTestError('本次同步包含已忽略分类的记录，已停止同步。', 400);
    }
    // Validate the entire deletion/range intent before any provider call.
    if (deletes.some((id) => !scoped(tracked(id))) || batch.records.some((record) => !inRange(record.startTime, body.range) && !scoped(tracked(record.id)))) {
      throw new CalendarTestError('记录不在本次同步范围或不属于当前账号，已停止同步。', 400);
    }
    const results: { id: string; status: SyncStatus; error?: string }[] = [];
    const calendars: CategoryCalendar[] = [];
    const handleError = (id: string, error: unknown) => {
      if (error instanceof CalendarTestError && [401, 429].includes(error.status)) throw error;
      results.push({ id, status: 'failed', error: error instanceof CalendarTestError ? error.message : '同步未完成，请重试。' });
    };
    for (const record of batch.records) {
      try {
        const category = batch.categories.find((item) => item.id === record.categoryId)!;
        let calendar = calendars.find((item) => item.categoryId === category.id);
        if (!calendar) { calendar = await this.dependencies.calendar(accountId, category, call); calendars.push(calendar); }
        const log = tracked(record.id) || { id: record.id, record, timezone: batch.timezone, locations: [] };
        const moved = log.record.categoryId !== record.categoryId || log.locations.some((location) => location.calendarId !== calendar.id);
        log.deleted = false;
        this.save(accountId, log);
        // Category changes are deletion followed by creation. Keep the old record until the new write succeeds.
        for (const location of [...log.locations]) {
          if (location.calendarId !== calendar.id) await this.remove(accountId, log, location, call);
        }
        const location = log.locations.find((item) => item.calendarId === calendar.id);
        if (location) {
          await this.resolve(accountId, log, location, call);
          if (location.entry.eventId) {
            if (same(location.entry, record, batch.timezone) && !moved) { results.push({ id: record.id, status: 'skipped' }); continue; }
            const event = await this.ownedEvent(location, log.id, call);
            if (event) {
              const data = await call(eventPath(location.calendarId, location.entry.eventId), 'PATCH', fields(record, batch.timezone));
              if (data?.event?.event_id !== location.entry.eventId) throw new CalendarTestError('日程更新结果尚未确认，请重试。');
              location.entry = { ...location.entry, record, timezone: batch.timezone, status: 'complete' };
              log.record = record; log.timezone = batch.timezone;
              this.store.setValue('import_ledger', this.ledgerKey(accountId, calendar.id, log.id), location.entry, accountId);
              this.save(accountId, log);
              results.push({ id: record.id, status: moved ? 'moved' : 'updated' }); continue;
            }
            await this.remove(accountId, log, location, call);
          }
        }
        const created = await this.dependencies.create(accountId, { categories: [category], records: [record], timezone: batch.timezone,
          range: { startTime: Math.min(body.range.startTime, record.startTime), endTimeExclusive: Math.max(body.range.endTimeExclusive, record.startTime + 1) } }, call);
        const entry = this.store.getValue<ImportLedgerEntry>('import_ledger', this.ledgerKey(accountId, calendar.id, log.id));
        if (entry) { log.locations = [{ calendarId: calendar.id, entry }]; this.save(accountId, log); }
        if (created.results[0]?.status === 'failed') throw new CalendarTestError(created.results[0].error || '日程创建未完成。');
        // A recovered uncertain creation can contain the previous payload. Apply the latest local content now.
        if (entry?.eventId && !same(entry, record, batch.timezone)) {
          const event = await this.ownedEvent(log.locations[0], log.id, call);
          if (!event) throw new CalendarTestError('刚核查的日程已不存在，请重试同步。');
          const data = await call(eventPath(calendar.id, entry.eventId), 'PATCH', fields(record, batch.timezone));
          if (data?.event?.event_id !== entry.eventId) throw new CalendarTestError('日程更新结果尚未确认，请重试。');
          entry.record = record; entry.timezone = batch.timezone;
          this.store.setValue('import_ledger', this.ledgerKey(accountId, calendar.id, log.id), entry, accountId);
        }
        log.record = record; log.timezone = batch.timezone; this.save(accountId, log);
        results.push({ id: record.id, status: moved ? 'moved' : created.results[0].status });
      } catch (error) { handleError(record.id, error); }
    }
    for (const id of deletes) {
      try {
        const log = tracked(id)!;
        for (const location of [...log.locations]) await this.remove(accountId, log, location, call);
        log.deleted = true;
        this.save(accountId, log);
        results.push({ id, status: 'deleted' });
      } catch (error) { handleError(id, error); }
    }
    return { results, calendars };
  }
}
