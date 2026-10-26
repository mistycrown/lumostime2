/**
 * @file assistantTodoReminderService.ts
 * @input Read-only native reminder permissions and applied AI todo actions
 * @output Prompt permission context and truthful reminder availability notices
 * @pos Service (AI Integration)
 * @updated 2026-10-26: Checks permissions without requesting them or creating assistant reminders.
 */
import type { TodoReminderStatus } from '../plugins/TodoReminderPlugin';
import type { AppliedChatAction } from './assistantActionExecutor';
import { todoReminderService } from './todoReminderService';
import { TODO_REMINDER_FIELDS } from '../utils/todoReminderUtils';

export const getAssistantTodoReminderStatus = async (): Promise<TodoReminderStatus | null> => {
  try { return await todoReminderService.getStatus(); }
  catch { return null; }
};

export const buildAssistantTodoReminderPermissionPrompt = (status: TodoReminderStatus | null): string => [
  '=== Todo Reminder Permissions ===',
  JSON.stringify(status || { status: 'unknown' }),
  'These are application todo reminders, separate from top-level AI reminders. Calendar sync is opt-in.',
  'If calendar permission is missing, say the setting is saved but calendar sync requires enabling calendar permission in system app settings. Never claim calendar sync has completed.',
  'If notifications are disabled, explain that application notifications require notification permission. Do not request permissions automatically.',
  'If calendar is unsupported or permission status is unknown, state that limitation when calendar sync is requested.'
].join('\n');

export const getAssistantTodoReminderNotices = (
  actions: AppliedChatAction[],
  status: TodoReminderStatus | null
): string[] => {
  const settings = actions.flatMap((action) => {
    if (action.status !== 'applied') return [];
    if (action.kind === 'update_todo') {
      const next = action.snapshot.nextTodo;
      const previous = action.snapshot.previousTodo;
      return TODO_REMINDER_FIELDS.flatMap((field) => {
        const setting = next?.reminders?.[field];
        return setting && (JSON.stringify(setting) !== JSON.stringify(previous?.reminders?.[field])
          || next?.[field] !== previous?.[field]) ? [setting] : [];
      });
    }
    return action.kind === 'create_todo' || action.kind === 'create_subtask'
      ? [action.snapshot.reminders, ...(action.snapshot.createdSubtaskReminders || [])]
        .flatMap((reminders) => Object.values(reminders || {})) : [];
  });
  if (!settings.length) return [];
  if (!status) return ['提醒设置已保存，但暂时无法检查通知和日历权限，请在待办提醒设置中确认。'];
  const notices: string[] = [];
  if (!status.supported) notices.push(status.background
    ? '提醒时间已保存，请更新 Android 安装包以启用本地提醒。' : '提醒时间已保存，此设备暂不支持应用通知。');
  else if (!status.notifications) notices.push('提醒时间已保存，应用通知尚未开启，请在系统设置中允许通知。');
  else if (!status.background) notices.push('应用提醒仅在应用运行时生效。');
  else if (!status.exact) notices.push('未开启准时提醒权限，应用提醒可能延迟。');
  if (settings.some((setting) => setting.calendarSync)) {
    if (!status.calendar?.supported) notices.push('此设备暂不支持系统日历同步，尚未同步日历。');
    else if (!status.calendar.granted) notices.push('尚未同步日历，请先在系统应用设置中开启日历权限。');
    else if (status.calendar.error) notices.push(`系统日历尚未同步成功：${status.calendar.error}`);
    else notices.push('已开启系统日历同步，待办保存后将同步。');
  }
  return notices;
};
