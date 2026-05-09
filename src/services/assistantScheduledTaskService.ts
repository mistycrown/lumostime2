/**
 * @file assistantScheduledTaskService.ts
 * @input Assistant scheduled-task template updates plus optional reference times for materialization
 * @output Persistent recurring assistant task templates and generated reminder materialization results
 * @pos Service (Assistant Scheduled Tasks)
 * @description Stores recurring assistant task templates, computes their next concrete trigger datetimes from shared todo recurrence rules, and continuously keeps one next native reminder per enabled task so Android can fire reminder_due at the correct time without waiting for check-in logic.
 *
 * @updated 2026-05-09: Added recurring assistant scheduled-task persistence, next-trigger calculation, linked-reminder reconciliation, and native reminder seeding for recurring assistant tasks.
 */

import type { TodoRecurrenceRule } from '../types';
import type { AssistantReminder, AssistantScheduledTask } from '../types/assistant';
import { formatDateKey, matchesRecurrenceRule, parseDateKey } from '../utils/todoScheduleUtils';
import { normalizeAssistantDateTime, parseAssistantDateTime } from '../utils/assistantTime';
import { assistantReminderQueueService } from './assistantReminderQueueService';

const ASSISTANT_SCHEDULED_TASKS_KEY = 'lumostime_assistant_scheduled_tasks_v1';
const MAX_SEARCH_DAYS = 3660;

const normalizeRecurrenceRule = (value: unknown): TodoRecurrenceRule | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<TodoRecurrenceRule>;
  const frequency = typeof candidate.frequency === 'string' ? candidate.frequency.trim() : '';
  const startDate = typeof candidate.startDate === 'string' ? candidate.startDate.trim() : '';
  const endDate = typeof candidate.endDate === 'string' ? candidate.endDate.trim() : '';
  const interval = Number.isFinite(candidate.interval) ? Math.max(1, Math.round(Number(candidate.interval))) : 1;
  const weekdays = Array.isArray(candidate.weekdays)
    ? candidate.weekdays
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6)
    : [];
  const monthDays = Array.isArray(candidate.monthDays)
    ? candidate.monthDays
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item >= 1 && item <= 31)
    : [];

  if (!['daily', 'weekly', 'monthly'].includes(frequency) || !parseDateKey(startDate)) {
    return null;
  }

  return {
    frequency: frequency as TodoRecurrenceRule['frequency'],
    startDate,
    ...(parseDateKey(endDate) ? { endDate } : {}),
    ...(interval > 1 ? { interval } : {}),
    ...(weekdays.length > 0 ? { weekdays: Array.from(new Set(weekdays)).sort((a, b) => a - b) } : {}),
    ...(monthDays.length > 0 ? { monthDays: Array.from(new Set(monthDays)).sort((a, b) => a - b) } : {})
  };
};

const normalizeTime = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) {
    return '';
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return '';
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const parseTimeParts = (value: string): { hours: number; minutes: number } | null => {
  const normalized = normalizeTime(value);
  if (!normalized) {
    return null;
  }

  const [hours, minutes] = normalized.split(':').map(Number);
  return { hours, minutes };
};

const buildLocalDateTime = (date: Date, time: string): Date | null => {
  const timeParts = parseTimeParts(time);
  if (!timeParts) {
    return null;
  }

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    timeParts.hours,
    timeParts.minutes,
    0,
    0
  );
};

