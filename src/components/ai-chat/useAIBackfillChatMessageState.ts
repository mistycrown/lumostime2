/**
 * @file useAIBackfillChatMessageState.ts
 * @input Message expansion setters and assistant-part reveal refs
 * @output Message interaction callbacks shared by the conversation pane and retry flow
 * @pos Component Support (AI Integration)
 * @description Keeps message-only UI state transitions out of the main AI request coordinator.
 */
import { useCallback, useEffect } from 'react';
import type { AIChatSession } from './AIBackfillChatShared';

interface MessageStateOptions {
  activeSession: AIChatSession | null;
  setExpandedMemoryUpdateMessageIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setExpandedReasoningMessageIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setExpandedDreamUpdateMessageIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setExpandedReminderUpdateMessageIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setExpandedLocalQueryMessageIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setRevealedAssistantPartCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  assistantPartRevealTimeoutsRef: React.MutableRefObject<Map<string, number[]>>;
  revealedAssistantPartCountsRef: React.MutableRefObject<Record<string, number>>;
  assistantRevealTargetCountsRef: React.MutableRefObject<Map<string, number>>;
  hydratedRevealSessionIdsRef: React.MutableRefObject<Set<string>>;
}

const ASSISTANT_MULTI_BUBBLE_REVEAL_DELAY_MS = 540;

const toggleSetValue = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, messageId: string) => {
  setter((current) => {
    const next = new Set(current);
    if (next.has(messageId)) next.delete(messageId);
    else next.add(messageId);
    return next;
  });
};

export const useAIBackfillChatMessageState = ({
  setExpandedMemoryUpdateMessageIds,
  setExpandedReasoningMessageIds,
  setExpandedDreamUpdateMessageIds,
  setExpandedReminderUpdateMessageIds,
  setExpandedLocalQueryMessageIds,
  setRevealedAssistantPartCounts,
  activeSession,
  assistantPartRevealTimeoutsRef,
  revealedAssistantPartCountsRef,
  assistantRevealTargetCountsRef,
  hydratedRevealSessionIdsRef
}: MessageStateOptions) => {
  const clearAssistantPartRevealTimeouts = useCallback((messageId?: string) => {
    if (messageId) {
      (assistantPartRevealTimeoutsRef.current.get(messageId) || []).forEach((handle) => window.clearTimeout(handle));
      assistantPartRevealTimeoutsRef.current.delete(messageId);
      return;
    }
    assistantPartRevealTimeoutsRef.current.forEach((handles) => handles.forEach((handle) => window.clearTimeout(handle)));
    assistantPartRevealTimeoutsRef.current.clear();
  }, [assistantPartRevealTimeoutsRef]);

  const resetAssistantPartRevealState = useCallback((messageId: string) => {
    clearAssistantPartRevealTimeouts(messageId);
    delete revealedAssistantPartCountsRef.current[messageId];
    assistantRevealTargetCountsRef.current.delete(messageId);
    setRevealedAssistantPartCounts((current) => {
      if (!(messageId in current)) return current;
      const next = { ...current };
      delete next[messageId];
      return next;
    });
  }, [assistantRevealTargetCountsRef, clearAssistantPartRevealTimeouts, revealedAssistantPartCountsRef, setRevealedAssistantPartCounts]);

  const toggleMemoryUpdateExpansion = useCallback((messageId: string) => {
    toggleSetValue(setExpandedMemoryUpdateMessageIds, messageId);
  }, [setExpandedMemoryUpdateMessageIds]);
  const toggleReasoningExpansion = useCallback((messageId: string) => {
    toggleSetValue(setExpandedReasoningMessageIds, messageId);
  }, [setExpandedReasoningMessageIds]);
  const toggleDreamUpdateExpansion = useCallback((messageId: string) => {
    toggleSetValue(setExpandedDreamUpdateMessageIds, messageId);
  }, [setExpandedDreamUpdateMessageIds]);
  const toggleReminderUpdateExpansion = useCallback((messageId: string) => {
    toggleSetValue(setExpandedReminderUpdateMessageIds, messageId);
  }, [setExpandedReminderUpdateMessageIds]);
  const toggleLocalQueryExpansion = useCallback((messageId: string) => {
    toggleSetValue(setExpandedLocalQueryMessageIds, messageId);
  }, [setExpandedLocalQueryMessageIds]);

  useEffect(() => {
    if (!activeSession) return;
    const { id: sessionId, messages } = activeSession;

    if (!hydratedRevealSessionIdsRef.current.has(sessionId)) {
      hydratedRevealSessionIdsRef.current.add(sessionId);
      setRevealedAssistantPartCounts((current) => {
        const next = { ...current };
        messages.forEach((message) => {
          const totalParts = message.displayParts && message.displayParts.length > 0 ? message.displayParts.length : 1;
          next[message.id] = totalParts;
          assistantRevealTargetCountsRef.current.set(message.id, totalParts);
        });
        return next;
      });
      return;
    }

    const immediateUpdates: Record<string, number> = {};
    messages.forEach((message) => {
      const totalParts = message.displayParts && message.displayParts.length > 0 ? message.displayParts.length : 1;
      const currentRevealed = revealedAssistantPartCountsRef.current[message.id] ?? 0;
      const currentTarget = assistantRevealTargetCountsRef.current.get(message.id) ?? 0;
      const isAnimatable = message.role === 'assistant' && (message.tone || 'normal') === 'normal' && totalParts > 1;

      if (isAnimatable && totalParts > currentRevealed && totalParts > currentTarget) {
        clearAssistantPartRevealTimeouts(message.id);
        const startCount = Math.max(1, currentRevealed || 1);
        immediateUpdates[message.id] = startCount;
        assistantRevealTargetCountsRef.current.set(message.id, totalParts);
        const handles: number[] = [];
        for (let count = startCount + 1; count <= totalParts; count += 1) {
          handles.push(window.setTimeout(() => {
            setRevealedAssistantPartCounts((current) => ({ ...current, [message.id]: count }));
          }, ASSISTANT_MULTI_BUBBLE_REVEAL_DELAY_MS * (count - startCount)));
        }
        assistantPartRevealTimeoutsRef.current.set(message.id, handles);
        return;
      }

      if (currentRevealed !== totalParts && !isAnimatable) immediateUpdates[message.id] = totalParts;
      if (!currentTarget || totalParts > currentTarget) assistantRevealTargetCountsRef.current.set(message.id, totalParts);
    });

    if (Object.keys(immediateUpdates).length > 0) {
      setRevealedAssistantPartCounts((current) => ({ ...current, ...immediateUpdates }));
    }
  }, [activeSession, assistantPartRevealTimeoutsRef, assistantRevealTargetCountsRef, clearAssistantPartRevealTimeouts, hydratedRevealSessionIdsRef, revealedAssistantPartCountsRef, setRevealedAssistantPartCounts]);

  return {
    clearAssistantPartRevealTimeouts,
    resetAssistantPartRevealState,
    toggleMemoryUpdateExpansion,
    toggleReasoningExpansion,
    toggleDreamUpdateExpansion,
    toggleReminderUpdateExpansion,
    toggleLocalQueryExpansion
  };
};
