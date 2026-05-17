/**
 * @file assistantReminderQueueService.ts
 * @input Assistant reminder definitions and current time
 * @output Persistent reminder queue operations for the background AI agent
 * @pos Service (Assistant Reminders)
 * @description Provides a small durable reminder queue for the Android-first AI agent so it can leave follow-up instructions for future background turns without depending on the chat session history.
 *
 * @updated 2026-05-17: Deduplicate pending reminders by natural content key during queue saves and agent enqueue calls so repeated background turns cannot silently stack identical self-followup reminders that all fire at the same due time.
 * @updated 2026-05-10: Preserved scheduled-task linkage ids during queue normalization so recurring assistant tasks can reliably reconcile and dedupe pending reminders.
 * @updated 2026-05-09: Delayed failed due-reminder retries for at least one minute in the web queue so failed dispatches stay pending instead of being re-fired immediately.
 * @updated 2026-04-26: Canonicalized reminder timestamps before storage so due checks, delay math, and debug output all run against one normalized timeline.
 * @updated 2026-04-26: Added persistent assistant reminder queue helpers, due-reminder lookup, dispatch-attempt tracking, and memory synchronization for the new background AI agent.
 */

import type { AssistantReminder } from '../types/assistant';
import { Capacitor } from '@capacitor/core';
import AssistantAgent from '../plugins/AssistantAgentPlugin';
import { assistantMemoryService } from './assistantMemoryService';
import {
  isAssistantDateTimeDue,
  normalizeAssistantDateTime,
  parseAssistantDateTime
} from '../utils/assistantTime';

const ASSISTANT_REMINDER_QUEUE_KEY = 'lumostime_assistant_reminders_v1';
const REMINDER_RETRY_DELAY_MS = 60_000;

const normalizeReminder = (value: unknown): AssistantReminder | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<AssistantReminder>;
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  const type = typeof candidate.type === 'string' ? candidate.type.trim() : '';
  const dueAt = normalizeAssistantDateTime(candidate.dueAt);
  const status = typeof candidate.status === 'string' ? candidate.status.trim() : '';
  const text = typeof candidate.text === 'string' ? candidate.text.trim() : '';
  const source = typeof candidate.source === 'string' ? candidate.source.trim() : '';
  const createdAt = normalizeAssistantDateTime(candidate.createdAt);

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
    ...(typeof candidate.scheduledTaskId === 'string' && candidate.scheduledTaskId.trim()
      ? { scheduledTaskId: candidate.scheduledTaskId.trim() }
      : {}),
    source: candidate.source!,
    createdAt,
    ...(Number.isFinite(candidate.dispatchAttemptCount) ? { dispatchAttemptCount: Number(candidate.dispatchAttemptCount) } : {}),
    ...(normalizeAssistantDateTime(candidate.lastDispatchAttemptAt)
      ? { lastDispatchAttemptAt: normalizeAssistantDateTime(candidate.lastDispatchAttemptAt)! }
      : {}),
    ...(normalizeAssistantDateTime(candidate.lastDispatchedAt)
      ? { lastDispatchedAt: normalizeAssistantDateTime(candidate.lastDispatchedAt)! }
      : {})
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
  [...reminders].sort((left, right) => {
    const leftMs = parseAssistantDateTime(left.dueAt);
    const rightMs = parseAssistantDateTime(right.dueAt);
    if (Number.isFinite(leftMs) && Number.isFinite(rightMs) && leftMs !== rightMs) {
      return leftMs - rightMs;
    }

    if (left.createdAt !== right.createdAt) {
      return left.createdAt.localeCompare(right.createdAt);
    }

    return left.id.localeCompare(right.id);
  })
);

const buildReminderNaturalKey = (
  reminder: Pick<AssistantReminder, 'type' | 'dueAt' | 'text' | 'source' | 'todoId' | 'scheduledTaskId'>
): string => (
  [
    reminder.type.trim(),
    reminder.dueAt.trim(),
    reminder.text.trim(),
    reminder.source.trim(),
    reminder.todoId?.trim() || '',
    reminder.scheduledTaskId?.trim() || ''
  ].join('::')
);

const areEquivalentPendingReminders = (left: AssistantReminder, right: AssistantReminder): boolean => (
  left.status === 'pending'
  && right.status === 'pending'
  && buildReminderNaturalKey(left) === buildReminderNaturalKey(right)
);

const dedupePendingReminders = (reminders: AssistantReminder[]): AssistantReminder[] => {
  const seenPendingKeys = new Set<string>();

  return reminders.filter((reminder) => {
    if (reminder.status !== 'pending') {
      return true;
    }

    const naturalKey = buildReminderNaturalKey(reminder);
    if (seenPendingKeys.has(naturalKey)) {
      return false;
    }

    seenPendingKeys.add(naturalKey);
    return true;
  });
};

