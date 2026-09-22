/**
 * @file useAIBackfillChatConversationHistory.ts
 * @input Chat sessions, personas, and conversation-history helpers
 * @output Persona resolution, cached histories, retry histories, and time-sensitive history helpers
 * @pos Component Support (AI Integration)
 * @description Keeps shared conversation context derivation out of the main AI chat coordinator.
 */
import { useCallback, useMemo } from 'react';
import { assistantOrchestratorService } from '../../services/assistantOrchestratorService';
import { formatAssistantLocalDateTime } from '../../utils/assistantTime';
import type { AIConversationTurn } from '../../services/aiService';
import type { AIChatMessage, AIChatPersona, AIChatSession } from './AIBackfillChatShared';
import { DEFAULT_AI_PERSONAS } from './AIBackfillChatInitialization';
import { TIME_SENSITIVE_MESSAGE_PATTERN } from './AIBackfillChatHelpers';
import {
  buildConversationHistoryFromSessionMessages,
  buildRetryConversationHistory as buildRetryConversationHistoryFromSessions,
  narrowConversationHistoryForTimeSensitiveTurn
} from './AIBackfillChatSessionHelpers';

interface ConversationHistoryOptions {
  sessions: AIChatSession[];
  personas: AIChatPersona[];
  personaMap: Map<string, AIChatPersona>;
}

export const useAIBackfillChatConversationHistory = ({
  sessions,
  personas,
  personaMap
}: ConversationHistoryOptions) => {
  const resolveSessionPersona = useCallback((session: AIChatSession) => (
    personaMap.get(session.personaId) || personas[0] || DEFAULT_AI_PERSONAS[0]
  ), [personaMap, personas]);

  const buildConversationHistoryFromMessages = useCallback((
    session: AIChatSession,
    messages: AIChatMessage[]
  ): AIConversationTurn[] => {
    const sessionPersona = resolveSessionPersona(session);
    return buildConversationHistoryFromSessionMessages(messages, {
      contextCacheEnabled: session.contextCacheEnabled,
      contextMessageLimit: sessionPersona.contextMessageLimit,
      formatCreatedAt: formatAssistantLocalDateTime
    });
  }, [resolveSessionPersona]);

  const buildConversationHistory = useCallback((session: AIChatSession): AIConversationTurn[] => (
    buildConversationHistoryFromMessages(session, session.messages)
  ), [buildConversationHistoryFromMessages]);

  const getBackgroundPersonaDisplayName = useCallback((targetSession?: AIChatSession): string => {
    if (!targetSession) {
      return 'AI';
    }

    return personaMap.get(targetSession.personaId)?.name
      || assistantOrchestratorService.getBackgroundPersonaDisplayName(targetSession.id)
      || 'AI';
  }, [personaMap]);

  const narrowHistoryForTimeSensitiveTurn = useCallback((
    history: AIConversationTurn[],
    sourceText: string
  ): AIConversationTurn[] => narrowConversationHistoryForTimeSensitiveTurn(
    history,
    sourceText,
    TIME_SENSITIVE_MESSAGE_PATTERN
  ), []);

  const conversationHistoryCache = useMemo(
    () => new Map(
      sessions.map((session) => [session.id, buildConversationHistory(session)])
    ),
    [buildConversationHistory, sessions]
  );

  const buildRetryConversationHistory = useCallback((
    sessionId: string,
    retrySourceUserMessageId?: string
  ): AIConversationTurn[] => buildRetryConversationHistoryFromSessions({
    buildConversationHistoryFromMessages,
    conversationHistoryCache,
    retrySourceUserMessageId,
    sessionId,
    sessions
  }), [buildConversationHistoryFromMessages, conversationHistoryCache, sessions]);

  return {
    resolveSessionPersona,
    buildConversationHistoryFromMessages,
    buildConversationHistory,
    getBackgroundPersonaDisplayName,
    narrowHistoryForTimeSensitiveTurn,
    buildRetryConversationHistory,
    conversationHistoryCache
  };
};
