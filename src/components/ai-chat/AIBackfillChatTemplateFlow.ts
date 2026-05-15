/**
 * @file AIBackfillChatTemplateFlow.ts
 * @input Weekly/monthly template sessions, persona prompts, and modal orchestration callbacks
 * @output Shared template-session factories, guided-selection handlers, and opening-turn runners
 * @pos Component Support (AI Integration)
 * @description Pulls the staged weekly/monthly review template lifecycle out of AIBackfillChatModal so template session setup and first-turn orchestration live beside the other extracted AI chat helpers.
 * @updated 2026-05-15: Extracted weekly/monthly template session creation, guided selection, and opening-turn flows from AIBackfillChatModal.
 */
import { aiService, type AIConversationTurn } from '../../services/aiService';
import {
  monthlyReviewTemplateService,
  type MonthlyReviewTemplateSessionMeta
} from '../../services/monthlyReviewTemplateService';
import {
  weeklyReviewTemplateService,
  type WeeklyReviewTemplateSessionMeta
} from '../../services/weeklyReviewTemplateService';
import {
  createDefaultChatSession,
  resolveMonthlyReviewTemplateSessionMeta,
  resolveMonthlyReviewTemplateRangeMeta,
  resolveWeeklyReviewTemplateSessionMeta,
  resolveWeeklyReviewTemplateRangeMeta
} from './AIBackfillChatSessionHelpers';
import type {
  AIChatDebugSection,
  AIChatPersona,
  AIChatSession,
  ChatTone
} from './AIBackfillChatShared';
import type { AssistantReasoningSummary } from '../../types/assistant';

interface ActiveRequestState {
  controller: AbortController;
  pendingMessageId: string;
  sessionId: string;
}

interface ReplacePendingResultOptions {
  debugSections?: AIChatDebugSection[];
  displayParts?: string[];
  reasoning?: AssistantReasoningSummary;
  tone?: ChatTone;
}

interface TemplateFlowSharedOptions {
  activeRequestRef: { current: ActiveRequestState | null };
  appendSystemMessage: (sessionId: string, content: string) => void;
  buildConversationHistory: (session: AIChatSession) => AIConversationTurn[];
  buildPersonaPrompt: (persona: AIChatPersona) => string;
  getErrorDebugSections: (error: unknown, label: string, enabled: boolean) => AIChatDebugSection[];
  getRetryableAIErrorMessage: (error: unknown) => string;
  isAbortError: (error: unknown) => boolean;
  mutateSession: (sessionId: string, updater: (session: AIChatSession) => AIChatSession) => void;
  prepareForTemplateInteraction: () => void;
  replacePendingWithResult: (
    sessionId: string,
    pendingMessageId: string,
    content: string,
    options?: ReplacePendingResultOptions
  ) => void;
  resolveAssistantDisplayParts: (content: string) => string[] | undefined;
  resolveAssistantReplyContent: (
    output?: { assistantReply?: string; outcome?: string },
    fallbackReply?: string
  ) => string;
  setIsLoading: (value: boolean) => void;
}

interface WeeklyGuidedSelectionOptions extends TemplateFlowSharedOptions {
  onReadySession: (session: AIChatSession) => Promise<void>;
  session: AIChatSession;
  userInput: string;
}

interface MonthlyGuidedSelectionOptions extends TemplateFlowSharedOptions {
  onReadySession: (session: AIChatSession) => Promise<void>;
  session: AIChatSession;
  userInput: string;
}

interface WeeklyOpeningTurnOptions extends TemplateFlowSharedOptions {
  activePersona: AIChatPersona;
  debugMode: boolean;
  session: AIChatSession;
  weekDataText: string;
}

interface MonthlyOpeningTurnOptions extends TemplateFlowSharedOptions {
  activePersona: AIChatPersona;
  debugMode: boolean;
  monthDataText: string;
  session: AIChatSession;
}

