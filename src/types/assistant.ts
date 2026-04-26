/**
 * @file assistant.ts
 * @input None
 * @output Shared type definitions for the background AI agent, memory, reminders, and system triggers
 * @pos Type Definitions (Assistant Agent)
 * @description Defines the structured contracts used by the Android-first assistant agent layer so background triggers, memory updates, reminder queues, and AI system-turn decisions can stay typed and stable across services and plugins.
 *
 * @updated 2026-04-26: Added assistant system-notification payload and pending-navigation result types so Android alerts can reopen the shared AI chat at the exact background message.
 * @updated 2026-04-26: Added explicit local/UTC state time context fields so reminder-oriented prompts can reason about one current moment without ambiguous timezone math.
 * @updated 2026-04-26: Expanded the shared assistant turn/result contracts with explicit memory actions so foreground and background flows can persist memory through the same unified schema.
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
  dispatchAttemptCount?: number;
  lastDispatchAttemptAt?: string;
  lastDispatchedAt?: string;
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
  longTermMemoryEnabled: boolean;
}

export interface AssistantNotificationPayload {
  title?: string;
  body: string;
  targetSessionId: string;
  targetMessageId: string;
}

export interface AssistantNotificationNavigation {
  hasPending: boolean;
  targetSessionId?: string;
  targetMessageId?: string;
  openedAt?: string;
}

export type AssistantMemoryAction = 'no_update' | 'update_memory';

export type AssistantSystemAction =
  | 'silent'
  | 'send_message';

export interface AssistantSystemTurnDecision {
  action: AssistantSystemAction;
  message?: string;
  reminders?: AssistantReminderDraft[];
  memoryAction: AssistantMemoryAction;
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
  appliedReminders?: AssistantReminder[];
  updatedMemory: AssistantMemory;
  surfacedMessage?: string;
}

export type AssistantTurnMode = 'foreground' | 'background';

export type AssistantTurnOutcome = 'reply' | 'clarify' | 'silent';

export type AssistantTurnTriggerType =
  | 'user_message'
  | AssistantSystemTriggerType;

export interface AssistantTurnTrigger {
  type: AssistantTurnTriggerType;
  source: AssistantTriggerSource;
  text: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface AssistantPromptLayers {
  basePrompt: string;
  modePrompt: string;
  userPersonaPrompt?: string;
}

export interface AssistantConversationEntry {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantTurnConversationContext {
  recentTurns: AssistantConversationEntry[];
  summary?: string;
}

export interface AssistantTurnStateContext {
  currentDateTime: string;
  currentDateTimeLocal?: string;
  currentDateTimeUtc?: string;
  defaultDate: string;
  todayTimelineSummary?: string;
  activeSessionSummary?: string;
  todoSummary?: string;
  todayScheduledTodoSummary?: string;
  pinnedTodoSummary?: string;
  reminderSummary?: string;
}

export interface AssistantActivityDictionaryItem {
  id: string;
  name: string;
}

export interface AssistantActivityCategoryDictionaryItem {
  id: string;
  name: string;
  activities: AssistantActivityDictionaryItem[];
}

export interface AssistantScopeDictionaryItem {
  id: string;
  name: string;
}

export interface AssistantTodoCategoryDictionaryItem {
  id: string;
  name: string;
}

export interface AssistantTodoDictionaryItem {
  id: string;
  title: string;
  path?: string;
  categoryId?: string;
  categoryName?: string;
  linkedCategoryId?: string;
  linkedActivityId?: string;
  linkedActivityName?: string;
  defaultScopeIds?: string[];
  scheduledDate?: string;
  deadlineDate?: string;
  parentTodoId?: string;
  parentTodoTitle?: string;
  isCompleted?: boolean;
  pin?: boolean;
}

export interface AssistantLogDictionaryItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  categoryId: string;
  categoryName: string;
  activityId: string;
  activityName: string;
  linkedTodoId?: string;
  linkedTodoTitle?: string;
  note?: string;
}

export interface AssistantTurnDictionaryContext {
  activityCategories?: AssistantActivityCategoryDictionaryItem[];
  scopes?: AssistantScopeDictionaryItem[];
  todoCategories?: AssistantTodoCategoryDictionaryItem[];
  todos?: AssistantTodoDictionaryItem[];
  logs?: AssistantLogDictionaryItem[];
}

export interface AssistantUnifiedTurnInput {
  mode: AssistantTurnMode;
  trigger: AssistantTurnTrigger;
  promptLayers: AssistantPromptLayers;
  memory: AssistantMemory;
  conversation: AssistantTurnConversationContext;
  stateContext: AssistantTurnStateContext;
  dictionaryContext: AssistantTurnDictionaryContext;
}

export interface AssistantReminderDraft {
  type?: AssistantReminderType;
  dueAt: string;
  text: string;
  todoId?: string;
}

export interface AssistantCreateLogToolCall {
  toolName: 'create_log';
  args: {
    date: string;
    startTime: string;
    endTime: string;
    description: string;
    categoryId: string;
    activityId: string;
    scopeIds?: string[];
    linkedTodoId?: string;
    progressIncrement?: number;
  };
}

export interface AssistantCreateTodoToolCall {
  toolName: 'create_todo';
  args: {
    title: string;
    categoryId: string;
    linkedCategoryId: string;
    linkedActivityId: string;
    defaultScopeIds?: string[];
    note?: string;
    scheduledDate?: string;
    deadlineDate?: string;
  };
}

export interface AssistantUpdateTodoToolCall {
  toolName: 'update_todo';
  args: {
    todoId: string;
    patch: {
      title?: string;
      note?: string | null;
      categoryId?: string;
      linkedCategoryId?: string | null;
      linkedActivityId?: string | null;
      defaultScopeIds?: string[] | null;
      scheduledDate?: string | null;
      deadlineDate?: string | null;
      pin?: boolean;
      isCompleted?: boolean;
    };
  };
}

export interface AssistantCreateSubtaskToolCall {
  toolName: 'create_subtask';
  args: {
    parentTodoId: string;
    title: string;
    note?: string;
    scheduledDate?: string;
    deadlineDate?: string;
  };
}

export interface AssistantEditLogToolCall {
  toolName: 'edit_log';
  args: {
    logId: string;
    patch: {
      date?: string | null;
      startTime?: string | null;
      endTime?: string | null;
      categoryId?: string | null;
      activityId?: string | null;
      note?: string | null;
      linkedTodoId?: string | null;
      scopeIds?: string[] | null;
    };
  };
}

export type AssistantToolCall =
  | AssistantCreateLogToolCall
  | AssistantCreateTodoToolCall
  | AssistantUpdateTodoToolCall
  | AssistantCreateSubtaskToolCall
  | AssistantEditLogToolCall;

export interface AssistantUnifiedTurnOutput {
  mode: AssistantTurnMode;
  outcome: AssistantTurnOutcome;
  assistantReply?: string;
  toolCalls?: AssistantToolCall[];
  reminders?: AssistantReminderDraft[];
  memoryAction: AssistantMemoryAction;
  memoryPatch?: AssistantMemoryPatch;
}
