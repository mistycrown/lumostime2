/**
 * @file useAIBackfillChatViewState.ts
 * @input AI chat view lifecycle flags, editor drafts, message expansion state, and DOM references
 * @output Stable view-state bundle for AIBackfillChatModal
 * @pos Component Support (AI Integration)
 * @description Keeps presentational state and element references out of the AI request and background-agent orchestration component.
 */
import { useCallback, useRef, useState } from 'react';
import type { AssistantEditableMemoryListKey } from '../../types/assistant';
import type { AssistantEditableMemoryDeleteTarget, AssistantReminderDeleteTarget, AssistantReminderDrafts, AssistantScheduledTaskDeleteTarget, AssistantScheduledTaskDrafts, AISettingsMainTab, DailyNewspaperWritebackConfirmationState, DailyReviewWritebackConfirmationState, DebugViewerState, DreamEntryDrafts, DreamMonthSelectionState, DreamTopicDrafts, MonthlyNewspaperWritebackConfirmationState, WeeklyNewspaperWritebackConfirmationState } from './AIBackfillChatShared';
import {
  DEFAULT_ASSISTANT_EDITABLE_MEMORY_DRAFTS,
  DEFAULT_ASSISTANT_REMINDER_DRAFTS,
  DEFAULT_ASSISTANT_SCHEDULED_TASK_DRAFTS,
  DEFAULT_DREAM_ENTRY_DRAFTS,
  DEFAULT_DREAM_TOPIC_DRAFTS
} from './AIBackfillChatShared';
import type { PrincipleEditFormData } from '../PrincipleEditModal';
import type { SelfBeliefDescriptionDraft } from '../SelfBeliefEditModal';

