/**
 * @file assistantOrchestratorService.ts
 * @input Assistant system triggers, local todo/log/session summaries, AI service access, and assistant memory
 * @output Background assistant turn decisions plus applied reminder or memory side effects
 * @pos Service (Assistant Orchestrator)
 * @description Orchestrates Android-first assistant system turns by loading structured memory, assembling a prompt, calling the existing AI service, and applying the resulting silent/message/reminder/memory actions back into local state.
 * @updated 2026-09-04: Executes structured AI reminder removal actions in Web and native-background hydration paths.
 * @updated 2026-05-17: Persisted background chat/history writes now mark the unified AI backup state as changed so background-only AI activity can trigger cloud-sync/export timestamp updates.
 * @updated 2026-09-02: Hydrates native request failures into background call history so failed Android executions remain visible after the WebView resumes.
 * @updated 2026-09-02: Treats explicit silent outcomes as non-user-facing even if a provider also returns stray assistantReply text, preventing native and Web notification leaks.
 *
 * @updated 2026-05-16: Fixed submitted-log debug labels and normalized fallback assistant-notification titles to readable `AI 助理` text.
 * @updated 2026-05-14: Persisted provider-native reasoning summaries alongside surfaced background assistant messages so foreground and background chat entries share the same collapsible thinking payload shape.
 * @updated 2026-05-13: Native reminder_due hydrations now respect the diagnostic `nativeNotificationShown` flag so Web-side catch-up does not replay a second system notification for the same reminder.
 * @updated 2026-05-13: Native completed-request hydrations now rebuild and persist a foreground-style debug exchange from Android diagnostics, so background prompt assembly can be inspected from the same debug UI as Web-run turns.
 * @updated 2026-05-12: Background message persistence now falls back only to the latest ordinary conversation with a real user-authored turn, so template sessions never receive native or web background replies by accident.
 * @updated 2026-05-06: Passed through explicit `yesterdayTimelineSummary` alongside today's activity records so background turns see both recent days in state context.
 * @updated 2026-05-06: Passed through optional `timelineReviewSummary`, dropped the stale recent-log turn input, and treat any background reply text as a surfaced message even if the model drifts from the expected outcome label.
 * @updated 2026-05-04: Linked persisted background messages back to their source call-history entries so debug mode can open the right request trace directly from the message bubble.
 * @updated 2026-05-01: Added native-background reply hydration so Android-side completed check-ins can be surfaced back into persisted Web chat sessions instead of living only in diagnostics.
 * @updated 2026-04-27: Persisted background message memory/reminder update metadata so chat history can render the same expand controls as foreground assistant turns.
 * @updated 2026-04-27: Added background call trigger ids plus persisted request/response debug exchanges so web AI execution can be correlated with native poll diagnostics.
 * @updated 2026-04-27: Stopped exposing assistant-facing UTC `Z` current-time anchors and now keep one local-offset ISO time anchor in background prompt state.
 * @updated 2026-04-27: Added readable decision summaries, silent reasons, side-effect tracking, and multi-bubble reply-part persistence for background assistant turns.
 * @updated 2026-04-27: Passed the long-term-memory feature flag into unified turns so background prompts can skip memory instructions when memory is disabled.
 * @updated 2026-04-26: Removed an unused long-term-memory field from ephemeral assistant-memory snapshots.
 * @updated 2026-04-26: Assistant active-message notifications now use the target chat session's persona card name as the notification title when available.
 * @updated 2026-04-26: Added Android assistant active-notification surfacing and exact session/message navigation payloads for background replies that should alert the user outside the app.
 * @updated 2026-04-26: Surfaced background debug sections onto persisted assistant messages when debug mode is enabled, and carried local/UTC time anchors into reminder-sensitive background prompts.
 * @updated 2026-04-26: Background assistant replies now persist into the explicitly targeted active chat session instead of guessing by most-recent session activity.
 * @updated 2026-04-26: Added a standalone compressed recent-log digest channel so background prompt debug views no longer bury recent history inside dictionary payloads.
 * @updated 2026-04-26: Unified background turns around the shared turn-output schema so reminders, memory decisions, persona prompts, and dictionary context no longer collapse back into the older single-action path.
 * @updated 2026-04-26: Added the first-pass assistant orchestrator for background system turns, including memory updates, reminder queue writes, and persisted AI-chat message surfacing.
 */

import {
  type AssistantMemory,
  type AssistantMemoryPatch,
  type AssistantNativeDiagnosticEntry,
  type AssistantOrchestratorResult,
  type AssistantReasoningSummary,
  type AssistantReminder,
  type AssistantReminderAction,
  type AssistantReminderDraft,
  type AssistantSilentReason,
  type AssistantUnifiedTurnOutput,
  type AssistantTurnDictionaryContext,
  type AssistantTurnTrigger,
  type AssistantSystemTrigger,
  type AssistantSystemTurnDecision
} from '../types/assistant';
import { type AIDebugExchange, type AIConversationTurn } from './aiService';
import { assistantAgentConfigService } from './assistantAgentConfigService';
import { assistantContextBuilder } from './assistantContextBuilder';
import { assistantMemoryService } from './assistantMemoryService';
import { assistantPromptService } from './assistantPromptService';
import { assistantReminderQueueService } from './assistantReminderQueueService';
import { assistantTurnService } from './assistantTurnService';
import { dreamService } from './dreamService';
import { formatAssistantDateTimeForDisplay, normalizeAssistantDateTime } from '../utils/assistantTime';
import { resolveLatestOrdinaryAssistantBackgroundSession } from '../utils/assistantBackgroundSessionUtils';
import { buildAssistantDisplayParts } from '../utils/assistantMessageParts';
import { buildNativeDiagnosticDebugExchange } from '../utils/assistantNativeDebug';
import { notifyAIBackupDataChanged } from '../utils/aiBackupChange';
import AssistantAgent from '../plugins/AssistantAgentPlugin';

