/**
 * @file useAIBackfillChatResultHandlers.ts
 * @input Assistant result state, message mutation callbacks, and memory persistence
 * @output Pending-message replacement, memory patching, and assistant reply normalization helpers
 * @pos Component Support (AI Integration)
 * @description Keeps assistant result composition and reply fallback rules out of the main chat modal.
 * @updated 2026-09-22: Extracted result composition handlers from AIBackfillChatModal.
 */
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { assistantMemoryService } from '../../services/assistantMemoryService';
import type { AppliedChatAction } from '../../services/assistantActionExecutor';
import { buildAssistantDisplayParts } from '../../utils/assistantMessageParts';
import { buildMemoryUpdateSections } from './AIBackfillChatHelpers';
import {
  LOG_EDIT_REQUEST_PATTERN,
  LOG_EDIT_SUCCESS_REPLY_PATTERN,
  type AIChatDebugSection,
  type AIChatMessage,
  type AIChatMemoryUpdateSection,
  type AIChatDreamUpdateCard,
  type ChatTone
} from './AIBackfillChatShared';
import type {
  AssistantLetterResultCard,
  AssistantLocalQueryResult,
  AssistantMemory,
  AssistantReasoningSummary,
  AssistantReminder,
  AssistantUnifiedTurnOutput
} from '../../types/assistant';
import type {
  AIChatDailyNewspaperWritebackResult,
  AIChatDailyReviewWritebackResult,
  AIChatMonthlyNewspaperWritebackResult,
  AIChatMonthlyReviewWritebackResult,
  AIChatWeeklyNewspaperWritebackResult,
  AIChatWeeklyReviewWritebackResult
} from './AIBackfillChatShared';

type ReplacePendingResultOptions = {
  tone?: ChatTone;
  reasoning?: AssistantReasoningSummary;
  displayParts?: string[];
  debugSections?: AIChatDebugSection[];
  appliedActions?: AppliedChatAction[];
  assistantLetterResult?: AssistantLetterResultCard;
  localQueryResults?: AssistantLocalQueryResult[];
  memoryUpdates?: AIChatMemoryUpdateSection[];
  memoryBefore?: AssistantMemory;
  dreamUpdates?: AIChatDreamUpdateCard[];
  reminderUpdates?: string[];
  remindersBefore?: AssistantReminder[];
  dailyNewspaperWriteback?: AIChatDailyNewspaperWritebackResult;
  dailyReviewWriteback?: AIChatDailyReviewWritebackResult;
  weeklyNewspaperWriteback?: AIChatWeeklyNewspaperWritebackResult;
  weeklyReviewWriteback?: AIChatWeeklyReviewWritebackResult;
  monthlyNewspaperWriteback?: AIChatMonthlyNewspaperWritebackResult;
  monthlyReviewWriteback?: AIChatMonthlyReviewWritebackResult;
  retryInput?: string;
  retrySourceUserMessageId?: string;
  dreamRetryYearMonth?: string;
};

export interface AIBackfillChatResultHandlerOptions {
  isOpenRef: MutableRefObject<boolean>;
  onUnreadAssistantMessage?: (count?: number) => void;
  replaceMessage: (sessionId: string, messageId: string, nextMessage: AIChatMessage) => void;
  setExpandedDreamUpdateMessageIds: Dispatch<SetStateAction<Set<string>>>;
  refreshAssistantMemorySnapshot: () => void;
}

