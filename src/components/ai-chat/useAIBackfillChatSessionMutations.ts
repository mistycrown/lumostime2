/**
 * @file useAIBackfillChatSessionMutations.ts
 * @input AI chat session state setter and session mutation helpers
 * @output Stable commands for updating sessions, messages, action status, and template stages
 * @pos Component Support Hook (AI Chat Sessions)
 * @description Centralizes the small setSessions adapters used by foreground turns, template flows, and applied-action rollback.
 * @updated 2026-09-22: Extracted session mutation adapters from AIBackfillChatModal.
 */

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { AIChatDebugSection, AIChatMessage, AIChatSession, ChatTone } from './AIBackfillChatShared';
import type { AppliedActionStatus } from '../../services/assistantActionExecutor';
import {
  appendSystemMessageToChatSession,
  appendUserMessageToChatSession,
  mutateChatSessions,
  replaceSessionMessage,
  updateSessionAppliedActionStatus,
  updateWeeklyReviewTemplateStageInSessions
} from './AIBackfillChatSessionHelpers';
import type { WeeklyReviewTemplateSessionMeta } from '../../services/weeklyReviewTemplateService';

export const useAIBackfillChatSessionMutations = (
  setSessions: Dispatch<SetStateAction<AIChatSession[]>>
) => {
  const mutateSession = useCallback((
    sessionId: string,
    updater: (session: AIChatSession) => AIChatSession
  ) => {
    setSessions((prev) => mutateChatSessions(prev, sessionId, updater));
  }, [setSessions]);

  const replaceMessage = useCallback((
    sessionId: string,
    messageId: string,
    nextMessage: AIChatMessage
  ) => {
    setSessions((prev) => replaceSessionMessage(prev, sessionId, messageId, nextMessage));
  }, [setSessions]);

  const updateAppliedActionStatus = useCallback((
    sessionId: string,
    messageId: string,
    actionId: string,
    nextStatus: AppliedActionStatus
  ) => {
    setSessions((prev) => updateSessionAppliedActionStatus(prev, sessionId, messageId, actionId, nextStatus));
  }, [setSessions]);

  const appendSystemMessage = useCallback((
    sessionId: string,
    content: string,
    options?: {
      debugSections?: AIChatDebugSection[];
      tone?: ChatTone;
    }
  ) => {
    setSessions((prev) => appendSystemMessageToChatSession(prev, sessionId, content, options));
  }, [setSessions]);

  const appendUserMessage = useCallback((sessionId: string, content: string) => {
    setSessions((prev) => appendUserMessageToChatSession(prev, sessionId, content));
  }, [setSessions]);

  const updateWeeklyReviewTemplateStage = useCallback((
    sessionId: string,
    stage: WeeklyReviewTemplateSessionMeta['stage'],
    pendingWriteIntent = false
  ) => {
    setSessions((prev) => updateWeeklyReviewTemplateStageInSessions(prev, sessionId, stage, pendingWriteIntent));
  }, [setSessions]);

  const appendDebugSectionToMessage = useCallback((
    sessionId: string,
    messageId: string,
    section: AIChatDebugSection
  ) => {
    mutateSession(sessionId, (session) => ({
      ...session,
      messages: session.messages.map((message) => {
        if (message.id !== messageId) {
          return message;
        }

        return {
          ...message,
          debugSections: [...(message.debugSections || []), section]
        };
      })
    }));
  }, [mutateSession]);

  return {
    mutateSession,
    replaceMessage,
    updateAppliedActionStatus,
    appendSystemMessage,
    appendUserMessage,
    updateWeeklyReviewTemplateStage,
    appendDebugSectionToMessage
  };
};