interface AssistantSystemTurnRequest {
  trigger: AssistantSystemTrigger;
  targetSessionId?: string;
  showSystemNotification?: boolean;
  currentDateTime: string;
  defaultDate: string;
  todayTimelineSummary: string;
  yesterdayTimelineSummary?: string;
  timelineReviewSummary?: string;
  activeSessionSummary?: string;
  todayScheduledTodoSummary?: string;
  pinnedTodoSummary?: string;
  overdueTodoSummary?: string;
  reminderSummary?: string;
  userPersonaPrompt?: string;
  dictionaryContext?: AssistantTurnDictionaryContext;
  conversationHistory?: AIConversationTurn[];
  includeDebugInPersistedMessage?: boolean;
}

interface AssistantSystemTurnExecution extends AssistantOrchestratorResult {
  debug: AIDebugExchange;
}

export interface AssistantBackgroundCallHistoryEntry {
  id: string;
  triggerId?: string;
  triggerType: string;
  triggerText: string;
  targetSessionId?: string;
  persistedMessageId?: string;
  requestedAt: string;
  completedAt?: string;
  status: 'pending' | 'completed' | 'failed';
  action: AssistantSystemTurnDecision['action'];
  memoryAction: AssistantSystemTurnDecision['memoryAction'];
  reminderCount: number;
  message?: string;
  decisionSummary?: string;
  silentReason?: AssistantSilentReason;
  sideEffects?: string[];
  errorMessage?: string;
  debugExchange?: AIDebugExchange;
}

interface PersistedAIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: AssistantReasoningSummary;
  displayParts?: string[];
  createdAt: number;
  tone?: 'normal' | 'system' | 'error' | 'pending';
  backgroundDebugHistoryId?: string;
  debugSections?: Array<{
    label: string;
    exchange: AIDebugExchange;
  }>;
  memoryUpdates?: PersistedAIChatMemoryUpdateSection[];
  reminderUpdates?: string[];
}

interface PersistedAIChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  personaId: string;
  contextCacheEnabled: boolean;
  messages: PersistedAIChatMessage[];
  templateMeta?: {
    templateType?: string;
  };
}

interface PersistedAIChatPersonaSummary {
  id: string;
  name: string;
}

interface PersistedAssistantMessageLocation {
  sessionId: string;
  messageId: string;
}

interface PersistedSessionResolution {
  sessions: PersistedAIChatSession[];
  resolvedTargetSessionId: string;
}

interface PersistedAIChatMemoryUpdateSection {
  label: string;
  items: string[];
}

const CHAT_SESSIONS_KEY = 'lumostime_ai_chat_sessions_v1';
const CHAT_PERSONAS_KEY = 'lumostime_ai_chat_personas_v1';
const ASSISTANT_DECISION_EVENT = 'lumostime:assistant-chat-updated';
const ASSISTANT_BACKGROUND_CALL_HISTORY_KEY = 'lumostime_assistant_background_call_history_v1';
const MAX_BACKGROUND_CALL_HISTORY = 100;
const DEFAULT_PERSONA_ID = 'builtin-default';

const createEphemeralMemory = (): AssistantMemory => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  profileMemory: [],
  preferenceMemory: [],
  activeReminders: [],
  recentDecisions: []
});

const createFallbackPersistedSession = (): PersistedAIChatSession => {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: '新对话',
    createdAt: now,
    updatedAt: now,
    personaId: DEFAULT_PERSONA_ID,
    contextCacheEnabled: true,
    messages: []
  };
};

const safeParseJson = <T>(raw: string | null, fallback: T): T => {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error('[assistantOrchestratorService] Failed to parse JSON', error);
    return fallback;
  }
};

const loadPersistedSessions = (): PersistedAIChatSession[] => (
  safeParseJson<PersistedAIChatSession[]>(localStorage.getItem(CHAT_SESSIONS_KEY), [])
);

const loadPersistedPersonaNameMap = (): Map<string, string> => {
  const personas = safeParseJson<unknown[]>(localStorage.getItem(CHAT_PERSONAS_KEY), []);
  return new Map(
    personas.flatMap((value) => {
      if (!value || typeof value !== 'object') {
        return [];
      }

      const candidate = value as Partial<PersistedAIChatPersonaSummary>;
      const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
      const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
      if (!id || !name) {
        return [];
      }

      return [[id, name] as const];
    })
  );
};

const resolvePersistedTargetSession = (
  targetSessionId?: string
): PersistedSessionResolution | null => {
  const persistedSessions = loadPersistedSessions();
  const sessions = persistedSessions.length > 0
    ? persistedSessions
    : [createFallbackPersistedSession()];
  const resolvedTargetSessionId = (
    targetSessionId
    && sessions.some((session) => session.id === targetSessionId)
  )
    ? targetSessionId
    : resolveLatestOrdinaryAssistantBackgroundSession(sessions)?.id;
  if (!resolvedTargetSessionId) {
    return null;
  }

  return {
    sessions,
    resolvedTargetSessionId
  };
};

const getPersistedSessionPersonaName = (targetSessionId?: string): string => {
  const resolved = resolvePersistedTargetSession(targetSessionId);
  if (!resolved) {
    return 'AI';
  }

  const targetSession = resolved.sessions.find((session) => session.id === resolved.resolvedTargetSessionId);
  if (!targetSession?.personaId) {
    return 'AI';
  }

  return loadPersistedPersonaNameMap().get(targetSession.personaId) || 'AI';
};

