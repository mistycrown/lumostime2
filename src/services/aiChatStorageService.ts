/**
 * @file aiChatStorageService.ts
 * @input AI chat sessions and assistant background history JSON snapshots
 * @output Synchronous cached storage with IndexedDB persistence and localStorage fallback
 * @pos Service (AI Chat Storage)
 * @description Migrates large AI chat records out of localStorage without changing the backup payload shape or blocking first render.
 * @updated 2026-09-20: Exposes completion state so consumers can avoid persisting pre-hydration fallback sessions during startup.
 * @updated 2026-09-14: Added IndexedDB-backed chat/history persistence with idempotent legacy migration and fallback handling.
 */

export const AI_CHAT_STORAGE_READY_EVENT = 'lumostime:ai-chat-storage-ready';
export const AI_CHAT_STORAGE_SIGNAL_KEY = 'lumostime_ai_chat_storage_signal_v1';

const DATABASE_NAME = 'lumostime_ai_storage_v1';
const DATABASE_VERSION = 1;
const SESSIONS_STORE = 'chat_sessions';
const HISTORY_STORE = 'background_history';
const SESSIONS_KEY = 'lumostime_ai_chat_sessions_v1';
const HISTORY_KEY = 'lumostime_assistant_background_call_history_v1';

type StorageRecord = unknown[];

let sessionsCache: StorageRecord | undefined;
let historyCache: StorageRecord | undefined;
let indexedDbReady = false;
let initializationStarted = false;
let initializationCompleted = false;
let initializationPromise: Promise<void> | undefined;
let databasePromise: Promise<IDBDatabase> | undefined;
let fallbackWarningShown = false;
let cacheStorageRef: unknown;

const refreshCacheStorageReference = (): void => {
  const currentStorage = typeof localStorage === 'undefined' ? undefined : localStorage;
  if (cacheStorageRef === currentStorage) {
    return;
  }

  cacheStorageRef = currentStorage;
  sessionsCache = undefined;
  historyCache = undefined;
};

const parseLegacy = (key: string): StorageRecord => {
  const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const notifyReady = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AI_CHAT_STORAGE_READY_EVENT));
  }
};

const canUseIndexedDb = (): boolean => (
  typeof indexedDB !== 'undefined'
  && typeof window !== 'undefined'
);

const openDatabase = (): Promise<IDBDatabase> => {
  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SESSIONS_STORE)) {
        database.createObjectStore(SESSIONS_STORE);
      }
      if (!database.objectStoreNames.contains(HISTORY_STORE)) {
        database.createObjectStore(HISTORY_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      databasePromise = undefined;
      reject(request.error || new Error('Failed to open AI chat database'));
    };
  });

  return databasePromise;
};

const readStore = (database: IDBDatabase, storeName: string): Promise<StorageRecord | undefined> => new Promise((resolve, reject) => {
  const transaction = database.transaction(storeName, 'readonly');
  const request = transaction.objectStore(storeName).get('current');
  request.onsuccess = () => {
    const value = request.result;
    resolve(Array.isArray(value) ? value : undefined);
  };
  request.onerror = () => reject(request.error || new Error(`Failed to read ${storeName}`));
});

const writeStores = (
  database: IDBDatabase,
  sessions: StorageRecord,
  history: StorageRecord
): Promise<void> => new Promise((resolve, reject) => {
  const transaction = database.transaction([SESSIONS_STORE, HISTORY_STORE], 'readwrite');
  transaction.objectStore(SESSIONS_STORE).put(sessions, 'current');
  transaction.objectStore(HISTORY_STORE).put(history, 'current');
  transaction.oncomplete = () => resolve();
  transaction.onerror = () => reject(transaction.error || new Error('Failed to write AI chat database'));
  transaction.onabort = () => reject(transaction.error || new Error('AI chat database transaction aborted'));
});

