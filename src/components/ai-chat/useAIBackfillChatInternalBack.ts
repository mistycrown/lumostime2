/**
 * @file useAIBackfillChatInternalBack.ts
 * @input Layered modal state and close/reset handlers
 * @output Android/native back-navigation callback
 * @pos Component Support (AI Integration)
 * @description Keeps layered back-navigation policy out of AIBackfillChatModal.
 * @updated 2026-09-22: Extracted the internal back-navigation handler.
 */

import { useCallback, type MutableRefObject } from 'react';

import type {
  AssistantEditableMemoryDeleteTarget,
  AssistantReminderDeleteTarget,
  AssistantScheduledTaskDeleteTarget
} from './AIBackfillChatShared';

interface DreamUiHandlers {
  resetDreamEntryUi: () => void;
  resetDreamTopicUi: () => void;
  handleCloseDreamViewer: () => void;
}

interface UseAIBackfillChatInternalBackOptions {
  isOpen: boolean;
  debugViewer: unknown;
  setDebugViewer: (value: null) => void;
  isAssistantLetterDetailSheetOpen: boolean;
  handleCloseAssistantLetterDetail: () => void;
  isAssistantLetterHistoryViewerOpen: boolean;
  handleCloseAssistantLetterHistoryViewer: () => void;
  isNewspaperHistoryViewerOpen: boolean;
  handleCloseNewspaperHistoryViewer: () => void;
  isAssistantBackgroundHistoryViewerOpen: boolean;
  handleCloseAssistantBackgroundHistoryViewer: () => void;
  isAssistantMemoryViewerOpen: boolean;
  assistantReminderDeleteTarget: AssistantReminderDeleteTarget | null;
  setAssistantReminderDeleteTarget: (value: null) => void;
  assistantScheduledTaskDeleteTarget: AssistantScheduledTaskDeleteTarget | null;
  setAssistantScheduledTaskDeleteTarget: (value: null) => void;
  isAssistantScheduledTaskComposerOpen: boolean;
  resetAssistantScheduledTaskUi: () => void;
  isAssistantReminderComposerOpen: boolean;
  resetAssistantReminderUi: () => void;
  assistantEditableMemoryDeleteTarget: AssistantEditableMemoryDeleteTarget | null;
  setAssistantEditableMemoryDeleteTarget: (value: null) => void;
  assistantEditableMemoryComposerKey: string | null;
  handleCancelAssistantEditableMemoryComposer: (key: string) => void;
  handleCloseAssistantMemoryViewer: () => void;
  isDreamViewerOpen: boolean;
  isDreamResetConfirmOpen: boolean;
  setIsDreamResetConfirmOpen: (value: boolean) => void;
  dreamEntryDeleteTargetId: string | null;
  setDreamEntryDeleteTargetId: (value: null) => void;
  editingDreamEntryId: string | null;
  dreamTopicDeleteTargetId: string | null;
  setDreamTopicDeleteTargetId: (value: null) => void;
  isDreamTopicComposerOpen: boolean;
  dreamUiHandlersRef: MutableRefObject<DreamUiHandlers>;
  isUserEmojiEditorOpen: boolean;
  setIsUserEmojiEditorOpen: (value: boolean) => void;
  isNewSessionDialogOpen: boolean;
  handleCloseNewSessionDialog: () => void;
  isShortcutSettingsOpen: boolean;
  setIsShortcutSettingsOpen: (value: boolean) => void;
  isEmojiEditorOpen: boolean;
  setIsEmojiEditorOpen: (value: boolean) => void;
  isPersonaPanelOpen: boolean;
  deleteConfirmPersonaId: string | null;
  setDeleteConfirmPersonaId: (value: null) => void;
  setIsPersonaPanelOpen: (value: boolean) => void;
  isHistoryPanelOpen: boolean;
  deleteConfirmSessionId: string | null;
  setDeleteConfirmSessionId: (value: null) => void;
  editingSessionId: string | null;
  handleCancelRenameSession: () => void;
  setIsHistoryPanelOpen: (value: boolean) => void;
  isHomeView: boolean;
  setIsHomeView: (value: boolean) => void;
  onClose: () => void;
}

export function useAIBackfillChatInternalBack({
  isOpen,
  debugViewer,
  setDebugViewer,
  isAssistantLetterDetailSheetOpen,
  handleCloseAssistantLetterDetail,
  isAssistantLetterHistoryViewerOpen,
  handleCloseAssistantLetterHistoryViewer,
  isNewspaperHistoryViewerOpen,
  handleCloseNewspaperHistoryViewer,
  isAssistantBackgroundHistoryViewerOpen,
  handleCloseAssistantBackgroundHistoryViewer,
  isAssistantMemoryViewerOpen,
  assistantReminderDeleteTarget,
  setAssistantReminderDeleteTarget,
  assistantScheduledTaskDeleteTarget,
  setAssistantScheduledTaskDeleteTarget,
  isAssistantScheduledTaskComposerOpen,
  resetAssistantScheduledTaskUi,
  isAssistantReminderComposerOpen,
  resetAssistantReminderUi,
  assistantEditableMemoryDeleteTarget,
  setAssistantEditableMemoryDeleteTarget,
  assistantEditableMemoryComposerKey,
  handleCancelAssistantEditableMemoryComposer,
  handleCloseAssistantMemoryViewer,
  isDreamViewerOpen,
  isDreamResetConfirmOpen,
  setIsDreamResetConfirmOpen,
  dreamEntryDeleteTargetId,
  setDreamEntryDeleteTargetId,
  editingDreamEntryId,
  dreamTopicDeleteTargetId,
  setDreamTopicDeleteTargetId,
  isDreamTopicComposerOpen,
  dreamUiHandlersRef,
  isUserEmojiEditorOpen,
  setIsUserEmojiEditorOpen,
  isNewSessionDialogOpen,
  handleCloseNewSessionDialog,
  isShortcutSettingsOpen,
  setIsShortcutSettingsOpen,
  isEmojiEditorOpen,
  setIsEmojiEditorOpen,
  isPersonaPanelOpen,
  deleteConfirmPersonaId,
  setDeleteConfirmPersonaId,
  setIsPersonaPanelOpen,
  isHistoryPanelOpen,
  deleteConfirmSessionId,
  setDeleteConfirmSessionId,
  editingSessionId,
  handleCancelRenameSession,
  setIsHistoryPanelOpen,
  isHomeView,
  setIsHomeView,
  onClose
}: UseAIBackfillChatInternalBackOptions): (() => boolean) {
  return useCallback((): boolean => {
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
}
