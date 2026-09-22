/**
 * @file useAIBackfillChatRetry.ts
 * @input Assistant message retry state and rollback callbacks
 * @output Message retry handler
 * @pos Component Support (AI Integration)
 * @description Keeps retry rollback and delayed resend behavior out of the modal coordinator.
 * @updated 2026-09-22: Extracted message retry handling.
 */

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
    parseDreamMonthSelection,
    refreshAssistantMemorySnapshot,
    refreshAssistantReminderSnapshot,
    resetAssistantPartRevealState,
    resolveRetrySourceUserMessageId,
    retryingMessageIdRef,
    rollbackAppliedChatActions,
    setLogs,
    setTodos,
    todos,
    updateAppliedActionStatus
  } = options;

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
          const rollbackResult = rollbackAppliedChatActions(message.appliedActions, logs, todos);
          setLogs(rollbackResult.logs);
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
  
        window.setTimeout(() => {
          retryingMessageIdRef.current = null;
          void handleDreamCommand(activeSession, selectedMonth, undefined, retryOptions);
        }, 0);
        return;
      }
  
      // Let the state updates above commit before the runner snapshots logs/todos.
      window.setTimeout(() => {
        retryingMessageIdRef.current = null;
        void handleSend(message.retryInput, retryOptions);
      }, 0);
    };

  return handleRetryMessage;
}
