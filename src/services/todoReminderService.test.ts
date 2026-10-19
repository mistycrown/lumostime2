/**
 * @file todoReminderService.test.ts
 * @input Deferred/rejected native bridge calls and successive committed todo snapshots
 * @output Guarantees for latest-write ordering, cancellation and resume recovery
 * @pos Test
 * @updated 2026-10-18: Covers calendar errors, retry, native opt-in transport and old-plugin compatibility.
 * @updated 2026-10-17: Tests native reminder reconciliation without Android or browser permissions.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'android', isPluginAvailable: () => true }, registerPlugin: () => ({}) }));
import { TodoReminderService } from './todoReminderService';
import type { TodoItem } from '../types';

const todo: TodoItem = { id: 't', categoryId: 'c', title: '安排', isCompleted: false, scheduledDate: '2026-11-01',
  reminders: { scheduledDate: { daysBefore: 0, time: '09:00' } } };

describe('native reminder synchronization', () => {
  let sync: ReturnType<typeof vi.fn>;
  let service: TodoReminderService;
  beforeEach(() => {
    sync = vi.fn().mockResolvedValue({ supported: true, notifications: true, exact: true, background: true });
    service = new TodoReminderService(true, { sync } as any);
  });

  it('does not let an older save overtake a newer cancellation', async () => {
    let finish!: () => void;
    sync.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    const first = service.syncTodos([todo]);
    const second = service.syncTodos([]);
    await vi.waitFor(() => expect(sync).toHaveBeenCalledTimes(1));
    finish();
    await Promise.all([first, second]);
    expect(sync.mock.calls.map(([input]) => input.reminders.length)).toEqual([1, 0]);
  });

  it('retries the latest committed state after a bridge failure and clears the error', async () => {
    sync.mockRejectedValueOnce(new Error('storage failed'));
    await expect(service.syncTodos([todo])).rejects.toThrow('storage failed');
    expect(service.getError()).toBe('storage failed');
    await service.refresh();
    expect(sync).toHaveBeenCalledTimes(2);
    expect(service.getError()).toBe('');
    expect(sync.mock.calls[1][0].reminders[0].todoId).toBe('t');
  });

  it('completion and clearing a date remove pending reminders', async () => {
    await service.syncTodos([{ ...todo, isCompleted: true }]);
    await service.syncTodos([{ ...todo, scheduledDate: undefined }]);
    expect(sync.mock.calls.every(([input]) => input.reminders.length === 0)).toBe(true);
  });

  it('does not clear the native store before persisted data is ready', async () => {
    await service.refresh();
    expect(sync).not.toHaveBeenCalled();
  });

  it('passes calendar opt-in and reports calendar errors without rejecting notification sync', async () => {
    sync.mockResolvedValueOnce({ calendar: { supported: true, granted: false, error: '请恢复日历权限' } });
    await expect(service.syncTodos([{ ...todo, reminders: {
      scheduledDate: { daysBefore: 0, time: '09:00', calendarSync: true }
    } }])).resolves.toBeUndefined();
    expect(sync.mock.calls[0][0].reminders[0].calendarSync).toBe(true);
    expect(service.getError()).toBe('请恢复日历权限');
    await service.refresh();
    expect(service.getError()).toBe('');
  });

  it('does not call missing calendar methods on older native plugins', async () => {
    const requestCalendar = vi.fn();
    const legacy = new TodoReminderService(true, {
      getStatus: vi.fn().mockResolvedValue({ supported: true, background: true }), requestCalendar
    } as any);
    await legacy.requestCalendar();
    expect(requestCalendar).not.toHaveBeenCalled();
  });

  it('requests calendar permission only through an explicit supported native action', async () => {
    const requestCalendar = vi.fn().mockResolvedValue({ calendar: { supported: true, granted: true } });
    const native = new TodoReminderService(true, {
      getStatus: vi.fn().mockResolvedValue({ calendar: { supported: true, granted: false } }), requestCalendar
    } as any);
    expect((await native.requestCalendar()).calendar?.granted).toBe(true);
    expect(requestCalendar).toHaveBeenCalledTimes(1);
  });

  it('clears recovered calendar errors when reading current native status', async () => {
    sync.mockResolvedValueOnce({ calendar: { supported: true, granted: false, error: '请恢复日历权限' } });
    const native = new TodoReminderService(true, {
      sync, getStatus: vi.fn().mockResolvedValue({ calendar: { supported: true, granted: true, error: '' } })
    } as any);
    await native.syncTodos([todo]);
    expect(native.getError()).toBe('请恢复日历权限');
    await native.getStatus();
    expect(native.getError()).toBe('');
  });
});
