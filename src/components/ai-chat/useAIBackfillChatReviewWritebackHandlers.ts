/**
 * @file useAIBackfillChatReviewWritebackHandlers.ts
 * @input Review writeback dependencies, session state, and persistence callbacks
 * @output Daily, weekly, and monthly review/newspaper writeback runners
 * @pos Component Support (AI Integration)
 * @description Keeps review writeback dependency assembly out of the main chat modal.
 * @updated 2026-09-22: Extracted review writeback runner adapters from AIBackfillChatModal.
 */
import type { AIConversationTurn } from '../../services/aiService';
import type { AppliedChatAction } from '../../services/assistantActionExecutor';
import { assistantContextBuilder } from '../../services/assistantContextBuilder';
import type { DailyReview, MonthlyReview, WeeklyReview } from '../../types';
import type {
  AssistantMemory,
  AssistantToolCall,
  AssistantTurnStateContext
} from '../../types/assistant';
import type { MonthlyReviewTemplateSessionMeta } from '../../services/monthlyReviewTemplateService';
import type { WeeklyReviewTemplateSessionMeta } from '../../services/weeklyReviewTemplateService';
import {
  runDailyNewspaperWriteback as runDailyNewspaperWritebackFlow,
  runDailyReviewNarrativeWriteback as runDailyReviewNarrativeWritebackFlow,
  runMonthlyNewspaperWriteback as runMonthlyNewspaperWritebackFlow,
  runMonthlyReviewNarrativeWriteback as runMonthlyReviewNarrativeWritebackFlow,
  runWeeklyNewspaperWriteback as runWeeklyNewspaperWritebackFlow,
  runWeeklyReviewNarrativeWriteback as runWeeklyReviewNarrativeWritebackFlow
} from './AIBackfillChatReviewWriteback';
import type { AIChatPersona, AIChatSession } from './AIBackfillChatShared';

type ActiveRequestState = {
  controller: AbortController;
  pendingMessageId: string;
  sessionId: string;
};

export interface AIBackfillChatReviewWritebackHandlerOptions {
  activeRequestRef: { current: ActiveRequestState | null };
  addToast: (type: 'success' | 'error' | 'info', message: string) => void;
  applyUnifiedToolCalls: (toolCalls: AssistantToolCall[], sourceText: string) => AppliedChatAction[];
  assistantMemoryEnabled: boolean;
  buildAssistantStateContext: (date: Date, reminderSummary?: string) => AssistantTurnStateContext;
  buildConversationHistory: (session: AIChatSession) => AIConversationTurn[];
  buildDreamContext: (query?: string) => string | undefined;
  buildForegroundAssistantMemory: () => AssistantMemory;
  buildForegroundAssistantReminderSummary: () => string | undefined;
  buildSharedPersonaPrompt: (persona: AIChatPersona) => string;
  conversationHistoryCache: Map<string, AIConversationTurn[]>;
  debugMode: boolean;
  getRetryableAIErrorMessage: (error: unknown) => string;
  isAbortError: (error: unknown) => boolean;
  mutateSession: (sessionId: string, updater: (session: AIChatSession) => AIChatSession) => void;
  replacePendingWithResult: (...args: any[]) => void;
  resolveSessionPersona: (session: AIChatSession) => AIChatPersona;
  resolveMonthlyReviewTemplateSessionMeta: (session: AIChatSession) => MonthlyReviewTemplateSessionMeta | null;
  resolveWeeklyReviewTemplateSessionMeta: (session: AIChatSession) => WeeklyReviewTemplateSessionMeta | null;
  setDailyNewspaperWritebackConfirmation: () => void;
  setDailyReviews: (updater: (reviews: DailyReview[]) => DailyReview[]) => void;
  setDailyReviewWritebackConfirmation: (value: null) => void;
  setInputText: (value: string) => void;
  setIsHistoryPanelOpen: (value: boolean) => void;
  setIsLoading: (value: boolean) => void;
  setIsPersonaPanelOpen: (value: boolean) => void;
  setMonthlyNewspaperWritebackConfirmation: () => void;
  setMonthlyReviews: (updater: (reviews: MonthlyReview[]) => MonthlyReview[]) => void;
  setWeeklyNewspaperWritebackConfirmation: () => void;
  setWeeklyReviews: (updater: (reviews: WeeklyReview[]) => WeeklyReview[]) => void;
  updateWeeklyReviewTemplateStage: (...args: any[]) => void;
}