interface WeeklyChatTurnOptions {
  activePersona: AIChatPersona;
  activeRequestRef: { current: ActiveRequestState | null };
  controller: AbortController;
  buildPersonaPrompt: (persona: AIChatPersona) => string;
  debugMode: boolean;
  getErrorDebugSections: (error: unknown, label: string, enabled: boolean) => AIChatDebugSection[];
  getRetryableAIErrorMessage: (error: unknown) => string;
  historyBeforeCurrent: AIConversationTurn[];
  isAbortError: (error: unknown) => boolean;
  pendingMessageId: string;
  replacePendingWithResult: (
    sessionId: string,
    pendingMessageId: string,
    content: string,
    options?: ReplacePendingResultOptions
  ) => void;
  resolveAssistantDisplayParts: (content: string) => string[] | undefined;
  resolveAssistantReplyContent: (
    output?: { assistantReply?: string; outcome?: string },
    fallbackReply?: string
  ) => string;
  session: AIChatSession;
  userMessage: string;
  weekDataText: string;
}

interface MonthlyChatTurnOptions {
  activePersona: AIChatPersona;
  activeRequestRef: { current: ActiveRequestState | null };
  controller: AbortController;
  buildPersonaPrompt: (persona: AIChatPersona) => string;
  debugMode: boolean;
  getErrorDebugSections: (error: unknown, label: string, enabled: boolean) => AIChatDebugSection[];
  getRetryableAIErrorMessage: (error: unknown) => string;
  historyBeforeCurrent: AIConversationTurn[];
  isAbortError: (error: unknown) => boolean;
  monthDataText: string;
  pendingMessageId: string;
  replacePendingWithResult: (
    sessionId: string,
    pendingMessageId: string,
    content: string,
    options?: ReplacePendingResultOptions
  ) => void;
  resolveAssistantDisplayParts: (content: string) => string[] | undefined;
  resolveAssistantReplyContent: (
    output?: { assistantReply?: string; outcome?: string },
    fallbackReply?: string
  ) => string;
  session: AIChatSession;
  userMessage: string;
}

const appendTemplateUserMessage = (
  mutateSession: TemplateFlowSharedOptions['mutateSession'],
  sessionId: string,
  content: string
) => {
  const now = Date.now();
  mutateSession(sessionId, (currentSession) => ({
    ...currentSession,
    messages: [
      ...currentSession.messages,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        createdAt: now
      }
    ]
  }));
};

const appendPendingAssistantMessage = (
  mutateSession: TemplateFlowSharedOptions['mutateSession'],
  sessionId: string,
  content: string
) => {
  const pendingMessageId = crypto.randomUUID();
  const now = Date.now();
  mutateSession(sessionId, (currentSession) => ({
    ...currentSession,
    messages: [
      ...currentSession.messages,
      {
        id: pendingMessageId,
        role: 'assistant',
        content,
        createdAt: now,
        tone: 'pending'
      }
    ]
  }));
  return pendingMessageId;
};

export const createWeeklyReviewTemplateSession = (personaId: string): AIChatSession => (
  createDefaultChatSession(personaId, {
    title: '周复盘模板对话',
    templateMeta: weeklyReviewTemplateService.createSetupSessionMeta(),
    messages: [{
      id: crypto.randomUUID(),
      role: 'assistant',
      content: weeklyReviewTemplateService.getRangeSelectionPrompt(),
      createdAt: Date.now(),
      tone: 'system'
    }]
  })
);

export const createMonthlyReviewTemplateSession = (personaId: string): AIChatSession => (
  createDefaultChatSession(personaId, {
    title: '月复盘模板对话',
    templateMeta: monthlyReviewTemplateService.createSetupSessionMeta(),
    messages: [{
      id: crypto.randomUUID(),
      role: 'assistant',
      content: monthlyReviewTemplateService.getRangeSelectionPrompt(),
      createdAt: Date.now(),
      tone: 'system'
    }]
  })
);

