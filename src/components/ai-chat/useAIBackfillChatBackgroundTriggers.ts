/**
 * @file useAIBackfillChatBackgroundTriggers.ts
 * @input Background assistant triggers, conversation history, and persistence callbacks
 * @output Background trigger processing handlers
 * @pos Component Support (AI Integration)
 * @description Keeps system-trigger orchestration out of the modal coordinator.
 * @updated 2026-09-22: Extracted background trigger processing handlers.
 */

import { useCallback } from 'react';

import type { AssistantSystemTrigger } from '../../types/assistant';
import type { AssistantLogSubmittedEventDetail } from '../../utils/assistantLogSubmissionTrigger';

export function useAIBackfillChatBackgroundTriggers(options: Record<string, any>) {
  const {
    AssistantAgent,
    addToast,
    assistantAgentConfig,
    assistantOrchestratorService,
    assistantReminderQueueService,
    assistantScheduledTaskService,
    buildAssistantLogSubmissionTrigger,
    buildAssistantLogSubmissionUserMessage,
    buildBackgroundTurnRequest,
    buildConversationHistoryFromMessages,
    categories,
    conversationHistoryCache,
    getBackgroundPersonaDisplayName,
    getBackgroundTargetSession,
    handledAssistantTriggerIdsRef,
    isAssistantBackgroundContextReady,
    isOpenRef,
    logs,
    normalizeAssistantNativeDiagnostics,
    onUnreadAssistantMessage,
    processingAssistantTriggerIdsRef,
    refreshAssistantMemorySnapshot,
    refreshAssistantNativeDiagnostics,
    reloadPersistedChatSessions,
    runBackgroundAssistantLetter,
    scopes,
    shouldShowBackgroundSystemNotification,
    syncAssistantScheduledTasks,
    todos,
    upsertLogForAssistantContext,
    matchesAssistantLogSubmissionTrigger
  } = options;

    const completeReminderDueTrigger = useCallback((trigger: AssistantSystemTrigger) => {
      if (trigger.type !== 'reminder_due') {
        return;
      }
  
      const reminderId = typeof trigger.metadata?.reminderId === 'string'
        ? trigger.metadata.reminderId.trim()
        : '';
      if (!reminderId) {
        return;
      }
  
      assistantScheduledTaskService.consumeTriggeredReminder(reminderId, new Date().toISOString());
      syncAssistantScheduledTasks(new Date());
    }, [syncAssistantScheduledTasks]);
  
    const handleAssistantSystemTrigger = useCallback(async (trigger: AssistantSystemTrigger): Promise<void> => {
      const triggerId = trigger.id?.trim();
      if (!triggerId) {
        return;
      }
  
      if (!assistantAgentConfig.enabled || !isAssistantBackgroundContextReady) {
        return;
      }
  
      if (trigger.type === 'reminder_due' || trigger.type === 'assistant_letter_due') {
        const reminderId = typeof trigger.metadata?.reminderId === 'string'
          ? trigger.metadata.reminderId.trim()
          : triggerId.startsWith('reminder_due:')
            ? triggerId.slice('reminder_due:'.length).split(':')[0]
            : '';
        const nativeTriggerId = trigger.type === 'assistant_letter_due'
          ? triggerId
          : reminderId
            ? `reminder_due:${reminderId}`
            : '';
        if (nativeTriggerId) {
          try {
            const diagnosticResult = await AssistantAgent.listDiagnostics();
            const nativeAlreadyHandling = normalizeAssistantNativeDiagnostics(diagnosticResult.entries)
              .some((entry) => entry.triggerId === nativeTriggerId
                && (entry.type === 'native_request_started' || entry.type === 'native_request_completed'));
            if (nativeAlreadyHandling) {
              await AssistantAgent.acknowledgeSystemTrigger({ id: triggerId });
              handledAssistantTriggerIdsRef.current.add(triggerId);
              return;
            }
          } catch (error) {
            console.error('[AIBackfillChatModal] Failed to check native reminder execution before Web fallback', error);
          }
        }
      }
  
      if (handledAssistantTriggerIdsRef.current.has(triggerId)) {
        try {
          await AssistantAgent.acknowledgeSystemTrigger({ id: triggerId });
        } catch (error) {
          console.error('[AIBackfillChatModal] Failed to acknowledge duplicate assistant trigger', error);
        }
        return;
      }
  
      if (processingAssistantTriggerIdsRef.current.has(triggerId)) {
        return;
      }
      processingAssistantTriggerIdsRef.current.add(triggerId);
  
      void refreshAssistantNativeDiagnostics();
  
      const targetSession = getBackgroundTargetSession();
      if (!targetSession && trigger.type !== 'reminder_due') {
        console.info('[AIBackfillChatModal] Skipping assistant system trigger because no ordinary conversation has recent user activity', trigger);
        processingAssistantTriggerIdsRef.current.delete(triggerId);
        return;
      }
  
      const conversationHistory = targetSession
        ? conversationHistoryCache.get(targetSession.id) || []
        : [];
  
      try {
        if (trigger.type === 'assistant_letter_due') {
          if (!targetSession) {
            processingAssistantTriggerIdsRef.current.delete(triggerId);
            return;
          }
          const result = await runBackgroundAssistantLetter(trigger, targetSession, conversationHistory, { now: new Date() });
          if (!result) {
            processingAssistantTriggerIdsRef.current.delete(triggerId);
            return;
          }
          try {
            await AssistantAgent.acknowledgeSystemTrigger({ id: triggerId });
          } catch (error) {
            console.error('[AIBackfillChatModal] Failed to acknowledge completed assistant letter trigger', error);
          }
          handledAssistantTriggerIdsRef.current.add(triggerId);
          if (result.surfacedMessage && !isOpenRef.current) {
            onUnreadAssistantMessage?.(1);
            addToast('info', `${getBackgroundPersonaDisplayName(targetSession)}：${result.surfacedMessage}`);
          }
          return;
        }
  
        const result = await assistantOrchestratorService.runSystemTurn(buildBackgroundTurnRequest({
          trigger,
          now: new Date(),
          targetSession,
          conversationHistory,
          showSystemNotification: shouldShowBackgroundSystemNotification()
        }));
  
        completeReminderDueTrigger(trigger);
        try {
          await AssistantAgent.acknowledgeSystemTrigger({ id: triggerId });
        } catch (error) {
          console.error('[AIBackfillChatModal] Failed to acknowledge completed assistant trigger', error);
        }
        handledAssistantTriggerIdsRef.current.add(triggerId);
        refreshAssistantMemorySnapshot();
        reloadPersistedChatSessions();
        if (result.surfacedMessage && !isOpenRef.current) {
          onUnreadAssistantMessage?.(1);
          addToast('info', `${getBackgroundPersonaDisplayName(targetSession)}：${result.surfacedMessage}`);
        }
      } catch (error) {
        console.error('[AIBackfillChatModal] Assistant system turn failed', error);
        if (trigger.type === 'reminder_due') {
          const reminderId = typeof trigger.metadata?.reminderId === 'string'
            ? trigger.metadata.reminderId.trim()
            : triggerId.startsWith('reminder_due:')
              ? triggerId.slice('reminder_due:'.length).split(':')[0]
              : '';
          const attemptedCount = typeof trigger.metadata?.dispatchAttemptCount === 'number'
            ? trigger.metadata.dispatchAttemptCount
            : 0;
          if (reminderId) {
            const failedReminder = assistantReminderQueueService.markDispatchFailed(reminderId, attemptedCount + 1);
            if (failedReminder?.status === 'failed') {
              try {
                await AssistantAgent.acknowledgeSystemTrigger({ id: triggerId });
                handledAssistantTriggerIdsRef.current.add(triggerId);
              } catch (acknowledgeError) {
                console.error('[AIBackfillChatModal] Failed to acknowledge exhausted reminder trigger', acknowledgeError);
              }
            }
          }
        }
      } finally {
        processingAssistantTriggerIdsRef.current.delete(triggerId);
      }
    }, [
      addToast,
      assistantAgentConfig.enabled,
      buildBackgroundTurnRequest,
      completeReminderDueTrigger,
      conversationHistoryCache,
      getBackgroundPersonaDisplayName,
      getBackgroundTargetSession,
      isAssistantBackgroundContextReady,
      onUnreadAssistantMessage,
      refreshAssistantNativeDiagnostics,
      runBackgroundAssistantLetter,
      shouldShowBackgroundSystemNotification
    ]);
  
    const handleAssistantLogSubmittedEvent = useCallback(async (
      event: CustomEvent<AssistantLogSubmittedEventDetail>
    ): Promise<void> => {
      const submittedLog = event.detail?.log;
      if (!submittedLog) {
        return;
      }
  
      if (!assistantAgentConfig.enabled || !isAssistantBackgroundContextReady) {
        return;
      }
  
      if (!matchesAssistantLogSubmissionTrigger(assistantAgentConfig, submittedLog)) {
        return;
      }
  
      const targetSession = getBackgroundTargetSession();
      if (!targetSession) {
        console.info('[AIBackfillChatModal] Skipping submitted-log assistant trigger because no ordinary conversation has recent user activity', submittedLog.id);
        return;
      }
  
      const now = new Date();
      const nextLogs = upsertLogForAssistantContext(logs, submittedLog);
      const submittedLogUserMessage = buildAssistantLogSubmissionUserMessage(
        submittedLog,
        categories,
        scopes,
        todos
      );
      assistantOrchestratorService.persistBackgroundUserMessage(submittedLogUserMessage, targetSession.id);
      reloadPersistedChatSessions();
      const trigger = buildAssistantLogSubmissionTrigger({
        log: submittedLog,
        categories,
        scopes,
        todos,
        now
      });
      const conversationHistory = buildConversationHistoryFromMessages(
        targetSession,
        [
          ...targetSession.messages,
          {
            id: crypto.randomUUID(),
            role: 'user',
            content: submittedLogUserMessage,
            createdAt: Date.now()
          }
        ]
      );
  
      try {
        const result = await assistantOrchestratorService.runSystemTurn(buildBackgroundTurnRequest({
          trigger,
          now,
          targetSession,
          conversationHistory,
          showSystemNotification: shouldShowBackgroundSystemNotification(),
          logsOverride: nextLogs
        }));
  
        refreshAssistantMemorySnapshot();
        reloadPersistedChatSessions();
        if (result.surfacedMessage && !isOpenRef.current) {
          onUnreadAssistantMessage?.(1);
          addToast('info', `${getBackgroundPersonaDisplayName(targetSession)}：${result.surfacedMessage}`);
        }
      } catch (error) {
        console.error('[AIBackfillChatModal] Submitted-log assistant trigger failed', error);
      }
    }, [
      addToast,
      assistantAgentConfig,
      buildBackgroundTurnRequest,
      categories,
      conversationHistoryCache,
      getBackgroundTargetSession,
      isAssistantBackgroundContextReady,
      logs,
      onUnreadAssistantMessage,
      scopes,
      shouldShowBackgroundSystemNotification,
      todos
    ]);
  
    const drainPendingAssistantSystemTriggers = useCallback(async () => {
      try {
        const result = await AssistantAgent.listPendingSystemTriggers();
        const rawTriggers = Array.isArray(result.triggers) ? result.triggers : [];
        if (rawTriggers.length === 0) {
          return;
        }
  
        const normalizedTriggers = rawTriggers
          .filter((trigger): trigger is AssistantSystemTrigger => (
            Boolean(trigger)
            && typeof trigger.id === 'string'
            && typeof trigger.type === 'string'
            && typeof trigger.source === 'string'
            && typeof trigger.createdAt === 'string'
            && typeof trigger.text === 'string'
          ))
          .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  
        const latestCheckinTrigger = [...normalizedTriggers]
          .reverse()
          .find((trigger) => trigger.type === 'checkin');
  
        for (const trigger of normalizedTriggers) {
          if (trigger.type === 'checkin' && latestCheckinTrigger && trigger.id !== latestCheckinTrigger.id) {
            handledAssistantTriggerIdsRef.current.add(trigger.id);
            try {
              await AssistantAgent.acknowledgeSystemTrigger({ id: trigger.id });
            } catch (error) {
              console.error('[AIBackfillChatModal] Failed to acknowledge stale check-in trigger', error);
            }
            continue;
          }
  
          await handleAssistantSystemTrigger(trigger);
        }
      } catch (error) {
      console.error('[AIBackfillChatModal] Failed to drain pending assistant triggers', error);
    }
  }, [handleAssistantSystemTrigger]);

  return { completeReminderDueTrigger, handleAssistantSystemTrigger, handleAssistantLogSubmittedEvent, drainPendingAssistantSystemTriggers };
}