export const useAIBackfillChatResultHandlers = ({
  isOpenRef,
  onUnreadAssistantMessage,
  replaceMessage,
  setExpandedDreamUpdateMessageIds,
  refreshAssistantMemorySnapshot
}: AIBackfillChatResultHandlerOptions) => {
    const replacePendingWithResult = (
      sessionId: string,
      pendingMessageId: string,
      content: string,
      options?: {
        tone?: ChatTone;
        reasoning?: AssistantReasoningSummary;
        displayParts?: string[];
        debugSections?: AIChatDebugSection[];
        appliedActions?: AppliedChatAction[];
        assistantLetterResult?: AssistantLetterResultCard;
        localQueryResults?: AssistantLocalQueryResult[];
        memoryUpdates?: AIChatMemoryUpdateSection[];
        memoryBefore?: AssistantMemory;
        dreamUpdates?: AIChatDreamUpdateCard[];
        reminderUpdates?: string[];
        remindersBefore?: AssistantReminder[];
        dailyNewspaperWriteback?: AIChatDailyNewspaperWritebackResult;
        dailyReviewWriteback?: AIChatDailyReviewWritebackResult;
        weeklyNewspaperWriteback?: AIChatWeeklyNewspaperWritebackResult;
        weeklyReviewWriteback?: AIChatWeeklyReviewWritebackResult;
        monthlyNewspaperWriteback?: AIChatMonthlyNewspaperWritebackResult;
        monthlyReviewWriteback?: AIChatMonthlyReviewWritebackResult;
        retryInput?: string;
        retrySourceUserMessageId?: string;
        dreamRetryYearMonth?: string;
      }
    ) => {
      replaceMessage(sessionId, pendingMessageId, {
        id: pendingMessageId,
        role: 'assistant',
        content,
        ...(options?.reasoning ? { reasoning: options.reasoning } : {}),
        ...(options?.displayParts?.length ? { displayParts: options.displayParts } : {}),
        createdAt: Date.now(),
        ...(options?.tone ? { tone: options.tone } : {}),
        ...(options?.debugSections && options.debugSections.length > 0 ? { debugSections: options.debugSections } : {}),
        ...(options?.appliedActions && options.appliedActions.length > 0 ? { appliedActions: options.appliedActions } : {}),
        ...(options?.assistantLetterResult ? { assistantLetterResult: options.assistantLetterResult } : {}),
        ...(options?.localQueryResults && options.localQueryResults.length > 0 ? { localQueryResults: options.localQueryResults } : {}),
        ...(options?.memoryUpdates && options.memoryUpdates.length > 0 ? { memoryUpdates: options.memoryUpdates } : {}),
        ...(options?.memoryBefore ? { memoryBefore: options.memoryBefore } : {}),
        ...(options?.dreamUpdates && options.dreamUpdates.length > 0 ? { dreamUpdates: options.dreamUpdates } : {}),
        ...(options?.reminderUpdates && options.reminderUpdates.length > 0 ? { reminderUpdates: options.reminderUpdates } : {}),
        ...(options?.remindersBefore ? { remindersBefore: options.remindersBefore } : {}),
        ...(options?.dailyNewspaperWriteback ? { dailyNewspaperWriteback: options.dailyNewspaperWriteback } : {}),
        ...(options?.dailyReviewWriteback ? { dailyReviewWriteback: options.dailyReviewWriteback } : {}),
        ...(options?.weeklyNewspaperWriteback ? { weeklyNewspaperWriteback: options.weeklyNewspaperWriteback } : {}),
        ...(options?.weeklyReviewWriteback ? { weeklyReviewWriteback: options.weeklyReviewWriteback } : {}),
        ...(options?.monthlyNewspaperWriteback ? { monthlyNewspaperWriteback: options.monthlyNewspaperWriteback } : {}),
        ...(options?.monthlyReviewWriteback ? { monthlyReviewWriteback: options.monthlyReviewWriteback } : {}),
        ...(options?.retryInput ? { retryInput: options.retryInput } : {}),
        ...(options?.retrySourceUserMessageId ? { retrySourceUserMessageId: options.retrySourceUserMessageId } : {}),
        ...(options?.dreamRetryYearMonth ? { dreamRetryYearMonth: options.dreamRetryYearMonth } : {})
      });
  
      if (options?.dreamUpdates && options.dreamUpdates.length > 0) {
        setExpandedDreamUpdateMessageIds((current) => {
          const next = new Set(current);
          next.add(pendingMessageId);
          return next;
        });
      }
  
      if (!isOpenRef.current) {
        onUnreadAssistantMessage?.(1);
      }
    };

    const applyAssistantMemoryPatch = (
      patch?: AssistantUnifiedTurnOutput['memoryPatch'],
    ): { before: AssistantMemory; updates: AIChatMemoryUpdateSection[] } | null => {
      if (!patch) {
        return null;
      }
  
      const before = assistantMemoryService.getMemory();
      const after = assistantMemoryService.applyPatch(patch);
      refreshAssistantMemorySnapshot();
      return {
        before,
        updates: buildMemoryUpdateSections(before, after)
      };
    };
  
    const resolveAssistantDisplayParts = (
      content: string
    ): string[] | undefined => (
      buildAssistantDisplayParts(content)
    );
  
    const resolveAssistantReplyContent = (
      output?: Pick<AssistantUnifiedTurnOutput, 'assistantReply' | 'outcome'>,
      fallbackReply?: string
    ): string => {
      const assistantReply = output?.assistantReply?.trim() || '';
      if (assistantReply) {
        return assistantReply;
      }
  
      return fallbackReply?.trim() || (
        output?.outcome === 'clarify'
          ? '这次还差一点关键信息，你再补一句我就能继续。'
          : '我在。'
      );
    };
  
    const resolveForegroundAssistantReply = (
      rawContent: string,
      sourceText: string,
      appliedActions: AppliedChatAction[]
    ): string => {
      const editLogActions = appliedActions.filter((action) => action.kind === 'edit_log');
      const successfulEditLogCount = editLogActions.filter((action) => action.status === 'applied').length;
      const failedEditLogActions = editLogActions.filter((action) => action.status === 'failed');
  
      if (failedEditLogActions.length > 0 && successfulEditLogCount === 0) {
        return failedEditLogActions[0]?.errorMessage?.trim() || '这次我还没实际改动这条记录。';
      }
  
      if (successfulEditLogCount > 0) {
        return rawContent;
      }
  
      if (
        LOG_EDIT_REQUEST_PATTERN.test(sourceText)
        && LOG_EDIT_SUCCESS_REPLY_PATTERN.test(rawContent)
      ) {
        return '这次我还没实际改动这条记录。要么是没有匹配到目标记录，要么是修改条件还不够明确。你可以再说得更具体一点，我再帮你改。';
      }
  
      return rawContent;
    };
  return {
    applyAssistantMemoryPatch,
    replacePendingWithResult,
    resolveAssistantDisplayParts,
    resolveAssistantReplyContent,
    resolveForegroundAssistantReply
  };
};

