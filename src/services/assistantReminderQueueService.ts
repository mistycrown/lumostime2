/**
 * @file assistantReminderQueueService.ts
 * @input Assistant reminder definitions and current time
 * @output Persistent reminder queue operations for the background AI agent
 * @pos Service (Assistant Reminders)
 * @description Provides a small durable reminder queue for the Android-first AI agent so it can leave follow-up instructions for future background turns without depending on the chat session history.
 *
 * @updated 2026-04-26: Added persistent assistant reminder queue helpers, due-reminder lookup, and memory synchronization for the new background AI agent.
 */

import type { AssistantReminder } from '../types/assistant';
import { assistantMemoryService } from './assistantMemoryService';

const ASSISTANT_REMINDER_QUEUE_KEY = 'lumostime_assistant_reminders_v1';

const normalizeReminder = (value: unknown): AssistantReminder | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<AssistantReminder>;
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  const type = typeof candidate.type === 'string' ? candidate.type.trim() : '';
  const dueAt = typeof candidate.dueAt === 'string' ? candidate.dueAt.trim() : '';
  const status = typeof candidate.status === 'string' ? candidate.status.trim() : '';
  const text = typeof candidate.text === 'string' ? candidate.text.trim() : '';
  const source = typeof candidate.source === 'string' ? candidate.source.trim() : '';
  const createdAt = typeof candidate.createdAt === 'string' ? candidate.createdAt.trim() : '';

  if (!id || !type || !dueAt || !status || !text || !source || !createdAt) {
    return null;
  }

  return {
    id,
    type: candidate.type!,
    dueAt,
    status: candidate.status!,
    text,
    ...(typeof candidate.todoId === 'string' && candidate.todoId.trim() ? { todoId: candidate.todoId.trim() } : {}),
    source: candidate.source!,
    createdAt
  };
};

const safeParseJson = <T>(raw: string | null, fallback: T): T => {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error('[assistantReminderQueueService] Failed to parse reminder queue JSON', error);
    return fallback;
  }
};

const sortReminders = (reminders: AssistantReminder[]): AssistantReminder[] => (
  [...reminders].sort((left, right) => left.dueAt.localeCompare(right.dueAt))
);

const syncRemindersToMemory = (reminders: AssistantReminder[]) => {
  assistantMemoryService.replaceActiveReminders(reminders.filter((reminder) => reminder.status === 'pending'));
};

export const assistantReminderQueueService = {
  getStorageKey(): string {
    return ASSISTANT_REMINDER_QUEUE_KEY;
  },

  listReminders(): AssistantReminder[] {
    const raw = safeParseJson<unknown[]>(localStorage.getItem(ASSISTANT_REMINDER_QUEUE_KEY), []);
    return sortReminders(raw.map(normalizeReminder).filter((item): item is AssistantReminder => Boolean(item)));
  },

  saveReminders(reminders: AssistantReminder[]): AssistantReminder[] {
    const normalized = sortReminders(
      reminders.map(normalizeReminder).filter((item): item is AssistantReminder => Boolean(item))
    );
    localStorage.setItem(ASSISTANT_REMINDER_QUEUE_KEY, JSON.stringify(normalized));
    syncRemindersToMemory(normalized);
    return normalized;
  },

  enqueueReminder(reminder: AssistantReminder): AssistantReminder {
    const normalized = normalizeReminder(reminder);
    if (!normalized) {
      throw new Error('Invalid assistant reminder');
    }

    const current = assistantReminderQueueService.listReminders().filter((item) => item.id !== normalized.id);
    assistantReminderQueueService.saveReminders([...current, normalized]);
    return normalized;
  },

  listDueReminders(now = new Date()): AssistantReminder[] {
    const nowIso = now.toISOString();
    return assistantReminderQueueService.listReminders().filter((reminder) => (
      reminder.status === 'pending' && reminder.dueAt <= nowIso
    ));
  },

  peekNextDueAt(): string {
    const nextPending = assistantReminderQueueService.listReminders().find((reminder) => reminder.status === 'pending');
    return nextPending?.dueAt || '';
  },

  updateReminderStatus(id: string, status: AssistantReminder['status']): AssistantReminder | null {
    const normalizedId = id.trim();
    if (!normalizedId) {
      return null;
    }

    let updatedReminder: AssistantReminder | null = null;
    const next = assistantReminderQueueService.listReminders().map((reminder) => {
      if (reminder.id !== normalizedId) {
        return reminder;
      }

      updatedReminder = {
        ...reminder,
        status
      };
      return updatedReminder;
    });

    assistantReminderQueueService.saveReminders(next);
    return updatedReminder;
  },

  clearQueue(): void {
    localStorage.removeItem(ASSISTANT_REMINDER_QUEUE_KEY);
    syncRemindersToMemory([]);
  }
};
