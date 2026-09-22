/**
 * @file useAIBackfillChatDebugCommands.ts
 * @input Active chat session, background-turn adapters, retry state, and debug-mode setters
 * @output Manual check-in, reminder, letter, and debug-toggle command handlers
 * @pos Component Support (AI Integration)
 * @description Keeps manual assistant diagnostics and their pending-message lifecycle out of the main chat coordinator.
 * @updated 2026-09-22: Extracted manual assistant debug command handling from AIBackfillChatModal.
 */
import type { MutableRefObject } from 'react';
import type { AIConversationTurn, AIDebugExchange } from '../../services/aiService';
import { assistantOrchestratorService } from '../../services/assistantOrchestratorService';
import type { AssistantLetterResultCard, AssistantSystemTrigger } from '../../types/assistant';
import { formatAssistantLocalDateTime } from '../../utils/assistantTime';
import type { AIChatDebugSection, AIChatMessage, AIChatSession } from './AIBackfillChatShared';

interface DebugCommandOptions {
  replaceMessageId?: string;
  retrySourceUserMessageId?: string;
}

type BuildBackgroundTurnRequest = (options: {
  trigger: AssistantSystemTrigger;
  now: Date;
  targetSession: AIChatSession;
  conversationHistory: AIConversationTurn[];
  showSystemNotification: boolean;
}) => Parameters<typeof assistantOrchestratorService.runSystemTurn>[0];

type RunBackgroundAssistantLetter = (
  trigger: AssistantSystemTrigger,
  targetSession: AIChatSession,
  conversationHistory: AIConversationTurn[],
  options: {
    now: Date;
    pendingMessageId: string;
    retryInput: string;
    retrySourceUserMessageId: string;
  }
) => Promise<unknown>;

type ReplacePendingWithResult = (
  sessionId: string,
  pendingMessageId: string,
  content: string,
  options?: {
    tone?: AIChatMessage['tone'];
    debugSections?: AIChatDebugSection[];
    retryInput?: string;
    retrySourceUserMessageId?: string;
    assistantLetterResult?: AssistantLetterResultCard;
  }
) => void;

export interface AIBackfillChatDebugCommandOptions {
  activeRequestRef: { current: { pendingMessageId?: string } | null };
  activeSession: AIChatSession | null;
  buildBackgroundTurnRequest: BuildBackgroundTurnRequest;
  buildRetryConversationHistory: (sessionId: string, sourceMessageId?: string) => AIConversationTurn[];
  conversationHistoryCache: Map<string, AIConversationTurn[]>;
  debugMode: boolean;
  getErrorDebugSections: (error: unknown, label: string, debugMode: boolean) => AIChatDebugSection[] | undefined;
  getRetryableAIErrorMessage: (error: unknown) => string;
  isLoading: boolean;
  mutateSession: (sessionId: string, updater: (session: AIChatSession) => AIChatSession) => void;
  refreshAssistantMemorySnapshot: () => void;
  reloadPersistedChatSessions: () => void;
  replacePendingWithResult: ReplacePendingWithResult;
  runBackgroundAssistantLetter: RunBackgroundAssistantLetter;
  setDebugMode: (value: boolean) => void;
  setInputText: (value: string) => void;
  setIsLoading: (value: boolean) => void;
}

