/**
 * @file AIBackfillChatMainView.tsx
 * @input Chat home and conversation-pane props
 * @output Main AI chat view
 * @pos Component Support (AI Integration)
 * @description Keeps home and conversation view composition out of the modal coordinator.
 * @updated 2026-09-22: Extracted main chat view composition.
 */

import { AIChatHome } from './AIChatHome';
import { AIBackfillChatConversationPane } from './AIBackfillChatConversationPane';

export function AIBackfillChatMainView(props: Record<string, any>) {
  const {
    AI_CHAT_THEME,
    CHAT_MARKDOWN_COMPONENTS,
    QUICK_ADD_BACKFILL_PREFIX,
    QUICK_ADD_NOTE_PREFIX,
    QUICK_ADD_TODO_PREFIX,
    accentMix,
    activePersona,
    activeSession,
    assistantLetterSnapshot,
    assistantMemorySnapshot,
    assistantNewspaperSnapshot,
    assistantReminderSnapshot,
    createDefaultSession,
    emptyPromptExampleGroups,
    emptyStateMaxWidthClassName,
    expandedDreamUpdateMessageIds,
    expandedLocalQueryMessageIds,
    expandedMemoryUpdateMessageIds,
    expandedReasoningMessageIds,
    expandedReminderUpdateMessageIds,
    focusComposerAtEnd,
    formatAssistantDateTimeForDisplay,
    formatConversationTime,
    handleMessageElementRef,
    handleOpenAssistantLetterDetail,
    handleOpenAssistantLetterHistoryViewer,
    handleOpenChatView,
    handleOpenDailyNewspaper,
    handleOpenDailyReviewNarrative,
    handleOpenMonthlyNewspaper,
    handleOpenMonthlyReviewNarrative,
    handleOpenNewspaperHistoryViewer,
    handleOpenAssistantMemoryViewer,
    handleOpenWeeklyNewspaper,
    handleOpenWeeklyReviewNarrative,
    handleRetryMessage,
    isHomeView,
    isLoading,
    isPersonaPanelOpen,
    isShortcutSettingsOpen,
    messagesEndRef,
    onOpenAssistantLetter,
    onOpenDailyNewspaper,
    onOpenDailyReviewNarrative,
    onOpenMonthlyNewspaper,
    onOpenMonthlyReviewNarrative,
    onOpenWeeklyNewspaper,
    onOpenWeeklyReviewNarrative,
    renderAppliedAction,
    revealedAssistantPartCounts,
    resolveMessageDebugViewer,
    resolveSessionPersona,
    setActiveSessionId,
    setDebugViewer,
    setInputText,
    setIsHistoryPanelOpen,
    setIsHomeView,
    setIsPersonaPanelOpen,
    setIsShortcutSettingsOpen,
    setLocalQueryExpansion,
    setMemoryUpdateExpansion,
    setReasoningExpansion,
    setReminderUpdateExpansion,
    setDreamUpdateExpansion,
    setSessions,
    shortcuts,
    sortedSessions,
    theme,
    toggleDreamUpdateExpansion,
    toggleLocalQueryExpansion,
    toggleMemoryUpdateExpansion,
    toggleReasoningExpansion,
    toggleReminderUpdateExpansion,
    userProfile,
    conversationMaxWidthClassName
  } = props;
  return (
    isHomeView ? (
            <AIChatHome
              assistantMemory={assistantMemorySnapshot}
              assistantReminders={assistantReminderSnapshot}
              assistantLetters={assistantLetterSnapshot}
              newspapers={assistantNewspaperSnapshot}
              shortcuts={shortcuts}
              sortedSessions={sortedSessions}
              theme={AI_CHAT_THEME}
              isLoading={isLoading}
              isOverlayOpen={isPersonaPanelOpen || isShortcutSettingsOpen}
              formatConversationTime={formatConversationTime}
              getSessionPersona={resolveSessionPersona}
              onOpenChat={handleOpenChatView}
              onOpenLetters={handleOpenAssistantLetterHistoryViewer}
              onOpenNewspapers={handleOpenNewspaperHistoryViewer}
              onOpenLetter={handleOpenAssistantLetterDetail}
              onOpenNewspaper={(item) => {
                if (item.period === 'daily') {
                  handleOpenDailyNewspaper(item.startDate);
                } else if (item.period === 'weekly' && item.endDate) {
                  handleOpenWeeklyNewspaper(item.startDate, item.endDate);
                } else if (item.period === 'monthly' && item.endDate) {
                  handleOpenMonthlyNewspaper(item.startDate, item.endDate);
                }
              }}
              onOpenMemory={handleOpenAssistantMemoryViewer}
              onOpenHistory={() => setIsHistoryPanelOpen(true)}
              onOpenSettings={() => setIsShortcutSettingsOpen(true)}
              onQuickAddTodo={() => {
                if (activeSession?.templateMeta) {
                  const nextSession = createDefaultSession(activeSession.personaId);
                  setSessions((prev) => [...prev, nextSession]);
                  setActiveSessionId(nextSession.id);
                }
                setIsHomeView(false);
                setInputText(QUICK_ADD_TODO_PREFIX);
                focusComposerAtEnd();
              }}
              onQuickAddNote={() => {
                if (activeSession?.templateMeta) {
                  const nextSession = createDefaultSession(activeSession.personaId);
                  setSessions((prev) => [...prev, nextSession]);
                  setActiveSessionId(nextSession.id);
                }
                setIsHomeView(false);
                setInputText(QUICK_ADD_NOTE_PREFIX);
                focusComposerAtEnd();
              }}
              onQuickAddBackfill={() => {
                if (activeSession?.templateMeta) {
                  const nextSession = createDefaultSession(activeSession.personaId);
                  setSessions((prev) => [...prev, nextSession]);
                  setActiveSessionId(nextSession.id);
                }
                setIsHomeView(false);
                setInputText(QUICK_ADD_BACKFILL_PREFIX);
                focusComposerAtEnd();
              }}
              onSendShortcut={(text) => {
                const latestSession = sortedSessions[0] || activeSession;
                if (!latestSession) return;
                setActiveSessionId(latestSession.id);
                setIsHomeView(false);
                setInputText(text);
                focusComposerAtEnd();
              }}
            />
          ) : (
            <AIBackfillChatConversationPane
            accentMix={accentMix}
            activePersona={activePersona}
            activeSession={activeSession}
            conversationMaxWidthClassName={conversationMaxWidthClassName}
            emptyPromptExampleGroups={emptyPromptExampleGroups}
            emptyStateMaxWidthClassName={emptyStateMaxWidthClassName}
            expandedDreamUpdateMessageIds={expandedDreamUpdateMessageIds}
            expandedLocalQueryMessageIds={expandedLocalQueryMessageIds}
            expandedMemoryUpdateMessageIds={expandedMemoryUpdateMessageIds}
            expandedReasoningMessageIds={expandedReasoningMessageIds}
            expandedReminderUpdateMessageIds={expandedReminderUpdateMessageIds}
            formatAssistantDateTimeForDisplay={formatAssistantDateTimeForDisplay}
            formatConversationTime={formatConversationTime}
            getMessageDebugViewer={resolveMessageDebugViewer}
            isLoading={isLoading}
            markdownComponents={CHAT_MARKDOWN_COMPONENTS}
            messagesEndRef={messagesEndRef}
            onMessageRef={handleMessageElementRef}
            onOpenDailyNewspaper={handleOpenDailyNewspaper}
            onOpenDailyReviewNarrative={handleOpenDailyReviewNarrative}
            onOpenAssistantLetter={handleOpenAssistantLetterDetail}
            onOpenDebugViewer={setDebugViewer}
            onOpenMonthlyNewspaper={handleOpenMonthlyNewspaper}
            onOpenMonthlyReviewNarrative={handleOpenMonthlyReviewNarrative}
            onOpenWeeklyNewspaper={handleOpenWeeklyNewspaper}
            onOpenWeeklyReviewNarrative={handleOpenWeeklyReviewNarrative}
            onRetryMessage={handleRetryMessage}
            renderAppliedAction={renderAppliedAction}
            revealedAssistantPartCounts={revealedAssistantPartCounts}
            setDreamUpdateExpansion={toggleDreamUpdateExpansion}
            setLocalQueryExpansion={toggleLocalQueryExpansion}
            setMemoryUpdateExpansion={toggleMemoryUpdateExpansion}
            setReasoningExpansion={toggleReasoningExpansion}
            setReminderUpdateExpansion={toggleReminderUpdateExpansion}
            theme={AI_CHAT_THEME}
            userProfile={userProfile}
            />
          )
  );
}
