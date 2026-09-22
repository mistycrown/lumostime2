/**
 * @file useAIBackfillChatQuickAddHandlers.ts
 * @input Quick-add command text, active chat session state, and local action adapters
 * @output Quick-add todo, note, and backfill handlers with shared request lifecycle management
 * @pos Component Support (AI Integration)
 * @description Keeps quick-add request orchestration and backfill argument resolution out of the main chat modal.
 * @updated 2026-09-22: Extracted quick-add command handlers from AIBackfillChatModal.
 */
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Category } from '../../types';
import type {
  AIConversationTurn,
  AIPlannedLogToolCall,
  AITodoToolCall
} from '../../services/aiService';
import {
  quickAddService,
  type AIBackfillToolCall,
  type AIQuickAddBackfillToolCall,
  type AIQuickAddNoteToolCall
} from '../../services/quickAddService';
import type { AppliedChatAction } from '../../services/assistantActionExecutor';
import type { AssistantTurnDictionaryContext } from '../../types/assistant';
import {
  formatDateKey,
  isValidBackfillDate,
  isValidBackfillTime
} from '../../utils/aiBackfillUtils';
import { formatAssistantLocalDateTime } from '../../utils/assistantTime';
import {
  getErrorDebugSections,
  getRetryableAIErrorMessage,
  isAbortError
} from './AIBackfillChatHelpers';
import { prepareForegroundTurn } from './AIBackfillChatForegroundTurn';
import type {
  AIChatDebugSection,
  AIChatSession,
  ChatTone
} from './AIBackfillChatShared';

interface ForegroundSendOptions {
  replaceMessageId?: string;
  retrySourceUserMessageId?: string;
}

type ActiveRequest = {
  controller: AbortController;
  pendingMessageId: string;
  sessionId: string;
};

type ReplacePendingWithResult = (
  sessionId: string,
  pendingMessageId: string,
  content: string,
  options?: {
    tone?: ChatTone;
    debugSections?: AIChatDebugSection[];
    appliedActions?: AppliedChatAction[];
    retryInput?: string;
    retrySourceUserMessageId?: string;
  }
) => void;

export interface AIBackfillChatQuickAddHandlerOptions {
  activeRequestRef: MutableRefObject<ActiveRequest | null>;
  activeSession: AIChatSession | null;
  applyPlannedLogToolCalls: (toolCalls: AIBackfillToolCall[]) => AppliedChatAction[];
  applyQuickAddNoteToolCalls: (
    toolCalls: AIQuickAddNoteToolCall[],
    sourceText: string
  ) => AppliedChatAction[];
  applyTodoAndPlannedTimelineLogToolCalls: (
    toolCalls: Array<AITodoToolCall | AIPlannedLogToolCall>,
    sourceText: string
  ) => AppliedChatAction[];
  buildAssistantDictionaryContext: () => AssistantTurnDictionaryContext;
  buildAssistantStateContext: (currentDate: Date) => {
    currentDateTime: string;
    timelineSummaryForDate?: string;
  };
  buildQuickAddNoteDictionaryContext: () => AssistantTurnDictionaryContext;
  buildRetryConversationHistory: (
    sessionId: string,
    retrySourceUserMessageId?: string
  ) => AIConversationTurn[];
  categories: Category[];
  createSessionTitleFromUserMessage: (message: string) => string;
  conversationHistoryCache: Map<string, AIConversationTurn[]>;
  debugMode: boolean;
  defaultDateKey: string;
  getErrorDebugSections: typeof getErrorDebugSections;
  getRetryableAIErrorMessage: typeof getRetryableAIErrorMessage;
  isAbortError: typeof isAbortError;
  mutateSession: (
    sessionId: string,
    updater: (session: AIChatSession) => AIChatSession
  ) => void;
  notifyAssistantTaskStateChanged: () => void;
  prepareForegroundTurn: typeof prepareForegroundTurn;
  replacePendingWithResult: ReplacePendingWithResult;
  setActiveRequestId: Dispatch<SetStateAction<string | null>>;
  setInputText: Dispatch<SetStateAction<string>>;
  setIsHistoryPanelOpen: Dispatch<SetStateAction<boolean>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setIsPersonaPanelOpen: Dispatch<SetStateAction<boolean>>;
}

