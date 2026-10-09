/**
 * @file useAIBackfillChatRetry.ts
 * @updated 2026-10-09: Rolls node metadata back atomically with logs before resending.
 * @updated 2026-10-09: Resends from a post-commit effect so the send callback sees restored data.
 * @input Assistant message retry state and rollback callbacks
 * @output Message retry handler
 * @pos Component Support (AI Integration)
 * @description Keeps retry rollback and delayed resend behavior out of the modal coordinator.
 * @updated 2026-09-22: Extracted message retry handling.
 */
import { useEffect, useRef, useState } from 'react';

interface PendingRetry {
  input: string;
  options: { replaceMessageId: string; retrySourceUserMessageId?: string };
  selectedMonth?: unknown;
}

export function useAIBackfillChatRetry(options: Record<string, any>) {
  const {

    activeSession,
    addToast,
    assistantMemoryService,
    assistantReminderQueueService,
    getLocalDateStr,
    handleDreamCommand,
    handleSend,
    isLoading,
    logs,
    nodes,
    updateNodeRecords,
    parseDreamMonthSelection,
    refreshAssistantMemorySnapshot,
    refreshAssistantReminderSnapshot,
    resetAssistantPartRevealState,
    resolveRetrySourceUserMessageId,
    retryingMessageIdRef,
    rollbackAppliedChatActions,
    setTodos,
    todos,
    updateAppliedActionStatus
  } = options;

  const [pendingRetry, setPendingRetry] = useState<PendingRetry | null>(null);
  const pendingRetryRef = useRef<PendingRetry | null>(null);
  useEffect(() => {
    if (!pendingRetry || pendingRetryRef.current !== pendingRetry) return;
    pendingRetryRef.current = null;
    setPendingRetry(null);
    retryingMessageIdRef.current = null;
    if (pendingRetry.selectedMonth) {
      void handleDreamCommand(activeSession, pendingRetry.selectedMonth, undefined, pendingRetry.options);
    } else {
      void handleSend(pendingRetry.input, pendingRetry.options);
    }
  }, [activeSession, handleDreamCommand, handleSend, pendingRetry, retryingMessageIdRef]);

  const enqueueRetry = (request: PendingRetry) => {
    pendingRetryRef.current = request;
    setPendingRetry(request);
  };

    const handleRetryMessage = (message: any) => {
      if (!message.retryInput || isLoading || retryingMessageIdRef.current) {
        return;
      }
  
      if (message.role !== 'assistant' || !activeSession) {
        return;
      }
  
      retryingMessageIdRef.current = message.id;
      resetAssistantPartRevealState(message.id);
  
      try {
        if (message.remindersBefore) {
          assistantReminderQueueService.saveReminders(message.remindersBefore);
        }
        if (message.memoryBefore) {
          assistantMemoryService.saveMemory(message.memoryBefore);
        }
        if (message.remindersBefore || message.memoryBefore) {
          refreshAssistantReminderSnapshot();
          refreshAssistantMemorySnapshot();
        }
  
        if (message.appliedActions?.some((action) => action.status === 'applied')) {
          const rollbackResult = rollbackAppliedChatActions(message.appliedActions, logs, todos, nodes);
          updateNodeRecords(() => ({ nodes: rollbackResult.nodes, logs: rollbackResult.logs }));
          setTodos(rollbackResult.todos);
          rollbackResult.undoneActionIds.forEach((actionId) => {
            updateAppliedActionStatus(activeSession.id, message.id, actionId, 'undone');
          });
        }
      } catch (error) {
        console.error('[AIBackfillChatModal] Failed to rollback assistant actions before retry', error);
        addToast('error', '撤销本次 AI 操作失败，未重新发送。');
        retryingMessageIdRef.current = null;
        return;
      }
  
      const retryOptions = {
        replaceMessageId: message.id,
        retrySourceUserMessageId: resolveRetrySourceUserMessageId(message)
      };
  
      if (message.retryInput === 'dream' && message.dreamRetryYearMonth && activeSession) {
        const selectedMonth = parseDreamMonthSelection(message.dreamRetryYearMonth, getLocalDateStr);
        if (!selectedMonth) {
          retryingMessageIdRef.current = null;
          addToast('info', '这次 Dream 重试缺少可用的年月。');
          return;
        }
  
        enqueueRetry({ input: message.retryInput, selectedMonth, options: retryOptions });
        return;
      }
  
      enqueueRetry({ input: message.retryInput, options: retryOptions });
    };

  return handleRetryMessage;
}