const persistLegacy = (key: string, value: StorageRecord): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    if (!fallbackWarningShown) {
      fallbackWarningShown = true;
      console.warn('[aiChatStorageService] localStorage fallback is full', error);
    }
  }
};

const persistIndexedDb = (storeName: string, value: StorageRecord): void => {
  if (!indexedDbReady || !initializationPromise) {
    return;
  }

  void initializationPromise.then(async () => {
    const database = await openDatabase();
    const transaction = database.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).put(value, 'current');
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error(`Failed to persist ${storeName}`));
      transaction.onabort = () => reject(transaction.error || new Error(`Aborted ${storeName} persistence`));
    });
    localStorage.setItem(AI_CHAT_STORAGE_SIGNAL_KEY, String(Date.now()));
  }).catch((error) => {
    indexedDbReady = false;
    persistLegacy(storeName === SESSIONS_STORE ? SESSIONS_KEY : HISTORY_KEY, value);
    console.warn('[aiChatStorageService] IndexedDB write failed; retaining local fallback', error);
  });
};

const initialize = async (): Promise<void> => {
  if (initializationStarted) {
    return initializationPromise;
  }

  initializationStarted = true;
  sessionsCache = sessionsCache || parseLegacy(SESSIONS_KEY);
  historyCache = historyCache || parseLegacy(HISTORY_KEY);

  if (!canUseIndexedDb()) {
    initializationCompleted = true;
    notifyReady();
    return;
  }

  try {
    const database = await openDatabase();
    const storedSessions = await readStore(database, SESSIONS_STORE);
    const storedHistory = await readStore(database, HISTORY_STORE);
    const sessions = storedSessions ?? sessionsCache ?? [];
    const history = storedHistory ?? historyCache ?? [];

    if ((sessionsCache?.length || 0) > 0 && sessions.length === 0) {
      throw new Error('Refusing to replace non-empty legacy chat sessions with an empty IndexedDB store');
    }
    if ((historyCache?.length || 0) > 0 && history.length === 0) {
      throw new Error('Refusing to replace non-empty legacy background history with an empty IndexedDB store');
    }

    await writeStores(database, sessions, history);
    sessionsCache = sessions;
    historyCache = history;
    indexedDbReady = true;
    localStorage.removeItem(SESSIONS_KEY);
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    if (!fallbackWarningShown) {
      fallbackWarningShown = true;
      console.warn('[aiChatStorageService] IndexedDB unavailable; using localStorage fallback', error);
    }
    indexedDbReady = false;
  }

  initializationCompleted = true;
  notifyReady();
};

export const aiChatStorageService = {
  initialize(): Promise<void> {
    if (!initializationPromise) {
      initializationPromise = initialize();
    }
    return initializationPromise;
  },

  getSessions(): StorageRecord {
    refreshCacheStorageReference();
    if (!sessionsCache) {
      sessionsCache = parseLegacy(SESSIONS_KEY);
    }
    return sessionsCache;
  },

  setSessions(value: StorageRecord): void {
    refreshCacheStorageReference();
    sessionsCache = value;
    if (indexedDbReady) {
      persistIndexedDb(SESSIONS_STORE, value);
    } else {
      persistLegacy(SESSIONS_KEY, value);
    }
    void this.initialize();
  },

  getBackgroundHistory(): StorageRecord {
    refreshCacheStorageReference();
    if (!historyCache) {
      historyCache = parseLegacy(HISTORY_KEY);
    }
    return historyCache;
  },

  setBackgroundHistory(value: StorageRecord): void {
    refreshCacheStorageReference();
    historyCache = value;
    if (indexedDbReady) {
      persistIndexedDb(HISTORY_STORE, value);
    } else {
      persistLegacy(HISTORY_KEY, value);
    }
    void this.initialize();
  },

  isIndexedDbReady(): boolean {
    return indexedDbReady;
  },

  isReady(): boolean {
    return initializationCompleted;
  }
};
