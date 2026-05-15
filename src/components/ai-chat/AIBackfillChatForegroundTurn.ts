/**
 * @file AIBackfillChatForegroundTurn.ts
 * @input Foreground send text, active session state, and modal orchestration callbacks
 * @output Shared foreground-turn preparation helpers and unified-turn runner for ordinary chat
 * @pos Component Support (AI Integration)
 * @description Extracts the pre-request foreground turn setup and the ordinary unified-turn execution path out of AIBackfillChatModal so the main send handler becomes a thin dispatcher.
 * @updated 2026-05-15: Added foreground turn preparation plus unified-turn execution helpers.
 */
import type { AIConversationTurn } from '../../services/aiService';
import type { AppliedChatAction } from '../../services/assistantActionExecutor';
import type { AssistantUnifiedTurnOutput } from '../../types/assistant';
import type {
  AIChatDebugSection,
  AIChatMemoryUpdateSection,
  AIChatPersona,
  AIChatSession
} from './AIBackfillChatShared';

export interface ForegroundTurnPreparationResult {
  canRetryInPlace: boolean;
  historyBeforeCurrent: AIConversationTurn[];
  now: number;
  pendingMessageId: string;
  sessionId: string;
  userMessageId: string;
}

interface PrepareForegroundTurnOptions {
  activeSession: AIChatSession;
  buildRetryConversationHistory: (sessionId: string, retrySourceUserMessageId?: string) => AIConversationTurn[];
  conversationHistoryCache: Map<string, AIConversationTurn[]>;
  createSessionTitleFromUserMessage: (value: string) => string;
  isMonthlyReviewTemplateSession: boolean;
  isWeeklyReviewTemplateSession: boolean;
  mutateSession: (sessionId: string, updater: (session: AIChatSession) => AIChatSession) => void;
  notifyUserTurn: (text: string, at: string) => Promise<void>;
  onNotifyUserTurnError: (error: unknown) => void;
  retrySourceUserMessageId?: string;
  replaceMessageId?: string;
  setInputText: (value: string) => void;
  trimmedText: string;
}

interface ReplacePendingResultOptions {
  appliedActions?: AppliedChatAction[];
  debugSections?: AIChatDebugSection[];
  displayParts?: string[];
  memoryUpdates?: AIChatMemoryUpdateSection[];
  reasoning?: AssistantUnifiedTurnOutput['output']['reasoning'];
  reminderUpdates?: string[];
  retryInput?: string;
  retrySourceUserMessageId?: string;
  tone?: 'normal' | 'system' | 'error' | 'pending';
}

interface RunOrdinaryForegroundTurnOptions {
  activePersona: AIChatPersona;
  activeRequestRef: { current: { controller: AbortController; pendingMessageId: string; sessionId: string } | null };
  applyAssistantMemoryPatch: (patch?: AssistantUnifiedTurnOutput['memoryPatch']) => AIChatMemoryUpdateSection[];
  applyUnifiedReminders: (output: AssistantUnifiedTurnOutput) => string[];
  applyUnifiedToolCalls: (toolCalls: any[], sourceText: string) => AppliedChatAction[];
  assistantMemoryEnabled: boolean;
  buildDictionaryContext: () => string | undefined;
  buildDreamContext: (query?: string) => string | undefined;
  buildForegroundAssistantMemory: () => any;
  buildForegroundAssistantReminderSummary: () => string | undefined;
  buildPromptLayers: () => Promise<{ basePrompt: string; foregroundModePrompt: string }>;
  buildStateContext: (currentTurnDate: Date, reminderSummary?: string) => any;
  controller: AbortController;
  createTriggerCreatedAt: (date: Date) => string;
  debugMode: boolean;
  getErrorDebugSections: (error: unknown, label: string, enabled: boolean) => AIChatDebugSection[];
  getRetryableAIErrorMessage: (error: unknown) => string;
  handleRunUnifiedTurn: (args: {
    conversation: any;
    dictionaryContext?: string;
    dreamContext?: string;
    memory: any;
    memoryEnabled: boolean;
    modePrompt: string;
    now: number;
    stateContext: any;
    systemPrompt: string;
    userMessage: string;
    userPersonaPrompt: string;
  }, options: { signal: AbortSignal }) => Promise<{ debug: any; output: AssistantUnifiedTurnOutput }>;
  historyBeforeCurrent: AIConversationTurn[];
  isAbortError: (error: unknown) => boolean;
  narrowConversationContext: (history: AIConversationTurn[]) => any;
  notifyAssistantTaskStateChanged: () => void;
  now: number;
  pendingMessageId: string;
  replacePendingWithResult: (
    sessionId: string,
    pendingMessageId: string,
    content: string,
    options?: ReplacePendingResultOptions
  ) => void;
  resolveAssistantDisplayParts: (content: string) => string[] | undefined;
  resolveAssistantReplyContent: (
    output?: Pick<AssistantUnifiedTurnOutput, 'assistantReply' | 'outcome'>,
    fallbackReply?: string
  ) => string;
  resolveForegroundAssistantReply: (
    rawContent: string,
    sourceText: string,
    appliedActions: AppliedChatAction[]
  ) => string;
  sessionId: string;
  setIsLoading: (value: boolean) => void;
  trimmedText: string;
  userMessageId: string;
}

