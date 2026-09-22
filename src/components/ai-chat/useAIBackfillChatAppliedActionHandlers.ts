/**
 * @file useAIBackfillChatAppliedActionHandlers.ts
 * @input Applied AI action snapshots, local logs/todos, and principle/self-belief editor state
 * @output Undo handlers and knowledge-library editing handlers used by applied-action cards
 * @pos Component Support (AI Integration)
 * @description Keeps action rollback and principle/self-belief editing workflows out of the main chat modal.
 * @updated 2026-09-22: Extracted applied-action undo and library editor handlers from AIBackfillChatModal.
 */
import type { Dispatch, SetStateAction } from 'react';
import type { Log, TodoItem } from '../../types';
import {
  applyLogDelete,
  applyLogSave,
  applyTodoSave,
  getStoredPrincipleById,
  getStoredSelfBeliefById,
  removeStoredPrincipleById,
  removeStoredSelfBeliefById,
  restoreStoredPrinciple,
  restoreStoredSelfBelief,
  updateStoredPrinciple,
  updateStoredSelfBelief,
  type AppliedCreateLogAction,
  type AppliedCreatePlannedLogAction,
  type AppliedCreatePrincipleAction,
  type AppliedCreateSelfBeliefAction,
  type AppliedCreateSubtaskAction,
  type AppliedCreateTodoAction,
  type AppliedEditLogAction,
  type AppliedUpdateTodoAction,
} from '../../services/assistantActionExecutor';
import type { AIChatSession } from './AIBackfillChatShared';
import type { PrincipleEditFormData } from '../PrincipleEditModal';
import type { SelfBeliefDescriptionDraft } from '../SelfBeliefEditModal';

type AddToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;

export interface AIBackfillChatAppliedActionHandlerOptions {
  activeSession: AIChatSession | null;
  addToast: AddToast;
  createChatLibraryId: (prefix: string) => string;
  getTodayDateKey: () => string;
  editingPrincipleId: string | null;
  editingSelfBeliefDescriptionId: string | null;
  editingSelfBeliefDescriptionText: string;
  editingSelfBeliefId: string | null;
  newSelfBeliefDescriptionText: string;
  principleEditFormData: PrincipleEditFormData;
  selfBeliefDescriptionDrafts: SelfBeliefDescriptionDraft[];
  selfBeliefTitleDraft: string;
  logs: Log[];
  todos: TodoItem[];
  updateAppliedActionStatus: (sessionId: string, messageId: string, actionId: string, status: 'undone') => void;
  setEditingPrincipleId: Dispatch<SetStateAction<string | null>>;
  setEditingSelfBeliefDescriptionId: Dispatch<SetStateAction<string | null>>;
  setEditingSelfBeliefDescriptionText: Dispatch<SetStateAction<string>>;
  setEditingSelfBeliefId: Dispatch<SetStateAction<string | null>>;
  setNewSelfBeliefDescriptionText: Dispatch<SetStateAction<string>>;
  setPrincipleEditFormData: Dispatch<SetStateAction<PrincipleEditFormData>>;
  setSelfBeliefDescriptionDrafts: Dispatch<SetStateAction<SelfBeliefDescriptionDraft[]>>;
  setSelfBeliefTitleDraft: Dispatch<SetStateAction<string>>;
  setLogs: Dispatch<SetStateAction<Log[]>>;
  setTodos: Dispatch<SetStateAction<TodoItem[]>>;
}

