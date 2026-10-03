/**
 * @file storageRepository.ts
 * @input IndexedDB availability, localStorage fallback
 * @output Unified async storage repository for structured application data
 * @pos Repository (Persistence Infrastructure)
 * @description Provides a single async key-value storage abstraction backed by IndexedDB, with localStorage fallback for unsupported environments.
 * @updated 2026-10-03: Atomically saves data with synchronization metadata; fallback batches recover from a write-ahead journal.
 */
export type StorageNamespace = 'data' | 'meta';
export interface StorageWrite { namespace: StorageNamespace; key: string; value: unknown }

export interface AsyncStorageRepository {
  get<T>(namespace: StorageNamespace, key: string): Promise<T | null>;
  set<T>(namespace: StorageNamespace, key: string, value: T): Promise<void>;
  remove(namespace: StorageNamespace, key: string): Promise<void>;
  setBatch(writes: StorageWrite[]): Promise<void>;
}

const DB_NAME = 'lumostime_app_storage';
const DB_VERSION = 1;
const DATA_STORE = 'app_data';
const META_STORE = 'app_meta';
const LOCAL_FALLBACK_PREFIX = 'lumostime_repo';
const BATCH_JOURNAL_KEY = `${LOCAL_FALLBACK_PREFIX}:batch-journal`;

const buildFallbackKey = (namespace: StorageNamespace, key: string): string =>
  `${LOCAL_FALLBACK_PREFIX}:${namespace}:${key}`;

export class IndexedDbStorageRepository implements AsyncStorageRepository {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getStoreName(namespace: StorageNamespace): string {
    return namespace === 'data' ? DATA_STORE : META_STORE;
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(DATA_STORE)) {
          db.createObjectStore(DATA_STORE, { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error || new Error('Failed to open IndexedDB'));
      };
    });

    return this.dbPromise;
  }

  private async withStore<T>(
    namespace: StorageNamespace,
    mode: IDBTransactionMode,
    executor: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void
  ): Promise<T> {
    const db = await this.openDatabase();

    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(this.getStoreName(namespace), mode);
      const store = transaction.objectStore(this.getStoreName(namespace));
      let settled = false;
      let result: T;

      const rejectOnce = (reason?: unknown) => {
        if (settled) {
          return;
        }

        settled = true;
        reject(reason);
      };

      transaction.oncomplete = () => {
        if (settled) {
          return;
        }

        settled = true;
        resolve(result);
      };

      transaction.onerror = () => {
        rejectOnce(transaction.error || new Error(`IndexedDB transaction failed for "${namespace}"`));
      };

      transaction.onabort = () => {
        rejectOnce(transaction.error || new Error(`IndexedDB transaction aborted for "${namespace}"`));
      };

      executor(store, (value) => {
        result = value;
      }, rejectOnce);
    });
  }

  async get<T>(namespace: StorageNamespace, key: string): Promise<T | null> {
    return this.withStore<T | null>(namespace, 'readonly', (store, resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        resolve((request.result?.value as T | undefined) ?? null);
      };
      request.onerror = () => {
        reject(request.error || new Error(`Failed to read "${key}" from IndexedDB`));
      };
    });
  }

  async set<T>(namespace: StorageNamespace, key: string, value: T): Promise<void> {
    await this.withStore<void>(namespace, 'readwrite', (store, resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(request.error || new Error(`Failed to write "${key}" to IndexedDB`));
      };
    });
  }

  async remove(namespace: StorageNamespace, key: string): Promise<void> {
    await this.withStore<void>(namespace, 'readwrite', (store, resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(request.error || new Error(`Failed to delete "${key}" from IndexedDB`));
      };
    });
  }

  async setBatch(writes: StorageWrite[]): Promise<void> {
    if (!writes.length) return;
    const db = await this.openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([...new Set(writes.map((write) => this.getStoreName(write.namespace)))], 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error('Batch persistence failed'));
      try {
        for (const write of writes) transaction.objectStore(this.getStoreName(write.namespace)).put({ key: write.key, value: write.value });
      } catch (error) {
        // Synchronous structured-clone errors do not automatically abort earlier queued puts.
        transaction.abort();
        reject(error);
      }
    });
  }
}

