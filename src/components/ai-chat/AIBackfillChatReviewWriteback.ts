/**
 * @file AIBackfillChatReviewWriteback.ts
 * @input Review writeback sessions, prepared day/week/month data, and modal orchestration callbacks
 * @output Shared async runners for daily, weekly, and monthly AI narrative writeback flows
 * @pos Component Support (AI Integration)
 * @description Moves the long review-writeback async flows out of AIBackfillChatModal while preserving the same pending-message, review-persistence, and retry/error behavior.
 * @updated 2026-05-17: Daily review and newspaper writeback flows now preserve provider reasoning summaries so the generated result message can render the same collapsible thinking block as ordinary chat.
 * @updated 2026-05-15: Extracted daily, weekly, and monthly narrative writeback runners from AIBackfillChatModal.
 */
import { aiService, type AIConversationTurn } from '../../services/aiService';
import { dailyNewspaperService } from '../../services/dailyNewspaperService';
import { dailyReviewTemplateService } from '../../services/dailyReviewTemplateService';
import { monthlyReviewTemplateService } from '../../services/monthlyReviewTemplateService';
import { weeklyReviewTemplateService } from '../../services/weeklyReviewTemplateService';
import { parseNarrative } from '../../utils/narrativeUtils';
import type { DailyReview, MonthlyReview, WeeklyReview } from '../../types';
import type { AssistantMemory, AssistantReasoningSummary, AssistantTurnStateContext } from '../../types/assistant';
import type {
  AIChatDailyNewspaperWritebackResult,
  AIChatDailyReviewWritebackResult,
  AIChatDebugSection,
  AIChatDreamUpdateCard,
  AIChatMemoryUpdateSection,
  AIChatMonthlyReviewWritebackResult,
  AIChatPersona,
  AIChatSession,
  AIChatWeeklyReviewWritebackResult,
  ChatTone
} from './AIBackfillChatShared';
import type { AppliedChatAction } from '../../services/assistantActionExecutor';
import type { WeeklyReviewTemplateSessionMeta } from '../../services/weeklyReviewTemplateService';
import type { MonthlyReviewTemplateSessionMeta } from '../../services/monthlyReviewTemplateService';

type AddToast = (type: 'success' | 'error' | 'info', message: string) => void;

interface ActiveRequestState {
  controller: AbortController;
  pendingMessageId: string;
  sessionId: string;
}

interface ReplacePendingResultOptions {
  appliedActions?: AppliedChatAction[];
  dailyNewspaperWriteback?: AIChatDailyNewspaperWritebackResult;
  dailyReviewWriteback?: AIChatDailyReviewWritebackResult;
  debugSections?: AIChatDebugSection[];
  displayParts?: string[];
  dreamRetryYearMonth?: string;
  dreamUpdates?: AIChatDreamUpdateCard[];
  memoryUpdates?: AIChatMemoryUpdateSection[];
  monthlyReviewWriteback?: AIChatMonthlyReviewWritebackResult;
  reasoning?: AssistantReasoningSummary;
  reminderUpdates?: string[];
  retryInput?: string;
  retrySourceUserMessageId?: string;
  tone?: ChatTone;
  weeklyReviewWriteback?: AIChatWeeklyReviewWritebackResult;
}

interface ReviewWritebackRunnerBase {
  activeRequestRef: { current: ActiveRequestState | null };
  addToast: AddToast;
  buildConversationHistory: (session: AIChatSession) => AIConversationTurn[];
  buildPersonaPrompt: (persona: AIChatPersona) => string;
  getConversationSummary: (sessionId: string) => string;
  getRetryableAIErrorMessage: (error: unknown) => string;
  isAbortError: (error: unknown) => boolean;
  mutateSession: (sessionId: string, updater: (session: AIChatSession) => AIChatSession) => void;
  replacePendingWithResult: (
    sessionId: string,
    pendingMessageId: string,
    content: string,
    options?: ReplacePendingResultOptions
  ) => void;
  resolveSessionPersona: (session: AIChatSession) => AIChatPersona;
  setInputText: (value: string) => void;
  setIsHistoryPanelOpen: (value: boolean) => void;
  setIsLoading: (value: boolean) => void;
  setIsPersonaPanelOpen: (value: boolean) => void;
}

