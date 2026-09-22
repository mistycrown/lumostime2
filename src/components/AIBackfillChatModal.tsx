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
 * @updated 2026-09-22: Extracts result-card navigation handlers into a focused hook.
 * @updated 2026-09-22: Extracts review writeback runner adapters into a focused hook.
 * @updated 2026-09-22: Extracts assistant result composition and reply normalization into a focused hook.
 * @updated 2026-09-22: Extracts session history and composer command handlers into a focused hook.
 * @updated 2026-09-22: Extracts chat view, assistant letter, and diagnostics viewer handlers into a focused hook.
 * @updated 2026-09-22: Extracts layered internal back-navigation policy into a focused hook.
 * @updated 2026-09-22: Extracts native assistant lifecycle and background catch-up effects into a focused hook.
 * @updated 2026-09-22: Extracts background assistant trigger processing into a focused hook.
 * @updated 2026-09-22: Extracts native background snapshot and due-item dispatch into a focused hook.
 * @updated 2026-09-22: Extracts the foreground send command router into a focused hook.
 * @updated 2026-09-22: Extracts dream and review-template opening handlers into a focused hook.
 * @updated 2026-09-22: Extracts assistant message retry and rollback handling into a focused hook.
 * @updated 2026-09-22: Extracts the chat header toolbar into a focused component.
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
import { useAIBackfillChatResultNavigation } from './ai-chat/useAIBackfillChatResultNavigation';
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
import { AIBackfillChatSettingsOverlay } from './ai-chat/AIBackfillChatSettingsOverlay';
import { useAIBackfillChatViewState } from './ai-chat/useAIBackfillChatViewState';
import { useAIBackfillChatAssistantState } from './ai-chat/useAIBackfillChatAssistantState';
import { useAIBackfillChatReviewCommandHandlers } from './ai-chat/useAIBackfillChatReviewCommandHandlers';
import { useAIBackfillChatReviewWritebackHandlers } from './ai-chat/useAIBackfillChatReviewWritebackHandlers';
import { useAIBackfillChatResultHandlers } from './ai-chat/useAIBackfillChatResultHandlers';
import { useAIBackfillChatSessionCommandHandlers } from './ai-chat/useAIBackfillChatSessionCommandHandlers';
import { useAIBackfillChatViewerHandlers } from './ai-chat/useAIBackfillChatViewerHandlers';
import { useAIBackfillChatInternalBack } from './ai-chat/useAIBackfillChatInternalBack';
import { useAIBackfillChatBackgroundEffects } from './ai-chat/useAIBackfillChatBackgroundEffects';
import { useAIBackfillChatBackgroundTriggers } from './ai-chat/useAIBackfillChatBackgroundTriggers';
import { useAIBackfillChatBackgroundDispatch } from './ai-chat/useAIBackfillChatBackgroundDispatch';
import { useAIBackfillChatSend } from './ai-chat/useAIBackfillChatSend';
import { useAIBackfillChatTemplateOpeningHandlers } from './ai-chat/useAIBackfillChatTemplateOpeningHandlers';
import { useAIBackfillChatRetry } from './ai-chat/useAIBackfillChatRetry';
import { AIBackfillChatHeader } from './ai-chat/AIBackfillChatHeader';
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
  type AIChatDebugSection,
  type AIChatMessage,
  type AIChatCustomPromptBlock,
  type AIChatPersona,
  type AIChatSession,
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
    parseDreamMonthSelection,
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

  const {
    completeReminderDueTrigger,
    handleAssistantSystemTrigger,
    handleAssistantLogSubmittedEvent,
    drainPendingAssistantSystemTriggers
  } = useAIBackfillChatBackgroundTriggers({
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
  });
  const {
    syncNativeBackgroundExecutionSnapshot,
    flushDueAssistantLetter,
    buildReminderDueTrigger,
    dispatchDueReminder,
    flushDueReminders
  } = useAIBackfillChatBackgroundDispatch({
    AssistantAgent,
    addToast,
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
    normalizeAssistantDateTime,
    buildAssistantReminderDueTrigger
  });

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

  useAIBackfillChatBackgroundEffects({
    AssistantAgent,
    CapacitorApp,
    aiService,
    assistantAgentConfig,
    assistantMemorySnapshot,
    assistantReminderSnapshot,
    conversationHistoryCache,
    drainPendingAssistantSystemTriggers,
    flushDueAssistantLetter,
    flushDueReminders,
    handleAssistantSystemTrigger,
    hasCompletedStartupReminderCatchupRef,
    hydrateAssistantReminderSnapshotFromNative,
    isAssistantBackgroundContextReady,
    refreshAssistantNativeDiagnostics,
    syncNativeBackgroundExecutionSnapshot
  });


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


  const {
    handleCancelRenameSession,
    handleCloseNewSessionDialog,
    handleCommitRenameSession,
    handleCreateGenericSession,
    handleCreateSessionWithPersona,
    handleDeleteSession,
    handleFillDailyNarrativeCommand,
    handleFillDailyNewspaperCommand,
    handleFillWriteMonthlyNarrativeCommand,
    handleFillWriteWeeklyNarrativeCommand,
    handleOpenMonthlyReviewTemplateSelection,
    handleOpenNewSessionDialog,
    handleOpenWeeklyReviewTemplateSelection,
    handleSelectSessionFromHistory,
    handleStartRenameSession,
    handleToggleDeleteSession
  } = useAIBackfillChatSessionCommandHandlers({
    activeRequestRef,
    activeSession,
    activeSessionId,
    addToast,
    composerTextareaRef,
    editingSessionId,
    editingSessionTitle,
    isLoading,
    mutateSession,
    sessions,
    sortedSessions,
    setActiveSessionId,
    setDeleteConfirmPersonaId,
    setDeleteConfirmSessionId,
    setEditingSessionId,
    setEditingSessionTitle,
    setInputText,
    setIsHistoryPanelOpen,
    setIsHomeView,
    setIsNewSessionDialogOpen,
    setSessions
  });

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

  const {
    handleClearAssistantBackgroundCallHistory,
    handleCloseAssistantBackgroundHistoryViewer,
    handleCloseAssistantLetterDetail,
    handleCloseAssistantLetterHistoryViewer,
    handleCloseNewspaperHistoryViewer,
    handleConfirmAssistantLetterDelete,
    handleOpenAssistantBackgroundHistoryViewer,
    handleOpenAssistantLetterDetail,
    handleOpenAssistantLetterHistoryViewer,
    handleOpenChatView,
    handleOpenNewspaperHistoryViewer,
    handleToggleAssistantLetterDelete,
    handleToggleChatSync
  } = useAIBackfillChatViewerHandlers({
    addToast,
    composerTextareaRef,
    refreshAssistantBackgroundCallHistory,
    refreshAssistantLetterSnapshot,
    refreshAssistantNativeDiagnostics,
    selectedAssistantLetterId,
    sessions,
    setActiveSessionId,
    setAssistantLetterDeleteTargetId,
    setChatSyncEnabled,
    setInputText,
    setIsAssistantBackgroundHistoryViewerOpen,
    setIsAssistantLetterDetailSheetOpen,
    setIsAssistantLetterHistoryViewerOpen,
    setIsHomeView,
    setIsNewspaperHistoryViewerOpen,
    setSelectedAssistantLetterId
  });

  const handleAIInternalBack = useAIBackfillChatInternalBack({
    assistantEditableMemoryComposerKey,
    assistantEditableMemoryDeleteTarget,
    assistantReminderDeleteTarget,
    assistantScheduledTaskDeleteTarget,
    debugViewer,
    deleteConfirmPersonaId,
    deleteConfirmSessionId,
    dreamEntryDeleteTargetId,
    dreamTopicDeleteTargetId,
    dreamUiHandlersRef,
    editingDreamEntryId,
    editingSessionId,
    handleCancelAssistantEditableMemoryComposer,
    handleCancelRenameSession,
    handleCloseAssistantBackgroundHistoryViewer,
    handleCloseAssistantLetterDetail,
    handleCloseAssistantLetterHistoryViewer,
    handleCloseAssistantMemoryViewer,
    handleCloseNewspaperHistoryViewer,
    handleCloseNewSessionDialog,
    isAssistantBackgroundHistoryViewerOpen,
    isAssistantLetterDetailSheetOpen,
    isAssistantLetterHistoryViewerOpen,
    isAssistantMemoryViewerOpen,
    isAssistantReminderComposerOpen,
    isAssistantScheduledTaskComposerOpen,
    isDreamResetConfirmOpen,
    isDreamTopicComposerOpen,
    isDreamViewerOpen,
    isEmojiEditorOpen,
    isHistoryPanelOpen,
    isHomeView,
    isNewSessionDialogOpen,
    isOpen,
    isPersonaPanelOpen,
    isShortcutSettingsOpen,
    isUserEmojiEditorOpen,
    isNewspaperHistoryViewerOpen,
    onClose,
    resetAssistantReminderUi,
    resetAssistantScheduledTaskUi,
    setAssistantEditableMemoryDeleteTarget,
    setAssistantReminderDeleteTarget,
    setAssistantScheduledTaskDeleteTarget,
    setDebugViewer,
    setDeleteConfirmPersonaId,
    setDeleteConfirmSessionId,
    setIsDreamResetConfirmOpen,
    setIsEmojiEditorOpen,
    setIsHistoryPanelOpen,
    setIsHomeView,
    setIsPersonaPanelOpen,
    setIsShortcutSettingsOpen,
    setIsUserEmojiEditorOpen,
    setDreamEntryDeleteTargetId,
    setDreamTopicDeleteTargetId
  });

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

  const {
    handleOpenDailyNewspaper,
    handleOpenDailyReviewNarrative,
    handleOpenLogEditor,
    handleOpenMonthlyNewspaper,
    handleOpenMonthlyReviewNarrative,
    handleOpenTodoDetail,
    handleOpenWeeklyNewspaper,
    handleOpenWeeklyReviewNarrative
  } = useAIBackfillChatResultNavigation({
    addToast,
    isDesktopWidgetMode,
    logs,
    onClose,
    onOpenMainApp,
    onRequestReturnToAI,
    setCurrentDailyNewspaperDate,
    setCurrentDailyReviewInitialTab,
    setCurrentMonthlyNewspaperStart,
    setCurrentMonthlyNewspaperEnd,
    setCurrentMonthlyReviewInitialTab,
    setCurrentMonthlyReviewStart,
    setCurrentMonthlyReviewEnd,
    setCurrentReviewDate,
    setCurrentView,
    setCurrentWeeklyNewspaperStart,
    setCurrentWeeklyNewspaperEnd,
    setCurrentWeeklyReviewInitialTab,
    setCurrentWeeklyReviewStart,
    setCurrentWeeklyReviewEnd,
    setEditingLog,
    setEditingTodo,
    setInitialLogTimes,
    setIsAddModalOpen,
    setIsDailyNewspaperOpen,
    setIsDailyReviewOpen,
    setIsMonthlyNewspaperOpen,
    setIsMonthlyReviewOpen,
    setIsTodoModalOpen,
    setIsWeeklyNewspaperOpen,
    setIsWeeklyReviewOpen,
    setNewTodoDraft,
    setTodoCategoryToAdd,
    todos
  });

  const {
    applyAssistantMemoryPatch,
    replacePendingWithResult,
    resolveAssistantDisplayParts,
    resolveAssistantReplyContent,
    resolveForegroundAssistantReply
  } = useAIBackfillChatResultHandlers({
    isOpenRef,
    onUnreadAssistantMessage,
    replaceMessage,
    refreshAssistantMemorySnapshot,
    setExpandedDreamUpdateMessageIds
  });

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

  const {
    runDailyNewspaperWriteback,
    runDailyReviewNarrativeWriteback,
    runMonthlyNewspaperWriteback,
    runMonthlyReviewNarrativeWriteback,
    runWeeklyNewspaperWriteback,
    runWeeklyReviewNarrativeWriteback
  } = useAIBackfillChatReviewWritebackHandlers({
    activeRequestRef,
    addToast,
    applyUnifiedToolCalls,
    assistantMemoryEnabled: assistantAgentConfig.longTermMemoryEnabled,
    buildAssistantStateContext,
    buildConversationHistory,
    buildDreamContext,
    buildForegroundAssistantMemory,
    buildForegroundAssistantReminderSummary,
    buildSharedPersonaPrompt,
    conversationHistoryCache,
    debugMode,
    getRetryableAIErrorMessage,
    isAbortError,
    mutateSession,
    replacePendingWithResult,
    resolveSessionPersona,
    resolveMonthlyReviewTemplateSessionMeta,
    resolveWeeklyReviewTemplateSessionMeta,
    setDailyNewspaperWritebackConfirmation: () => setDailyNewspaperWritebackConfirmation(null),
    setDailyReviews,
    setDailyReviewWritebackConfirmation,
    setInputText,
    setIsHistoryPanelOpen,
    setIsLoading,
    setIsPersonaPanelOpen,
    setMonthlyNewspaperWritebackConfirmation: () => setMonthlyNewspaperWritebackConfirmation(null),
    setMonthlyReviews,
    setWeeklyNewspaperWritebackConfirmation: () => setWeeklyNewspaperWritebackConfirmation(null),
    setWeeklyReviews,
    updateWeeklyReviewTemplateStage
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

  const {
    handleDreamCommand,
    handleWeeklyReviewTemplateOpeningTurn,
    handleMonthlyReviewTemplateOpeningTurn
  } = useAIBackfillChatTemplateOpeningHandlers({
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
    todos
  });



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

  const handleSend = useAIBackfillChatSend({

    activePersona,
    activeRequestRef,
    activeSession,
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
    weeklyReviews,
    weeklyReviewTemplateService
  });

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

  const handleRetryMessage = useAIBackfillChatRetry({

    activeSession,
    addToast,
    assistantMemoryService,
    assistantReminderQueueService,
    getLocalDateStr,
    handleDreamCommand,
    handleSend,
    isLoading,
    logs,
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
  });

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
        <AIBackfillChatHeader
          AI_CHAT_THEME={AI_CHAT_THEME}
          activePersona={activePersona}
          debugMode={debugMode}
          isDesktopWidgetMode={isDesktopWidgetMode}
          isHomeView={isHomeView}
          isLoading={isLoading}
          onClose={onClose}
          onHideToEdge={onHideToEdge}
          onOpenMainApp={onOpenMainApp}
          setIsHistoryPanelOpen={setIsHistoryPanelOpen}
          setIsPersonaPanelOpen={setIsPersonaPanelOpen}
          setIsHomeView={setIsHomeView}
        />


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
