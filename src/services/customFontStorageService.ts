/**
 * @file customFontStorageService.ts
 * @description 自定义字体本地存储服务（IndexedDB）- 负责字体文件与元数据的持久化
 */

export type FontFormat = 'woff2' | 'woff' | 'ttf' | 'otf';

export interface StoredCustomFontRecord {
  id: string;
  displayName: string;
  familyName: string;
  fileName: string;
  format: FontFormat;
  size: number;
  createdAt: number;
  updatedAt: number;
  blob: Blob;
}

const DB_NAME = 'lumostime_custom_fonts';
const DB_VERSION = 1;
const STORE_NAME = 'font_files';

class CustomFontStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDatabase(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('当前环境不支持 IndexedDB'));
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error || new Error('IndexedDB 打开失败'));
      };
    });

    return this.dbPromise;
  }

  private withStore<T>(
    mode: IDBTransactionMode,
    executor: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: any) => void) => void
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await this.openDatabase();
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        executor(store, resolve, reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  async saveFont(record: StoredCustomFontRecord): Promise<void> {
    await this.withStore<void>('readwrite', (store, resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('保存字体失败'));
    });
  }

  async listFonts(): Promise<StoredCustomFontRecord[]> {
    return this.withStore<StoredCustomFontRecord[]>('readonly', (store, resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error || new Error('读取字体列表失败'));
    });
  }

  async getFont(fontId: string): Promise<StoredCustomFontRecord | null> {
    return this.withStore<StoredCustomFontRecord | null>('readonly', (store, resolve, reject) => {
      const request = store.get(fontId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('读取字体失败'));
    });
  }

  async deleteFont(fontId: string): Promise<void> {
    await this.withStore<void>('readwrite', (store, resolve, reject) => {
      const request = store.delete(fontId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('删除字体失败'));
    });
  }
}

export const customFontStorageService = new CustomFontStorageService();
