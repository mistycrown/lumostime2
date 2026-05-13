/**
 * @file assistantScheduledTaskService.test.ts
 * @input Scheduled-task template operations against mocked local storage and reminder queue state
 * @output Regression coverage for next-trigger calculation, monthly skipping, due-task materialization, and linked reminder cleanup
 * @pos Service Tests (Assistant Scheduled Tasks)
 * @description Verifies that recurring assistant task templates reuse todo recurrence rules correctly and always keep one next native reminder seeded per enabled task.
 *
 * @updated 2026-05-13: Added monthly multi-day and month-end fallback coverage so scheduled tasks can target multiple month dates while limiting short-month fallback to explicit day 31 rules.
 * @updated 2026-05-12: Added regression coverage for atomic reminder consumption so one scheduled task cannot keep multiple pending reminders after a successful trigger handoff.
 * @updated 2026-05-10: Added regression coverage for stale-linked reminder healing and duplicate pending-reminder collapse.
 * @updated 2026-05-09: Added first-pass coverage for recurring assistant scheduled-task persistence and reminder materialization.
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
import { assistantScheduledTaskService } from './assistantScheduledTaskService';

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

describe('assistantScheduledTaskService', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true
    });
    vi.clearAllMocks();
    assistantReminderQueueService.clearQueue();
    assistantScheduledTaskService.clearAll();
  });

  it('computes the next weekly trigger using the shared recurrence rule', () => {
    const result = assistantScheduledTaskService.computeNextTriggerAt(
      {
        frequency: 'weekly',
        startDate: '2026-05-01',
        weekdays: [1]
      },
      '08:00',
      new Date('2026-05-09T00:00:00.000Z')
    );

    expect(result).toBe('2026-05-11T00:00:00.000Z');
  });

  it('keeps legacy monthly 31st schedules skipping short months when fallback is off', () => {
    const result = assistantScheduledTaskService.computeNextTriggerAt(
      {
        frequency: 'monthly',
        startDate: '2026-01-31',
        monthDays: [31]
      },
      '08:00',
      new Date('2026-02-01T00:00:00.000Z')
    );

    expect(result).toBe('2026-03-31T00:00:00.000Z');
  });

  it('lets monthly 31st schedules fall back to the short month end when explicitly enabled', () => {
    const result = assistantScheduledTaskService.computeNextTriggerAt(
      {
        frequency: 'monthly',
        startDate: '2026-01-31',
        monthDays: [31],
        fallbackToMonthEnd: true
      },
      '08:00',
      new Date('2026-02-01T00:00:00.000Z')
    );

    expect(result).toBe('2026-02-28T00:00:00.000Z');
  });

  it('picks the nearest future occurrence from multiple monthly days', () => {
    const result = assistantScheduledTaskService.computeNextTriggerAt(
      {
        frequency: 'monthly',
        startDate: '2026-01-01',
        monthDays: [1, 15, 31],
        fallbackToMonthEnd: true
      },
      '08:00',
      new Date('2026-02-16T00:00:00.000Z')
    );

    expect(result).toBe('2026-02-28T00:00:00.000Z');
  });

  it('seeds the next reminder for an enabled scheduled task immediately', () => {
    const tasks = assistantScheduledTaskService.saveTasks([
      {
        id: 'task-1',
        text: '每周一提醒我交周报',
        time: '08:00',
        recurrenceRule: {
          frequency: 'weekly',
          startDate: '2026-05-01',
          weekdays: [1]
        },
        enabled: true,
        createdAt: '2026-05-09T00:00:00.000Z',
        updatedAt: '2026-05-09T00:00:00.000Z',
        nextTriggerAt: '2026-05-11T00:00:00.000Z'
      }
    ]);

    const result = assistantScheduledTaskService.syncScheduledTaskReminders(new Date('2026-05-09T01:00:00.000Z'));

    expect(tasks).toHaveLength(1);
    expect(result.createdReminders).toHaveLength(1);
    expect(result.createdReminders[0]).toMatchObject({
      text: '每周一提醒我交周报',
      dueAt: '2026-05-11T00:00:00.000Z',
      scheduledTaskId: 'task-1'
    });
    expect(assistantReminderQueueService.listReminders()).toHaveLength(1);
    expect(result.tasks[0].pendingReminderId).toBe(result.createdReminders[0].id);
    expect(result.tasks[0].nextTriggerAt).toBe('2026-05-11T00:00:00.000Z');
  });

  it('advances to the following occurrence and seeds a new reminder after the previous one is consumed', () => {
    assistantScheduledTaskService.saveTasks([
      {
        id: 'task-1',
        text: '每周一提醒我交周报',
        time: '08:00',
        recurrenceRule: {
          frequency: 'weekly',
          startDate: '2026-05-01',
          weekdays: [1]
        },
        enabled: true,
        createdAt: '2026-05-09T00:00:00.000Z',
        updatedAt: '2026-05-09T00:00:00.000Z',
        nextTriggerAt: '2026-05-11T00:00:00.000Z',
        pendingReminderId: 'reminder-1'
      }
    ]);
    assistantReminderQueueService.saveReminders([]);

    const result = assistantScheduledTaskService.syncScheduledTaskReminders(new Date('2026-05-11T00:05:00.000Z'));

    expect(result.createdReminders).toHaveLength(1);
    expect(result.createdReminders[0].dueAt).toBe('2026-05-18T00:00:00.000Z');
    expect(result.tasks[0].nextTriggerAt).toBe('2026-05-18T00:00:00.000Z');
    expect(result.tasks[0].pendingReminderId).toBe(result.createdReminders[0].id);
  });

  it('recreates the same pending occurrence instead of advancing early when a future linked reminder disappears', () => {
    assistantScheduledTaskService.saveTasks([
      {
        id: 'task-1',
        text: '姣忓懆涓€鎻愰啋鎴戜氦鍛ㄦ姤',
        time: '08:00',
        recurrenceRule: {
          frequency: 'weekly',
          startDate: '2026-05-01',
          weekdays: [1]
        },
        enabled: true,
        createdAt: '2026-05-09T00:00:00.000Z',
        updatedAt: '2026-05-09T00:00:00.000Z',
        nextTriggerAt: '2026-05-11T00:00:00.000Z',
        pendingReminderId: 'reminder-missing'
      }
    ]);
    assistantReminderQueueService.saveReminders([]);

    const result = assistantScheduledTaskService.syncScheduledTaskReminders(new Date('2026-05-10T00:05:00.000Z'));

    expect(result.createdReminders).toHaveLength(1);
    expect(result.createdReminders[0].dueAt).toBe('2026-05-11T00:00:00.000Z');
    expect(result.tasks[0].nextTriggerAt).toBe('2026-05-11T00:00:00.000Z');
    expect(result.tasks[0].pendingReminderId).toBe(result.createdReminders[0].id);
  });

  it('keeps only the earliest pending reminder when duplicate scheduled-task reminders exist', () => {
    assistantReminderQueueService.saveReminders([
      {
        id: 'reminder-1',
        type: 'self_followup',
        dueAt: '2026-05-10T01:00:00.000Z',
        status: 'pending',
        text: '姣忓ぉ鏃╀笂涔濈偣鎻愰啋鎴戣捣搴?',
        scheduledTaskId: 'task-1',
        source: 'system',
        createdAt: '2026-05-09T00:00:00.000Z'
      },
      {
        id: 'reminder-2',
        type: 'self_followup',
        dueAt: '2026-05-12T01:00:00.000Z',
        status: 'pending',
        text: '姣忓ぉ鏃╀笂涔濈偣鎻愰啋鎴戣捣搴?',
        scheduledTaskId: 'task-1',
        source: 'system',
        createdAt: '2026-05-09T00:01:00.000Z'
      },
      {
        id: 'reminder-3',
        type: 'self_followup',
        dueAt: '2026-05-14T01:00:00.000Z',
        status: 'pending',
        text: '姣忓ぉ鏃╀笂涔濈偣鎻愰啋鎴戣捣搴?',
        scheduledTaskId: 'task-1',
        source: 'system',
        createdAt: '2026-05-09T00:02:00.000Z'
      }
    ]);
    assistantScheduledTaskService.saveTasks([
      {
        id: 'task-1',
        text: '姣忓ぉ鏃╀笂涔濈偣鎻愰啋鎴戣捣搴?',
        time: '09:00',
        recurrenceRule: {
          frequency: 'daily',
          startDate: '2026-05-10'
        },
        enabled: true,
        createdAt: '2026-05-09T00:00:00.000Z',
        updatedAt: '2026-05-09T00:00:00.000Z',
        nextTriggerAt: '2026-05-14T01:00:00.000Z',
        pendingReminderId: 'reminder-3'
      }
    ]);

    const result = assistantScheduledTaskService.syncScheduledTaskReminders(new Date('2026-05-10T01:26:00.000Z'));

    expect(result.createdReminders).toEqual([]);
    expect(result.tasks[0].pendingReminderId).toBe('reminder-1');
    expect(result.tasks[0].nextTriggerAt).toBe('2026-05-10T01:00:00.000Z');
    expect(assistantReminderQueueService.listReminders().map((reminder) => reminder.id)).toEqual(['reminder-1']);
  });

  it('removes a linked pending reminder when the scheduled task is deleted', () => {
    assistantReminderQueueService.enqueueReminder({
      id: 'reminder-1',
      type: 'self_followup',
      dueAt: '2026-05-11T00:00:00.000Z',
      status: 'pending',
      text: '每周一提醒我交周报',
      scheduledTaskId: 'task-1',
      source: 'system',
      createdAt: '2026-05-10T00:00:00.000Z'
    });

    assistantScheduledTaskService.saveTasks([
      {
        id: 'task-1',
        text: '每周一提醒我交周报',
        time: '08:00',
        recurrenceRule: {
          frequency: 'weekly',
          startDate: '2026-05-01',
          weekdays: [1]
        },
        enabled: true,
        createdAt: '2026-05-09T00:00:00.000Z',
        updatedAt: '2026-05-09T00:00:00.000Z',
        nextTriggerAt: '2026-05-18T00:00:00.000Z',
        pendingReminderId: 'reminder-1'
      }
    ]);

    const removed = assistantScheduledTaskService.removeTask('task-1');

    expect(removed?.id).toBe('task-1');
    expect(assistantScheduledTaskService.listTasks()).toEqual([]);
    expect(assistantReminderQueueService.listReminders()).toEqual([]);
  });

  it('removes the previous reminder before seeding the next one for the same scheduled task', () => {
    assistantReminderQueueService.saveReminders([
      {
        id: 'reminder-1',
        type: 'self_followup',
        dueAt: '2026-05-11T00:00:00.000Z',
        status: 'pending',
        text: '每周一提醒我交周报',
        scheduledTaskId: 'task-1',
        source: 'system',
        createdAt: '2026-05-09T00:00:00.000Z'
      },
      {
        id: 'reminder-duplicate',
        type: 'self_followup',
        dueAt: '2026-05-11T00:00:00.000Z',
        status: 'pending',
        text: '每周一提醒我交周报',
        scheduledTaskId: 'task-1',
        source: 'system',
        createdAt: '2026-05-09T00:01:00.000Z'
      }
    ]);

    assistantScheduledTaskService.saveTasks([
      {
        id: 'task-1',
        text: '每周一提醒我交周报',
        time: '08:00',
        recurrenceRule: {
          frequency: 'weekly',
          startDate: '2026-05-01',
          weekdays: [1]
        },
        enabled: true,
        createdAt: '2026-05-09T00:00:00.000Z',
        updatedAt: '2026-05-09T00:00:00.000Z',
        nextTriggerAt: '2026-05-11T00:00:00.000Z',
        pendingReminderId: 'reminder-1'
      }
    ]);

    const result = assistantScheduledTaskService.consumeTriggeredReminder(
      'reminder-1',
      '2026-05-11T00:05:00.000Z'
    );

    expect(result.removedReminderIds).toEqual(['reminder-1', 'reminder-duplicate']);
    expect(result.createdReminders).toHaveLength(1);
    expect(result.createdReminders[0].dueAt).toBe('2026-05-18T00:00:00.000Z');
    expect(result.tasks[0].pendingReminderId).toBe(result.createdReminders[0].id);
    expect(result.tasks[0].nextTriggerAt).toBe('2026-05-18T00:00:00.000Z');

    const pendingTaskReminders = assistantReminderQueueService.listReminders().filter((reminder) => (
      reminder.scheduledTaskId === 'task-1' && reminder.status === 'pending'
    ));
    expect(pendingTaskReminders).toHaveLength(1);
    expect(pendingTaskReminders[0].id).toBe(result.createdReminders[0].id);
  });
});
