/**
 * @file feishuAutoSyncStore.ts
 * @input Structured storage, persisted logs and account queue mutations.
 * @output Atomic log/outbox writes, durable settings and post-commit notifications.
 * @pos Local Feishu synchronization metadata; excluded from backups and cloud datasets.
 */
import { storageRepository, type StorageRepository, type StorageWrite } from '../repositories/storageRepository';
import type { Log } from '../types';
import { collectFeishuLogChanges, emptyFeishuAutoState, type FeishuAutoState } from '../utils/feishuAutoSyncState';
import { withFeishuLock } from './feishuSyncLock';

export const FEISHU_AUTO_STATE_KEY = 'feishu-auto-sync-v1';
export const FEISHU_AUTO_CHANGED_EVENT = 'lumostime:feishu-auto-changed';
export const FEISHU_DATA_SAVED_EVENT = 'lumostime:feishu-data-saved';
export const FEISHU_IGNORED_CATEGORIES_KEY = 'lumos_feishu_ignored_categories';
type Repository = Pick<StorageRepository, 'getMeta' | 'setBatch'>;
const replacements = new WeakSet<Log[]>();
let replacementPending = false;
export const markFeishuLogReplacement = (logs: Log[]) => { replacements.add(logs); replacementPending = true; };
export const isFeishuReplacementPending = () => replacementPending;
export const isFeishuLogReplacement = (logs: Log[]) => replacements.has(logs);
export function publishFeishuEvent(name = FEISHU_AUTO_CHANGED_EVENT): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event(name));
}

export class FeishuAutoSyncStore {
  constructor(private repository: Repository = storageRepository) {}

  async read(): Promise<FeishuAutoState> {
    const state = await this.repository.getMeta<FeishuAutoState>(FEISHU_AUTO_STATE_KEY);
    if (state && (state.version !== 1 || !Array.isArray(state.accounts))) throw new Error('自动同步任务数据无法读取。');
    return state || emptyFeishuAutoState();
  }

  update<T>(mutate: (state: FeishuAutoState) => T | Promise<T>, writes: StorageWrite[] = []): Promise<T> {
    return withFeishuLock('queue', async () => {
      const state = await this.read();
      const before = JSON.stringify(state);
      const result = await mutate(state);
      if (!writes.length && JSON.stringify(state) === before) return result;
      await this.repository.setBatch([...writes, { namespace: 'meta', key: FEISHU_AUTO_STATE_KEY, value: state }]);
      publishFeishuEvent();
      return result;
    });
  }

  async saveLogs(logs: Log[], replacement = isFeishuLogReplacement(logs)): Promise<void> {
    await this.update((state) => collectFeishuLogChanges(state, logs, replacement), [{ namespace: 'data', key: 'logs', value: logs }]);
    if (replacement) { replacements.delete(logs); replacementPending = false; }
  }
}

export const feishuAutoSyncStore = new FeishuAutoSyncStore();
export function readFeishuIgnoredCategories(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(FEISHU_IGNORED_CATEGORIES_KEY) || '[]');
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && /^[\w-]{1,128}$/.test(id)))].slice(0, 1000) : [];
  } catch { return []; }
}
