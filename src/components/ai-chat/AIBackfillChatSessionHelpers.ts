/**
 * @file AIBackfillChatSessionHelpers.ts
 * @input Chat session payloads, storage snapshots, template metadata, and session-level message mutations
 * @output Reusable pure helpers for chat session initialization, normalization, template metadata resolution, and immutable session updates
 * @pos Component Support (AI Integration)
 * @description Centralizes the stable session and template helper logic used by AIBackfillChatModal so the main modal can focus on React state orchestration instead of carrying pure data transforms inline.
 * @updated 2026-05-15: Extracted session initialization, immutable session update helpers, and review-template metadata resolvers from AIBackfillChatModal.
 */
import type { AIConversationTurn } from '../../services/aiService';
import type { AppliedActionStatus } from '../../services/assistantActionExecutor';
import { monthlyReviewTemplateService, type MonthlyReviewTemplateSessionMeta } from '../../services/monthlyReviewTemplateService';
import { weeklyReviewTemplateService, type WeeklyReviewTemplateSessionMeta } from '../../services/weeklyReviewTemplateService';
import type {
  AIChatCustomPromptBlock,
  AIChatDebugSection,
  AIChatMessage,
  AIChatPersona,
  AIChatSession,
  AIChatUserProfile,
  ChatTone,
  InitialChatState
} from './AIBackfillChatShared';

interface ChatStorageKeys {
  activeSessionKey: string;
  chatPersonasKey: string;
  chatSessionsKey: string;
  customPromptBlocksKey: string;
  debugModeKey: string;
  userProfileKey: string;
}

interface LoadInitialChatStateOptions {
  keys: ChatStorageKeys;
  normalizePersonas: (value: unknown) => AIChatPersona[];
  normalizeSessions: (value: unknown, personas: AIChatPersona[]) => AIChatSession[];
  normalizeUserProfile: (value: unknown) => AIChatUserProfile;
  normalizeCustomPromptBlocks: (value: unknown, rawPersonasValue: unknown) => AIChatCustomPromptBlock[];
  storage?: Pick<Storage, 'getItem'>;
}

export const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const createDefaultChatSession = (
  personaId: string,
  options?: {
    title?: string;
    messages?: AIChatMessage[];
    templateMeta?: AIChatSession['templateMeta'];
  }
): AIChatSession => {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: options?.title || '新对话',
    createdAt: now,
    updatedAt: now,
    personaId,
    contextCacheEnabled: true,
    messages: options?.messages || [],
    ...(options?.templateMeta ? { templateMeta: options.templateMeta } : {})
  };
};

export const normalizeChatSessions = (
  value: unknown,
  personas: AIChatPersona[],
  normalizeMessages: (value: unknown) => AIChatMessage[],
  normalizeTemplateMeta: (value: unknown) => AIChatSession['templateMeta'] | undefined,
  fallbackPersonaId = personas[0]?.id || ''
): AIChatSession[] => {
  if (!Array.isArray(value)) {
    return [createDefaultChatSession(fallbackPersonaId)];
  }

  const validPersonaIds = new Set(personas.map((persona) => persona.id));
  const sessions = value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as Partial<AIChatSession>;
    if (typeof candidate.id !== 'string') {
      return [];
    }

    const createdAt = typeof candidate.createdAt === 'number' ? candidate.createdAt : Date.now();
    const updatedAt = typeof candidate.updatedAt === 'number' ? candidate.updatedAt : createdAt;
    const templateMeta = normalizeTemplateMeta(candidate.templateMeta);

    return [{
      id: candidate.id,
      title: typeof candidate.title === 'string' && candidate.title.trim() ? candidate.title.trim() : '新对话',
      createdAt,
      updatedAt,
      personaId: typeof candidate.personaId === 'string' && validPersonaIds.has(candidate.personaId)
        ? candidate.personaId
        : fallbackPersonaId,
      contextCacheEnabled: candidate.contextCacheEnabled !== false,
      messages: normalizeMessages(candidate.messages),
      ...(templateMeta ? { templateMeta } : {})
    }];
  });

  return sessions.length > 0 ? sessions : [createDefaultChatSession(fallbackPersonaId)];
};

