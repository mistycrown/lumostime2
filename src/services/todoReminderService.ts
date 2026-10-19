/**
 * @file todoReminderService.ts
 * @input Successfully persisted todo snapshots and app/permission lifecycle events
 * @output Ordered native alarm reconciliation or foreground browser notifications
 * @pos Service
 * @updated 2026-10-18: Adds calendar authorization and surfaces calendar errors without failing native notification reconciliation.
 * @updated 2026-10-17: Adds snapshot serialization, retry-on-resume, permission status and notification navigation.
 */
import { Capacitor } from '@capacitor/core';
import type { TodoItem } from '../types';
import { TodoReminder, type TodoReminderPluginInterface, type TodoReminderStatus } from '../plugins/TodoReminderPlugin';
import { buildTodoReminderSnapshot, getTodoReminderTimestamp, TODO_REMINDER_LABELS, type TodoReminderSnapshot } from '../utils/todoReminderUtils';

export const TODO_REMINDER_STATUS_EVENT = 'lumostime:todo-reminder-status';
export const TODO_REMINDER_OPEN_EVENT = 'lumostime:todo-reminder-open';

export class TodoReminderService {
  private queue: Promise<unknown> = Promise.resolve();
  private latest: TodoReminderSnapshot[] | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private webDelivered = new Set<string>();
  private lastError = '';
  private calendarError = '';

  constructor(
    private readonly android = Capacitor.getPlatform() === 'android',
    private readonly plugin: TodoReminderPluginInterface = TodoReminder
  ) {}

  private nativeAvailable(): boolean {
    return this.android && Capacitor.isPluginAvailable('TodoReminder');
  }

  getError(): string { return this.lastError || this.calendarError; }

  private report(error: string): void {
    this.lastError = error;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TODO_REMINDER_STATUS_EVENT, { detail: { error } }));
    }
  }

  async getStatus(): Promise<TodoReminderStatus> {
    if (this.android) {
      if (this.nativeAvailable()) {
        const status = await this.plugin.getStatus();
        this.calendarError = status.calendar?.error || '';
        return status;
      }
      return { supported: false, notifications: false, exact: false, background: true };
    }
    const supported = typeof window !== 'undefined' && 'Notification' in window;
    return { supported, notifications: supported && Notification.permission === 'granted', exact: false, background: false };
  }

  async requestNotifications(): Promise<TodoReminderStatus> {
    if (this.nativeAvailable()) return this.plugin.requestNotifications();
    const status = await this.getStatus();
    if (!this.android && status.supported && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    return this.getStatus();
  }

  async requestCalendar(): Promise<TodoReminderStatus> {
    if (this.nativeAvailable() && (await this.getStatus()).calendar?.supported) return this.plugin.requestCalendar();
    return this.getStatus();
  }

  async openSettings(kind: 'notifications' | 'exact' | 'calendar'): Promise<void> {
    if (this.nativeAvailable()) await this.plugin.openSettings({ kind });
  }

  syncTodos(todos: TodoItem[]): Promise<void> {
    const snapshot = buildTodoReminderSnapshot(todos);
    // Keep the last successfully persisted data even when native scheduling fails.
    this.latest = snapshot;
    return this.enqueue(snapshot);
  }

  refresh(): Promise<void> {
    return this.latest ? this.enqueue(this.latest) : Promise.resolve();
  }

  private enqueue(snapshot: TodoReminderSnapshot[]): Promise<void> {
    const operation = this.queue.catch(() => undefined).then(async () => {
      try {
        let calendarError = '';
        if (this.nativeAvailable()) {
          const status = await this.plugin.sync({ reminders: snapshot });
          calendarError = status?.calendar?.error || '';
        } else if (!this.android) {
          this.scheduleWeb(snapshot);
        } else if (snapshot.length) {
          throw new Error('请更新 Android 安装包以启用本地提醒');
        }
        this.calendarError = calendarError;
        this.report('');
      } catch (error) {
        this.report(error instanceof Error ? error.message : '本地提醒设置失败');
        throw error;
      }
    });
    this.queue = operation;
    return operation;
  }

  private webKey(item: TodoReminderSnapshot): string {
    return JSON.stringify([item.id, item.date, item.daysBefore, item.time]);
  }

  private scheduleWeb(snapshot: TodoReminderSnapshot[]): void {
    clearTimeout(this.timer);
    const validKeys = new Set(snapshot.map((item) => this.webKey(item)));
    this.webDelivered = new Set([...this.webDelivered].filter((key) => validKeys.has(key)));
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;
    const now = Date.now();
    const nextTimes = snapshot.map((item) => getTodoReminderTimestamp(item.date, item))
      .filter((at): at is number => at !== null && at > now);
    if (!nextTimes.length) return;
    const next = Math.min(...nextTimes);
    this.timer = setTimeout(() => {
      if (this.latest !== snapshot) return;
      const firedAt = Date.now();
      for (const item of snapshot) {
        const at = getTodoReminderTimestamp(item.date, item);
        const key = this.webKey(item);
        if (at === null || at > firedAt || at < next || this.webDelivered.has(key)) continue;
        const notification = new Notification(item.title, { body: `${TODO_REMINDER_LABELS[item.field]} · ${item.date}`, tag: item.id });
        notification.onclick = () => {
          window.focus();
          window.dispatchEvent(new CustomEvent(TODO_REMINDER_OPEN_EVENT, { detail: { todoId: item.todoId } }));
          notification.close();
        };
        this.webDelivered.add(key);
      }
      this.scheduleWeb(snapshot);
    }, Math.min(next - now, 2147483647));
  }

  async consumeNavigation(): Promise<{ todoId?: string }> {
    return this.nativeAvailable() ? this.plugin.consumeNavigation() : {};
  }
}

export const todoReminderService = new TodoReminderService();
