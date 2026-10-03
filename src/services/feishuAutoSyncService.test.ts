/**
 * @file feishuAutoSyncService.test.ts
 * @input Durable queues and controlled calendar responses across restarts and concurrent edits.
 * @output Regression coverage for opt-in scope, offline recovery, delete/move safety and account isolation.
 * @pos Automatic synchronization integration tests.
 */
import { expect, it, vi } from 'vitest';
import type { Category, Log, Scope, TodoItem } from '../types';
import type { StorageWrite } from '../repositories/storageRepository';
import type { FeishuImportBatch } from '../utils/feishuLogImport';
import type { FeishuImportedReference } from '../utils/feishuSyncPlan';
import { FeishuAutoSyncStore } from './feishuAutoSyncStore';
import { FeishuAutoSyncService, type FeishuAutoSnapshot } from './feishuAutoSyncService';
import { FeishuClientError, type FeishuCalendarSession, type FeishuConnectionStatus, type FeishuImportResult } from './feishuCalendarClient';

const log = (id = 'a', title = '工作'): Log => ({ id, title, categoryId: 'work', activityId: 'write', startTime: 1791000000000, endTime: 1791000060000, duration: 60 });
const category = (id = 'work'): Category => ({ id, name: id, themeColor: '#336699', activities: [{ id: 'write', name: '写作', icon: '' }] } as Category);
function fixture(initial = [log()]) {
  const values = new Map<string, unknown>();
  const repository = {
    getMeta: async <T,>(key: string) => structuredClone(values.get(key) ?? null) as T | null,
    setBatch: vi.fn(async (writes: StorageWrite[]) => { for (const write of writes) values.set(write.key, structuredClone(write.value)); })
  };
  const store = new FeishuAutoSyncStore(repository);
  const snapshot: FeishuAutoSnapshot = { logs: initial, categories: [category(), category('life')], todos: [], scopes: [], timezone: 'Asia/Shanghai' };
  let references: FeishuImportedReference[] = [];
  let ignored: string[] = [];
  let now = 10000;
  let connection: FeishuConnectionStatus = { configured: true, status: 'connected', accountId: 'account-a', calendarId: 'main', calendars: [{ id: 'main', name: '主日历' }] };
  const client: FeishuCalendarSession = {
    connection: vi.fn(async () => connection),
    catalog: vi.fn(async () => structuredClone(references)),
    sync: vi.fn(async (batch: FeishuImportBatch): Promise<FeishuImportResult> => {
      const results: FeishuImportResult['results'] = [];
      for (const record of batch.records) {
        const exists = references.some((item) => item.id === record.id);
        references = [...references.filter((item) => item.id !== record.id), { id: record.id, startTime: record.startTime, categoryIds: [record.categoryId] }];
        results.push({ id: record.id, status: exists ? 'updated' : 'created' });
      }
      for (const id of batch.deleteIds || []) { references = references.filter((item) => item.id !== id); results.push({ id, status: 'deleted' }); }
      return { results, calendars: [] };
    })
  };
  const dependencies = { store, snapshot: async () => structuredClone(snapshot),
    session: async <T,>(run: (session: FeishuCalendarSession) => Promise<T>) => run(client),
    ignored: () => ignored, now: () => now, available: () => true };
  const service = new FeishuAutoSyncService(dependencies);
  return { store, service, client, snapshot, repository, dependencies,
    save: async (logs: Log[]) => { snapshot.logs = logs; await store.saveLogs(logs); },
    account: async () => (await store.read()).accounts[0],
    setReferences: (value: FeishuImportedReference[]) => { references = value; },
    setIgnored: (value: string[]) => { ignored = value; },
    setConnection: (value: FeishuConnectionStatus) => { connection = value; },
    advance: (value = 1000000) => { now += value; }
  };
}

