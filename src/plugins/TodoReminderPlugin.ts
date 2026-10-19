/**
 * @file TodoReminderPlugin.ts
 * @input Native todo snapshots, reminder permissions and notification navigation
 * @output Typed bridge to independent Android local reminders
 * @pos Capacitor Plugin
 * @updated 2026-10-18: Exposes optional calendar capability, permission and independent synchronization errors.
 * @updated 2026-10-17: Adds a dedicated date-reminder bridge, separate from assistant notifications.
 */
import { registerPlugin } from '@capacitor/core';
import type { TodoReminderSnapshot } from '../utils/todoReminderUtils';

export interface TodoReminderStatus {
  supported: boolean;
  notifications: boolean;
  exact: boolean;
  background: boolean;
  calendar?: { supported: boolean; granted: boolean; error?: string };
}

export interface TodoReminderPluginInterface {
  sync(options: { reminders: TodoReminderSnapshot[] }): Promise<TodoReminderStatus>;
  getStatus(): Promise<TodoReminderStatus>;
  requestNotifications(): Promise<TodoReminderStatus>;
  requestCalendar(): Promise<TodoReminderStatus>;
  openSettings(options: { kind: 'notifications' | 'exact' | 'calendar' }): Promise<void>;
  consumeNavigation(): Promise<{ todoId?: string }>;
}

export const TodoReminder = registerPlugin<TodoReminderPluginInterface>('TodoReminder');