interface WeeklyWritebackOptions extends ReviewWritebackRunnerBase {
  params: {
    createdReview: boolean;
    mergeMode: 'create' | 'overwrite';
    weekDataText: string;
    weeklyReview: WeeklyReview;
  };
  resolveTemplateMeta: (session: AIChatSession) => WeeklyReviewTemplateSessionMeta | null;
  session: AIChatSession;
  setWeeklyReviews: (updater: (reviews: WeeklyReview[]) => WeeklyReview[]) => void;
  updateWeeklyReviewTemplateStage: (
    sessionId: string,
    stage: WeeklyReviewTemplateSessionMeta['stage'],
    pendingWriteIntent?: boolean
  ) => void;
}

interface DailyWritebackOptions extends ReviewWritebackRunnerBase {
  debugMode: boolean;
  params: {
    createdReview: boolean;
    dailyReview: DailyReview;
    dayDataText: string;
    mergeMode: 'create' | 'overwrite';
  };
  session: AIChatSession;
  setDailyReviewWritebackConfirmation: (value: null) => void;
  setDailyReviews: (updater: (reviews: DailyReview[]) => DailyReview[]) => void;
}

interface DailyNewspaperWritebackOptions extends ReviewWritebackRunnerBase {
  assistantMemoryEnabled: boolean;
  applyUnifiedToolCalls: (toolCalls: any[], sourceText: string) => AppliedChatAction[];
  buildDreamContext: (query?: string) => string | undefined;
  buildForegroundAssistantMemory: () => AssistantMemory;
  buildForegroundAssistantReminderSummary: () => string | undefined;
  buildStateContext: (date: Date, reminderSummary?: string) => AssistantTurnStateContext;
  debugMode: boolean;
  params: {
    createdReview: boolean;
    dailyReview: DailyReview;
    dayDataText: string;
    mergeMode: 'create' | 'overwrite';
  };
  session: AIChatSession;
  setDailyNewspaperWritebackConfirmation: (value: null) => void;
  setDailyReviews: (updater: (reviews: DailyReview[]) => DailyReview[]) => void;
}

interface MonthlyWritebackOptions extends ReviewWritebackRunnerBase {
  params: {
    createdReview: boolean;
    mergeMode: 'create' | 'overwrite';
    monthDataText: string;
    monthlyReview: MonthlyReview;
  };
  resolveTemplateMeta: (session: AIChatSession) => MonthlyReviewTemplateSessionMeta | null;
  session: AIChatSession;
  setMonthlyReviews: (updater: (reviews: MonthlyReview[]) => MonthlyReview[]) => void;
  updateWeeklyReviewTemplateStage: (
    sessionId: string,
    stage: WeeklyReviewTemplateSessionMeta['stage'],
    pendingWriteIntent?: boolean
  ) => void;
}

const appendPendingAssistantMessage = (
  mutateSession: ReviewWritebackRunnerBase['mutateSession'],
  sessionId: string,
  pendingMessageId: string,
  content: string,
  createdAt: number
) => {
  mutateSession(sessionId, (currentSession) => ({
    ...currentSession,
    messages: [
      ...currentSession.messages,
      {
        id: pendingMessageId,
        role: 'assistant',
        content,
        createdAt,
        tone: 'pending'
      }
    ]
  }));
};