const normalizeBackgroundCallHistoryEntry = (value: unknown): AssistantBackgroundCallHistoryEntry | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<AssistantBackgroundCallHistoryEntry>;
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  const triggerType = typeof candidate.triggerType === 'string' ? candidate.triggerType.trim() : '';
  const triggerText = typeof candidate.triggerText === 'string' ? candidate.triggerText.trim() : '';
  const requestedAt = typeof candidate.requestedAt === 'string' ? candidate.requestedAt.trim() : '';
  const completedAt = typeof candidate.completedAt === 'string' ? candidate.completedAt.trim() : '';
  const status = candidate.status === 'failed'
    ? 'failed'
    : candidate.status === 'pending'
      ? 'pending'
      : 'completed';
  const action = candidate.action === 'send_message' ? 'send_message' : 'silent';
  const memoryAction = candidate.memoryAction === 'update_memory' ? 'update_memory' : 'no_update';
  const sideEffects = Array.isArray(candidate.sideEffects)
    ? candidate.sideEffects
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
    : [];

  if (!id || !triggerType || !requestedAt) {
    return null;
  }

  return {
    id,
    triggerType,
    triggerText,
    requestedAt,
    ...(completedAt ? { completedAt } : {}),
    status,
    action,
    memoryAction,
    reminderCount: Number.isFinite(candidate.reminderCount) ? Math.max(0, Number(candidate.reminderCount)) : 0,
    ...(typeof candidate.targetSessionId === 'string' && candidate.targetSessionId.trim() ? { targetSessionId: candidate.targetSessionId.trim() } : {}),
    ...(typeof candidate.triggerId === 'string' && candidate.triggerId.trim() ? { triggerId: candidate.triggerId.trim() } : {}),
    ...(typeof candidate.persistedMessageId === 'string' && candidate.persistedMessageId.trim() ? { persistedMessageId: candidate.persistedMessageId.trim() } : {}),
    ...(typeof candidate.message === 'string' && candidate.message.trim() ? { message: candidate.message.trim() } : {}),
    ...(typeof candidate.decisionSummary === 'string' && candidate.decisionSummary.trim() ? { decisionSummary: candidate.decisionSummary.trim() } : {}),
    ...(typeof candidate.silentReason === 'string' && candidate.silentReason.trim() ? { silentReason: candidate.silentReason.trim() as AssistantSilentReason } : {}),
    ...(sideEffects.length > 0 ? { sideEffects } : {}),
    ...(typeof candidate.errorMessage === 'string' && candidate.errorMessage.trim() ? { errorMessage: candidate.errorMessage.trim() } : {}),
    ...(candidate.debugExchange ? { debugExchange: candidate.debugExchange as AIDebugExchange } : {})
  };
};

const loadBackgroundCallHistory = (): AssistantBackgroundCallHistoryEntry[] => (
  safeParseJson<unknown[]>(localStorage.getItem(ASSISTANT_BACKGROUND_CALL_HISTORY_KEY), [])
    .map(normalizeBackgroundCallHistoryEntry)
    .filter((entry): entry is AssistantBackgroundCallHistoryEntry => Boolean(entry))
);

const saveBackgroundCallHistory = (entries: AssistantBackgroundCallHistoryEntry[]) => {
  localStorage.setItem(
    ASSISTANT_BACKGROUND_CALL_HISTORY_KEY,
    JSON.stringify(entries.slice(0, MAX_BACKGROUND_CALL_HISTORY))
  );
  notifyAIBackupDataChanged();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ASSISTANT_DECISION_EVENT));
  }
};

const upsertBackgroundCallHistory = (entry: AssistantBackgroundCallHistoryEntry) => {
  const existingEntries = loadBackgroundCallHistory();
  const existingIndex = existingEntries.findIndex((item) => item.id === entry.id);
  if (existingIndex === -1) {
    saveBackgroundCallHistory([entry, ...existingEntries]);
    return;
  }

  const nextEntries = [...existingEntries];
  nextEntries[existingIndex] = entry;
  saveBackgroundCallHistory(nextEntries);
};

const getBackgroundDebugLabel = (triggerType: AssistantSystemTrigger['type']): string => {
  switch (triggerType) {
    case 'assistant_letter_due':
      return 'AI 来信调试';
    case 'reminder_due':
      return '后台 Reminder 调试';
    case 'checkin':
      return '后台 Check-in 调试';
    case 'long_idle':
      return '后台 Long Idle 调试';
    case 'log_submitted':
      return '后台日志提交调试';
    case 'focus_started':
      return '后台 Focus Started 调试';
    case 'focus_ended':
      return '后台 Focus Ended 调试';
    case 'todo_changed':
      return '后台 Todo Changed 调试';
    case 'manual_background_nudge':
      return '后台 Manual Nudge 调试';
    default:
      return '后台调试';
  }
};

const buildNativeHydratedHistoryId = (triggerId: string): string => `native:${triggerId}`;

const normalizeAssistantText = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  return trimmed && !['null', 'undefined'].includes(trimmed.toLowerCase())
    ? trimmed
    : '';
};

const parseDiagnosticJson = <T,>(value: unknown, fallback: T): T => {
  const raw = normalizeAssistantText(value);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error('[assistantOrchestratorService] Failed to parse native diagnostic JSON payload', error);
    return fallback;
  }
};

const parseNativeMemoryAction = (value: unknown): 'no_update' | 'update_memory' => (
  normalizeAssistantText(value) === 'update_memory' ? 'update_memory' : 'no_update'
);

const parseNativeMemoryPatch = (value: unknown): AssistantMemoryPatch | undefined => {
  const parsed = parseDiagnosticJson<unknown>(value, null);
  return parsed && typeof parsed === 'object'
    ? parsed as AssistantMemoryPatch
    : undefined;
};

