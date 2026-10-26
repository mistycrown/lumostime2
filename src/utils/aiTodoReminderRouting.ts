/**
 * @file aiTodoReminderRouting.ts
 * @input Foreground AI output, live todo candidates and the user's reminder request
 * @output Todo-targeted reminders routed to application tool calls; standalone reminders retained
 * @pos Utility
 * @updated 2026-10-26: Repairs legacy AI reminder output only for an unambiguous named todo.
 */
import type { TodoItem } from '../types';
import type { AssistantToolCall, AssistantUnifiedTurnOutput } from '../types/assistant';
import { formatDateKey } from './todoScheduleUtils';
import { getReminderDaysBefore } from './todoReminderUtils';

export const routeAITodoReminders = (
  output: AssistantUnifiedTurnOutput,
  todos: TodoItem[],
  sourceText: string
): AssistantUnifiedTurnOutput => {
  if (!output.reminders?.length || !/(提醒|remind)/i.test(sourceText)) return output;
  const toolCalls = [...(output.toolCalls || [])];
  const clarifications: string[] = [];
  const reminders = output.reminders.filter((reminder) => {
    const creates = toolCalls.filter((call) => call.toolName === 'create_todo');
    const candidates = [
      ...todos.filter((todo) => !todo.isCompleted && !todo.abandonedAt)
        .map((todo) => ({ todo, create: undefined as typeof creates[number] | undefined })),
      ...creates.map((create) => ({ todo: create.args, create }))
    ].filter(({ todo }) => todo.title.trim().length >= 2
      && reminder.text.includes(todo.title.trim()));
    if (!candidates.length) return true;
    // A task reminder must not silently become an independent assistant reminder.
    if (candidates.length > 1) {
      clarifications.push(`有多个匹配“${candidates[0].todo.title}”的待办，请明确要为哪一个设置提醒。`);
      return false;
    }
    if (candidates[0].todo.recurrenceRule) {
      clarifications.push(`“${candidates[0].todo.title}”是重复待办，暂不支持这类日期提醒。`);
      return false;
    }
    const { todo, create } = candidates[0];
    const at = new Date(reminder.dueAt);
    if (!Number.isFinite(at.getTime())) return true;
    const reminderDate = formatDateKey(at);
    const todoId = 'id' in todo ? todo.id : undefined;
    const update = toolCalls.find((call) => call.toolName === 'update_todo' && call.args.todoId === todoId);
    const datePatch = update?.toolName === 'update_todo' ? update.args.patch : {};
    const effective = { ...todo, ...datePatch };
    const field = /截止/.test(sourceText) ? 'deadlineDate'
      : effective.scheduledDate ? 'scheduledDate' : effective.deadlineDate ? 'deadlineDate' : 'scheduledDate';
    const sourceDate = effective[field] || reminderDate;
    const daysBefore = getReminderDaysBefore(sourceDate, reminderDate);
    if (daysBefore === null) return true;
    const setting = {
      daysBefore,
      time: `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`,
      ...(/(同步|添加到|加入|写入).*日历|日历.*提醒/.test(sourceText)
        && !/(不|别|取消|关闭).*日历/.test(sourceText) ? { calendarSync: true } : {})
    };
    const explicitReminders = create ? create.args.reminders : datePatch.reminders;
    if (explicitReminders === null || explicitReminders?.[field] === null) return false;
    const existing = explicitReminders?.[field];
    // A structured todo reminder wins over a duplicate top-level assistant reminder.
    const patch = {
      ...datePatch,
      ...(!effective[field] ? { [field]: sourceDate } : {}),
      reminders: { ...datePatch.reminders, [field]: existing || setting }
    };
    if (create) {
      const index = toolCalls.indexOf(create);
      toolCalls[index] = { ...create, args: { ...create.args, ...(!effective[field] ? { [field]: sourceDate } : {}),
        reminders: { ...create.args.reminders, [field]: existing || setting } } };
    } else if (update?.toolName === 'update_todo') {
      toolCalls[toolCalls.indexOf(update)] = { ...update, args: { ...update.args, patch } };
    } else if (todoId) {
      toolCalls.push({ toolName: 'update_todo', args: { todoId, patch } } as AssistantToolCall);
    } else return true;
    return false;
  });
  return { ...output, toolCalls, reminders,
    ...(clarifications.length ? { outcome: 'clarify', assistantReply: [...new Set(clarifications)].join('\n\n') } : {}) };
};
