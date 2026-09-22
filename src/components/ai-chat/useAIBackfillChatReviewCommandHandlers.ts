/**
 * @file useAIBackfillChatReviewCommandHandlers.ts
 * @input Review datasets, writeback callbacks, confirmation state, and chat message adapters
 * @output Stable command handlers for daily/weekly/monthly review and newspaper commands
 * @pos Component Support (AI Integration)
 * @description Keeps review-command parameter assembly and guarded error handling out of the main chat modal.
 * @updated 2026-09-22: Extracted review command adapters from AIBackfillChatModal.
 */
import type { Category, DailyReview, Log, MonthlyReview, Scope, TodoCategory, TodoItem, WeeklyReview } from '../../types';
import {
  runDailyNewspaperCommand,
  runDailyNewspaperOverwriteConfirmation,
  runDailyReviewNarrativeCommand,
  runDailyReviewNarrativeOverwriteConfirmation,
  runMonthlyNewspaperCommand,
  runMonthlyNewspaperOverwriteConfirmation,
  runMonthlyReviewNarrativeWritebackCommand,
  runWeeklyNewspaperCommand,
  runWeeklyNewspaperOverwriteConfirmation,
  runWeeklyReviewNarrativeWritebackCommand
} from './AIBackfillChatReviewCommands';
import type {
  AIChatSession,
  DailyNewspaperWritebackConfirmationState,
  DailyReviewWritebackConfirmationState,
  MonthlyNewspaperWritebackConfirmationState,
  WeeklyNewspaperWritebackConfirmationState
} from './AIBackfillChatShared';

type AddToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;

type DailyReviewWriteback = (
  session: AIChatSession,
  params: {
    createdReview: boolean;
    dailyReview: DailyReview;
    dayDataText: string;
    mergeMode: 'create' | 'overwrite';
  }
) => Promise<void>;

type WeeklyReviewWriteback = (
  session: AIChatSession,
  params: {
    createdReview: boolean;
    mergeMode: 'create' | 'overwrite';
    weekDataText: string;
    weeklyReview: WeeklyReview;
  }
) => Promise<void>;

type MonthlyReviewWriteback = (
  session: AIChatSession,
  params: {
    createdReview: boolean;
    mergeMode: 'create' | 'overwrite';
    monthDataText: string;
    monthlyReview: MonthlyReview;
  }
) => Promise<void>;

export interface AIBackfillChatReviewCommandHandlerOptions {
  addToast: AddToast;
  appendSystemMessage: (sessionId: string, content: string) => void;
  appendUserMessage: (sessionId: string, content: string) => void;
  buildMonthDataText: (session: AIChatSession) => string | null;
  buildWeekDataText: (session: AIChatSession) => string | null;
  categories: Category[];
  checkTemplates: any[];
  dailyNewspaperWriteback: DailyReviewWriteback;
  dailyReviewWriteback: DailyReviewWriteback;
  dailyReviews: DailyReview[];
  dailyNewspaperWritebackConfirmation: DailyNewspaperWritebackConfirmationState | null;
  dailyReviewWritebackConfirmation: DailyReviewWritebackConfirmationState | null;
  fallbackDate?: string;
  getLocalDateStr: (date: Date) => string;
  getRetryableAIErrorMessage: (error: unknown) => string;
  logs: Log[];
  monthlyNewspaperWriteback: MonthlyReviewWriteback;
  monthlyNewspaperWritebackConfirmation: MonthlyNewspaperWritebackConfirmationState | null;
  monthlyReviewWriteback: MonthlyReviewWriteback;
  monthlyReviews: MonthlyReview[];
  resolveMonthlyReviewTemplateSessionMeta: (session: AIChatSession) => any;
  resolveWeeklyReviewTemplateSessionMeta: (session: AIChatSession) => any;
  prepareForInteraction: () => void;
  reviewTemplates: any[];
  scopes: Scope[];
  setDailyNewspaperWritebackConfirmation: (value: DailyNewspaperWritebackConfirmationState | null) => void;
  setDailyReviewWritebackConfirmation: (value: DailyReviewWritebackConfirmationState | null) => void;
  setMonthlyNewspaperWritebackConfirmation: (value: MonthlyNewspaperWritebackConfirmationState | null) => void;
  setWeeklyNewspaperWritebackConfirmation: (value: WeeklyNewspaperWritebackConfirmationState | null) => void;
  todoCategories: TodoCategory[];
  todos: TodoItem[];
  weeklyReviewWriteback: WeeklyReviewWriteback;
  weeklyNewspaperWriteback: WeeklyReviewWriteback;
  weeklyNewspaperWritebackConfirmation: WeeklyNewspaperWritebackConfirmationState | null;
  weeklyReviews: WeeklyReview[];
}

