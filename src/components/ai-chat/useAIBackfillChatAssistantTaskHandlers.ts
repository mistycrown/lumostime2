/**
 * @file useAIBackfillChatAssistantTaskHandlers.ts
 * @input Assistant memory, reminder, and scheduled-task snapshots plus their UI state setters
 * @output Viewer, editor, persistence, and deletion handlers for assistant task data
 * @pos Component Support (AI Integration)
 * @description Keeps assistant memory and task management workflows out of the main AI chat coordinator.
 * @updated 2026-09-22: Extracted assistant memory, reminder, and scheduled-task handlers from AIBackfillChatModal.
 */
import type { Dispatch, SetStateAction } from 'react';
import { assistantMemoryService } from '../../services/assistantMemoryService';
import { assistantReminderQueueService } from '../../services/assistantReminderQueueService';
import { assistantScheduledTaskService } from '../../services/assistantScheduledTaskService';
import type {
  AssistantMemory,
  AssistantReminder,
  AssistantScheduledTask,
  AssistantEditableMemoryListKey
} from '../../types/assistant';
import {
  ASSISTANT_EDITABLE_MEMORY_SECTION_META,
  buildAssistantScheduledTaskRecurrenceRule,
  buildAssistantScheduledTaskTime,
  buildManualAssistantReminderDueAt,
  type AssistantEditableMemoryDeleteTarget,
  type AssistantReminderDeleteTarget,
  type AssistantReminderDrafts,
  type AssistantScheduledTaskDeleteTarget,
  type AssistantScheduledTaskDrafts
} from './AIBackfillChatShared';

type AddToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;

export interface AIBackfillChatAssistantTaskHandlerOptions {
  addToast: AddToast;
  assistantEditableMemoryDrafts: Record<AssistantEditableMemoryListKey, string>;
  assistantMemorySnapshot: AssistantMemory;
  assistantReminderDrafts: AssistantReminderDrafts;
  assistantReminderSnapshot: AssistantReminder[];
  assistantScheduledTaskDrafts: AssistantScheduledTaskDrafts;
  defaultDateKey: string;
  notifyAssistantTaskStateChanged: () => void;
  refreshAssistantMemorySnapshot: () => void;
  refreshAssistantReminderSnapshot: () => void;
  resetAssistantEditableMemoryUi: () => void;
  resetAssistantReminderUi: () => void;
  resetAssistantScheduledTaskUi: () => void;
  setAssistantEditableMemoryComposerKey: Dispatch<SetStateAction<AssistantEditableMemoryListKey | null>>;
  setAssistantEditableMemoryDeleteTarget: Dispatch<SetStateAction<AssistantEditableMemoryDeleteTarget | null>>;
  setAssistantEditableMemoryDrafts: Dispatch<SetStateAction<Record<AssistantEditableMemoryListKey, string>>>;
  setAssistantMemoryViewerOpen: Dispatch<SetStateAction<boolean>>;
  setAssistantReminderDeleteTarget: Dispatch<SetStateAction<AssistantReminderDeleteTarget | null>>;
  setAssistantReminderDrafts: Dispatch<SetStateAction<AssistantReminderDrafts>>;
  setAssistantReminderComposerOpen: Dispatch<SetStateAction<boolean>>;
  setAssistantScheduledTaskDeleteTarget: Dispatch<SetStateAction<AssistantScheduledTaskDeleteTarget | null>>;
  setAssistantScheduledTaskDrafts: Dispatch<SetStateAction<AssistantScheduledTaskDrafts>>;
  setAssistantScheduledTaskComposerOpen: Dispatch<SetStateAction<boolean>>;
  syncAssistantScheduledTasks: (referenceNow?: Date) => unknown;
}