export const runWeeklyReviewTemplateGuidedSelection = async ({
  appendSystemMessage,
  mutateSession,
  onReadySession,
  prepareForTemplateInteraction,
  session,
  userInput
}: WeeklyGuidedSelectionOptions): Promise<boolean> => {
  const sessionId = session.id;
  const trimmedInput = userInput.trim();
  if (!trimmedInput || session.templateMeta?.templateType !== 'weekly_review') {
    return false;
  }

  appendTemplateUserMessage(mutateSession, sessionId, trimmedInput);
  prepareForTemplateInteraction();

  if (session.templateMeta.stage === 'select_range') {
    const selection = weeklyReviewTemplateService.parseWeekSelectionInput(trimmedInput, new Date());
    if (!selection) {
      appendSystemMessage(sessionId, weeklyReviewTemplateService.getRangeSelectionInvalidPrompt());
      return true;
    }

    mutateSession(sessionId, (currentSession) => ({
      ...currentSession,
      title: weeklyReviewTemplateService.getSessionTitle(selection),
      ...(currentSession.templateMeta
        ? {
          templateMeta: {
            ...currentSession.templateMeta,
            stage: 'select_method',
            weekStartDate: selection.weekStartDate,
            weekEndDate: selection.weekEndDate,
            selectedRangeLabel: selection.selectedRangeLabel,
            methodId: undefined,
            methodLabel: undefined,
            pendingWriteIntent: false
          }
        }
        : {})
    }));
    appendSystemMessage(sessionId, weeklyReviewTemplateService.getMethodSelectionPrompt(selection));
    return true;
  }

  if (session.templateMeta.stage === 'select_method') {
    const methodId = weeklyReviewTemplateService.parseMethodSelectionInput(trimmedInput);
    if (!methodId) {
      appendSystemMessage(sessionId, weeklyReviewTemplateService.getMethodSelectionInvalidPrompt());
      return true;
    }

    const selectionMeta = resolveWeeklyReviewTemplateRangeMeta(session);
    if (!selectionMeta) {
      appendSystemMessage(sessionId, weeklyReviewTemplateService.getRangeSelectionPrompt());
      mutateSession(sessionId, (currentSession) => ({
        ...currentSession,
        title: '周复盘模板对话',
        ...(currentSession.templateMeta
          ? {
            templateMeta: weeklyReviewTemplateService.createSetupSessionMeta()
          }
          : {})
      }));
      return true;
    }

    const methodLabel = weeklyReviewTemplateService.listMethodOptions().find((item) => item.id === methodId)?.title || '系统复盘';
    const readySession: AIChatSession = {
      ...session,
      title: weeklyReviewTemplateService.getSessionTitle(selectionMeta),
      templateMeta: {
        ...(session.templateMeta || weeklyReviewTemplateService.createSetupSessionMeta()),
        templateType: 'weekly_review',
        stage: 'ready',
        weekStartDate: selectionMeta.weekStartDate,
        weekEndDate: selectionMeta.weekEndDate,
        selectedRangeLabel: selectionMeta.selectedRangeLabel,
        methodId,
        methodLabel,
        pendingWriteIntent: false
      }
    };

    mutateSession(sessionId, (currentSession) => ({
      ...currentSession,
      title: readySession.title,
      templateMeta: readySession.templateMeta
    }));
    await onReadySession(readySession);
    return true;
  }

  return false;
};

