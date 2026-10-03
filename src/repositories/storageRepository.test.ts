import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageRepository } from './storageRepository';

type LocalStorageMock = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const createLocalStorageMock = (): LocalStorageMock => {
  const store = new Map<string, string>();

  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    }
  };
};

describe('StorageRepository', () => {
  let localStorageMock: LocalStorageMock;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses localStorage fallback when IndexedDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined);
    const repository = new StorageRepository();

    await repository.setData('logs', [{ id: 'log-1' }]);
    await repository.setMeta('migration', { done: true });

    await expect(repository.getData('logs')).resolves.toEqual([{ id: 'log-1' }]);
    await expect(repository.getMeta('migration')).resolves.toEqual({ done: true });
    expect(localStorageMock.getItem('lumostime_repo:data:logs')).toBe(JSON.stringify([{ id: 'log-1' }]));
    expect(localStorageMock.getItem('lumostime_repo:meta:migration')).toBe(JSON.stringify({ done: true }));
  });

  it('switches to localStorage fallback when IndexedDB open fails at runtime', async () => {
    const open = vi.fn(() => {
      const request: {
        error?: Error;
        onerror?: () => void;
        onsuccess?: () => void;
        onupgradeneeded?: () => void;
      } = {};

      setTimeout(() => {
        request.error = new Error('IndexedDB open failed');
        request.onerror?.();
      }, 0);

      return request;
    });

    vi.stubGlobal('indexedDB', { open });
    const repository = new StorageRepository();

    await repository.setData('todos', [{ id: 'todo-1' }]);

    expect(open).toHaveBeenCalledOnce();
    expect(localStorageMock.getItem('lumostime_repo:data:todos')).toBe(JSON.stringify([{ id: 'todo-1' }]));
    await expect(repository.getData('todos')).resolves.toEqual([{ id: 'todo-1' }]);
  });

  it('recovers both logs and the outbox after a fallback batch is interrupted', async () => {
    vi.stubGlobal('indexedDB', undefined);
    const repository = new StorageRepository();
    const setItem = localStorageMock.setItem;
    let interrupted = false;
    localStorageMock.setItem = (key, value) => {
      if (key === 'lumostime_repo:meta:outbox' && !interrupted) { interrupted = true; throw new Error('power loss'); }
      setItem(key, value);
    };
    await expect(repository.setBatch([
      { namespace: 'data', key: 'logs', value: [{ id: 'new-log' }] },
      { namespace: 'meta', key: 'outbox', value: { revision: 2 } }
    ])).rejects.toThrow('power loss');
    expect(localStorageMock.getItem('lumostime_repo:batch-journal')).not.toBeNull();
    const restarted = new StorageRepository();
    await expect(restarted.getData('logs')).resolves.toEqual([{ id: 'new-log' }]);
    await expect(restarted.getMeta('outbox')).resolves.toEqual({ revision: 2 });
    expect(localStorageMock.getItem('lumostime_repo:batch-journal')).toBeNull();
  });

  it('does not move an atomic IndexedDB commit into a different backend after failure', async () => {
    const open = vi.fn(() => {
      const request: { error?: Error; onerror?: () => void } = {};
      setTimeout(() => { request.error = new Error('database unavailable'); request.onerror?.(); }, 0);
      return request;
    });
    vi.stubGlobal('indexedDB', { open });
    const repository = new StorageRepository();
    await expect(repository.setBatch([{ namespace: 'data', key: 'logs', value: [] }])).rejects.toThrow('database unavailable');
    expect(localStorageMock.getItem('lumostime_repo:data:logs')).toBeNull();
  });
});
