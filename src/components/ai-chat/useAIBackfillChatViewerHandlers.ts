/**
 * @file useAIBackfillChatViewerHandlers.ts
 * @input Chat view state, assistant letter state, and background diagnostics services
 * @output Viewer open/close/delete/sync handlers for the AI chat modal
 * @pos Component Support (AI Integration)
 * @description Keeps assistant letter and background diagnostic viewer commands out of the modal coordinator.
 * @updated 2026-09-22: Extracted viewer and chat navigation handlers from AIBackfillChatModal.
 */
import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import AssistantAgent from '../../plugins/AssistantAgentPlugin';
import { assistantLetterService } from '../../services/assistantLetterService';
import { assistantOrchestratorService } from '../../services/assistantOrchestratorService';
import type { AIChatSession } from './AIBackfillChatShared';

export interface AIBackfillChatViewerHandlerOptions {
  addToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  composerTextareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  refreshAssistantBackgroundCallHistory: () => void;
  refreshAssistantLetterSnapshot: () => void;
  refreshAssistantNativeDiagnostics: () => Promise<unknown>;
  selectedAssistantLetterId: string | null;
  sessions: AIChatSession[];
  setActiveSessionId: Dispatch<SetStateAction<string>>;
  setAssistantLetterDeleteTargetId: Dispatch<SetStateAction<string | null>>;
  setChatSyncEnabled: Dispatch<SetStateAction<boolean>>;
  setIsAssistantBackgroundHistoryViewerOpen: Dispatch<SetStateAction<boolean>>;
  setIsAssistantLetterDetailSheetOpen: Dispatch<SetStateAction<boolean>>;
  setIsAssistantLetterHistoryViewerOpen: Dispatch<SetStateAction<boolean>>;
  setIsHomeView: Dispatch<SetStateAction<boolean>>;
  setIsNewspaperHistoryViewerOpen: Dispatch<SetStateAction<boolean>>;
  setInputText: Dispatch<SetStateAction<string>>;
  setSelectedAssistantLetterId: Dispatch<SetStateAction<string | null>>;
}

export const useAIBackfillChatViewerHandlers = ({
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
  setIsAssistantBackgroundHistoryViewerOpen,
  setIsAssistantLetterDetailSheetOpen,
  setIsAssistantLetterHistoryViewerOpen,
  setIsHomeView,
  setIsNewspaperHistoryViewerOpen,
  setInputText,
  setSelectedAssistantLetterId
}: AIBackfillChatViewerHandlerOptions) => {
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
  return {
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
  };
};