const syncRemindersToMemory = (reminders: AssistantReminder[]) => {
  assistantMemoryService.replaceActiveReminders(reminders.filter((reminder) => reminder.status === 'pending'));
};

const syncRemindersToNative = (reminders: AssistantReminder[]) => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  void AssistantAgent.syncNativeReminders({ reminders }).catch((error) => {
    console.error('[assistantReminderQueueService] Failed to sync native reminders', error);
  });
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
    const normalized = dedupePendingReminders(sortReminders(
      reminders.map(normalizeReminder).filter((item): item is AssistantReminder => Boolean(item))
    ));
    localStorage.setItem(ASSISTANT_REMINDER_QUEUE_KEY, JSON.stringify(normalized));
    syncRemindersToMemory(normalized);
    syncRemindersToNative(normalized);
    return normalized;
  },

  removeReminder(id: string): AssistantReminder | null {
    const normalizedId = id.trim();
    if (!normalizedId) {
      return null;
    }

    let removedReminder: AssistantReminder | null = null;
    const next = assistantReminderQueueService.listReminders().filter((reminder) => {
      if (reminder.id !== normalizedId) {
        return true;
      }
      removedReminder = reminder;
      return false;
    });

    assistantReminderQueueService.saveReminders(next);
    return removedReminder;
  },

  enqueueReminder(reminder: AssistantReminder): AssistantReminder {
    const normalized = normalizeReminder(reminder);
    if (!normalized) {
      throw new Error('Invalid assistant reminder');
    }

    const current = assistantReminderQueueService.listReminders().filter((item) => item.id !== normalized.id);
    const existingEquivalentReminder = current.find((item) => areEquivalentPendingReminders(item, normalized)) || null;
    if (existingEquivalentReminder) {
      return existingEquivalentReminder;
    }

    assistantReminderQueueService.saveReminders([...current, normalized]);
    return normalized;
  },

  listDueReminders(now = new Date()): AssistantReminder[] {
    const nowMs = now.getTime();
    return assistantReminderQueueService.listReminders().filter((reminder) => {
      if (reminder.status !== 'pending' || !isAssistantDateTimeDue(reminder.dueAt, now)) {
        return false;
      }

      if (!reminder.lastDispatchAttemptAt) {
        return true;
      }

      const lastAttemptMs = parseAssistantDateTime(reminder.lastDispatchAttemptAt);
      return !Number.isFinite(lastAttemptMs) || nowMs - lastAttemptMs >= REMINDER_RETRY_DELAY_MS;
    });
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

    if (status === 'done' || status === 'cancelled') {
      const current = assistantReminderQueueService.listReminders().find((reminder) => reminder.id === normalizedId) || null;
      assistantReminderQueueService.removeReminder(normalizedId);
      return current;
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

  recordDispatchAttempt(id: string, attemptedAt = new Date().toISOString()): AssistantReminder | null {
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
        dispatchAttemptCount: (reminder.dispatchAttemptCount || 0) + 1,
        lastDispatchAttemptAt: attemptedAt
      };
      return updatedReminder;
    });

    assistantReminderQueueService.saveReminders(next);
    return updatedReminder;
  },

  markDispatched(id: string, dispatchedAt = new Date().toISOString()): AssistantReminder | null {
    const normalizedId = id.trim();
    if (!normalizedId) {
      return null;
    }

    let updatedReminder: AssistantReminder | null = null;
    assistantReminderQueueService.listReminders().forEach((reminder) => {
      if (reminder.id === normalizedId) {
        updatedReminder = {
          ...reminder,
          status: 'done',
          lastDispatchedAt: dispatchedAt
        };
      }
    });

    assistantReminderQueueService.removeReminder(normalizedId);
    return updatedReminder;
  },

  clearQueue(): void {
    localStorage.removeItem(ASSISTANT_REMINDER_QUEUE_KEY);
    syncRemindersToMemory([]);
    syncRemindersToNative([]);
  },

  async hydrateFromNative(): Promise<AssistantReminder[]> {
    if (!Capacitor.isNativePlatform()) {
      return assistantReminderQueueService.listReminders();
    }

    try {
      const result = await AssistantAgent.listNativeReminders();
      return assistantReminderQueueService.saveReminders(result.reminders || []);
    } catch (error) {
      console.error('[assistantReminderQueueService] Failed to hydrate reminders from native', error);
      return assistantReminderQueueService.listReminders();
    }
  }
};
