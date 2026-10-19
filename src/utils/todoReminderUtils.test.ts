/**
 * @file todoReminderUtils.test.ts
 * @input Date-relative reminder settings and todo lifecycle changes
 * @output Regression coverage for scheduling, validation and duplication
 * @pos Test
 * @updated 2026-10-18: Checks strict calendar opt-in, independent sources and cancellation projections.
 * @updated 2026-10-17: Covers separate date sources, rescheduling, cancellation and invalid imports.
 */
import { describe, expect, it } from 'vitest';
import type { TodoItem } from '../types';
import { buildDuplicatedTodo, normalizeTodoScheduleFields } from './todoDuplicateUtils';
import { buildTodoReminderSnapshot, getReminderDaysBefore, getTodoReminderDate, getTodoReminderTimestamp, normalizeTodoReminderSetting, normalizeTodoReminders } from './todoReminderUtils';

const todo: TodoItem = { id: 'task', categoryId: 'cat', title: '交论文', isCompleted: false,
  scheduledDate: '2026-10-20', deadlineDate: '2026-10-23', reminders: {
    scheduledDate: { daysBefore: 0, time: '09:00' }, deadlineDate: { daysBefore: 1, time: '18:30' }
  } };

describe('todo local reminder projection', () => {
  it('only enables calendar sync for explicit true and preserves independent date settings', () => {
    for (const calendarSync of [undefined, false, 'true', 1, null]) {
      expect(normalizeTodoReminderSetting({ daysBefore: 0, time: '09:00', calendarSync }))
        .toEqual({ daysBefore: 0, time: '09:00' });
    }
    const enabled = { ...todo, reminders: { ...todo.reminders,
      scheduledDate: { daysBefore: 0, time: '09:00', calendarSync: true } } };
    const snapshot = buildTodoReminderSnapshot([enabled]);
    expect(snapshot.find((entry) => entry.field === 'scheduledDate')?.calendarSync).toBe(true);
    expect(snapshot.find((entry) => entry.field === 'deadlineDate')?.calendarSync).toBeUndefined();
    expect(buildTodoReminderSnapshot([{ ...enabled, isCompleted: true }])).toEqual([]);
    expect(buildTodoReminderSnapshot([{ ...enabled, scheduledDate: undefined }]).some((entry) => entry.calendarSync)).toBe(false);
    expect(buildDuplicatedTodo(enabled, { title: '副本', duplicateId: 'copy', clearDates: false }).reminders).toBeUndefined();
  });

  it('keeps two distinct date sources and preserves Chinese titles', () => {
    const result = buildTodoReminderSnapshot([todo]);
    expect(result).toHaveLength(2);
    expect(new Set(result.map((item) => item.id)).size).toBe(2);
    expect(result[0].title).toBe('交论文');
  });

  it('moves a reminder with its source date across month/year boundaries', () => {
    expect(getTodoReminderDate('2027-01-01', 1)).toBe('2026-12-31');
    expect(getTodoReminderDate('2028-03-01', 1)).toBe('2028-02-29');
    const setting = todo.reminders!.deadlineDate!;
    const at = new Date(getTodoReminderTimestamp('2026-11-01', setting)!);
    expect([at.getFullYear(), at.getMonth(), at.getDate(), at.getHours(), at.getMinutes()])
      .toEqual([2026, 9, 31, 18, 30]);
  });

  it('cancels cleared dates, completed and deleted todos and recurrence-mode dates', () => {
    expect(normalizeTodoReminders({ ...todo, scheduledDate: undefined })).toEqual({ deadlineDate: todo.reminders!.deadlineDate });
    expect(buildTodoReminderSnapshot([{ ...todo, isCompleted: true }])).toEqual([]);
    expect(buildTodoReminderSnapshot([])).toEqual([]);
    expect(normalizeTodoReminders({ ...todo, recurrenceRule: { frequency: 'daily', startDate: '2026-10-20' } })).toBeUndefined();
    expect(normalizeTodoScheduleFields({ ...todo, scheduledDate: undefined, deadlineDate: undefined }).reminders).toBeUndefined();
  });

  it('rejects malformed imported dates, times and offsets without coercion', () => {
    expect(getTodoReminderTimestamp('2026-02-30', { daysBefore: 0, time: '09:00' })).toBeNull();
    for (const setting of [{ daysBefore: 1.5, time: '09:00' }, { daysBefore: 0, time: '24:00' },
      { daysBefore: 0, time: '9:00' }, { daysBefore: '1', time: '09:00' }, { daysBefore: 4000, time: '09:00' }, null]) {
      expect(getTodoReminderTimestamp('2026-10-20', setting)).toBeNull();
    }
  });

  it('computes calendar offsets independently of DST and supports a later custom date', () => {
    expect(getReminderDaysBefore('2026-03-09', '2026-03-07')).toBe(2);
    expect(getReminderDaysBefore('2026-10-20', '2026-10-21')).toBe(-1);
    expect(getReminderDaysBefore('2026-02-30', '2026-02-28')).toBeNull();
  });

  it('does not inherit reminders when duplicating, even when dates are retained', () => {
    expect(buildDuplicatedTodo(todo, { title: '副本', duplicateId: 'copy', clearDates: false }).reminders).toBeUndefined();
  });
});