export const resolveInitialActiveSessionId = (
  sessions: AIChatSession[],
  storedActiveSessionId: string | null
): string => {
  if (sessions.some((session) => session.id === storedActiveSessionId)) {
    return storedActiveSessionId as string;
  }

  return [...sessions].sort((left, right) => right.updatedAt - left.updatedAt)[0].id;
};

export const loadInitialChatStateFromStorage = ({
  keys,
  normalizePersonas,
  normalizeSessions,
  normalizeUserProfile,
  normalizeCustomPromptBlocks,
  storage = localStorage
}: LoadInitialChatStateOptions): InitialChatState => {
  const rawPersonas = safeJsonParse<unknown>(storage.getItem(keys.chatPersonasKey), []);
  const personas = normalizePersonas(rawPersonas);
  const sessions = normalizeSessions(safeJsonParse<unknown>(storage.getItem(keys.chatSessionsKey), []), personas);
  const customPromptBlocks = normalizeCustomPromptBlocks(
    safeJsonParse<unknown>(storage.getItem(keys.customPromptBlocksKey), []),
    rawPersonas
  );
  const userProfile = normalizeUserProfile(safeJsonParse<unknown>(storage.getItem(keys.userProfileKey), null));
  const activeSessionId = resolveInitialActiveSessionId(
    sessions,
    storage.getItem(keys.activeSessionKey)
  );

  return {
    personas,
    sessions,
    activeSessionId,
    debugMode: storage.getItem(keys.debugModeKey) === 'true',
    userProfile,
    customPromptBlocks
  };
};

export const mutateChatSessions = (
  sessions: AIChatSession[],
  sessionId: string,
  updater: (session: AIChatSession) => AIChatSession,
  updatedAt = Date.now()
): AIChatSession[] => (
  sessions.map((session) => (
    session.id === sessionId
      ? {
        ...updater(session),
        updatedAt
      }
      : session
  ))
);

export const replaceSessionMessage = (
  sessions: AIChatSession[],
  sessionId: string,
  messageId: string,
  nextMessage: AIChatMessage
): AIChatSession[] => (
  mutateChatSessions(sessions, sessionId, (session) => ({
    ...session,
    messages: session.messages.map((message) => (
      message.id === messageId ? nextMessage : message
    ))
  }))
);

export const updateSessionAppliedActionStatus = (
  sessions: AIChatSession[],
  sessionId: string,
  messageId: string,
  actionId: string,
  nextStatus: AppliedActionStatus
): AIChatSession[] => (
  mutateChatSessions(sessions, sessionId, (session) => ({
    ...session,
    messages: session.messages.map((message) => {
      if (message.id !== messageId || !message.appliedActions) {
        return message;
      }

      return {
        ...message,
        appliedActions: message.appliedActions.map((action) => (
          action.actionId === actionId
            ? { ...action, status: nextStatus }
            : action
        ))
      };
    })
  }))
);

export const appendSystemMessageToChatSession = (
  sessions: AIChatSession[],
  sessionId: string,
  content: string,
  options?: {
    debugSections?: AIChatDebugSection[];
    tone?: ChatTone;
  }
): AIChatSession[] => {
  const trimmed = content.trim();
  if (!trimmed) {
    return sessions;
  }

  return mutateChatSessions(sessions, sessionId, (session) => ({
    ...session,
    messages: [
      ...session.messages,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: trimmed,
        createdAt: Date.now(),
        tone: options?.tone || 'system',
        ...(options?.debugSections?.length ? { debugSections: options.debugSections } : {})
      }
    ]
  }));
};

export const appendUserMessageToChatSession = (
  sessions: AIChatSession[],
  sessionId: string,
  content: string
): AIChatSession[] => {
  const trimmed = content.trim();
  if (!trimmed) {
    return sessions;
  }

  return mutateChatSessions(sessions, sessionId, (session) => ({
    ...session,
    messages: [
      ...session.messages,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
        createdAt: Date.now()
      }
    ]
  }));
};

export const updateWeeklyReviewTemplateStageInSessions = (
  sessions: AIChatSession[],
  sessionId: string,
  stage: WeeklyReviewTemplateSessionMeta['stage'],
  pendingWriteIntent = false
): AIChatSession[] => (
  mutateChatSessions(sessions, sessionId, (session) => ({
    ...session,
    ...(session.templateMeta
      ? {
        templateMeta: {
          ...session.templateMeta,
          stage,
          pendingWriteIntent
        }
      }
      : {})
  }))
);

