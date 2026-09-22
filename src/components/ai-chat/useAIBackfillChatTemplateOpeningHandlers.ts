/**
 * @file useAIBackfillChatTemplateOpeningHandlers.ts
 * @input Dream and review-template opening turn dependencies
 * @output Opening-turn handlers for dream and weekly/monthly review templates
 * @pos Component Support (AI Integration)
 * @description Keeps template-specific opening commands out of the modal coordinator.
 * @updated 2026-09-22: Extracted dream and template opening handlers.
 */

export function useAIBackfillChatTemplateOpeningHandlers(options: Record<string, any>) {
  const {

    activePersona,
    activeRequestRef,
    activeSession,
    activeSessions,
    addToast,
    appendSystemMessage,
    assistantContextBuilder,
    buildAssistantCurrentTimeSnapshot,
    buildAssistantTimelineSummary,
    buildConversationHistory,
    buildDreamRangeDictionaryContext,
    buildForegroundAssistantReminderSummary,
    buildMonthlyReviewTemplateMonthDataText,
    buildRetryConversationHistory,
    buildSharedPersonaPrompt,
    buildWeeklyReviewTemplateWeekDataText,
    categories,
    conversationHistoryCache,
    debugMode,
    formatAssistantLocalDateTime,
    formatDateKey,
    getErrorDebugSections,
    getRetryableAIErrorMessage,
    isAbortError,
    logs,
    mutateSession,
    prepareForTemplateInteraction,
    refreshDreamSnapshot,
    replacePendingWithResult,
    resolveAssistantDisplayParts,
    resolveAssistantReplyContent,
    runDreamCommandFlow,
    runMonthlyReviewTemplateOpeningTurnFlow,
    runWeeklyReviewTemplateOpeningTurnFlow,
    setInputText,
    setIsHistoryPanelOpen,
    setIsLoading,
    setIsPersonaPanelOpen,
    setSelectedDreamTopicId,
    todos,
    dailyReviews
  } = options;

    const handleDreamCommand = async (
      session: any,
      selectedMonth: any,
      userMessageId?: string,
      options?: {
        replaceMessageId?: string;
        retrySourceUserMessageId?: string;
        userMessageAlreadyExists?: boolean;
      }
    ) => {
      const historyBeforeCurrent = options?.replaceMessageId
        ? buildRetryConversationHistory(session.id, options?.retrySourceUserMessageId)
        : (conversationHistoryCache.get(session.id) || []);
  
      await runDreamCommandFlow({
        activeRequestRef,
        buildConversationSummary: (history) => assistantContextBuilder.summarizeConversationTurns(history, 24),
        buildDictionaryDigestText: (monthSelection) => assistantContextBuilder.buildDictionaryDigest(
          buildDreamRangeDictionaryContext(monthSelection.startDate, monthSelection.endDate)
        ),
        buildStateContextText: (monthSelection, currentTurnDate) => {
          const reminderSummary = buildForegroundAssistantReminderSummary();
          return JSON.stringify({
            ...assistantContextBuilder.buildStateContext({
              ...buildAssistantCurrentTimeSnapshot(currentTurnDate),
              defaultDate: monthSelection.endDate,
              logs: logs.filter((log) => {
                const logDate = formatDateKey(new Date(log.startTime));
                return logDate >= monthSelection.startDate && logDate <= monthSelection.endDate;
              }),
              categories,
              todos,
              activeSessions,
              timelineReviewSummary: buildAssistantTimelineSummary(),
              ...(reminderSummary ? { reminderSummary } : {})
            }),
            dreamRangeLabel: monthSelection.label,
            dreamRangeStart: monthSelection.startDate,
            dreamRangeEnd: monthSelection.endDate
          }, null, 2);
        },
        debugMode,
        formatCurrentDateTime: formatAssistantLocalDateTime,
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
      });
    };
  
    const handleWeeklyReviewTemplateOpeningTurn = async (session: any) => {
      const weekDataText = buildWeeklyReviewTemplateWeekDataText(session);
      if (!weekDataText) {
        throw new Error('周复盘上下文还没有准备好。');
      }
  
      await runWeeklyReviewTemplateOpeningTurnFlow({
        activePersona,
        activeRequestRef,
        appendSystemMessage,
        buildConversationHistory,
        buildPersonaPrompt: buildSharedPersonaPrompt,
        debugMode,
        getErrorDebugSections,
        getRetryableAIErrorMessage,
        isAbortError,
        mutateSession,
        prepareForTemplateInteraction,
        replacePendingWithResult,
        resolveAssistantDisplayParts,
        resolveAssistantReplyContent,
        session,
        setIsLoading,
        weekDataText
      });
    };
  
    const handleMonthlyReviewTemplateOpeningTurn = async (session: any) => {
      const monthDataText = buildMonthlyReviewTemplateMonthDataText(session);
      if (!monthDataText) {
        throw new Error('月复盘上下文还没有准备好。');
      }
  
      await runMonthlyReviewTemplateOpeningTurnFlow({
        activePersona,
        activeRequestRef,
        appendSystemMessage,
        buildConversationHistory,
        buildPersonaPrompt: buildSharedPersonaPrompt,
        debugMode,
        getErrorDebugSections,
        getRetryableAIErrorMessage,
        isAbortError,
        monthDataText,
        mutateSession,
        prepareForTemplateInteraction,
        replacePendingWithResult,
        resolveAssistantDisplayParts,
        resolveAssistantReplyContent,
        session,
        setIsLoading
      });
    };

  return { handleDreamCommand, handleWeeklyReviewTemplateOpeningTurn, handleMonthlyReviewTemplateOpeningTurn };
}