export const prepareForegroundTurn = ({
  activeSession,
  buildRetryConversationHistory,
  conversationHistoryCache,
  createSessionTitleFromUserMessage,
  isMonthlyReviewTemplateSession,
  isWeeklyReviewTemplateSession,
  mutateSession,
  notifyUserTurn,
  onNotifyUserTurnError,
  retrySourceUserMessageId,
  replaceMessageId,
  setInputText,
  trimmedText
}: PrepareForegroundTurnOptions): ForegroundTurnPreparationResult => {
  const sessionId = activeSession.id;
  const canRetryInPlace = Boolean(
    replaceMessageId && activeSession.messages.some((message) => message.id === replaceMessageId)
  );
  const userMessageId = retrySourceUserMessageId || crypto.randomUUID();
  const pendingMessageId = canRetryInPlace && replaceMessageId
    ? replaceMessageId
    : crypto.randomUUID();
  const now = Date.now();
  const historyBeforeCurrent = canRetryInPlace
    ? buildRetryConversationHistory(sessionId, retrySourceUserMessageId)
    : (conversationHistoryCache.get(sessionId) || []);
  const shouldRenameTitle = !isWeeklyReviewTemplateSession
    && !isMonthlyReviewTemplateSession
    && !canRetryInPlace
    && !activeSession.messages.some((message) => message.role === 'user');

  if (canRetryInPlace) {
    mutateSession(sessionId, (session) => ({
      ...session,
      messages: session.messages.map((message) => (
        message.id === pendingMessageId
          ? {
            id: pendingMessageId,
            role: 'assistant',
            content: '我先想一下。',
            createdAt: now,
            tone: 'pending'
          }
          : message
      ))
    }));
  } else {
    mutateSession(sessionId, (session) => ({
      ...session,
      title: shouldRenameTitle ? createSessionTitleFromUserMessage(trimmedText) : session.title,
      messages: [
        ...session.messages,
        {
          id: userMessageId,
          role: 'user',
          content: trimmedText,
          createdAt: now
        },
        {
          id: pendingMessageId,
          role: 'assistant',
          content: '我先想一下。',
          createdAt: now + 1,
          tone: 'pending'
        }
      ]
    }));
  }

  if (!canRetryInPlace) {
    void notifyUserTurn(trimmedText, new Date(now).toISOString()).catch(onNotifyUserTurnError);
    setInputText('');
  }

  return {
    canRetryInPlace,
    historyBeforeCurrent,
    now,
    pendingMessageId,
    sessionId,
    userMessageId
  };
};