const parseNativeReminderDrafts = (value: unknown): AssistantReminderDraft[] => {
  const parsed = parseDiagnosticJson<unknown>(value, []);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as Partial<AssistantReminderDraft>;
    const dueAt = normalizeAssistantText(candidate.dueAt);
    const text = normalizeAssistantText(candidate.text);
    if (!dueAt || !text) {
      return [];
    }

    return [{
      dueAt,
      text,
      ...(candidate.type ? { type: candidate.type } : {}),
      ...(normalizeAssistantText(candidate.todoId) ? { todoId: normalizeAssistantText(candidate.todoId) } : {})
    }];
  });
};

const parseNativeReminderActions = (value: unknown): AssistantReminderAction[] => {
  const parsed = parseDiagnosticJson<unknown>(value, []);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as Partial<AssistantReminderAction>;
    const reminderId = normalizeAssistantText(candidate.reminderId);
    return candidate.action === 'remove' && reminderId
      ? [{ action: 'remove' as const, reminderId }]
      : [];
  });
};

const applyReminderActions = (
  actions: AssistantReminderAction[],
  enabled: boolean
): AssistantReminder[] => {
  if (!enabled) {
    return [];
  }

  return actions.flatMap((action) => {
    if (action.action !== 'remove') {
      return [];
    }

    const removedReminder = assistantReminderQueueService.removeReminder(action.reminderId);
    return removedReminder ? [removedReminder] : [];
  });
};

const buildNativeTriggerText = (triggerType?: AssistantSystemTrigger['type']): string => {
  switch (triggerType) {
    case 'assistant_letter_due':
      return 'Native assistant-letter trigger';
    case 'reminder_due':
      return 'Native background reminder trigger';
    case 'manual_background_nudge':
      return 'Native manual background assistant trigger';
    case 'long_idle':
      return 'Native long-idle assistant trigger';
    case 'log_submitted':
      return 'Native submitted-log assistant trigger';
    case 'focus_started':
      return 'Native focus-started assistant trigger';
    case 'focus_ended':
      return 'Native focus-ended assistant trigger';
    case 'todo_changed':
      return 'Native todo-changed assistant trigger';
    case 'checkin':
    default:
      return 'Native background check-in trigger';
  }
};

const describeSilentReason = (silentReason?: AssistantSilentReason): string => {
  switch (silentReason) {
    case 'active_focus_protection':
      return '这次先不打扰：用户可能仍在专注。';
    case 'likely_do_not_disturb':
      return '这次先不打扰：现在更像不适合被提醒的时段。';
    case 'state_still_clear':
      return '这次先不打扰：当前状态还比较清晰。';
    case 'insufficient_confidence':
      return '这次先不打扰：当前信号还不够明确。';
    case 'waiting_for_stronger_signal':
      return '这次先不打扰：先继续观察，等更明确的变化。';
    case 'followup_already_scheduled':
      return '这次先不打扰：后续关注已经安排好了。';
    default:
      return '这次先不打扰：先继续观察。';
  }
};

const dedupeStrings = (items: string[]): string[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
};

const buildPersistedMemoryUpdateSections = (
  before: AssistantMemory,
  after: AssistantMemory
): PersistedAIChatMemoryUpdateSection[] => {
  const sections: PersistedAIChatMemoryUpdateSection[] = [];

  const addedProfile = after.profileMemory.filter((item) => !before.profileMemory.includes(item));
  if (addedProfile.length > 0) {
    sections.push({ label: '用户画像记忆', items: addedProfile });
  }

  const addedPreferences = after.preferenceMemory.filter((item) => !before.preferenceMemory.includes(item));
  if (addedPreferences.length > 0) {
    sections.push({ label: '偏好记忆', items: addedPreferences });
  }

  if (after.lastKnownState && after.lastKnownState !== before.lastKnownState) {
    sections.push({ label: '当前状态', items: [after.lastKnownState] });
  }

  if (after.workingMemorySummary && after.workingMemorySummary !== before.workingMemorySummary) {
    sections.push({ label: '工作记忆摘要', items: [after.workingMemorySummary] });
  }

  const addedDecisions = after.recentDecisions.filter((item) => !before.recentDecisions.includes(item));
  if (addedDecisions.length > 0) {
    sections.push({ label: '决策摘要', items: addedDecisions });
  }

  return sections;
};

const buildPersistedReminderUpdates = (reminders: AssistantReminder[]): string[] => (
  reminders.map((reminder) => `${formatAssistantDateTimeForDisplay(reminder.dueAt)} · ${reminder.text}`)
);

const buildMemoryPatchSideEffects = (memoryPatch?: AssistantUnifiedTurnOutput['memoryPatch']): string[] => {
  if (!memoryPatch) {
    return [];
  }

  return dedupeStrings([
    memoryPatch.lastKnownState !== undefined ? '更新了当前状态摘要' : '',
    memoryPatch.workingMemorySummary !== undefined ? '更新了当前工作摘要' : '',
    Array.isArray(memoryPatch.profileMemory) && memoryPatch.profileMemory.length > 0 ? '补充了用户画像记忆' : '',
    Array.isArray(memoryPatch.preferenceMemory) && memoryPatch.preferenceMemory.length > 0 ? '补充了偏好记忆' : ''
  ]);
};

const buildAppliedSideEffects = (
  output: AssistantUnifiedTurnOutput,
  appliedReminders: AssistantReminder[],
  removedReminders: AssistantReminder[],
  usedLongTermMemory: boolean
): string[] => {
  return dedupeStrings([
    ...buildMemoryPatchSideEffects(output.memoryPatch),
    ...(removedReminders.length > 0 ? [`移除了 ${removedReminders.length} 条提醒`] : []),
    ...(appliedReminders.length > 0 ? [`新增了 ${appliedReminders.length} 条后续提醒`] : []),
    ...(usedLongTermMemory ? ['记录了最近决策摘要'] : []),
    ...((output.silentSideEffects || []).map((item) => item.trim()).filter(Boolean))
  ]);
};

