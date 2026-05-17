/**
 * @file assistantReminderQueueService.test.ts
 * @input Reminder queue operations against mocked local storage
 * @output Regression coverage for due-reminder retry gating and queue deletion behavior
 * @pos Service Tests (Assistant Reminders)
 * @description Verifies that failed reminder dispatches stay pending for at least one minute before retry and that successful dispatch completion still removes the reminder from the queue.
 *
 * @updated 2026-05-17: Added duplicate agent-reminder coverage so identical pending follow-ups collapse to one stored reminder instead of firing multiple times at the same due timestamp.
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

  it('returns the existing pending reminder when an identical agent reminder is enqueued again', () => {
    const firstReminder = assistantReminderQueueService.enqueueReminder({
      id: 'reminder-3',
      type: 'self_followup',
      dueAt: '2026-05-17T02:00:00.000Z',
      status: 'pending',
      text: 'check literature progress',
      source: 'agent',
      createdAt: '2026-05-17T01:50:00.000Z'
    });

    const duplicateReminder = assistantReminderQueueService.enqueueReminder({
      id: 'reminder-4',
      type: 'self_followup',
      dueAt: '2026-05-17T02:00:00.000Z',
      status: 'pending',
      text: 'check literature progress',
      source: 'agent',
      createdAt: '2026-05-17T01:55:00.000Z'
    });

    expect(duplicateReminder.id).toBe(firstReminder.id);
    expect(assistantReminderQueueService.listReminders()).toHaveLength(1);
    expect(assistantReminderQueueService.listReminders()[0].id).toBe(firstReminder.id);
  });

  it('collapses duplicate pending reminders when saving an existing queue snapshot', () => {
    assistantReminderQueueService.saveReminders([
      {
        id: 'reminder-5',
        type: 'self_followup',
        dueAt: '2026-05-17T02:00:00.000Z',
        status: 'pending',
        text: 'same reminder',
        source: 'agent',
        createdAt: '2026-05-17T01:50:00.000Z'
      },
      {
        id: 'reminder-6',
        type: 'self_followup',
        dueAt: '2026-05-17T02:00:00.000Z',
        status: 'pending',
        text: 'same reminder',
        source: 'agent',
        createdAt: '2026-05-17T01:51:00.000Z'
      }
    ]);

    const reminders = assistantReminderQueueService.listReminders();
    expect(reminders).toHaveLength(1);
    expect(reminders[0].id).toBe('reminder-5');
  });
});