export const useAIBackfillChatAppliedActionHandlers = ({
  activeSession,
  addToast,
  editingPrincipleId,
  editingSelfBeliefDescriptionId,
  editingSelfBeliefDescriptionText,
  editingSelfBeliefId,
  createChatLibraryId,
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
}: AIBackfillChatAppliedActionHandlerOptions) => {
  const handleUndoLogAction = (messageId: string, action: AppliedCreateLogAction) => {
    if (action.status !== 'applied' || !activeSession || !action.snapshot.logId) return;
    const liveLog = logs.find((log) => log.id === action.snapshot.logId);
    if (!liveLog) {
      updateAppliedActionStatus(activeSession.id, messageId, action.actionId, 'undone');
      return;
    }
    const deleteResult = applyLogDelete(logs, todos, liveLog.id);
    setLogs(deleteResult.logs);
    setTodos(deleteResult.todos);
    updateAppliedActionStatus(activeSession.id, messageId, action.actionId, 'undone');
    addToast('success', '已撤销这条 AI 补记');
  };

  const handleUndoPlannedLogAction = (messageId: string, action: AppliedCreatePlannedLogAction) => {
    if (action.status !== 'applied' || !activeSession || !action.snapshot.logId) return;
    const liveLog = logs.find((log) => log.id === action.snapshot.logId);
    if (!liveLog) {
      updateAppliedActionStatus(activeSession.id, messageId, action.actionId, 'undone');
      return;
    }
    const deleteResult = applyLogDelete(logs, todos, liveLog.id);
    setLogs(deleteResult.logs);
    setTodos(deleteResult.todos);
    updateAppliedActionStatus(activeSession.id, messageId, action.actionId, 'undone');
    addToast('success', '已撤销这条 AI 计划');
  };

  const handleUndoTodoAction = (messageId: string, action: AppliedCreateTodoAction) => {
    if (action.status !== 'applied' || !activeSession || !action.snapshot.todoId) return;
    const deleteTodoIds = new Set([action.snapshot.todoId, ...(action.snapshot.createdSubtaskIds || [])]);
    setTodos((prev) => prev.filter((todo) => !deleteTodoIds.has(todo.id)));
    updateAppliedActionStatus(activeSession.id, messageId, action.actionId, 'undone');
    addToast('success', '已撤销这条 AI 待办');
  };

  const handleUndoUpdateTodoAction = (messageId: string, action: AppliedUpdateTodoAction) => {
    if (action.status !== 'applied' || !activeSession || !action.snapshot.previousTodo) return;
    setTodos((prev) => applyTodoSave(prev, action.snapshot.previousTodo!));
    updateAppliedActionStatus(activeSession.id, messageId, action.actionId, 'undone');
    addToast('success', '已撤销这次 AI 待办修改');
  };

  const handleUndoCreateSubtaskAction = (messageId: string, action: AppliedCreateSubtaskAction) => {
    if (action.status !== 'applied' || !activeSession || !action.snapshot.todoId) return;
    setTodos((prev) => prev.filter((todo) => todo.id !== action.snapshot.todoId));
    updateAppliedActionStatus(activeSession.id, messageId, action.actionId, 'undone');
    addToast('success', '已撤销这条 AI 子任务');
  };

  const handleUndoEditLogAction = (messageId: string, action: AppliedEditLogAction) => {
    if (action.status !== 'applied' || !activeSession || !action.snapshot.previousLog) return;
    const restoreResult = applyLogSave(logs, todos, action.snapshot.previousLog);
    setLogs(restoreResult.logs);
    setTodos(restoreResult.todos);
    updateAppliedActionStatus(activeSession.id, messageId, action.actionId, 'undone');
    addToast('success', '已撤销这次 AI 记录修改');
  };

  const handleUndoPrincipleAction = (messageId: string, action: AppliedCreatePrincipleAction) => {
    if (action.status !== 'applied' || !activeSession || !action.snapshot.principleId) return;
    if (action.snapshot.previousPrinciple) restoreStoredPrinciple(action.snapshot.previousPrinciple);
    else removeStoredPrincipleById(action.snapshot.principleId);
    updateAppliedActionStatus(activeSession.id, messageId, action.actionId, 'undone');
    addToast('success', action.snapshot.previousPrinciple ? '已恢复原则原文' : '已撤销这条 AI 原则');
  };

  const handleOpenPrincipleEditor = (principleId?: string) => {
    if (!principleId) return;
    const principle = getStoredPrincipleById(principleId);
    if (!principle) {
      addToast('error', '没有找到这条原则');
      return;
    }
    setEditingPrincipleId(principle.id);
    setPrincipleEditFormData({ title: principle.title, frontText: principle.frontText, backText: principle.backText });
  };

  const handleCancelPrincipleEditor = () => {
    setEditingPrincipleId(null);
    setPrincipleEditFormData({ title: '', frontText: '', backText: '' });
  };

  const handleSavePrincipleEditor = () => {
    if (!editingPrincipleId) return;
    const title = principleEditFormData.title.trim();
    const frontText = principleEditFormData.frontText.trim();
    if (!title || !frontText) return;
    const currentPrinciple = getStoredPrincipleById(editingPrincipleId);
    if (!currentPrinciple) {
      addToast('error', '没有找到这条原则');
      handleCancelPrincipleEditor();
      return;
    }
    const saved = updateStoredPrinciple({ ...currentPrinciple, title, frontText, backText: principleEditFormData.backText.trim() });
    if (!saved) {
      addToast('error', '保存原则失败');
      return;
    }
    addToast('success', '已保存原则');
    handleCancelPrincipleEditor();
  };

  const handleOpenSelfBeliefEditor = (selfBeliefId?: string) => {
    if (!selfBeliefId) return;
    const selfBelief = getStoredSelfBeliefById(selfBeliefId);
    if (!selfBelief) {
      addToast('error', '没有找到这条自我认知');
      return;
    }
    setEditingSelfBeliefId(selfBelief.id);
    setSelfBeliefTitleDraft(selfBelief.title);
    setSelfBeliefDescriptionDrafts(selfBelief.descriptions);
    setNewSelfBeliefDescriptionText('');
    setEditingSelfBeliefDescriptionId(null);
    setEditingSelfBeliefDescriptionText('');
  };

  const handleCancelSelfBeliefEditor = () => {
    setEditingSelfBeliefId(null);
    setSelfBeliefTitleDraft('');
    setSelfBeliefDescriptionDrafts([]);
    setNewSelfBeliefDescriptionText('');
    setEditingSelfBeliefDescriptionId(null);
    setEditingSelfBeliefDescriptionText('');
  };

  const handleSaveSelfBeliefEditor = () => {
    if (!editingSelfBeliefId) return;
    const title = selfBeliefTitleDraft.trim();
    if (!title) return;
    const currentSelfBelief = getStoredSelfBeliefById(editingSelfBeliefId);
    if (!currentSelfBelief) {
      addToast('error', '没有找到这条自我认知');
      handleCancelSelfBeliefEditor();
      return;
    }
    const saved = updateStoredSelfBelief({
      ...currentSelfBelief,
      title,
      descriptions: selfBeliefDescriptionDrafts,
      updatedAt: new Date().toISOString()
    });
    if (!saved) {
      addToast('error', '保存自我认知失败');
      return;
    }
    addToast('success', '已保存自我认知');
    handleCancelSelfBeliefEditor();
  };

  const handleAddSelfBeliefDescription = () => {
    const text = newSelfBeliefDescriptionText.trim();
    if (!text) return;
    const now = new Date().toISOString();
    setSelfBeliefDescriptionDrafts((current) => [...current, {
      id: createChatLibraryId('description'),
      text,
      date: getTodayDateKey(),
      source: 'manual',
      createdAt: now,
      updatedAt: now
    }]);
    setNewSelfBeliefDescriptionText('');
  };

  const handleStartEditSelfBeliefDescription = (description: SelfBeliefDescriptionDraft) => {
    setEditingSelfBeliefDescriptionId(description.id);
    setEditingSelfBeliefDescriptionText(description.text);
  };

  const handleSaveSelfBeliefDescriptionEdit = () => {
    if (!editingSelfBeliefDescriptionId) return;
    const text = editingSelfBeliefDescriptionText.trim();
    if (!text) return;
    setSelfBeliefDescriptionDrafts((current) => current.map((description) => (
      description.id === editingSelfBeliefDescriptionId
        ? { ...description, text, updatedAt: new Date().toISOString() }
        : description
    )));
    setEditingSelfBeliefDescriptionId(null);
    setEditingSelfBeliefDescriptionText('');
  };

  const handleCancelSelfBeliefDescriptionEdit = () => {
    setEditingSelfBeliefDescriptionId(null);
    setEditingSelfBeliefDescriptionText('');
  };

  const handleDeleteSelfBeliefDescription = (descriptionId: string) => {
    setSelfBeliefDescriptionDrafts((current) => current.filter((description) => description.id !== descriptionId));
    if (editingSelfBeliefDescriptionId === descriptionId) handleCancelSelfBeliefDescriptionEdit();
  };

  const handleUndoSelfBeliefAction = (messageId: string, action: AppliedCreateSelfBeliefAction) => {
    if (action.status !== 'applied' || !activeSession || !action.snapshot.selfBeliefId) return;
    if (action.snapshot.previousSelfBelief) restoreStoredSelfBelief(action.snapshot.previousSelfBelief);
    else removeStoredSelfBeliefById(action.snapshot.selfBeliefId);
    updateAppliedActionStatus(activeSession.id, messageId, action.actionId, 'undone');
    addToast('success', action.snapshot.previousSelfBelief ? '已恢复自我认知原文' : '已撤销这条 AI 自我认知');
  };

  return {
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
  };
};
