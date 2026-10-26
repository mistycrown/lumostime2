/**
 * @file aiTodoReminderRouting.test.ts
 * @input Legacy reminder output and unambiguous/ambiguous todo candidates
 * @output Coverage for todo reminder routing and independent AI reminders
 * @pos Utility test
 * @updated 2026-10-26: Verifies same-turn creation, date attachment and duplicate suppression.
 */
import { describe, expect, it } from 'vitest';
import type { TodoItem } from '../types';
import type { AssistantUnifiedTurnOutput } from '../types/assistant';
import { routeAITodoReminders } from './aiTodoReminderRouting';

const todo: TodoItem = { id: 'report', title: '提交报告', categoryId: 'work', isCompleted: false, deadlineDate: '2099-12-31' };
const output: AssistantUnifiedTurnOutput = { mode: 'foreground', outcome: 'reply', memoryAction: 'no_update',
  reminders: [{ type: 'todo_due', text: '提醒用户提交报告', dueAt: '2099-12-30T18:00:00' }] };

describe('todo reminder routing', () => {
  it('routes a uniquely named todo to a deadline reminder and keeps unrelated AI reminders', () => {
    const result = routeAITodoReminders({ ...output, reminders: [...output.reminders!, {
      text: '喝水', dueAt: '2099-12-30T19:00:00'
    }] }, [todo], '这个待办提前一天提醒，同步日历');
    expect(result.toolCalls).toEqual([{ toolName: 'update_todo', args: { todoId: 'report', patch: {
      reminders: { deadlineDate: { daysBefore: 1, time: '18:00', calendarSync: true } }
    } } }]);
    expect(result.reminders?.map((reminder) => reminder.text)).toEqual(['喝水']);
  });

  it('uses the requested time instead of the old todo reminder', () => {
    const result = routeAITodoReminders(output, [{ ...todo,
      reminders: { deadlineDate: { daysBefore: 0, time: '10:00' } }
    }], '提前提醒');
    expect(result.toolCalls?.[0]).toMatchObject({ args: { patch: {
      reminders: { deadlineDate: { daysBefore: 1, time: '18:00' } }
    } } });
  });

  it('attaches an explicit reminder date when the todo has no dates', () => {
    const result = routeAITodoReminders(output, [{ ...todo, deadlineDate: undefined }], '提醒');
    expect(result.toolCalls?.[0]).toMatchObject({ args: { patch: { scheduledDate: '2099-12-30',
      reminders: { scheduledDate: { daysBefore: 0, time: '18:00' } }
    } } });
  });

  it('adds reminders to same-turn new todos without a second todo or AI reminder', () => {
    const result = routeAITodoReminders({ ...output, toolCalls: [{ toolName: 'create_todo', args: {
      title: todo.title, kind: 'quick', categoryId: '__virtual_quick__', deadlineDate: todo.deadlineDate
    } }] }, [], '添加待办并提醒');
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls?.[0]).toMatchObject({ toolName: 'create_todo', args: {
      reminders: { deadlineDate: { daysBefore: 1, time: '18:00' } }
    } });
    expect(result.reminders).toEqual([]);
  });

  it('does not duplicate or override an explicit todo reminder or cancellation', () => {
    const patch = { reminders: { deadlineDate: { daysBefore: 2, time: '08:00' } } };
    const result = routeAITodoReminders({ ...output, toolCalls: [{ toolName: 'update_todo', args: { todoId: todo.id, patch } }] }, [todo], '提醒');
    expect(result.toolCalls?.[0]).toMatchObject({ args: { patch } });
    expect(result.reminders).toEqual([]);
    const cancellation = routeAITodoReminders({ ...output, toolCalls: [{ toolName: 'update_todo', args: {
      todoId: todo.id, patch: { reminders: null }
    } }] }, [todo], '取消提醒');
    expect(cancellation.toolCalls?.[0]).toMatchObject({ args: { patch: { reminders: null } } });
    expect(cancellation.reminders).toEqual([]);
  });

  it('keeps independent and ambiguous reminders out of todo writes', () => {
    expect(routeAITodoReminders(output, [], '提醒').reminders).toEqual(output.reminders);
    const ambiguous = routeAITodoReminders(output, [todo, { ...todo, id: 'duplicate' }], '提醒');
    expect(ambiguous.toolCalls).toEqual([]);
    expect(ambiguous.reminders).toEqual([]);
    expect(ambiguous.outcome).toBe('clarify');
    const unrelated = { ...output, reminders: [{ text: '喝水', dueAt: '2099-12-30T19:00:00' }] };
    expect(routeAITodoReminders(unrelated, [todo], '提交报告，另外提醒喝水').reminders).toEqual(unrelated.reminders);
  });
});