export const runWeeklyReviewNarrativeWriteback = async ({
  activeRequestRef,
  addToast,
  buildConversationHistory: _buildConversationHistory,
  buildPersonaPrompt,
  getConversationSummary,
  getRetryableAIErrorMessage,
  isAbortError,
  mutateSession,
  params,
  replacePendingWithResult,
  resolveSessionPersona,
  resolveTemplateMeta,
  session,
  setInputText,
  setIsHistoryPanelOpen,
  setIsLoading,
  setIsPersonaPanelOpen,
  setWeeklyReviews,
  updateWeeklyReviewTemplateStage
}: WeeklyWritebackOptions): Promise<void> => {
  const sessionId = session.id;
  const pendingMessageId = crypto.randomUUID();
  const now = Date.now();
  const sessionPersona = resolveSessionPersona(session);
  const conversationSummary = getConversationSummary(session.id);

  appendPendingAssistantMessage(mutateSession, sessionId, pendingMessageId, '我来整理成这周的 AI 叙事。', now);

  setInputText('');
  setIsLoading(true);
  setIsHistoryPanelOpen(false);
  setIsPersonaPanelOpen(false);

  const controller = new AbortController();
  activeRequestRef.current = { controller, sessionId, pendingMessageId };

  if (params.createdReview) {
    setWeeklyReviews((previousReviews) => {
      if (previousReviews.some((review) => review.id === params.weeklyReview.id)) {
        return previousReviews;
      }

      return [...previousReviews, params.weeklyReview];
    });
  }

  try {
    const templateMeta = resolveTemplateMeta(session);
    if (!templateMeta) {
      throw new Error('周复盘上下文还没有准备好。');
    }

    const { systemPrompt, userPrompt } = await weeklyReviewTemplateService.buildNarrativeWritebackPrompts({
      personaPrompt: buildPersonaPrompt(sessionPersona),
      weekDataText: params.weekDataText,
      conversationSummary,
      mergeMode: params.mergeMode,
      methodId: templateMeta.methodId
    });

    const rawToolCallResponse = await aiService.generateNarrative(userPrompt, systemPrompt);

    if (controller.signal.aborted || activeRequestRef.current?.pendingMessageId !== pendingMessageId) {
      return;
    }

    const toolCall = weeklyReviewTemplateService.parseNarrativeToolCallResponse(
      rawToolCallResponse,
      params.weeklyReview.weekStartDate,
      params.weeklyReview.weekEndDate,
      params.mergeMode
    );
    const narrative = weeklyReviewTemplateService.buildNarrativeFromToolCall(toolCall);

    setWeeklyReviews((previousReviews) => (
      weeklyReviewTemplateService.updateWeeklyReviewNarrative(previousReviews, params.weeklyReview.id, narrative)
    ));

    const parsedNarrative = parseNarrative(narrative, `周复盘 ${params.weeklyReview.weekStartDate}`);
    const writebackResultCard: AIChatWeeklyReviewWritebackResult = {
      weeklyReviewId: params.weeklyReview.id,
      weekStartDate: params.weeklyReview.weekStartDate,
      weekEndDate: params.weeklyReview.weekEndDate,
      title: parsedNarrative.title,
      preview: parsedNarrative.content,
      createdReview: params.createdReview,
      mergeMode: params.mergeMode
    };

    const successMessage = params.createdReview
      ? '已新建本周 Weekly Review，并写入 AI 叙事。'
      : '已覆盖写入这周的 AI 叙事。';

    replacePendingWithResult(sessionId, pendingMessageId, successMessage, {
      tone: 'system',
      weeklyReviewWriteback: writebackResultCard
    });
    updateWeeklyReviewTemplateStage(sessionId, 'ready');
    addToast('success', 'AI 叙事已写入周回顾');
  } catch (error) {
    const isCurrentPendingRequest = activeRequestRef.current?.pendingMessageId === pendingMessageId;

    if (isAbortError(error)) {
      if (isCurrentPendingRequest) {
        replacePendingWithResult(sessionId, pendingMessageId, '已停止这次写入。', { tone: 'system' });
      }
      return;
    }

    if (!isCurrentPendingRequest || controller.signal.aborted) {
      return;
    }

    replacePendingWithResult(sessionId, pendingMessageId, getRetryableAIErrorMessage(error), { tone: 'error' });
    updateWeeklyReviewTemplateStage(sessionId, 'ready');
  } finally {
    if (activeRequestRef.current?.pendingMessageId === pendingMessageId) {
      activeRequestRef.current = null;
      setIsLoading(false);
    }
  }
};

