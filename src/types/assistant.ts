/**
 * @file assistant.ts
 * @input None
 * @output Shared type definitions for the background AI agent, memory, reminders, and system triggers
 * @pos Type Definitions (Assistant Agent)
 * @description Defines the structured contracts used by the Android-first assistant agent layer so background triggers, memory updates, reminder queues, and AI system-turn decisions can stay typed and stable across services and plugins.
 *
 * @updated 2026-07-04: Added assistant-letter trigger, config, and persisted letter record types for scheduled AI letters with backup-safe local storage.
 * @updated 2026-05-16: Added log-submission trigger typing plus persisted assistant config fields for selected post-log AI reactions.
 * @updated 2026-05-18: Added optional nested `subtasks` typing under foreground `create_todo` tool calls so one assistant action can describe a parent todo plus its direct children.
 * @updated 2026-05-09: Added assistant scheduled-task template types so recurring AI task rules can materialize native reminders without overloading one-shot reminder records.
 * @updated 2026-05-12: Added Dream topic, entry, patch, and update-card types for the new explicit-only long-horizon attention system, plus optional read-only Dream context injection for unified assistant turns.
 * @updated 2026-05-14: Added shared assistant reasoning-summary types so provider-native thinking content can be normalized once and rendered consistently across foreground and background chat messages.
 * @updated 2026-05-13: Reframed assistant time context around absolute reference fields, timestamped conversation turns, and explicit per-date timeline labels so prompt-time relative-date reasoning has less room to drift.
 * @updated 2026-05-06: Added explicit `yesterdayTimelineSummary` support to assistant state context so unified turns can see concrete activity records for both today and yesterday.
 * @updated 2026-05-06: Added optional `timelineReviewSummary` plus structured log candidates to assistant prompt context, removed the stale unified-turn recent-log input, and aligned todo creation so `linkedCategoryId` can be inferred from `linkedActivityId`.
 * @updated 2026-04-27: Simplified assistant-facing state time context to one local-offset ISO anchor so prompts no longer need to reinterpret UTC `Z` timestamps.
 * @updated 2026-04-27: Added structured silent-reason, decision-summary, side-effect, and multi-bubble reply fields so background turns can explain quiet decisions and foreground/background replies can render as grouped short bubbles.
 * @updated 2026-04-27: Added native assistant diagnostic entry types so Android poll ticks, skips, and dispatches can be surfaced separately from web AI call history.
 * @updated 2026-04-26: Removed an unused long-term-memory field so the assistant memory schema stays focused on the active fields still used by the app.
 * @updated 2026-04-26: Added a shared editable-memory key type so manual long-term-memory UI can safely append and remove only the user-maintained string-list sections.
 * @updated 2026-04-26: Added assistant system-notification payload and pending-navigation result types so Android alerts can reopen the shared AI chat at the exact background message.
 * @updated 2026-04-26: Added explicit local/UTC state time context fields so reminder-oriented prompts can reason about one current moment without ambiguous timezone math.
 * @updated 2026-04-26: Expanded the shared assistant turn/result contracts with explicit memory actions so foreground and background flows can persist memory through the same unified schema.
 * @updated 2026-04-26: Split compressed recent-log context out of the dictionary payload so debug views and prompt assembly can show it as its own block.
 * @updated 2026-04-26: Added Android-first assistant agent memory, reminder, trigger, config, and system-turn decision types for the new background AI architecture.
 */

import type { TodoKind, TodoRecurrenceRule } from '../types';

export type AssistantTriggerSource = 'user' | 'agent' | 'system';

export type AssistantSystemTriggerType =
  | 'checkin'
  | 'assistant_letter_due'
  | 'reminder_due'
  | 'long_idle'
  | 'log_submitted'
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
  scheduledTaskId?: string;
  source: AssistantTriggerSource;
  createdAt: string;
  dispatchAttemptCount?: number;
  lastDispatchAttemptAt?: string;
  lastDispatchedAt?: string;
}

export interface AssistantScheduledTask {
  id: string;
  text: string;
  time: string; // HH:mm
  recurrenceRule: TodoRecurrenceRule;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  nextTriggerAt: string;
  lastTriggeredAt?: string;
  pendingReminderId?: string;
}

export interface AssistantMemory {
  version: 1;
  updatedAt: string;
  profileMemory: string[];
  preferenceMemory: string[];
  lastKnownState?: string;
  workingMemorySummary?: string;
  activeReminders: AssistantReminder[];
  recentDecisions: string[];
  lastAgentRunAt?: string;
}

export interface AssistantMemoryPatch {
  profileMemory?: string[];
  preferenceMemory?: string[];
  lastKnownState?: string | null;
  workingMemorySummary?: string | null;
  activeReminders?: AssistantReminder[];
  recentDecisions?: string[];
  lastAgentRunAt?: string | null;
}

