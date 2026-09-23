/**
 * @file useAIBackfillChatSend.ts
 * @input Foreground chat state, command handlers, and assistant turn runners
 * @output Foreground send handler
 * @pos Component Support (AI Integration)
 * @description Keeps the foreground command router and request lifecycle out of the modal coordinator.
 * @updated 2026-09-22: Extracted the foreground send handler.
 * @updated 2026-09-23: Keeps only live send dependencies and requires the assistant agent/user-message adapters.
 */

export function useAIBackfillChatSend(options: Record<string, any>) {
  type ForegroundSendOptions = { replaceMessageId?: string; retrySourceUserMessageId?: string };
  const {
    AssistantAgent,

    activePersona,
    activeRequestRef,
    activeSession,
    appendUserMessage,
    addToast,
    applyAssistantMemoryPatch,
    applyUnifiedReminders,
    applyUnifiedToolCalls,
    assistantAgentConfig,
    assistantContextBuilder,
    assistantMemoryService,
    assistantPromptService,
    assistantTurnService,
    buildAssistantDictionaryContext,
    buildAssistantStateContext,
    buildDreamContext,
    buildForegroundAssistantMemory,
    buildForegroundAssistantReminderSummary,
    buildMonthlyReviewTemplateMonthDataText,
    buildRetryConversationHistory,
    buildSharedPersonaPrompt,
    buildWeeklyReviewTemplateWeekDataText,
    categories,
    conversationHistoryCache,
    createSessionTitleFromUserMessage,
    dailyReviews,
    debugMode,
    dreamMonthSelectionState,
    extractQuickAddBackfillDescription,
    extractQuickAddNoteDescription,
    extractQuickAddTodoDescription,
    formatAssistantLocalDateTime,
    getErrorDebugSections,
    getRetryableAIErrorMessage,
    handleDailyNewspaperCommand,
    handleDailyNewspaperOverwriteConfirmation,
    handleDailyReviewNarrativeCommand,
    handleDailyReviewNarrativeOverwriteConfirmation,
    handleDebugCommand,
    handleMonthlyNewspaperCommand,
    handleMonthlyNewspaperOverwriteConfirmation,
    handleMonthlyReviewNarrativeWritebackCommand,
    handleQuickAddBackfill,
    handleQuickAddNote,
    handleQuickAddTodo,
    handleStartDreamMonthSelection,
    handleSubmitDreamMonthSelection,
    handleWeeklyNewspaperCommand,
    handleWeeklyNewspaperOverwriteConfirmation,
    handleWeeklyReviewNarrativeWritebackCommand,
    handleWeeklyReviewTemplateGuidedSelection,
    handleMonthlyReviewTemplateGuidedSelection,
    inputText,
    isAbortError,
    isStopActionVisible,
    logs,
    monthlyReviews,
    monthlyReviewTemplateService,
    mutateSession,
    narrowHistoryForTimeSensitiveTurn,
    notifyAssistantTaskStateChanged,
    prepareForegroundTurn,
    replacePendingWithResult,
    resolveAssistantDisplayParts,
    resolveAssistantReplyContent,
    resolveForegroundAssistantReply,
    runMonthlyReviewTemplateChatTurn,
    runOrdinaryForegroundTurn,
    runReviewCommandSafely,
    runWeeklyReviewTemplateChatTurn,
    scopes,
    setActiveRequestId,
    setInputText,
    setIsHistoryPanelOpen,
    setIsLoading,
    setIsPersonaPanelOpen,
    todoCategories,
     todos,
    weeklyReviewTemplateService,
    weeklyReviews,
    onUnreadAssistantMessage
  } = options;

    const handleSend = async (overrideText?: string, options?: ForegroundSendOptions) => {
      const trimmedText = (overrideText ?? inputText).trim();
      if (!trimmedText || isStopActionVisible || !activeSession) {
        return;
      }
  
      const isWeeklyReviewTemplateSession = activeSession.templateMeta?.templateType === 'weekly_review';
      const isMonthlyReviewTemplateSession = activeSession.templateMeta?.templateType === 'monthly_review';
  
      if (handleDebugCommand(trimmedText, options)) {
        return;
      }
  
      const quickAddTodoDescription = extractQuickAddTodoDescription(trimmedText);
      if (quickAddTodoDescription) {
        await handleQuickAddTodo(quickAddTodoDescription, trimmedText, options);
        return;
      }
  
      const quickAddNoteDescription = extractQuickAddNoteDescription(trimmedText);
      if (quickAddNoteDescription) {
        await handleQuickAddNote(quickAddNoteDescription, trimmedText, options);
        return;
      }
  
      const quickAddBackfillDescription = extractQuickAddBackfillDescription(trimmedText);
      if (quickAddBackfillDescription) {
        await handleQuickAddBackfill(quickAddBackfillDescription, trimmedText, options);
        return;
      }
  
      if (dreamMonthSelectionState?.sessionId === activeSession.id && !options?.replaceMessageId) {
        await handleSubmitDreamMonthSelection(activeSession, trimmedText);
        return;
      }
  
      if (trimmedText === 'dream' && !options?.replaceMessageId) {
        handleStartDreamMonthSelection(activeSession.id);
        return;
      }
  
      if (
        isWeeklyReviewTemplateSession
        && activeSession.templateMeta?.stage !== 'ready'
        && !options?.replaceMessageId
      ) {
        await handleWeeklyReviewTemplateGuidedSelection(activeSession, trimmedText);
        return;
      }
  
      if (
        isMonthlyReviewTemplateSession
        && activeSession.templateMeta?.stage !== 'ready'
        && !options?.replaceMessageId
      ) {
        await handleMonthlyReviewTemplateGuidedSelection(activeSession, trimmedText);
        return;
      }
  
      if (isWeeklyReviewTemplateSession && weeklyReviewTemplateService.isWriteNarrativeCommand(trimmedText)) {
        await handleWeeklyReviewNarrativeWritebackCommand(activeSession);
        return;
      }
  
      if (isMonthlyReviewTemplateSession && monthlyReviewTemplateService.isWriteNarrativeCommand(trimmedText)) {
        await handleMonthlyReviewNarrativeWritebackCommand(activeSession);
        return;
      }
  
      if (!isWeeklyReviewTemplateSession && !isMonthlyReviewTemplateSession) {
        const consumedDailyReviewConfirmation = await runReviewCommandSafely(
          activeSession.id,
          'daily review overwrite confirmation',
          () => handleDailyReviewNarrativeOverwriteConfirmation(activeSession, trimmedText),
          false
        );
        if (consumedDailyReviewConfirmation) {
          return;
        }
      }
  
      if (!isWeeklyReviewTemplateSession && !isMonthlyReviewTemplateSession) {
        const consumedDailyNewspaperConfirmation = await runReviewCommandSafely(
          activeSession.id,
          'daily newspaper overwrite confirmation',
          () => handleDailyNewspaperOverwriteConfirmation(activeSession, trimmedText),
          false
        );
        if (consumedDailyNewspaperConfirmation) {
          return;
        }
      }
  
      if (!isWeeklyReviewTemplateSession && !isMonthlyReviewTemplateSession) {
        const consumedWeeklyNewspaperConfirmation = await runReviewCommandSafely(
          activeSession.id,
          'weekly newspaper overwrite confirmation',
          () => handleWeeklyNewspaperOverwriteConfirmation(activeSession, trimmedText),
          false
        );
        if (consumedWeeklyNewspaperConfirmation) {
          return;
        }
      }
  
      if (!isWeeklyReviewTemplateSession && !isMonthlyReviewTemplateSession) {
        const consumedMonthlyNewspaperConfirmation = await runReviewCommandSafely(
          activeSession.id,
          'monthly newspaper overwrite confirmation',
          () => handleMonthlyNewspaperOverwriteConfirmation(activeSession, trimmedText),
          false
        );
        if (consumedMonthlyNewspaperConfirmation) {
          return;
        }
      }
  
      if (!isWeeklyReviewTemplateSession && !isMonthlyReviewTemplateSession && (trimmedText === '日报' || trimmedText === '叙事') && !options?.replaceMessageId) {
        appendUserMessage(activeSession.id, trimmedText);
        await runReviewCommandSafely(
          activeSession.id,
          'daily review command',
          () => handleDailyReviewNarrativeCommand(activeSession),
          undefined
        );
        return;
      }
  
      if (!isWeeklyReviewTemplateSession && !isMonthlyReviewTemplateSession && /^小报(?:\s+.+)?$/.test(trimmedText) && !options?.replaceMessageId) {
        appendUserMessage(activeSession.id, trimmedText);
        await runReviewCommandSafely(
          activeSession.id,
          'daily newspaper command',
          () => handleDailyNewspaperCommand(activeSession, trimmedText),
          undefined
        );
        return;
      }
  
      if (!isWeeklyReviewTemplateSession && !isMonthlyReviewTemplateSession && /^周小报(?:\s+.+)?$/.test(trimmedText) && !options?.replaceMessageId) {
        appendUserMessage(activeSession.id, trimmedText);
        await runReviewCommandSafely(
          activeSession.id,
          'weekly newspaper command',
          () => handleWeeklyNewspaperCommand(activeSession, trimmedText),
          undefined
        );
        return;
      }
  
      if (!isWeeklyReviewTemplateSession && !isMonthlyReviewTemplateSession && /^月小报(?:\s+.+)?$/.test(trimmedText) && !options?.replaceMessageId) {
        appendUserMessage(activeSession.id, trimmedText);
        await runReviewCommandSafely(
          activeSession.id,
          'monthly newspaper command',
          () => handleMonthlyNewspaperCommand(activeSession, trimmedText),
          undefined
        );
        return;
      }
  
      const {
        canRetryInPlace,
        historyBeforeCurrent,
        now,
        pendingMessageId,
        sessionId,
        userMessageId
      } = prepareForegroundTurn({
        activeSession,
        buildRetryConversationHistory,
        conversationHistoryCache,
        createSessionTitleFromUserMessage,
        isMonthlyReviewTemplateSession,
        isWeeklyReviewTemplateSession,
        mutateSession,
        notifyUserTurn: (text, at) => AssistantAgent.notifyUserTurn({ text, at }),
        onNotifyUserTurnError: (error) => {
          console.error('[AIBackfillChatModal] Failed to notify assistant agent about user turn', error);
        },
        ...(options?.replaceMessageId ? { replaceMessageId: options.replaceMessageId } : {}),
        ...(options?.retrySourceUserMessageId ? { retrySourceUserMessageId: options.retrySourceUserMessageId } : {}),
        setInputText,
        trimmedText
      });
      const promptHistory = narrowHistoryForTimeSensitiveTurn(historyBeforeCurrent, trimmedText);
      setIsLoading(true);
      setIsHistoryPanelOpen(false);
      setIsPersonaPanelOpen(false);
  
      const controller = new AbortController();
      activeRequestRef.current = {
        controller,
        sessionId,
        pendingMessageId
      };
      setActiveRequestId(pendingMessageId);
  
      try {
        if (isWeeklyReviewTemplateSession) {
          const weekDataText = buildWeeklyReviewTemplateWeekDataText(activeSession);
          if (!weekDataText) {
            throw new Error('周复盘上下文还没有准备好。');
          }
  
          await runWeeklyReviewTemplateChatTurn({
            activePersona,
            activeRequestRef,
            buildPersonaPrompt: buildSharedPersonaPrompt,
            controller,
            debugMode,
            getErrorDebugSections,
            getRetryableAIErrorMessage,
            historyBeforeCurrent,
            isAbortError,
            pendingMessageId,
            replacePendingWithResult,
            resolveAssistantDisplayParts,
            resolveAssistantReplyContent,
            session: activeSession,
            userMessage: trimmedText,
            weekDataText
          });
          return;
        }
  
        if (isMonthlyReviewTemplateSession) {
          const monthDataText = buildMonthlyReviewTemplateMonthDataText(activeSession);
          if (!monthDataText) {
            throw new Error('月复盘上下文还没有准备好。');
          }
  
          await runMonthlyReviewTemplateChatTurn({
            activePersona,
            activeRequestRef,
            buildPersonaPrompt: buildSharedPersonaPrompt,
            controller,
            debugMode,
            getErrorDebugSections,
            getRetryableAIErrorMessage,
            historyBeforeCurrent,
            isAbortError,
            monthDataText,
            pendingMessageId,
            replacePendingWithResult,
            resolveAssistantDisplayParts,
            resolveAssistantReplyContent,
            session: activeSession,
            userMessage: trimmedText
          });
          return;
        }
  
        await runOrdinaryForegroundTurn({
          activePersona,
          activeRequestRef,
          applyAssistantMemoryPatch,
          applyUnifiedReminders,
          applyUnifiedToolCalls,
          assistantMemoryEnabled: assistantAgentConfig.longTermMemoryEnabled,
          buildDictionaryContext: buildAssistantDictionaryContext,
          buildDreamContext,
          buildForegroundAssistantMemory,
          buildForegroundAssistantReminderSummary,
          categories,
          buildPromptLayers: async () => {
            const [basePrompt, foregroundModePrompt] = await Promise.all([
              assistantPromptService.getAssistantBasePrompt(),
              assistantPromptService.getForegroundModePrompt()
            ]);
            return { basePrompt, foregroundModePrompt };
          },
          buildStateContext: buildAssistantStateContext,
          controller,
          debugMode,
          getErrorDebugSections,
          getRetryableAIErrorMessage,
          handleRunUnifiedTurn: async (args, runnerOptions) => assistantTurnService.runUnifiedTurn({
            mode: 'foreground',
            trigger: {
              type: 'user_message',
              source: 'user',
              text: args.userMessage,
              createdAt: formatAssistantLocalDateTime(new Date(args.now))
            },
            promptLayers: {
              basePrompt: args.systemPrompt,
              modePrompt: args.modePrompt,
              userPersonaPrompt: buildSharedPersonaPrompt(activePersona)
            },
            memoryEnabled: args.memoryEnabled,
            memory: args.memory,
            conversation: args.conversation,
            stateContext: args.stateContext,
            ...(args.dictionaryContext ? { dictionaryContext: args.dictionaryContext } : {}),
            ...(args.localQueryHistory?.length ? { localQueryHistory: args.localQueryHistory } : {}),
            ...(args.dreamContext ? { dreamContext: args.dreamContext } : {})
          }, runnerOptions),
          historyBeforeCurrent,
          isAbortError,
          logs,
          narrowConversationContext: assistantContextBuilder.buildConversationContext,
          notifyAssistantTaskStateChanged,
          now,
          pendingMessageId,
          replacePendingWithResult,
          resolveAssistantDisplayParts,
          resolveAssistantReplyContent,
          resolveForegroundAssistantReply,
          scopes,
          sessionId,
          setIsLoading,
          todoCategories,
          todos,
          trimmedText,
          userMessageId,
          weeklyReviews,
          monthlyReviews,
          dailyReviews
        });
        return;
      } catch (error) {
        const isCurrentPendingRequest = activeRequestRef.current?.pendingMessageId === pendingMessageId;
  
        if (isAbortError(error)) {
          if (isCurrentPendingRequest) {
            replacePendingWithResult(sessionId, pendingMessageId, '已停止这次请求。', {
              tone: 'system'
            });
          }
          return;
        }
  
        if (!isCurrentPendingRequest || controller.signal.aborted) {
          return;
        }
  
        const message = getRetryableAIErrorMessage(error);
        replacePendingWithResult(sessionId, pendingMessageId, message, {
          tone: 'error',
          retryInput: trimmedText,
          retrySourceUserMessageId: userMessageId,
          debugSections: getErrorDebugSections(error, '统一单轮调用', debugMode)
        });
      } finally {
        if (activeRequestRef.current?.pendingMessageId === pendingMessageId) {
          activeRequestRef.current = null;
        }
        setActiveRequestId((currentRequestId) => (
          currentRequestId === pendingMessageId ? null : currentRequestId
        ));
        setIsLoading(false);
      }
    };

  return handleSend;
}