export const runDailyReviewNarrativeWriteback = async ({
  activeRequestRef,
  addToast,
  buildConversationHistory,
  buildPersonaPrompt,
  debugMode,
  getConversationSummary,
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
}: DailyWritebackOptions): Promise<void> => {
  const sessionId = session.id;
  const pendingMessageId = crypto.randomUUID();
  const now = Date.now();
  const sessionPersona = resolveSessionPersona(session);
  const conversationSummary = getConversationSummary(session.id);

  appendPendingAssistantMessage(mutateSession, sessionId, pendingMessageId, '我来整理今天的日报。', now);

  setInputText('');
  setIsLoading(true);
  setIsHistoryPanelOpen(false);
  setIsPersonaPanelOpen(false);
  setDailyReviewWritebackConfirmation(null);

  const controller = new AbortController();
  activeRequestRef.current = { controller, sessionId, pendingMessageId };

  if (params.createdReview) {
    setDailyReviews((previousReviews) => {
      if (previousReviews.some((review) => review.id === params.dailyReview.id)) {
        return previousReviews;
      }

      return [...previousReviews, params.dailyReview];
    });
  }

  try {
    const { systemPrompt, userPrompt } = await dailyReviewTemplateService.buildNarrativeWritebackPrompts({
      personaPrompt: buildPersonaPrompt(sessionPersona),
      dayDataText: params.dayDataText,
      conversationSummary,
      existingNarrative: params.dailyReview.narrative,
      mergeMode: params.mergeMode
    });

    const dailyWritebackResult = await aiService.requestStructuredJsonWithDebug({
      systemPrompt,
      userPrompt,
      conversationHistory: buildConversationHistory(session),
      cacheHint: {
        keySeed: `daily_review_writeback:${params.dailyReview.date}:${params.mergeMode}`,
        scope: 'daily_review_writeback'
      },
      normalizeResult: (rawValue, meta) => ({
        ...dailyReviewTemplateService.parseNarrativeToolCallResponse(
          rawValue,
          params.dailyReview.date,
          params.mergeMode
        ),
        ...(meta?.reasoning ? { reasoning: meta.reasoning } : {})
      })
    }, {
      signal: controller.signal
    });

    if (controller.signal.aborted || activeRequestRef.current?.pendingMessageId !== pendingMessageId) {
      return;
    }

    const narrative = dailyReviewTemplateService.buildNarrativeFromToolCall(dailyWritebackResult.result.toolCall);

    setDailyReviews((previousReviews) => (
      dailyReviewTemplateService.updateDailyReviewNarrative(previousReviews, params.dailyReview.id, narrative)
    ));

    const parsedNarrative = parseNarrative(narrative, `日报 ${params.dailyReview.date}`);
    const writebackResultCard: AIChatDailyReviewWritebackResult = {
      dailyReviewId: params.dailyReview.id,
      date: params.dailyReview.date,
      title: parsedNarrative.title,
      preview: parsedNarrative.content,
      createdReview: params.createdReview,
      mergeMode: params.mergeMode
    };

    replacePendingWithResult(sessionId, pendingMessageId, dailyWritebackResult.result.assistantReply, {
      tone: 'system',
      ...(dailyWritebackResult.result.reasoning ? { reasoning: dailyWritebackResult.result.reasoning } : {}),
      dailyReviewWriteback: writebackResultCard,
      ...(debugMode
        ? {
          debugSections: [{
            label: '日报写入 AI 叙事',
            exchange: dailyWritebackResult.debug
          }]
        }
        : {})
    });
    addToast('success', 'AI 叙事已写入日报');
  } catch (error) {
    const isCurrentPendingRequest = activeRequestRef.current?.pendingMessageId === pendingMessageId;

    if (isAbortError(error)) {
      if (isCurrentPendingRequest) {
        replacePendingWithResult(sessionId, pendingMessageId, '已停止这次写入。', { tone: 'system' });
      }
      return;
    }

    if (!isCurrentPendingRequest || controller.signal.aborted) {
      return;
    }

    replacePendingWithResult(sessionId, pendingMessageId, getRetryableAIErrorMessage(error), { tone: 'error' });
  } finally {
    if (activeRequestRef.current?.pendingMessageId === pendingMessageId) {
      activeRequestRef.current = null;
      setIsLoading(false);
    }
  }
};