export const useAIBackfillChatDebugCommands = ({
  activeRequestRef,
  activeSession,
  buildBackgroundTurnRequest,
  buildRetryConversationHistory,
  conversationHistoryCache,
  debugMode,
  getErrorDebugSections,
  getRetryableAIErrorMessage,
  isLoading,
  mutateSession,
  refreshAssistantMemorySnapshot,
  reloadPersistedChatSessions,
  replacePendingWithResult,
  runBackgroundAssistantLetter,
  setDebugMode,
  setInputText,
  setIsLoading
}: AIBackfillChatDebugCommandOptions) => {
  const finishDebugRequest = (pendingMessageId: string) => {
    if (activeRequestRef.current?.pendingMessageId === pendingMessageId) {
      activeRequestRef.current = null;
    }
    setIsLoading(false);
  };

  const runManualAssistantCheckinDebug = (options?: DebugCommandOptions) => {
    if (!activeSession || isLoading) {
      return;
    }

    const sessionId = activeSession.id;
    const now = Date.now();
    const retryMessageId = options?.replaceMessageId;
    const canRetryInPlace = Boolean(
      retryMessageId && activeSession.messages.some((message) => message.id === retryMessageId)
    );
    const userMessageId = options?.retrySourceUserMessageId || crypto.randomUUID();
    const pendingMessageId = canRetryInPlace && retryMessageId ? retryMessageId : crypto.randomUUID();
    const historyBeforeCurrent = canRetryInPlace
      ? buildRetryConversationHistory(sessionId, options?.retrySourceUserMessageId)
      : (conversationHistoryCache.get(sessionId) || []);

    mutateSession(sessionId, (session) => ({
      ...session,
      messages: canRetryInPlace
        ? session.messages.map((message) => message.id === pendingMessageId
          ? { ...message, content: '我先模拟一轮后台 check-in…', createdAt: now, tone: 'pending' }
          : message)
        : [
          ...session.messages,
          { id: userMessageId, role: 'user', content: '/agent checkin', createdAt: now },
          { id: pendingMessageId, role: 'assistant', content: '我先模拟一轮后台 check-in…', createdAt: now + 1, tone: 'pending' }
        ]
    }));

    if (!canRetryInPlace) {
      setInputText('');
    }
    setIsLoading(true);

    void assistantOrchestratorService.runSystemTurn(buildBackgroundTurnRequest({
      trigger: {
        id: crypto.randomUUID(),
        type: 'manual_background_nudge',
        source: 'system',
        createdAt: formatAssistantLocalDateTime(new Date(now)),
        text: 'Manual debug trigger for assistant background check-in'
      },
      now: new Date(now),
      targetSession: activeSession,
      conversationHistory: historyBeforeCurrent,
      showSystemNotification: false
    })).then((result) => {
      refreshAssistantMemorySnapshot();
      reloadPersistedChatSessions();
      const content = [
        '后台 check-in 调试完成',
        `Action: ${result.decision.action}`,
        `Memory: ${result.decision.memoryAction}`,
        ...(result.decision.decisionSummary ? [`Decision: ${result.decision.decisionSummary}`] : []),
        ...(result.decision.silentReason ? [`Silent Reason: ${result.decision.silentReason}`] : []),
        ...(result.decision.silentSideEffects?.length ? [`Side Effects: ${result.decision.silentSideEffects.join('；')}`] : []),
        ...(result.appliedReminders?.length ? [`Reminders: ${result.appliedReminders.length}`] : []),
        ...(result.surfacedMessage ? [`Message: ${result.surfacedMessage}`] : [])
      ].join('\n');

      replacePendingWithResult(sessionId, pendingMessageId, content, {
        tone: result.decision.action === 'silent' ? 'system' : 'normal',
        debugSections: debugMode ? [{ label: '后台 Check-in 调试', exchange: result.debug as AIDebugExchange }] : undefined
      });
    }).catch((error) => {
      console.error('[AIBackfillChatModal] Manual assistant check-in debug failed', error);
      replacePendingWithResult(sessionId, pendingMessageId, getRetryableAIErrorMessage(error), {
        tone: 'error',
        retryInput: '/agent checkin',
        retrySourceUserMessageId: userMessageId,
        debugSections: getErrorDebugSections(error, '后台 Check-in 调试', debugMode)
      });
    }).finally(() => finishDebugRequest(pendingMessageId));
  };

  const runManualAssistantReminderDebug = (options?: DebugCommandOptions) => {
    if (!activeSession || isLoading) {
      return;
    }

    const sessionId = activeSession.id;
    const now = Date.now();
    const scheduledDueAt = formatAssistantLocalDateTime(new Date(now - (30 * 60 * 1000)));
    const actualDispatchAt = formatAssistantLocalDateTime(new Date(now));
    const retryMessageId = options?.replaceMessageId;
    const canRetryInPlace = Boolean(
      retryMessageId && activeSession.messages.some((message) => message.id === retryMessageId)
    );
    const pendingMessageId = canRetryInPlace && retryMessageId ? retryMessageId : crypto.randomUUID();
    const userMessageId = options?.retrySourceUserMessageId || crypto.randomUUID();
    const historyBeforeCurrent = canRetryInPlace
      ? buildRetryConversationHistory(sessionId, options?.retrySourceUserMessageId)
      : (conversationHistoryCache.get(sessionId) || []);

    mutateSession(sessionId, (session) => ({
      ...session,
      messages: canRetryInPlace
        ? session.messages.map((message) => message.id === pendingMessageId
          ? { ...message, content: '我先模拟一轮延迟 reminder 补发…', createdAt: now, tone: 'pending' }
          : message)
        : [
          ...session.messages,
          { id: userMessageId, role: 'user', content: '/agent reminder due', createdAt: now },
          { id: pendingMessageId, role: 'assistant', content: '我先模拟一轮延迟 reminder 补发…', createdAt: now + 1, tone: 'pending' }
        ]
    }));

    if (!canRetryInPlace) {
      setInputText('');
    }
    setIsLoading(true);

    void assistantOrchestratorService.runSystemTurn(buildBackgroundTurnRequest({
      trigger: {
        id: crypto.randomUUID(),
        type: 'reminder_due',
        source: 'system',
        createdAt: actualDispatchAt,
        text: '请确认用户是否还在做刚才那件事，如果已经做完就不要机械重复提醒。',
        metadata: {
          scheduledDueAt,
          actualDispatchAt,
          delayMinutes: 30,
          reminderId: crypto.randomUUID(),
          reminderType: 'self_followup'
        }
      },
      now: new Date(now),
      targetSession: activeSession,
      conversationHistory: historyBeforeCurrent,
      showSystemNotification: false
    })).then((result) => {
      refreshAssistantMemorySnapshot();
      reloadPersistedChatSessions();
      const content = [
        '延迟 reminder 调试完成',
        `Action: ${result.decision.action}`,
        `Memory: ${result.decision.memoryAction}`,
        ...(result.decision.decisionSummary ? [`Decision: ${result.decision.decisionSummary}`] : []),
        ...(result.decision.silentReason ? [`Silent Reason: ${result.decision.silentReason}`] : []),
        ...(result.decision.silentSideEffects?.length ? [`Side Effects: ${result.decision.silentSideEffects.join('；')}`] : []),
        ...(result.appliedReminders?.length ? [`Reminders: ${result.appliedReminders.length}`] : []),
        ...(result.surfacedMessage ? [`Message: ${result.surfacedMessage}`] : [])
      ].join('\n');
      replacePendingWithResult(sessionId, pendingMessageId, content, {
        tone: result.decision.action === 'silent' ? 'system' : 'normal',
        debugSections: debugMode ? [{ label: '延迟 Reminder 调试', exchange: result.debug as AIDebugExchange }] : undefined
      });
    }).catch((error) => {
      console.error('[AIBackfillChatModal] Manual assistant reminder debug failed', error);
      replacePendingWithResult(sessionId, pendingMessageId, getRetryableAIErrorMessage(error), {
        tone: 'error',
        retryInput: '/agent reminder due',
        retrySourceUserMessageId: userMessageId,
        debugSections: getErrorDebugSections(error, '延迟 Reminder 调试', debugMode)
      });
    }).finally(() => finishDebugRequest(pendingMessageId));
  };

  const runManualAssistantLetterDebug = (options?: DebugCommandOptions) => {
    if (!activeSession || isLoading) {
      return;
    }

    const sessionId = activeSession.id;
    const now = Date.now();
    const retryMessageId = options?.replaceMessageId;
    const canRetryInPlace = Boolean(
      retryMessageId && activeSession.messages.some((message) => message.id === retryMessageId)
    );
    const pendingMessageId = canRetryInPlace && retryMessageId ? retryMessageId : crypto.randomUUID();
    const userMessageId = options?.retrySourceUserMessageId || crypto.randomUUID();
    const historyBeforeCurrent = canRetryInPlace
      ? buildRetryConversationHistory(sessionId, options?.retrySourceUserMessageId)
      : (conversationHistoryCache.get(sessionId) || []);

    mutateSession(sessionId, (session) => ({
      ...session,
      messages: canRetryInPlace
        ? session.messages.map((message) => message.id === pendingMessageId
          ? { ...message, content: 'AI 正在撰写来信…', createdAt: now, tone: 'pending' }
          : message)
        : [
          ...session.messages,
          { id: userMessageId, role: 'user', content: '/letter', createdAt: now },
          { id: pendingMessageId, role: 'assistant', content: 'AI 正在撰写来信…', createdAt: now + 1, tone: 'pending' }
        ]
    }));

    if (!canRetryInPlace) {
      setInputText('');
    }
    setIsLoading(true);

    const trigger: AssistantSystemTrigger = {
      id: crypto.randomUUID(),
      type: 'assistant_letter_due',
      source: 'system',
      createdAt: formatAssistantLocalDateTime(new Date(now)),
      text: 'Manual debug trigger for assistant letter',
      metadata: { scheduledFor: formatAssistantLocalDateTime(new Date(now)) }
    };

    void runBackgroundAssistantLetter(trigger, activeSession, historyBeforeCurrent, {
      now: new Date(now),
      pendingMessageId,
      retryInput: '/letter',
      retrySourceUserMessageId: userMessageId
    }).then((result) => {
      if (!result) {
        replacePendingWithResult(sessionId, pendingMessageId, '已经有一封来信在生成中。', { tone: 'system' });
      }
    }).catch((error) => {
      console.error('[AIBackfillChatModal] Manual assistant letter debug failed', error);
    }).finally(() => finishDebugRequest(pendingMessageId));
  };

  const handleDebugCommand = (trimmedText: string, options?: DebugCommandOptions): boolean => {
    const normalized = trimmedText.toLowerCase();
    if (normalized === '/letter' && activeSession) {
      runManualAssistantLetterDebug(options);
      return true;
    }
    if (normalized === '/agent checkin' && activeSession) {
      runManualAssistantCheckinDebug(options);
      return true;
    }
    if (normalized === '/agent reminder due' && activeSession) {
      runManualAssistantReminderDebug(options);
      return true;
    }
    if (!['/debug', '/debug on', '/debug off'].includes(normalized) || !activeSession) {
      return false;
    }

    const nextDebugMode = normalized === '/debug' ? !debugMode : normalized === '/debug on';
    const now = Date.now();
    mutateSession(activeSession.id, (session) => ({
      ...session,
      messages: [
        ...session.messages,
        { id: crypto.randomUUID(), role: 'user', content: trimmedText, createdAt: now },
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: nextDebugMode ? '已开启调试模式。' : '已关闭调试模式。',
          createdAt: now + 1,
          tone: 'system'
        }
      ]
    }));
    setDebugMode(nextDebugMode);
    setInputText('');
    return true;
  };

  return {
    handleDebugCommand,
    runManualAssistantCheckinDebug,
    runManualAssistantLetterDebug,
    runManualAssistantReminderDebug
  };
};
