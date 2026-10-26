/**
 * @file aiTodoReminderUtils.ts
 * @input AI todo reminder payloads and the resulting todo dates
 * @output Validated reminder patches and merged application reminder settings
 * @pos Utility
 * @updated 2026-10-26: Shares strict reminder validation across chat and quick-add writes.
 */
import type { TodoItem, TodoReminders } from '../types';
import type { AssistantTodoReminderPatch } from '../types/assistant';
import { getTodoReminderTimestamp, normalizeTodoReminderSetting, normalizeTodoReminders, TODO_REMINDER_FIELDS } from './todoReminderUtils';

export const normalizeAITodoReminderPatch = (value: unknown): AssistantTodoReminderPatch | null | undefined => {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('待办提醒格式无效');
  const raw = value as Record<string, unknown>;
  if (Object.keys(raw).some((key) => !TODO_REMINDER_FIELDS.includes(key as typeof TODO_REMINDER_FIELDS[number]))) {
    throw new Error('待办提醒只能绑定安排日期或截止日期');
  }
  const patch: AssistantTodoReminderPatch = {};
  for (const field of TODO_REMINDER_FIELDS) {
    if (raw[field] === undefined) continue;
    if (raw[field] === null) { patch[field] = null; continue; }
    const setting = normalizeTodoReminderSetting(raw[field]);
    const calendarSync = (raw[field] as Record<string, unknown>)?.calendarSync;
    if (!setting || (calendarSync !== undefined && typeof calendarSync !== 'boolean')) {
      throw new Error('待办提醒需要有效的 daysBefore 和 HH:mm 时间');
    }
    patch[field] = { ...setting, ...(typeof calendarSync === 'boolean' ? { calendarSync } : {}) };
  }
  return patch;
};

export const applyAITodoReminderPatch = (
  todo: TodoItem,
  value: unknown,
  now = Date.now()
): TodoReminders | undefined => {
  const patch = normalizeAITodoReminderPatch(value);
  if (patch === null) return undefined;
  const reminders = { ...todo.reminders };
  for (const field of TODO_REMINDER_FIELDS) {
    const setting = patch?.[field];
    if (setting === undefined) continue;
    if (setting === null) { delete reminders[field]; continue; }
    if (todo.recurrenceRule) throw new Error('重复待办暂不支持日期提醒');
    const date = todo[field];
    const merged = { ...reminders[field], ...setting };
    const at = date ? getTodoReminderTimestamp(date, merged) : null;
    if (at === null) throw new Error('请先为待办设置有效的安排日期或截止日期');
    if (at <= now) throw new Error('待办提醒时间必须在未来');
    reminders[field] = merged;
  }
  return normalizeTodoReminders({ ...todo, reminders });
};