export const runDailyNewspaperWriteback = async ({
  activeRequestRef,
  assistantMemoryEnabled,
  addToast,
  applyUnifiedToolCalls,
  buildConversationHistory,
  buildDreamContext,
  buildForegroundAssistantMemory,
  buildForegroundAssistantReminderSummary,
  buildPersonaPrompt,
  buildStateContext,
  debugMode,
  getConversationSummary,
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
}: DailyNewspaperWritebackOptions): Promise<void> => {
  const sessionId = session.id;
  const pendingMessageId = crypto.randomUUID();
  const now = Date.now();
  const sessionPersona = resolveSessionPersona(session);
  const conversationSummary = getConversationSummary(session.id);
  const reminderSummary = buildForegroundAssistantReminderSummary();
  const stateContext = buildStateContext(new Date(now), reminderSummary);
  const dreamContext = buildDreamContext();
  const memorySnapshot = assistantMemoryEnabled ? buildForegroundAssistantMemory() : undefined;

  appendPendingAssistantMessage(mutateSession, sessionId, pendingMessageId, '我来整理今天的小报。', now);

  setInputText('');
  setIsLoading(true);
  setIsHistoryPanelOpen(false);
  setIsPersonaPanelOpen(false);
  setDailyNewspaperWritebackConfirmation(null);

  const controller = new AbortController();
  activeRequestRef.current = { controller, sessionId, pendingMessageId };

  if (params.createdReview) {
    setDailyReviews((previousReviews) => {
      if (previousReviews.some((review) => review.id === params.dailyReview.id)) {
        return previousReviews;
      }

      return [...previousReviews, params.dailyReview];
    });
  }

  try {
    const { systemPrompt, userPrompt } = await dailyNewspaperService.buildWritebackPrompts({
      personaPrompt: buildPersonaPrompt(sessionPersona),
      dayDataText: params.dayDataText,
      conversationSummary,
      existingNewspaper: params.dailyReview.aiNewspaper,
      mergeMode: params.mergeMode,
      stateContext,
      ...(memorySnapshot ? { memorySnapshot } : {}),
      ...(dreamContext ? { dreamContext } : {})
    });

    const newspaperWritebackResult = await aiService.requestStructuredJsonWithDebug({
      systemPrompt,
      userPrompt,
      conversationHistory: buildConversationHistory(session),
      cacheHint: {
        keySeed: `daily_newspaper_writeback:${params.dailyReview.date}:${params.mergeMode}`,
        scope: 'daily_newspaper_writeback'
      },
      normalizeResult: (rawValue, meta) => ({
        ...dailyNewspaperService.parseWritebackResponse(
          rawValue,
          params.dailyReview.date,
          params.mergeMode
        ),
        ...(meta?.reasoning ? { reasoning: meta.reasoning } : {})
      })
    }, {
      signal: controller.signal
    });

    if (controller.signal.aborted || activeRequestRef.current?.pendingMessageId !== pendingMessageId) {
      return;
    }

    const appliedActions = Array.isArray(newspaperWritebackResult.result.toolCalls) && newspaperWritebackResult.result.toolCalls.length > 0
      ? applyUnifiedToolCalls(newspaperWritebackResult.result.toolCalls, '小报')
      : [];
    const newspaper = dailyNewspaperService.buildNewspaperFromToolCall(
      newspaperWritebackResult.result.newspaperToolCall,
      newspaperWritebackResult.result.assistantReply
    );

    setDailyReviews((previousReviews) => (
      dailyNewspaperService.updateDailyReviewNewspaper(previousReviews, params.dailyReview.id, newspaper)
    ));

    const writebackResultCard: AIChatDailyNewspaperWritebackResult = {
      dailyReviewId: params.dailyReview.id,
      date: params.dailyReview.date,
      title: newspaper.title,
      preview: newspaper.overallComment,
      createdReview: params.createdReview,
      mergeMode: params.mergeMode
    };

    replacePendingWithResult(sessionId, pendingMessageId, newspaperWritebackResult.result.assistantReply, {
      tone: 'system',
      ...(newspaperWritebackResult.result.reasoning ? { reasoning: newspaperWritebackResult.result.reasoning } : {}),
      ...(appliedActions.length > 0 ? { appliedActions } : {}),
      dailyNewspaperWriteback: writebackResultCard,
      ...(debugMode
        ? {
          debugSections: [{
            label: '日报小报写入',
            exchange: newspaperWritebackResult.debug
          }]
        }
        : {})
    });
    addToast('success', 'AI 小报已写入日报');
  } catch (error) {
    const isCurrentPendingRequest = activeRequestRef.current?.pendingMessageId === pendingMessageId;

    if (isAbortError(error)) {
      if (isCurrentPendingRequest) {
        replacePendingWithResult(sessionId, pendingMessageId, '已停止这次写入。', { tone: 'system' });
      }
      return;
    }

    if (!isCurrentPendingRequest || controller.signal.aborted) {
      return;
    }

    replacePendingWithResult(sessionId, pendingMessageId, getRetryableAIErrorMessage(error), { tone: 'error' });
  } finally {
    if (activeRequestRef.current?.pendingMessageId === pendingMessageId) {
      activeRequestRef.current = null;
      setIsLoading(false);
    }
  }
};

