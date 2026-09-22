/**
 * @file AIBackfillChatReminderTrigger.ts
 * @input A due assistant reminder and the current local clock
 * @output A normalized reminder_due system trigger for background dispatch
 * @pos Component Support (AI Reminder Workflow)
 * @description Builds the trigger metadata shared by Web and native reminder dispatch paths.
 * @updated 2026-09-22: Extracted reminder trigger construction from AIBackfillChatModal.
 */

import type { AssistantReminder, AssistantSystemTrigger } from '../../types/assistant';
import {
  formatAssistantDateTimeForDisplay,
  formatAssistantLocalDateTime,
  parseAssistantDateTime
} from '../../utils/assistantTime';

export const buildAssistantReminderDueTrigger = (
  reminder: AssistantReminder,
  now = new Date()
): AssistantSystemTrigger => {
  const nowLocal = formatAssistantLocalDateTime(now);
  const scheduledDueAt = formatAssistantDateTimeForDisplay(reminder.dueAt);
  const dueAtMs = parseAssistantDateTime(reminder.dueAt);
  const delayMinutes = Number.isFinite(dueAtMs)
    ? Math.max(0, Math.round((now.getTime() - dueAtMs) / 60000))
    : 0;

  return {
    id: `reminder_due:${reminder.id}:${now.getTime()}`,
    type: 'reminder_due',
    source: 'system',
    createdAt: nowLocal,
    text: reminder.text,
    metadata: {
      reminderId: reminder.id,
      reminderType: reminder.type,
      scheduledDueAt,
      actualDispatchAt: nowLocal,
      delayMinutes,
      dispatchAttemptCount: reminder.dispatchAttemptCount || 0
    }
  };
};
