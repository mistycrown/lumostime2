/**
 * @file AIBackfillChatDreamFlow.ts
 * @input Dream month selections, conversation history, and modal orchestration callbacks
 * @output Shared Dream month parsing helpers plus the main Dream execution flow
 * @pos Component Support (AI Integration)
 * @description Extracts the Dream month parsing and workflow execution path from AIBackfillChatModal so the modal keeps only the UI entrypoints and state coordination.
 * @updated 2026-05-15: Moved Dream month parsing and the main Dream command runner out of AIBackfillChatModal.
 */
import { dreamService } from '../../services/dreamService';
import type { AIConversationTurn } from '../../services/aiService';
import type {
  AIChatDebugSection,
  AIChatDreamUpdateCard,
  AIChatMemoryUpdateSection,
  AIChatMonthlyReviewWritebackResult,
  AIChatSession,
  AIChatWeeklyReviewWritebackResult,
  ChatTone,
  DreamMonthRangeSelection
} from './AIBackfillChatShared';
import type { AppliedChatAction } from '../../services/assistantActionExecutor';
import type { AssistantReasoningSummary } from '../../types/assistant';

interface ActiveRequestState {
  controller: AbortController;
  pendingMessageId: string;
  sessionId: string;
}

interface ReplacePendingResultOptions {
  appliedActions?: AppliedChatAction[];
  dailyReviewWriteback?: {
    createdReview: boolean;
    dailyReviewId: string;
    date: string;
    mergeMode: 'create' | 'overwrite';
    preview: string;
    title: string;
  };
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

interface DreamCommandOptions {
  activeRequestRef: { current: ActiveRequestState | null };
  buildConversationSummary: (history: AIConversationTurn[]) => string;
  buildDictionaryDigestText: (selectedMonth: DreamMonthRangeSelection) => string;
  buildStateContextText: (selectedMonth: DreamMonthRangeSelection, currentTurnDate: Date) => string;
  formatCurrentDateTime: (value: Date) => string;
  getErrorDebugSections: (error: unknown, label: string, enabled: boolean) => AIChatDebugSection[];
  getRetryableAIErrorMessage: (error: unknown) => string;
  historyBeforeCurrent: AIConversationTurn[];
  isAbortError: (error: unknown) => boolean;
  mutateSession: (sessionId: string, updater: (session: AIChatSession) => AIChatSession) => AIChatSession | void;
  options?: {
    replaceMessageId?: string;
    retrySourceUserMessageId?: string;
    userMessageAlreadyExists?: boolean;
  };
  refreshDreamSnapshot: () => void;
  replacePendingWithResult: (
    sessionId: string,
    pendingMessageId: string,
    content: string,
    options?: ReplacePendingResultOptions
  ) => void;
  session: AIChatSession;
  setInputText: (value: string) => void;
  setIsHistoryPanelOpen: (value: boolean) => void;
  setIsLoading: (value: boolean) => void;
  setIsPersonaPanelOpen: (value: boolean) => void;
  setSelectedDreamTopicId: (topicId: string) => void;
  selectedMonth: DreamMonthRangeSelection;
  userMessageId?: string;
  debugMode: boolean;
}

const buildDreamMonthRangeSelection = (year: number, month: number, getLocalDateStr: (date: Date) => string): DreamMonthRangeSelection => {
  const start = new Date(year, month - 1, 1, 12, 0, 0, 0);
  const end = new Date(year, month, 0, 12, 0, 0, 0);

  return {
    yearMonth: `${year}${String(month).padStart(2, '0')}`,
    year,
    month,
    label: `${year}年${month}月`,
    startDate: getLocalDateStr(start),
    endDate: getLocalDateStr(end)
  };
};

export const parseDreamMonthSelection = (
  value: string,
  getLocalDateStr: (date: Date) => string
): DreamMonthRangeSelection | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalizedInput = trimmed
    .replace(/^dream(?:\s*[·•:：-]\s*|\s+)/i, '')
    .replace(/[。．，,！!？?；;：:]+$/g, '')
    .trim();
  const directMatch = normalizedInput.match(/^(\d{4})(\d{2})$/);
  const separatorMatch = normalizedInput.match(/^(\d{4})\s*[-/]\s*(\d{1,2})$/);
  const chineseMatch = normalizedInput.match(/^(\d{4})\s*年\s*(\d{1,2})\s*月$/);
  const matchedGroups = directMatch || separatorMatch || chineseMatch;
  if (!matchedGroups) {
    return null;
  }

  const year = Number.parseInt(matchedGroups[1], 10);
  const month = Number.parseInt(matchedGroups[2], 10);
  if (!Number.isInteger(year) || year < 1000 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return buildDreamMonthRangeSelection(year, month, getLocalDateStr);
};

export const normalizeDreamRetryYearMonth = (
  value: unknown,
  getLocalDateStr: (date: Date) => string
): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  return parseDreamMonthSelection(value, getLocalDateStr)?.yearMonth;
};

