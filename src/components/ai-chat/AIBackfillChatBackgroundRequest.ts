/**
 * @file AIBackfillChatBackgroundRequest.ts
 * @input Background trigger metadata, assembled assistant state context, and conversation context
 * @output The normalized request payload consumed by the background assistant orchestrator
 * @pos Component Support (AI Background Workflow)
 * @description Keeps optional background prompt fields consistent across reminder, check-in, and submitted-log workflows.
 * @updated 2026-09-22: Extracted background request payload assembly from AIBackfillChatModal.
 */

import type { AIConversationTurn } from '../../services/aiService';
import type { AssistantSystemTrigger, AssistantTurnDictionaryContext } from '../../types/assistant';

export interface AssistantBackgroundStateContext {
  currentDateTime: string;
  stateContextDate: string;
  timelineSummaryForDate?: string;
  timelineSummaryForPreviousDate?: string;
  timelineReviewSummary?: string;
  activeSessionSummary?: string;
  scheduledTodosForDateSummary?: string;
  pinnedTodoSummary?: string;
  overdueTodoSummary?: string;
}

export const buildAssistantBackgroundTurnRequest = ({
  trigger,
  targetSessionId,
  showSystemNotification,
  stateContext,
  reminderSummary,
  userPersonaPrompt,
  dictionaryContext,
  conversationHistory,
  includeDebugInPersistedMessage
}: {
  trigger: AssistantSystemTrigger;
  targetSessionId?: string;
  showSystemNotification: boolean;
  stateContext: AssistantBackgroundStateContext;
  reminderSummary?: string;
  userPersonaPrompt?: string;
  dictionaryContext?: AssistantTurnDictionaryContext;
  conversationHistory?: AIConversationTurn[];
  includeDebugInPersistedMessage?: boolean;
}) => ({
  trigger,
  ...(targetSessionId ? { targetSessionId } : {}),
  showSystemNotification,
  currentDateTime: stateContext.currentDateTime,
  defaultDate: stateContext.stateContextDate,
  todayTimelineSummary: stateContext.timelineSummaryForDate || '',
  ...(stateContext.timelineSummaryForPreviousDate ? { yesterdayTimelineSummary: stateContext.timelineSummaryForPreviousDate } : {}),
  ...(stateContext.timelineReviewSummary ? { timelineReviewSummary: stateContext.timelineReviewSummary } : {}),
  ...(stateContext.activeSessionSummary ? { activeSessionSummary: stateContext.activeSessionSummary } : {}),
  ...(stateContext.scheduledTodosForDateSummary ? { todayScheduledTodoSummary: stateContext.scheduledTodosForDateSummary } : {}),
  ...(stateContext.pinnedTodoSummary ? { pinnedTodoSummary: stateContext.pinnedTodoSummary } : {}),
  ...(stateContext.overdueTodoSummary ? { overdueTodoSummary: stateContext.overdueTodoSummary } : {}),
  ...(reminderSummary ? { reminderSummary } : {}),
  ...(userPersonaPrompt ? { userPersonaPrompt } : {}),
  dictionaryContext,
  conversationHistory,
  ...(includeDebugInPersistedMessage ? { includeDebugInPersistedMessage: true } : {})
});