export type AssistantEditableMemoryListKey = 'profileMemory' | 'preferenceMemory';

export interface DreamTopic {
  id: string;
  title: string;
  note?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DreamEntryStatus = 'stable' | 'watch' | 'risk' | 'archived';

export interface DreamEntry {
  id: string;
  topicId: string;
  content: string;
  observedRangeStart: string;
  observedRangeEnd: string;
  observedAt: string;
  sourceSummary?: string;
  status: DreamEntryStatus;
  updatedAt: string;
}

export interface DreamState {
  version: 1;
  updatedAt: string;
  lastDreamRunAt?: string;
  topics: DreamTopic[];
  entries: DreamEntry[];
}

export interface DreamPatch {
  updatedAt: string;
  createdEntries?: DreamEntry[];
  updatedEntries?: DreamEntry[];
  deletedEntryIds?: string[];
}

export type DreamUpdateAction = 'created' | 'updated' | 'deleted';

export interface DreamUpdateCard {
  topicId: string;
  topicTitle: string;
  action: DreamUpdateAction;
  content: string;
  observedRangeStart?: string;
  observedRangeEnd?: string;
  updatedAt: string;
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
  logSubmissionTriggerEnabled: boolean;
  logSubmissionTriggerActivityIds: string[];
  letterEnabled: boolean;
  letterFrequencyDays: number;
  letterWindowStart?: string;
  letterWindowEnd?: string;
  nextLetterAt?: string;
  lastLetterSentAt?: string;
  lastLetterScheduledAt?: string;
}

export interface AssistantLetterDraft {
  title: string;
  preview: string;
  content: string;
}

export interface AssistantLetter {
  id: string;
  title: string;
  preview: string;
  content: string;
  personaId: string;
  personaName: string;
  scheduledFor: string;
  sentAt: string;
  createdAt: string;
  sourceTriggerId?: string;
  status: 'sent';
}

export interface AssistantLetterResultCard {
  letterId: string;
  title: string;
  preview: string;
  personaName: string;
  sentAt: string;
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

export type AssistantNativeDiagnosticLevel = 'info' | 'success' | 'warning' | 'error';

export type AssistantNativeDiagnosticType =
  | 'service_started'
  | 'service_stopped'
  | 'config_applied'
  | 'poll_tick'
  | 'checkin_skipped'
  | 'checkin_dispatched'
  | 'reminder_due_dispatched'
  | 'native_request_started'
  | 'native_request_completed'
  | 'native_request_failed'
  | 'manual_trigger_dispatched'
  | 'user_turn_recorded'
  | 'task_state_changed_recorded';

export interface AssistantNativeDiagnosticEntry {
  id: string;
  type: AssistantNativeDiagnosticType;
  level: AssistantNativeDiagnosticLevel;
  createdAt: string;
  message: string;
  triggerId?: string;
  triggerType?: AssistantSystemTriggerType;
  reason?: string;
  context?: Record<string, string>;
}

export interface AssistantNativeBackgroundSnapshot {
  systemPrompt: string;
  conversation: AssistantTurnConversationContext;
}

export type AssistantMemoryAction = 'no_update' | 'update_memory';

export type AssistantSilentReason =
  | 'active_focus_protection'
  | 'likely_do_not_disturb'
  | 'state_still_clear'
  | 'insufficient_confidence'
  | 'waiting_for_stronger_signal'
  | 'followup_already_scheduled';

export type AssistantSystemAction =
  | 'silent'
  | 'send_message';

export interface AssistantSystemTurnDecision {
  action: AssistantSystemAction;
  message?: string;
  messageParts?: string[];
  reminders?: AssistantReminderDraft[];
  memoryAction: AssistantMemoryAction;
  memoryPatch?: AssistantMemoryPatch;
  decisionSummary?: string;
  silentReason?: AssistantSilentReason;
  silentSideEffects?: string[];
}

export interface AssistantOrchestratorResult {
  decision: AssistantSystemTurnDecision;
  appliedReminders?: AssistantReminder[];
  updatedMemory: AssistantMemory;
  surfacedMessage?: string;
}

export type AssistantTurnMode = 'foreground' | 'background';

export type AssistantTurnOutcome = 'reply' | 'clarify' | 'silent';

export type AssistantLocalQueryTarget =
  | 'logs'
  | 'todos'
  | 'reviews'
  | 'categories'
  | 'activities'
  | 'scopes'
  | 'principles'
  | 'selfBeliefs'
  | 'all';

export type AssistantLocalQueryMode = 'filter_expression' | 'keyword_search';

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
  createdAt?: string;
}

export interface AssistantTurnConversationContext {
  recentTurns: AssistantConversationEntry[];
  summary?: string;
}

export interface AssistantTurnStateContext {
  currentDateTime: string;
  stateContextDate: string;
  currentLocalDate?: string;
  currentWeekday?: string;
  tomorrowDate?: string;
  dayAfterTomorrowDate?: string;
  currentWeekRange?: string;
  nextWeekdayDates?: Record<string, string>;
  timelineSummaryForDate?: string;
  timelineSummaryForPreviousDate?: string;
  timelineReviewSummary?: string;
  activeSessionSummary?: string;
  scheduledTodosForDateSummary?: string;
  pinnedTodoSummary?: string;
  overdueTodoSummary?: string;
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
  kind?: TodoKind;
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
  timeRange: string;
  categoryId?: string;
  categoryName?: string;
  activityId?: string;
  activityName?: string;
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

export interface AssistantLocalQueryRequest {
  mode: AssistantLocalQueryMode;
  targets: AssistantLocalQueryTarget[];
  query: string;
  limit?: number;
}

export interface AssistantLocalQueryResultItem {
  itemType: 'log' | 'todo' | 'review' | 'category' | 'activity' | 'scope' | 'principle' | 'selfBelief';
  id: string;
  title: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface AssistantLocalQueryResult {
  round: number;
  request: AssistantLocalQueryRequest;
  status?: 'executed' | 'rejected_duplicate';
  statusMessage?: string;
  hitCount: number;
  items: AssistantLocalQueryResultItem[];
  digest: string;
}

export interface AssistantUnifiedTurnInput {
  mode: AssistantTurnMode;
  trigger: AssistantTurnTrigger;
  promptLayers: AssistantPromptLayers;
  memoryEnabled?: boolean;
  memory: AssistantMemory;
  conversation: AssistantTurnConversationContext;
  stateContext: AssistantTurnStateContext;
  dictionaryContext: AssistantTurnDictionaryContext;
  dreamContext?: string;
  localQueryHistory?: AssistantLocalQueryResult[];
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

export interface AssistantCreateTodoSubtaskArgs {
  title: string;
  note?: string;
  scheduledDate?: string;
  deadlineDate?: string;
}

export interface AssistantCreateTodoToolCall {
  toolName: 'create_todo';
  args: {
    title: string;
    categoryId: string;
    kind?: TodoKind;
    linkedCategoryId?: string;
    linkedActivityId?: string;
    defaultScopeIds?: string[];
    note?: string;
    scheduledDate?: string;
    deadlineDate?: string;
    recurrenceRule?: TodoRecurrenceRule;
    subtasks?: AssistantCreateTodoSubtaskArgs[];
  };
}

export interface AssistantUpdateTodoToolCall {
  toolName: 'update_todo';
  args: {
    todoId: string;
    patch: {
      title?: string;
      note?: string | null;
      kind?: TodoKind;
      categoryId?: string;
      linkedCategoryId?: string | null;
      linkedActivityId?: string | null;
      defaultScopeIds?: string[] | null;
      scheduledDate?: string | null;
      deadlineDate?: string | null;
      recurrenceRule?: TodoRecurrenceRule | null;
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

export interface AssistantCreatePrincipleToolCall {
  toolName: 'create_principle';
  args: {
    id?: string;
    title?: string;
    frontText?: string;
    backText?: string;
    descriptions?: Array<{
      text: string;
      date?: string;
    }>;
  };
}

export interface AssistantCreateSelfBeliefToolCall {
  toolName: 'create_self_belief';
  args: {
    id?: string;
    title?: string;
    descriptions?: Array<{
      text: string;
      date?: string;
    }>;
  };
}

export type AssistantToolCall =
  | AssistantCreateLogToolCall
  | AssistantCreateTodoToolCall
  | AssistantUpdateTodoToolCall
  | AssistantCreateSubtaskToolCall
  | AssistantEditLogToolCall
  | AssistantCreatePrincipleToolCall
  | AssistantCreateSelfBeliefToolCall;

export interface AssistantReasoningPart {
  text: string;
}

export interface AssistantReasoningSummary {
  parts: AssistantReasoningPart[];
  providerLabel?: string;
}

export interface AssistantUnifiedTurnOutput {
  mode: AssistantTurnMode;
  outcome: AssistantTurnOutcome;
  assistantReply?: string;
  reasoning?: AssistantReasoningSummary;
  localQueryRequest?: AssistantLocalQueryRequest;
  toolCalls?: AssistantToolCall[];
  reminders?: AssistantReminderDraft[];
  memoryAction: AssistantMemoryAction;
  memoryPatch?: AssistantMemoryPatch;
  decisionSummary?: string;
  silentReason?: AssistantSilentReason;
  silentSideEffects?: string[];
}
