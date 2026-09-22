/**
 * @file useAIBackfillChatDreamManager.ts
 * @input Dream state, editor drafts, chat-session mutation commands, and the Dream turn runner
 * @output Dream viewer/editor handlers plus month-selection handlers
 * @pos Component Support Hook (AI Dream Workflow)
 * @description Owns Dream CRUD UI state transitions and the bridge from the Dream viewer into the chat turn flow.
 * @updated 2026-09-22: Extracted Dream viewer and month-selection handlers from AIBackfillChatModal.
 */

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { dreamService } from '../../services/dreamService';
import type { AIChatSession } from './AIBackfillChatShared';
import {
  type DreamEntryDrafts,
  type DreamMonthRangeSelection,
  type DreamMonthSelectionState,
  type DreamTopicDrafts,
  DEFAULT_DREAM_ENTRY_DRAFTS,
  DEFAULT_DREAM_TOPIC_DRAFTS,
  DREAM_MONTH_SELECTION_INVALID_PROMPT,
  DREAM_MONTH_SELECTION_PROMPT
} from './AIBackfillChatShared';
import { parseDreamMonthSelection } from './AIBackfillChatDreamFlow';
import type { DreamEntry, DreamState, DreamTopic } from '../../types/assistant';
import { getLocalDateStr } from '../../utils/dateUtils';

type HandleDreamCommand = (
  session: AIChatSession,
  selectedMonth: DreamMonthRangeSelection,
  userMessageId?: string,
  options?: {
    replaceMessageId?: string;
    retrySourceUserMessageId?: string;
    userMessageAlreadyExists?: boolean;
  }
) => Promise<void>;

interface UseAIBackfillChatDreamManagerOptions {
  dreamSnapshot: DreamState;
  selectedDreamTopicId: string;
  setSelectedDreamTopicId: Dispatch<SetStateAction<string>>;
  dreamTopicDrafts: DreamTopicDrafts;
  setDreamTopicDrafts: Dispatch<SetStateAction<DreamTopicDrafts>>;
  dreamEntryDrafts: DreamEntryDrafts;
  setDreamEntryDrafts: Dispatch<SetStateAction<DreamEntryDrafts>>;
  editingDreamTopicId: string | null;
  setEditingDreamTopicId: Dispatch<SetStateAction<string | null>>;
  setEditingDreamEntryId: Dispatch<SetStateAction<string | null>>;
  setDreamTopicDeleteTargetId: Dispatch<SetStateAction<string | null>>;
  setDreamEntryDeleteTargetId: Dispatch<SetStateAction<string | null>>;
  setDreamMonthSelectionState: Dispatch<SetStateAction<DreamMonthSelectionState | null>>;
  setIsDreamViewerOpen: Dispatch<SetStateAction<boolean>>;
  setIsDreamTopicComposerOpen: Dispatch<SetStateAction<boolean>>;
  setIsDreamResetConfirmOpen: Dispatch<SetStateAction<boolean>>;
  setIsDreamTopicNoteExpanded: Dispatch<SetStateAction<boolean>>;
  setInputText: Dispatch<SetStateAction<string>>;
  setIsHistoryPanelOpen: Dispatch<SetStateAction<boolean>>;
  setIsPersonaPanelOpen: Dispatch<SetStateAction<boolean>>;
  activeSession: AIChatSession | null;
  isLoading: boolean;
  mutateSession: (sessionId: string, updater: (session: AIChatSession) => AIChatSession) => void;
  refreshDreamSnapshot: () => void;
  addToast: (type: 'success' | 'info' | 'warning' | 'error', message: string) => void;
  handleDreamCommand: HandleDreamCommand;
}

