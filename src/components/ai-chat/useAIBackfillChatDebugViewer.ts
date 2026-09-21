/**
 * @file useAIBackfillChatDebugViewer.ts
 * @input AI chat message data, active persona/session, and background call history
 * @output Message-to-debug-viewer resolver for the AI chat conversation pane
 * @pos Component Support (AI Integration)
 * @description Resolves persisted and background assistant diagnostics without coupling the conversation renderer to request orchestration.
 */
import { useCallback } from 'react';
import type { AssistantBackgroundCallHistoryEntry } from '../../services/assistantOrchestratorService';
import type { AIChatMessage, AIChatPersona, AIChatSession, DebugViewerState } from './AIBackfillChatShared';
import { buildBackgroundSummaryDebugExchange, getAssistantBackgroundTriggerLabel } from './AIBackfillChatHelpers';

interface DebugViewerOptions {
  debugMode: boolean;
  activePersona: AIChatPersona;
  activeSession: AIChatSession | null;
  assistantBackgroundCallHistory: AssistantBackgroundCallHistoryEntry[];
}

export const useAIBackfillChatDebugViewer = ({
  debugMode,
  activePersona,
  activeSession,
  assistantBackgroundCallHistory
}: DebugViewerOptions) => useCallback((message: AIChatMessage): DebugViewerState | null => {
  if (!debugMode || message.role !== 'assistant') {
    return null;
  }

  if (message.debugSections && message.debugSections.length > 0) {
    return {
      title: `${activePersona.assistantSelfName || 'AI'} 调试`,
      sections: message.debugSections
    };
  }

  const normalizedMessage = message.content.trim();
  const matchedBackgroundEntry = assistantBackgroundCallHistory.find((entry) => {
    if (entry.persistedMessageId === message.id) {
      return true;
    }

    if (message.backgroundDebugHistoryId && entry.id === message.backgroundDebugHistoryId) {
      return true;
    }

    if (message.tone !== 'system' || !activeSession || entry.targetSessionId !== activeSession.id) {
      return false;
    }

    if ((entry.message?.trim() || '') !== normalizedMessage) {
      return false;
    }

    const entryTime = Date.parse(entry.completedAt || entry.requestedAt || '');
    return Number.isFinite(entryTime) && Math.abs(entryTime - message.createdAt) <= 2 * 60 * 1000;
  });

  if (!matchedBackgroundEntry) {
    return null;
  }

  return {
    title: `后台请求调试 · ${getAssistantBackgroundTriggerLabel(matchedBackgroundEntry.triggerType)}`,
    sections: [{
      label: '后台 AI 调用',
      exchange: matchedBackgroundEntry.debugExchange || buildBackgroundSummaryDebugExchange(matchedBackgroundEntry)
    }]
  };
}, [activePersona.assistantSelfName, activeSession, assistantBackgroundCallHistory, debugMode]);
