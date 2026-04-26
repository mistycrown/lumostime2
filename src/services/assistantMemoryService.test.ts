import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assistantMemoryService } from './assistantMemoryService';

type LocalStorageMock = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const createLocalStorageMock = (): LocalStorageMock => {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    }
  };
};

const reminderA = {
  id: 'reminder-a',
  type: 'self_followup' as const,
  dueAt: '2026-04-26T03:30:00.000Z',
  status: 'pending' as const,
  text: '收衣服',
  source: 'user' as const,
  createdAt: '2026-04-26T03:25:00.000Z'
};

const reminderB = {
  id: 'reminder-b',
  type: 'self_followup' as const,
  dueAt: '2026-04-26T04:00:00.000Z',
  status: 'pending' as const,
  text: '关窗',
  source: 'agent' as const,
  createdAt: '2026-04-26T03:40:00.000Z'
};

describe('assistantMemoryService', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true
    });
    vi.useRealTimers();
    assistantMemoryService.clearMemory();
  });

  it('replaceActiveReminders truly clears completed reminders', () => {
    assistantMemoryService.replaceActiveReminders([reminderA, reminderB]);
    expect(assistantMemoryService.getMemory().activeReminders).toHaveLength(2);

    assistantMemoryService.replaceActiveReminders([]);

    expect(assistantMemoryService.getMemory().activeReminders).toEqual([]);
  });

  it('replaceActiveReminders overwrites old reminder ids instead of merging stale entries', () => {
    assistantMemoryService.replaceActiveReminders([reminderA, reminderB]);
    assistantMemoryService.replaceActiveReminders([reminderB]);

    expect(assistantMemoryService.getMemory().activeReminders).toEqual([reminderB]);
  });
});