export const runDreamCommand = async ({
  activeRequestRef,
  buildConversationSummary,
  buildDictionaryDigestText,
  buildStateContextText,
  debugMode,
  formatCurrentDateTime,
  getErrorDebugSections,
  getRetryableAIErrorMessage,
  historyBeforeCurrent,
  isAbortError,
  mutateSession,
  options,
  refreshDreamSnapshot,
  replacePendingWithResult,
  selectedMonth,
  session,
  setInputText,
  setIsHistoryPanelOpen,
  setIsLoading,
  setIsPersonaPanelOpen,
  setSelectedDreamTopicId,
  userMessageId
}: DreamCommandOptions): Promise<void> => {
  const sessionId = session.id;
  const retryMessageId = options?.replaceMessageId;
  const canRetryInPlace = Boolean(
    retryMessageId && session.messages.some((message) => message.id === retryMessageId)
  );
  const pendingMessageId = canRetryInPlace && retryMessageId
    ? retryMessageId
    : crypto.randomUUID();
  const now = Date.now();
  const nextUserMessageId = options?.retrySourceUserMessageId || userMessageId || crypto.randomUUID();

  if (canRetryInPlace) {
    mutateSession(sessionId, (currentSession) => ({
      ...currentSession,
      messages: currentSession.messages.map((message) => (
        message.id === pendingMessageId
          ? {
            id: pendingMessageId,
            role: 'assistant',
            content: `我先按${selectedMonth.label}整理一下 Dream。`,
            createdAt: now,
            tone: 'pending'
          }
          : message
      ))
    }));
  } else {
    mutateSession(sessionId, (currentSession) => ({
      ...currentSession,
      messages: [
        ...currentSession.messages,
        ...(
          options?.userMessageAlreadyExists
            ? []
            : [{
              id: nextUserMessageId,
              role: 'user' as const,
              content: `dream · ${selectedMonth.label}`,
              createdAt: now
            }]
        ),
        {
          id: pendingMessageId,
          role: 'assistant',
          content: `我先按${selectedMonth.label}整理一下 Dream。`,
          createdAt: now + 1,
          tone: 'pending'
        }
      ]
    }));
  }

  setInputText('');
  setIsLoading(true);
  setIsHistoryPanelOpen(false);
  setIsPersonaPanelOpen(false);

  const controller = new AbortController();
  activeRequestRef.current = {
    controller,
    sessionId,
    pendingMessageId
  };

  try {
    const currentTurnDate = new Date(now);
    const dreamResult = await dreamService.runDreamWorkflow({
      rangeLabel: selectedMonth.label,
      rangeStartDate: selectedMonth.startDate,
      rangeEndDate: selectedMonth.endDate,
      currentDateTime: formatCurrentDateTime(currentTurnDate),
      currentDate: selectedMonth.endDate,
      conversationSummary: buildConversationSummary(historyBeforeCurrent),
      stateContextText: buildStateContextText(selectedMonth, currentTurnDate),
      dictionaryDigestText: buildDictionaryDigestText(selectedMonth)
    });

    if (controller.signal.aborted || activeRequestRef.current?.pendingMessageId !== pendingMessageId) {
      return;
    }

    if (
      (dreamResult.patch.createdEntries && dreamResult.patch.createdEntries.length > 0)
      || (dreamResult.patch.updatedEntries && dreamResult.patch.updatedEntries.length > 0)
      || (dreamResult.patch.deletedEntryIds && dreamResult.patch.deletedEntryIds.length > 0)
    ) {
      dreamService.applyPatch(dreamResult.patch);
      refreshDreamSnapshot();
      const firstUpdatedTopicId = dreamResult.cards[0]?.topicId;
      if (firstUpdatedTopicId) {
        setSelectedDreamTopicId(firstUpdatedTopicId);
      }
    }

    replacePendingWithResult(sessionId, pendingMessageId, dreamResult.assistantReply, {
      ...(debugMode && dreamResult.debug
        ? {
          debugSections: [{
            label: 'Dream 整理',
            exchange: dreamResult.debug
          }]
        }
        : {}),
      dreamUpdates: dreamResult.cards
    });
  } catch (error) {
    const isCurrentPendingRequest = activeRequestRef.current?.pendingMessageId === pendingMessageId;

    if (isAbortError(error)) {
      if (isCurrentPendingRequest) {
        replacePendingWithResult(sessionId, pendingMessageId, '已停止这次 Dream 整理。', {
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
      retryInput: 'dream',
      retrySourceUserMessageId: nextUserMessageId,
      dreamRetryYearMonth: selectedMonth.yearMonth,
      debugSections: getErrorDebugSections(error, 'Dream 整理', debugMode)
    });
  } finally {
    if (activeRequestRef.current?.pendingMessageId === pendingMessageId) {
      activeRequestRef.current = null;
      setIsLoading(false);
    }
  }
};