it('creates a baseline without uploading old history, then uploads a new backdated record', async () => {
  const f = fixture();
  await f.service.setEnabled(true); await f.service.run();
  expect(f.client.sync).not.toHaveBeenCalled();
  await f.save([log(), { ...log('backfill'), startTime: 100000, endTime: 160000 }]);
  await f.service.run();
  expect(vi.mocked(f.client.sync).mock.calls[0][0].records.map((item) => item.id)).toEqual(['backfill']);
  expect((await f.account()).tasks).toEqual([]);
});
it('updates an old record and adopts manual-import ownership before deleting it', async () => {
  const f = fixture();
  f.setReferences([{ id: 'a', startTime: log().startTime, categoryIds: ['work'] }]);
  await f.service.setEnabled(true);
  await f.save([log('a', '修改备注')]); await f.service.run();
  await f.save([]); await f.service.run();
  expect(vi.mocked(f.client.sync).mock.calls[1][0]).toMatchObject({ records: [], deleteIds: ['a'] });
});
it('cancels an unsent create followed by a delete without a remote mutation', async () => {
  const f = fixture([]); await f.service.setEnabled(true);
  await f.save([log('new')]); await f.save([]); await f.service.run();
  expect(f.client.sync).not.toHaveBeenCalled(); expect((await f.account()).tasks).toEqual([]);
});
it('recovers persisted offline edits after a new service instance starts', async () => {
  const f = fixture(); await f.service.setEnabled(true);
  await f.save([log('a', '离线修改')]);
  vi.mocked(f.client.sync).mockRejectedValueOnce(new FeishuClientError('网络中断'));
  await f.service.run();
  expect((await f.account()).tasks[0].attempts).toBe(1);
  await f.service.run(); expect(f.client.sync).toHaveBeenCalledTimes(1);
  f.advance(); await new FeishuAutoSyncService(f.dependencies).run();
  expect(f.client.sync).toHaveBeenCalledTimes(2); expect((await f.account()).tasks).toEqual([]);
});
it('checks an uncertain create before deleting it after a timeout', async () => {
  const f = fixture([]); await f.service.setEnabled(true); await f.save([log('new')]);
  vi.mocked(f.client.sync).mockImplementationOnce(async (batch) => {
    f.setReferences(batch.records.map((record) => ({ id: record.id, startTime: record.startTime, categoryIds: [record.categoryId] })));
    throw new FeishuClientError('结果未知');
  });
  await f.service.run(); await f.save([]); await f.service.run();
  expect(vi.mocked(f.client.sync).mock.calls[1][0].deleteIds).toEqual(['new']);
  expect((await f.account()).tasks).toEqual([]);
});
it('retains a newer edit made during an upload and later uploads its latest content', async () => {
  const f = fixture(); await f.service.setEnabled(true); await f.save([log('a', 'v2')]);
  vi.mocked(f.client.sync).mockImplementationOnce(async () => {
    await f.save([log('a', 'v3')]);
    return { results: [{ id: 'a', status: 'created' }], calendars: [] };
  });
  await f.service.run(); expect((await f.account()).tasks).toHaveLength(1);
  await f.service.run();
  expect(vi.mocked(f.client.sync).mock.calls[1][0].records[0].title).toBe('v3');
  expect((await f.account()).tasks).toEqual([]);
});
it('does not label a stale snapshot as a newer committed task revision', async () => {
  const f = fixture(); await f.service.setEnabled(true); await f.save([log('a', 'v2')]);
  let race = true;
  const service = new FeishuAutoSyncService({ ...f.dependencies, snapshot: async () => {
    const old = structuredClone(f.snapshot);
    if (race) { race = false; await f.save([log('a', 'v3')]); }
    return old;
  } });
  await service.run(); expect(f.client.sync).not.toHaveBeenCalled();
  expect((await f.account()).tasks).toHaveLength(1);
  await service.run(); expect(vi.mocked(f.client.sync).mock.calls[0][0].records[0].title).toBe('v3');
});
it('keeps a delete made while creation is in flight', async () => {
  const f = fixture([]); await f.service.setEnabled(true); await f.save([log()]);
  vi.mocked(f.client.sync).mockImplementationOnce(async (batch) => {
    f.setReferences([{ id: 'a', startTime: batch.records[0].startTime, categoryIds: ['work'] }]);
    await f.save([]);
    return { results: [{ id: 'a', status: 'created' }], calendars: [] };
  });
  await f.service.run(); expect((await f.account()).tasks[0].operation).toBe('delete');
  await f.service.run(); expect(vi.mocked(f.client.sync).mock.calls[1][0].deleteIds).toEqual(['a']);
});
it('protects ignored source and destination categories, then resumes when unignored', async () => {
  const f = fixture(); f.setReferences([{ id: 'a', startTime: log().startTime, categoryIds: ['work'] }]);
  await f.service.setEnabled(true); await f.save([{ ...log(), categoryId: 'life' }]);
  f.setIgnored(['work']); await f.service.run(); expect(f.client.sync).not.toHaveBeenCalled();
  f.setIgnored(['life']); await f.service.run(); expect(f.client.sync).not.toHaveBeenCalled();
  f.setIgnored([]); await f.service.run();
  expect(vi.mocked(f.client.sync).mock.calls[0][0].records[0].categoryId).toBe('life');
});
it('does not send queued work to a different connected account', async () => {
  const f = fixture(); await f.service.setEnabled(true); await f.save([log('a', 'changed')]);
  f.setConnection({ configured: true, status: 'connected', accountId: 'account-b' });
  await f.service.run(); expect(f.client.sync).not.toHaveBeenCalled();
  expect((await f.store.read()).activeAccountId).toBe('account-b');
  expect((await f.account()).tasks).toHaveLength(1);
});
it('pauses expired authorization and resumes after the same account reconnects', async () => {
  const f = fixture(); await f.service.setEnabled(true); await f.save([log('a', 'changed')]);
  f.setConnection({ configured: true, status: 'expired' }); await f.service.run();
  expect((await f.account()).tasks[0].blocked).toBe(true);
  f.setConnection({ configured: true, status: 'connected', accountId: 'account-a' });
  await f.service.refreshConnection(); await f.service.run();
  expect(f.client.sync).toHaveBeenCalledTimes(1);
});
it('does not send after the switch is turned off while the catalog is loading', async () => {
  const f = fixture(); await f.service.setEnabled(true); await f.save([log('a', 'changed')]);
  vi.mocked(f.client.catalog).mockImplementationOnce(async () => { await f.service.setEnabled(false); return []; });
  await f.service.run(); expect(f.client.sync).not.toHaveBeenCalled(); expect((await f.account()).tasks).toHaveLength(1);
});
it('does not interpret a restored smaller dataset as remote deletions', async () => {
  const f = fixture(); f.setReferences([{ id: 'a', startTime: log().startTime, categoryIds: ['work'] }]);
  await f.service.setEnabled(true); f.snapshot.logs = []; await f.store.saveLogs([], true); await f.service.run();
  expect(f.client.sync).not.toHaveBeenCalled(); expect((await f.account()).enabled).toBe(false);
});
it('ignores image changes and detects changed linked todo names', async () => {
  const f = fixture([{ ...log(), linkedTodoId: 'todo' }]);
  f.snapshot.todos = [{ id: 'todo', title: '旧名称' } as TodoItem]; await f.service.setEnabled(true);
  await f.save([{ ...log(), linkedTodoId: 'todo', images: ['photo.webp'] }]); await f.service.run();
  expect(f.client.sync).not.toHaveBeenCalled();
  f.snapshot.todos = [{ id: 'todo', title: '新名称' } as TodoItem]; await f.service.run();
  expect(vi.mocked(f.client.sync).mock.calls[0][0].records[0].note).toContain('@新名称');
});
it('blocks invalid records individually without losing a valid record in the same batch', async () => {
  const f = fixture([]); await f.service.setEnabled(true);
  await f.save([{ ...log('bad'), endTime: log().startTime }, log('good')]); await f.service.run();
  expect(vi.mocked(f.client.sync).mock.calls[0][0].records.map((record) => record.id)).toEqual(['good']);
  expect((await f.account()).tasks).toMatchObject([{ id: 'bad', blocked: true }]);
});
it('does not enqueue generated planned records or their deletion', async () => {
  const f = fixture([]); await f.service.setEnabled(true);
  await f.save([{ ...log('plan'), isPlanned: true }]); await f.service.run();
  expect((await f.account()).tasks).toEqual([]);
  await f.save([]); await f.service.run();
  expect(f.client.sync).not.toHaveBeenCalled(); expect((await f.account()).tasks).toEqual([]);
});
it('preserves an unsent content update through a later image-only edit', async () => {
  const f = fixture(); await f.service.setEnabled(true); await f.save([log('a', 'v2')]);
  // Projection collection happens before the network check, including offline runs.
  vi.mocked(f.client.connection).mockRejectedValueOnce(new FeishuClientError('offline'));
  await f.service.run(); await f.save([{ ...log('a', 'v2'), images: ['photo.webp'] }]);
  await f.service.run();
  expect(vi.mocked(f.client.sync).mock.calls[0][0].records[0].title).toBe('v2');
});
it('processes at most five records per batch and keeps the remainder durable', async () => {
  const f = fixture([]); await f.service.setEnabled(true);
  await f.save(Array.from({ length: 8 }, (_, index) => log(`log-${index}`))); await f.service.run();
  expect(vi.mocked(f.client.sync).mock.calls[0][0].records).toHaveLength(5);
  expect((await f.account()).tasks).toHaveLength(3);
  await f.service.run(); expect((await f.account()).tasks).toEqual([]);
});
it('stops network writes when the app becomes inactive during a catalog read', async () => {
  const f = fixture(); await f.service.setEnabled(true); await f.save([log('a', 'changed')]);
  vi.mocked(f.client.catalog).mockImplementationOnce(async () => { f.service.setForeground(false); return []; });
  await f.service.run(); expect(f.client.sync).not.toHaveBeenCalled();
  f.service.setForeground(true); await f.service.run(); expect(f.client.sync).toHaveBeenCalledTimes(1);
});
it('does not publish or persist half of a failed logs/outbox commit', async () => {
  const f = fixture(); await f.service.setEnabled(true);
  const before = await f.store.read();
  f.repository.setBatch.mockRejectedValueOnce(new Error('disk full'));
  await expect(f.store.saveLogs([log('a', 'changed')])).rejects.toThrow('disk full');
  expect(await f.store.read()).toEqual(before);
});