const buildDecisionSummary = (
  output: AssistantUnifiedTurnOutput,
  decisionAction: AssistantSystemTurnDecision['action'],
  sideEffects: string[],
  surfacedMessage?: string
): string => {
  if (output.decisionSummary?.trim()) {
    return output.decisionSummary.trim();
  }

  if (decisionAction === 'send_message' && surfacedMessage?.trim()) {
    return `这次有主动跟进：${surfacedMessage.trim()}`;
  }

  const effectSummary = sideEffects.length > 0
    ? `已处理：${sideEffects.join('；')}。`
    : '暂时没有额外动作。';

  return `${describeSilentReason(output.silentReason)}${effectSummary}`;
};

const persistAssistantMessage = (
  message: string,
  targetSessionId?: string,
  options?: {
    reasoning?: AssistantReasoningSummary;
    displayParts?: string[];
    backgroundDebugHistoryId?: string;
    debugSections?: Array<{
      label: string;
      exchange: AIDebugExchange;
    }>;
    memoryUpdates?: PersistedAIChatMemoryUpdateSection[];
    reminderUpdates?: string[];
  }
) : PersistedAssistantMessageLocation | null => {
  const trimmed = normalizeAssistantText(message);
  if (!trimmed) {
    return null;
  }

  const resolved = resolvePersistedTargetSession(targetSessionId);
  if (!resolved) {
    return null;
  }

  const {
    sessions,
    resolvedTargetSessionId
  } = resolved;
  const now = Date.now();
  const nextMessage: PersistedAIChatMessage = {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: trimmed,
    ...(options?.reasoning ? { reasoning: options.reasoning } : {}),
    ...(options?.displayParts?.length ? { displayParts: options.displayParts } : {}),
    createdAt: now,
    tone: 'system',
    ...(options?.backgroundDebugHistoryId ? { backgroundDebugHistoryId: options.backgroundDebugHistoryId } : {}),
    ...(options?.debugSections?.length ? { debugSections: options.debugSections } : {}),
    ...(options?.memoryUpdates?.length ? { memoryUpdates: options.memoryUpdates } : {}),
    ...(options?.reminderUpdates?.length ? { reminderUpdates: options.reminderUpdates } : {})
  };
  const nextSessions = sessions.map((session) => (
    session.id === resolvedTargetSessionId
      ? {
        ...session,
        updatedAt: now,
        messages: [
          ...session.messages,
          nextMessage
        ]
      }
      : session
  ));

  localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(nextSessions));
  notifyAIBackupDataChanged();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ASSISTANT_DECISION_EVENT));
  }

  return {
    sessionId: resolvedTargetSessionId,
    messageId: nextMessage.id
  };
};

const persistUserMessage = (
  message: string,
  targetSessionId?: string
): PersistedAssistantMessageLocation | null => {
  const trimmed = normalizeAssistantText(message);
  if (!trimmed) {
    return null;
  }

  const resolved = resolvePersistedTargetSession(targetSessionId);
  if (!resolved) {
    return null;
  }

  const {
    sessions,
    resolvedTargetSessionId
  } = resolved;
  const now = Date.now();
  const nextMessage: PersistedAIChatMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    content: trimmed,
    createdAt: now
  };
  const nextSessions = sessions.map((session) => (
    session.id === resolvedTargetSessionId
      ? {
        ...session,
        updatedAt: now,
        messages: [
          ...session.messages,
          nextMessage
        ]
      }
      : session
  ));

  localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(nextSessions));
  notifyAIBackupDataChanged();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ASSISTANT_DECISION_EVENT));
  }

  return {
    sessionId: resolvedTargetSessionId,
    messageId: nextMessage.id
  };
};

