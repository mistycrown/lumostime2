/**
 * @file useAIBackfillChatAssistantState.ts
 * @input Assistant configuration and durable assistant-service snapshots
 * @output State and setters for assistant settings, memory, Dream, reminders, scheduled tasks, letters, and background history
 * @pos Component Support (AI Integration)
 * @description Separates assistant-domain snapshot state from the AI chat view and request orchestration state.
 */
import { useState } from 'react';
import type {
  AssistantAgentConfig,
  AssistantLetter,
  AssistantMemory,
  AssistantNativeDiagnosticEntry,
  AssistantReminder,
  AssistantScheduledTask,
  DreamState
} from '../../types/assistant';
import { assistantAgentConfigService } from '../../services/assistantAgentConfigService';
import { assistantMemoryService } from '../../services/assistantMemoryService';
import { dreamService } from '../../services/dreamService';
import { assistantLetterService } from '../../services/assistantLetterService';
import { assistantReminderQueueService } from '../../services/assistantReminderQueueService';
import { assistantScheduledTaskService } from '../../services/assistantScheduledTaskService';
import { assistantOrchestratorService, type AssistantBackgroundCallHistoryEntry } from '../../services/assistantOrchestratorService';
import {
  buildAssistantAgentIntervalDrafts,
  buildAssistantAgentQuietHoursDrafts,
  buildAssistantLetterDrafts,
  type AssistantAgentIntervalDrafts,
  type AssistantAgentQuietHoursDrafts,
  type AssistantLetterDrafts
} from './AIBackfillChatShared';

export const useAIBackfillChatAssistantState = () => {
  const [assistantAgentConfig, setAssistantAgentConfig] = useState<AssistantAgentConfig>(() => assistantAgentConfigService.getConfig());
  const [assistantAgentIntervalDrafts, setAssistantAgentIntervalDrafts] = useState<AssistantAgentIntervalDrafts>(() => (
    buildAssistantAgentIntervalDrafts(assistantAgentConfigService.getConfig())
  ));
  const [assistantAgentQuietHoursDrafts, setAssistantAgentQuietHoursDrafts] = useState<AssistantAgentQuietHoursDrafts>(() => (
    buildAssistantAgentQuietHoursDrafts(assistantAgentConfigService.getConfig())
  ));
  const [assistantLetterDrafts, setAssistantLetterDrafts] = useState<AssistantLetterDrafts>(() => (
    buildAssistantLetterDrafts(assistantAgentConfigService.getConfig())
  ));
  const [assistantMemorySnapshot, setAssistantMemorySnapshot] = useState<AssistantMemory>(() => assistantMemoryService.getMemory());
  const [dreamSnapshot, setDreamSnapshot] = useState<DreamState>(() => dreamService.getState());
  const [assistantReminderSnapshot, setAssistantReminderSnapshot] = useState<AssistantReminder[]>(() => assistantReminderQueueService.listReminders());
  const [assistantScheduledTaskSnapshot, setAssistantScheduledTaskSnapshot] = useState<AssistantScheduledTask[]>(
    () => assistantScheduledTaskService.listTasks()
  );
  const [assistantLetterSnapshot, setAssistantLetterSnapshot] = useState<AssistantLetter[]>(() => assistantLetterService.listLetters());
  const [assistantBackgroundCallHistory, setAssistantBackgroundCallHistory] = useState<AssistantBackgroundCallHistoryEntry[]>(() => assistantOrchestratorService.listBackgroundCallHistory());
  const [assistantNativeDiagnostics, setAssistantNativeDiagnostics] = useState<AssistantNativeDiagnosticEntry[]>([]);

  return {
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
  };
};