export const useAIBackfillChatReviewCommandHandlers = ({
  addToast,
  appendSystemMessage,
  appendUserMessage,
  buildMonthDataText,
  buildWeekDataText,
  categories,
  checkTemplates,
  dailyNewspaperWriteback,
  dailyReviewWriteback,
  dailyReviews,
  dailyNewspaperWritebackConfirmation,
  dailyReviewWritebackConfirmation,
  fallbackDate,
  getLocalDateStr,
  getRetryableAIErrorMessage,
  logs,
  monthlyNewspaperWriteback,
  monthlyNewspaperWritebackConfirmation,
  monthlyReviewWriteback,
  monthlyReviews,
  resolveMonthlyReviewTemplateSessionMeta,
  resolveWeeklyReviewTemplateSessionMeta,
  prepareForInteraction,
  reviewTemplates,
  scopes,
  setDailyNewspaperWritebackConfirmation,
  setDailyReviewWritebackConfirmation,
  setMonthlyNewspaperWritebackConfirmation,
  setWeeklyNewspaperWritebackConfirmation,
  todoCategories,
  todos,
  weeklyReviewWriteback,
  weeklyNewspaperWriteback,
  weeklyNewspaperWritebackConfirmation,
  weeklyReviews
}: AIBackfillChatReviewCommandHandlerOptions) => {
  const handleWeeklyReviewNarrativeWritebackCommand = async (session: AIChatSession) => (
    runWeeklyReviewNarrativeWritebackCommand({
      addToast,
      buildWeekDataText,
      resolveTemplateMeta: resolveWeeklyReviewTemplateSessionMeta,
      reviewTemplates,
      runWriteback: weeklyReviewWriteback,
      session,
      weeklyReviews
    })
  );

  const handleDailyReviewNarrativeCommand = async (session: AIChatSession) => (
    runDailyReviewNarrativeCommand({
      appendSystemMessage,
      categories,
      checkTemplates,
      dailyReviews,
      getLocalDateStr,
      logs,
      prepareForInteraction,
      reviewTemplates,
      runWriteback: dailyReviewWriteback,
      scopes,
      session,
      setConfirmation: setDailyReviewWritebackConfirmation,
      todoCategories,
      todos
    })
  );

  const handleDailyNewspaperCommand = async (session: AIChatSession, commandText: string) => (
    runDailyNewspaperCommand({
      appendSystemMessage,
      categories,
      checkTemplates,
      commandText,
      dailyReviews,
      fallbackDate,
      getLocalDateStr,
      logs,
      prepareForInteraction,
      reviewTemplates,
      runWriteback: dailyNewspaperWriteback,
      scopes,
      session,
      setConfirmation: setDailyNewspaperWritebackConfirmation,
      todoCategories,
      todos
    })
  );

  const handleWeeklyNewspaperCommand = async (session: AIChatSession, commandText: string) => (
    runWeeklyNewspaperCommand({
      appendSystemMessage,
      categories,
      commandText,
      dailyReviews,
      fallbackDate,
      getLocalDateStr,
      logs,
      monthlyReviews,
      prepareForInteraction,
      reviewTemplates,
      runWriteback: weeklyNewspaperWriteback,
      scopes,
      session,
      setConfirmation: setWeeklyNewspaperWritebackConfirmation,
      todoCategories,
      todos,
      weeklyReviews
    })
  );

  const handleDailyReviewNarrativeOverwriteConfirmation = async (
    session: AIChatSession,
    userInput: string
  ): Promise<boolean> => (
    runDailyReviewNarrativeOverwriteConfirmation({
      appendSystemMessage,
      appendUserMessage,
      categories,
      checkTemplates,
      confirmation: dailyReviewWritebackConfirmation,
      dailyReviews,
      getLocalDateStr,
      logs,
      prepareForInteraction,
      reviewTemplates,
      runWriteback: dailyReviewWriteback,
      scopes,
      session,
      setConfirmation: setDailyReviewWritebackConfirmation,
      todoCategories,
      todos,
      userInput
    })
  );

  const handleDailyNewspaperOverwriteConfirmation = async (
    session: AIChatSession,
    userInput: string
  ): Promise<boolean> => (
    runDailyNewspaperOverwriteConfirmation({
      appendSystemMessage,
      appendUserMessage,
      categories,
      checkTemplates,
      confirmation: dailyNewspaperWritebackConfirmation,
      dailyReviews,
      getLocalDateStr,
      logs,
      prepareForInteraction,
      reviewTemplates,
      runWriteback: dailyNewspaperWriteback,
      scopes,
      session,
      setConfirmation: setDailyNewspaperWritebackConfirmation,
      todoCategories,
      todos,
      userInput
    })
  );

  const handleWeeklyNewspaperOverwriteConfirmation = async (
    session: AIChatSession,
    userInput: string
  ): Promise<boolean> => (
    runWeeklyNewspaperOverwriteConfirmation({
      appendSystemMessage,
      appendUserMessage,
      categories,
      confirmation: weeklyNewspaperWritebackConfirmation,
      dailyReviews,
      getLocalDateStr,
      logs,
      monthlyReviews,
      prepareForInteraction,
      reviewTemplates,
      runWriteback: weeklyNewspaperWriteback,
      scopes,
      session,
      setConfirmation: setWeeklyNewspaperWritebackConfirmation,
      todoCategories,
      todos,
      userInput,
      weeklyReviews
    })
  );

  const handleMonthlyReviewNarrativeWritebackCommand = async (session: AIChatSession) => (
    runMonthlyReviewNarrativeWritebackCommand({
      addToast,
      buildMonthDataText,
      monthlyReviews,
      resolveTemplateMeta: resolveMonthlyReviewTemplateSessionMeta,
      reviewTemplates,
      runWriteback: monthlyReviewWriteback,
      session
    })
  );

  const handleMonthlyNewspaperCommand = async (session: AIChatSession, commandText: string) => (
    runMonthlyNewspaperCommand({
      appendSystemMessage,
      categories,
      commandText,
      dailyReviews,
      fallbackDate,
      getLocalDateStr,
      logs,
      monthlyReviews,
      prepareForInteraction,
      reviewTemplates,
      runWriteback: monthlyNewspaperWriteback,
      scopes,
      session,
      setConfirmation: setMonthlyNewspaperWritebackConfirmation,
      todoCategories,
      todos,
      weeklyReviews
    })
  );

  const handleMonthlyNewspaperOverwriteConfirmation = async (
    session: AIChatSession,
    userInput: string
  ): Promise<boolean> => (
    runMonthlyNewspaperOverwriteConfirmation({
      appendUserMessage,
      appendSystemMessage,
      categories,
      confirmation: monthlyNewspaperWritebackConfirmation,
      dailyReviews,
      getLocalDateStr,
      logs,
      monthlyReviews,
      prepareForInteraction,
      reviewTemplates,
      runWriteback: monthlyNewspaperWriteback,
      scopes,
      session,
      setConfirmation: setMonthlyNewspaperWritebackConfirmation,
      todoCategories,
      todos,
      userInput,
      weeklyReviews
    })
  );

  const runReviewCommandSafely = async <T,>(
    sessionId: string,
    label: string,
    command: () => Promise<T>,
    fallbackValue: T
  ): Promise<T> => {
    try {
      return await command();
    } catch (error) {
      console.error(`[AIBackfillChatModal] Failed to run ${label}`, error);
      appendSystemMessage(sessionId, getRetryableAIErrorMessage(error));
      return fallbackValue;
    }
  };

  return {
    handleDailyNewspaperCommand,
    handleDailyNewspaperOverwriteConfirmation,
    handleDailyReviewNarrativeCommand,
    handleDailyReviewNarrativeOverwriteConfirmation,
    handleMonthlyNewspaperCommand,
    handleMonthlyNewspaperOverwriteConfirmation,
    handleMonthlyReviewNarrativeWritebackCommand,
    handleWeeklyNewspaperCommand,
    handleWeeklyNewspaperOverwriteConfirmation,
    handleWeeklyReviewNarrativeWritebackCommand,
    runReviewCommandSafely
  };
};
