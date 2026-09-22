/**
 * @file AIBackfillChatModal.tsx
 * @input Unified AI chat sessions, local logs/todos/categories/scopes, and user natural-language messages
 * @output Full-screen AI time assistant with session history, persona settings, quick context cache, and direct log/todo application
 * @pos Component (AI Integration)
 * @description Provides the shared AI workspace for chat, backfill, and todo creation. Sessions persist locally, persona style is configurable per session, and recent context can be toggled into the formal AI request path.
 * @updated 2026-09-21: Connects the homepage composer plus action to the shortcut options and recent-session context toggle.
 * @updated 2026-09-21: Sends the complete assistant dictionary and target-day time context into quick-add todo/backfill requests, then resolves returned category, activity, and scope ids before applying them.
 * @updated 2026-09-21: Pins both chat composers to the bottom, reserves message-space beneath them, and removes the plus button circle.
 * @updated 2026-09-21: Extracts view-state and assistant-snapshot state into dedicated hooks while keeping request and background orchestration in this coordinator.
 * @updated 2026-09-21: Extracts chat persistence state initialization into a dedicated session-state hook without changing hydration effects.
 * @updated 2026-09-21: Extracts normalized todo/log action context and assistant message reveal lifecycle into focused support hooks.
 * @updated 2026-09-21: Extracts viewport navigation, keyboard inset handling, and Markdown presentation into focused support modules.
 * @updated 2026-09-22: Hides the bottom composer scrollbar while preserving multi-line scrolling.
 * @updated 2026-09-22: Extracts Dream editing and shared conversation-history orchestration into dedicated support hooks.
 * @updated 2026-09-22: Extracts review command adapters and overwrite confirmation handling into a focused hook.
 * @updated 2026-09-22: Extracts persona, prompt-block, shortcut, and avatar profile editing into a focused hook.
 * @updated 2026-09-22: Extracts assistant memory, reminder, and scheduled-task management into a focused hook.
 * @updated 2026-09-22: Extracts manual assistant debug commands into a focused hook and fixes their retry history path.
 * @updated 2026-09-22: Extracts applied-action undo and principle/self-belief editing into a focused hook.
 * @updated 2026-09-22: Extracts quick-add todo, note, and backfill request handlers into a focused hook.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  Check,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  History,
  Pencil,
  Plus,
  Send,
  Settings,
  Square,
  Undo2,
  X,
  XCircle
} from 'lucide-react';
import {
  aiService,
  type AIDebugExchange,
  type AIPlannedLogToolCall,
  type AIConversationTurn,
  type AITodoToolCall,
  type AITodoUpdateToolCall,
  type AICreateSubtaskToolCall,
  type AIEditLogToolCall,
  type AICreatePrincipleToolCall,
  type AICreateSelfBeliefToolCall
} from '../services/aiService';
import type { AIBackfillToolCall } from '../services/quickAddService';
import { useData } from '../contexts/DataContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useReview } from '../contexts/ReviewContext';
import { useSession } from '../contexts/SessionContext';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { AppView } from '../types';
import type { DailyReview, Log, MonthlyReview, TodoItem, TodoRecurrenceRule, WeeklyReview } from '../types';
import type {
  AssistantAgentConfig,
  AssistantLetter,
  AssistantLetterResultCard,
  AssistantLocalQueryResult,
  AssistantMemory,
  AssistantReasoningSummary,
  AssistantReminder,
  AssistantSystemTrigger,
  DreamUpdateCard
} from '../types/assistant';
import { formatDateKey } from '../utils/aiBackfillUtils';
import { getLocalDateStr } from '../utils/dateUtils';
import {
  formatAssistantDateTimeForDisplay,
  formatAssistantLocalDateTime,
  normalizeAssistantDateTime
} from '../utils/assistantTime';
import { buildAssistantDisplayParts } from '../utils/assistantMessageParts';
import { resolveLatestOrdinaryAssistantBackgroundSession } from '../utils/assistantBackgroundSessionUtils';
import {
  ASSISTANT_CHAT_RESTORED_EVENT,
  notifyAIBackupDataChanged,
  type AssistantChatRestoredDetail
} from '../utils/aiBackupChange';
import {
  ASSISTANT_LOG_SUBMITTED_EVENT,
  buildAssistantLogSubmissionTrigger,
  buildAssistantLogSubmissionUserMessage,
  matchesAssistantLogSubmissionTrigger,
  type AssistantLogSubmittedEventDetail,
  upsertLogForAssistantContext
} from '../utils/assistantLogSubmissionTrigger';
import { getTodoProgressTrackingMode } from '../utils/todoProgressUtils';
import { extractQuickAddBackfillDescription, QUICK_ADD_BACKFILL_PREFIX } from '../utils/quickAddBackfill';
import { extractQuickAddTodoDescription, QUICK_ADD_TODO_PREFIX } from '../utils/quickAddTodo';
import { extractQuickAddNoteDescription, QUICK_ADD_NOTE_PREFIX } from '../utils/quickAddNote';
import AssistantAgent from '../plugins/AssistantAgentPlugin';
import { assistantAgentConfigService } from '../services/assistantAgentConfigService';
import { assistantMemoryService } from '../services/assistantMemoryService';
import { dreamService } from '../services/dreamService';
import { assistantPromptService } from '../services/assistantPromptService';
import { assistantLetterOrchestratorService } from '../services/assistantLetterOrchestratorService';
import { assistantLetterScheduler } from '../services/assistantLetterScheduler';
import { assistantLetterService } from '../services/assistantLetterService';
import { assistantReminderQueueService } from '../services/assistantReminderQueueService';
import { assistantScheduledTaskService } from '../services/assistantScheduledTaskService';
import {
  assistantOrchestratorService,
  type AssistantBackgroundCallHistoryEntry
} from '../services/assistantOrchestratorService';
import { assistantTurnService } from '../services/assistantTurnService';
import { assistantContextBuilder } from '../services/assistantContextBuilder';
import {
  AI_CHAT_STORAGE_READY_EVENT,
  AI_CHAT_STORAGE_SIGNAL_KEY,
  aiChatStorageService
} from '../services/aiChatStorageService';
import {
  assistantActionExecutor,
  rollbackAppliedChatActions,
  type AppliedChatAction,
} from '../services/assistantActionExecutor';
import { PrincipleEditModal } from './PrincipleEditModal';
import { SelfBeliefEditModal } from './SelfBeliefEditModal';
import {
  weeklyReviewTemplateService,
  type WeeklyReviewMethodId,
  type WeeklyReviewTemplateSelectionResult,
} from '../services/weeklyReviewTemplateService';
import {
  monthlyReviewTemplateService,
  type MonthlyReviewMethodId,
  type MonthlyReviewTemplateSelectionResult,
  type MonthlyReviewTemplateSessionMeta
} from '../services/monthlyReviewTemplateService';
import { dailyReviewTemplateService } from '../services/dailyReviewTemplateService';
import type { AssistantToolCall, AssistantUnifiedTurnOutput } from '../types/assistant';
import {
  AIChatDebugViewerOverlay,
  AssistantBackgroundHistoryOverlay,
  AssistantLetterDetailSheet,
  AssistantLetterHistoryOverlay,
  AIChatNewspaperHistoryOverlay
} from './ai-chat/AIBackfillChatOverlays';
import { AIBackfillChatAssistantSettingsSection } from './ai-chat/AIBackfillChatAssistantSettingsSection';
import { renderAppliedChatAction } from './ai-chat/AIBackfillChatAppliedActionRenderer';
import { AIBackfillChatCallSettingsSection } from './ai-chat/AIBackfillChatCallSettingsSection';
import { AIBackfillChatConversationPane } from './ai-chat/AIBackfillChatConversationPane';
import { AIChatHome } from './ai-chat/AIChatHome';
import {
  normalizeDreamRetryYearMonth,
  parseDreamMonthSelection,
  runDreamCommand as runDreamCommandFlow
} from './ai-chat/AIBackfillChatDreamFlow';
import {
  prepareForegroundTurn,
  runOrdinaryForegroundTurn
} from './ai-chat/AIBackfillChatForegroundTurn';
import { AIBackfillChatDreamOverlay } from './ai-chat/AIBackfillChatDreamOverlay';
import { buildAssistantBackgroundTimeline } from './ai-chat/AIBackfillChatBackgroundTimeline';
import { buildAssistantBackgroundTurnRequest } from './ai-chat/AIBackfillChatBackgroundRequest';
import { useAIBackfillChatSessionMutations } from './ai-chat/useAIBackfillChatSessionMutations';
import { buildAssistantReminderDueTrigger } from './ai-chat/AIBackfillChatReminderTrigger';
import { useAIBackfillChatAssistantSettings } from './ai-chat/useAIBackfillChatAssistantSettings';
import { useAIBackfillChatActionHandlers } from './ai-chat/useAIBackfillChatActionHandlers';
import { useAIBackfillChatAssistantTaskHandlers } from './ai-chat/useAIBackfillChatAssistantTaskHandlers';
import { useAIBackfillChatDebugCommands } from './ai-chat/useAIBackfillChatDebugCommands';
import { useAIBackfillChatPersonaProfile } from './ai-chat/useAIBackfillChatPersonaProfile';
import { useAIBackfillChatAppliedActionHandlers } from './ai-chat/useAIBackfillChatAppliedActionHandlers';
import { useAIBackfillChatQuickAddHandlers } from './ai-chat/useAIBackfillChatQuickAddHandlers';
import { useAIBackfillChatDreamManager } from './ai-chat/useAIBackfillChatDreamManager';
import {
  ACTIVE_SESSION_KEY,
  CHAT_SYNC_ENABLED_KEY,
  CHAT_CUSTOM_PROMPT_BLOCKS_KEY,
  CHAT_SHORTCUTS_KEY,
  CHAT_PERSONAS_KEY,
  CHAT_SESSIONS_KEY,
  createDefaultSession,
  DEBUG_MODE_KEY,
  DEFAULT_AI_PERSONAS,
  loadInitialChatState,
  normalizeCustomPromptBlocks,
  normalizeShortcuts,
  normalizePersonas,
  normalizePersistedSessions,
  PERSONA_EMOJI_CHOICES,
  USER_PROFILE_KEY
} from './ai-chat/AIBackfillChatInitialization';
import { AIBackfillChatMemoryOverlay } from './ai-chat/AIBackfillChatMemoryOverlay';
import { AIBackfillChatPersonaSettingsSection } from './ai-chat/AIBackfillChatPersonaSettingsSection';
import { AIChatShortcutSettingsOverlay } from './ai-chat/AIChatShortcutSettingsOverlay';
import {
  runDailyNewspaperWriteback as runDailyNewspaperWritebackFlow,
  runDailyReviewNarrativeWriteback as runDailyReviewNarrativeWritebackFlow,
  runMonthlyNewspaperWriteback as runMonthlyNewspaperWritebackFlow,
  runMonthlyReviewNarrativeWriteback as runMonthlyReviewNarrativeWritebackFlow,
  runWeeklyNewspaperWriteback as runWeeklyNewspaperWritebackFlow,
  runWeeklyReviewNarrativeWriteback as runWeeklyReviewNarrativeWritebackFlow
} from './ai-chat/AIBackfillChatReviewWriteback';
import { AIBackfillChatSettingsOverlay } from './ai-chat/AIBackfillChatSettingsOverlay';
import { useAIBackfillChatViewState } from './ai-chat/useAIBackfillChatViewState';
import { useAIBackfillChatAssistantState } from './ai-chat/useAIBackfillChatAssistantState';
import { useAIBackfillChatReviewCommandHandlers } from './ai-chat/useAIBackfillChatReviewCommandHandlers';
import { useAIBackfillChatSessionState } from './ai-chat/useAIBackfillChatSessionState';
import { accentMix, getAIChatTheme } from './ai-chat/AIBackfillChatTheme';
import { useAIBackfillChatMessageState } from './ai-chat/useAIBackfillChatMessageState';
import { useAIBackfillChatContextData } from './ai-chat/useAIBackfillChatContextData';
import { useAIBackfillChatViewport } from './ai-chat/useAIBackfillChatViewport';
import { CHAT_MARKDOWN_COMPONENTS } from './ai-chat/AIBackfillChatMarkdown';
import { useAIBackfillChatDebugViewer } from './ai-chat/useAIBackfillChatDebugViewer';
import { useAIBackfillChatNewspaperSnapshot } from './ai-chat/useAIBackfillChatNewspaperSnapshot';
import { useAIBackfillChatAssistantDraftValidation } from './ai-chat/useAIBackfillChatAssistantDraftValidation';
import { useAIBackfillChatDreamSelection } from './ai-chat/useAIBackfillChatDreamSelection';
import { useAIBackfillChatConversationHistory } from './ai-chat/useAIBackfillChatConversationHistory';
import {
  AIBackfillChatHistoryOverlay,
  AIBackfillChatNewSessionDialog
} from './ai-chat/AIBackfillChatSessionOverlays';
import {
  createMonthlyReviewTemplateSession,
  createWeeklyReviewTemplateSession,
  runMonthlyReviewTemplateChatTurn,
  runMonthlyReviewTemplateGuidedSelection,
  runMonthlyReviewTemplateOpeningTurn as runMonthlyReviewTemplateOpeningTurnFlow,
  runWeeklyReviewTemplateChatTurn,
  runWeeklyReviewTemplateGuidedSelection,
  runWeeklyReviewTemplateOpeningTurn as runWeeklyReviewTemplateOpeningTurnFlow
} from './ai-chat/AIBackfillChatTemplateFlow';
import {
  mutateChatSessions,
  replaceSessionMessage,
  serializeConversationTurnsForAssistantContext,
  resolveMonthlyReviewTemplateRangeMeta,
  resolveMonthlyReviewTemplateSessionMeta,
  resolveWeeklyReviewTemplateRangeMeta,
  resolveWeeklyReviewTemplateSessionMeta,
  safeJsonParse,
  sortChatSessionsByUpdatedAt,
} from './ai-chat/AIBackfillChatSessionHelpers';
import {
  buildAssistantCurrentTimeSnapshot,
  buildDebugBlocks,
  buildMemoryUpdateSections,
  buildPersonaPrompt,
  createSessionTitleFromUserMessage,
  dedupeStringArray,
  formatActionDate,
  formatAssistantReminderSnapshot,
  formatConversationTime,
  formatDateLabel,
  formatLocalDateTimeContext,
  formatTimeRange,
  getAssistantBackgroundRequestStatusLabel,
  getAssistantBackgroundTriggerLabel,
  getErrorDebugSections,
  getRetryableAIErrorMessage,
  isAbortError,
  normalizeAssistantNativeDiagnostics
} from './ai-chat/AIBackfillChatHelpers';
import {
  type AIChatDailyReviewWritebackResult,
  type AIChatDebugSection,
  type AIChatDreamUpdateCard,
  type AIChatDailyNewspaperWritebackResult,
  type AIChatMemoryUpdateSection,
  type AIChatMessage,
  type AIChatMonthlyNewspaperWritebackResult,
  type AIChatMonthlyReviewWritebackResult,
  type AIChatCustomPromptBlock,
  type AIChatPersona,
  type AIChatSession,
  type AIChatWeeklyNewspaperWritebackResult,
  type AIChatWeeklyReviewWritebackResult,
  type AISettingsMainTab,
  type AssistantBackgroundTurnRequestOptions,
  type ChatTone,
  type DailyNewspaperWritebackConfirmationState,
  type DailyReviewWritebackConfirmationState,
  type DreamMonthRangeSelection,
  type InitialChatState,
  type MonthlyNewspaperWritebackConfirmationState,
  type WeeklyNewspaperWritebackConfirmationState,
  DEFAULT_ASSISTANT_EDITABLE_MEMORY_DRAFTS,
  DEFAULT_ASSISTANT_REMINDER_DRAFTS,
  DEFAULT_ASSISTANT_SCHEDULED_TASK_DRAFTS,
  LOG_EDIT_REQUEST_PATTERN,
  LOG_EDIT_SUCCESS_REPLY_PATTERN,
  ASSISTANT_SCHEDULED_TASK_WEEKDAY_OPTIONS,
  PersonaAvatar,
  formatAssistantScheduledTaskRecurrence
} from './ai-chat/AIBackfillChatShared';

interface AIBackfillChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  displayMode?: 'modal' | 'desktop-widget';
  forceLightTheme?: boolean;
  desktopWidgetTransitionPhase?: 'idle' | 'hiding' | 'showing';
  edgeHidden?: boolean;
  hiddenEdge?: 'left' | 'right' | null;
  onHideToEdge?: () => void;
  onRestoreFromEdge?: () => void;
  onOpenMainApp?: () => void;
  targetDate?: Date;
  targetSessionId?: string;
  targetMessageId?: string;
  initialInputText?: string;
  registerBackHandler?: (handler: (() => boolean) | null) => void;
  onUnreadAssistantMessage?: (count?: number) => void;
  onMarkRead?: () => void;
  onRequestReturnToAI?: () => void;
}

interface ForegroundSendOptions {
  replaceMessageId?: string;
  retrySourceUserMessageId?: string;
}

const ASSISTANT_CHAT_UPDATED_EVENT = assistantOrchestratorService.getAssistantDecisionEventName();
const clampNumber = (value: number, min: number, max: number): number => (
  Math.min(max, Math.max(min, value))
);

const createChatLibraryId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const getTodayDateKey = (): string => formatDateKey(new Date());

export const AIBackfillChatModal: React.FC<AIBackfillChatModalProps> = ({
  isOpen,
  onClose,
  displayMode = 'modal',
  forceLightTheme = false,
  desktopWidgetTransitionPhase = 'idle',
  edgeHidden = false,
  hiddenEdge = null,
  onHideToEdge,
  onRestoreFromEdge,
  onOpenMainApp,
  targetDate,
  targetSessionId,
  targetMessageId,
  initialInputText,
  registerBackHandler,
  onUnreadAssistantMessage,
  onMarkRead,
  onRequestReturnToAI
}) => {
  const {
    initialState,
    personas, setPersonas,
    customPromptBlocks, setCustomPromptBlocks,
    shortcuts, setShortcuts,
    sessions, setSessions,
    isChatStorageReady, setIsChatStorageReady,
    isChatStorageHydratingRef,
    activeSessionId, setActiveSessionId,
    debugMode, setDebugMode,
    userProfile, setUserProfile,
    chatSyncEnabled, setChatSyncEnabled
  } = useAIBackfillChatSessionState();
  const {
    mutateSession,
    replaceMessage,
    updateAppliedActionStatus,
    appendSystemMessage,
    appendUserMessage,
    updateWeeklyReviewTemplateStage,
    appendDebugSectionToMessage
  } = useAIBackfillChatSessionMutations(setSessions);
  const {
    inputText, setInputText, isLoading, setIsLoading, activeRequestId, setActiveRequestId,
    isHistoryPanelOpen, setIsHistoryPanelOpen, isPersonaPanelOpen, setIsPersonaPanelOpen,
    isHomeView, setIsHomeView, isShortcutSettingsOpen, setIsShortcutSettingsOpen,
    isComposerMenuOpen, setIsComposerMenuOpen, isNewSessionDialogOpen, setIsNewSessionDialogOpen,
    activeSettingsMainTab, setActiveSettingsMainTab, debugViewer, setDebugViewer,
    expandedDebugBlockKeys, setExpandedDebugBlockKeys, editingSessionId, setEditingSessionId,
    editingSessionTitle, setEditingSessionTitle, deleteConfirmSessionId, setDeleteConfirmSessionId,
    deleteConfirmPersonaId, setDeleteConfirmPersonaId, isUploadingAvatar, setIsUploadingAvatar,
    isEmojiEditorOpen, setIsEmojiEditorOpen, emojiDraft, setEmojiDraft,
    isUploadingUserAvatar, setIsUploadingUserAvatar, isUserEmojiEditorOpen, setIsUserEmojiEditorOpen,
    userEmojiDraft, setUserEmojiDraft, isAssistantMemoryViewerOpen, setIsAssistantMemoryViewerOpen,
    isDreamViewerOpen, setIsDreamViewerOpen, isAssistantLetterHistoryViewerOpen, setIsAssistantLetterHistoryViewerOpen,
    isNewspaperHistoryViewerOpen, setIsNewspaperHistoryViewerOpen, isAssistantLetterDetailSheetOpen, setIsAssistantLetterDetailSheetOpen,
    selectedAssistantLetterId, setSelectedAssistantLetterId, assistantLetterDeleteTargetId, setAssistantLetterDeleteTargetId,
    dreamMonthSelectionState, setDreamMonthSelectionState, dailyReviewWritebackConfirmation, setDailyReviewWritebackConfirmation,
    dailyNewspaperWritebackConfirmation, setDailyNewspaperWritebackConfirmation, weeklyNewspaperWritebackConfirmation, setWeeklyNewspaperWritebackConfirmation,
    monthlyNewspaperWritebackConfirmation, setMonthlyNewspaperWritebackConfirmation, selectedDreamTopicId, setSelectedDreamTopicId,
    isDreamTopicNoteExpanded, setIsDreamTopicNoteExpanded, dreamTopicDrafts, setDreamTopicDrafts,
    isDreamTopicComposerOpen, setIsDreamTopicComposerOpen, editingDreamTopicId, setEditingDreamTopicId,
    isDreamResetConfirmOpen, setIsDreamResetConfirmOpen, dreamTopicDeleteTargetId, setDreamTopicDeleteTargetId,
    editingDreamEntryId, setEditingDreamEntryId, dreamEntryDrafts, setDreamEntryDrafts, dreamEntryDeleteTargetId, setDreamEntryDeleteTargetId,
    assistantEditableMemoryDrafts, setAssistantEditableMemoryDrafts, assistantEditableMemoryComposerKey, setAssistantEditableMemoryComposerKey,
    assistantEditableMemoryDeleteTarget, setAssistantEditableMemoryDeleteTarget, assistantReminderDrafts, setAssistantReminderDrafts,
    isAssistantReminderComposerOpen, setIsAssistantReminderComposerOpen, assistantReminderDeleteTarget, setAssistantReminderDeleteTarget,
    assistantScheduledTaskDrafts, setAssistantScheduledTaskDrafts, isAssistantScheduledTaskComposerOpen, setIsAssistantScheduledTaskComposerOpen,
    assistantScheduledTaskDeleteTarget, setAssistantScheduledTaskDeleteTarget, expandedMemoryUpdateMessageIds, setExpandedMemoryUpdateMessageIds,
    expandedReasoningMessageIds, setExpandedReasoningMessageIds, expandedDreamUpdateMessageIds, setExpandedDreamUpdateMessageIds,
    expandedReminderUpdateMessageIds, setExpandedReminderUpdateMessageIds, expandedLocalQueryMessageIds, setExpandedLocalQueryMessageIds,
    revealedAssistantPartCounts, setRevealedAssistantPartCounts, editingPrincipleId, setEditingPrincipleId,
    principleEditFormData, setPrincipleEditFormData, editingSelfBeliefId, setEditingSelfBeliefId,
    selfBeliefTitleDraft, setSelfBeliefTitleDraft, selfBeliefDescriptionDrafts, setSelfBeliefDescriptionDrafts,
    newSelfBeliefDescriptionText, setNewSelfBeliefDescriptionText, editingSelfBeliefDescriptionId, setEditingSelfBeliefDescriptionId,
    editingSelfBeliefDescriptionText, setEditingSelfBeliefDescriptionText, keyboardBottomInset, setKeyboardBottomInset,
    activeRequestRef, retryingMessageIdRef, isOpenRef, wasOpenRef, homeWasOpenRef,
    processingDueReminderIdsRef, isProcessingAssistantLetterRef, assistantPartRevealTimeoutsRef,
    revealedAssistantPartCountsRef, hydratedRevealSessionIdsRef, assistantRevealTargetCountsRef,
    avatarInputRef, userAvatarInputRef, composerTextareaRef, composerMenuRef, pendingHomeMessageRef,
    messagesEndRef, messageElementRefs, handledNavigationKeyRef, handledAssistantTriggerIdsRef,
    processingAssistantTriggerIdsRef, hasCompletedStartupReminderCatchupRef, visualViewportBaselineRef,
    focusComposerAtEnd, handleMessageElementRef
  } = useAIBackfillChatViewState(isOpen);
  const {
    assistantAgentConfig, setAssistantAgentConfig,
    assistantAgentIntervalDrafts, setAssistantAgentIntervalDrafts,
    assistantAgentQuietHoursDrafts, setAssistantAgentQuietHoursDrafts,
    assistantLetterDrafts, setAssistantLetterDrafts,
    assistantMemorySnapshot, setAssistantMemorySnapshot,
    dreamSnapshot, setDreamSnapshot,
    assistantReminderSnapshot, setAssistantReminderSnapshot,
    assistantScheduledTaskSnapshot, setAssistantScheduledTaskSnapshot,
    assistantLetterSnapshot, setAssistantLetterSnapshot,
    assistantBackgroundCallHistory, setAssistantBackgroundCallHistory,
    assistantNativeDiagnostics, setAssistantNativeDiagnostics
  } = useAIBackfillChatAssistantState();
  const [isAssistantBackgroundHistoryViewerOpen, setIsAssistantBackgroundHistoryViewerOpen] = useState(false);
  const dreamUiHandlersRef = useRef({
    resetDreamEntryUi: () => undefined,
    resetDreamTopicUi: () => undefined,
    handleCloseDreamViewer: () => undefined
  });

  const isStopActionVisible = isLoading || activeRequestId !== null;
  const isDesktopWidgetMode = displayMode === 'desktop-widget';

  const { logs, setLogs, todos, setTodos, todoCategories, isReady: isDataReady } = useData();
  const {
    dailyReviews,
    setDailyReviews,
    weeklyReviews,
    setWeeklyReviews,
    monthlyReviews,
    setMonthlyReviews,
    reviewTemplates,
    checkTemplates,
    isReady: isReviewReady
  } = useReview();
  const { activeSessions } = useSession();
  const { categories, scopes, isReady: isCategoryScopeReady } = useCategoryScope();
  const { todoUpdateContext, subtaskParentContext, logEditContext } = useAIBackfillChatContextData({
    categories,
    logs,
    scopes,
    todoCategories,
    todos
  });
  const assistantNewspaperSnapshot = useAIBackfillChatNewspaperSnapshot(
    dailyReviews,
    weeklyReviews,
    monthlyReviews
  );
  const {
    setCurrentView,
    setEditingLog,
    setInitialLogTimes,
    setIsAddModalOpen,
    setEditingTodo,
    setNewTodoDraft,
    setIsTodoModalOpen,
    setTodoCategoryToAdd,
    setCurrentReviewDate,
    setCurrentDailyReviewInitialTab,
    setIsDailyReviewOpen,
    setCurrentDailyNewspaperDate,
    setIsDailyNewspaperOpen,
    setCurrentWeeklyNewspaperStart,
    setCurrentWeeklyNewspaperEnd,
    setIsWeeklyNewspaperOpen,
    setCurrentWeeklyReviewStart,
    setCurrentWeeklyReviewEnd,
    setCurrentWeeklyReviewInitialTab,
    setIsWeeklyReviewOpen,
    setCurrentMonthlyNewspaperStart,
    setCurrentMonthlyNewspaperEnd,
    setIsMonthlyNewspaperOpen,
    setCurrentMonthlyReviewStart,
    setCurrentMonthlyReviewEnd,
    setCurrentMonthlyReviewInitialTab,
    setIsMonthlyReviewOpen
  } = useNavigation();
  const { addToast } = useToast();
  const { autoLinkRules, autoApplyAutoLinkRules, colorScheme, themeMode } = useSettings();
  const isDarkAIChatTheme = !forceLightTheme && themeMode === 'dark';
  const AI_CHAT_THEME = useMemo(
    () => getAIChatTheme(colorScheme === 'default', isDarkAIChatTheme),
    [colorScheme, isDarkAIChatTheme]
  );

  const defaultTargetDate = useMemo(() => {
    if (targetDate) {
      const clone = new Date(targetDate);
      clone.setHours(12, 0, 0, 0);
      return clone;
    }

    return new Date();
  }, [targetDate]);

  const defaultDateKey = useMemo(() => formatDateKey(defaultTargetDate), [defaultTargetDate]);
  const isAssistantBackgroundContextReady = isDataReady
    && isReviewReady
    && isCategoryScopeReady;
  const personaMap = useMemo(() => new Map(personas.map((persona) => [persona.id, persona])), [personas]);
  const {
    assistantAgentIntervalErrors,
    assistantAgentQuietHoursErrors,
    assistantLetterDraftErrors,
    nextAssistantLetterPreview
  } = useAIBackfillChatAssistantDraftValidation({
    assistantAgentConfig,
    assistantAgentIntervalDrafts,
    assistantAgentQuietHoursDrafts,
    assistantLetterDrafts
  });
  const weeklyReviewMethodOptions = useMemo(
    () => weeklyReviewTemplateService.listMethodOptions(),
    []
  );
  const monthlyReviewMethodOptions = useMemo(
    () => monthlyReviewTemplateService.listMethodOptions(),
    []
  );
  const sortedSessions = useMemo(() => sortChatSessionsByUpdatedAt(sessions), [sessions]);
  const desktopWidgetPreferredSession = useMemo(
    () => resolveLatestOrdinaryAssistantBackgroundSession(sessions) || sortedSessions[0] || null,
    [sessions, sortedSessions]
  );
  const activeSession = useMemo(() => {
    if (isDesktopWidgetMode) {
      return desktopWidgetPreferredSession;
    }

    return sessions.find((session) => session.id === activeSessionId) || sortedSessions[0] || null;
  }, [activeSessionId, desktopWidgetPreferredSession, isDesktopWidgetMode, sessions, sortedSessions]);
  const {
    clearAssistantPartRevealTimeouts,
    resetAssistantPartRevealState,
    toggleMemoryUpdateExpansion,
    toggleReasoningExpansion,
    toggleDreamUpdateExpansion,
    toggleReminderUpdateExpansion,
    toggleLocalQueryExpansion
  } = useAIBackfillChatMessageState({
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
  });
  const { scrollToLatestMessage } = useAIBackfillChatViewport({
    isOpen,
    targetSessionId,
    targetMessageId,
    activeSessionId,
    activeSession,
    sessions,
    isLoading,
    setActiveSessionId,
    setIsHomeView,
    setKeyboardBottomInset,
    messagesEndRef,
    messageElementRefs,
    handledNavigationKeyRef,
    wasOpenRef,
    visualViewportBaselineRef,
    composerTextareaRef
  });
  const activeWeeklyReviewShortcutOptions = useMemo(() => {
    if (activeSession?.templateMeta?.templateType !== 'weekly_review') {
      return [];
    }

    if (activeSession.templateMeta.stage === 'select_range') {
      return [
        { key: 'current', label: '本周', value: '本周' },
        { key: 'previous', label: '上周', value: '上周' }
      ];
    }

    if (activeSession.templateMeta.stage === 'select_method') {
      return weeklyReviewMethodOptions.map((method) => ({
        key: method.id,
        label: method.title,
        value: method.title
      }));
    }

    return [];
  }, [activeSession, weeklyReviewMethodOptions]);
  const activeMonthlyReviewShortcutOptions = useMemo(() => {
    if (activeSession?.templateMeta?.templateType !== 'monthly_review') {
      return [];
    }

    if (activeSession.templateMeta.stage === 'select_range') {
      return [
        { key: 'current', label: '本月', value: '本月' },
        { key: 'previous', label: '上月', value: '上月' }
      ];
    }

    if (activeSession.templateMeta.stage === 'select_method') {
      return monthlyReviewMethodOptions.map((method) => ({
        key: method.id,
        label: method.title,
        value: method.title
      }));
    }

    return [];
  }, [activeSession, monthlyReviewMethodOptions]);
  const { activeDreamTopic, activeDreamEntries } = useAIBackfillChatDreamSelection(
    dreamSnapshot,
    selectedDreamTopicId
  );
  useEffect(() => {
    if (!dreamSnapshot.topics.some((topic) => topic.id === selectedDreamTopicId)) {
      setSelectedDreamTopicId(dreamSnapshot.topics[0]?.id || '');
    }
  }, [dreamSnapshot.topics, selectedDreamTopicId]);

  useEffect(() => {
    setIsDreamTopicNoteExpanded(false);
  }, [selectedDreamTopicId]);

  useEffect(() => {
    if (editingDreamEntryId && !dreamSnapshot.entries.some((entry) => entry.id === editingDreamEntryId)) {
      dreamUiHandlersRef.current.resetDreamEntryUi();
    }
  }, [dreamSnapshot.entries, editingDreamEntryId]);
  const activePersona = useMemo(
    () => (activeSession ? personaMap.get(activeSession.personaId) : undefined) || personas[0] || DEFAULT_AI_PERSONAS[0],
    [activeSession, personaMap, personas]
  );
  const shouldUseNativeReminderTriggerDispatch = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  const assistantBackgroundTimeline = useMemo(
    () => buildAssistantBackgroundTimeline({
      backgroundCallHistory: assistantBackgroundCallHistory,
      nativeDiagnostics: assistantNativeDiagnostics
    }),
    [assistantBackgroundCallHistory, assistantNativeDiagnostics]
  );

  const resolveMessageDebugViewer = useAIBackfillChatDebugViewer({
    debugMode,
    activePersona,
    activeSession,
    assistantBackgroundCallHistory
  });

  useEffect(() => {
    setEmojiDraft(activePersona.avatarIcon || '✨');
    setIsEmojiEditorOpen(false);
  }, [activePersona.id, activePersona.avatarIcon]);

  useEffect(() => {
    setExpandedDebugBlockKeys(new Set());
  }, [debugViewer]);

  useEffect(() => {
    setUserEmojiDraft(userProfile.avatarIcon || '');
    setIsUserEmojiEditorOpen(false);
  }, [userProfile.avatarIcon, userProfile.avatarImage]);

  useEffect(() => {
    revealedAssistantPartCountsRef.current = revealedAssistantPartCounts;
  }, [revealedAssistantPartCounts]);

  useEffect(() => {
    return () => {
      clearAssistantPartRevealTimeouts();
    };
  }, [clearAssistantPartRevealTimeouts]);


  useEffect(() => {
    const serialized = JSON.stringify(personas);
    if (localStorage.getItem(CHAT_PERSONAS_KEY) !== serialized) {
      localStorage.setItem(CHAT_PERSONAS_KEY, serialized);
      notifyAIBackupDataChanged();
    }
  }, [personas]);

  useEffect(() => {
    const serialized = JSON.stringify(customPromptBlocks);
    if (localStorage.getItem(CHAT_CUSTOM_PROMPT_BLOCKS_KEY) !== serialized) {
      localStorage.setItem(CHAT_CUSTOM_PROMPT_BLOCKS_KEY, serialized);
      notifyAIBackupDataChanged();
    }
  }, [customPromptBlocks]);

  useEffect(() => {
    const serialized = JSON.stringify(shortcuts);
    if (localStorage.getItem(CHAT_SHORTCUTS_KEY) !== serialized) {
      localStorage.setItem(CHAT_SHORTCUTS_KEY, serialized);
      notifyAIBackupDataChanged();
    }
  }, [shortcuts]);

  useEffect(() => {
    if (!isChatStorageReady) {
      return;
    }

    const serialized = JSON.stringify(sessions);
    if (JSON.stringify(aiChatStorageService.getSessions()) !== serialized) {
      aiChatStorageService.setSessions(sessions);
      if (!isChatStorageHydratingRef.current) {
        notifyAIBackupDataChanged();
      }
    }
    isChatStorageHydratingRef.current = false;
  }, [isChatStorageReady, sessions]);

  useEffect(() => {
    if (!isChatStorageReady) {
      return;
    }
    if (activeSessionId) {
      if (localStorage.getItem(ACTIVE_SESSION_KEY) !== activeSessionId) {
        localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
        notifyAIBackupDataChanged();
      }
    }
  }, [activeSessionId]);

  useEffect(() => {
    const serialized = String(debugMode);
    if (localStorage.getItem(DEBUG_MODE_KEY) !== serialized) {
      localStorage.setItem(DEBUG_MODE_KEY, serialized);
      notifyAIBackupDataChanged();
    }
  }, [debugMode]);

  useEffect(() => {
    const serialized = JSON.stringify(userProfile);
    if (localStorage.getItem(USER_PROFILE_KEY) !== serialized) {
      localStorage.setItem(USER_PROFILE_KEY, serialized);
      notifyAIBackupDataChanged();
    }
  }, [userProfile]);

  useEffect(() => {
    const serialized = String(chatSyncEnabled);
    if (localStorage.getItem(CHAT_SYNC_ENABLED_KEY) !== serialized) {
      localStorage.setItem(CHAT_SYNC_ENABLED_KEY, serialized);
      notifyAIBackupDataChanged();
    }
  }, [chatSyncEnabled]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!isChatStorageReady || sessions.length === 0) {
      if (!isChatStorageReady) {
        return;
      }
      const fallbackSession = createDefaultSession(personas[0]?.id || DEFAULT_AI_PERSONAS[0].id);
      setSessions([fallbackSession]);
      setActiveSessionId(fallbackSession.id);
      return;
    }

    if (!sessions.some((session) => session.id === activeSessionId)) {
      setActiveSessionId((desktopWidgetPreferredSession || sortedSessions[0]).id);
    }
  }, [activeSessionId, desktopWidgetPreferredSession, isChatStorageReady, personas, sessions, sortedSessions]);

  useEffect(() => {
    if (!isDesktopWidgetMode || typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (
        event.storageArea !== localStorage
        || (event.key !== CHAT_SESSIONS_KEY && event.key !== AI_CHAT_STORAGE_SIGNAL_KEY)
      ) {
        return;
      }

      reloadPersistedChatSessions();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isDesktopWidgetMode, personas]);

  useEffect(() => {
    if (isOpen) {
      onMarkRead?.();
      if (isDesktopWidgetMode) {
        setIsHomeView(false);
      } else if (!homeWasOpenRef.current) {
        setIsHomeView(Boolean(!targetSessionId && !targetMessageId && !initialInputText));
      }
    }
    homeWasOpenRef.current = isOpen;
  }, [initialInputText, isDesktopWidgetMode, isOpen, onMarkRead, targetMessageId, targetSessionId]);

  useEffect(() => {
    if (!isOpen || !initialInputText) {
      return;
    }

    setIsHomeView(false);

    if (activeSession?.templateMeta) {
      const nextSession = createDefaultSession(activeSession.personaId);
      setSessions((prev) => [...prev, nextSession]);
      setActiveSessionId(nextSession.id);
      setInputText(initialInputText);
      focusComposerAtEnd();
      return;
    }

    setInputText(initialInputText);
    focusComposerAtEnd();
  }, [activeSession, focusComposerAtEnd, initialInputText, isOpen]);

  useEffect(() => {
    if (activeSession && !personaMap.has(activeSession.personaId)) {
      setSessions((prev) => prev.map((session) => (
        session.id === activeSession.id
          ? {
            ...session,
            personaId: personas[0]?.id || DEFAULT_AI_PERSONAS[0].id,
            updatedAt: session.updatedAt
          }
          : session
      )));
    }
  }, [activeSession, personaMap, personas]);

  useEffect(() => (
    () => {
      activeRequestRef.current?.controller.abort();
      activeRequestRef.current = null;
    }
  ), []);

  const {
    resolveSessionPersona,
    buildConversationHistoryFromMessages,
    buildConversationHistory,
    getBackgroundPersonaDisplayName,
    narrowHistoryForTimeSensitiveTurn,
    buildRetryConversationHistory,
    conversationHistoryCache
  } = useAIBackfillChatConversationHistory({ sessions, personas, personaMap });

  const reloadPersistedChatSessions = () => {
    setSessions(normalizePersistedSessions(
      aiChatStorageService.getSessions(),
      personas,
      getLocalDateStr
    ));
  };

  useEffect(() => {
    let cancelled = false;
    const handleChatStorageReady = () => {
      if (cancelled) {
        return;
      }
      isChatStorageHydratingRef.current = true;
      reloadPersistedChatSessions();
      refreshAssistantBackgroundCallHistory();
      setIsChatStorageReady(true);
    };

    window.addEventListener(AI_CHAT_STORAGE_READY_EVENT, handleChatStorageReady);
    void aiChatStorageService.initialize().then(handleChatStorageReady);
    return () => {
      cancelled = true;
      window.removeEventListener(AI_CHAT_STORAGE_READY_EVENT, handleChatStorageReady);
    };
  }, [personas]);

  const refreshAssistantMemorySnapshot = () => {
    setAssistantMemorySnapshot(assistantMemoryService.getMemory());
  };

  const {
    handleUpdateAssistantAgentConfig,
    handleAssistantAgentIntervalDraftChange,
    handleAssistantAgentQuietHoursDraftChange,
    handleAssistantLetterDraftChange,
    commitAssistantAgentIntervalDraft,
    commitAssistantAgentQuietHoursDraft,
    handleToggleAssistantQuietHours,
    commitAssistantLetterDraft,
    handleToggleAssistantLetterEnabled
  } = useAIBackfillChatAssistantSettings({
    assistantAgentConfig,
    setAssistantAgentConfig,
    assistantAgentIntervalDrafts,
    setAssistantAgentIntervalDrafts,
    assistantAgentQuietHoursDrafts,
    setAssistantAgentQuietHoursDrafts,
    assistantLetterDrafts,
    setAssistantLetterDrafts,
    refreshAssistantMemorySnapshot
  });

  const refreshDreamSnapshot = () => {
    setDreamSnapshot(dreamService.getState());
  };

  const refreshAssistantScheduledTaskSnapshot = () => {
    setAssistantScheduledTaskSnapshot(assistantScheduledTaskService.listTasks());
  };

  const refreshAssistantReminderSnapshot = () => {
    setAssistantReminderSnapshot(assistantReminderQueueService.listReminders());
  };

  const refreshAssistantLetterSnapshot = () => {
    const letters = assistantLetterService.listLetters();
    setAssistantLetterSnapshot(letters);
    setSelectedAssistantLetterId((current) => (
      current && letters.some((letter) => letter.id === current)
        ? current
        : letters[0]?.id || null
    ));
  };

  const syncAssistantScheduledTasks = useCallback((referenceNow = new Date()) => {
    const result = assistantScheduledTaskService.syncScheduledTaskReminders(referenceNow);
    setAssistantScheduledTaskSnapshot(result.tasks);
    setAssistantReminderSnapshot(assistantReminderQueueService.listReminders());
    setAssistantMemorySnapshot(assistantMemoryService.getMemory());
    return result;
  }, []);

  const hydrateAssistantReminderSnapshotFromNative = useCallback(async () => {
    await assistantReminderQueueService.hydrateFromNative();
    syncAssistantScheduledTasks(new Date());
    return assistantReminderQueueService.listReminders();
  }, [syncAssistantScheduledTasks]);

  const refreshAssistantBackgroundCallHistory = () => {
    setAssistantBackgroundCallHistory(assistantOrchestratorService.listBackgroundCallHistory());
  };

  const shouldShowBackgroundSystemNotification = useCallback(() => (
    typeof document !== 'undefined' && document.hidden
  ), []);

  const refreshAssistantNativeDiagnostics = useCallback(async () => {
    try {
      const result = await AssistantAgent.listDiagnostics();
      const normalizedEntries = normalizeAssistantNativeDiagnostics(result.entries);
      const backgroundTargetSessionId = resolveLatestOrdinaryAssistantBackgroundSession(sessions)?.id;
      setAssistantNativeDiagnostics(normalizedEntries);

      const hydrationResult = assistantOrchestratorService.hydrateNativeCompletedReplies(normalizedEntries, {
        targetSessionId: backgroundTargetSessionId,
        showSystemNotification: shouldShowBackgroundSystemNotification()
      });
      if (hydrationResult.didHydrateHistory) {
        refreshAssistantBackgroundCallHistory();
      }
      if (hydrationResult.surfacedMessages.length > 0) {
        reloadPersistedChatSessions();
        if (!isOpenRef.current) {
          onUnreadAssistantMessage?.(hydrationResult.surfacedMessages.length);
          const backgroundTargetSession = sessions.find((session) => session.id === backgroundTargetSessionId);
          const personaName = getBackgroundPersonaDisplayName(backgroundTargetSession);
          addToast('info', `${personaName}：${hydrationResult.surfacedMessages[hydrationResult.surfacedMessages.length - 1]}`);
        }
      }
      if (hydrationResult.didUpdateMemory) {
        refreshAssistantMemorySnapshot();
      }
      if (hydrationResult.didUpdateReminders) {
        syncAssistantScheduledTasks(new Date());
      }
    } catch (error) {
      console.error('[AIBackfillChatModal] Failed to load native assistant diagnostics', error);
    }
  }, [addToast, getBackgroundPersonaDisplayName, onUnreadAssistantMessage, sessions, shouldShowBackgroundSystemNotification, syncAssistantScheduledTasks]);

  const resetAssistantEditableMemoryUi = () => {
    setAssistantEditableMemoryDrafts(DEFAULT_ASSISTANT_EDITABLE_MEMORY_DRAFTS);
    setAssistantEditableMemoryComposerKey(null);
    setAssistantEditableMemoryDeleteTarget(null);
  };

  const resetAssistantReminderUi = () => {
    setAssistantReminderDrafts(DEFAULT_ASSISTANT_REMINDER_DRAFTS);
    setIsAssistantReminderComposerOpen(false);
    setAssistantReminderDeleteTarget(null);
  };

  const resetAssistantScheduledTaskUi = () => {
    setAssistantScheduledTaskDrafts(DEFAULT_ASSISTANT_SCHEDULED_TASK_DRAFTS);
    setIsAssistantScheduledTaskComposerOpen(false);
    setAssistantScheduledTaskDeleteTarget(null);
  };

  const notifyAssistantTaskStateChanged = useCallback(() => {
    void AssistantAgent.notifyTaskStateChanged().catch((error) => {
      console.error('[AIBackfillChatModal] Failed to notify assistant agent about task-state changes', error);
    });
  }, []);

  const getBackgroundTargetSession = useCallback((): AIChatSession | undefined => (
    resolveLatestOrdinaryAssistantBackgroundSession(sessions)
  ), [sessions]);

  const buildAssistantReminderSummary = useCallback((): string | undefined => {
    const summary = formatAssistantReminderSnapshot(assistantReminderQueueService.listReminders());
    return summary === '暂无' ? undefined : summary;
  }, []);

  const buildForegroundAssistantReminderSummary = useCallback((): string | undefined => (
    assistantAgentConfig.enabled ? buildAssistantReminderSummary() : undefined
  ), [assistantAgentConfig.enabled, buildAssistantReminderSummary]);

  const buildForegroundAssistantMemory = useCallback((): AssistantMemory => (
    assistantAgentConfig.longTermMemoryEnabled
      ? assistantMemoryService.getMemory()
      : {
        version: 1,
        updatedAt: new Date().toISOString(),
        profileMemory: [],
        preferenceMemory: [],
        activeReminders: [],
        recentDecisions: []
      }
  ), [assistantAgentConfig.longTermMemoryEnabled]);

  const buildDreamContext = useCallback((query?: string): string | undefined => (
    dreamService.buildContext({ query })
  ), []);

  const buildDreamRangeDictionaryContext = useCallback((rangeStartDate: string, rangeEndDate: string) => (
    assistantContextBuilder.buildDictionaryContext({
      categories,
      scopes,
      todoCategories,
      todos: todos
        .filter((todo) => (
          !todo.isCompleted
          || (typeof todo.completedAt === 'string'
            && getLocalDateStr(new Date(todo.completedAt)) >= rangeStartDate
            && getLocalDateStr(new Date(todo.completedAt)) <= rangeEndDate)
          || (typeof todo.scheduledDate === 'string' && todo.scheduledDate >= rangeStartDate && todo.scheduledDate <= rangeEndDate)
          || (typeof todo.deadlineDate === 'string' && todo.deadlineDate >= rangeStartDate && todo.deadlineDate <= rangeEndDate)
        ))
        .slice(0, 120),
      logs: logs
        .filter((log) => {
          const logDate = formatDateKey(new Date(log.startTime));
          return logDate >= rangeStartDate && logDate <= rangeEndDate;
        })
        .sort((left, right) => left.startTime - right.startTime)
        .slice(0, 200)
    })
  ), [categories, logs, scopes, todoCategories, todos]);

  const buildAssistantDictionaryContext = useCallback((logsInput: Log[] = logs) => assistantContextBuilder.buildDictionaryContext({
    categories,
    scopes,
    todoCategories,
    todos: todos.filter((todo) => !todo.isCompleted).slice(0, 60),
    logs: logsInput
      .filter((log) => formatDateKey(new Date(log.startTime)) === defaultDateKey)
      .sort((left, right) => left.startTime - right.startTime)
      .slice(0, 60)
  }), [categories, defaultDateKey, logs, scopes, todoCategories, todos]);

  const buildQuickAddNoteDictionaryContext = useCallback(() => {
    const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const candidateLogs = logs
      .filter((log) => formatDateKey(new Date(log.startTime)) === defaultDateKey || log.endTime >= recentCutoff)
      .sort((left, right) => right.startTime - left.startTime)
      .slice(0, 80);

    return assistantContextBuilder.buildDictionaryContext({
      categories,
      scopes,
      todoCategories,
      todos: todos.filter((todo) => !todo.isCompleted).slice(0, 60),
      logs: candidateLogs
    });
  }, [categories, defaultDateKey, logs, scopes, todoCategories, todos]);

  useEffect(() => {
    if (dreamMonthSelectionState && !sessions.some((session) => session.id === dreamMonthSelectionState.sessionId)) {
      setDreamMonthSelectionState(null);
    }
  }, [dreamMonthSelectionState, sessions]);

  const buildSharedPersonaPrompt = useCallback((persona: AIChatPersona): string => (
    buildPersonaPrompt(persona, customPromptBlocks)
  ), [customPromptBlocks]);

  const buildBackgroundPersonaPrompt = useCallback((session?: AIChatSession): string | undefined => {
    if (!session) {
      return undefined;
    }

    const resolvedPersona = personaMap.get(session.personaId) || personas[0] || DEFAULT_AI_PERSONAS[0];
    const prompt = buildSharedPersonaPrompt(resolvedPersona);
    return prompt.trim() ? prompt : undefined;
  }, [buildSharedPersonaPrompt, personaMap, personas]);

  const buildAssistantTimelineSummary = useCallback(() => assistantContextBuilder.buildTimelineSummaryDigest({
    stateContextDate: defaultDateKey,
    dailyReviews
  }), [dailyReviews, defaultDateKey]);

  const buildAssistantStateContext = useCallback((
    date: Date,
    reminderSummary?: string,
    logsInput: Log[] = logs
  ) => ({
    ...assistantContextBuilder.buildStateContext({
      currentDateTime: formatLocalDateTimeContext(date),
      stateContextDate: defaultDateKey,
      logs: logsInput,
      categories,
      todos,
      activeSessions,
      timelineReviewSummary: buildAssistantTimelineSummary(),
      ...(reminderSummary ? { reminderSummary } : {})
    })
  }), [activeSessions, buildAssistantTimelineSummary, categories, defaultDateKey, logs, todos]);

  const buildWeeklyReviewTemplateWeekDataText = useCallback((session: AIChatSession): string | null => {
    const templateMeta = resolveWeeklyReviewTemplateSessionMeta(session);
    if (!templateMeta) {
      return null;
    }

    const weeklyReview = weeklyReviewTemplateService.findWeeklyReview(
      weeklyReviews,
      templateMeta.weekStartDate,
      templateMeta.weekEndDate
    );

    return weeklyReviewTemplateService.buildWeekDataText({
      weekStartDate: templateMeta.weekStartDate,
      weekEndDate: templateMeta.weekEndDate,
      selectedRangeLabel: templateMeta.selectedRangeLabel,
      logs,
      categories,
      todos,
      todoCategories,
      scopes,
      dailyReviews,
      weeklyReview
    });
  }, [categories, dailyReviews, logs, scopes, todoCategories, todos, weeklyReviews]);
  const buildMonthlyReviewTemplateMonthDataText = useCallback((session: AIChatSession): string | null => {
    const templateMeta = resolveMonthlyReviewTemplateSessionMeta(session);
    if (!templateMeta) {
      return null;
    }

    const monthlyReview = monthlyReviewTemplateService.findMonthlyReview(
      monthlyReviews,
      templateMeta.monthStartDate,
      templateMeta.monthEndDate
    );

    return monthlyReviewTemplateService.buildMonthDataText({
      monthStartDate: templateMeta.monthStartDate,
      monthEndDate: templateMeta.monthEndDate,
      selectedRangeLabel: templateMeta.selectedRangeLabel,
      logs,
      categories,
      todos,
      todoCategories,
      scopes,
      dailyReviews,
      weeklyReviews,
      monthlyReview
    });
  }, [categories, dailyReviews, logs, monthlyReviews, scopes, todoCategories, todos, weeklyReviews]);

  const buildAssistantLetterRunRequest = useCallback((
    trigger: AssistantSystemTrigger,
    now: Date,
    targetSession?: AIChatSession,
    conversationHistory?: AIConversationTurn[]
  ) => {
    const reminderSummary = buildAssistantReminderSummary();
    const userPersonaPrompt = buildBackgroundPersonaPrompt(targetSession);
    const stateContext = buildAssistantStateContext(now, reminderSummary);
    const personaName = targetSession
      ? getBackgroundPersonaDisplayName(targetSession)
      : 'AI';

    return buildAssistantBackgroundTurnRequest({
      trigger,
      targetSessionId: targetSession?.id,
      personaId: targetSession?.personaId,
      personaName,
      showSystemNotification: shouldShowBackgroundSystemNotification(),
      stateContext,
      reminderSummary,
      userPersonaPrompt,
      dictionaryContext: buildAssistantDictionaryContext(),
      conversationHistory
    });
  }, [
    buildAssistantDictionaryContext,
    buildAssistantReminderSummary,
    buildAssistantStateContext,
    buildBackgroundPersonaPrompt,
    getBackgroundPersonaDisplayName,
    shouldShowBackgroundSystemNotification
  ]);

  const buildBackgroundTurnRequest = useCallback(({
    trigger,
    now,
    targetSession,
    conversationHistory,
    showSystemNotification,
    logsOverride
  }: AssistantBackgroundTurnRequestOptions) => {
    const reminderSummary = buildAssistantReminderSummary();
    const userPersonaPrompt = buildBackgroundPersonaPrompt(targetSession);
    const effectiveLogs = logsOverride ?? logs;
    const stateContext = buildAssistantStateContext(now, reminderSummary, effectiveLogs);

    return buildAssistantBackgroundTurnRequest({
      trigger,
      targetSessionId: targetSession?.id,
      showSystemNotification,
      stateContext,
      reminderSummary,
      userPersonaPrompt,
      dictionaryContext: buildAssistantDictionaryContext(effectiveLogs),
      conversationHistory,
      includeDebugInPersistedMessage: debugMode
    });
  }, [
    buildAssistantDictionaryContext,
    buildAssistantReminderSummary,
    buildAssistantStateContext,
    buildBackgroundPersonaPrompt,
    debugMode,
    logs
  ]);

  const appendAssistantLetterPendingMessage = useCallback((
    sessionId: string,
    content = 'AI 正在撰写来信…'
  ): string => {
    const messageId = crypto.randomUUID();
    setSessions((prev) => mutateChatSessions(prev, sessionId, (session) => ({
      ...session,
      messages: [
        ...session.messages,
        {
          id: messageId,
          role: 'assistant',
          content,
          createdAt: Date.now(),
          tone: 'pending'
        }
      ]
    })));
    return messageId;
  }, []);

  const replaceAssistantLetterPendingMessage = useCallback((
    sessionId: string,
    pendingMessageId: string,
    resultCard: AssistantLetterResultCard,
    debugSections?: AIChatDebugSection[]
  ) => {
    setSessions((prev) => replaceSessionMessage(prev, sessionId, pendingMessageId, {
      id: pendingMessageId,
      role: 'assistant',
      content: '收到了一封来信。',
      createdAt: Date.now(),
      tone: 'system',
      assistantLetterResult: resultCard,
      ...(debugSections && debugSections.length > 0 ? { debugSections } : {})
    }));
  }, []);

  const runBackgroundAssistantLetter = useCallback(async (
    trigger: AssistantSystemTrigger,
    targetSession: AIChatSession,
    conversationHistory: AIConversationTurn[],
    options?: {
      now?: Date;
      pendingMessageId?: string;
      retryInput?: string;
      retrySourceUserMessageId?: string;
    }
  ) => {
    if (isProcessingAssistantLetterRef.current) {
      return null;
    }

    isProcessingAssistantLetterRef.current = true;
    const now = options?.now || new Date();
    const pendingMessageId = options?.pendingMessageId || appendAssistantLetterPendingMessage(targetSession.id);

    try {
      const result = await assistantLetterOrchestratorService.runDueLetter({
        ...buildAssistantLetterRunRequest(trigger, now, targetSession, conversationHistory)
      });

      setAssistantAgentConfig(assistantAgentConfigService.getConfig());
      refreshAssistantLetterSnapshot();
      refreshAssistantMemorySnapshot();
      replaceAssistantLetterPendingMessage(
        targetSession.id,
        pendingMessageId,
        result.resultCard,
        debugMode
          ? [{
            label: 'AI 来信调试',
            exchange: result.debug
          }]
          : undefined
      );

      return result;
    } catch (error) {
      replacePendingWithResult(
        targetSession.id,
        pendingMessageId,
        getRetryableAIErrorMessage(error),
        {
          tone: 'error',
          ...(options?.retryInput ? { retryInput: options.retryInput } : {}),
          ...(options?.retrySourceUserMessageId ? { retrySourceUserMessageId: options.retrySourceUserMessageId } : {}),
          debugSections: getErrorDebugSections(error, 'AI 来信调试', debugMode)
        }
      );
      throw error;
    } finally {
      isProcessingAssistantLetterRef.current = false;
    }
  }, [
    appendAssistantLetterPendingMessage,
    buildAssistantLetterRunRequest,
    debugMode,
    getErrorDebugSections,
    getRetryableAIErrorMessage,
    replaceAssistantLetterPendingMessage
  ]);

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

  useEffect(() => {
    syncAssistantScheduledTasks(new Date());
  }, [syncAssistantScheduledTasks]);

  useEffect(() => {
    if (!isPersonaPanelOpen) {
      return;
    }

    refreshAssistantMemorySnapshot();
    refreshAssistantReminderSnapshot();
    refreshAssistantScheduledTaskSnapshot();
  }, [assistantAgentConfig.longTermMemoryEnabled, isPersonaPanelOpen]);

  useEffect(() => {
    if (!isAssistantMemoryViewerOpen) {
      return;
    }

    refreshAssistantMemorySnapshot();
    refreshAssistantReminderSnapshot();
    refreshAssistantScheduledTaskSnapshot();
  }, [isAssistantMemoryViewerOpen]);

  useEffect(() => {
    if (!isAssistantBackgroundHistoryViewerOpen) {
      return;
    }

    refreshAssistantBackgroundCallHistory();
    void refreshAssistantNativeDiagnostics();
  }, [isAssistantBackgroundHistoryViewerOpen, refreshAssistantNativeDiagnostics]);

  useEffect(() => {
    if (!isAssistantLetterHistoryViewerOpen) {
      return;
    }

    refreshAssistantLetterSnapshot();
  }, [isAssistantLetterHistoryViewerOpen]);

  useEffect(() => {
    const handleAssistantChatUpdated = () => {
      reloadPersistedChatSessions();
      refreshAssistantMemorySnapshot();
      refreshAssistantLetterSnapshot();
      void hydrateAssistantReminderSnapshotFromNative();
      refreshAssistantBackgroundCallHistory();
      void refreshAssistantNativeDiagnostics();
    };

    window.addEventListener(ASSISTANT_CHAT_UPDATED_EVENT, handleAssistantChatUpdated);
    return () => window.removeEventListener(ASSISTANT_CHAT_UPDATED_EVENT, handleAssistantChatUpdated);
  }, [hydrateAssistantReminderSnapshotFromNative, personas, refreshAssistantNativeDiagnostics]);

  useEffect(() => {
    const handleAssistantChatRestored = (event: Event) => {
      const detail = (event as CustomEvent<AssistantChatRestoredDetail>).detail;
      const restoredBlocks = detail?.customPromptBlocks;
      const restoredShortcuts = detail?.shortcuts;
      const restoredPersonas = detail?.personas;

      if (Array.isArray(restoredBlocks)) {
        setCustomPromptBlocks(normalizeCustomPromptBlocks(restoredBlocks));
      }

      if (Array.isArray(restoredShortcuts)) {
        setShortcuts(normalizeShortcuts(restoredShortcuts));
      }

      if (Array.isArray(restoredPersonas)) {
        const nextPersonas = normalizePersonas(restoredPersonas);
        setPersonas(nextPersonas);
        setSessions(normalizePersistedSessions(
          aiChatStorageService.getSessions(),
          nextPersonas,
          getLocalDateStr
        ));
      }

      if (Object.prototype.hasOwnProperty.call(detail || {}, 'memory')) {
        refreshAssistantMemorySnapshot();
      }
    };

    window.addEventListener(ASSISTANT_CHAT_RESTORED_EVENT, handleAssistantChatRestored as EventListener);
    return () => window.removeEventListener(ASSISTANT_CHAT_RESTORED_EVENT, handleAssistantChatRestored as EventListener);
  }, [refreshAssistantMemorySnapshot]);

  useEffect(() => {
    const handleSubmittedLog = (rawEvent: Event) => {
      void handleAssistantLogSubmittedEvent(rawEvent as CustomEvent<AssistantLogSubmittedEventDetail>);
    };

    window.addEventListener(ASSISTANT_LOG_SUBMITTED_EVENT, handleSubmittedLog as EventListener);
    return () => {
      window.removeEventListener(ASSISTANT_LOG_SUBMITTED_EVENT, handleSubmittedLog as EventListener);
    };
  }, [handleAssistantLogSubmittedEvent]);

  useEffect(() => {
    let cancelled = false;
    let pluginListener: Awaited<ReturnType<typeof AssistantAgent.addListener>> | null = null;
    let diagnosticsListener: Awaited<ReturnType<typeof AssistantAgent.addListener>> | null = null;
    let appStateListener: Awaited<ReturnType<typeof CapacitorApp.addListener>> | null = null;

    const bindAssistantAgent = async () => {
      try {
        pluginListener = await AssistantAgent.addListener('assistantSystemTrigger', (trigger) => {
          if (cancelled || !assistantAgentConfig.enabled) {
            return;
          }

          void handleAssistantSystemTrigger(trigger as AssistantSystemTrigger);
        });
        diagnosticsListener = await AssistantAgent.addListener('assistantDiagnosticsUpdated', () => {
          if (cancelled) {
            return;
          }

          void refreshAssistantNativeDiagnostics();
        });
        appStateListener = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
          if (cancelled || !isActive || !assistantAgentConfig.enabled) {
            return;
          }

          void (async () => {
            await hydrateAssistantReminderSnapshotFromNative();
            await drainPendingAssistantSystemTriggers();
          })();
        });
        document.addEventListener('visibilitychange', handleVisibilityChange);
        void refreshAssistantNativeDiagnostics();
        void (async () => {
          await hydrateAssistantReminderSnapshotFromNative();
          await drainPendingAssistantSystemTriggers();
        })();
      } catch (error) {
        console.error('[AIBackfillChatModal] Failed to bind assistant agent listener', error);
      }
    };

    const handleVisibilityChange = () => {
      if (cancelled || document.hidden || !assistantAgentConfig.enabled) {
        return;
      }

      void (async () => {
        await hydrateAssistantReminderSnapshotFromNative();
        await drainPendingAssistantSystemTriggers();
      })();
    };

    void bindAssistantAgent();

    return () => {
      cancelled = true;
      pluginListener?.remove();
      diagnosticsListener?.remove();
      void appStateListener?.remove();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    assistantAgentConfig.enabled,
    drainPendingAssistantSystemTriggers,
    handleAssistantSystemTrigger,
    hydrateAssistantReminderSnapshotFromNative,
    refreshAssistantNativeDiagnostics,
  ]);

  useEffect(() => {
    let cancelled = false;

    const syncAssistantAgent = async () => {
      try {
        if (assistantAgentConfig.enabled) {
          await AssistantAgent.startAgent(assistantAgentConfig);
        } else {
          await AssistantAgent.stopAgent();
        }
      } catch (error) {
        if (!cancelled) {
          console.error('[AIBackfillChatModal] Failed to sync assistant agent config', error);
        }
      }
    };

    void syncAssistantAgent();

    return () => {
      cancelled = true;
    };
  }, [assistantAgentConfig]);

  useEffect(() => {
    void AssistantAgent.syncNativeAIConfig(aiService.getConfig()).catch((error) => {
      console.error('[AIBackfillChatModal] Failed to sync native AI config on mount/update', error);
    });
    void syncNativeBackgroundExecutionSnapshot();
  }, [
    assistantAgentConfig.enabled,
    assistantAgentConfig.longTermMemoryEnabled,
    conversationHistoryCache,
    isAssistantBackgroundContextReady,
    syncNativeBackgroundExecutionSnapshot
  ]);

  useEffect(() => {
    if (!assistantAgentConfig.enabled) {
      return;
    }

    void syncNativeBackgroundExecutionSnapshot();
  }, [
    assistantAgentConfig.enabled,
    assistantMemorySnapshot.updatedAt,
    assistantReminderSnapshot,
    isAssistantBackgroundContextReady,
    syncNativeBackgroundExecutionSnapshot
  ]);

  useEffect(() => {
    if (
      !assistantAgentConfig.enabled
      || !isAssistantBackgroundContextReady
      || hasCompletedStartupReminderCatchupRef.current
    ) {
      return;
    }

    hasCompletedStartupReminderCatchupRef.current = true;

    void (async () => {
      try {
        await hydrateAssistantReminderSnapshotFromNative();
        flushDueReminders();
        flushDueAssistantLetter();
      } catch (error) {
        hasCompletedStartupReminderCatchupRef.current = false;
        console.error('[AIBackfillChatModal] Failed cold-start reminder catch-up', error);
      }
    })();
  }, [
    assistantAgentConfig.enabled,
    flushDueAssistantLetter,
    flushDueReminders,
    hydrateAssistantReminderSnapshotFromNative,
    isAssistantBackgroundContextReady
  ]);

  useEffect(() => {
    flushDueReminders();
    flushDueAssistantLetter();

    if (!assistantAgentConfig.enabled) {
      return;
    }

    const timer = window.setInterval(() => {
      flushDueReminders();
      flushDueAssistantLetter();
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [
    assistantAgentConfig.enabled,
    flushDueAssistantLetter,
    flushDueReminders
  ]);

  useEffect(() => {
    if (!assistantAgentConfig.enabled || !isAssistantBackgroundContextReady) {
      return;
    }

    void (async () => {
      await hydrateAssistantReminderSnapshotFromNative();
      await drainPendingAssistantSystemTriggers();
      flushDueAssistantLetter();
    })();
  }, [
    assistantAgentConfig.enabled,
    drainPendingAssistantSystemTriggers,
    flushDueAssistantLetter,
    hydrateAssistantReminderSnapshotFromNative,
    isAssistantBackgroundContextReady
  ]);


  const prepareForTemplateInteraction = useCallback(() => {
    setInputText('');
    setIsHistoryPanelOpen(false);
    setIsPersonaPanelOpen(false);
  }, []);

  const handleWeeklyReviewTemplateGuidedSelection = async (
    session: AIChatSession,
    userInput: string
  ): Promise<boolean> => runWeeklyReviewTemplateGuidedSelection({
    activeRequestRef,
    appendSystemMessage,
    buildConversationHistory,
    buildPersonaPrompt: buildSharedPersonaPrompt,
    getErrorDebugSections,
    getRetryableAIErrorMessage,
    isAbortError,
    mutateSession,
    onReadySession: handleWeeklyReviewTemplateOpeningTurn,
    prepareForTemplateInteraction,
    replacePendingWithResult,
    resolveAssistantDisplayParts,
    resolveAssistantReplyContent,
    session,
    setIsLoading,
    userInput
  });

  const handleMonthlyReviewTemplateGuidedSelection = async (
    session: AIChatSession,
    userInput: string
  ): Promise<boolean> => runMonthlyReviewTemplateGuidedSelection({
    activeRequestRef,
    appendSystemMessage,
    buildConversationHistory,
    buildPersonaPrompt: buildSharedPersonaPrompt,
    getErrorDebugSections,
    getRetryableAIErrorMessage,
    isAbortError,
    mutateSession,
    onReadySession: handleMonthlyReviewTemplateOpeningTurn,
    prepareForTemplateInteraction,
    replacePendingWithResult,
    resolveAssistantDisplayParts,
    resolveAssistantReplyContent,
    session,
    setIsLoading,
    userInput
  });


  const handleCloseNewSessionDialog = () => {
    setIsNewSessionDialogOpen(false);
  };

  const handleOpenNewSessionDialog = () => {
    if (!activeSession) {
      return;
    }

    setEditingSessionId(null);
    setEditingSessionTitle('');
    setDeleteConfirmSessionId(null);
    setIsNewSessionDialogOpen(true);
  };

  const handleCreateGenericSession = () => {
    if (!activeSession) {
      return;
    }

    const nextSession = createDefaultSession(activeSession.personaId);
    setSessions((prev) => [nextSession, ...prev]);
    setActiveSessionId(nextSession.id);
    handleCloseNewSessionDialog();
    setIsHistoryPanelOpen(false);
    setIsHomeView(false);
  };

  const handleCreateSessionWithPersona = (personaId: string) => {
    const nextSession = createDefaultSession(personaId);
    setSessions((prev) => [nextSession, ...prev]);
    setActiveSessionId(nextSession.id);
    handleCloseNewSessionDialog();
    setEditingSessionId(null);
    setEditingSessionTitle('');
    setDeleteConfirmSessionId(null);
    setDeleteConfirmPersonaId(null);
    setIsHistoryPanelOpen(false);
    setIsHomeView(false);
  };

  const handleOpenWeeklyReviewTemplateSelection = () => {
    if (!activeSession) {
      return;
    }

    const templateSession = createWeeklyReviewTemplateSession(activeSession.personaId);

    setSessions((prev) => [templateSession, ...prev]);
    setActiveSessionId(templateSession.id);
    handleCloseNewSessionDialog();
    setIsHistoryPanelOpen(false);
    setInputText('');
    setIsHomeView(false);
  };

  const handleOpenMonthlyReviewTemplateSelection = () => {
    if (!activeSession) {
      return;
    }

    const templateSession = createMonthlyReviewTemplateSession(activeSession.personaId);

    setSessions((prev) => [templateSession, ...prev]);
    setActiveSessionId(templateSession.id);
    handleCloseNewSessionDialog();
    setIsHistoryPanelOpen(false);
    setInputText('');
    setIsHomeView(false);
  };

  const handleFillWriteWeeklyNarrativeCommand = () => {
    setInputText('写入 AI 叙事');
    window.requestAnimationFrame(() => {
      composerTextareaRef.current?.focus();
    });
  };

  const handleFillWriteMonthlyNarrativeCommand = () => {
    setInputText('写入 AI 叙事');
    window.requestAnimationFrame(() => {
      composerTextareaRef.current?.focus();
    });
  };

  const handleFillDailyNarrativeCommand = () => {
    setInputText('叙事');
    window.requestAnimationFrame(() => {
      composerTextareaRef.current?.focus();
    });
  };

  const handleFillDailyNewspaperCommand = () => {
    setInputText('小报');
    window.requestAnimationFrame(() => {
      composerTextareaRef.current?.focus();
    });
  };

  const handleStartRenameSession = (session: AIChatSession) => {
    setDeleteConfirmSessionId(null);
    setEditingSessionId(session.id);
    setEditingSessionTitle(session.title);
  };

  const handleCancelRenameSession = () => {
    setEditingSessionId(null);
    setEditingSessionTitle('');
  };

  const handleSelectSessionFromHistory = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setIsHistoryPanelOpen(false);
    setIsHomeView(false);
  };

  const handleToggleDeleteSession = (sessionId: string) => {
    setEditingSessionId(null);
    setEditingSessionTitle('');
    setDeleteConfirmSessionId((current) => (current === sessionId ? null : sessionId));
  };

  const handleCommitRenameSession = (sessionId: string) => {
    const nextTitle = editingSessionTitle.trim() || '新对话';
    mutateSession(sessionId, (session) => ({
      ...session,
      title: nextTitle
    }));
    setEditingSessionId(null);
    setEditingSessionTitle('');
    addToast('success', '已重命名对话');
  };

  const handleDeleteSession = (sessionId: string) => {
    const targetSession = sessions.find((session) => session.id === sessionId);
    if (!targetSession) {
      return;
    }

    if (isLoading && activeRequestRef.current?.sessionId === sessionId) {
      addToast('warning', '当前对话正在请求中，请先停止再删除。');
      return;
    }

    const remainingSessions = sortedSessions.filter((session) => session.id !== sessionId);

    if (remainingSessions.length === 0) {
      const fallbackSession = createDefaultSession(targetSession.personaId);
      setSessions([fallbackSession]);
      setActiveSessionId(fallbackSession.id);
    } else {
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(remainingSessions[0].id);
      }
    }

    if (editingSessionId === sessionId) {
      handleCancelRenameSession();
    }
    setDeleteConfirmSessionId(null);
    addToast('success', '已删除对话');
  };

  const {
    ensureEditablePersona,
    handleAddCustomPromptBlock,
    handleAddShortcut,
    handleApplyEmojiAvatar,
    handleApplyPersonaPreset,
    handleApplyUserEmojiAvatar,
    handleAvatarUpload,
    handleCancelEmojiAvatarEdit,
    handleCancelUserEmojiAvatarEdit,
    handleCreatePersona,
    handleDeleteCurrentPersona,
    handleDeleteShortcut,
    handleUpdateCustomPromptBlock,
    handleUpdateShortcut,
    handleUserAvatarUpload,
    handleUseEmojiAvatar,
    handleUseUserEmojiAvatar,
    handleResetUserAvatar,
    updateCurrentPersona
  } = useAIBackfillChatPersonaProfile({
    activePersona,
    activeSession,
    addToast,
    emojiDraft,
    handleCreateSessionWithPersona,
    mutateSession,
    personas,
    sessions,
    setCustomPromptBlocks,
    setDeleteConfirmPersonaId,
    setEmojiDraft,
    setIsEmojiEditorOpen,
    setIsUploadingAvatar,
    setIsUploadingUserAvatar,
    setIsUserEmojiEditorOpen,
    setPersonas,
    setSessions,
    setShortcuts,
    setUserEmojiDraft,
    setUserProfile,
    userEmojiDraft,
    userProfile
  });


  const {
    handleCancelAssistantEditableMemoryComposer,
    handleCancelAssistantReminderComposer,
    handleCancelAssistantScheduledTaskComposer,
    handleClearAssistantMemory,
    handleCloseAssistantMemoryViewer,
    handleConfirmAssistantEditableMemoryDelete,
    handleConfirmAssistantReminderDelete,
    handleConfirmAssistantScheduledTaskDelete,
    handleOpenAssistantEditableMemoryComposer,
    handleOpenAssistantMemoryViewer,
    handleOpenAssistantReminderComposer,
    handleOpenAssistantScheduledTaskComposer,
    handleSaveAssistantEditableMemoryEntry,
    handleSaveAssistantReminder,
    handleSaveAssistantScheduledTask,
    handleToggleAssistantEditableMemoryDelete,
    handleToggleAssistantReminderDelete,
    handleToggleAssistantScheduledTaskDelete,
    handleToggleAssistantScheduledTaskEnabled,
    toggleAssistantScheduledTaskWeekday,
    updateAssistantEditableMemoryDraft,
    updateAssistantReminderDraft,
    updateAssistantScheduledTaskDraft
  } = useAIBackfillChatAssistantTaskHandlers({
    addToast,
    assistantEditableMemoryDrafts,
    assistantMemorySnapshot,
    assistantReminderDrafts,
    assistantReminderSnapshot,
    assistantScheduledTaskDrafts,
    defaultDateKey,
    notifyAssistantTaskStateChanged,
    refreshAssistantMemorySnapshot,
    refreshAssistantReminderSnapshot,
    resetAssistantEditableMemoryUi,
    resetAssistantReminderUi,
    resetAssistantScheduledTaskUi,
    setAssistantEditableMemoryComposerKey,
    setAssistantEditableMemoryDeleteTarget,
    setAssistantEditableMemoryDrafts,
    setAssistantMemoryViewerOpen: setIsAssistantMemoryViewerOpen,
    setAssistantReminderComposerOpen: setIsAssistantReminderComposerOpen,
    setAssistantReminderDeleteTarget,
    setAssistantReminderDrafts,
    setAssistantScheduledTaskComposerOpen: setIsAssistantScheduledTaskComposerOpen,
    setAssistantScheduledTaskDeleteTarget,
    setAssistantScheduledTaskDrafts,
    syncAssistantScheduledTasks
  });

  const handleOpenChatView = useCallback((sessionId?: string) => {
    if (sessionId && sessions.some((session) => session.id === sessionId)) {
      setActiveSessionId(sessionId);
    }
    setIsHomeView(false);
    window.requestAnimationFrame(() => composerTextareaRef.current?.focus());
  }, [sessions]);


  const handleToggleChatSync = (enabled: boolean) => {
    setChatSyncEnabled(enabled);
  };

  const handleOpenAssistantLetterDetail = (letterId: string) => {
    refreshAssistantLetterSnapshot();
    setSelectedAssistantLetterId(letterId);
    setIsAssistantLetterDetailSheetOpen(true);
  };

  const handleCloseAssistantLetterDetail = () => {
    setIsAssistantLetterDetailSheetOpen(false);
  };

  const handleOpenAssistantLetterHistoryViewer = () => {
    refreshAssistantLetterSnapshot();
    setAssistantLetterDeleteTargetId(null);
    setIsAssistantLetterHistoryViewerOpen(true);
  };

  const handleCloseAssistantLetterHistoryViewer = () => {
    setAssistantLetterDeleteTargetId(null);
    setIsAssistantLetterHistoryViewerOpen(false);
  };

  const handleOpenNewspaperHistoryViewer = () => {
    setIsNewspaperHistoryViewerOpen(true);
  };

  const handleCloseNewspaperHistoryViewer = () => {
    setIsNewspaperHistoryViewerOpen(false);
  };

  const handleToggleAssistantLetterDelete = (letterId: string) => {
    setAssistantLetterDeleteTargetId((current) => current === letterId ? null : letterId);
  };

  const handleConfirmAssistantLetterDelete = (letterId: string) => {
    assistantLetterService.deleteLetter(letterId);
    setAssistantLetterDeleteTargetId((current) => current === letterId ? null : current);
    refreshAssistantLetterSnapshot();
    setIsAssistantLetterDetailSheetOpen((current) => (
      selectedAssistantLetterId === letterId ? false : current
    ));
    addToast('success', '已删除来信');
  };

  const handleOpenAssistantBackgroundHistoryViewer = () => {
    refreshAssistantBackgroundCallHistory();
    void refreshAssistantNativeDiagnostics();
    setIsAssistantBackgroundHistoryViewerOpen(true);
  };

  const handleCloseAssistantBackgroundHistoryViewer = () => {
    setIsAssistantBackgroundHistoryViewerOpen(false);
  };

  const handleClearAssistantBackgroundCallHistory = async () => {
    assistantOrchestratorService.clearBackgroundCallHistory();
    try {
      await AssistantAgent.clearDiagnostics();
    } catch (error) {
      console.error('[AIBackfillChatModal] Failed to clear native assistant diagnostics', error);
    }
    refreshAssistantBackgroundCallHistory();
    void refreshAssistantNativeDiagnostics();
    addToast('success', '已清空后台诊断记录');
  };

  const handleAIInternalBack = useCallback((): boolean => {
    if (!isOpen) {
      return false;
    }

    if (debugViewer) {
      setDebugViewer(null);
      return true;
    }

    if (isAssistantLetterDetailSheetOpen) {
      handleCloseAssistantLetterDetail();
      return true;
    }

    if (isAssistantLetterHistoryViewerOpen) {
      handleCloseAssistantLetterHistoryViewer();
      return true;
    }

    if (isNewspaperHistoryViewerOpen) {
      handleCloseNewspaperHistoryViewer();
      return true;
    }

    if (isAssistantBackgroundHistoryViewerOpen) {
      handleCloseAssistantBackgroundHistoryViewer();
      return true;
    }

    if (isAssistantMemoryViewerOpen) {
      if (assistantReminderDeleteTarget) {
        setAssistantReminderDeleteTarget(null);
        return true;
      }

      if (assistantScheduledTaskDeleteTarget) {
        setAssistantScheduledTaskDeleteTarget(null);
        return true;
      }

      if (isAssistantScheduledTaskComposerOpen) {
        resetAssistantScheduledTaskUi();
        return true;
      }

      if (isAssistantReminderComposerOpen) {
        resetAssistantReminderUi();
        return true;
      }

      if (assistantEditableMemoryDeleteTarget) {
        setAssistantEditableMemoryDeleteTarget(null);
        return true;
      }

      if (assistantEditableMemoryComposerKey) {
        handleCancelAssistantEditableMemoryComposer(assistantEditableMemoryComposerKey);
        return true;
      }

      handleCloseAssistantMemoryViewer();
      return true;
    }

    if (isDreamViewerOpen) {
      if (isDreamResetConfirmOpen) {
        setIsDreamResetConfirmOpen(false);
        return true;
      }

      if (dreamEntryDeleteTargetId) {
        setDreamEntryDeleteTargetId(null);
        return true;
      }

      if (editingDreamEntryId) {
        dreamUiHandlersRef.current.resetDreamEntryUi();
        return true;
      }

      if (dreamTopicDeleteTargetId) {
        setDreamTopicDeleteTargetId(null);
        return true;
      }

      if (isDreamTopicComposerOpen) {
        dreamUiHandlersRef.current.resetDreamTopicUi();
        return true;
      }

      dreamUiHandlersRef.current.handleCloseDreamViewer();
      return true;
    }

    if (isUserEmojiEditorOpen) {
      setIsUserEmojiEditorOpen(false);
      return true;
    }

    if (isNewSessionDialogOpen) {
      handleCloseNewSessionDialog();
      return true;
    }

    if (isShortcutSettingsOpen) {
      setIsShortcutSettingsOpen(false);
      return true;
    }

    if (isEmojiEditorOpen) {
      setIsEmojiEditorOpen(false);
      return true;
    }

    if (isPersonaPanelOpen) {
      if (deleteConfirmPersonaId) {
        setDeleteConfirmPersonaId(null);
        return true;
      }

      setIsPersonaPanelOpen(false);
      return true;
    }

    if (isHistoryPanelOpen) {
      if (deleteConfirmSessionId) {
        setDeleteConfirmSessionId(null);
        return true;
      }

      if (editingSessionId) {
        handleCancelRenameSession();
        return true;
      }

      setIsHistoryPanelOpen(false);
      return true;
    }

    if (!isHomeView) {
      setIsHomeView(true);
      return true;
    }

    onClose();
    return true;
  }, [
    assistantEditableMemoryComposerKey,
    assistantEditableMemoryDeleteTarget,
    assistantReminderDeleteTarget,
    assistantScheduledTaskDeleteTarget,
    debugViewer,
    deleteConfirmPersonaId,
    deleteConfirmSessionId,
    editingSessionId,
    handleCancelAssistantEditableMemoryComposer,
    handleCloseAssistantLetterDetail,
    handleCloseAssistantLetterHistoryViewer,
    handleCancelRenameSession,
    handleCloseAssistantBackgroundHistoryViewer,
    handleCloseAssistantMemoryViewer,
    dreamEntryDeleteTargetId,
    editingDreamEntryId,
    isDreamResetConfirmOpen,
    isAssistantLetterDetailSheetOpen,
    isAssistantBackgroundHistoryViewerOpen,
    isAssistantLetterHistoryViewerOpen,
    isNewspaperHistoryViewerOpen,
    isDreamViewerOpen,
    isAssistantMemoryViewerOpen,
    isAssistantReminderComposerOpen,
    isAssistantScheduledTaskComposerOpen,
    isDreamTopicComposerOpen,
    isEmojiEditorOpen,
    isHistoryPanelOpen,
    isHomeView,
    isNewSessionDialogOpen,
    isShortcutSettingsOpen,
    isOpen,
    isPersonaPanelOpen,
    isUserEmojiEditorOpen,
    dreamTopicDeleteTargetId,
    resetAssistantScheduledTaskUi,
    handleCloseNewSessionDialog,
    onClose
  ]);

  useEffect(() => {
    if (!registerBackHandler) {
      return;
    }

    registerBackHandler(isOpen ? handleAIInternalBack : null);

    return () => {
      registerBackHandler(null);
    };
  }, [handleAIInternalBack, isOpen, registerBackHandler]);

  const {
    applyPlannedCreateSubtaskToolCalls,
    applyPlannedEditLogToolCalls,
    applyPlannedLogToolCalls,
    applyPlannedPrincipleToolCalls,
    applyPlannedSelfBeliefToolCalls,
    applyPlannedTodoUpdateToolCalls,
    applyQuickAddNoteToolCalls,
    applyTodoAndPlannedTimelineLogToolCalls,
    getActivityById,
    getActivityCategory,
    getScopeNames,
    hasLocalQueryTarget
  } = useAIBackfillChatActionHandlers({
    autoApplyAutoLinkRules,
    autoLinkRules,
    categories,
    defaultDateKey,
    logs,
    scopes,
    setLogs,
    setTodos,
    todoCategories,
    todos
  });

  const {
    handleAddSelfBeliefDescription,
    handleCancelPrincipleEditor,
    handleCancelSelfBeliefDescriptionEdit,
    handleCancelSelfBeliefEditor,
    handleDeleteSelfBeliefDescription,
    handleOpenPrincipleEditor,
    handleOpenSelfBeliefEditor,
    handleSavePrincipleEditor,
    handleSaveSelfBeliefDescriptionEdit,
    handleSaveSelfBeliefEditor,
    handleStartEditSelfBeliefDescription,
    handleUndoCreateSubtaskAction,
    handleUndoEditLogAction,
    handleUndoLogAction,
    handleUndoPlannedLogAction,
    handleUndoPrincipleAction,
    handleUndoSelfBeliefAction,
    handleUndoTodoAction,
    handleUndoUpdateTodoAction
  } = useAIBackfillChatAppliedActionHandlers({
    activeSession,
    addToast,
    createChatLibraryId,
    editingPrincipleId,
    editingSelfBeliefDescriptionId,
    editingSelfBeliefDescriptionText,
    editingSelfBeliefId,
    getTodayDateKey,
    newSelfBeliefDescriptionText,
    principleEditFormData,
    selfBeliefDescriptionDrafts,
    selfBeliefTitleDraft,
    logs,
    todos,
    updateAppliedActionStatus,
    setEditingPrincipleId,
    setEditingSelfBeliefDescriptionId,
    setEditingSelfBeliefDescriptionText,
    setEditingSelfBeliefId,
    setNewSelfBeliefDescriptionText,
    setPrincipleEditFormData,
    setSelfBeliefDescriptionDrafts,
    setSelfBeliefTitleDraft,
    setLogs,
    setTodos
  });

  const applyUnifiedToolCalls = (
    toolCalls: AssistantToolCall[],
    sourceText: string,
    localQueryHistory?: AssistantLocalQueryResult[]
  ): AppliedChatAction[] => {
    const logCalls = toolCalls.filter((toolCall): toolCall is AIBackfillToolCall => toolCall.toolName === 'create_log');
    const todoAndPlannedLogCalls = toolCalls.filter((toolCall): toolCall is AITodoToolCall | AIPlannedLogToolCall => (
      toolCall.toolName === 'create_todo' || toolCall.toolName === 'create_planned_log'
    ));
    const todoUpdateCalls = toolCalls.filter((toolCall): toolCall is AITodoUpdateToolCall => toolCall.toolName === 'update_todo');
    const subtaskCalls = toolCalls.filter((toolCall): toolCall is AICreateSubtaskToolCall => toolCall.toolName === 'create_subtask');
    const editLogCalls = toolCalls.filter((toolCall): toolCall is AIEditLogToolCall => toolCall.toolName === 'edit_log');
    const principleCalls = toolCalls.filter((toolCall): toolCall is AICreatePrincipleToolCall => toolCall.toolName === 'create_principle');
    const selfBeliefCalls = toolCalls.filter((toolCall): toolCall is AICreateSelfBeliefToolCall => toolCall.toolName === 'create_self_belief');

    return [
      ...applyPlannedLogToolCalls(logCalls),
      ...applyTodoAndPlannedTimelineLogToolCalls(todoAndPlannedLogCalls, sourceText),
      ...applyPlannedTodoUpdateToolCalls(todoUpdateCalls),
      ...applyPlannedCreateSubtaskToolCalls(subtaskCalls, sourceText),
      ...applyPlannedEditLogToolCalls(editLogCalls),
      ...(hasLocalQueryTarget(localQueryHistory, 'principles')
        ? applyPlannedPrincipleToolCalls(principleCalls)
        : assistantActionExecutor.buildRejectedPrincipleActions(principleCalls, '添加或修改原则前需要先查询现有原则库。')),
      ...(hasLocalQueryTarget(localQueryHistory, 'selfBeliefs')
        ? applyPlannedSelfBeliefToolCalls(selfBeliefCalls)
        : assistantActionExecutor.buildRejectedSelfBeliefActions(selfBeliefCalls, '添加或修改自我认知前需要先查询现有自我认知。'))
    ];
  };

  const applyUnifiedReminders = (output: AssistantUnifiedTurnOutput): {
    before: AssistantReminder[];
    updates: string[];
  } => {
    const before = assistantReminderQueueService.listReminders();
    const reminders = output.reminders || [];
    const reminderActions = output.reminderActions || [];
    if (reminders.length === 0 && reminderActions.length === 0) {
      return { before, updates: [] };
    }

    const reminderUpdates: string[] = [];
    reminderActions.forEach((action) => {
      if (action.action !== 'remove') {
        return;
      }

      const removedReminder = assistantReminderQueueService.removeReminder(action.reminderId);
      if (removedReminder) {
        reminderUpdates.push(`已移除 reminder：${removedReminder.text}`);
      } else {
        console.warn('[AIBackfillChatModal] Reminder removal target was not found', action.reminderId);
      }
    });

    reminders.forEach((reminder) => {
      const normalizedDueAt = normalizeAssistantDateTime(reminder.dueAt);
      if (!normalizedDueAt) {
        console.warn('[AIBackfillChatModal] Ignored reminder with invalid dueAt', reminder.dueAt);
        return;
      }

      assistantReminderQueueService.enqueueReminder({
        id: crypto.randomUUID(),
        type: reminder.type || 'self_followup',
        dueAt: normalizedDueAt,
        status: 'pending',
        text: reminder.text,
        ...(reminder.todoId ? { todoId: reminder.todoId } : {}),
        source: 'user',
        createdAt: new Date().toISOString()
      });
      reminderUpdates.push(`${formatAssistantDateTimeForDisplay(normalizedDueAt)} · ${reminder.text}`);
    });

    refreshAssistantReminderSnapshot();
    refreshAssistantMemorySnapshot();
    return { before, updates: reminderUpdates };
  };

  const handleOpenLogEditor = (logId?: string) => {
    if (!logId) {
      return;
    }

    if (isDesktopWidgetMode) {
      onOpenMainApp?.();
      return;
    }

    const liveLog = logs.find((log) => log.id === logId);
    if (!liveLog) {
      addToast('info', '这条记录已经不存在了。');
      return;
    }

    setEditingLog(liveLog);
    setInitialLogTimes(null);
    setIsAddModalOpen(true);
  };

  const handleOpenTodoDetail = (todoId?: string) => {
    if (!todoId) {
      return;
    }

    if (isDesktopWidgetMode) {
      onOpenMainApp?.();
      window.desktopWidget?.requestMainAction({
        type: 'open_todo',
        todoId
      });
      return;
    }

    const liveTodo = todos.find((todo) => todo.id === todoId);
    if (!liveTodo) {
      addToast('info', '这条待办已经不存在了。');
      return;
    }

    setEditingTodo(liveTodo);
    setTodoCategoryToAdd(liveTodo.categoryId);
    setNewTodoDraft(null);
    setIsTodoModalOpen(true);
  };

  const handleOpenWeeklyReviewNarrative = (weekStartDate: string, weekEndDate: string) => {
    if (isDesktopWidgetMode) {
      onOpenMainApp?.();
      return;
    }

    const weekStart = new Date(`${weekStartDate}T12:00:00`);
    const weekEnd = new Date(`${weekEndDate}T12:00:00`);
    if (Number.isNaN(weekStart.getTime()) || Number.isNaN(weekEnd.getTime())) {
      addToast('info', '这个周回顾的日期范围无效。');
      return;
    }

    setCurrentView(AppView.REVIEW);
    setCurrentWeeklyReviewInitialTab('narrative');
    setCurrentWeeklyReviewStart(weekStart);
    setCurrentWeeklyReviewEnd(weekEnd);
    setIsWeeklyReviewOpen(true);
    onClose();
  };

  const handleOpenDailyReviewNarrative = (date: string) => {
    if (isDesktopWidgetMode) {
      onOpenMainApp?.();
      return;
    }

    const reviewDate = new Date(`${date}T12:00:00`);
    if (Number.isNaN(reviewDate.getTime())) {
      addToast('info', '这个日报日期无效。');
      return;
    }

    setCurrentView(AppView.REVIEW);
    setCurrentReviewDate(reviewDate);
    setCurrentDailyReviewInitialTab('narrative');
    setIsDailyReviewOpen(true);
    onClose();
  };

  const handleOpenDailyNewspaper = (date: string) => {
    if (isDesktopWidgetMode) {
      onOpenMainApp?.();
      return;
    }

    const reviewDate = new Date(`${date}T12:00:00`);
    if (Number.isNaN(reviewDate.getTime())) {
      addToast('info', '这个小报日期无效。');
      return;
    }

    setCurrentView(AppView.REVIEW);
    setCurrentDailyNewspaperDate(reviewDate);
    setIsDailyNewspaperOpen(true);
    onRequestReturnToAI?.();
    onClose();
  };

  const handleOpenWeeklyNewspaper = (weekStartDate: string, weekEndDate: string) => {
    if (isDesktopWidgetMode) {
      onOpenMainApp?.();
      return;
    }

    const weekStart = new Date(`${weekStartDate}T12:00:00`);
    const weekEnd = new Date(`${weekEndDate}T12:00:00`);
    if (Number.isNaN(weekStart.getTime()) || Number.isNaN(weekEnd.getTime())) {
      addToast('info', '这个周小报的日期范围无效。');
      return;
    }

    setCurrentView(AppView.REVIEW);
    setCurrentWeeklyNewspaperStart(weekStart);
    setCurrentWeeklyNewspaperEnd(weekEnd);
    setIsWeeklyNewspaperOpen(true);
    onRequestReturnToAI?.();
    onClose();
  };

  const handleOpenMonthlyReviewNarrative = (monthStartDate: string, monthEndDate: string) => {
    if (isDesktopWidgetMode) {
      onOpenMainApp?.();
      return;
    }

    const monthStart = new Date(`${monthStartDate}T12:00:00`);
    const monthEnd = new Date(`${monthEndDate}T12:00:00`);
    if (Number.isNaN(monthStart.getTime()) || Number.isNaN(monthEnd.getTime())) {
      addToast('info', '这个月回顾的日期范围无效。');
      return;
    }

    setCurrentView(AppView.REVIEW);
    setCurrentMonthlyReviewInitialTab('narrative');
    setCurrentMonthlyReviewStart(monthStart);
    setCurrentMonthlyReviewEnd(monthEnd);
    setIsMonthlyReviewOpen(true);
    onClose();
  };

  const handleOpenMonthlyNewspaper = (monthStartDate: string, monthEndDate: string) => {
    if (isDesktopWidgetMode) {
      onOpenMainApp?.();
      return;
    }

    const monthStart = new Date(`${monthStartDate}T12:00:00`);
    const monthEnd = new Date(`${monthEndDate}T12:00:00`);
    if (Number.isNaN(monthStart.getTime()) || Number.isNaN(monthEnd.getTime())) {
      addToast('info', '这个月小报的日期范围无效。');
      return;
    }

    setCurrentView(AppView.REVIEW);
    setCurrentMonthlyNewspaperStart(monthStart);
    setCurrentMonthlyNewspaperEnd(monthEnd);
    setIsMonthlyNewspaperOpen(true);
    onRequestReturnToAI?.();
    onClose();
  };

  const replacePendingWithResult = (
    sessionId: string,
    pendingMessageId: string,
    content: string,
    options?: {
      tone?: ChatTone;
      reasoning?: AssistantReasoningSummary;
      displayParts?: string[];
      debugSections?: AIChatDebugSection[];
      appliedActions?: AppliedChatAction[];
      assistantLetterResult?: AssistantLetterResultCard;
      localQueryResults?: AssistantLocalQueryResult[];
      memoryUpdates?: AIChatMemoryUpdateSection[];
      memoryBefore?: AssistantMemory;
      dreamUpdates?: AIChatDreamUpdateCard[];
      reminderUpdates?: string[];
      remindersBefore?: AssistantReminder[];
      dailyNewspaperWriteback?: AIChatDailyNewspaperWritebackResult;
      dailyReviewWriteback?: AIChatDailyReviewWritebackResult;
      weeklyNewspaperWriteback?: AIChatWeeklyNewspaperWritebackResult;
      weeklyReviewWriteback?: AIChatWeeklyReviewWritebackResult;
      monthlyNewspaperWriteback?: AIChatMonthlyNewspaperWritebackResult;
      monthlyReviewWriteback?: AIChatMonthlyReviewWritebackResult;
      retryInput?: string;
      retrySourceUserMessageId?: string;
      dreamRetryYearMonth?: string;
    }
  ) => {
    replaceMessage(sessionId, pendingMessageId, {
      id: pendingMessageId,
      role: 'assistant',
      content,
      ...(options?.reasoning ? { reasoning: options.reasoning } : {}),
      ...(options?.displayParts?.length ? { displayParts: options.displayParts } : {}),
      createdAt: Date.now(),
      ...(options?.tone ? { tone: options.tone } : {}),
      ...(options?.debugSections && options.debugSections.length > 0 ? { debugSections: options.debugSections } : {}),
      ...(options?.appliedActions && options.appliedActions.length > 0 ? { appliedActions: options.appliedActions } : {}),
      ...(options?.assistantLetterResult ? { assistantLetterResult: options.assistantLetterResult } : {}),
      ...(options?.localQueryResults && options.localQueryResults.length > 0 ? { localQueryResults: options.localQueryResults } : {}),
      ...(options?.memoryUpdates && options.memoryUpdates.length > 0 ? { memoryUpdates: options.memoryUpdates } : {}),
      ...(options?.memoryBefore ? { memoryBefore: options.memoryBefore } : {}),
      ...(options?.dreamUpdates && options.dreamUpdates.length > 0 ? { dreamUpdates: options.dreamUpdates } : {}),
      ...(options?.reminderUpdates && options.reminderUpdates.length > 0 ? { reminderUpdates: options.reminderUpdates } : {}),
      ...(options?.remindersBefore ? { remindersBefore: options.remindersBefore } : {}),
      ...(options?.dailyNewspaperWriteback ? { dailyNewspaperWriteback: options.dailyNewspaperWriteback } : {}),
      ...(options?.dailyReviewWriteback ? { dailyReviewWriteback: options.dailyReviewWriteback } : {}),
      ...(options?.weeklyNewspaperWriteback ? { weeklyNewspaperWriteback: options.weeklyNewspaperWriteback } : {}),
      ...(options?.weeklyReviewWriteback ? { weeklyReviewWriteback: options.weeklyReviewWriteback } : {}),
      ...(options?.monthlyNewspaperWriteback ? { monthlyNewspaperWriteback: options.monthlyNewspaperWriteback } : {}),
      ...(options?.monthlyReviewWriteback ? { monthlyReviewWriteback: options.monthlyReviewWriteback } : {}),
      ...(options?.retryInput ? { retryInput: options.retryInput } : {}),
      ...(options?.retrySourceUserMessageId ? { retrySourceUserMessageId: options.retrySourceUserMessageId } : {}),
      ...(options?.dreamRetryYearMonth ? { dreamRetryYearMonth: options.dreamRetryYearMonth } : {})
    });

    if (options?.dreamUpdates && options.dreamUpdates.length > 0) {
      setExpandedDreamUpdateMessageIds((current) => {
        const next = new Set(current);
        next.add(pendingMessageId);
        return next;
      });
    }

    if (!isOpenRef.current) {
      onUnreadAssistantMessage?.(1);
    }
  };

  const {
    handleDebugCommand
  } = useAIBackfillChatDebugCommands({
    activeRequestRef,
    activeSession,
    buildBackgroundTurnRequest,
    buildRetryConversationHistory,
    conversationHistoryCache,
    debugMode,
    getErrorDebugSections,
    getRetryableAIErrorMessage,
    isLoading,
    mutateSession,
    refreshAssistantMemorySnapshot,
    reloadPersistedChatSessions,
    replacePendingWithResult,
    runBackgroundAssistantLetter,
    setDebugMode,
    setInputText,
    setIsLoading
  });

  const applyAssistantMemoryPatch = (
    patch?: AssistantUnifiedTurnOutput['memoryPatch'],
  ): { before: AssistantMemory; updates: AIChatMemoryUpdateSection[] } | null => {
    if (!patch) {
      return null;
    }

    const before = assistantMemoryService.getMemory();
    const after = assistantMemoryService.applyPatch(patch);
    refreshAssistantMemorySnapshot();
    return {
      before,
      updates: buildMemoryUpdateSections(before, after)
    };
  };

  const resolveAssistantDisplayParts = (
    content: string
  ): string[] | undefined => (
    buildAssistantDisplayParts(content)
  );

  const resolveAssistantReplyContent = (
    output?: Pick<AssistantUnifiedTurnOutput, 'assistantReply' | 'outcome'>,
    fallbackReply?: string
  ): string => {
    const assistantReply = output?.assistantReply?.trim() || '';
    if (assistantReply) {
      return assistantReply;
    }

    return fallbackReply?.trim() || (
      output?.outcome === 'clarify'
        ? '这次还差一点关键信息，你再补一句我就能继续。'
        : '我在。'
    );
  };

  const resolveForegroundAssistantReply = (
    rawContent: string,
    sourceText: string,
    appliedActions: AppliedChatAction[]
  ): string => {
    const editLogActions = appliedActions.filter((action) => action.kind === 'edit_log');
    const successfulEditLogCount = editLogActions.filter((action) => action.status === 'applied').length;
    const failedEditLogActions = editLogActions.filter((action) => action.status === 'failed');

    if (failedEditLogActions.length > 0 && successfulEditLogCount === 0) {
      return failedEditLogActions[0]?.errorMessage?.trim() || '这次我还没实际改动这条记录。';
    }

    if (successfulEditLogCount > 0) {
      return rawContent;
    }

    if (
      LOG_EDIT_REQUEST_PATTERN.test(sourceText)
      && LOG_EDIT_SUCCESS_REPLY_PATTERN.test(rawContent)
    ) {
      return '这次我还没实际改动这条记录。要么是没有匹配到目标记录，要么是修改条件还不够明确。你可以再说得更具体一点，我再帮你改。';
    }

    return rawContent;
  };

  const {
    handleQuickAddBackfill,
    handleQuickAddNote,
    handleQuickAddTodo
  } = useAIBackfillChatQuickAddHandlers({
    activeRequestRef,
    activeSession,
    applyPlannedLogToolCalls,
    applyQuickAddNoteToolCalls,
    applyTodoAndPlannedTimelineLogToolCalls,
    buildAssistantDictionaryContext,
    buildAssistantStateContext,
    buildQuickAddNoteDictionaryContext,
    buildRetryConversationHistory,
    categories,
    createSessionTitleFromUserMessage,
    conversationHistoryCache,
    debugMode,
    defaultDateKey,
    getErrorDebugSections,
    getRetryableAIErrorMessage,
    isAbortError,
    mutateSession,
    notifyAssistantTaskStateChanged,
    prepareForegroundTurn,
    replacePendingWithResult,
    setActiveRequestId,
    setInputText,
    setIsHistoryPanelOpen,
    setIsLoading,
    setIsPersonaPanelOpen
  });

  const runWeeklyReviewNarrativeWriteback = async (
    session: AIChatSession,
    params: {
      weeklyReview: WeeklyReview;
      weekDataText: string;
      mergeMode: 'create' | 'overwrite';
      createdReview: boolean;
    }
  ) => runWeeklyReviewNarrativeWritebackFlow({
    activeRequestRef,
    addToast,
    buildConversationHistory,
    buildPersonaPrompt: buildSharedPersonaPrompt,
    getConversationSummary: (sessionId) => assistantContextBuilder.summarizeConversationTurns(
      conversationHistoryCache.get(sessionId) || [],
      24
    ),
    getRetryableAIErrorMessage,
    isAbortError,
    mutateSession,
    params,
    replacePendingWithResult,
    resolveSessionPersona,
    resolveTemplateMeta: resolveWeeklyReviewTemplateSessionMeta,
    session,
    setInputText,
    setIsHistoryPanelOpen,
    setIsLoading,
    setIsPersonaPanelOpen,
    setWeeklyReviews,
    updateWeeklyReviewTemplateStage
  });

  const runDailyReviewNarrativeWriteback = async (
    session: AIChatSession,
    params: {
      dailyReview: DailyReview;
      dayDataText: string;
      mergeMode: 'create' | 'overwrite';
      createdReview: boolean;
    }
  ) => runDailyReviewNarrativeWritebackFlow({
    activeRequestRef,
    addToast,
    buildConversationHistory,
    buildPersonaPrompt: buildSharedPersonaPrompt,
    debugMode,
    getConversationSummary: (sessionId) => assistantContextBuilder.summarizeConversationTurns(
      conversationHistoryCache.get(sessionId) || [],
      24
    ),
    getRetryableAIErrorMessage,
    isAbortError,
    mutateSession,
    params,
    replacePendingWithResult,
    resolveSessionPersona,
    session,
    setDailyReviewWritebackConfirmation,
    setDailyReviews,
    setInputText,
    setIsHistoryPanelOpen,
    setIsLoading,
    setIsPersonaPanelOpen
  });

  const runDailyNewspaperWriteback = async (
    session: AIChatSession,
    params: {
      dailyReview: DailyReview;
      dayDataText: string;
      mergeMode: 'create' | 'overwrite';
      createdReview: boolean;
    }
  ) => runDailyNewspaperWritebackFlow({
    activeRequestRef,
    assistantMemoryEnabled: assistantAgentConfig.longTermMemoryEnabled,
    addToast,
    applyUnifiedToolCalls,
    buildConversationHistory,
    buildDreamContext,
    buildForegroundAssistantMemory,
    buildForegroundAssistantReminderSummary,
    buildPersonaPrompt: buildSharedPersonaPrompt,
    buildStateContext: buildAssistantStateContext,
    debugMode,
    getConversationSummary: (sessionId) => assistantContextBuilder.summarizeConversationTurns(
      conversationHistoryCache.get(sessionId) || [],
      24
    ),
    getRetryableAIErrorMessage,
    isAbortError,
    mutateSession,
    params,
    replacePendingWithResult,
    resolveSessionPersona,
    session,
    setDailyNewspaperWritebackConfirmation: () => setDailyNewspaperWritebackConfirmation(null),
    setDailyReviews,
    setInputText,
    setIsHistoryPanelOpen,
    setIsLoading,
    setIsPersonaPanelOpen
  });

  const runWeeklyNewspaperWriteback = async (
    session: AIChatSession,
    params: {
      weeklyReview: WeeklyReview;
      weekDataText: string;
      mergeMode: 'create' | 'overwrite';
      createdReview: boolean;
    }
  ) => runWeeklyNewspaperWritebackFlow({
    activeRequestRef,
    addToast,
    buildConversationHistory,
    buildPersonaPrompt: buildSharedPersonaPrompt,
    debugMode,
    getConversationSummary: (sessionId) => assistantContextBuilder.summarizeConversationTurns(
      conversationHistoryCache.get(sessionId) || [],
      24
    ),
    getRetryableAIErrorMessage,
    isAbortError,
    mutateSession,
    params,
    replacePendingWithResult,
    resolveSessionPersona,
    session,
    setInputText,
    setIsHistoryPanelOpen,
    setIsLoading,
    setIsPersonaPanelOpen,
    setWeeklyNewspaperWritebackConfirmation: () => setWeeklyNewspaperWritebackConfirmation(null),
    setWeeklyReviews
  });

  const runMonthlyReviewNarrativeWriteback = async (
    session: AIChatSession,
    params: {
      monthlyReview: MonthlyReview;
      monthDataText: string;
      mergeMode: 'create' | 'overwrite';
      createdReview: boolean;
    }
  ) => runMonthlyReviewNarrativeWritebackFlow({
    activeRequestRef,
    addToast,
    buildConversationHistory,
    buildPersonaPrompt: buildSharedPersonaPrompt,
    getConversationSummary: (sessionId) => assistantContextBuilder.summarizeConversationTurns(
      conversationHistoryCache.get(sessionId) || [],
      24
    ),
    getRetryableAIErrorMessage,
    isAbortError,
    mutateSession,
    params,
    replacePendingWithResult,
    resolveSessionPersona,
    resolveTemplateMeta: resolveMonthlyReviewTemplateSessionMeta,
    session,
    setInputText,
    setIsHistoryPanelOpen,
    setIsLoading,
    setIsPersonaPanelOpen,
    setMonthlyReviews,
    updateWeeklyReviewTemplateStage
  });

  const runMonthlyNewspaperWriteback = async (
    session: AIChatSession,
    params: {
      monthlyReview: MonthlyReview;
      monthDataText: string;
      mergeMode: 'create' | 'overwrite';
      createdReview: boolean;
    }
  ) => runMonthlyNewspaperWritebackFlow({
    activeRequestRef,
    addToast,
    buildConversationHistory,
    buildPersonaPrompt: buildSharedPersonaPrompt,
    debugMode,
    getConversationSummary: (sessionId) => assistantContextBuilder.summarizeConversationTurns(
      conversationHistoryCache.get(sessionId) || [],
      24
    ),
    getRetryableAIErrorMessage,
    isAbortError,
    mutateSession,
    params,
    replacePendingWithResult,
    resolveSessionPersona,
    session,
    setInputText,
    setIsHistoryPanelOpen,
    setIsLoading,
    setIsPersonaPanelOpen,
    setMonthlyNewspaperWritebackConfirmation: () => setMonthlyNewspaperWritebackConfirmation(null),
    setMonthlyReviews
  });

  const {
    handleDailyNewspaperCommand,
    handleDailyNewspaperOverwriteConfirmation,
    handleDailyReviewNarrativeCommand,
    handleDailyReviewNarrativeOverwriteConfirmation,
    handleMonthlyNewspaperCommand,
    handleMonthlyNewspaperOverwriteConfirmation,
    handleMonthlyReviewNarrativeWritebackCommand,
    handleWeeklyNewspaperCommand,
    handleWeeklyNewspaperOverwriteConfirmation,
    handleWeeklyReviewNarrativeWritebackCommand,
    runReviewCommandSafely
  } = useAIBackfillChatReviewCommandHandlers({
    addToast,
    appendSystemMessage,
    appendUserMessage,
    buildMonthDataText: buildMonthlyReviewTemplateMonthDataText,
    buildWeekDataText: buildWeeklyReviewTemplateWeekDataText,
    categories,
    checkTemplates,
    dailyNewspaperWriteback: runDailyNewspaperWriteback,
    dailyNewspaperWritebackConfirmation,
    dailyReviewWriteback: runDailyReviewNarrativeWriteback,
    dailyReviewWritebackConfirmation,
    dailyReviews,
    fallbackDate: targetDate ? getLocalDateStr(defaultTargetDate) : undefined,
    getLocalDateStr,
    getRetryableAIErrorMessage,
    logs,
    monthlyNewspaperWriteback: runMonthlyNewspaperWriteback,
    monthlyNewspaperWritebackConfirmation,
    monthlyReviewWriteback: runMonthlyReviewNarrativeWriteback,
    monthlyReviews,
    prepareForInteraction: prepareForTemplateInteraction,
    resolveMonthlyReviewTemplateSessionMeta,
    resolveWeeklyReviewTemplateSessionMeta,
    reviewTemplates,
    scopes,
    setDailyNewspaperWritebackConfirmation,
    setDailyReviewWritebackConfirmation,
    setMonthlyNewspaperWritebackConfirmation,
    setWeeklyNewspaperWritebackConfirmation,
    todoCategories,
    todos,
    weeklyReviewWriteback: runWeeklyReviewNarrativeWriteback,
    weeklyNewspaperWriteback: runWeeklyNewspaperWriteback,
    weeklyNewspaperWritebackConfirmation,
    weeklyReviews
  });

  const handleDreamCommand = async (
    session: AIChatSession,
    selectedMonth: DreamMonthRangeSelection,
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

  const handleWeeklyReviewTemplateOpeningTurn = async (session: AIChatSession) => {
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

  const handleMonthlyReviewTemplateOpeningTurn = async (session: AIChatSession) => {
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

  const {
    resetDreamTopicUi,
    resetDreamEntryUi,
    updateDreamTopicDraft,
    handleOpenDreamViewer,
    handleCloseDreamViewer,
    handleOpenDreamTopicComposer,
    handleCancelDreamTopicComposer,
    handleOpenDreamEntryEditor,
    handleCancelDreamEntryEditor,
    handleUpdateDreamEntryDraft,
    handleSaveDreamEntry,
    handleSaveDreamTopic,
    handleToggleDreamTopicDelete,
    handleToggleDreamEntryDelete,
    handleConfirmDreamTopicDelete,
    handleConfirmDreamEntryDelete,
    handleToggleDreamTopicEnabled,
    handleConfirmDreamReset,
    handleToggleDreamResetConfirm,
    handleCancelDreamReset,
    handleCancelDreamTopicDelete,
    handleCancelDreamEntryDelete,
    handleSelectDreamTopic,
    handleToggleDreamTopicNoteExpanded,
    handleRunDreamFromViewer,
    handleStartDreamMonthSelection,
    handleSubmitDreamMonthSelection
  } = useAIBackfillChatDreamManager({
    dreamSnapshot,
    selectedDreamTopicId,
    setSelectedDreamTopicId,
    dreamTopicDrafts,
    setDreamTopicDrafts,
    dreamEntryDrafts,
    setDreamEntryDrafts,
    editingDreamTopicId,
    setEditingDreamTopicId,
    setEditingDreamEntryId,
    setDreamTopicDeleteTargetId,
    setDreamEntryDeleteTargetId,
    setDreamMonthSelectionState,
    setIsDreamViewerOpen,
    setIsDreamTopicComposerOpen,
    setIsDreamResetConfirmOpen,
    setIsDreamTopicNoteExpanded,
    setInputText,
    setIsHistoryPanelOpen,
    setIsPersonaPanelOpen,
    activeSession,
    isLoading,
    mutateSession,
    refreshDreamSnapshot,
    addToast,
    handleDreamCommand
  });
  dreamUiHandlersRef.current = {
    resetDreamEntryUi,
    resetDreamTopicUi,
    handleCloseDreamViewer
  };

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

  const handleStopRequest = () => {
    const activeRequest = activeRequestRef.current;
    if (!activeRequest) {
      setActiveRequestId(null);
      setIsLoading(false);
      return;
    }

    activeRequest.controller.abort();
    activeRequestRef.current = null;
    setActiveRequestId(null);
    setIsLoading(false);
    replacePendingWithResult(activeRequest.sessionId, activeRequest.pendingMessageId, '已停止这次请求。', {
      tone: 'system'
    });
  };

  const resolveRetrySourceUserMessageId = (message: AIChatMessage): string | undefined => {
    if (message.retrySourceUserMessageId) {
      return message.retrySourceUserMessageId;
    }

    if (!activeSession) {
      return undefined;
    }

    const messageIndex = activeSession.messages.findIndex((candidate) => candidate.id === message.id);
    if (messageIndex <= 0) {
      return undefined;
    }

    for (let cursor = messageIndex - 1; cursor >= 0; cursor -= 1) {
      if (activeSession.messages[cursor].role === 'user') {
        return activeSession.messages[cursor].id;
      }
    }

    return undefined;
  };

  const handleRetryMessage = (message: AIChatMessage) => {
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

  useEffect(() => {
    const pendingText = pendingHomeMessageRef.current;
    if (!pendingText || isHomeView || !activeSession || activeSession.id !== activeSessionId) {
      return;
    }

    pendingHomeMessageRef.current = null;
    window.setTimeout(() => {
      void handleSend(pendingText);
    }, 0);
  }, [activeSession, activeSessionId, handleSend, isHomeView]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  useEffect(() => {
    if (!isComposerMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (composerMenuRef.current && !composerMenuRef.current.contains(event.target as Node)) {
        setIsComposerMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isComposerMenuOpen]);
  const desktopWidgetTransitionOffset = hiddenEdge === 'left' ? '-12px' : '12px';
  const desktopWidgetAnimationStyles = isDesktopWidgetMode ? (
    <style>{`
      @keyframes aiWidgetShellReveal {
        0% {
          opacity: 0;
          transform: translate3d(var(--ai-widget-enter-x, 0), 0, 0) scale(0.985);
        }
        100% {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
        }
      }

      @keyframes aiWidgetHandleReveal {
        0% {
          opacity: 0;
          transform: translate3d(var(--ai-widget-enter-x, 0), 0, 0) scale(0.96);
        }
        100% {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
        }
      }
    `}</style>
  ) : null;

  if (!isOpen) {
    return null;
  }

  if (isDesktopWidgetMode && edgeHidden) {
    const restoreIcon = hiddenEdge === 'left' ? <ChevronRight size={16} /> : <ChevronLeft size={16} />;

    return (
      <div
        className="fixed inset-0 flex h-full w-full items-center justify-center bg-transparent"
        style={{
          color: AI_CHAT_THEME.textSecondary
        }}
      >
        {desktopWidgetAnimationStyles}
        <button
          type="button"
          onClick={onRestoreFromEdge}
          className="flex h-14 w-4 items-center justify-center rounded-full border shadow-sm transition-colors"
          style={{
            borderColor: AI_CHAT_THEME.chipBorder,
            backgroundColor: AI_CHAT_THEME.panelBg,
            color: AI_CHAT_THEME.textPrimary,
            animation: 'aiWidgetHandleReveal 150ms cubic-bezier(0.22, 1, 0.36, 1)',
            ['--ai-widget-enter-x' as string]: hiddenEdge === 'left' ? '-7px' : '7px'
          }}
          title="展开 AI 对话窗"
        >
          {restoreIcon}
        </button>
      </div>
    );
  }

  const renderAppliedAction = (messageId: string, action: AppliedChatAction) => (
    renderAppliedChatAction({
      action,
      categories,
      formatActionDate,
      formatTimeRange,
      getActivityById,
      getActivityCategory,
      getScopeNames,
      logs,
      messageId,
      onOpenLogEditor: handleOpenLogEditor,
      onOpenPrincipleEditor: handleOpenPrincipleEditor,
      onOpenSelfBeliefEditor: handleOpenSelfBeliefEditor,
      onOpenTodoDetail: handleOpenTodoDetail,
      onUndoCreateSubtaskAction: handleUndoCreateSubtaskAction,
      onUndoEditLogAction: handleUndoEditLogAction,
      onUndoLogAction: handleUndoLogAction,
      onUndoPlannedLogAction: handleUndoPlannedLogAction,
      onUndoPrincipleAction: handleUndoPrincipleAction,
      onUndoSelfBeliefAction: handleUndoSelfBeliefAction,
      onUndoTodoAction: handleUndoTodoAction,
      onUndoUpdateTodoAction: handleUndoUpdateTodoAction,
      theme: AI_CHAT_THEME,
      todoCategories,
      todos
    })
  );

  const fullPromptExampleGroups: Array<{
    title: string;
    prompt: string;
    requirement?: string;
  }> = [
    {
      title: '添加补记',
      prompt: '今天下午两点到三点半写周报，挂到工作 / 写作。'
    },
    {
      title: '添加待办',
      prompt: '帮我建一个明天下午提交的待办：论文初稿。'
    },
    {
      title: '规划今天',
      prompt: '我今天计划推进论文初稿、整理实验数据、晚上去跑步，帮我拆成待办，也顺手安排几个提醒。',
      requirement: '开启后台助理和长期记忆'
    },
    {
      title: '定时提醒',
      prompt: '今晚 8 点提醒我做拉伸，10 点再提醒我准备睡觉。',
      requirement: '开启后台助理和长期记忆'
    },
    {
      title: '长期记忆',
      prompt: '记住我喜欢先做难的事，提醒时语气可以直接一点。',
      requirement: '开启长期记忆'
    },
    {
      title: '随口聊聊',
      prompt: '我今天感觉有点乱，也有点累，陪我理一理现在最该做什么。'
    }
  ];
  const compactPromptExampleGroups = fullPromptExampleGroups.slice(0, 3);
  const emptyPromptExampleGroups = isDesktopWidgetMode
    ? compactPromptExampleGroups
    : fullPromptExampleGroups;
  const conversationMaxWidthClassName = isDesktopWidgetMode ? 'max-w-none' : 'max-w-[920px]';
  const emptyStateMaxWidthClassName = isDesktopWidgetMode ? 'max-w-none' : 'max-w-2xl';
  const composerContainerClassName = isDesktopWidgetMode ? 'max-w-none' : 'max-w-[920px]';

  return (
    <div
      className={`ai-chat-shell fixed inset-0 z-[60] overflow-hidden ${isDesktopWidgetMode ? 'p-[4px]' : ''}`}
      data-ai-chat-theme={isDarkAIChatTheme ? 'dark' : 'light'}
      style={{
        backgroundColor: isDesktopWidgetMode ? 'transparent' : AI_CHAT_THEME.shellBg,
        color: AI_CHAT_THEME.textPrimary
      }}
    >
      {desktopWidgetAnimationStyles}
      <div
        className={`relative flex h-full w-full flex-col overflow-hidden ${isDesktopWidgetMode ? 'rounded-[12px] border' : ''}`}
        style={{
          backgroundColor: AI_CHAT_THEME.shellLayerBg,
          borderColor: isDesktopWidgetMode ? AI_CHAT_THEME.panelBorder : undefined,
          paddingTop: 'var(--app-safe-area-top)',
          paddingBottom: `calc(env(safe-area-inset-bottom) + ${keyboardBottomInset}px)`,
          transition: isDesktopWidgetMode
            ? 'padding-bottom 180ms ease-out, opacity 150ms ease-out, transform 160ms cubic-bezier(0.22, 1, 0.36, 1)'
            : 'padding-bottom 180ms ease-out',
          opacity: isDesktopWidgetMode && desktopWidgetTransitionPhase === 'hiding' ? 0 : 1,
          transform: isDesktopWidgetMode && desktopWidgetTransitionPhase === 'hiding'
            ? `translate3d(${desktopWidgetTransitionOffset}, 0, 0) scale(0.985)`
            : 'translate3d(0, 0, 0) scale(1)',
          animation: isDesktopWidgetMode && desktopWidgetTransitionPhase === 'showing'
            ? 'aiWidgetShellReveal 180ms cubic-bezier(0.22, 1, 0.36, 1)'
            : undefined,
          ['--ai-widget-enter-x' as string]: desktopWidgetTransitionOffset
        }}
      >
        <div
          className="relative flex h-[3.25rem] items-center justify-between gap-3 px-4 backdrop-blur-md"
          style={{
            backgroundColor: AI_CHAT_THEME.panelBg,
            ...(isDesktopWidgetMode ? { WebkitAppRegion: 'drag' as const } : {})
          }}
        >
          <div className="flex min-w-0 items-center gap-3 sm:gap-3.5">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-base transition-all"
              style={{
                backgroundColor: AI_CHAT_THEME.avatarBg,
                boxShadow: AI_CHAT_THEME.avatarShadow,
                ...(isDesktopWidgetMode ? { WebkitAppRegion: 'no-drag' as const } : {})
              }}
              title={isDesktopWidgetMode ? '桌面 AI 快聊窗' : '打开 AI 设置'}
              onClick={() => {
                if (!isDesktopWidgetMode && !isLoading) {
                  setIsPersonaPanelOpen(true);
                }
              }}
            >
              <PersonaAvatar persona={activePersona} iconClassName="text-base" />
            </div>

            <div className="min-w-0 self-center">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate font-serif text-[1.05rem] font-bold leading-none" style={{ color: AI_CHAT_THEME.textPrimary }}>
                  {activePersona.name || 'AI 助手'}
                </h2>
                {isDesktopWidgetMode && (
                  <span
                    className="text-[10px] tracking-[0.08em]"
                    style={{ color: AI_CHAT_THEME.textMuted }}
                  >
                    快聊窗
                  </span>
                )}
                {debugMode && (
                  <span
                    className="text-[10px] tracking-[0.08em]"
                    style={{
                      color: AI_CHAT_THEME.textMuted
                    }}
                  >
                    调试中
                  </span>
                )}
              </div>
            </div>
          </div>

          <div
            className="flex shrink-0 items-center gap-2"
            style={isDesktopWidgetMode ? { WebkitAppRegion: 'no-drag' } : undefined}
          >
            {isDesktopWidgetMode ? (
              <>
                <button
                  onClick={onOpenMainApp}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12px] transition-colors"
                  style={{
                    backgroundColor: AI_CHAT_THEME.panelBg,
                    color: AI_CHAT_THEME.textSecondary
                  }}
                  title="打开主应用"
                >
                  <ExternalLink size={16} />
                  <span className="hidden sm:inline">主窗</span>
                </button>
                <button
                  onClick={onHideToEdge}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                  style={{
                    backgroundColor: AI_CHAT_THEME.panelBg,
                    color: AI_CHAT_THEME.textMuted
                  }}
                  title="贴边隐藏"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                  style={{
                    backgroundColor: AI_CHAT_THEME.panelBg,
                    color: AI_CHAT_THEME.textMuted
                  }}
                  title="关闭"
                >
                  <X size={18} />
                </button>
              </>
            ) : (
              <>
                {!isHomeView && (
                  <button
                    onClick={() => setIsHomeView(true)}
                    disabled={isLoading}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12px] transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ color: AI_CHAT_THEME.textMuted }}
                    title="返回 AI 工作台"
                  >
                    <ArrowLeft size={15} />
                    <span className="hidden sm:inline">工作台</span>
                  </button>
                )}
                <button
                  onClick={() => !isLoading && (isHomeView ? setIsPersonaPanelOpen(true) : setIsHistoryPanelOpen(true))}
                  disabled={isLoading}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    backgroundColor: AI_CHAT_THEME.panelBg,
                    color: AI_CHAT_THEME.textSecondary
                  }}
                  title={isHomeView ? 'AI 设置' : '历史对话'}
                >
                  {isHomeView ? <Settings size={18} /> : <History size={18} />}
                  <span className="hidden sm:inline">{isHomeView ? '设置' : '历史'}</span>
                </button>

                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                  style={{
                    backgroundColor: AI_CHAT_THEME.panelBg,
                    color: AI_CHAT_THEME.textMuted
                  }}
                  title="关闭"
                >
                  <X size={20} />
                </button>
              </>
            )}
          </div>
        </div>

        {isHomeView ? (
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
        )}

        {!isHomeView && !isPersonaPanelOpen && <div
          className="absolute inset-x-0 bottom-0 z-30 px-4 pt-3 backdrop-blur-xl sm:px-5"
          style={{
            backgroundColor: AI_CHAT_THEME.shellLayerBg,
            paddingBottom: `calc(env(safe-area-inset-bottom) + ${keyboardBottomInset}px + 0.75rem)`
          }}
        >
          <div
            className={`relative mx-auto flex ${composerContainerClassName} flex-wrap items-center gap-2 rounded-full border px-2 py-1.5`}
            ref={composerMenuRef}
            style={{
              borderColor: AI_CHAT_THEME.panelBorder,
              backgroundColor: AI_CHAT_THEME.panelBg,
              boxShadow: AI_CHAT_THEME.cardShadow
            }}
          >
            {isComposerMenuOpen && (
              <div
                className="absolute bottom-[calc(100%+0.65rem)] left-0 z-20 w-[min(19rem,calc(100vw-2rem))] rounded-[1rem] border p-2"
                style={{
                  borderColor: AI_CHAT_THEME.panelBorder,
                  backgroundColor: AI_CHAT_THEME.panelBg,
                  boxShadow: AI_CHAT_THEME.cardShadowStrong
                }}
              >
                <div className="grid grid-cols-2 gap-1">
                  <button type="button" onClick={() => { setInputText(QUICK_ADD_TODO_PREFIX); setIsComposerMenuOpen(false); focusComposerAtEnd(); }} className="min-h-10 rounded-[0.7rem] px-3 text-left text-xs" style={{ backgroundColor: AI_CHAT_THEME.inputBg, color: AI_CHAT_THEME.textPrimary }}>快速添加待办</button>
                  <button type="button" onClick={() => { setInputText(QUICK_ADD_NOTE_PREFIX); setIsComposerMenuOpen(false); focusComposerAtEnd(); }} className="min-h-10 rounded-[0.7rem] px-3 text-left text-xs" style={{ backgroundColor: AI_CHAT_THEME.inputBg, color: AI_CHAT_THEME.textPrimary }}>快速添加备注</button>
                  <button type="button" onClick={() => { setInputText(QUICK_ADD_BACKFILL_PREFIX); setIsComposerMenuOpen(false); focusComposerAtEnd(); }} className="min-h-10 rounded-[0.7rem] px-3 text-left text-xs" style={{ backgroundColor: AI_CHAT_THEME.inputBg, color: AI_CHAT_THEME.textPrimary }}>快速添加补记</button>
                  {!isDesktopWidgetMode && activeSession?.templateMeta?.templateType === 'weekly_review' && <button type="button" onClick={() => { handleFillWriteWeeklyNarrativeCommand(); setIsComposerMenuOpen(false); }} className="min-h-10 rounded-[0.7rem] px-3 text-left text-xs" style={{ backgroundColor: AI_CHAT_THEME.inputBg, color: AI_CHAT_THEME.textPrimary }}>写入 AI 叙事</button>}
                  {!isDesktopWidgetMode && activeSession?.templateMeta?.templateType === 'monthly_review' && <button type="button" onClick={() => { handleFillWriteMonthlyNarrativeCommand(); setIsComposerMenuOpen(false); }} className="min-h-10 rounded-[0.7rem] px-3 text-left text-xs" style={{ backgroundColor: AI_CHAT_THEME.inputBg, color: AI_CHAT_THEME.textPrimary }}>写入 AI 叙事</button>}
                  {!isDesktopWidgetMode && !activeSession?.templateMeta && <><button type="button" onClick={() => { handleFillDailyNarrativeCommand(); setIsComposerMenuOpen(false); }} className="min-h-10 rounded-[0.7rem] px-3 text-left text-xs" style={{ backgroundColor: AI_CHAT_THEME.inputBg, color: AI_CHAT_THEME.textPrimary }}>叙事</button><button type="button" onClick={() => { handleFillDailyNewspaperCommand(); setIsComposerMenuOpen(false); }} className="min-h-10 rounded-[0.7rem] px-3 text-left text-xs" style={{ backgroundColor: AI_CHAT_THEME.inputBg, color: AI_CHAT_THEME.textPrimary }}>小报</button></>}
                  {shortcuts.filter((shortcut) => shortcut.enabled).map((shortcut) => <button key={shortcut.id} type="button" onClick={() => { setInputText(shortcut.content); setIsComposerMenuOpen(false); focusComposerAtEnd(); }} className="min-h-10 rounded-[0.7rem] px-3 text-left text-xs" style={{ backgroundColor: AI_CHAT_THEME.inputBg, color: AI_CHAT_THEME.textPrimary }}>{shortcut.title}</button>)}
                  {[...activeWeeklyReviewShortcutOptions, ...activeMonthlyReviewShortcutOptions].map((option) => <button key={option.key} type="button" onClick={() => { if (!isLoading) void handleSend(option.value); setIsComposerMenuOpen(false); }} disabled={isLoading} className="min-h-10 rounded-[0.7rem] px-3 text-left text-xs disabled:opacity-50" style={{ backgroundColor: AI_CHAT_THEME.inputBg, color: AI_CHAT_THEME.textPrimary }}>{option.label}</button>)}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsComposerMenuOpen((open) => !open)}
              className="order-1 inline-flex h-9 w-9 shrink-0 items-center justify-center p-0 transition-opacity hover:opacity-70"
              style={{ color: AI_CHAT_THEME.textSecondary }}
              title="更多功能"
              aria-label="更多功能"
              aria-expanded={isComposerMenuOpen}
            >
              <Plus size={19} strokeWidth={1.8} />
            </button>
            <textarea
              ref={composerTextareaRef}
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                window.requestAnimationFrame(() => {
                  scrollToLatestMessage('auto');
                });
              }}
              placeholder={`和 ${activePersona.assistantSelfName || 'AI'} 说点什么...`}
              className="scrollbar-hide order-2 min-h-[34px] max-h-[34px] min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-1 py-1 text-[15px] leading-6 outline-none"
              style={{ color: AI_CHAT_THEME.textPrimary }}
              autoFocus
            />

            <div className="contents">
              {!isDesktopWidgetMode && activeSession?.templateMeta?.templateType === 'weekly_review' && (
                <button
                  onClick={handleFillWriteWeeklyNarrativeCommand}
                  disabled={isLoading}
                  className="hidden"
                  style={{
                    borderColor: AI_CHAT_THEME.panelBorder,
                    backgroundColor: AI_CHAT_THEME.panelBgStrong,
                    color: AI_CHAT_THEME.textSecondary
                  }}
                  title="填充写入 AI 叙事"
                >
                  写入 AI 叙事
                </button>
              )}
              {!isDesktopWidgetMode && activeSession?.templateMeta?.templateType === 'monthly_review' && (
                <button
                  onClick={handleFillWriteMonthlyNarrativeCommand}
                  disabled={isLoading}
                  className="hidden"
                  style={{
                    borderColor: AI_CHAT_THEME.panelBorder,
                    backgroundColor: AI_CHAT_THEME.panelBgStrong,
                    color: AI_CHAT_THEME.textSecondary
                  }}
                  title="填充写入 AI 叙事"
                >
                  写入 AI 叙事
                </button>
              )}
              {!isDesktopWidgetMode && !activeSession?.templateMeta && (
                <>
                  <button
                    onClick={handleFillDailyNarrativeCommand}
                    disabled={isLoading}
                    className="hidden"
                    style={{
                      borderColor: AI_CHAT_THEME.panelBorder,
                      backgroundColor: AI_CHAT_THEME.panelBgStrong,
                      color: AI_CHAT_THEME.textSecondary
                    }}
                    title="快速填充叙事"
                  >
                    叙事
                  </button>
                  <button
                    onClick={handleFillDailyNewspaperCommand}
                    disabled={isLoading}
                    className="hidden"
                    style={{
                      borderColor: AI_CHAT_THEME.panelBorder,
                      backgroundColor: AI_CHAT_THEME.panelBgStrong,
                      color: AI_CHAT_THEME.textSecondary
                    }}
                    title="快速填充小报"
                  >
                    小报
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setIsComposerMenuOpen(false);
                  if (isStopActionVisible) {
                    handleStopRequest();
                    return;
                  }
                  void handleSend();
                }}
                disabled={!isStopActionVisible && !inputText.trim()}
                className="order-3 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all disabled:cursor-not-allowed disabled:opacity-50"
                style={
                  isStopActionVisible
                    ? {
                        border: `1px solid ${AI_CHAT_THEME.chipBorder}`,
                        backgroundColor: AI_CHAT_THEME.inputBg,
                        color: AI_CHAT_THEME.textSecondary
                      }
                    : {
                        border: `1px solid ${AI_CHAT_THEME.primaryButtonBorder}`,
                        backgroundColor: AI_CHAT_THEME.primaryButtonBg,
                        color: AI_CHAT_THEME.primaryButtonText
                      }
                }
                title={isStopActionVisible ? '停止' : '发送'}
              >
                {isStopActionVisible ? <Square size={16} /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>}

        {!isDesktopWidgetMode && (
          <>
            <AIBackfillChatHistoryOverlay
              activeSessionId={activeSessionId}
              deleteConfirmSessionId={deleteConfirmSessionId}
              editingSessionId={editingSessionId}
              editingSessionTitle={editingSessionTitle}
              formatConversationTime={formatConversationTime}
              getSessionPersona={resolveSessionPersona}
              isOpen={isHistoryPanelOpen}
              onCancelDeleteSession={() => setDeleteConfirmSessionId(null)}
              onCancelRenameSession={handleCancelRenameSession}
              onClose={() => setIsHistoryPanelOpen(false)}
              onCommitRenameSession={handleCommitRenameSession}
              onDeleteSession={handleDeleteSession}
              onEditSessionTitleChange={setEditingSessionTitle}
              onOpenNewSessionDialog={handleOpenNewSessionDialog}
              onSelectSession={handleSelectSessionFromHistory}
              onStartRenameSession={handleStartRenameSession}
              onToggleDeleteSession={handleToggleDeleteSession}
              sortedSessions={sortedSessions}
              theme={AI_CHAT_THEME}
            />

            <AIBackfillChatNewSessionDialog
              isOpen={isNewSessionDialogOpen}
              onClose={handleCloseNewSessionDialog}
              onCreateGenericSession={handleCreateGenericSession}
              onOpenMonthlyReviewTemplateSelection={handleOpenMonthlyReviewTemplateSelection}
              onOpenWeeklyReviewTemplateSelection={handleOpenWeeklyReviewTemplateSelection}
              theme={AI_CHAT_THEME}
            />

            <AIBackfillChatSettingsOverlay
              activeTab={activeSettingsMainTab}
              isOpen={isPersonaPanelOpen}
              onClose={() => setIsPersonaPanelOpen(false)}
              onTabChange={setActiveSettingsMainTab}
              personaContent={(
                <AIBackfillChatPersonaSettingsSection
                  accentMix={accentMix}
                  activePersona={activePersona}
                  activeSessionPersonaId={activeSession?.personaId || ''}
                  chatSyncEnabled={chatSyncEnabled}
                  avatarInputRef={avatarInputRef}
                  customPromptBlocks={customPromptBlocks}
                  deleteConfirmPersonaId={deleteConfirmPersonaId}
                  emojiChoices={PERSONA_EMOJI_CHOICES}
                  emojiDraft={emojiDraft}
                  isEmojiEditorOpen={isEmojiEditorOpen}
                  isUploadingAvatar={isUploadingAvatar}
                  isUploadingUserAvatar={isUploadingUserAvatar}
                  isUserEmojiEditorOpen={isUserEmojiEditorOpen}
                  onApplyEmojiAvatar={handleApplyEmojiAvatar}
                  onApplyPersonaPreset={handleApplyPersonaPreset}
                  onApplyUserEmojiAvatar={handleApplyUserEmojiAvatar}
                  onAvatarUpload={handleAvatarUpload}
                  onCancelDeletePersona={() => setDeleteConfirmPersonaId(null)}
                  onCancelEmojiAvatarEdit={handleCancelEmojiAvatarEdit}
                  onCancelUserEmojiAvatarEdit={handleCancelUserEmojiAvatarEdit}
                  onCreatePersona={handleCreatePersona}
                  onDeleteCurrentPersona={handleDeleteCurrentPersona}
                  onEmojiDraftChange={setEmojiDraft}
                  onResetUserAvatar={handleResetUserAvatar}
                  onSelectEmoji={setEmojiDraft}
                  onSelectUserEmoji={setUserEmojiDraft}
                  onToggleDeletePersona={() => setDeleteConfirmPersonaId((current) => current === activePersona.id ? null : activePersona.id)}
                  onToggleChatSync={handleToggleChatSync}
                  onAddCustomPromptBlock={handleAddCustomPromptBlock}
                  onDeleteCustomPromptBlock={handleDeleteCustomPromptBlock}
                  onUpdateCurrentPersona={updateCurrentPersona}
                  onUpdateCustomPromptBlock={handleUpdateCustomPromptBlock}
                  onUseEmojiAvatar={handleUseEmojiAvatar}
                  onUseUserEmojiAvatar={handleUseUserEmojiAvatar}
                  onUserAvatarUpload={handleUserAvatarUpload}
                  onUserEmojiDraftChange={setUserEmojiDraft}
                  personas={personas}
                  theme={AI_CHAT_THEME}
                  userAvatarInputRef={userAvatarInputRef}
                  userEmojiDraft={userEmojiDraft}
                  userProfile={userProfile}
                />
              )}
              callContent={(
                <AIBackfillChatCallSettingsSection
                  contextMessageLimit={activePersona.contextMessageLimit}
                  onContextMessageLimitChange={(value) => updateCurrentPersona({ contextMessageLimit: value })}
                  theme={AI_CHAT_THEME}
                  shortcutEntry={(
                    <button type="button" onClick={() => setIsShortcutSettingsOpen(true)} className="flex w-full items-center justify-between border-y py-4 text-left" style={{ borderColor: AI_CHAT_THEME.panelBorder }}>
                      <span><span className="block text-sm font-bold text-stone-800">快捷指令</span><span className="mt-1 block text-xs" style={{ color: AI_CHAT_THEME.textMuted }}>{shortcuts.filter((shortcut) => shortcut.enabled).length} 条已启用</span></span>
                      <span className="text-xs" style={{ color: AI_CHAT_THEME.textMuted }}>管理</span>
                    </button>
                  )}
                  assistantSettingsContent={(
                  <AIBackfillChatAssistantSettingsSection
                    assistantAgentConfig={assistantAgentConfig}
                    categories={categories}
                    assistantAgentIntervalDrafts={assistantAgentIntervalDrafts}
                    assistantAgentIntervalErrors={assistantAgentIntervalErrors}
                    assistantAgentQuietHoursDrafts={assistantAgentQuietHoursDrafts}
                    assistantAgentQuietHoursErrors={assistantAgentQuietHoursErrors}
                    assistantLetterDrafts={assistantLetterDrafts}
                    assistantLetterDraftErrors={assistantLetterDraftErrors}
                    nextLetterPreview={nextAssistantLetterPreview}
                    assistantScheduledTaskDrafts={assistantScheduledTaskDrafts}
                    isAssistantScheduledTaskComposerOpen={isAssistantScheduledTaskComposerOpen}
                    assistantScheduledTaskSnapshot={assistantScheduledTaskSnapshot}
                    assistantScheduledTaskDeleteTarget={assistantScheduledTaskDeleteTarget}
                    assistantReminderSnapshot={assistantReminderSnapshot}
                    theme={AI_CHAT_THEME}
                    onUpdateAgentConfig={handleUpdateAssistantAgentConfig}
                    onIntervalDraftChange={handleAssistantAgentIntervalDraftChange}
                    onCommitIntervalDraft={commitAssistantAgentIntervalDraft}
                    onToggleQuietHours={handleToggleAssistantQuietHours}
                    onQuietHoursDraftChange={handleAssistantAgentQuietHoursDraftChange}
                    onCommitQuietHoursDraft={commitAssistantAgentQuietHoursDraft}
                    onToggleLetterEnabled={handleToggleAssistantLetterEnabled}
                    onLetterDraftChange={handleAssistantLetterDraftChange}
                    onCommitLetterDraft={commitAssistantLetterDraft}
                    onOpenScheduledTaskComposer={handleOpenAssistantScheduledTaskComposer}
                    onUpdateScheduledTaskDraft={updateAssistantScheduledTaskDraft}
                    onToggleScheduledTaskWeekday={toggleAssistantScheduledTaskWeekday}
                    onCancelScheduledTaskComposer={handleCancelAssistantScheduledTaskComposer}
                    onSaveScheduledTask={handleSaveAssistantScheduledTask}
                    onToggleScheduledTaskEnabled={handleToggleAssistantScheduledTaskEnabled}
                    onToggleScheduledTaskDelete={handleToggleAssistantScheduledTaskDelete}
                    onCancelScheduledTaskDelete={() => setAssistantScheduledTaskDeleteTarget(null)}
                    onConfirmScheduledTaskDelete={handleConfirmAssistantScheduledTaskDelete}
                    onOpenDreamViewer={handleOpenDreamViewer}
                    onOpenAssistantMemoryViewer={handleOpenAssistantMemoryViewer}
                    onOpenAssistantBackgroundHistoryViewer={handleOpenAssistantBackgroundHistoryViewer}
                    onOpenAssistantLetterHistoryViewer={() => handleOpenAssistantLetterHistoryViewer()}
                  />
                  )}
                />
              )}
              theme={AI_CHAT_THEME}
            />

            <AIChatShortcutSettingsOverlay
              shortcuts={shortcuts}
              isOpen={isShortcutSettingsOpen}
              onAddShortcut={handleAddShortcut}
              onClose={() => setIsShortcutSettingsOpen(false)}
              onDeleteShortcut={handleDeleteShortcut}
              onUpdateShortcut={handleUpdateShortcut}
              theme={AI_CHAT_THEME}
            />

            {isDreamViewerOpen && (
          <AIBackfillChatDreamOverlay
            activeDreamEntries={activeDreamEntries}
            activeDreamTopic={activeDreamTopic}
            dreamSnapshot={dreamSnapshot}
            dreamEntryDeleteTargetId={dreamEntryDeleteTargetId}
            dreamEntryDrafts={dreamEntryDrafts}
            dreamTopicDeleteTargetId={dreamTopicDeleteTargetId}
            dreamTopicDrafts={dreamTopicDrafts}
            editingDreamEntryId={editingDreamEntryId}
            editingDreamTopicId={editingDreamTopicId}
            isDreamResetConfirmOpen={isDreamResetConfirmOpen}
            isDreamTopicComposerOpen={isDreamTopicComposerOpen}
            isDreamTopicNoteExpanded={isDreamTopicNoteExpanded}
            theme={AI_CHAT_THEME}
            onCancelDreamEntryDelete={handleCancelDreamEntryDelete}
            onCancelDreamEntryEditor={handleCancelDreamEntryEditor}
            onCancelDreamReset={handleCancelDreamReset}
            onCancelDreamTopicComposer={handleCancelDreamTopicComposer}
            onCancelDreamTopicDelete={handleCancelDreamTopicDelete}
            onClose={handleCloseDreamViewer}
            onConfirmDreamEntryDelete={handleConfirmDreamEntryDelete}
            onConfirmDreamReset={handleConfirmDreamReset}
            onConfirmDreamTopicDelete={handleConfirmDreamTopicDelete}
            onOpenDreamEntryEditor={handleOpenDreamEntryEditor}
            onOpenDreamTopicComposer={handleOpenDreamTopicComposer}
            onRunDream={handleRunDreamFromViewer}
            onSaveDreamEntry={handleSaveDreamEntry}
            onSaveDreamTopic={handleSaveDreamTopic}
            onSelectDreamTopic={handleSelectDreamTopic}
            onToggleDreamEntryDelete={handleToggleDreamEntryDelete}
            onToggleDreamResetConfirm={handleToggleDreamResetConfirm}
            onToggleDreamTopicDelete={handleToggleDreamTopicDelete}
            onToggleDreamTopicEnabled={handleToggleDreamTopicEnabled}
            onToggleTopicNoteExpanded={handleToggleDreamTopicNoteExpanded}
            onUpdateDreamEntryDraft={handleUpdateDreamEntryDraft}
            onUpdateDreamTopicDraft={updateDreamTopicDraft}
          />
            )}

            {isAssistantMemoryViewerOpen && (
          <AIBackfillChatMemoryOverlay
            assistantMemorySnapshot={assistantMemorySnapshot}
            assistantReminderSnapshot={assistantReminderSnapshot}
            assistantEditableMemoryComposerKey={assistantEditableMemoryComposerKey}
            assistantEditableMemoryDrafts={assistantEditableMemoryDrafts}
            assistantEditableMemoryDeleteTarget={assistantEditableMemoryDeleteTarget}
            assistantReminderDrafts={assistantReminderDrafts}
            isAssistantReminderComposerOpen={isAssistantReminderComposerOpen}
            assistantReminderDeleteTarget={assistantReminderDeleteTarget}
            theme={AI_CHAT_THEME}
            onClearMemory={handleClearAssistantMemory}
            onClose={handleCloseAssistantMemoryViewer}
            onOpenEditableMemoryComposer={handleOpenAssistantEditableMemoryComposer}
            onUpdateEditableMemoryDraft={updateAssistantEditableMemoryDraft}
            onCancelEditableMemoryComposer={handleCancelAssistantEditableMemoryComposer}
            onSaveEditableMemoryEntry={handleSaveAssistantEditableMemoryEntry}
            onToggleEditableMemoryDelete={handleToggleAssistantEditableMemoryDelete}
            onCancelEditableMemoryDelete={() => setAssistantEditableMemoryDeleteTarget(null)}
            onConfirmEditableMemoryDelete={handleConfirmAssistantEditableMemoryDelete}
            onOpenReminderComposer={handleOpenAssistantReminderComposer}
            onUpdateReminderDraft={updateAssistantReminderDraft}
            onCancelReminderComposer={handleCancelAssistantReminderComposer}
            onSaveReminder={handleSaveAssistantReminder}
            onToggleReminderDelete={handleToggleAssistantReminderDelete}
            onCancelReminderDelete={() => setAssistantReminderDeleteTarget(null)}
            onConfirmReminderDelete={handleConfirmAssistantReminderDelete}
          />
            )}

            {isAssistantLetterHistoryViewerOpen && (
          <AssistantLetterHistoryOverlay
            letters={assistantLetterSnapshot}
            activeLetterId={selectedAssistantLetterId}
            deleteTargetId={assistantLetterDeleteTargetId}
            theme={AI_CHAT_THEME}
            onClose={handleCloseAssistantLetterHistoryViewer}
            onOpenLetter={handleOpenAssistantLetterDetail}
            onToggleDelete={handleToggleAssistantLetterDelete}
            onConfirmDelete={handleConfirmAssistantLetterDelete}
          />
            )}

            {isNewspaperHistoryViewerOpen && (
          <AIChatNewspaperHistoryOverlay
            newspapers={assistantNewspaperSnapshot}
            theme={AI_CHAT_THEME}
            onClose={handleCloseNewspaperHistoryViewer}
            onOpenNewspaper={(item) => {
              handleCloseNewspaperHistoryViewer();
              if (item.period === 'daily') {
                handleOpenDailyNewspaper(item.startDate);
              } else if (item.period === 'weekly' && item.endDate) {
                handleOpenWeeklyNewspaper(item.startDate, item.endDate);
              } else if (item.period === 'monthly' && item.endDate) {
                handleOpenMonthlyNewspaper(item.startDate, item.endDate);
              }
            }}
          />
            )}

            {isAssistantLetterDetailSheetOpen && (
          <AssistantLetterDetailSheet
            letter={assistantLetterSnapshot.find((letter) => letter.id === selectedAssistantLetterId) || null}
            theme={AI_CHAT_THEME}
            onClose={handleCloseAssistantLetterDetail}
          />
            )}

            {isAssistantBackgroundHistoryViewerOpen && (
          <AssistantBackgroundHistoryOverlay
            entries={assistantBackgroundTimeline}
            theme={AI_CHAT_THEME}
            onClear={handleClearAssistantBackgroundCallHistory}
            onClose={handleCloseAssistantBackgroundHistoryViewer}
            onOpenDebug={(entry) => setDebugViewer({
              title: `后台请求调试 · ${getAssistantBackgroundTriggerLabel(entry.triggerType)}`,
              sections: [{
                label: '后台 AI 调用',
                exchange: entry.debugExchange as AIDebugExchange
              }]
            })}
            getTriggerLabel={getAssistantBackgroundTriggerLabel}
            getRequestStatusLabel={getAssistantBackgroundRequestStatusLabel}
          />
            )}

            {debugViewer && (
          <AIChatDebugViewerOverlay
            viewer={debugViewer}
            expandedBlockKeys={expandedDebugBlockKeys}
            onClose={() => setDebugViewer(null)}
            onToggleBlock={(blockKey) => {
              setExpandedDebugBlockKeys((current) => {
                const next = new Set(current);
                if (next.has(blockKey)) {
                  next.delete(blockKey);
                } else {
                  next.add(blockKey);
                }
                return next;
              });
            }}
            buildBlocks={buildDebugBlocks}
          />
            )}

            {editingPrincipleId && (
          <PrincipleEditModal
            isEditing
            formData={principleEditFormData}
            onChange={setPrincipleEditFormData}
            onSave={handleSavePrincipleEditor}
            onCancel={handleCancelPrincipleEditor}
          />
            )}

            {editingSelfBeliefId && (
          <SelfBeliefEditModal
            isEditing
            title={selfBeliefTitleDraft}
            descriptionDrafts={selfBeliefDescriptionDrafts}
            newDescriptionText={newSelfBeliefDescriptionText}
            editingDescriptionId={editingSelfBeliefDescriptionId}
            editingDescriptionText={editingSelfBeliefDescriptionText}
            onChange={setSelfBeliefTitleDraft}
            onNewDescriptionTextChange={setNewSelfBeliefDescriptionText}
            onAddDescription={handleAddSelfBeliefDescription}
            onStartEditDescription={handleStartEditSelfBeliefDescription}
            onEditingDescriptionTextChange={setEditingSelfBeliefDescriptionText}
            onSaveDescriptionEdit={handleSaveSelfBeliefDescriptionEdit}
            onCancelDescriptionEdit={handleCancelSelfBeliefDescriptionEdit}
            onDeleteDescription={handleDeleteSelfBeliefDescription}
            onSave={handleSaveSelfBeliefEditor}
            onCancel={handleCancelSelfBeliefEditor}
          />
            )}
          </>
        )}
      </div>
    </div>
  );
};
