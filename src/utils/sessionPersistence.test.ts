/**
 * @file sessionPersistence.test.ts
 * @updated 2026-11-01: Covers local attachment restoration and cleanup protection.
 * @input Session persistence helpers and a mocked localStorage implementation
 * @output Regression coverage for restoring running timers after process restarts
 * @pos Test
 * @description Verifies that persisted active sessions are sanitized, deduplicated, and cleared safely.
 * @updated 2026-04-14: Added tests for active-session timer persistence helpers.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { USER_DATA_KEYS } from '../constants/storageKeys';
import {
  clearPersistedActiveSessions,
  getActiveSessionImageFiles,
  loadPersistedActiveSessions,
  savePersistedActiveSessions
} from './sessionPersistence';

const createLocalStorageMock = () => {
  const store = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => (store.has(key) ? store.get(key)! : null)),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    })
  };
};

describe('sessionPersistence', () => {
  const originalLocalStorage = globalThis.localStorage;
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
      writable: true
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
      writable: true
    });
  });

  test('loads only valid persisted sessions and sorts them by start time', () => {
    localStorageMock.setItem(
      USER_DATA_KEYS.ACTIVE_SESSIONS,
      JSON.stringify([
        {
          id: 'later',
          activityId: 'activity-2',
          categoryId: 'category-1',
          activityName: 'Later Session',
          activityIcon: '📚',
          startTime: 200
        },
        {
          id: 'invalid',
          activityId: 'activity-3',
          categoryId: 'category-1',
          activityName: 'Broken Session',
          activityIcon: '',
          startTime: 300
        },
        {
          id: 'earlier',
          activityId: 'activity-1',
          categoryId: 'category-1',
          activityName: 'Earlier Session',
          activityIcon: '🎯',
          startTime: 100,
          source: 'app'
        }
      ])
    );

    expect(loadPersistedActiveSessions()).toEqual([
      {
        id: 'earlier',
        activityId: 'activity-1',
        categoryId: 'category-1',
        activityName: 'Earlier Session',
        activityIcon: '🎯',
        startTime: 100,
        source: 'app'
      },
      {
        id: 'later',
        activityId: 'activity-2',
        categoryId: 'category-1',
        activityName: 'Later Session',
        activityIcon: '📚',
        startTime: 200
      }
    ]);
  });

  test('restores photos per session and protects originals and thumbnails until cleared', () => {
    const session = { id: 'timer', activityId: 'work', categoryId: 'category', activityName: 'Work', activityIcon: 'W', startTime: 100 };
    savePersistedActiveSessions([
      { ...session, images: ['first.jpg', 'second.png'] },
      { ...session, id: 'other', images: ['third.webp'] }
    ]);
    expect(loadPersistedActiveSessions().map((item) => item.images)).toEqual([
      ['first.jpg', 'second.png'], ['third.webp']
    ]);
    expect([...getActiveSessionImageFiles()]).toEqual([
      'first.jpg', 'thumb_first.jpg', 'second.png', 'thumb_second.png', 'third.webp', 'thumb_third.webp'
    ]);
    clearPersistedActiveSessions();
    expect(getActiveSessionImageFiles().size).toBe(0);
  });

  test('deduplicates sessions on save and clears them cleanly', () => {
    savePersistedActiveSessions([
      {
        id: 'session-1',
        activityId: 'activity-1',
        categoryId: 'category-1',
        activityName: 'First version',
        activityIcon: '🎯',
        startTime: 100
      },
      {
        id: 'session-1',
        activityId: 'activity-1',
        categoryId: 'category-1',
        activityName: 'Updated version',
        activityIcon: '🎯',
        startTime: 100,
        note: 'keep latest'
      }
    ]);

    expect(loadPersistedActiveSessions()).toEqual([
      {
        id: 'session-1',
        activityId: 'activity-1',
        categoryId: 'category-1',
        activityName: 'Updated version',
        activityIcon: '🎯',
        startTime: 100,
        note: 'keep latest'
      }
    ]);

    expect(clearPersistedActiveSessions()).toBe(true);
    expect(loadPersistedActiveSessions()).toEqual([]);
  });
});
