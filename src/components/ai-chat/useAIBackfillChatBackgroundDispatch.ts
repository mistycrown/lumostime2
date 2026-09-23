/**
 * @file useAIBackfillChatBackgroundDispatch.ts
 * @input Native snapshot, assistant letter, and reminder dispatch dependencies
 * @output Background dispatch callbacks
 * @pos Component Support (AI Integration)
 * @description Keeps background execution synchronization and due-item dispatch out of the modal coordinator.
 * @updated 2026-09-22: Extracted background dispatch callbacks.
 * @updated 2026-09-23: Adds the required stable id to the native check-in trigger payload.
 */

import { useCallback } from 'react';

import type { AssistantReminder, AssistantSystemTrigger } from '../../types/assistant';

export function useAIBackfillChatBackgroundDispatch(options: Record<string, any>) {
  const {
    AssistantAgent,
    assistantAgentConfig,
    assistantContextBuilder,
    assistantLetterScheduler,
    assistantMemoryService,
    assistantOrchestratorService,
    assistantPromptService,
    assistantReminderQueueService,
    assistantScheduledTaskService,
    assistantTurnService,
    buildAssistantDictionaryContext,
    buildAssistantReminderSummary,
    buildAssistantStateContext,
    buildBackgroundPersonaPrompt,
    buildBackgroundTurnRequest,
    conversationHistoryCache,
    formatAssistantLocalDateTime,
    getBackgroundPersonaDisplayName,
    getBackgroundTargetSession,
    isAssistantBackgroundContextReady,
    isOpenRef,
    isProcessingAssistantLetterRef,
    onUnreadAssistantMessage,
    processingDueReminderIdsRef,
    refreshAssistantMemorySnapshot,
    reloadPersistedChatSessions,
    runBackgroundAssistantLetter,
    serializeConversationTurnsForAssistantContext,
    shouldShowBackgroundSystemNotification,
    shouldUseNativeReminderTriggerDispatch,
    syncAssistantScheduledTasks,
    addToast,
    normalizeAssistantDateTime,
    buildAssistantReminderDueTrigger
  } = options;

    const syncNativeBackgroundExecutionSnapshot = useCallback(async () => {
      if (!isAssistantBackgroundContextReady) {
        return;
      }
  
      try {
        const targetSession = getBackgroundTargetSession();
        const conversationHistory = targetSession
          ? conversationHistoryCache.get(targetSession.id) || []
          : [];
        const reminderSummary = buildAssistantReminderSummary();
        const userPersonaPrompt = targetSession ? buildBackgroundPersonaPrompt(targetSession) : '';
        const now = new Date();
        const stateContext = buildAssistantStateContext(now, reminderSummary);
        const [basePrompt, backgroundModePrompt] = await Promise.all([
          assistantPromptService.getAssistantBasePrompt(),
          assistantPromptService.getBackgroundModePrompt()
        ]);
        const memory = assistantAgentConfig.longTermMemoryEnabled
          ? assistantMemoryService.getMemory()
          : {
            version: 1 as const,
            updatedAt: new Date().toISOString(),
            profileMemory: [],
            preferenceMemory: [],
            activeReminders: [],
            recentDecisions: []
          };
  
        const systemPrompt = await assistantTurnService.buildSystemPrompt({
          mode: 'background',
          trigger: {
            id: `native_checkin:${now.toISOString()}`,
            type: 'checkin',
            source: 'system',
            text: 'Native background check-in trigger',
            createdAt: now.toISOString()
          },
          promptLayers: {
            basePrompt,
            modePrompt: backgroundModePrompt,
            ...(userPersonaPrompt ? { userPersonaPrompt } : {})
          },
          memoryEnabled: assistantAgentConfig.longTermMemoryEnabled,
          memory,
          conversation: assistantContextBuilder.buildConversationContext(
            serializeConversationTurnsForAssistantContext(conversationHistory)
          ),
          stateContext: {
            currentDateTime: stateContext.currentDateTime,
            stateContextDate: stateContext.stateContextDate,
            ...(stateContext.currentLocalDate ? { currentLocalDate: stateContext.currentLocalDate } : {}),
            ...(stateContext.currentWeekday ? { currentWeekday: stateContext.currentWeekday } : {}),
            ...(stateContext.tomorrowDate ? { tomorrowDate: stateContext.tomorrowDate } : {}),
            ...(stateContext.dayAfterTomorrowDate ? { dayAfterTomorrowDate: stateContext.dayAfterTomorrowDate } : {}),
            ...(stateContext.currentWeekRange ? { currentWeekRange: stateContext.currentWeekRange } : {}),
            ...(stateContext.nextWeekdayDates ? { nextWeekdayDates: stateContext.nextWeekdayDates } : {}),
            ...(stateContext.timelineSummaryForDate ? { timelineSummaryForDate: stateContext.timelineSummaryForDate } : {}),
            ...(stateContext.timelineSummaryForPreviousDate ? { timelineSummaryForPreviousDate: stateContext.timelineSummaryForPreviousDate } : {}),
            ...(stateContext.timelineReviewSummary ? { timelineReviewSummary: stateContext.timelineReviewSummary } : {}),
            ...(stateContext.activeSessionSummary ? { activeSessionSummary: stateContext.activeSessionSummary } : {}),
            ...(stateContext.scheduledTodosForDateSummary ? { scheduledTodosForDateSummary: stateContext.scheduledTodosForDateSummary } : {}),
            ...(stateContext.pinnedTodoSummary ? { pinnedTodoSummary: stateContext.pinnedTodoSummary } : {}),
            ...(stateContext.overdueTodoSummary ? { overdueTodoSummary: stateContext.overdueTodoSummary } : {}),
            ...(reminderSummary ? { reminderSummary } : {})
          },
          dictionaryContext: buildAssistantDictionaryContext()
        });
  
        await AssistantAgent.syncNativeBackgroundSnapshot({
          systemPrompt,
          conversation: assistantContextBuilder.buildConversationContext(
            serializeConversationTurnsForAssistantContext(conversationHistory)
          ),
          ...(targetSession
            ? { personaName: getBackgroundPersonaDisplayName(targetSession) }
            : {})
        });
      } catch (error) {
        console.error('[AIBackfillChatModal] Failed to sync native background snapshot', error);
      }
    }, [
      assistantAgentConfig.longTermMemoryEnabled,
      buildAssistantDictionaryContext,
      buildAssistantReminderSummary,
      buildAssistantStateContext,
      buildBackgroundPersonaPrompt,
      conversationHistoryCache,
      getBackgroundPersonaDisplayName,
      getBackgroundTargetSession,
      isAssistantBackgroundContextReady
    ]);
  
  
    const flushDueAssistantLetter = useCallback(() => {
      if (
        !assistantAgentConfig.enabled
        || !assistantAgentConfig.letterEnabled
        || !isAssistantBackgroundContextReady
        || isProcessingAssistantLetterRef.current
        || !assistantLetterScheduler.isLetterDue(assistantAgentConfig, new Date())
      ) {
        return;
      }
  
      const targetSession = getBackgroundTargetSession();
      if (!targetSession) {
        return;
      }
  
      const now = new Date();
      const scheduledFor = assistantAgentConfig.nextLetterAt || normalizeAssistantDateTime(now.toISOString()) || now.toISOString();
      const trigger: AssistantSystemTrigger = {
        id: `assistant_letter_due:${scheduledFor}`,
        type: 'assistant_letter_due',
        source: 'system',
        createdAt: formatAssistantLocalDateTime(now),
        text: 'Scheduled assistant letter is due',
        metadata: {
          scheduledFor
        }
      };
      const conversationHistory = conversationHistoryCache.get(targetSession.id) || [];
  
      void runBackgroundAssistantLetter(trigger, targetSession, conversationHistory, { now }).then((result) => {
        if (!result) {
          return;
        }
        if (result.surfacedMessage && !isOpenRef.current) {
          onUnreadAssistantMessage?.(1);
          addToast('info', `${getBackgroundPersonaDisplayName(targetSession)}：${result.surfacedMessage}`);
        }
      }).catch((error) => {
        console.error('[AIBackfillChatModal] Assistant letter generation failed', error);
      });
    }, [
      addToast,
      assistantAgentConfig,
      conversationHistoryCache,
      getBackgroundPersonaDisplayName,
      getBackgroundTargetSession,
      isAssistantBackgroundContextReady,
      onUnreadAssistantMessage,
      runBackgroundAssistantLetter
    ]);
  
    const buildReminderDueTrigger = (reminder: AssistantReminder): AssistantSystemTrigger => (
      buildAssistantReminderDueTrigger(reminder)
    );
  
  
  
    const dispatchDueReminder = useCallback((reminder: AssistantReminder) => {
      if (!isAssistantBackgroundContextReady) {
        return;
      }
  
      if (processingDueReminderIdsRef.current.has(reminder.id)) {
        return;
      }
  
      processingDueReminderIdsRef.current.add(reminder.id);
      const targetSession = getBackgroundTargetSession();
      if (!targetSession) {
        processingDueReminderIdsRef.current.delete(reminder.id);
        console.info('[AIBackfillChatModal] Skipping due reminder dispatch because no ordinary conversation has recent user activity', reminder.id);
        return;
      }
  
      const now = new Date();
      const attemptedAt = now.toISOString();
      assistantReminderQueueService.recordDispatchAttempt(reminder.id, attemptedAt);
      const conversationHistory = conversationHistoryCache.get(targetSession.id) || [];
  
      void assistantOrchestratorService.runSystemTurn(buildBackgroundTurnRequest({
        trigger: buildReminderDueTrigger({
          ...reminder,
          ...(reminder.dispatchAttemptCount !== undefined ? { dispatchAttemptCount: reminder.dispatchAttemptCount + 1 } : { dispatchAttemptCount: 1 }),
          lastDispatchAttemptAt: attemptedAt
        }),
        now,
        targetSession,
        conversationHistory,
        showSystemNotification: shouldShowBackgroundSystemNotification()
      })).then((result) => {
        assistantScheduledTaskService.consumeTriggeredReminder(reminder.id, new Date().toISOString());
        syncAssistantScheduledTasks(new Date());
        reloadPersistedChatSessions();
        if (result.surfacedMessage && !isOpenRef.current) {
          onUnreadAssistantMessage?.(1);
          addToast('info', `${getBackgroundPersonaDisplayName(targetSession)}：${result.surfacedMessage}`);
        }
      }).catch((error) => {
        console.error('[AIBackfillChatModal] Due reminder dispatch failed', error);
        assistantReminderQueueService.markDispatchFailed(
          reminder.id,
          (reminder.dispatchAttemptCount || 0) + 1
        );
        refreshAssistantMemorySnapshot();
      }).finally(() => {
        processingDueReminderIdsRef.current.delete(reminder.id);
      });
    }, [
      addToast,
      buildBackgroundTurnRequest,
      conversationHistoryCache,
      getBackgroundTargetSession,
      isAssistantBackgroundContextReady,
      onUnreadAssistantMessage,
      reloadPersistedChatSessions,
      refreshAssistantMemorySnapshot,
      shouldShowBackgroundSystemNotification,
      syncAssistantScheduledTasks
    ]);
  
    const flushDueReminders = useCallback(() => {
      if (!assistantAgentConfig.enabled || !isAssistantBackgroundContextReady || shouldUseNativeReminderTriggerDispatch) {
        return;
      }
  
      const dueReminders = assistantReminderQueueService.listDueReminders();
      dueReminders.forEach((reminder) => {
        dispatchDueReminder(reminder);
      });
    }, [
      assistantAgentConfig.enabled,
      dispatchDueReminder,
      isAssistantBackgroundContextReady,
      shouldUseNativeReminderTriggerDispatch
    ]);

  return { syncNativeBackgroundExecutionSnapshot, flushDueAssistantLetter, buildReminderDueTrigger, dispatchDueReminder, flushDueReminders };
}