export const runOrdinaryForegroundTurn = async ({
  activePersona,
  activeRequestRef,
  applyAssistantMemoryPatch,
  applyUnifiedReminders,
  applyUnifiedToolCalls,
  assistantMemoryEnabled,
  buildDictionaryContext,
  buildDreamContext,
  buildForegroundAssistantMemory,
  buildForegroundAssistantReminderSummary,
  buildPromptLayers,
  buildStateContext,
  controller,
  createTriggerCreatedAt,
  debugMode,
  getErrorDebugSections,
  getRetryableAIErrorMessage,
  handleRunUnifiedTurn,
  historyBeforeCurrent,
  isAbortError,
  narrowConversationContext,
  notifyAssistantTaskStateChanged,
  now,
  pendingMessageId,
  replacePendingWithResult,
  resolveAssistantDisplayParts,
  resolveAssistantReplyContent,
  resolveForegroundAssistantReply,
  sessionId,
  setIsLoading,
  trimmedText,
  userMessageId
}: RunOrdinaryForegroundTurnOptions): Promise<void> => {
  try {
    const currentTurnDate = new Date();
    const debugSections: AIChatDebugSection[] = [];
    const { basePrompt, foregroundModePrompt } = await buildPromptLayers();
    const narrowedConversationContext = narrowConversationContext(historyBeforeCurrent);
    const stateContext = buildStateContext(
      currentTurnDate,
      buildForegroundAssistantReminderSummary()
    );
    const dictionaryContext = buildDictionaryContext();
    const dreamContext = buildDreamContext(trimmedText);

    const unifiedTurnResult = await handleRunUnifiedTurn({
      conversation: narrowedConversationContext,
      ...(dictionaryContext ? { dictionaryContext } : {}),
      ...(dreamContext ? { dreamContext } : {}),
      memory: buildForegroundAssistantMemory(),
      memoryEnabled: assistantMemoryEnabled,
      modePrompt: foregroundModePrompt,
      now,
      stateContext,
      systemPrompt: basePrompt,
      userMessage: trimmedText,
      userPersonaPrompt: activePersona.systemPrompt ? '' : ''
    }, {
      signal: controller.signal
    });

    if (controller.signal.aborted || activeRequestRef.current?.pendingMessageId !== pendingMessageId) {
      return;
    }

    if (debugMode) {
      debugSections.push({
        label: '统一单轮调用',
        exchange: unifiedTurnResult.debug
      });
    }

    const output = unifiedTurnResult.output;
    const toolCalls = output.toolCalls || [];
    const unifiedAppliedActions = toolCalls.length > 0
      ? applyUnifiedToolCalls(toolCalls, trimmedText)
      : [];
    const unifiedSuccessCount = unifiedAppliedActions.filter((action) => action.status === 'applied').length;

    const reminderUpdates = applyUnifiedReminders(output);
    const memoryUpdates = assistantMemoryEnabled && output.memoryAction === 'update_memory'
      ? applyAssistantMemoryPatch(output.memoryPatch)
      : [];

    const rawUnifiedContent = resolveAssistantReplyContent(
      output,
      unifiedSuccessCount > 0
        ? `我先帮你处理好了 ${unifiedSuccessCount} 项。`
        : ((output.reminders || []).length > 0
          ? '我记下来了，到时候会提醒你。'
          : undefined)
    );
    const unifiedContent = resolveForegroundAssistantReply(rawUnifiedContent, trimmedText, unifiedAppliedActions);
    const displayParts = resolveAssistantDisplayParts(unifiedContent);

    replacePendingWithResult(sessionId, pendingMessageId, unifiedContent, {
      ...(output.reasoning ? { reasoning: output.reasoning } : {}),
      ...(displayParts?.length ? { displayParts } : {}),
      debugSections,
      ...(unifiedAppliedActions.length > 0 ? { appliedActions: unifiedAppliedActions } : {}),
      ...(memoryUpdates.length > 0 ? { memoryUpdates } : {}),
      ...(reminderUpdates.length > 0 ? { reminderUpdates } : {})
    });
    if (unifiedAppliedActions.length > 0 || reminderUpdates.length > 0) {
      notifyAssistantTaskStateChanged();
    }
  } catch (error) {
    const isCurrentPendingRequest = activeRequestRef.current?.pendingMessageId === pendingMessageId;

    if (isAbortError(error)) {
      if (isCurrentPendingRequest) {
        replacePendingWithResult(sessionId, pendingMessageId, '已停止这次请求。', {
          tone: 'system'
        });
      }
      return;
    }

    if (!isCurrentPendingRequest || controller.signal.aborted) {
      return;
    }

    const message = getRetryableAIErrorMessage(error);
    replacePendingWithResult(sessionId, pendingMessageId, message, {
      tone: 'error',
      retryInput: trimmedText,
      retrySourceUserMessageId: userMessageId,
      debugSections: getErrorDebugSections(error, '统一单轮调用', debugMode)
    });
  } finally {
    if (activeRequestRef.current?.pendingMessageId === pendingMessageId) {
      activeRequestRef.current = null;
      setIsLoading(false);
    }
  }
};