export class LocalStorageFallbackRepository implements AsyncStorageRepository {
  private recoverBatch(): void {
    const raw = localStorage.getItem(BATCH_JOURNAL_KEY);
    if (!raw) return;
    const writes = JSON.parse(raw) as StorageWrite[];
    if (!Array.isArray(writes) || writes.some((write) => !write || !['data', 'meta'].includes(write.namespace) || typeof write.key !== 'string')) {
      throw new Error('Invalid persistence journal');
    }
    for (const write of writes) localStorage.setItem(this.buildKey(write.namespace, write.key), JSON.stringify(write.value));
    localStorage.removeItem(BATCH_JOURNAL_KEY);
  }
  private buildKey(namespace: StorageNamespace, key: string): string {
    return buildFallbackKey(namespace, key);
  }

  async get<T>(namespace: StorageNamespace, key: string): Promise<T | null> {
    this.recoverBatch();
    const raw = localStorage.getItem(this.buildKey(namespace, key));
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error(`[storageRepository] Failed to parse fallback storage key "${key}"`, error);
      return null;
    }
  }

  async set<T>(namespace: StorageNamespace, key: string, value: T): Promise<void> {
    this.recoverBatch();
    localStorage.setItem(this.buildKey(namespace, key), JSON.stringify(value));
  }

  async remove(namespace: StorageNamespace, key: string): Promise<void> {
    this.recoverBatch();
    localStorage.removeItem(this.buildKey(namespace, key));
  }

  async setBatch(writes: StorageWrite[]): Promise<void> {
    this.recoverBatch();
    // Persist the whole intent before touching either dataset. Readers finish interrupted batches.
    localStorage.setItem(BATCH_JOURNAL_KEY, JSON.stringify(writes));
    this.recoverBatch();
  }
}

export class StorageRepository {
  private backend: AsyncStorageRepository | null = null;

  private getBackend(): AsyncStorageRepository {
    if (this.backend) {
      return this.backend;
    }

    if (typeof indexedDB !== 'undefined') {
      this.backend = new IndexedDbStorageRepository();
      return this.backend;
    }

    console.warn('[storageRepository] IndexedDB unavailable, falling back to localStorage');
    this.backend = new LocalStorageFallbackRepository();
    return this.backend;
  }

  private async runWithFallback<T>(operation: (backend: AsyncStorageRepository) => Promise<T>): Promise<T> {
    const backend = this.getBackend();

    try {
      return await operation(backend);
    } catch (error) {
      if (backend instanceof LocalStorageFallbackRepository) {
        throw error;
      }

      console.error('[storageRepository] IndexedDB backend failed, switching to localStorage fallback', error);
      this.backend = new LocalStorageFallbackRepository();
      return operation(this.backend);
    }
  }

  private readFallbackValue<T>(namespace: StorageNamespace, key: string): T | null {
    const raw = localStorage.getItem(buildFallbackKey(namespace, key));
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error(`[storageRepository] Failed to parse recoverable fallback key "${key}"`, error);
      return null;
    }
  }

  private clearFallbackValue(namespace: StorageNamespace, key: string): void {
    localStorage.removeItem(buildFallbackKey(namespace, key));
  }

  private async getWithRecovery<T>(namespace: StorageNamespace, key: string): Promise<T | null> {
    const value = await this.runWithFallback((backend) => backend.get<T>(namespace, key));
    if (value !== null) {
      return value;
    }

    if (this.backend instanceof LocalStorageFallbackRepository) {
      return null;
    }

    const fallbackValue = this.readFallbackValue<T>(namespace, key);
    if (fallbackValue === null) {
      return null;
    }

    await this.runWithFallback((backend) => backend.set(namespace, key, fallbackValue));
    if (!(this.backend instanceof LocalStorageFallbackRepository)) {
      this.clearFallbackValue(namespace, key);
    }
    return fallbackValue;
  }

  async getData<T>(key: string): Promise<T | null> {
    return this.getWithRecovery('data', key);
  }

  async setData<T>(key: string, value: T): Promise<void> {
    await this.runWithFallback((backend) => backend.set('data', key, value));
  }

  async removeData(key: string): Promise<void> {
    await this.runWithFallback((backend) => backend.remove('data', key));
  }

  async getMeta<T>(key: string): Promise<T | null> {
    return this.getWithRecovery('meta', key);
  }

  async setMeta<T>(key: string, value: T): Promise<void> {
    await this.runWithFallback((backend) => backend.set('meta', key, value));
  }

  async removeMeta(key: string): Promise<void> {
    await this.runWithFallback((backend) => backend.remove('meta', key));
  }

  async setBatch(writes: StorageWrite[]): Promise<void> {
    // Never split an existing IndexedDB dataset across backends after a failed transaction.
    await this.getBackend().setBatch(writes);
  }
}

export const storageRepository = new StorageRepository();