const normalizeTask = (value: unknown): AssistantScheduledTask | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<AssistantScheduledTask>;
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  const text = typeof candidate.text === 'string' ? candidate.text.trim() : '';
  const time = normalizeTime(candidate.time);
  const recurrenceRule = normalizeRecurrenceRule(candidate.recurrenceRule);
  const createdAt = normalizeAssistantDateTime(candidate.createdAt);
  const updatedAt = normalizeAssistantDateTime(candidate.updatedAt);
  const nextTriggerAt = normalizeAssistantDateTime(candidate.nextTriggerAt);

  if (!id || !text || !time || !recurrenceRule || !createdAt || !updatedAt || !nextTriggerAt) {
    return null;
  }

  return {
    id,
    text,
    time,
    recurrenceRule,
    enabled: candidate.enabled !== false,
    createdAt,
    updatedAt,
    nextTriggerAt,
    ...(normalizeAssistantDateTime(candidate.lastTriggeredAt)
      ? { lastTriggeredAt: normalizeAssistantDateTime(candidate.lastTriggeredAt)! }
      : {}),
    ...(typeof candidate.pendingReminderId === 'string' && candidate.pendingReminderId.trim()
      ? { pendingReminderId: candidate.pendingReminderId.trim() }
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
    console.error('[assistantScheduledTaskService] Failed to parse scheduled tasks JSON', error);
    return fallback;
  }
};

const sortTasks = (tasks: AssistantScheduledTask[]): AssistantScheduledTask[] => (
  [...tasks].sort((left, right) => {
    const leftMs = parseAssistantDateTime(left.nextTriggerAt);
    const rightMs = parseAssistantDateTime(right.nextTriggerAt);
    if (Number.isFinite(leftMs) && Number.isFinite(rightMs) && leftMs !== rightMs) {
      return leftMs - rightMs;
    }

    return left.createdAt.localeCompare(right.createdAt);
  })
);

const normalizeTaskList = (value: unknown): AssistantScheduledTask[] => (
  Array.isArray(value)
    ? sortTasks(value.map(normalizeTask).filter((item): item is AssistantScheduledTask => Boolean(item)))
    : []
);

const findNextTriggerAt = (
  recurrenceRule: TodoRecurrenceRule,
  time: string,
  after: Date
): string | null => {
  const startDate = parseDateKey(recurrenceRule.startDate);
  if (!startDate) {
    return null;
  }

  const searchStart = new Date(
    Math.max(
      startDate.getTime(),
      new Date(after.getFullYear(), after.getMonth(), after.getDate()).getTime()
    )
  );

  for (let dayOffset = 0; dayOffset <= MAX_SEARCH_DAYS; dayOffset += 1) {
    const candidateDate = new Date(searchStart);
    candidateDate.setDate(searchStart.getDate() + dayOffset);
    const candidateDateKey = formatDateKey(candidateDate);
    if (!matchesRecurrenceRule(recurrenceRule, candidateDateKey)) {
      continue;
    }

    const candidateDateTime = buildLocalDateTime(candidateDate, time);
    if (!candidateDateTime || candidateDateTime.getTime() <= after.getTime()) {
      continue;
    }

    return candidateDateTime.toISOString();
  }

  return null;
};

const buildInitialNextTriggerAt = (recurrenceRule: TodoRecurrenceRule, time: string, referenceNow = new Date()): string | null => {
  const baseline = new Date(referenceNow.getTime() - 1_000);
  return findNextTriggerAt(recurrenceRule, time, baseline);
};