export const useAIBackfillChatViewState = (initialIsOpen = false) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [isPersonaPanelOpen, setIsPersonaPanelOpen] = useState(false);
  const [isShortcutSettingsOpen, setIsShortcutSettingsOpen] = useState(false);
  const [isHomeView, setIsHomeView] = useState(true);
  const [isComposerMenuOpen, setIsComposerMenuOpen] = useState(false);
  const [isNewSessionDialogOpen, setIsNewSessionDialogOpen] = useState(false);
  const [activeSettingsMainTab, setActiveSettingsMainTab] = useState<AISettingsMainTab>('persona');
  const [debugViewer, setDebugViewer] = useState<DebugViewerState | null>(null);
  const [expandedDebugBlockKeys, setExpandedDebugBlockKeys] = useState<Set<string>>(new Set());
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState('');
  const [deleteConfirmSessionId, setDeleteConfirmSessionId] = useState<string | null>(null);
  const [deleteConfirmPersonaId, setDeleteConfirmPersonaId] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isEmojiEditorOpen, setIsEmojiEditorOpen] = useState(false);
  const [emojiDraft, setEmojiDraft] = useState('');
  const [isUploadingUserAvatar, setIsUploadingUserAvatar] = useState(false);
  const [isUserEmojiEditorOpen, setIsUserEmojiEditorOpen] = useState(false);
  const [userEmojiDraft, setUserEmojiDraft] = useState('');
  const [isAssistantMemoryViewerOpen, setIsAssistantMemoryViewerOpen] = useState(false);
  const [isDreamViewerOpen, setIsDreamViewerOpen] = useState(false);
  const [isAssistantLetterHistoryViewerOpen, setIsAssistantLetterHistoryViewerOpen] = useState(false);
  const [isNewspaperHistoryViewerOpen, setIsNewspaperHistoryViewerOpen] = useState(false);
  const [isAssistantLetterDetailSheetOpen, setIsAssistantLetterDetailSheetOpen] = useState(false);
  const [selectedAssistantLetterId, setSelectedAssistantLetterId] = useState<string | null>(null);
  const [assistantLetterDeleteTargetId, setAssistantLetterDeleteTargetId] = useState<string | null>(null);
  const [dreamMonthSelectionState, setDreamMonthSelectionState] = useState<DreamMonthSelectionState | null>(null);
  const [dailyReviewWritebackConfirmation, setDailyReviewWritebackConfirmation] = useState<DailyReviewWritebackConfirmationState | null>(null);
  const [dailyNewspaperWritebackConfirmation, setDailyNewspaperWritebackConfirmation] = useState<DailyNewspaperWritebackConfirmationState | null>(null);
  const [weeklyNewspaperWritebackConfirmation, setWeeklyNewspaperWritebackConfirmation] = useState<WeeklyNewspaperWritebackConfirmationState | null>(null);
  const [monthlyNewspaperWritebackConfirmation, setMonthlyNewspaperWritebackConfirmation] = useState<MonthlyNewspaperWritebackConfirmationState | null>(null);
  const [selectedDreamTopicId, setSelectedDreamTopicId] = useState('');
  const [isDreamTopicNoteExpanded, setIsDreamTopicNoteExpanded] = useState(false);
  const [dreamTopicDrafts, setDreamTopicDrafts] = useState<DreamTopicDrafts>(DEFAULT_DREAM_TOPIC_DRAFTS);
  const [isDreamTopicComposerOpen, setIsDreamTopicComposerOpen] = useState(false);
  const [editingDreamTopicId, setEditingDreamTopicId] = useState<string | null>(null);
  const [isDreamResetConfirmOpen, setIsDreamResetConfirmOpen] = useState(false);
  const [dreamTopicDeleteTargetId, setDreamTopicDeleteTargetId] = useState<string | null>(null);
  const [editingDreamEntryId, setEditingDreamEntryId] = useState<string | null>(null);
  const [dreamEntryDrafts, setDreamEntryDrafts] = useState<DreamEntryDrafts>(DEFAULT_DREAM_ENTRY_DRAFTS);
  const [dreamEntryDeleteTargetId, setDreamEntryDeleteTargetId] = useState<string | null>(null);
  const [assistantEditableMemoryDrafts, setAssistantEditableMemoryDrafts] = useState<Record<AssistantEditableMemoryListKey, string>>(DEFAULT_ASSISTANT_EDITABLE_MEMORY_DRAFTS);
  const [assistantEditableMemoryComposerKey, setAssistantEditableMemoryComposerKey] = useState<AssistantEditableMemoryListKey | null>(null);
  const [assistantEditableMemoryDeleteTarget, setAssistantEditableMemoryDeleteTarget] = useState<AssistantEditableMemoryDeleteTarget | null>(null);
  const [assistantReminderDrafts, setAssistantReminderDrafts] = useState<AssistantReminderDrafts>(DEFAULT_ASSISTANT_REMINDER_DRAFTS);
  const [isAssistantReminderComposerOpen, setIsAssistantReminderComposerOpen] = useState(false);
  const [assistantReminderDeleteTarget, setAssistantReminderDeleteTarget] = useState<AssistantReminderDeleteTarget | null>(null);
  const [assistantScheduledTaskDrafts, setAssistantScheduledTaskDrafts] = useState<AssistantScheduledTaskDrafts>(DEFAULT_ASSISTANT_SCHEDULED_TASK_DRAFTS);
  const [isAssistantScheduledTaskComposerOpen, setIsAssistantScheduledTaskComposerOpen] = useState(false);
  const [assistantScheduledTaskDeleteTarget, setAssistantScheduledTaskDeleteTarget] = useState<AssistantScheduledTaskDeleteTarget | null>(null);
  const [expandedMemoryUpdateMessageIds, setExpandedMemoryUpdateMessageIds] = useState<Set<string>>(() => new Set());
  const [expandedReasoningMessageIds, setExpandedReasoningMessageIds] = useState<Set<string>>(() => new Set());
  const [expandedDreamUpdateMessageIds, setExpandedDreamUpdateMessageIds] = useState<Set<string>>(() => new Set());
  const [expandedReminderUpdateMessageIds, setExpandedReminderUpdateMessageIds] = useState<Set<string>>(() => new Set());
  const [expandedLocalQueryMessageIds, setExpandedLocalQueryMessageIds] = useState<Set<string>>(() => new Set());
  const [revealedAssistantPartCounts, setRevealedAssistantPartCounts] = useState<Record<string, number>>({});
  const [editingPrincipleId, setEditingPrincipleId] = useState<string | null>(null);
  const [principleEditFormData, setPrincipleEditFormData] = useState<PrincipleEditFormData>({ title: '', frontText: '', backText: '' });
  const [editingSelfBeliefId, setEditingSelfBeliefId] = useState<string | null>(null);
  const [selfBeliefTitleDraft, setSelfBeliefTitleDraft] = useState('');
  const [selfBeliefDescriptionDrafts, setSelfBeliefDescriptionDrafts] = useState<SelfBeliefDescriptionDraft[]>([]);
  const [newSelfBeliefDescriptionText, setNewSelfBeliefDescriptionText] = useState('');
  const [editingSelfBeliefDescriptionId, setEditingSelfBeliefDescriptionId] = useState<string | null>(null);
  const [editingSelfBeliefDescriptionText, setEditingSelfBeliefDescriptionText] = useState('');
  const [keyboardBottomInset, setKeyboardBottomInset] = useState(0);

  const activeRequestRef = useRef<{ controller: AbortController; pendingMessageId: string; sessionId: string } | null>(null);
  const retryingMessageIdRef = useRef<string | null>(null);
  const isOpenRef = useRef(initialIsOpen);
  const wasOpenRef = useRef(initialIsOpen);
  const homeWasOpenRef = useRef(initialIsOpen);
  const processingDueReminderIdsRef = useRef<Set<string>>(new Set());
  const isProcessingAssistantLetterRef = useRef(false);
  const assistantPartRevealTimeoutsRef = useRef<Map<string, number[]>>(new Map());
  const revealedAssistantPartCountsRef = useRef<Record<string, number>>({});
  const hydratedRevealSessionIdsRef = useRef<Set<string>>(new Set());
  const assistantRevealTargetCountsRef = useRef<Map<string, number>>(new Map());
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const userAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerMenuRef = useRef<HTMLDivElement | null>(null);
  const pendingHomeMessageRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageElementRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const handledNavigationKeyRef = useRef('');
  const handledAssistantTriggerIdsRef = useRef<Set<string>>(new Set());
  const processingAssistantTriggerIdsRef = useRef<Set<string>>(new Set());
  const hasCompletedStartupReminderCatchupRef = useRef(false);
  const visualViewportBaselineRef = useRef<{ height: number; width: number }>({ height: 0, width: 0 });

  const focusComposerAtEnd = useCallback(() => {
    window.requestAnimationFrame(() => {
      const textarea = composerTextareaRef.current;
      if (!textarea) return;
      textarea.focus();
      const end = textarea.value.length;
      textarea.setSelectionRange(end, end);
    });
  }, []);

  const handleMessageElementRef = useCallback((messageId: string, node: HTMLDivElement | null) => {
    if (node) {
      messageElementRefs.current.set(messageId, node);
    } else {
      messageElementRefs.current.delete(messageId);
    }
  }, []);

  return {
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
  };
};
