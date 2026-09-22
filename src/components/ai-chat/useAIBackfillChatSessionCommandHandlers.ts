/**
 * @file useAIBackfillChatSessionCommandHandlers.ts
 * @input Session state, session persistence callbacks, and composer controls
 * @output New-session, history, rename/delete, and review-command fill handlers
 * @pos Component Support (AI Integration)
 * @description Keeps session list commands and composer shortcuts out of the main chat modal.
 * @updated 2026-09-22: Extracted session command handlers from AIBackfillChatModal.
 */
import type { MutableRefObject, Dispatch, SetStateAction } from 'react';
import type { AIChatSession } from './AIBackfillChatShared';
import {
  createMonthlyReviewTemplateSession,
  createWeeklyReviewTemplateSession
} from './AIBackfillChatTemplateFlow';
import { createDefaultSession } from './AIBackfillChatInitialization';

export interface AIBackfillChatSessionCommandHandlerOptions {
  activeRequestRef: MutableRefObject<{ sessionId: string } | null>;
  activeSession: AIChatSession | null;
  activeSessionId: string;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  composerTextareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  editingSessionId: string | null;
  editingSessionTitle: string;
  isLoading: boolean;
  mutateSession: (sessionId: string, updater: (session: AIChatSession) => AIChatSession) => void;
  sessions: AIChatSession[];
  sortedSessions: AIChatSession[];
  setActiveSessionId: Dispatch<SetStateAction<string>>;
  setDeleteConfirmPersonaId: Dispatch<SetStateAction<string | null>>;
  setDeleteConfirmSessionId: Dispatch<SetStateAction<string | null>>;
  setEditingSessionId: Dispatch<SetStateAction<string | null>>;
  setEditingSessionTitle: Dispatch<SetStateAction<string>>;
  setInputText: Dispatch<SetStateAction<string>>;
  setIsHistoryPanelOpen: Dispatch<SetStateAction<boolean>>;
  setIsHomeView: Dispatch<SetStateAction<boolean>>;
  setIsNewSessionDialogOpen: Dispatch<SetStateAction<boolean>>;
  setSessions: Dispatch<SetStateAction<AIChatSession[]>>;
}

export const useAIBackfillChatSessionCommandHandlers = ({
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
}: AIBackfillChatSessionCommandHandlerOptions) => {
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
  return {
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
  };
};
