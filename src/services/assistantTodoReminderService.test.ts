/**
 * @file assistantTodoReminderService.test.ts
 * @input Permission states and applied/failed todo action snapshots
 * @output Coverage for notification/calendar permission notices without permission prompts
 * @pos Service test
 * @updated 2026-10-26: Verifies denied, unsupported, unknown and authorized calendar handling.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppliedChatAction } from './assistantActionExecutor';
import { todoReminderService } from './todoReminderService';
import { buildAssistantTodoReminderPermissionPrompt, getAssistantTodoReminderNotices, getAssistantTodoReminderStatus } from './assistantTodoReminderService';

const actions: AppliedChatAction[] = [{ actionId: 'create', kind: 'create_todo', status: 'applied', snapshot: {
  title: '提交报告', todoId: 'todo', categoryId: 'work', categoryName: '工作', defaultScopeIds: [], defaultScopeNames: [],
  scheduledDate: '2099-12-31', reminders: { scheduledDate: { daysBefore: 0, time: '09:00', calendarSync: true } }
} }];
const status = { supported: true, background: true, notifications: true, exact: true,
  calendar: { supported: true, granted: false } };
afterEach(() => vi.restoreAllMocks());

describe('assistant todo reminder permissions', () => {
  it('reads status without requesting calendar or notification permissions', async () => {
    vi.spyOn(todoReminderService, 'getStatus').mockResolvedValue(status);
    const calendar = vi.spyOn(todoReminderService, 'requestCalendar');
    const notifications = vi.spyOn(todoReminderService, 'requestNotifications');
    expect(await getAssistantTodoReminderStatus()).toEqual(status);
    expect(calendar).not.toHaveBeenCalled();
    expect(notifications).not.toHaveBeenCalled();
    expect(buildAssistantTodoReminderPermissionPrompt(status)).toContain('"granted":false');
  });

  it('reports saved settings but missing calendar and notification permissions', () => {
    const notices = getAssistantTodoReminderNotices(actions, { ...status, notifications: false }).join('\n');
    expect(notices).toContain('允许通知');
    expect(notices).toContain('尚未同步日历');
    expect(notices).toContain('开启日历权限');
  });

  it('distinguishes unsupported, unknown and enabled calendar synchronization', async () => {
    expect(getAssistantTodoReminderNotices(actions, { ...status, calendar: undefined }).join('')).toContain('暂不支持系统日历');
    expect(getAssistantTodoReminderNotices(actions, { ...status, calendar: { supported: true, granted: true } }).join('')).toContain('待办保存后将同步');
    vi.spyOn(todoReminderService, 'getStatus').mockRejectedValue(new Error('bridge unavailable'));
    expect(await getAssistantTodoReminderStatus()).toBeNull();
    expect(getAssistantTodoReminderNotices(actions, null).join('')).toContain('无法检查');
  });

  it('does not report success for failed writes or reminders being removed', () => {
    expect(getAssistantTodoReminderNotices([{ ...actions[0], status: 'failed' }], status)).toEqual([]);
    expect(getAssistantTodoReminderNotices([{ actionId: 'remove', kind: 'update_todo', status: 'applied', snapshot: {
      nextTodo: { id: 'todo', title: '报告', categoryId: 'work', isCompleted: false }
    } }], status)).toEqual([]);
  });
});
