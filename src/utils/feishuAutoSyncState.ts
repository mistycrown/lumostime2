/**
 * @file feishuAutoSyncState.ts
 * @input Persisted log identities, account settings, projected calendar content and versioned results.
 * @output Pure, account-isolated synchronization queue transitions and durable deletion intentions.
 * @pos Feishu automatic synchronization state; contains no credentials.
 */
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import type { Log } from '../types';
import type { FeishuImportedReference } from './feishuSyncPlan';

export const feishuContentHash = (value: unknown) => bytesToHex(sha256(JSON.stringify(value)));
export interface FeishuObservedLog { id: string; hash: string; startTime: number; categoryId: string; actual: boolean; projection?: string }
export interface FeishuAutoTask {
  id: string; revision: number; operation: 'upsert' | 'delete'; startTime: number; categoryIds: string[];
  attempts: number; nextRetryAt: number; sent?: boolean; payloadHash?: string; error?: string; blocked?: boolean;
}
export interface FeishuAutoAccount {
  accountId: string; enabled: boolean; sequence: number; observed: FeishuObservedLog[];
  tasks: FeishuAutoTask[]; references: FeishuImportedReference[]; lastSuccessAt?: number; error?: string;
}
export interface FeishuAutoState { version: 1; activeAccountId?: string; accounts: FeishuAutoAccount[] }
export const emptyFeishuAutoState = (): FeishuAutoState => ({ version: 1, accounts: [] });
export const observeFeishuLogs = (logs: Log[]): FeishuObservedLog[] => logs.map((log) => ({
  id: log.id, hash: feishuContentHash(log), startTime: log.startTime, categoryId: log.categoryId, actual: !log.isPlanned
}));

function createTask(account: FeishuAutoAccount, log: FeishuObservedLog, operation: FeishuAutoTask['operation'],
  previous?: FeishuAutoTask, reference?: FeishuImportedReference): FeishuAutoTask {
  return { id: log.id, revision: ++account.sequence, operation, startTime: log.startTime,
    categoryIds: [...new Set([log.categoryId, ...(reference?.categoryIds || []), ...(previous?.categoryIds || [])])],
    attempts: 0, nextRetryAt: 0, sent: previous?.sent, payloadHash: previous?.payloadHash };
}
export function queueFeishuTask(account: FeishuAutoAccount, log: FeishuObservedLog, operation: FeishuAutoTask['operation']): void {
  const task = createTask(account, log, operation, account.tasks.find((task) => task.id === log.id), account.references.find((item) => item.id === log.id));
  account.tasks = [...account.tasks.filter((item) => item.id !== log.id), task];
}

export function collectFeishuLogChanges(state: FeishuAutoState, logs: Log[], replacement = false): void {
  const observed = observeFeishuLogs(logs);
  for (const account of state.accounts) {
    const previous = new Map(account.observed.map((log) => [log.id, log]));
    const tasks = new Map(account.tasks.map((task) => [task.id, task]));
    const references = new Map(account.references.map((reference) => [reference.id, reference]));
    const currentIds = new Set(observed.map((log) => log.id));
    if (replacement) {
      // A restored dataset is not a series of explicit user deletions. Re-enabling starts a new baseline.
      account.enabled = false;
      account.tasks = [];
      account.error = '本地数据已替换，自动同步已暂停。';
    } else {
      for (const log of observed) {
        const old = previous.get(log.id);
        if ((log.actual || old?.actual) && (!old || old.hash !== log.hash)) tasks.set(log.id, createTask(account, log, 'upsert', tasks.get(log.id), references.get(log.id)));
      }
      for (const old of account.observed) {
        if (!currentIds.has(old.id) && (old.actual || references.has(old.id))) tasks.set(old.id, createTask(account, old, 'delete', tasks.get(old.id), references.get(old.id)));
      }
      account.tasks = [...tasks.values()];
    }
    // Each account owns its projection baseline; never share mutable objects between accounts.
    account.observed = observed.map((log) => ({ ...log, projection: replacement ? undefined : previous.get(log.id)?.projection }));
  }
}

export function collectFeishuProjections(account: FeishuAutoAccount, projections: { id: string; hash: string; sourceHash?: string }[]): void {
  const observedById = new Map(account.observed.map((log) => [log.id, log]));
  const tasks = new Map(account.tasks.map((task) => [task.id, task]));
  const references = new Map(account.references.map((reference) => [reference.id, reference]));
  for (const { id, hash, sourceHash } of projections) {
    const observed = observedById.get(id);
    if (!observed || sourceHash !== undefined && observed.hash !== sourceHash) continue;
    let task = tasks.get(id);
    if (observed.projection !== undefined && observed.projection !== hash && (!task || task.payloadHash !== hash)) {
      task = createTask(account, observed, 'upsert', task, references.get(id));
      tasks.set(id, task);
    }
    // Raw changes such as image edits must not upload unchanged calendar content.
    if (task?.operation === 'upsert' && !task.sent && !task.payloadHash && observed.projection === hash) {
      tasks.delete(id);
    } else if (task?.operation === 'upsert') task.payloadHash = hash;
    observed.projection = hash;
  }
  account.tasks = [...tasks.values()];
}
export const collectFeishuProjection = (account: FeishuAutoAccount, id: string, hash: string) => collectFeishuProjections(account, [{ id, hash }]);

export function acknowledgeFeishuTask(account: FeishuAutoAccount, sent: FeishuAutoTask, now: number): void {
  // A successful old response cannot consume a newer edit or delete intention.
  account.tasks = account.tasks.filter((task) => task.id !== sent.id || task.revision !== sent.revision);
  account.lastSuccessAt = now;
  account.error = undefined;
}

export const feishuRetryDelay = (attempts: number) => Math.min(300000, [5000, 30000, 120000][attempts - 1] || 300000);