export const runMonthlyReviewTemplateGuidedSelection = async ({
  appendSystemMessage,
  mutateSession,
  onReadySession,
  prepareForTemplateInteraction,
  session,
  userInput
}: MonthlyGuidedSelectionOptions): Promise<boolean> => {
  const sessionId = session.id;
  const trimmedInput = userInput.trim();
  if (!trimmedInput || session.templateMeta?.templateType !== 'monthly_review') {
    return false;
  }

  appendTemplateUserMessage(mutateSession, sessionId, trimmedInput);
  prepareForTemplateInteraction();

  if (session.templateMeta.stage === 'select_range') {
    const selection = monthlyReviewTemplateService.parseMonthSelectionInput(trimmedInput, new Date());
    if (!selection) {
      appendSystemMessage(sessionId, monthlyReviewTemplateService.getRangeSelectionInvalidPrompt());
      return true;
    }

    mutateSession(sessionId, (currentSession) => ({
      ...currentSession,
      title: monthlyReviewTemplateService.getSessionTitle(selection),
      ...(currentSession.templateMeta
        ? {
          templateMeta: {
            ...currentSession.templateMeta,
            stage: 'select_method',
            monthStartDate: selection.monthStartDate,
            monthEndDate: selection.monthEndDate,
            selectedRangeLabel: selection.selectedRangeLabel,
            methodId: undefined,
            methodLabel: undefined,
            pendingWriteIntent: false
          }
        }
        : {})
    }));
    appendSystemMessage(sessionId, monthlyReviewTemplateService.getMethodSelectionPrompt(selection));
    return true;
  }

  if (session.templateMeta.stage === 'select_method') {
    const methodId = monthlyReviewTemplateService.parseMethodSelectionInput(trimmedInput);
    if (!methodId) {
      appendSystemMessage(sessionId, monthlyReviewTemplateService.getMethodSelectionInvalidPrompt());
      return true;
    }

    const selectionMeta = resolveMonthlyReviewTemplateRangeMeta(session);
    if (!selectionMeta) {
      appendSystemMessage(sessionId, monthlyReviewTemplateService.getRangeSelectionPrompt());
      mutateSession(sessionId, (currentSession) => ({
        ...currentSession,
        title: '月复盘模板对话',
        ...(currentSession.templateMeta
          ? {
            templateMeta: monthlyReviewTemplateService.createSetupSessionMeta()
          }
          : {})
      }));
      return true;
    }

    const methodLabel = monthlyReviewTemplateService.listMethodOptions().find((item) => item.id === methodId)?.title || '系统复盘';
    const readySession: AIChatSession = {
      ...session,
      title: monthlyReviewTemplateService.getSessionTitle(selectionMeta),
      templateMeta: {
        ...(session.templateMeta || monthlyReviewTemplateService.createSetupSessionMeta()),
        templateType: 'monthly_review',
        stage: 'ready',
        monthStartDate: selectionMeta.monthStartDate,
        monthEndDate: selectionMeta.monthEndDate,
        selectedRangeLabel: selectionMeta.selectedRangeLabel,
        methodId,
        methodLabel,
        pendingWriteIntent: false
      }
    };

    mutateSession(sessionId, (currentSession) => ({
      ...currentSession,
      title: readySession.title,
      templateMeta: readySession.templateMeta
    }));
    await onReadySession(readySession);
    return true;
  }

  return false;
};