export const useAIBackfillChatAssistantTaskHandlers = ({
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
  setAssistantMemoryViewerOpen,
  setAssistantReminderDeleteTarget,
  setAssistantReminderDrafts,
  setAssistantReminderComposerOpen,
  setAssistantScheduledTaskDeleteTarget,
  setAssistantScheduledTaskDrafts,
  setAssistantScheduledTaskComposerOpen,
  syncAssistantScheduledTasks
}: AIBackfillChatAssistantTaskHandlerOptions) => {
  const handleOpenAssistantMemoryViewer = () => {
    refreshAssistantMemorySnapshot();
    refreshAssistantReminderSnapshot();
    resetAssistantEditableMemoryUi();
    resetAssistantReminderUi();
    setAssistantMemoryViewerOpen(true);
  };

  const handleCloseAssistantMemoryViewer = () => {
    resetAssistantEditableMemoryUi();
    resetAssistantReminderUi();
    setAssistantMemoryViewerOpen(false);
  };

  const handleClearAssistantMemory = () => {
    assistantMemoryService.clearMemory();
    assistantReminderQueueService.clearQueue();
    refreshAssistantMemorySnapshot();
    refreshAssistantReminderSnapshot();
    resetAssistantEditableMemoryUi();
    resetAssistantReminderUi();
    notifyAssistantTaskStateChanged();
    addToast('success', '已清空长期记忆');
  };

  const updateAssistantEditableMemoryDraft = (key: AssistantEditableMemoryListKey, value: string) => {
    setAssistantEditableMemoryDrafts((current) => ({
      ...current,
      [key]: value
    }));
  };

  const handleOpenAssistantEditableMemoryComposer = (key: AssistantEditableMemoryListKey) => {
    setAssistantEditableMemoryComposerKey(key);
    setAssistantEditableMemoryDeleteTarget(null);
  };

  const handleCancelAssistantEditableMemoryComposer = (key: AssistantEditableMemoryListKey) => {
    setAssistantEditableMemoryComposerKey((current) => (current === key ? null : current));
    setAssistantEditableMemoryDrafts((current) => ({
      ...current,
      [key]: ''
    }));
  };

  const handleSaveAssistantEditableMemoryEntry = (key: AssistantEditableMemoryListKey) => {
    const draft = assistantEditableMemoryDrafts[key].trim();
    const sectionMeta = ASSISTANT_EDITABLE_MEMORY_SECTION_META[key];

    if (!draft) {
      addToast('warning', '先写一点内容再保存吧。');
      return;
    }

    if (assistantMemorySnapshot[key].includes(draft)) {
      addToast('info', '这条记忆已经存在了。');
      return;
    }

    assistantMemoryService.appendEditableListEntry(key, draft);
    refreshAssistantMemorySnapshot();
    setAssistantEditableMemoryDrafts((current) => ({
      ...current,
      [key]: ''
    }));
    setAssistantEditableMemoryComposerKey((current) => (current === key ? null : current));
    notifyAssistantTaskStateChanged();
    addToast('success', sectionMeta.addSuccessMessage);
  };

  const handleToggleAssistantEditableMemoryDelete = (key: AssistantEditableMemoryListKey, value: string) => {
    setAssistantEditableMemoryDeleteTarget((current) => (
      current && current.key === key && current.value === value
        ? null
        : { key, value }
    ));
  };

  const handleConfirmAssistantEditableMemoryDelete = (key: AssistantEditableMemoryListKey, value: string) => {
    assistantMemoryService.removeEditableListEntry(key, value);
    refreshAssistantMemorySnapshot();
    setAssistantEditableMemoryDeleteTarget((current) => (
      current && current.key === key && current.value === value
        ? null
        : current
    ));
    notifyAssistantTaskStateChanged();
    addToast('success', ASSISTANT_EDITABLE_MEMORY_SECTION_META[key].removeSuccessMessage);
  };

  const updateAssistantReminderDraft = (key: keyof AssistantReminderDrafts, value: string) => {
    setAssistantReminderDrafts((current) => ({
      ...current,
      [key]: value
    }));
  };

  const handleOpenAssistantReminderComposer = () => {
    setAssistantReminderComposerOpen(true);
    setAssistantReminderDeleteTarget(null);
  };

  const handleCancelAssistantReminderComposer = () => {
    resetAssistantReminderUi();
  };

  const handleSaveAssistantReminder = () => {
    const text = assistantReminderDrafts.text.trim();
    if (!text) {
      addToast('warning', '先写一点提醒内容再保存吧。');
      return;
    }

    const parsed = buildManualAssistantReminderDueAt(assistantReminderDrafts.date, assistantReminderDrafts.hour);
    if (!parsed.dueAt) {
      addToast('warning', parsed.error || '提醒时间无效，请检查后重试。');
      return;
    }

    if (assistantReminderSnapshot.some((reminder) => reminder.text === text && reminder.dueAt === parsed.dueAt)) {
      addToast('info', '这条 reminder 已经存在了。');
      return;
    }

    assistantReminderQueueService.enqueueReminder({
      id: crypto.randomUUID(),
      type: 'self_followup',
      dueAt: parsed.dueAt,
      status: 'pending',
      text,
      source: 'user',
      createdAt: new Date().toISOString()
    });
    refreshAssistantReminderSnapshot();
    refreshAssistantMemorySnapshot();
    resetAssistantReminderUi();
    notifyAssistantTaskStateChanged();
    addToast('success', '已新增 reminder');
  };

  const handleToggleAssistantReminderDelete = (id: string) => {
    setAssistantReminderDeleteTarget((current) => (current?.id === id ? null : { id }));
  };

  const handleConfirmAssistantReminderDelete = (id: string) => {
    const removedReminder = assistantReminderQueueService.removeReminder(id);
    syncAssistantScheduledTasks(new Date());
    setAssistantReminderDeleteTarget((current) => (current?.id === id ? null : current));
    notifyAssistantTaskStateChanged();

    if (!removedReminder) {
      addToast('info', '这条 reminder 已经不存在了。');
      return;
    }

    addToast('success', '已删除这条 reminder');
  };

  const updateAssistantScheduledTaskDraft = <K extends keyof AssistantScheduledTaskDrafts>(
    key: K,
    value: AssistantScheduledTaskDrafts[K]
  ) => {
    setAssistantScheduledTaskDrafts((current) => ({
      ...current,
      [key]: value
    }));
  };

  const toggleAssistantScheduledTaskWeekday = (weekday: number) => {
    setAssistantScheduledTaskDrafts((current) => {
      const hasWeekday = current.weekdays.includes(weekday);
      return {
        ...current,
        weekdays: hasWeekday
          ? current.weekdays.filter((item) => item !== weekday)
          : [...current.weekdays, weekday].sort((left, right) => left - right)
      };
    });
  };

  const handleOpenAssistantScheduledTaskComposer = () => {
    setAssistantScheduledTaskComposerOpen(true);
    setAssistantScheduledTaskDeleteTarget(null);
  };

  const handleCancelAssistantScheduledTaskComposer = () => {
    resetAssistantScheduledTaskUi();
  };

  const handleSaveAssistantScheduledTask = () => {
    const text = assistantScheduledTaskDrafts.text.trim();
    if (!text) {
      addToast('warning', '先写一点任务内容再保存吧。');
      return;
    }

    const timeResult = buildAssistantScheduledTaskTime(assistantScheduledTaskDrafts.time);
    if (!timeResult.time) {
      addToast('warning', timeResult.error || '触发时间无效，请检查后重试。');
      return;
    }

    const recurrenceResult = buildAssistantScheduledTaskRecurrenceRule(assistantScheduledTaskDrafts, defaultDateKey);
    if (!recurrenceResult.recurrenceRule) {
      addToast('warning', recurrenceResult.error || '循环规则无效，请检查后重试。');
      return;
    }

    try {
      assistantScheduledTaskService.createTask({
        id: crypto.randomUUID(),
        text,
        time: timeResult.time,
        recurrenceRule: recurrenceResult.recurrenceRule
      });
      syncAssistantScheduledTasks(new Date());
      resetAssistantScheduledTaskUi();
      notifyAssistantTaskStateChanged();
      addToast('success', '已新增定时任务');
    } catch (error) {
      console.error('[AIBackfillChatModal] Failed to save assistant scheduled task', error);
      addToast('error', '保存定时任务失败，请稍后重试。');
    }
  };

  const handleToggleAssistantScheduledTaskEnabled = (task: AssistantScheduledTask) => {
    try {
      assistantScheduledTaskService.updateTask(task.id, { enabled: !task.enabled });
      syncAssistantScheduledTasks(new Date());
      notifyAssistantTaskStateChanged();
      addToast('success', task.enabled ? '已停用定时任务' : '已启用定时任务');
    } catch (error) {
      console.error('[AIBackfillChatModal] Failed to toggle assistant scheduled task', error);
      addToast('error', '切换定时任务状态失败，请稍后重试。');
    }
  };

  const handleToggleAssistantScheduledTaskDelete = (id: string) => {
    setAssistantScheduledTaskDeleteTarget((current) => (current?.id === id ? null : { id }));
  };

  const handleConfirmAssistantScheduledTaskDelete = (id: string) => {
    const removedTask = assistantScheduledTaskService.removeTask(id);
    syncAssistantScheduledTasks(new Date());
    setAssistantScheduledTaskDeleteTarget((current) => (current?.id === id ? null : current));
    notifyAssistantTaskStateChanged();

    if (!removedTask) {
      addToast('info', '这条定时任务已经不存在了。');
      return;
    }

    addToast('success', '已删除定时任务');
  };

  return {
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
  };
};
