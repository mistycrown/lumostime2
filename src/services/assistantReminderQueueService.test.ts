/**
 * @file assistantReminderQueueService.test.ts
 * @input Reminder queue operations against mocked local storage
 * @output Regression coverage for due-reminder retry gating and queue deletion behavior
 * @pos Service Tests (Assistant Reminders)
 * @description Verifies that failed reminder dispatches stay pending for at least one minute before retry and that successful dispatch completion still removes the reminder from the queue.
 *
 * @updated 2026-05-09: Added coverage for the one-minute failed-dispatch retry window and successful reminder removal.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./assistantMemoryService', () => ({
  assistantMemoryService: {
    replaceActiveReminders: vi.fn()
  }
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false)
  }
}));

vi.mock('../plugins/AssistantAgentPlugin', () => ({
  default: {
    syncNativeReminders: vi.fn()
  }
}));

import { assistantReminderQueueService } from './assistantReminderQueueService';

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

describe('assistantReminderQueueService', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true
    });
    vi.clearAllMocks();
    assistantReminderQueueService.clearQueue();
  });

  it('delays retrying a failed due reminder until at least one minute after the last attempt', () => {
    assistantReminderQueueService.enqueueReminder({
      id: 'reminder-1',
      type: 'self_followup',
      dueAt: '2026-05-09T07:00:00.000Z',
      status: 'pending',
      text: 'check back',
      source: 'agent',
      createdAt: '2026-05-09T06:50:00.000Z',
      dispatchAttemptCount: 1,
      lastDispatchAttemptAt: '2026-05-09T07:00:30.000Z'
    });

    const dueAtThirtySeconds = assistantReminderQueueService.listDueReminders(new Date('2026-05-09T07:01:00.000Z'));
    const dueAtSixtySeconds = assistantReminderQueueService.listDueReminders(new Date('2026-05-09T07:01:30.000Z'));

    expect(dueAtThirtySeconds).toEqual([]);
    expect(dueAtSixtySeconds).toHaveLength(1);
    expect(dueAtSixtySeconds[0].id).toBe('reminder-1');
  });

  it('removes a reminder from the queue when it is marked as dispatched', () => {
    assistantReminderQueueService.enqueueReminder({
      id: 'reminder-2',
      type: 'self_followup',
      dueAt: '2026-05-09T08:00:00.000Z',
      status: 'pending',
      text: 'done follow-up',
      source: 'agent',
      createdAt: '2026-05-09T07:55:00.000Z'
    });

    const removed = assistantReminderQueueService.markDispatched('reminder-2', '2026-05-09T08:00:05.000Z');

    expect(removed).toMatchObject({
      id: 'reminder-2',
      status: 'done',
      lastDispatchedAt: '2026-05-09T08:00:05.000Z'
    });
    expect(assistantReminderQueueService.listReminders()).toEqual([]);
  });
});