export const assistantScheduledTaskService = {
  getStorageKey(): string {
    return ASSISTANT_SCHEDULED_TASKS_KEY;
  },

  computeNextTriggerAt(recurrenceRule: TodoRecurrenceRule, time: string, after: Date): string | null {
    return findNextTriggerAt(recurrenceRule, time, after);
  },

  listTasks(): AssistantScheduledTask[] {
    const raw = safeParseJson<unknown[]>(localStorage.getItem(ASSISTANT_SCHEDULED_TASKS_KEY), []);
    return normalizeTaskList(raw);
  },

  saveTasks(tasks: AssistantScheduledTask[]): AssistantScheduledTask[] {
    const normalized = sortTasks(tasks.map(normalizeTask).filter((item): item is AssistantScheduledTask => Boolean(item)));
    localStorage.setItem(ASSISTANT_SCHEDULED_TASKS_KEY, JSON.stringify(normalized));
    return normalized;
  },

  createTask(input: {
    id: string;
    text: string;
    time: string;
    recurrenceRule: TodoRecurrenceRule;
    enabled?: boolean;
    createdAt?: string;
  }): AssistantScheduledTask {
    const createdAt = normalizeAssistantDateTime(input.createdAt) || new Date().toISOString();
    const recurrenceRule = normalizeRecurrenceRule(input.recurrenceRule);
    const time = normalizeTime(input.time);
    const text = input.text.trim();
    if (!input.id.trim() || !text || !recurrenceRule || !time) {
      throw new Error('Invalid assistant scheduled task');
    }

    const nextTriggerAt = buildInitialNextTriggerAt(recurrenceRule, time, new Date());
    if (!nextTriggerAt) {
      throw new Error('Unable to compute next assistant scheduled task trigger');
    }

    const task: AssistantScheduledTask = {
      id: input.id.trim(),
      text,
      time,
      recurrenceRule,
      enabled: input.enabled !== false,
      createdAt,
      updatedAt: createdAt,
      nextTriggerAt
    };

    const current = assistantScheduledTaskService.listTasks().filter((item) => item.id !== task.id);
    assistantScheduledTaskService.saveTasks([...current, task]);
    const result = assistantScheduledTaskService.syncScheduledTaskReminders();
    return result.tasks.find((item) => item.id === task.id) || task;
  },

  updateTask(id: string, patch: Partial<Pick<AssistantScheduledTask, 'text' | 'time' | 'recurrenceRule' | 'enabled'>>): AssistantScheduledTask | null {
    const normalizedId = id.trim();
    if (!normalizedId) {
      return null;
    }

    const currentTask = assistantScheduledTaskService.listTasks().find((item) => item.id === normalizedId) || null;
    if (!currentTask) {
      return null;
    }

    const nextText = patch.text === undefined ? currentTask.text : patch.text.trim();
    const nextTime = patch.time === undefined ? currentTask.time : normalizeTime(patch.time);
    const nextRule = patch.recurrenceRule === undefined
      ? currentTask.recurrenceRule
      : normalizeRecurrenceRule(patch.recurrenceRule);
    if (!nextText || !nextTime || !nextRule) {
      throw new Error('Invalid assistant scheduled task patch');
    }

    const nowIso = new Date().toISOString();
    const recalculatedNextTriggerAt = buildInitialNextTriggerAt(nextRule, nextTime, new Date());
    if (currentTask.pendingReminderId) {
      assistantReminderQueueService.removeReminder(currentTask.pendingReminderId);
    }

    const nextTask: AssistantScheduledTask = {
      ...currentTask,
      text: nextText,
      time: nextTime,
      recurrenceRule: nextRule,
      enabled: patch.enabled === undefined ? currentTask.enabled : patch.enabled,
      updatedAt: nowIso,
      nextTriggerAt: recalculatedNextTriggerAt || currentTask.nextTriggerAt
    };
    delete nextTask.pendingReminderId;

    const tasks = assistantScheduledTaskService.listTasks().map((item) => (
      item.id === normalizedId ? nextTask : item
    ));
    assistantScheduledTaskService.saveTasks(tasks);
    const result = assistantScheduledTaskService.syncScheduledTaskReminders();
    return result.tasks.find((item) => item.id === normalizedId) || nextTask;
  },

  removeTask(id: string): AssistantScheduledTask | null {
    const normalizedId = id.trim();
    if (!normalizedId) {
      return null;
    }

    const tasks = assistantScheduledTaskService.listTasks();
    const current = tasks.find((item) => item.id === normalizedId) || null;
    if (!current) {
      return null;
    }

    if (current.pendingReminderId) {
      assistantReminderQueueService.removeReminder(current.pendingReminderId);
    }

    assistantScheduledTaskService.saveTasks(tasks.filter((item) => item.id !== normalizedId));
    return current;
  },

  clearAll(): void {
    localStorage.removeItem(ASSISTANT_SCHEDULED_TASKS_KEY);
  },

  syncScheduledTaskReminders(now = new Date()): { tasks: AssistantScheduledTask[]; createdReminders: AssistantReminder[] } {
    const tasks = assistantScheduledTaskService.listTasks();
    const reminderQueue = assistantReminderQueueService.listReminders();
    const reminderMap = new Map(reminderQueue.map((reminder) => [reminder.id, reminder]));
    const nextTasks: AssistantScheduledTask[] = [];
    const createdReminders: AssistantReminder[] = [];
    const nextReminders = [...reminderQueue];
    let remindersChanged = false;
    let tasksChanged = false;
    const nowIso = now.toISOString();

    tasks.forEach((task) => {
      const linkedReminder = task.pendingReminderId ? reminderMap.get(task.pendingReminderId) : undefined;
      let nextTask = task;

      if (!task.enabled) {
        if (linkedReminder) {
          const removeIndex = nextReminders.findIndex((reminder) => reminder.id === linkedReminder.id);
          if (removeIndex >= 0) {
            nextReminders.splice(removeIndex, 1);
            reminderMap.delete(linkedReminder.id);
            remindersChanged = true;
          }
        }

        if (task.pendingReminderId) {
          const { pendingReminderId: _removed, ...rest } = task;
          nextTask = {
            ...rest,
            updatedAt: nowIso
          };
          tasksChanged = true;
        }

        nextTasks.push(nextTask);
        return;
      }

      if (linkedReminder) {
        nextTasks.push(task);
        return;
      }

      if (task.pendingReminderId) {
        const nextTriggerMs = parseAssistantDateTime(task.nextTriggerAt);
        const followingTriggerAt = Number.isFinite(nextTriggerMs)
          ? findNextTriggerAt(task.recurrenceRule, task.time, new Date(nextTriggerMs + 1_000))
          : null;
        nextTask = {
          ...task,
          enabled: Boolean(followingTriggerAt),
          nextTriggerAt: followingTriggerAt || task.nextTriggerAt,
          lastTriggeredAt: nowIso,
          updatedAt: nowIso
        };
        delete nextTask.pendingReminderId;
        tasksChanged = true;
      }

      const nextTriggerMs = parseAssistantDateTime(nextTask.nextTriggerAt);
      if (!nextTask.enabled || !Number.isFinite(nextTriggerMs)) {
        nextTasks.push(nextTask);
        return;
      }

      const existingMatch = nextReminders.find((reminder) => (
        reminder.scheduledTaskId === nextTask.id
        && reminder.status === 'pending'
        && reminder.dueAt === nextTask.nextTriggerAt
      ));

      if (existingMatch) {
        nextTask = {
          ...nextTask,
          pendingReminderId: existingMatch.id,
          updatedAt: nowIso
        };
        tasksChanged = true;
        nextTasks.push(nextTask);
        return;
      }

      const reminder: AssistantReminder = {
        id: crypto.randomUUID(),
        type: 'self_followup',
        dueAt: nextTask.nextTriggerAt,
        status: 'pending',
        text: nextTask.text,
        scheduledTaskId: nextTask.id,
        source: 'system',
        createdAt: nowIso
      };
      createdReminders.push(reminder);
      nextReminders.push(reminder);
      reminderMap.set(reminder.id, reminder);
      remindersChanged = true;
      tasksChanged = true;
      nextTasks.push({
        ...nextTask,
        pendingReminderId: reminder.id,
        updatedAt: nowIso
      });
    });

    if (remindersChanged) {
      assistantReminderQueueService.saveReminders(nextReminders);
    }

    const savedTasks = tasksChanged
      ? assistantScheduledTaskService.saveTasks(nextTasks)
      : nextTasks;
    return { tasks: savedTasks, createdReminders };
  }
};