export const useAIBackfillChatDreamManager = ({
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
}: UseAIBackfillChatDreamManagerOptions) => {
  const resetDreamTopicUi = useCallback(() => {
    setDreamTopicDrafts(DEFAULT_DREAM_TOPIC_DRAFTS);
    setIsDreamTopicComposerOpen(false);
    setEditingDreamTopicId(null);
    setDreamTopicDeleteTargetId(null);
  }, [setDreamTopicDeleteTargetId, setDreamTopicDrafts, setEditingDreamTopicId, setIsDreamTopicComposerOpen]);

  const resetDreamEntryUi = useCallback(() => {
    setDreamEntryDrafts(DEFAULT_DREAM_ENTRY_DRAFTS);
    setEditingDreamEntryId(null);
    setDreamEntryDeleteTargetId(null);
  }, [setDreamEntryDrafts, setEditingDreamEntryId, setDreamEntryDeleteTargetId]);

  const updateDreamTopicDraft = useCallback((key: keyof DreamTopicDrafts, value: string) => {
    setDreamTopicDrafts((current) => ({ ...current, [key]: value }));
  }, [setDreamTopicDrafts]);

  const handleOpenDreamViewer = useCallback(() => {
    refreshDreamSnapshot();
    resetDreamTopicUi();
    resetDreamEntryUi();
    setIsDreamResetConfirmOpen(false);
    setIsDreamViewerOpen(true);
  }, [refreshDreamSnapshot, resetDreamEntryUi, resetDreamTopicUi, setIsDreamResetConfirmOpen, setIsDreamViewerOpen]);

  const handleCloseDreamViewer = useCallback(() => {
    resetDreamTopicUi();
    resetDreamEntryUi();
    setIsDreamResetConfirmOpen(false);
    setIsDreamViewerOpen(false);
  }, [resetDreamEntryUi, resetDreamTopicUi, setIsDreamResetConfirmOpen, setIsDreamViewerOpen]);

  const handleOpenDreamTopicComposer = useCallback((topic?: DreamTopic) => {
    setDreamTopicDrafts({ title: topic?.title || '', note: topic?.note || '' });
    setEditingDreamTopicId(topic?.id || null);
    setIsDreamResetConfirmOpen(false);
    setDreamTopicDeleteTargetId(null);
    setIsDreamTopicComposerOpen(true);
  }, [setDreamTopicDrafts, setDreamTopicDeleteTargetId, setEditingDreamTopicId, setIsDreamResetConfirmOpen, setIsDreamTopicComposerOpen]);

  const handleCancelDreamTopicComposer = resetDreamTopicUi;

  const handleOpenDreamEntryEditor = useCallback((entry: DreamEntry) => {
    setDreamEntryDrafts({ content: entry.content });
    setEditingDreamEntryId(entry.id);
    setDreamEntryDeleteTargetId(null);
  }, [setDreamEntryDrafts, setDreamEntryDeleteTargetId, setEditingDreamEntryId]);

  const handleCancelDreamEntryEditor = resetDreamEntryUi;

  const handleUpdateDreamEntryDraft = useCallback((value: string) => {
    setDreamEntryDrafts({ content: value });
  }, [setDreamEntryDrafts]);

  const handleSaveDreamEntry = useCallback((entryId: string) => {
    const content = dreamEntryDrafts.content.trim();
    if (!content) {
      addToast('warning', '先写一点条目内容再保存吧。');
      return;
    }

    dreamService.updateEntry(entryId, { content });
    refreshDreamSnapshot();
    resetDreamEntryUi();
    addToast('success', '已更新 Dream 条目');
  }, [addToast, dreamEntryDrafts.content, refreshDreamSnapshot, resetDreamEntryUi]);

  const handleSaveDreamTopic = useCallback(() => {
    const title = dreamTopicDrafts.title.trim();
    const note = dreamTopicDrafts.note.trim();
    if (!title) {
      addToast('warning', '先写一个 Dream aspect 标题再保存吧。');
      return;
    }

    if (dreamSnapshot.topics.some((topic) => (
      topic.id !== editingDreamTopicId && topic.title.trim().toLowerCase() === title.toLowerCase()
    ))) {
      addToast('info', '这个 Dream aspect 已经存在了。');
      return;
    }

    if (editingDreamTopicId) {
      dreamService.updateTopic(editingDreamTopicId, { title, note });
      addToast('success', '已更新 Dream aspect');
    } else {
      dreamService.createTopic({ title, note });
      addToast('success', '已新增 Dream aspect');
    }

    refreshDreamSnapshot();
    resetDreamTopicUi();
  }, [addToast, dreamSnapshot.topics, dreamTopicDrafts.note, dreamTopicDrafts.title, editingDreamTopicId, refreshDreamSnapshot, resetDreamTopicUi]);

  const handleToggleDreamTopicDelete = useCallback((topicId: string) => {
    setIsDreamResetConfirmOpen(false);
    setDreamTopicDeleteTargetId((current) => (current === topicId ? null : topicId));
  }, [setDreamTopicDeleteTargetId, setIsDreamResetConfirmOpen]);

  const handleToggleDreamEntryDelete = useCallback((entryId: string) => {
    setIsDreamResetConfirmOpen(false);
    setDreamEntryDeleteTargetId((current) => (current === entryId ? null : entryId));
    setEditingDreamEntryId((current) => (current === entryId ? null : current));
    setDreamEntryDrafts(DEFAULT_DREAM_ENTRY_DRAFTS);
  }, [setDreamEntryDeleteTargetId, setDreamEntryDrafts, setEditingDreamEntryId, setIsDreamResetConfirmOpen]);

  const handleConfirmDreamTopicDelete = useCallback((topicId: string) => {
    dreamService.deleteTopic(topicId);
    refreshDreamSnapshot();
    setDreamTopicDeleteTargetId((current) => (current === topicId ? null : current));
    addToast('success', '已删除 Dream aspect');
  }, [addToast, refreshDreamSnapshot, setDreamTopicDeleteTargetId]);

  const handleConfirmDreamEntryDelete = useCallback((entryId: string) => {
    dreamService.deleteEntry(entryId);
    refreshDreamSnapshot();
    setDreamEntryDeleteTargetId((current) => (current === entryId ? null : current));
    setEditingDreamEntryId((current) => (current === entryId ? null : current));
    setDreamEntryDrafts(DEFAULT_DREAM_ENTRY_DRAFTS);
    addToast('success', '已删除 Dream 条目');
  }, [addToast, refreshDreamSnapshot, setDreamEntryDeleteTargetId, setDreamEntryDrafts, setEditingDreamEntryId]);

  const handleToggleDreamTopicEnabled = useCallback((topic: DreamTopic) => {
    dreamService.updateTopic(topic.id, { enabled: !topic.enabled });
    refreshDreamSnapshot();
  }, [refreshDreamSnapshot]);

  const handleConfirmDreamReset = useCallback(() => {
    dreamService.resetState();
    refreshDreamSnapshot();
    resetDreamTopicUi();
    resetDreamEntryUi();
    setIsDreamResetConfirmOpen(false);
    setIsDreamTopicNoteExpanded(false);
    addToast('success', '已重置 Dream');
  }, [addToast, refreshDreamSnapshot, resetDreamEntryUi, resetDreamTopicUi, setIsDreamResetConfirmOpen, setIsDreamTopicNoteExpanded]);

  const handleToggleDreamResetConfirm = useCallback(() => {
    setIsDreamResetConfirmOpen((current) => !current);
    setDreamTopicDeleteTargetId(null);
    setDreamEntryDeleteTargetId(null);
    setEditingDreamEntryId(null);
    setDreamEntryDrafts(DEFAULT_DREAM_ENTRY_DRAFTS);
  }, [setDreamEntryDeleteTargetId, setDreamEntryDrafts, setEditingDreamEntryId, setDreamTopicDeleteTargetId, setIsDreamResetConfirmOpen]);

  const handleCancelDreamReset = useCallback(() => setIsDreamResetConfirmOpen(false), [setIsDreamResetConfirmOpen]);
  const handleCancelDreamTopicDelete = useCallback(() => setDreamTopicDeleteTargetId(null), [setDreamTopicDeleteTargetId]);
  const handleCancelDreamEntryDelete = useCallback(() => setDreamEntryDeleteTargetId(null), [setDreamEntryDeleteTargetId]);
  const handleSelectDreamTopic = useCallback((topicId: string) => setSelectedDreamTopicId(topicId), [setSelectedDreamTopicId]);
  const handleToggleDreamTopicNoteExpanded = useCallback(() => setIsDreamTopicNoteExpanded((current) => !current), [setIsDreamTopicNoteExpanded]);

  const handleStartDreamMonthSelection = useCallback((sessionId: string) => {
    const now = Date.now();
    mutateSession(sessionId, (currentSession) => ({
      ...currentSession,
      messages: [
        ...currentSession.messages,
        { id: crypto.randomUUID(), role: 'user', content: 'dream', createdAt: now },
        { id: crypto.randomUUID(), role: 'assistant', content: DREAM_MONTH_SELECTION_PROMPT, createdAt: now + 1, tone: 'system' }
      ]
    }));
    setDreamMonthSelectionState({ sessionId });
    setInputText('');
    setIsHistoryPanelOpen(false);
    setIsPersonaPanelOpen(false);
  }, [mutateSession, setDreamMonthSelectionState, setInputText, setIsHistoryPanelOpen, setIsPersonaPanelOpen]);

  const handleRunDreamFromViewer = useCallback(() => {
    if (!isLoading && activeSession) {
      handleCloseDreamViewer();
      handleStartDreamMonthSelection(activeSession.id);
    }
  }, [activeSession, handleCloseDreamViewer, handleStartDreamMonthSelection, isLoading]);

  const handleSubmitDreamMonthSelection = useCallback(async (session: AIChatSession, userInput: string) => {
    const trimmedInput = userInput.trim();
    if (!trimmedInput) {
      return;
    }

    const sessionId = session.id;
    const userMessageId = crypto.randomUUID();
    const now = Date.now();
    mutateSession(sessionId, (currentSession) => ({
      ...currentSession,
      messages: [...currentSession.messages, { id: userMessageId, role: 'user', content: trimmedInput, createdAt: now }]
    }));
    setInputText('');

    const selectedMonth = parseDreamMonthSelection(trimmedInput, getLocalDateStr);
    if (!selectedMonth) {
      mutateSession(sessionId, (currentSession) => ({
        ...currentSession,
        messages: [...currentSession.messages, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: DREAM_MONTH_SELECTION_INVALID_PROMPT,
          createdAt: now + 1,
          tone: 'system'
        }]
      }));
      return;
    }

    setDreamMonthSelectionState((current) => (current?.sessionId === sessionId ? null : current));
    await handleDreamCommand(session, selectedMonth, userMessageId, {
      retrySourceUserMessageId: userMessageId,
      userMessageAlreadyExists: true
    });
  }, [handleDreamCommand, mutateSession, setDreamMonthSelectionState, setInputText]);

  return {
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
  };
};