export const runWeeklyReviewTemplateOpeningTurn = async ({
  activePersona,
  activeRequestRef,
  buildConversationHistory,
  buildPersonaPrompt,
  debugMode,
  getRetryableAIErrorMessage,
  isAbortError,
  mutateSession,
  prepareForTemplateInteraction,
  replacePendingWithResult,
  resolveAssistantDisplayParts,
  resolveAssistantReplyContent,
  session,
  setIsLoading,
  weekDataText
}: WeeklyOpeningTurnOptions): Promise<void> => {
  const sessionId = session.id;
  const templateMeta = resolveWeeklyReviewTemplateSessionMeta(session);
  if (!templateMeta) {
    throw new Error('周复盘上下文还没有准备好。');
  }

  const pendingMessageId = appendPendingAssistantMessage(mutateSession, sessionId, '我先整理一下这周的脉络。');
  prepareForTemplateInteraction();
  setIsLoading(true);

  const controller = new AbortController();
  activeRequestRef.current = { controller, sessionId, pendingMessageId };

  try {
    const templatePrompt = await weeklyReviewTemplateService.buildChatPrompts({
      personaPrompt: buildPersonaPrompt(activePersona),
      weekDataText,
      userMessage: '请先根据这一周的数据，主动开始这次周复盘，对这一周做一个有结构的开场，并带着我继续往下聊。',
      methodId: templateMeta.methodId
    });
    const templateTurnResult = await aiService.requestAssistantUnifiedTurnWithDebug({
      mode: 'foreground',
      systemPrompt: templatePrompt.systemPrompt,
      userPrompt: templatePrompt.userPrompt,
      conversationHistory: buildConversationHistory(session),
      cacheHint: {
        keySeed: `weekly_review_chat:${templateMeta.weekStartDate}:${templateMeta.weekEndDate}:${templateMeta.methodId}`,
        scope: 'weekly_review_template'
      }
    }, {
      signal: controller.signal
    });

    if (controller.signal.aborted || activeRequestRef.current?.pendingMessageId !== pendingMessageId) {
      return;
    }

    const output = templateTurnResult.output;
    const templateContent = resolveAssistantReplyContent(
      output,
      output.outcome === 'clarify'
        ? '我已经把这一周的大体情况理出来了，我们继续往下拆。'
        : undefined
    );
    const displayParts = resolveAssistantDisplayParts(templateContent);

    replacePendingWithResult(sessionId, pendingMessageId, templateContent, {
      ...(output.reasoning ? { reasoning: output.reasoning } : {}),
      ...(displayParts?.length ? { displayParts } : {}),
      ...(debugMode
        ? {
          debugSections: [{
            label: '周复盘模板对话',
            exchange: templateTurnResult.debug
          }]
        }
        : {})
    });
  } catch (error) {
    const isCurrentPendingRequest = activeRequestRef.current?.pendingMessageId === pendingMessageId;

    if (isAbortError(error)) {
      if (isCurrentPendingRequest) {
        replacePendingWithResult(sessionId, pendingMessageId, '已停止这次周复盘开场。', {
          tone: 'system'
        });
      }
      return;
    }

    if (!isCurrentPendingRequest || controller.signal.aborted) {
      return;
    }

    replacePendingWithResult(sessionId, pendingMessageId, getRetryableAIErrorMessage(error), {
      tone: 'error',
      debugSections: getErrorDebugSections(error, '周复盘模板对话', debugMode)
    });
  } finally {
    if (activeRequestRef.current?.pendingMessageId === pendingMessageId) {
      activeRequestRef.current = null;
      setIsLoading(false);
    }
  }
};

