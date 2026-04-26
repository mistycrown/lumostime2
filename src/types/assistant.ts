/**
 * @file assistant.ts
 * @input None
 * @output Shared type definitions for the background AI agent, memory, reminders, and system triggers
 * @pos Type Definitions (Assistant Agent)
 * @description Defines the structured contracts used by the Android-first assistant agent layer so background triggers, memory updates, reminder queues, and AI system-turn decisions can stay typed and stable across services and plugins.
 *
 * @updated 2026-04-26: Added Android-first assistant agent memory, reminder, trigger, config, and system-turn decision types for the new background AI architecture.
 */

export type AssistantTriggerSource = 'user' | 'agent' | 'system';

export type AssistantSystemTriggerType =
  | 'checkin'
  | 'reminder_due'
  | 'long_idle'
  | 'focus_started'
  | 'focus_ended'
  | 'todo_changed'
  | 'manual_background_nudge';

export interface AssistantSystemTrigger {
  id: string;
  type: AssistantSystemTriggerType;
  source: AssistantTriggerSource;
  createdAt: string;
  text: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export type AssistantReminderType =
  | 'self_followup'
  | 'todo_due'
  | 'idle_check'
  | 'focus_check';

export type AssistantReminderStatus = 'pending' | 'done' | 'cancelled';

export interface AssistantReminder {
  id: string;
  type: AssistantReminderType;
  dueAt: string;
  status: AssistantReminderStatus;
  text: string;
  todoId?: string;
  source: AssistantTriggerSource;
  createdAt: string;
}

export type AssistantOpenLoopStatus = 'open' | 'resolved' | 'stale';

export interface AssistantOpenLoop {
  id: string;
  title: string;
  status: AssistantOpenLoopStatus;
  relatedTodoId?: string;
  note?: string;
  updatedAt: string;
}

export interface AssistantMemory {
  version: 1;
  updatedAt: string;
  profileMemory: string[];
  preferenceMemory: string[];
  lastKnownState?: string;
  workingMemorySummary?: string;
  openLoops: AssistantOpenLoop[];
  activeReminders: AssistantReminder[];
  recentDecisions: string[];
  lastAgentRunAt?: string;
}

export interface AssistantMemoryPatch {
  profileMemory?: string[];
  preferenceMemory?: string[];
  lastKnownState?: string | null;
  workingMemorySummary?: string | null;
  openLoops?: AssistantOpenLoop[];
  activeReminders?: AssistantReminder[];
  recentDecisions?: string[];
  lastAgentRunAt?: string | null;
}

export interface AssistantAgentConfig {
  enabled: boolean;
  enableRandomCheckin: boolean;
  basePollMinutes: number;
  minCheckinMinutes: number;
  maxCheckinMinutes: number;
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  minimumNudgeGapMinutes: number;
  reminderEnabled: boolean;
  longTermMemoryEnabled: boolean;
}

export type AssistantSystemAction =
  | 'silent'
  | 'send_message'
  | 'create_reminder'
  | 'update_memory';

export interface AssistantSystemTurnDecision {
  action: AssistantSystemAction;
  message?: string;
  reminder?: {
    type?: AssistantReminderType;
    dueAt: string;
    text: string;
    todoId?: string;
  };
  memoryPatch?: AssistantMemoryPatch;
}

export interface AssistantSystemTurnContext {
  currentDateTime: string;
  defaultDate: string;
  todayTimelineSummary: string;
  activeSessionSummary?: string;
  todoSummary?: string;
  memory: AssistantMemory;
  trigger: AssistantSystemTrigger;
}

export interface AssistantOrchestratorResult {
  decision: AssistantSystemTurnDecision;
  appliedReminder?: AssistantReminder;
  updatedMemory: AssistantMemory;
  surfacedMessage?: string;
}