export const useAIBackfillChatQuickAddHandlers = ({
  activeRequestRef,
  activeSession,
  applyPlannedLogToolCalls,
  applyQuickAddNoteToolCalls,
  applyTodoAndPlannedTimelineLogToolCalls,
  buildAssistantDictionaryContext,
  buildAssistantStateContext,
  buildQuickAddNoteDictionaryContext,
  buildRetryConversationHistory,
  categories,
  createSessionTitleFromUserMessage,
  conversationHistoryCache,
  debugMode,
  defaultDateKey,
  getErrorDebugSections,
  getRetryableAIErrorMessage,
  isAbortError,
  mutateSession,
  notifyAssistantTaskStateChanged,
  prepareForegroundTurn,
  replacePendingWithResult,
  setActiveRequestId,
  setInputText,
  setIsHistoryPanelOpen,
  setIsLoading,
  setIsPersonaPanelOpen
}: AIBackfillChatQuickAddHandlerOptions) => {
    const resolveQuickAddBackfillToolCall = (
      toolCall: AIQuickAddBackfillToolCall
    ): AIBackfillToolCall => {
      const rawArgs = toolCall.args;
      const categoryById = rawArgs.categoryId
        ? categories.find((category) => category.id === rawArgs.categoryId)
        : undefined;
      const activityById = rawArgs.activityId
        ? categories
          .flatMap((category) => category.activities.map((activity) => ({ activity, category })))
          .find(({ activity }) => activity.id === rawArgs.activityId)
        : undefined;
      const categoryName = rawArgs.categoryName?.trim().toLowerCase();
      const activityName = rawArgs.activityName?.trim().toLowerCase();
      const matchingCategory = categoryName
        ? categories.find((category) => category.name.trim().toLowerCase() === categoryName)
          || categories.find((category) => category.name.trim().toLowerCase().includes(categoryName))
        : undefined;
      const matchingActivity = activityName
        ? categories
          .filter((category) => !matchingCategory || category.id === matchingCategory.id)
          .flatMap((category) => category.activities.map((activity) => ({ activity, category })))
          .find(({ activity }) => activity.name.trim().toLowerCase() === activityName)
          || categories
            .filter((category) => !matchingCategory || category.id === matchingCategory.id)
            .flatMap((category) => category.activities.map((activity) => ({ activity, category })))
            .find(({ activity }) => activity.name.trim().toLowerCase().includes(activityName))
        : undefined;
      const resolvedCategory = activityById?.category || categoryById || matchingActivity?.category || matchingCategory;
      const resolvedActivity = activityById?.activity || matchingActivity?.activity;
      const hasResolvedActivity = Boolean(resolvedCategory && resolvedActivity);
      const fallbackDate = isValidBackfillDate(rawArgs.date) ? rawArgs.date!.trim() : defaultDateKey;
      const now = new Date();
      const fallbackEnd = fallbackDate === formatDateKey(now)
        ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        : '18:00';
      const fallbackStartDate = new Date(now.getTime() - 60 * 60 * 1000);
      const fallbackStart = fallbackDate === formatDateKey(now)
        ? `${String(fallbackStartDate.getHours()).padStart(2, '0')}:${String(fallbackStartDate.getMinutes()).padStart(2, '0')}`
        : '17:00';
      const startTime = isValidBackfillTime(rawArgs.startTime) ? rawArgs.startTime.trim() : fallbackStart;
      const endTime = isValidBackfillTime(rawArgs.endTime) ? rawArgs.endTime.trim() : fallbackEnd;
  
      return {
        toolName: 'create_log',
        args: {
          date: fallbackDate,
          startTime,
          endTime,
          description: rawArgs.description.trim(),
          categoryId: hasResolvedActivity ? resolvedCategory!.id : 'uncategorized',
          activityId: hasResolvedActivity ? resolvedActivity!.id : 'quick_punch',
          ...(rawArgs.scopeIds?.length ? { scopeIds: rawArgs.scopeIds } : {})
        }
      };
    };
  
    const handleQuickAddTodo = async (
      description: string,
      commandText: string,
      options?: ForegroundSendOptions
    ) => {
      if (!activeSession) {
        return;
      }
  
      const {
        pendingMessageId,
        sessionId,
        userMessageId
      } = prepareForegroundTurn({
        activeSession,
        buildRetryConversationHistory,
        conversationHistoryCache,
        createSessionTitleFromUserMessage,
        isMonthlyReviewTemplateSession: false,
        isWeeklyReviewTemplateSession: false,
        mutateSession,
        notifyUserTurn: async () => undefined,
        onNotifyUserTurnError: () => undefined,
        ...(options?.replaceMessageId ? { replaceMessageId: options.replaceMessageId } : {}),
        ...(options?.retrySourceUserMessageId ? { retrySourceUserMessageId: options.retrySourceUserMessageId } : {}),
        setInputText,
        trimmedText: commandText
      });
  
      setIsLoading(true);
      setIsHistoryPanelOpen(false);
      setIsPersonaPanelOpen(false);
  
      const controller = new AbortController();
      activeRequestRef.current = {
        controller,
        sessionId,
        pendingMessageId
      };
      setActiveRequestId(pendingMessageId);
  
      try {
        const result = await quickAddService.requestQuickAddTodoWithDebug(
          description,
          { signal: controller.signal },
          buildAssistantDictionaryContext()
        );
        if (controller.signal.aborted || activeRequestRef.current?.pendingMessageId !== pendingMessageId) {
          return;
        }
  
        const appliedActions = result.toolCall
          ? applyTodoAndPlannedTimelineLogToolCalls([result.toolCall], description)
          : [];
        const successfulActions = appliedActions.filter((action) => action.status === 'applied');
        if (successfulActions.length === 0) {
          throw new Error('AI 未返回有效的待办工具调用。');
        }
  
        replacePendingWithResult(sessionId, pendingMessageId, '已添加待办', {
          ...(debugMode ? { debugSections: [{ label: '快速添加待办', exchange: result.debug }] } : {}),
          appliedActions,
          retryInput: commandText,
          retrySourceUserMessageId: userMessageId
        });
        notifyAssistantTaskStateChanged();
      } catch (error) {
        const isCurrentPendingRequest = activeRequestRef.current?.pendingMessageId === pendingMessageId;
        if (isAbortError(error)) {
          if (isCurrentPendingRequest) {
            replacePendingWithResult(sessionId, pendingMessageId, '已停止这次请求。', { tone: 'system' });
          }
          return;
        }
  
        if (!isCurrentPendingRequest || controller.signal.aborted) {
          return;
        }
  
        replacePendingWithResult(sessionId, pendingMessageId, getRetryableAIErrorMessage(error), {
          tone: 'error',
          retryInput: commandText,
          retrySourceUserMessageId: userMessageId,
          debugSections: getErrorDebugSections(error, '快速添加待办', debugMode)
        });
      } finally {
        if (activeRequestRef.current?.pendingMessageId === pendingMessageId) {
          activeRequestRef.current = null;
        }
        setActiveRequestId((currentRequestId) => (
          currentRequestId === pendingMessageId ? null : currentRequestId
        ));
        setIsLoading(false);
      }
    };
  
    const handleQuickAddNote = async (
      description: string,
      commandText: string,
      options?: ForegroundSendOptions
    ) => {
      if (!activeSession) {
        return;
      }
  
      const { pendingMessageId, sessionId, userMessageId } = prepareForegroundTurn({
        activeSession,
        buildRetryConversationHistory,
        conversationHistoryCache,
        createSessionTitleFromUserMessage,
        isMonthlyReviewTemplateSession: false,
        isWeeklyReviewTemplateSession: false,
        mutateSession,
        notifyUserTurn: async () => undefined,
        onNotifyUserTurnError: () => undefined,
        ...(options?.replaceMessageId ? { replaceMessageId: options.replaceMessageId } : {}),
        ...(options?.retrySourceUserMessageId ? { retrySourceUserMessageId: options.retrySourceUserMessageId } : {}),
        setInputText,
        trimmedText: commandText
      });
  
      setIsLoading(true);
      setIsHistoryPanelOpen(false);
      setIsPersonaPanelOpen(false);
  
      const controller = new AbortController();
      activeRequestRef.current = { controller, sessionId, pendingMessageId };
      setActiveRequestId(pendingMessageId);
  
      try {
        const result = await quickAddService.requestQuickAddNoteWithDebug(
          description,
          { signal: controller.signal },
          buildQuickAddNoteDictionaryContext(),
          { currentDateTime: formatAssistantLocalDateTime(new Date()) }
        );
        if (controller.signal.aborted || activeRequestRef.current?.pendingMessageId !== pendingMessageId) {
          return;
        }
  
        const appliedActions = result.toolCall
          ? applyQuickAddNoteToolCalls([result.toolCall], description)
          : [];
        const successfulActions = appliedActions.filter((action) => action.status === 'applied');
        if (successfulActions.length === 0) {
          throw new Error('AI 没有找到可追加备注的已有活动记录。');
        }
  
        replacePendingWithResult(sessionId, pendingMessageId, '已添加备注', {
          ...(debugMode ? { debugSections: [{ label: '快速添加备注', exchange: result.debug }] } : {}),
          appliedActions,
          retryInput: commandText,
          retrySourceUserMessageId: userMessageId
        });
        notifyAssistantTaskStateChanged();
      } catch (error) {
        const isCurrentPendingRequest = activeRequestRef.current?.pendingMessageId === pendingMessageId;
        if (isAbortError(error)) {
          if (isCurrentPendingRequest) {
            replacePendingWithResult(sessionId, pendingMessageId, '已停止这次请求。', { tone: 'system' });
          }
          return;
        }
  
        if (!isCurrentPendingRequest || controller.signal.aborted) {
          return;
        }
  
        replacePendingWithResult(sessionId, pendingMessageId, getRetryableAIErrorMessage(error), {
          tone: 'error',
          retryInput: commandText,
          retrySourceUserMessageId: userMessageId,
          debugSections: getErrorDebugSections(error, '快速添加备注', debugMode)
        });
      } finally {
        if (activeRequestRef.current?.pendingMessageId === pendingMessageId) {
          activeRequestRef.current = null;
        }
        setActiveRequestId((currentRequestId) => (
          currentRequestId === pendingMessageId ? null : currentRequestId
        ));
        setIsLoading(false);
      }
    };
  
    const handleQuickAddBackfill = async (
      description: string,
      commandText: string,
      options?: ForegroundSendOptions
    ) => {
      if (!activeSession) {
        return;
      }
  
      const { pendingMessageId, sessionId, userMessageId } = prepareForegroundTurn({
        activeSession,
        buildRetryConversationHistory,
        conversationHistoryCache,
        createSessionTitleFromUserMessage,
        isMonthlyReviewTemplateSession: false,
        isWeeklyReviewTemplateSession: false,
        mutateSession,
        notifyUserTurn: async () => undefined,
        onNotifyUserTurnError: () => undefined,
        ...(options?.replaceMessageId ? { replaceMessageId: options.replaceMessageId } : {}),
        ...(options?.retrySourceUserMessageId ? { retrySourceUserMessageId: options.retrySourceUserMessageId } : {}),
        setInputText,
        trimmedText: commandText
      });
  
      setIsLoading(true);
      setIsHistoryPanelOpen(false);
      setIsPersonaPanelOpen(false);
  
      const controller = new AbortController();
      activeRequestRef.current = { controller, sessionId, pendingMessageId };
      setActiveRequestId(pendingMessageId);
      const quickAddTimeContext = buildAssistantStateContext(new Date());
  
      try {
        const result = await quickAddService.requestQuickAddBackfillWithDebug(
          description,
          { signal: controller.signal },
          buildAssistantDictionaryContext(),
          {
            currentDateTime: quickAddTimeContext.currentDateTime,
            todayTimelineSummary: quickAddTimeContext.timelineSummaryForDate || ''
          }
        );
        if (controller.signal.aborted || activeRequestRef.current?.pendingMessageId !== pendingMessageId) {
          return;
        }
  
        const toolCall = result.toolCall ? resolveQuickAddBackfillToolCall(result.toolCall) : undefined;
        const appliedActions = toolCall ? applyPlannedLogToolCalls([toolCall]) : [];
        const successfulActions = appliedActions.filter((action) => action.status === 'applied');
        if (successfulActions.length === 0) {
          throw new Error('AI 未返回有效的补记工具调用。');
        }
  
        replacePendingWithResult(sessionId, pendingMessageId, '已添加补记', {
          ...(debugMode ? { debugSections: [{ label: '快速添加补记', exchange: result.debug }] } : {}),
          appliedActions,
          retryInput: commandText,
          retrySourceUserMessageId: userMessageId
        });
        notifyAssistantTaskStateChanged();
      } catch (error) {
        const isCurrentPendingRequest = activeRequestRef.current?.pendingMessageId === pendingMessageId;
        if (isAbortError(error)) {
          if (isCurrentPendingRequest) {
            replacePendingWithResult(sessionId, pendingMessageId, '已停止这次请求。', { tone: 'system' });
          }
          return;
        }
  
        if (!isCurrentPendingRequest || controller.signal.aborted) {
          return;
        }
  
        replacePendingWithResult(sessionId, pendingMessageId, getRetryableAIErrorMessage(error), {
          tone: 'error',
          retryInput: commandText,
          retrySourceUserMessageId: userMessageId,
          debugSections: getErrorDebugSections(error, '快速添加补记', debugMode)
        });
      } finally {
        if (activeRequestRef.current?.pendingMessageId === pendingMessageId) {
          activeRequestRef.current = null;
        }
        setActiveRequestId((currentRequestId) => (
          currentRequestId === pendingMessageId ? null : currentRequestId
        ));
        setIsLoading(false);
      }
    };
  return {
    handleQuickAddBackfill,
    handleQuickAddNote,
    handleQuickAddTodo
  };
};