export const runMonthlyReviewTemplateOpeningTurn = async ({
  activePersona,
  activeRequestRef,
  buildConversationHistory,
  buildPersonaPrompt,
  debugMode,
  getRetryableAIErrorMessage,
  isAbortError,
  monthDataText,
  mutateSession,
  prepareForTemplateInteraction,
  replacePendingWithResult,
  resolveAssistantDisplayParts,
  resolveAssistantReplyContent,
  session,
  setIsLoading
}: MonthlyOpeningTurnOptions): Promise<void> => {
  const sessionId = session.id;
  const templateMeta = resolveMonthlyReviewTemplateSessionMeta(session);
  if (!templateMeta) {
    throw new Error('月复盘上下文还没有准备好。');
  }

  const pendingMessageId = appendPendingAssistantMessage(mutateSession, sessionId, '我先整理一下这个月的脉络。');
  prepareForTemplateInteraction();
  setIsLoading(true);

  const controller = new AbortController();
  activeRequestRef.current = { controller, sessionId, pendingMessageId };

  try {
    const templatePrompt = await monthlyReviewTemplateService.buildChatPrompts({
      personaPrompt: buildPersonaPrompt(activePersona),
      monthDataText,
      userMessage: '请先根据这一个月的数据，主动开始这次月复盘，对这一个月做一个有结构的开场，并带着我继续往下聊。',
      methodId: templateMeta.methodId
    });
    const templateTurnResult = await aiService.requestAssistantUnifiedTurnWithDebug({
      mode: 'foreground',
      systemPrompt: templatePrompt.systemPrompt,
      userPrompt: templatePrompt.userPrompt,
      conversationHistory: buildConversationHistory(session),
      cacheHint: {
        keySeed: `monthly_review_chat:${templateMeta.monthStartDate}:${templateMeta.monthEndDate}:${templateMeta.methodId}`,
        scope: 'monthly_review_template'
      }
    }, {
      signal: controller.signal
    });

    if (controller.signal.aborted || activeRequestRef.current?.pendingMessageId !== pendingMessageId) {
      return;
    }

    const output = templateTurnResult.output;
    const templateContent = resolveAssistantReplyContent(
      output,
      output.outcome === 'clarify'
        ? '我已经把这个月的大体情况理出来了，我们继续往下拆。'
        : undefined
    );
    const displayParts = resolveAssistantDisplayParts(templateContent);

    replacePendingWithResult(sessionId, pendingMessageId, templateContent, {
      ...(output.reasoning ? { reasoning: output.reasoning } : {}),
      ...(displayParts?.length ? { displayParts } : {}),
      ...(debugMode
        ? {
          debugSections: [{
            label: '月复盘模板对话',
            exchange: templateTurnResult.debug
          }]
        }
        : {})
    });
  } catch (error) {
    const isCurrentPendingRequest = activeRequestRef.current?.pendingMessageId === pendingMessageId;

    if (isAbortError(error)) {
      if (isCurrentPendingRequest) {
        replacePendingWithResult(sessionId, pendingMessageId, '已停止这次月复盘开场。', {
          tone: 'system'
        });
      }
      return;
    }

    if (!isCurrentPendingRequest || controller.signal.aborted) {
      return;
    }

    replacePendingWithResult(sessionId, pendingMessageId, getRetryableAIErrorMessage(error), {
      tone: 'error',
      debugSections: getErrorDebugSections(error, '月复盘模板对话', debugMode)
    });
  } finally {
    if (activeRequestRef.current?.pendingMessageId === pendingMessageId) {
      activeRequestRef.current = null;
      setIsLoading(false);
    }
  }
};

export const runWeeklyReviewTemplateChatTurn = async ({
  activePersona,
  activeRequestRef,
  buildPersonaPrompt,
  controller,
  debugMode,
  getErrorDebugSections,
  getRetryableAIErrorMessage,
  historyBeforeCurrent,
  isAbortError,
  pendingMessageId,
  replacePendingWithResult,
  resolveAssistantDisplayParts,
  resolveAssistantReplyContent,
  session,
  userMessage,
  weekDataText
}: WeeklyChatTurnOptions): Promise<void> => {
  const templateMeta = resolveWeeklyReviewTemplateSessionMeta(session);
  if (!templateMeta) {
    throw new Error('周复盘上下文还没有准备好。');
  }

  try {
    const templatePrompt = await weeklyReviewTemplateService.buildChatPrompts({
      personaPrompt: buildPersonaPrompt(activePersona),
      weekDataText,
      userMessage,
      methodId: templateMeta.methodId
    });
    const templateTurnResult = await aiService.requestAssistantUnifiedTurnWithDebug({
      mode: 'foreground',
      systemPrompt: templatePrompt.systemPrompt,
      userPrompt: templatePrompt.userPrompt,
      conversationHistory: historyBeforeCurrent,
      cacheHint: {
        keySeed: `weekly_review_chat:${templateMeta.weekStartDate}:${templateMeta.weekEndDate}:${templateMeta.methodId}`,
        scope: 'weekly_review_template'
      }
    }, {
      signal: controller.signal
    });

    if (controller.signal.aborted || activeRequestRef.current?.pendingMessageId !== pendingMessageId) {
      return;
    }

    const output = templateTurnResult.output;
    const templateContent = resolveAssistantReplyContent(output);
    const displayParts = resolveAssistantDisplayParts(templateContent);

    replacePendingWithResult(session.id, pendingMessageId, templateContent, {
      ...(output.reasoning ? { reasoning: output.reasoning } : {}),
      ...(displayParts?.length ? { displayParts } : {}),
      ...(debugMode
        ? {
          debugSections: [{
            label: '周复盘模板对话',
            exchange: templateTurnResult.debug
          }]
        }
        : {})
    });
  } catch (error) {
    const isCurrentPendingRequest = activeRequestRef.current?.pendingMessageId === pendingMessageId;

    if (isAbortError(error)) {
      return;
    }

    if (!isCurrentPendingRequest || controller.signal.aborted) {
      return;
    }

    replacePendingWithResult(session.id, pendingMessageId, getRetryableAIErrorMessage(error), {
      tone: 'error',
      debugSections: getErrorDebugSections(error, '周复盘模板对话', debugMode)
    });
  }
};