export const sortChatSessionsByUpdatedAt = (sessions: AIChatSession[]): AIChatSession[] => (
  [...sessions].sort((left, right) => right.updatedAt - left.updatedAt)
);

export const buildConversationHistoryFromSessionMessages = (
  messages: AIChatMessage[],
  options: {
    contextCacheEnabled: boolean;
    contextMessageLimit: number;
    formatCreatedAt: (date: Date) => string;
  }
): AIConversationTurn[] => {
  if (!options.contextCacheEnabled || options.contextMessageLimit <= 0) {
    return [];
  }

  const turns = messages
    .filter((message) => message.tone !== 'system' && message.tone !== 'pending')
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
      createdAt: options.formatCreatedAt(new Date(message.createdAt))
    }))
    .filter((turn): turn is AIConversationTurn => Boolean(turn.content));

  if (turns.length <= 1) {
    return [];
  }

  const rounds: AIConversationTurn[][] = [];
  let currentRound: AIConversationTurn[] = [];

  turns.forEach((turn) => {
    if (turn.role === 'user') {
      if (currentRound.length > 1) {
        rounds.push(currentRound);
      }
      currentRound = [turn];
      return;
    }

    if (currentRound.length === 0) {
      return;
    }

    currentRound = [...currentRound, turn];
    rounds.push(currentRound);
    currentRound = [];
  });

  if (rounds.length === 0) {
    return [];
  }

  return rounds.slice(-options.contextMessageLimit).flat();
};

export const narrowConversationHistoryForTimeSensitiveTurn = (
  history: AIConversationTurn[],
  sourceText: string,
  timeSensitiveMessagePattern: RegExp
): AIConversationTurn[] => {
  if (!timeSensitiveMessagePattern.test(sourceText)) {
    return history;
  }

  const recentUserTurns = history
    .filter((turn) => turn.role === 'user')
    .slice(-4);
  if (recentUserTurns.length === 0) {
    return history.slice(-6);
  }

  const earliestKeptCreatedAt = recentUserTurns[0]?.createdAt
    ? Date.parse(recentUserTurns[0].createdAt)
    : Number.NaN;
  if (!Number.isFinite(earliestKeptCreatedAt)) {
    return history.slice(-6);
  }

  return history.filter((turn) => {
    const turnCreatedAt = typeof turn.createdAt === 'string' ? Date.parse(turn.createdAt) : Number.NaN;
    return Number.isFinite(turnCreatedAt) && turnCreatedAt >= earliestKeptCreatedAt;
  });
};

export const buildRetryConversationHistory = (options: {
  buildConversationHistoryFromMessages: (session: AIChatSession, messages: AIChatMessage[]) => AIConversationTurn[];
  conversationHistoryCache: Map<string, AIConversationTurn[]>;
  retrySourceUserMessageId?: string;
  sessionId: string;
  sessions: AIChatSession[];
}): AIConversationTurn[] => {
  if (!options.retrySourceUserMessageId) {
    return options.conversationHistoryCache.get(options.sessionId) || [];
  }

  const session = options.sessions.find((candidate) => candidate.id === options.sessionId);
  if (!session) {
    return options.conversationHistoryCache.get(options.sessionId) || [];
  }

  const retryUserMessageIndex = session.messages.findIndex((message) => (
    message.id === options.retrySourceUserMessageId && message.role === 'user'
  ));
  if (retryUserMessageIndex < 0) {
    return options.conversationHistoryCache.get(options.sessionId) || [];
  }

  return options.buildConversationHistoryFromMessages(
    session,
    session.messages.slice(0, retryUserMessageIndex)
  );
};