export const assistantOrchestratorService = {
  getAssistantDecisionEventName(): string {
    return ASSISTANT_DECISION_EVENT;
  },

  getBackgroundCallHistoryStorageKey(): string {
    return ASSISTANT_BACKGROUND_CALL_HISTORY_KEY;
  },

  getBackgroundPersonaDisplayName(targetSessionId?: string): string {
    return getPersistedSessionPersonaName(targetSessionId);
  },

  persistBackgroundUserMessage(message: string, targetSessionId?: string): PersistedAssistantMessageLocation | null {
    return persistUserMessage(message, targetSessionId);
  },

  listBackgroundCallHistory(): AssistantBackgroundCallHistoryEntry[] {
    return loadBackgroundCallHistory();
  },

  upsertBackgroundCallHistoryEntry(entry: AssistantBackgroundCallHistoryEntry): void {
    upsertBackgroundCallHistory(entry);
  },

  clearBackgroundCallHistory(): void {
    localStorage.removeItem(ASSISTANT_BACKGROUND_CALL_HISTORY_KEY);
    notifyAIBackupDataChanged();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(ASSISTANT_DECISION_EVENT));
    }
  },

  hydrateNativeCompletedReplies(
    diagnostics: AssistantNativeDiagnosticEntry[],
    options?: {
      targetSessionId?: string;
      showSystemNotification?: boolean;
    }
  ): {
    surfacedMessages: string[];
    didHydrateHistory: boolean;
    didUpdateMemory: boolean;
    didUpdateReminders: boolean;
  } {
    const knownTriggerIds = new Set(
      loadBackgroundCallHistory()
        .map((entry) => entry.triggerId?.trim() || '')
        .filter(Boolean)
    );
    const assistantConfig = assistantAgentConfigService.getConfig();
    const surfacedMessages: string[] = [];
    let didHydrateHistory = false;
    let didUpdateMemory = false;
    let didUpdateReminders = false;

    diagnostics
      .filter((entry) => entry.type === 'native_request_completed' || entry.type === 'native_request_failed')
      .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt))
      .forEach((entry) => {
        const triggerId = entry.triggerId?.trim();
        if (!triggerId || knownTriggerIds.has(triggerId)) {
          return;
        }

        knownTriggerIds.add(triggerId);
        if (entry.type === 'native_request_failed') {
          upsertBackgroundCallHistory({
            id: buildNativeHydratedHistoryId(triggerId),
            triggerId,
            triggerType: entry.triggerType || 'checkin',
            triggerText: buildNativeTriggerText(entry.triggerType),
            ...(options?.targetSessionId ? { targetSessionId: options.targetSessionId } : {}),
            requestedAt: normalizeAssistantText(entry.context?.requestedAt) || entry.createdAt,
            completedAt: entry.createdAt,
            status: 'failed',
            action: 'silent',
            memoryAction: 'no_update',
            reminderCount: 0,
            errorMessage: normalizeAssistantText(entry.context?.error) || entry.message,
            debugExchange: buildNativeDiagnosticDebugExchange(entry)
          });
          didHydrateHistory = true;
          return;
        }

        const nativeOutcome = normalizeAssistantText(entry.context?.outcome);
        const rawAssistantReply = normalizeAssistantText(entry.context?.assistantReply);
        const assistantReply = nativeOutcome === 'silent' ? '' : rawAssistantReply;
        const decisionSummary = normalizeAssistantText(entry.context?.decisionSummary);
        const requestedAt = normalizeAssistantText(entry.context?.requestedAt) || entry.createdAt;
        const completedAt = normalizeAssistantText(entry.context?.completedAt) || entry.createdAt;
        const nativeDebugExchange = buildNativeDiagnosticDebugExchange(entry);
        const memoryAction = parseNativeMemoryAction(entry.context?.memoryAction);
        const memoryPatch = parseNativeMemoryPatch(entry.context?.memoryPatch);
        const reminderDrafts = parseNativeReminderDrafts(entry.context?.reminders);
        const reminderActions = parseNativeReminderActions(entry.context?.reminderActions);
        const beforeMemory = assistantMemoryService.getMemory();
        let memoryUpdates: PersistedAIChatMemoryUpdateSection[] = [];
        const appliedReminders: AssistantReminder[] = [];
        const removedReminders = applyReminderActions(reminderActions, assistantConfig.enabled);
        didUpdateReminders = didUpdateReminders || removedReminders.length > 0;

        if (assistantConfig.longTermMemoryEnabled && memoryAction === 'update_memory' && memoryPatch) {
          const afterMemory = assistantMemoryService.applyPatch(memoryPatch);
          memoryUpdates = buildPersistedMemoryUpdateSections(beforeMemory, afterMemory);
          didUpdateMemory = true;
        }

        if (assistantConfig.enabled && reminderDrafts.length > 0) {
          reminderDrafts.forEach((reminder) => {
            const normalizedDueAt = normalizeAssistantDateTime(reminder.dueAt);
            if (!normalizedDueAt || !reminder.text) {
              return;
            }

            appliedReminders.push(assistantReminderQueueService.enqueueReminder({
              id: crypto.randomUUID(),
              type: reminder.type || 'self_followup',
              dueAt: normalizedDueAt,
              status: 'pending',
              text: reminder.text,
              ...(reminder.todoId ? { todoId: reminder.todoId } : {}),
              source: 'agent',
              createdAt: completedAt
            }));
          });
          didUpdateReminders = didUpdateReminders || appliedReminders.length > 0;
        }

        if (assistantConfig.longTermMemoryEnabled && (appliedReminders.length > 0 || removedReminders.length > 0)) {
          assistantMemoryService.replaceActiveReminders(
            assistantReminderQueueService.listReminders().filter((reminder) => reminder.status === 'pending')
          );
          didUpdateMemory = true;
        }

        const reminderUpdates = [
          ...removedReminders.map((reminder) => `已移除 reminder：${reminder.text}`),
          ...buildPersistedReminderUpdates(appliedReminders)
        ];
        const finalDecisionSummary = decisionSummary
          || (
            assistantReply
              ? `这次原生后台请求返回了一条消息：${assistantReply}`
              : '这次原生后台请求已完成'
          );
        if (assistantConfig.longTermMemoryEnabled && finalDecisionSummary) {
          assistantMemoryService.appendDecisionSummary(finalDecisionSummary);
          didUpdateMemory = true;
        }

        const baseHistoryEntry: AssistantBackgroundCallHistoryEntry = {
          id: buildNativeHydratedHistoryId(triggerId),
          triggerId,
          triggerType: entry.triggerType || 'checkin',
          triggerText: buildNativeTriggerText(entry.triggerType),
          ...(options?.targetSessionId ? { targetSessionId: options.targetSessionId } : {}),
          requestedAt,
          completedAt,
          status: 'completed',
          action: assistantReply ? 'send_message' : 'silent',
          memoryAction,
          reminderCount: appliedReminders.length,
          ...(assistantReply ? { message: assistantReply } : {}),
          decisionSummary: finalDecisionSummary,
          ...(nativeDebugExchange ? { debugExchange: nativeDebugExchange } : {})
        };

        upsertBackgroundCallHistory(baseHistoryEntry);
        didHydrateHistory = true;
        if (!assistantReply) {
          return;
        }

        const persistedLocation = persistAssistantMessage(assistantReply, options?.targetSessionId, {
          backgroundDebugHistoryId: baseHistoryEntry.id,
          ...(memoryUpdates.length > 0 ? { memoryUpdates } : {}),
          ...(reminderUpdates.length > 0 ? { reminderUpdates } : {})
        });
        if (persistedLocation?.sessionId && persistedLocation.sessionId !== baseHistoryEntry.targetSessionId) {
          upsertBackgroundCallHistory({
            ...baseHistoryEntry,
            targetSessionId: persistedLocation.sessionId,
            persistedMessageId: persistedLocation.messageId
          });
        } else if (persistedLocation) {
          upsertBackgroundCallHistory({
            ...baseHistoryEntry,
            persistedMessageId: persistedLocation.messageId
          });
        }

        const nativeNotificationShown = normalizeAssistantText(entry.context?.nativeNotificationShown) === 'true';
        if (options?.showSystemNotification && persistedLocation && !nativeNotificationShown) {
          const persistedSessions = loadPersistedSessions();
          const personaNameMap = loadPersistedPersonaNameMap();
          const targetSession = persistedSessions.find((session) => session.id === persistedLocation.sessionId);
          const notificationTitle = (
            targetSession?.personaId
              ? personaNameMap.get(targetSession.personaId)
              : undefined
          ) || 'AI 助理';

          void AssistantAgent.showAssistantNotification({
            title: notificationTitle,
            body: assistantReply,
            targetSessionId: persistedLocation.sessionId,
            targetMessageId: persistedLocation.messageId
          }).catch((error) => {
            console.error('[assistantOrchestratorService] Failed to show hydrated assistant notification', error);
          });
        }

        surfacedMessages.push(assistantReply);
      });

    return {
      surfacedMessages,
      didHydrateHistory,
      didUpdateMemory,
      didUpdateReminders
    };
  },

  async runSystemTurn(request: AssistantSystemTurnRequest): Promise<AssistantSystemTurnExecution> {
    const backgroundCallId = crypto.randomUUID();
    const pendingRequestedAt = new Date().toISOString();
    const assistantConfig = assistantAgentConfigService.getConfig();
    const memory = assistantConfig.longTermMemoryEnabled
      ? assistantMemoryService.getMemory()
      : createEphemeralMemory();
    const [basePrompt, backgroundModePrompt] = await Promise.all([
      assistantPromptService.getAssistantBasePrompt(),
      assistantPromptService.getBackgroundModePrompt()
    ]);

    const trigger: AssistantTurnTrigger = {
      type: request.trigger.type,
      source: request.trigger.source,
      text: request.trigger.text,
      createdAt: request.trigger.createdAt,
      ...(request.trigger.metadata ? { metadata: request.trigger.metadata } : {})
    };

    upsertBackgroundCallHistory({
      id: backgroundCallId,
      ...(request.trigger.id ? { triggerId: request.trigger.id } : {}),
      triggerType: request.trigger.type,
      triggerText: request.trigger.text,
      ...(request.targetSessionId ? { targetSessionId: request.targetSessionId } : {}),
      requestedAt: pendingRequestedAt,
      status: 'pending',
      action: 'silent',
      memoryAction: 'no_update',
      reminderCount: 0
    });

    let output: AssistantUnifiedTurnOutput;
    let debug: AIDebugExchange;
    try {
      const dreamContext = dreamService.buildContext({ query: request.trigger.text });
      const turnResult = await assistantTurnService.runUnifiedTurn({
        mode: 'background',
        trigger,
        promptLayers: {
          basePrompt,
          modePrompt: backgroundModePrompt,
          ...(request.userPersonaPrompt ? { userPersonaPrompt: request.userPersonaPrompt } : {})
        },
        memoryEnabled: assistantConfig.longTermMemoryEnabled,
        memory,
        conversation: assistantContextBuilder.buildConversationContext(
          (request.conversationHistory || []).map((turn) => ({
            role: turn.role,
            content: turn.content,
            ...(typeof turn.createdAt === 'string' && turn.createdAt.trim()
              ? { createdAt: turn.createdAt.trim() }
              : {})
          }))
        ),
        stateContext: {
          currentDateTime: request.currentDateTime,
          stateContextDate: request.defaultDate,
          currentLocalDate: request.defaultDate,
          todayTimelineSummary: undefined,
          yesterdayTimelineSummary: undefined,
          timelineSummaryForDate: request.todayTimelineSummary,
          ...(request.yesterdayTimelineSummary ? { timelineSummaryForPreviousDate: request.yesterdayTimelineSummary } : {}),
          ...(request.timelineReviewSummary ? { timelineReviewSummary: request.timelineReviewSummary } : {}),
          ...(request.activeSessionSummary ? { activeSessionSummary: request.activeSessionSummary } : {}),
          ...(request.todayScheduledTodoSummary ? { scheduledTodosForDateSummary: request.todayScheduledTodoSummary } : {}),
          ...(request.pinnedTodoSummary ? { pinnedTodoSummary: request.pinnedTodoSummary } : {}),
          ...(request.overdueTodoSummary ? { overdueTodoSummary: request.overdueTodoSummary } : {}),
          ...(request.reminderSummary ? { reminderSummary: request.reminderSummary } : {})
        },
        dictionaryContext: request.dictionaryContext || {},
        ...(dreamContext ? { dreamContext } : {})
      });
      output = turnResult.output;
      debug = turnResult.debug;
    } catch (error) {
      upsertBackgroundCallHistory({
        id: backgroundCallId,
        ...(request.trigger.id ? { triggerId: request.trigger.id } : {}),
        triggerType: request.trigger.type,
        triggerText: request.trigger.text,
        ...(request.targetSessionId ? { targetSessionId: request.targetSessionId } : {}),
        requestedAt: pendingRequestedAt,
        completedAt: new Date().toISOString(),
        status: 'failed',
        action: 'silent',
        memoryAction: 'no_update',
        reminderCount: 0,
        ...(error instanceof Error && error.message.trim() ? { errorMessage: error.message.trim() } : {})
      });
      throw error;
    }

    let updatedMemory: AssistantMemory = memory;
    const reminders = output.reminders || [];
    const reminderActions = output.reminderActions || [];
    const replyContent = output.assistantReply?.trim() || '';
    const messageParts = replyContent
      ? buildAssistantDisplayParts(replyContent)
      : undefined;
    let memoryUpdates: PersistedAIChatMemoryUpdateSection[] = [];
    const hasVisibleReply = output.outcome === 'reply' && Boolean(replyContent);
    const decision: AssistantSystemTurnDecision = {
      action: hasVisibleReply ? 'send_message' : 'silent',
      memoryAction: output.memoryAction,
      ...(hasVisibleReply ? { message: replyContent } : {}),
      ...(hasVisibleReply && messageParts?.length ? { messageParts } : {}),
      ...(reminders.length > 0 ? { reminders } : {}),
      ...(reminderActions.length > 0 ? { reminderActions } : {}),
      ...(output.memoryAction === 'update_memory' && output.memoryPatch ? { memoryPatch: output.memoryPatch } : {}),
      ...(output.silentReason ? { silentReason: output.silentReason } : {})
    };
    const appliedReminders: AssistantReminder[] = [];
    const removedReminders = applyReminderActions(reminderActions, assistantConfig.enabled);

    if (assistantConfig.longTermMemoryEnabled && output.memoryAction === 'update_memory' && output.memoryPatch) {
      updatedMemory = assistantMemoryService.applyPatch(output.memoryPatch);
      memoryUpdates = buildPersistedMemoryUpdateSections(memory, updatedMemory);
    }

    if (assistantConfig.enabled) {
      reminders.forEach((reminder) => {
        const normalizedDueAt = normalizeAssistantDateTime(reminder.dueAt);
        if (!normalizedDueAt || !reminder.text) {
          return;
        }

        appliedReminders.push(assistantReminderQueueService.enqueueReminder({
          id: crypto.randomUUID(),
          type: reminder.type || 'self_followup',
          dueAt: normalizedDueAt,
          status: 'pending',
          text: reminder.text,
          ...(reminder.todoId ? { todoId: reminder.todoId } : {}),
          source: 'agent',
          createdAt: new Date().toISOString()
        }));
      });
    }

    if (assistantConfig.longTermMemoryEnabled && (appliedReminders.length > 0 || removedReminders.length > 0)) {
      updatedMemory = assistantMemoryService.replaceActiveReminders(
        assistantReminderQueueService.listReminders().filter((reminder) => reminder.status === 'pending')
      );
    }

    let surfacedMessage: string | undefined;
    let surfacedMessageLocation: PersistedAssistantMessageLocation | null = null;
    const reminderUpdates = [
      ...removedReminders.map((reminder) => `已移除 reminder：${reminder.text}`),
      ...buildPersistedReminderUpdates(appliedReminders)
    ];
    const shouldRecordDecisionSummary = assistantConfig.longTermMemoryEnabled;
    if (hasVisibleReply && replyContent) {
      surfacedMessage = replyContent;
      surfacedMessageLocation = persistAssistantMessage(surfacedMessage, request.targetSessionId, {
        ...(output.reasoning ? { reasoning: output.reasoning } : {}),
        ...(messageParts?.length ? { displayParts: messageParts } : {}),
        backgroundDebugHistoryId: backgroundCallId,
        ...(memoryUpdates.length > 0 ? { memoryUpdates } : {}),
        ...(reminderUpdates.length > 0 ? { reminderUpdates } : {}),
        ...(request.includeDebugInPersistedMessage
          ? {
            debugSections: [{
              label: getBackgroundDebugLabel(request.trigger.type),
              exchange: debug
            }]
          }
          : {})
      });
    }

    const sideEffects = buildAppliedSideEffects(output, appliedReminders, removedReminders, shouldRecordDecisionSummary);
    const decisionSummary = buildDecisionSummary(output, decision.action, sideEffects, surfacedMessage);

    decision.decisionSummary = decisionSummary;
    if (output.outcome === 'silent' && sideEffects.length > 0) {
      decision.silentSideEffects = sideEffects;
    }

    if (assistantConfig.longTermMemoryEnabled) {
      updatedMemory = assistantMemoryService.appendDecisionSummary(decisionSummary);
    }

    upsertBackgroundCallHistory({
      id: backgroundCallId,
      ...(request.trigger.id ? { triggerId: request.trigger.id } : {}),
      triggerType: request.trigger.type,
      triggerText: request.trigger.text,
      ...(request.targetSessionId ? { targetSessionId: request.targetSessionId } : {}),
      requestedAt: debug.requestedAt,
      completedAt: debug.completedAt,
      status: 'completed',
      action: decision.action,
      memoryAction: decision.memoryAction,
      reminderCount: appliedReminders.length,
      ...(surfacedMessage ? { message: surfacedMessage } : {}),
      decisionSummary,
      ...(surfacedMessageLocation ? { persistedMessageId: surfacedMessageLocation.messageId } : {}),
      ...(output.silentReason ? { silentReason: output.silentReason } : {}),
      ...(sideEffects.length > 0 ? { sideEffects } : {}),
      debugExchange: debug
    });

    if (request.showSystemNotification && surfacedMessage && surfacedMessageLocation) {
      const persistedSessions = loadPersistedSessions();
      const personaNameMap = loadPersistedPersonaNameMap();
      const targetSession = persistedSessions.find((session) => session.id === surfacedMessageLocation.sessionId);
      const notificationTitle = (
        targetSession?.personaId
          ? personaNameMap.get(targetSession.personaId)
          : undefined
      ) || 'AI 助理';

      void AssistantAgent.showAssistantNotification({
        title: notificationTitle,
        body: surfacedMessage,
        targetSessionId: surfacedMessageLocation.sessionId,
        targetMessageId: surfacedMessageLocation.messageId
      }).catch((error) => {
        console.error('[assistantOrchestratorService] Failed to show assistant notification', error);
      });
    }

    return {
      decision,
      updatedMemory,
      ...(appliedReminders.length > 0 ? { appliedReminders } : {}),
      ...(surfacedMessage ? { surfacedMessage } : {}),
      debug
    };
  }
};
