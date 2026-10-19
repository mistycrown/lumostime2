/**
 * @file todoReminderUtils.ts
 * @updated 2026-10-18: Cancels notification and calendar snapshots for abandoned tasks.
 * @input Todo date fields and date-relative reminder settings
 * @output Validated settings, local trigger timestamps and native reminder snapshots
 * @pos Utility
 * @updated 2026-10-18: Preserves strictly opt-in calendar synchronization in settings and native snapshots.
 * @updated 2026-10-17: Adds independent scheduled/deadline reminders without AI dependencies.
 */
import type { TodoItem, TodoReminderField, TodoReminderSetting, TodoReminders } from '../types';
import { formatDateKey, parseDateKey } from './todoScheduleUtils';

export const TODO_REMINDER_FIELDS: TodoReminderField[] = ['scheduledDate', 'deadlineDate'];
export const TODO_REMINDER_LABELS: Record<TodoReminderField, string> = {
  scheduledDate: '安排提醒',
  deadlineDate: '截止提醒'
};

export interface TodoReminderSnapshot extends TodoReminderSetting {
  id: string;
  todoId: string;
  field: TodoReminderField;
  title: string;
  date: string;
}

export const normalizeTodoReminderSetting = (value: unknown): TodoReminderSetting | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const { daysBefore, time, calendarSync } = value as TodoReminderSetting;
  if (!Number.isInteger(daysBefore) || Math.abs(daysBefore) > 3660
    || typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return undefined;
  return { daysBefore, time, ...(calendarSync === true ? { calendarSync: true } : {}) };
};

export const getTodoReminderDate = (date: string, daysBefore: number): string | undefined => {
  const parsed = parseDateKey(date);
  if (!parsed || formatDateKey(parsed) !== date || !Number.isInteger(daysBefore) || Math.abs(daysBefore) > 3660) return undefined;
  parsed.setDate(parsed.getDate() - daysBefore);
  return formatDateKey(parsed);
};

export const getReminderDaysBefore = (sourceDate: string, reminderDate: string): number | null => {
  const source = parseDateKey(sourceDate);
  const reminder = parseDateKey(reminderDate);
  if (!source || !reminder || formatDateKey(source) !== sourceDate || formatDateKey(reminder) !== reminderDate) return null;
  // UTC calendar ordinals avoid 23/25-hour DST days when comparing local dates.
  return Math.round((Date.UTC(source.getFullYear(), source.getMonth(), source.getDate())
    - Date.UTC(reminder.getFullYear(), reminder.getMonth(), reminder.getDate())) / 86400000);
};

export const getTodoReminderTimestamp = (date: string, value: unknown): number | null => {
  const setting = normalizeTodoReminderSetting(value);
  if (!setting) return null;
  const dateKey = getTodoReminderDate(date, setting.daysBefore);
  const parsed = dateKey ? parseDateKey(dateKey) : null;
  if (!parsed) return null;
  const [hours, minutes] = setting.time.split(':').map(Number);
  parsed.setHours(hours, minutes, 0, 0);
  // Reject nonexistent local times instead of silently moving across a DST gap.
  if (formatDateKey(parsed) !== dateKey || parsed.getHours() !== hours || parsed.getMinutes() !== minutes) return null;
  return parsed.getTime();
};

export const normalizeTodoReminders = (
  todo: Pick<TodoItem, 'scheduledDate' | 'deadlineDate' | 'recurrenceRule' | 'reminders'>
): TodoReminders | undefined => {
  if (todo.recurrenceRule) return undefined;
  const reminders: TodoReminders = {};
  for (const field of TODO_REMINDER_FIELDS) {
    const date = todo[field];
    const setting = normalizeTodoReminderSetting(todo.reminders?.[field]);
    if (date && setting && getTodoReminderTimestamp(date, setting) !== null) reminders[field] = setting;
  }
  return Object.keys(reminders).length ? reminders : undefined;
};

export const buildTodoReminderSnapshot = (todos: TodoItem[]): TodoReminderSnapshot[] => {
  const snapshots: TodoReminderSnapshot[] = [];
  for (const todo of todos) {
    if (todo.isCompleted || todo.abandonedAt || !todo.title.trim()) continue;
    const reminders = normalizeTodoReminders(todo);
    for (const field of TODO_REMINDER_FIELDS) {
      const setting = reminders?.[field];
      if (!setting) continue;
      snapshots.push({ id: `${todo.id}:${field}`, todoId: todo.id, field, title: todo.title,
        date: todo[field]!, ...setting });
    }
  }
  return snapshots.sort((left, right) => left.id.localeCompare(right.id));
};

export const formatTodoReminder = (date: string, setting: TodoReminderSetting): string => {
  const reminderDate = getTodoReminderDate(date, setting.daysBefore);
  return `${reminderDate?.replaceAll('-', '.') || date} ${setting.time}`;
};