export const useAIBackfillChatReviewWritebackHandlers = ({
  activeRequestRef,
  addToast,
  applyUnifiedToolCalls,
  assistantMemoryEnabled,
  buildAssistantStateContext,
  buildConversationHistory,
  buildDreamContext,
  buildForegroundAssistantMemory,
  buildForegroundAssistantReminderSummary,
  buildSharedPersonaPrompt,
  conversationHistoryCache,
  debugMode,
  getRetryableAIErrorMessage,
  isAbortError,
  mutateSession,
  replacePendingWithResult,
  resolveSessionPersona,
  resolveMonthlyReviewTemplateSessionMeta,
  resolveWeeklyReviewTemplateSessionMeta,
  setDailyNewspaperWritebackConfirmation,
  setDailyReviews,
  setDailyReviewWritebackConfirmation,
  setInputText,
  setIsHistoryPanelOpen,
  setIsLoading,
  setIsPersonaPanelOpen,
  setMonthlyNewspaperWritebackConfirmation,
  setMonthlyReviews,
  setWeeklyNewspaperWritebackConfirmation,
  setWeeklyReviews,
  updateWeeklyReviewTemplateStage
}: AIBackfillChatReviewWritebackHandlerOptions) => {
    const runWeeklyReviewNarrativeWriteback = async (
      session: AIChatSession,
      params: {
        weeklyReview: WeeklyReview;
        weekDataText: string;
        mergeMode: 'create' | 'overwrite';
        createdReview: boolean;
      }
    ) => runWeeklyReviewNarrativeWritebackFlow({
      activeRequestRef,
      addToast,
      buildConversationHistory,
      buildPersonaPrompt: buildSharedPersonaPrompt,
      getConversationSummary: (sessionId) => assistantContextBuilder.summarizeConversationTurns(
        conversationHistoryCache.get(sessionId) || [],
        24
      ),
      getRetryableAIErrorMessage,
      isAbortError,
      mutateSession,
      params,
      replacePendingWithResult,
      resolveSessionPersona,
      resolveTemplateMeta: resolveWeeklyReviewTemplateSessionMeta,
      session,
      setInputText,
      setIsHistoryPanelOpen,
      setIsLoading,
      setIsPersonaPanelOpen,
      setWeeklyReviews,
      updateWeeklyReviewTemplateStage
    });
  
    const runDailyReviewNarrativeWriteback = async (
      session: AIChatSession,
      params: {
        dailyReview: DailyReview;
        dayDataText: string;
        mergeMode: 'create' | 'overwrite';
        createdReview: boolean;
      }
    ) => runDailyReviewNarrativeWritebackFlow({
      activeRequestRef,
      addToast,
      buildConversationHistory,
      buildPersonaPrompt: buildSharedPersonaPrompt,
      debugMode,
      getConversationSummary: (sessionId) => assistantContextBuilder.summarizeConversationTurns(
        conversationHistoryCache.get(sessionId) || [],
        24
      ),
      getRetryableAIErrorMessage,
      isAbortError,
      mutateSession,
      params,
      replacePendingWithResult,
      resolveSessionPersona,
      session,
      setDailyReviewWritebackConfirmation,
      setDailyReviews,
      setInputText,
      setIsHistoryPanelOpen,
      setIsLoading,
      setIsPersonaPanelOpen
    });
  
    const runDailyNewspaperWriteback = async (
      session: AIChatSession,
      params: {
        dailyReview: DailyReview;
        dayDataText: string;
        mergeMode: 'create' | 'overwrite';
        createdReview: boolean;
      }
    ) => runDailyNewspaperWritebackFlow({
      activeRequestRef,
      assistantMemoryEnabled,
      addToast,
      applyUnifiedToolCalls,
      buildConversationHistory,
      buildDreamContext,
      buildForegroundAssistantMemory,
      buildForegroundAssistantReminderSummary,
      buildPersonaPrompt: buildSharedPersonaPrompt,
      buildStateContext: buildAssistantStateContext,
      debugMode,
      getConversationSummary: (sessionId) => assistantContextBuilder.summarizeConversationTurns(
        conversationHistoryCache.get(sessionId) || [],
        24
      ),
      getRetryableAIErrorMessage,
      isAbortError,
      mutateSession,
      params,
      replacePendingWithResult,
      resolveSessionPersona,
      session,
      setDailyNewspaperWritebackConfirmation,
      setDailyReviews,
      setInputText,
      setIsHistoryPanelOpen,
      setIsLoading,
      setIsPersonaPanelOpen
    });
  
    const runWeeklyNewspaperWriteback = async (
      session: AIChatSession,
      params: {
        weeklyReview: WeeklyReview;
        weekDataText: string;
        mergeMode: 'create' | 'overwrite';
        createdReview: boolean;
      }
    ) => runWeeklyNewspaperWritebackFlow({
      activeRequestRef,
      addToast,
      buildConversationHistory,
      buildPersonaPrompt: buildSharedPersonaPrompt,
      debugMode,
      getConversationSummary: (sessionId) => assistantContextBuilder.summarizeConversationTurns(
        conversationHistoryCache.get(sessionId) || [],
        24
      ),
      getRetryableAIErrorMessage,
      isAbortError,
      mutateSession,
      params,
      replacePendingWithResult,
      resolveSessionPersona,
      session,
      setInputText,
      setIsHistoryPanelOpen,
      setIsLoading,
      setIsPersonaPanelOpen,
      setWeeklyNewspaperWritebackConfirmation,
      setWeeklyReviews
    });
  
    const runMonthlyReviewNarrativeWriteback = async (
      session: AIChatSession,
      params: {
        monthlyReview: MonthlyReview;
        monthDataText: string;
        mergeMode: 'create' | 'overwrite';
        createdReview: boolean;
      }
    ) => runMonthlyReviewNarrativeWritebackFlow({
      activeRequestRef,
      addToast,
      buildConversationHistory,
      buildPersonaPrompt: buildSharedPersonaPrompt,
      getConversationSummary: (sessionId) => assistantContextBuilder.summarizeConversationTurns(
        conversationHistoryCache.get(sessionId) || [],
        24
      ),
      getRetryableAIErrorMessage,
      isAbortError,
      mutateSession,
      params,
      replacePendingWithResult,
      resolveSessionPersona,
      resolveTemplateMeta: resolveMonthlyReviewTemplateSessionMeta,
      session,
      setInputText,
      setIsHistoryPanelOpen,
      setIsLoading,
      setIsPersonaPanelOpen,
      setMonthlyReviews,
      updateWeeklyReviewTemplateStage
    });
  
    const runMonthlyNewspaperWriteback = async (
      session: AIChatSession,
      params: {
        monthlyReview: MonthlyReview;
        monthDataText: string;
        mergeMode: 'create' | 'overwrite';
        createdReview: boolean;
      }
    ) => runMonthlyNewspaperWritebackFlow({
      activeRequestRef,
      addToast,
      buildConversationHistory,
      buildPersonaPrompt: buildSharedPersonaPrompt,
      debugMode,
      getConversationSummary: (sessionId) => assistantContextBuilder.summarizeConversationTurns(
        conversationHistoryCache.get(sessionId) || [],
        24
      ),
      getRetryableAIErrorMessage,
      isAbortError,
      mutateSession,
      params,
      replacePendingWithResult,
      resolveSessionPersona,
      session,
      setInputText,
      setIsHistoryPanelOpen,
      setIsLoading,
      setIsPersonaPanelOpen,
      setMonthlyNewspaperWritebackConfirmation,
      setMonthlyReviews
    });
  return {
    runDailyNewspaperWriteback,
    runDailyReviewNarrativeWriteback,
    runMonthlyNewspaperWriteback,
    runMonthlyReviewNarrativeWriteback,
    runWeeklyNewspaperWriteback,
    runWeeklyReviewNarrativeWriteback
  };
};