export const runMonthlyReviewNarrativeWriteback = async ({
  activeRequestRef,
  addToast,
  buildConversationHistory: _buildConversationHistory,
  buildPersonaPrompt,
  getConversationSummary,
  getRetryableAIErrorMessage,
  isAbortError,
  mutateSession,
  params,
  replacePendingWithResult,
  resolveSessionPersona,
  resolveTemplateMeta,
  session,
  setInputText,
  setIsHistoryPanelOpen,
  setIsLoading,
  setIsPersonaPanelOpen,
  setMonthlyReviews,
  updateWeeklyReviewTemplateStage
}: MonthlyWritebackOptions): Promise<void> => {
  const sessionId = session.id;
  const pendingMessageId = crypto.randomUUID();
  const now = Date.now();
  const sessionPersona = resolveSessionPersona(session);
  const conversationSummary = getConversationSummary(session.id);

  appendPendingAssistantMessage(mutateSession, sessionId, pendingMessageId, '我来整理成本月的 AI 叙事。', now);

  setInputText('');
  setIsLoading(true);
  setIsHistoryPanelOpen(false);
  setIsPersonaPanelOpen(false);

  const controller = new AbortController();
  activeRequestRef.current = { controller, sessionId, pendingMessageId };

  if (params.createdReview) {
    setMonthlyReviews((previousReviews) => {
      if (previousReviews.some((review) => review.id === params.monthlyReview.id)) {
        return previousReviews;
      }

      return [...previousReviews, params.monthlyReview];
    });
  }

  try {
    const templateMeta = resolveTemplateMeta(session);
    if (!templateMeta) {
      throw new Error('月复盘上下文还没有准备好。');
    }

    const { systemPrompt, userPrompt } = await monthlyReviewTemplateService.buildNarrativeWritebackPrompts({
      personaPrompt: buildPersonaPrompt(sessionPersona),
      monthDataText: params.monthDataText,
      conversationSummary,
      mergeMode: params.mergeMode
    });

    const rawToolCallResponse = await aiService.generateNarrative(userPrompt, systemPrompt);

    if (controller.signal.aborted || activeRequestRef.current?.pendingMessageId !== pendingMessageId) {
      return;
    }

    const toolCall = monthlyReviewTemplateService.parseNarrativeToolCallResponse(
      rawToolCallResponse,
      params.monthlyReview.monthStartDate,
      params.monthlyReview.monthEndDate,
      params.mergeMode
    );
    const narrative = monthlyReviewTemplateService.buildNarrativeFromToolCall(toolCall);

    setMonthlyReviews((previousReviews) => (
      monthlyReviewTemplateService.updateMonthlyReviewNarrative(previousReviews, params.monthlyReview.id, narrative)
    ));

    const parsedNarrative = parseNarrative(narrative, `月复盘 ${params.monthlyReview.monthStartDate}`);
    const writebackResultCard: AIChatMonthlyReviewWritebackResult = {
      monthlyReviewId: params.monthlyReview.id,
      monthStartDate: params.monthlyReview.monthStartDate,
      monthEndDate: params.monthlyReview.monthEndDate,
      title: parsedNarrative.title,
      preview: parsedNarrative.content,
      createdReview: params.createdReview,
      mergeMode: params.mergeMode
    };

    const successMessage = params.createdReview
      ? '已新建本月 Monthly Review，并写入 AI 叙事。'
      : '已覆盖写入这个月的 AI 叙事。';

    replacePendingWithResult(sessionId, pendingMessageId, successMessage, {
      tone: 'system',
      monthlyReviewWriteback: writebackResultCard
    });
    updateWeeklyReviewTemplateStage(sessionId, 'ready');
    addToast('success', 'AI 叙事已写入月回顾');
  } catch (error) {
    const isCurrentPendingRequest = activeRequestRef.current?.pendingMessageId === pendingMessageId;

    if (isAbortError(error)) {
      if (isCurrentPendingRequest) {
        replacePendingWithResult(sessionId, pendingMessageId, '已停止这次写入。', { tone: 'system' });
      }
      return;
    }

    if (!isCurrentPendingRequest || controller.signal.aborted) {
      return;
    }

    replacePendingWithResult(sessionId, pendingMessageId, getRetryableAIErrorMessage(error), { tone: 'error' });
    updateWeeklyReviewTemplateStage(sessionId, 'ready');
  } finally {
    if (activeRequestRef.current?.pendingMessageId === pendingMessageId) {
      activeRequestRef.current = null;
      setIsLoading(false);
    }
  }
};
