/**
 * @file assistantOrchestratorService.ts
 * @input Assistant system triggers, local todo/log/session summaries, AI service access, and assistant memory
 * @output Background assistant turn decisions plus applied reminder or memory side effects
 * @pos Service (Assistant Orchestrator)
 * @description Orchestrates Android-first assistant system turns by loading structured memory, assembling a prompt, calling the existing AI service, and applying the resulting silent/message/reminder/memory actions back into local state.
 *
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
  type AssistantOrchestratorResult,
  type AssistantReminder,
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
import { normalizeAssistantDateTime } from '../utils/assistantTime';
import AssistantAgent from '../plugins/AssistantAgentPlugin';

interface AssistantSystemTurnRequest {
  trigger: AssistantSystemTrigger;
  targetSessionId?: string;
  showSystemNotification?: boolean;
  currentDateTime: string;
  currentDateTimeLocal?: string;
  currentDateTimeUtc?: string;
  defaultDate: string;
  todayTimelineSummary: string;
  activeSessionSummary?: string;
  todoSummary?: string;
  todayScheduledTodoSummary?: string;
  pinnedTodoSummary?: string;
  reminderSummary?: string;
  recentLogsDigest?: string;
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
  triggerType: string;
  triggerText: string;
  targetSessionId?: string;
  requestedAt: string;
  completedAt: string;
  status: 'completed' | 'failed';
  action: AssistantSystemTurnDecision['action'];
  memoryAction: AssistantSystemTurnDecision['memoryAction'];
  reminderCount: number;
  message?: string;
  errorMessage?: string;
}

interface PersistedAIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  tone?: 'normal' | 'system' | 'error' | 'pending';
  debugSections?: Array<{
    label: string;
    exchange: AIDebugExchange;
  }>;
}

interface PersistedAIChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  personaId: string;
  contextCacheEnabled: boolean;
  messages: PersistedAIChatMessage[];
}

interface PersistedAIChatPersonaSummary {
  id: string;
  name: string;
}

interface PersistedAssistantMessageLocation {
  sessionId: string;
  messageId: string;
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
  const status = candidate.status === 'failed' ? 'failed' : 'completed';
  const action = candidate.action === 'send_message' ? 'send_message' : 'silent';
  const memoryAction = candidate.memoryAction === 'update_memory' ? 'update_memory' : 'no_update';

  if (!id || !triggerType || !requestedAt || !completedAt) {
    return null;
  }

  return {
    id,
    triggerType,
    triggerText,
    requestedAt,
    completedAt,
    status,
    action,
    memoryAction,
    reminderCount: Number.isFinite(candidate.reminderCount) ? Math.max(0, Number(candidate.reminderCount)) : 0,
    ...(typeof candidate.targetSessionId === 'string' && candidate.targetSessionId.trim() ? { targetSessionId: candidate.targetSessionId.trim() } : {}),
    ...(typeof candidate.message === 'string' && candidate.message.trim() ? { message: candidate.message.trim() } : {}),
    ...(typeof candidate.errorMessage === 'string' && candidate.errorMessage.trim() ? { errorMessage: candidate.errorMessage.trim() } : {})
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
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ASSISTANT_DECISION_EVENT));
  }
};

const appendBackgroundCallHistory = (entry: AssistantBackgroundCallHistoryEntry) => {
  saveBackgroundCallHistory([entry, ...loadBackgroundCallHistory()]);
};

const getBackgroundDebugLabel = (triggerType: AssistantSystemTrigger['type']): string => {
  switch (triggerType) {
    case 'reminder_due':
      return '后台 Reminder 调试';
    case 'checkin':
      return '后台 Check-in 调试';
    case 'long_idle':
      return '后台 Long Idle 调试';
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

const persistAssistantMessage = (
  message: string,
  targetSessionId?: string,
  options?: {
    debugSections?: Array<{
      label: string;
      exchange: AIDebugExchange;
    }>;
  }
) : PersistedAssistantMessageLocation | null => {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  const persistedSessions = loadPersistedSessions();
  const sessions = persistedSessions.length > 0
    ? persistedSessions
    : [createFallbackPersistedSession()];

  const sortedSessions = [...sessions].sort((left, right) => right.updatedAt - left.updatedAt);
  const resolvedTargetSessionId = (
    targetSessionId
    && sessions.some((session) => session.id === targetSessionId)
  )
    ? targetSessionId
    : sortedSessions[0].id;
  const now = Date.now();
  const nextMessage: PersistedAIChatMessage = {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: trimmed,
    createdAt: now,
    tone: 'system',
    ...(options?.debugSections?.length ? { debugSections: options.debugSections } : {})
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

  listBackgroundCallHistory(): AssistantBackgroundCallHistoryEntry[] {
    return loadBackgroundCallHistory();
  },

  clearBackgroundCallHistory(): void {
    localStorage.removeItem(ASSISTANT_BACKGROUND_CALL_HISTORY_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(ASSISTANT_DECISION_EVENT));
    }
  },

  async runSystemTurn(request: AssistantSystemTurnRequest): Promise<AssistantSystemTurnExecution> {
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

    let output: AssistantUnifiedTurnOutput;
    let debug: AIDebugExchange;
    try {
      const turnResult = await assistantTurnService.runUnifiedTurn({
        mode: 'background',
        trigger,
        promptLayers: {
          basePrompt,
          modePrompt: backgroundModePrompt,
          ...(request.userPersonaPrompt ? { userPersonaPrompt: request.userPersonaPrompt } : {})
        },
        memory,
        conversation: assistantContextBuilder.buildConversationContext(
          (request.conversationHistory || []).map((turn) => ({
            role: turn.role,
            content: turn.content
          }))
        ),
        stateContext: {
          currentDateTime: request.currentDateTime,
          ...(request.currentDateTimeLocal ? { currentDateTimeLocal: request.currentDateTimeLocal } : {}),
          ...(request.currentDateTimeUtc ? { currentDateTimeUtc: request.currentDateTimeUtc } : {}),
          defaultDate: request.defaultDate,
          todayTimelineSummary: request.todayTimelineSummary,
          ...(request.activeSessionSummary ? { activeSessionSummary: request.activeSessionSummary } : {}),
          ...(request.todoSummary ? { todoSummary: request.todoSummary } : {}),
          ...(request.todayScheduledTodoSummary ? { todayScheduledTodoSummary: request.todayScheduledTodoSummary } : {}),
          ...(request.pinnedTodoSummary ? { pinnedTodoSummary: request.pinnedTodoSummary } : {}),
          ...(request.reminderSummary ? { reminderSummary: request.reminderSummary } : {})
        },
        dictionaryContext: request.dictionaryContext || {},
        ...(request.recentLogsDigest ? { recentLogsDigest: request.recentLogsDigest } : {})
      });
      output = turnResult.output;
      debug = turnResult.debug;
    } catch (error) {
      appendBackgroundCallHistory({
        id: crypto.randomUUID(),
        triggerType: request.trigger.type,
        triggerText: request.trigger.text,
        ...(request.targetSessionId ? { targetSessionId: request.targetSessionId } : {}),
        requestedAt: new Date().toISOString(),
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
    const decision: AssistantSystemTurnDecision = {
      action: output.outcome === 'reply' && output.assistantReply ? 'send_message' : 'silent',
      memoryAction: output.memoryAction,
      ...(output.assistantReply ? { message: output.assistantReply } : {}),
      ...(reminders.length > 0 ? { reminders } : {}),
      ...(output.memoryAction === 'update_memory' && output.memoryPatch ? { memoryPatch: output.memoryPatch } : {})
    };
    const appliedReminders: AssistantReminder[] = [];

    if (assistantConfig.longTermMemoryEnabled && output.memoryAction === 'update_memory' && output.memoryPatch) {
      updatedMemory = assistantMemoryService.applyPatch(output.memoryPatch);
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

    if (assistantConfig.longTermMemoryEnabled && appliedReminders.length > 0) {
      updatedMemory = assistantMemoryService.replaceActiveReminders(
        assistantReminderQueueService.listReminders().filter((reminder) => reminder.status === 'pending')
      );
    }

    let surfacedMessage: string | undefined;
    let surfacedMessageLocation: PersistedAssistantMessageLocation | null = null;
    if (output.outcome === 'reply' && output.assistantReply) {
      surfacedMessage = output.assistantReply;
      surfacedMessageLocation = persistAssistantMessage(surfacedMessage, request.targetSessionId, {
        ...(request.includeDebugInPersistedMessage
          ? {
            debugSections: [{
              label: getBackgroundDebugLabel(request.trigger.type),
              exchange: debug
            }]
          }
          : {})
      });
      if (assistantConfig.longTermMemoryEnabled) {
        updatedMemory = assistantMemoryService.appendDecisionSummary(`system_turn:${request.trigger.type}:${surfacedMessage}`);
      }
    } else if (output.outcome === 'silent') {
      if (assistantConfig.longTermMemoryEnabled) {
        updatedMemory = assistantMemoryService.appendDecisionSummary(`system_turn:${request.trigger.type}:silent`);
      }
    }

    appendBackgroundCallHistory({
      id: crypto.randomUUID(),
      triggerType: request.trigger.type,
      triggerText: request.trigger.text,
      ...(request.targetSessionId ? { targetSessionId: request.targetSessionId } : {}),
      requestedAt: debug.requestedAt,
      completedAt: debug.completedAt,
      status: 'completed',
      action: decision.action,
      memoryAction: decision.memoryAction,
      reminderCount: appliedReminders.length,
      ...(surfacedMessage ? { message: surfacedMessage } : {})
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
