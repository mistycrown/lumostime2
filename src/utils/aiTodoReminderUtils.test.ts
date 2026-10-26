/**
 * @file aiTodoReminderUtils.test.ts
 * @input Synthetic AI reminder patches and future local todo dates
 * @output Regression coverage for non-destructive application reminder writes
 * @pos Utility test
 * @updated 2026-10-26: Covers validation, partial updates, removal and calendar preferences.
 */
import { describe, expect, it } from 'vitest';
import type { TodoItem } from '../types';
import { applyAITodoReminderPatch, normalizeAITodoReminderPatch } from './aiTodoReminderUtils';

const todo: TodoItem = {
  id: 'todo', title: '交报告', categoryId: 'work', isCompleted: false,
  scheduledDate: '2099-12-30', deadlineDate: '2100-01-01',
  reminders: {
    scheduledDate: { daysBefore: 0, time: '09:00', calendarSync: true },
    deadlineDate: { daysBefore: 1, time: '18:00' }
  }
};

describe('AI todo reminder patches', () => {
  it('preserves the other reminder and existing calendar opt-in while changing the time', () => {
    expect(applyAITodoReminderPatch(todo, { scheduledDate: { daysBefore: 1, time: '08:30' } })).toEqual({
      scheduledDate: { daysBefore: 1, time: '08:30', calendarSync: true },
      deadlineDate: todo.reminders!.deadlineDate
    });
    expect(todo.reminders!.scheduledDate!.time).toBe('09:00');
  });

  it('turns off calendar sync while retaining the application reminder', () => {
    expect(applyAITodoReminderPatch(todo, { scheduledDate: { daysBefore: 0, time: '09:00', calendarSync: false } }))
      .toEqual({ scheduledDate: { daysBefore: 0, time: '09:00' }, deadlineDate: todo.reminders!.deadlineDate });
  });

  it('removes one reminder or all reminders explicitly', () => {
    expect(applyAITodoReminderPatch(todo, { scheduledDate: null })).toEqual({ deadlineDate: todo.reminders!.deadlineDate });
    expect(applyAITodoReminderPatch(todo, null)).toBeUndefined();
    expect(applyAITodoReminderPatch(todo, undefined)).toEqual(todo.reminders);
  });

  it('cleans orphaned reminders after removing a date or enabling recurrence', () => {
    expect(applyAITodoReminderPatch({ ...todo, scheduledDate: undefined }, undefined))
      .toEqual({ deadlineDate: todo.reminders!.deadlineDate });
    expect(applyAITodoReminderPatch({ ...todo, recurrenceRule: { frequency: 'daily', startDate: '2099-12-30' } }, undefined))
      .toBeUndefined();
  });

  it.each([
    { scheduledDate: { daysBefore: 0, time: '25:00' } },
    { scheduledDate: { daysBefore: 0.5, time: '09:00' } },
    { scheduledDate: { daysBefore: 0, time: '09:00', calendarSync: 'yes' } },
    { unexpected: { daysBefore: 0, time: '09:00' } }
  ])('rejects malformed reminder settings without silently losing the request: %j', (patch) => {
    expect(() => normalizeAITodoReminderPatch(patch)).toThrow();
  });

  it('rejects missing dates, recurring todos and past times', () => {
    const patch = { scheduledDate: { daysBefore: 0, time: '09:00' } };
    expect(() => applyAITodoReminderPatch({ ...todo, scheduledDate: undefined }, patch)).toThrow('日期');
    expect(() => applyAITodoReminderPatch({ ...todo, recurrenceRule: { frequency: 'daily', startDate: '2099-12-30' } }, patch)).toThrow('重复');
    expect(() => applyAITodoReminderPatch({ ...todo, scheduledDate: '2000-01-01' }, patch)).toThrow('未来');
  });
});
