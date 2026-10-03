/**
 * @file feishuAutoSyncService.ts
 * @input Durable local datasets, account outbox, ignored categories and the existing Feishu client.
 * @output Foreground synchronization batches with version acknowledgement and recoverable retries.
 * @pos Automatic sync orchestration; no timers, UI state or credentials are stored here.
 */
import type { Category, Log, Scope, TodoItem } from '../types';
import { storageRepository } from '../repositories/storageRepository';
import { prepareFeishuLogImport, type FeishuImportBatch, type FeishuImportCategory, type FeishuImportRecord } from '../utils/feishuLogImport';
import {
  acknowledgeFeishuTask, collectFeishuProjections, feishuContentHash, feishuRetryDelay, observeFeishuLogs,
  type FeishuAutoTask
} from '../utils/feishuAutoSyncState';
import { FeishuClientError, withFeishuCalendarSession, type FeishuCalendarSession } from './feishuCalendarClient';
import { feishuAutoSyncStore, isFeishuReplacementPending, publishFeishuEvent, readFeishuIgnoredCategories, type FeishuAutoSyncStore } from './feishuAutoSyncStore';

export interface FeishuAutoSnapshot { logs: Log[]; categories: Category[]; todos: TodoItem[]; scopes: Scope[]; timezone: string }
interface Projection { id: string; hash: string; sourceHash: string; record?: FeishuImportRecord; category?: FeishuImportCategory; error?: string }
const FULL_RANGE = { startTime: -8640000000000000, endTimeExclusive: 8640000000000000 };
const FULL_DATES = { startDate: '00010101', endDate: '99991231' };
export const FEISHU_AUTO_RUNTIME_EVENT = 'lumostime:feishu-auto-runtime';
export async function readFeishuAutoSnapshot(): Promise<FeishuAutoSnapshot> {
  const [logs, categories, todos, scopes] = await Promise.all([
    storageRepository.getData<Log[]>('logs'), storageRepository.getData<Category[]>('categories'),
    storageRepository.getData<TodoItem[]>('todos'), storageRepository.getData<Scope[]>('scopes')
  ]);
  if (!logs || !categories || !todos || !scopes) throw new Error('本地数据尚未保存，自动同步已暂停。');
  return { logs, categories, todos, scopes, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai' };
}

export function prepareFeishuAutoProjections(snapshot: FeishuAutoSnapshot): Projection[] {
  return snapshot.logs.map((log) => {
    const sourceHash = feishuContentHash(log);
    try {
      const prepared = prepareFeishuLogImport([log], snapshot.categories, FULL_DATES, snapshot);
      const record = prepared.records[0];
      const category = prepared.categories[0];
      return record ? { id: log.id, sourceHash, hash: feishuContentHash({ record, category, timezone: snapshot.timezone }), record, category }
        : { id: log.id, sourceHash, hash: 'excluded', error: '记录为计划、时间无效或分类缺失，已暂停该条同步。' };
    } catch (error) {
      const message = error instanceof Error ? error.message : '记录内容无法导出。';
      return { id: log.id, sourceHash, hash: feishuContentHash(message), error: message };
    }
  });
}

interface Dependencies {
  store: FeishuAutoSyncStore;
  snapshot: () => Promise<FeishuAutoSnapshot>;
  session: <T>(run: (session: FeishuCalendarSession) => Promise<T>) => Promise<T>;
  ignored: () => string[];
  now: () => number;
  available: () => boolean;
}

export class FeishuAutoSyncService {
  private dependencies: Dependencies;
  private running: Promise<void> | undefined;
  get syncing(): boolean { return Boolean(this.running); }
  private foreground = true;
  setForeground(active: boolean): void { this.foreground = active; }
  constructor(dependencies: Partial<Dependencies> = {}) {
    this.dependencies = { store: feishuAutoSyncStore, snapshot: readFeishuAutoSnapshot,
      session: withFeishuCalendarSession, ignored: readFeishuIgnoredCategories, now: Date.now,
      available: () => (typeof document === 'undefined' || document.visibilityState !== 'hidden')
        && (typeof navigator === 'undefined' || navigator.onLine !== false), ...dependencies };
  }

  async setEnabled(enabled: boolean): Promise<void> {
    const { store, session, snapshot } = this.dependencies;
    if (!enabled) {
      await store.update((state) => {
        const account = state.accounts.find((item) => item.accountId === state.activeAccountId);
        if (account) account.enabled = false;
      });
      return;
    }
    await session(async (client) => {
      const connection = await client.connection();
      if (connection.status !== 'connected' || !connection.accountId) throw new Error('请先连接并授权飞书账号。');
      const references = await client.catalog(FULL_RANGE);
      await store.update(async (state) => {
        // Baseline creation shares the log/outbox lock with every save; no edit can fall between them.
        const data = await snapshot();
        const projections = new Map(prepareFeishuAutoProjections(data).map((item) => [item.id, item.hash]));
        state.activeAccountId = connection.accountId;
        let account = state.accounts.find((item) => item.accountId === connection.accountId);
        if (!account) {
          account = { accountId: connection.accountId!, enabled: true, sequence: 0, tasks: [], references,
            observed: observeFeishuLogs(data.logs).map((log) => ({ ...log, projection: projections.get(log.id) })) };
          state.accounts.push(account);
        } else {
          account.enabled = true;
          account.error = undefined;
          account.references = references;
          for (const task of account.tasks) { task.blocked = false; task.nextRetryAt = 0; task.attempts = 0; }
        }
      });
    });
  }

  async identifyAccount(accountId: string | undefined): Promise<void> {
    await this.dependencies.store.update((state) => { state.activeAccountId = accountId; });
  }

  async retryPending(): Promise<void> {
    await this.dependencies.store.update((state) => {
      const account = state.accounts.find((item) => item.accountId === state.activeAccountId);
      if (!account) return;
      account.error = undefined;
      for (const task of account.tasks) { task.blocked = false; task.nextRetryAt = 0; task.attempts = 0; }
    });
    await this.run();
  }

  async refreshConnection(): Promise<void> {
    if (!this.dependencies.available()) return;
    const state = await this.dependencies.store.read();
    if (!state.accounts.some((account) => account.enabled)) return;
    await this.dependencies.session(async (client) => {
      const connection = await client.connection();
      if (connection.status !== 'connected') return;
      await this.dependencies.store.update((state) => {
        state.activeAccountId = connection.accountId;
        const account = state.accounts.find((item) => item.accountId === connection.accountId);
        if (!account) return;
        for (const task of account.tasks) {
          if (task.error === '需要重新连接飞书。' || task.error?.includes('授权')) {
            task.blocked = false; task.nextRetryAt = 0; task.attempts = 0;
          }
        }
        if (!account.tasks.some((task) => task.blocked)) account.error = undefined;
      });
    });
  }

  run(force = false): Promise<void> {
    if (this.running) return this.running;
    this.running = this.runBatch(force).finally(() => { this.running = undefined; publishFeishuEvent(FEISHU_AUTO_RUNTIME_EVENT); });
    publishFeishuEvent(FEISHU_AUTO_RUNTIME_EVENT);
    return this.running;
  }

  private async fail(accountId: string, tasks: FeishuAutoTask[], message: string, blocked = false): Promise<void> {
    const { store, now } = this.dependencies;
    await store.update((state) => {
      const account = state.accounts.find((item) => item.accountId === accountId);
      if (!account) return;
      for (const sent of tasks) {
        const task = account.tasks.find((item) => item.id === sent.id && item.revision === sent.revision);
        if (!task) continue;
        task.attempts++;
        task.error = message;
        task.blocked = blocked || task.attempts >= 8;
        task.nextRetryAt = now() + feishuRetryDelay(task.attempts);
      }
      account.error = message;
    });
  }

  private async runBatch(force: boolean): Promise<void> {
    const { store, snapshot, session, ignored, now, available } = this.dependencies;
    let accountId: string | undefined;
    let selected: FeishuAutoTask[] = [];
    try {
      if (!available() || !this.foreground || isFeishuReplacementPending()) return;
      const state = await store.read();
      const initial = state.accounts.find((item) => item.accountId === state.activeAccountId);
      if (!initial?.enabled) return;
      accountId = initial.accountId;
      const data = await snapshot();
      const projections = prepareFeishuAutoProjections(data);
      await store.update((current) => {
        const account = current.accounts.find((item) => item.accountId === accountId);
        if (!account?.enabled) return;
        collectFeishuProjections(account, projections);
      });
      const current = await store.read();
      const account = current.accounts.find((item) => item.accountId === accountId);
      if (!account?.enabled) return;
      const protectedIds = new Set(ignored());
      selected = account.tasks.filter((task) => (force || !task.blocked && task.nextRetryAt <= now())
        && !task.categoryIds.some((id) => protectedIds.has(id))).slice(0, 5).map((task) => ({ ...task, categoryIds: [...task.categoryIds] }));
      if (!selected.length) return;
      await session(async (client) => {
        const connection = await client.connection();
        if (connection.status !== 'connected' || connection.accountId !== accountId) {
          if (connection.status === 'connected') await this.identifyAccount(connection.accountId);
          else await this.fail(accountId!, selected, '需要重新连接飞书。', true);
          return;
        }
        // The complete execution ledger confirms ownership and all previous category locations.
        const references = await client.catalog(FULL_RANGE);
        await store.update((state) => {
          const account = state.accounts.find((item) => item.accountId === accountId);
          if (account) account.references = references;
        });
        const currentIgnored = ignored();
        const records: FeishuImportRecord[] = [];
        const categories: FeishuImportCategory[] = [];
        const deleteIds: string[] = [];
        const sending: FeishuAutoTask[] = [];
        for (const task of selected) {
          const reference = references.find((item) => item.id === task.id);
          if ([...task.categoryIds, ...(reference?.categoryIds || [])].some((id) => currentIgnored.includes(id))) continue;
          if (task.operation === 'delete' && !reference) {
            await store.update((state) => {
              const account = state.accounts.find((item) => item.accountId === accountId);
              if (account) acknowledgeFeishuTask(account, task, now());
            });
            continue;
          }
          const projection = projections.find((item) => item.id === task.id);
          // A new record may have committed after this batch's snapshot was read. Pick it up next time.
          if (task.operation === 'upsert' && !projection) continue;
          if (task.operation === 'upsert' && account.observed.find((log) => log.id === task.id)?.hash !== projection!.sourceHash) continue;
          if (task.operation === 'upsert' && !projection?.record) {
            await this.fail(accountId!, [task], projection?.error || '记录已变化，请稍后重试。', true);
            continue;
          }
          if (task.operation === 'delete') deleteIds.push(task.id);
          else {
            records.push(projection!.record!);
            if (!categories.some((item) => item.id === projection!.category!.id)) categories.push(projection!.category!);
          }
          sending.push(task);
        }
        if (!sending.length) return;
        const permitted = await store.update((state) => {
          const account = state.accounts.find((item) => item.accountId === accountId);
          if (!account?.enabled || state.activeAccountId !== accountId || sending.some((sent) => !account.tasks.some((task) => task.id === sent.id && task.revision === sent.revision)
            || sent.operation === 'upsert' && account.observed.find((log) => log.id === sent.id)?.hash !== projections.find((projection) => projection.id === sent.id)?.sourceHash)) return false;
          for (const sent of sending) account.tasks.find((task) => task.id === sent.id)!.sent = true;
          return true;
        });
        if (!permitted || !available() || !this.foreground || isFeishuReplacementPending() || currentIgnored.join() !== ignored().join()) return;
        const starts = sending.flatMap((task) => [task.startTime, references.find((item) => item.id === task.id)?.startTime]).filter((time): time is number => Number.isSafeInteger(time));
        const batch: FeishuImportBatch = { sync: true, records, categories, deleteIds, ignoredCategoryIds: currentIgnored,
          timezone: data.timezone, range: { startTime: Math.min(...starts), endTimeExclusive: Math.max(...starts) + 1 } };
        selected = sending;
        const result = await client.sync(batch);
        for (const item of result.results) {
          const sent = sending.find((task) => task.id === item.id)!;
          if (item.status === 'failed') {
            const error = item.error || '同步未完成，请重试。';
            await this.fail(accountId!, [sent], error, /权限|来源|属于|重复来源|无效|超过|缩短/.test(error));
          } else {
            await store.update((state) => {
              const account = state.accounts.find((item) => item.accountId === accountId);
              if (!account) return;
              if (sent.operation === 'delete') account.references = account.references.filter((reference) => reference.id !== sent.id);
              else {
                const record = records.find((record) => record.id === sent.id)!;
                account.references = [...account.references.filter((reference) => reference.id !== sent.id),
                  { id: sent.id, startTime: record.startTime, categoryIds: [record.categoryId] }];
              }
              acknowledgeFeishuTask(account, sent, now());
            });
          }
        }
      });
    } catch (error) {
      if (!accountId) throw error;
      const message = error instanceof Error ? error.message : '自动同步暂时不可用。';
      const blocked = error instanceof FeishuClientError ? [400, 401, 403, 409].includes(error.status)
        : /不完整|过多|无法读取|尚未保存/.test(message);
      await this.fail(accountId, selected, message, blocked);
    }
  }
}

export const feishuAutoSyncService = new FeishuAutoSyncService();