export const runMonthlyReviewTemplateChatTurn = async ({
  activePersona,
  activeRequestRef,
  buildPersonaPrompt,
  controller,
  debugMode,
  getErrorDebugSections,
  getRetryableAIErrorMessage,
  historyBeforeCurrent,
  isAbortError,
  monthDataText,
  pendingMessageId,
  replacePendingWithResult,
  resolveAssistantDisplayParts,
  resolveAssistantReplyContent,
  session,
  userMessage
}: MonthlyChatTurnOptions): Promise<void> => {
  const templateMeta = resolveMonthlyReviewTemplateSessionMeta(session);
  if (!templateMeta) {
    throw new Error('月复盘上下文还没有准备好。');
  }

  try {
    const templatePrompt = await monthlyReviewTemplateService.buildChatPrompts({
      personaPrompt: buildPersonaPrompt(activePersona),
      monthDataText,
      userMessage,
      methodId: templateMeta.methodId
    });
    const templateTurnResult = await aiService.requestAssistantUnifiedTurnWithDebug({
      mode: 'foreground',
      systemPrompt: templatePrompt.systemPrompt,
      userPrompt: templatePrompt.userPrompt,
      conversationHistory: historyBeforeCurrent,
      cacheHint: {
        keySeed: `monthly_review_chat:${templateMeta.monthStartDate}:${templateMeta.monthEndDate}:${templateMeta.methodId}`,
        scope: 'monthly_review_template'
      }
    }, {
      signal: controller.signal
    });

    if (controller.signal.aborted || activeRequestRef.current?.pendingMessageId !== pendingMessageId) {
      return;
    }

    const output = templateTurnResult.output;
    const templateContent = resolveAssistantReplyContent(output);
    const displayParts = resolveAssistantDisplayParts(templateContent);

    replacePendingWithResult(session.id, pendingMessageId, templateContent, {
      ...(output.reasoning ? { reasoning: output.reasoning } : {}),
      ...(displayParts?.length ? { displayParts } : {}),
      ...(debugMode
        ? {
          debugSections: [{
            label: '月复盘模板对话',
            exchange: templateTurnResult.debug
          }]
        }
        : {})
    });
  } catch (error) {
    const isCurrentPendingRequest = activeRequestRef.current?.pendingMessageId === pendingMessageId;

    if (isAbortError(error)) {
      return;
    }

    if (!isCurrentPendingRequest || controller.signal.aborted) {
      return;
    }

    replacePendingWithResult(session.id, pendingMessageId, getRetryableAIErrorMessage(error), {
      tone: 'error',
      debugSections: getErrorDebugSections(error, '月复盘模板对话', debugMode)
    });
  }
};