export const resolveWeeklyReviewTemplateSessionMeta = (
  session: AIChatSession
): Required<Pick<WeeklyReviewTemplateSessionMeta, 'weekStartDate' | 'weekEndDate' | 'selectedRangeLabel' | 'methodId' | 'methodLabel'>> | null => {
  const meta = session.templateMeta;
  if (
    meta?.templateType !== 'weekly_review'
    || typeof meta.weekStartDate !== 'string'
    || !meta.weekStartDate.trim()
    || typeof meta.weekEndDate !== 'string'
    || !meta.weekEndDate.trim()
    || (meta.selectedRangeLabel !== '本周' && meta.selectedRangeLabel !== '上周' && meta.selectedRangeLabel !== 'custom_date')
    || (meta.methodId !== 'pdca' && meta.methodId !== 'systems' && meta.methodId !== 'cbt' && meta.methodId !== 'narrative')
  ) {
    return null;
  }

  return {
    weekStartDate: meta.weekStartDate.trim(),
    weekEndDate: meta.weekEndDate.trim(),
    selectedRangeLabel: meta.selectedRangeLabel,
    methodId: meta.methodId,
    methodLabel: typeof meta.methodLabel === 'string' && meta.methodLabel.trim()
      ? meta.methodLabel.trim()
      : weeklyReviewTemplateService.listMethodOptions().find((item) => item.id === meta.methodId)?.title || '系统复盘'
  };
};

export const resolveMonthlyReviewTemplateSessionMeta = (
  session: AIChatSession
): Required<Pick<MonthlyReviewTemplateSessionMeta, 'monthStartDate' | 'monthEndDate' | 'selectedRangeLabel' | 'methodId' | 'methodLabel'>> | null => {
  const meta = session.templateMeta;
  if (
    meta?.templateType !== 'monthly_review'
    || typeof meta.monthStartDate !== 'string'
    || !meta.monthStartDate.trim()
    || typeof meta.monthEndDate !== 'string'
    || !meta.monthEndDate.trim()
    || (meta.selectedRangeLabel !== '本月' && meta.selectedRangeLabel !== '上月' && meta.selectedRangeLabel !== 'custom_date')
    || (meta.methodId !== 'pdca' && meta.methodId !== 'systems' && meta.methodId !== 'cbt' && meta.methodId !== 'narrative')
  ) {
    return null;
  }

  return {
    monthStartDate: meta.monthStartDate.trim(),
    monthEndDate: meta.monthEndDate.trim(),
    selectedRangeLabel: meta.selectedRangeLabel,
    methodId: meta.methodId,
    methodLabel: typeof meta.methodLabel === 'string' && meta.methodLabel.trim()
      ? meta.methodLabel.trim()
      : monthlyReviewTemplateService.listMethodOptions().find((item) => item.id === meta.methodId)?.title || '系统复盘'
  };
};

export const resolveWeeklyReviewTemplateRangeMeta = (
  session: AIChatSession
): Required<Pick<WeeklyReviewTemplateSessionMeta, 'weekStartDate' | 'weekEndDate' | 'selectedRangeLabel'>> | null => {
  const meta = session.templateMeta;
  if (
    meta?.templateType !== 'weekly_review'
    || typeof meta.weekStartDate !== 'string'
    || !meta.weekStartDate.trim()
    || typeof meta.weekEndDate !== 'string'
    || !meta.weekEndDate.trim()
    || (meta.selectedRangeLabel !== '本周' && meta.selectedRangeLabel !== '上周' && meta.selectedRangeLabel !== 'custom_date')
  ) {
    return null;
  }

  return {
    weekStartDate: meta.weekStartDate.trim(),
    weekEndDate: meta.weekEndDate.trim(),
    selectedRangeLabel: meta.selectedRangeLabel
  };
};

export const resolveMonthlyReviewTemplateRangeMeta = (
  session: AIChatSession
): Required<Pick<MonthlyReviewTemplateSessionMeta, 'monthStartDate' | 'monthEndDate' | 'selectedRangeLabel'>> | null => {
  const meta = session.templateMeta;
  if (
    meta?.templateType !== 'monthly_review'
    || typeof meta.monthStartDate !== 'string'
    || !meta.monthStartDate.trim()
    || typeof meta.monthEndDate !== 'string'
    || !meta.monthEndDate.trim()
    || (meta.selectedRangeLabel !== '本月' && meta.selectedRangeLabel !== '上月' && meta.selectedRangeLabel !== 'custom_date')
  ) {
    return null;
  }

  return {
    monthStartDate: meta.monthStartDate.trim(),
    monthEndDate: meta.monthEndDate.trim(),
    selectedRangeLabel: meta.selectedRangeLabel
  };
};
