/**
 * @file assistantOrchestratorService.ts
 * @input Assistant system triggers, local todo/log/session summaries, AI service access, and assistant memory
 * @output Background assistant turn decisions plus applied reminder or memory side effects
 * @pos Service (Assistant Orchestrator)
 * @description Orchestrates Android-first assistant system turns by loading structured memory, assembling a prompt, calling the existing AI service, and applying the resulting silent/message/reminder/memory actions back into local state.
 *
 * @updated 2026-04-26: Added the first-pass assistant orchestrator for background system turns, including memory updates, reminder queue writes, and persisted AI-chat message surfacing.
 */

import {
  type AssistantMemory,
  type AssistantOrchestratorResult,
  type AssistantReminder,
  type AssistantSystemTrigger,
  type AssistantSystemTurnContext,
  type AssistantSystemTurnDecision
} from '../types/assistant';
import { aiService, type AIDebugExchange, type AIConversationTurn } from './aiService';
import { assistantAgentConfigService } from './assistantAgentConfigService';
import { assistantMemoryService } from './assistantMemoryService';
import { assistantPromptService } from './assistantPromptService';
import { assistantReminderQueueService } from './assistantReminderQueueService';

interface AssistantSystemTurnRequest {
  trigger: AssistantSystemTrigger;
  currentDateTime: string;
  defaultDate: string;
  todayTimelineSummary: string;
  activeSessionSummary?: string;
  todoSummary?: string;
  conversationHistory?: AIConversationTurn[];
}

interface AssistantSystemTurnExecution extends AssistantOrchestratorResult {
  debug: AIDebugExchange;
}

interface PersistedAIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  tone?: 'normal' | 'system' | 'error' | 'pending';
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

const CHAT_SESSIONS_KEY = 'lumostime_ai_chat_sessions_v1';
const ASSISTANT_DECISION_EVENT = 'lumostime:assistant-chat-updated';

const createEphemeralMemory = (): AssistantMemory => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  profileMemory: [],
  preferenceMemory: [],
  openLoops: [],
  activeReminders: [],
  recentDecisions: []
});

const isValidAssistantAction = (value: unknown): value is AssistantSystemTurnDecision['action'] => (
  value === 'silent'
  || value === 'send_message'
  || value === 'create_reminder'
  || value === 'update_memory'
);

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

const normalizeDecision = (value: unknown): AssistantSystemTurnDecision => {
  if (!value || typeof value !== 'object') {
    return { action: 'silent' };
  }

  const candidate = value as Partial<AssistantSystemTurnDecision>;
  const action = isValidAssistantAction(candidate.action) ? candidate.action : 'silent';

  return {
    action,
    ...(typeof candidate.message === 'string' && candidate.message.trim() ? { message: candidate.message.trim() } : {}),
    ...(candidate.reminder && typeof candidate.reminder === 'object'
      ? {
        reminder: {
          dueAt: typeof candidate.reminder.dueAt === 'string' ? candidate.reminder.dueAt.trim() : '',
          text: typeof candidate.reminder.text === 'string' ? candidate.reminder.text.trim() : '',
          ...(typeof candidate.reminder.type === 'string' && candidate.reminder.type.trim()
            ? { type: candidate.reminder.type }
            : {}),
          ...(typeof candidate.reminder.todoId === 'string' && candidate.reminder.todoId.trim()
            ? { todoId: candidate.reminder.todoId.trim() }
            : {})
        }
      }
      : {}),
    ...(candidate.memoryPatch && typeof candidate.memoryPatch === 'object'
      ? { memoryPatch: candidate.memoryPatch }
      : {})
  };
};

const loadPersistedSessions = (): PersistedAIChatSession[] => (
  safeParseJson<PersistedAIChatSession[]>(localStorage.getItem(CHAT_SESSIONS_KEY), [])
);

const persistAssistantMessage = (message: string) => {
  const trimmed = message.trim();
  if (!trimmed) {
    return;
  }

  const sessions = loadPersistedSessions();
  if (!sessions.length) {
    return;
  }

  const sortedSessions = [...sessions].sort((left, right) => right.updatedAt - left.updatedAt);
  const targetSessionId = sortedSessions[0].id;
  const now = Date.now();
  const nextSessions = sessions.map((session) => (
    session.id === targetSessionId
      ? {
        ...session,
        updatedAt: now,
        messages: [
          ...session.messages,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: trimmed,
            createdAt: now,
            tone: 'system'
          }
        ]
      }
      : session
  ));

  localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(nextSessions));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ASSISTANT_DECISION_EVENT));
  }
};

export const assistantOrchestratorService = {
  getAssistantDecisionEventName(): string {
    return ASSISTANT_DECISION_EVENT;
  },

  async runSystemTurn(request: AssistantSystemTurnRequest): Promise<AssistantSystemTurnExecution> {
    const assistantConfig = assistantAgentConfigService.getConfig();
    const memory = assistantConfig.longTermMemoryEnabled
      ? assistantMemoryService.getMemory()
      : createEphemeralMemory();
    const context: AssistantSystemTurnContext = {
      currentDateTime: request.currentDateTime,
      defaultDate: request.defaultDate,
      todayTimelineSummary: request.todayTimelineSummary,
      activeSessionSummary: request.activeSessionSummary,
      todoSummary: request.todoSummary,
      memory,
      trigger: request.trigger
    };

    const systemPrompt = await assistantPromptService.buildSystemTurnPrompt(context);
    const userPrompt = [
      `Trigger Type: ${request.trigger.type}`,
      `Trigger Source: ${request.trigger.source}`,
      `Trigger Time: ${request.trigger.createdAt}`,
      'Trigger Message:',
      request.trigger.text
    ].join('\n');

    const { decision, debug } = await aiService.requestAssistantSystemDecisionWithDebug({
      systemPrompt,
      userPrompt,
      conversationHistory: request.conversationHistory
    });

    let updatedMemory: AssistantMemory = memory;
    let appliedReminder: AssistantReminder | undefined;
    const normalizedDecision = normalizeDecision(decision);

    if (assistantConfig.longTermMemoryEnabled && normalizedDecision.memoryPatch) {
      updatedMemory = assistantMemoryService.applyPatch(normalizedDecision.memoryPatch);
    }

    if (
      assistantConfig.reminderEnabled
      && normalizedDecision.action === 'create_reminder'
      && normalizedDecision.reminder?.dueAt
      && normalizedDecision.reminder.text
    ) {
      appliedReminder = assistantReminderQueueService.enqueueReminder({
        id: crypto.randomUUID(),
        type: normalizedDecision.reminder.type || 'self_followup',
        dueAt: normalizedDecision.reminder.dueAt,
        status: 'pending',
        text: normalizedDecision.reminder.text,
        ...(normalizedDecision.reminder.todoId ? { todoId: normalizedDecision.reminder.todoId } : {}),
        source: 'agent',
        createdAt: new Date().toISOString()
      });
      if (assistantConfig.longTermMemoryEnabled) {
        updatedMemory = assistantMemoryService.replaceActiveReminders(
          assistantReminderQueueService.listReminders().filter((reminder) => reminder.status === 'pending')
        );
      }
    }

    let surfacedMessage: string | undefined;
    if (normalizedDecision.action === 'send_message' && normalizedDecision.message) {
      surfacedMessage = normalizedDecision.message;
      persistAssistantMessage(surfacedMessage);
      if (assistantConfig.longTermMemoryEnabled) {
        updatedMemory = assistantMemoryService.appendDecisionSummary(`system_turn:${request.trigger.type}:${surfacedMessage}`);
      }
    } else if (normalizedDecision.action === 'silent') {
      if (assistantConfig.longTermMemoryEnabled) {
        updatedMemory = assistantMemoryService.appendDecisionSummary(`system_turn:${request.trigger.type}:silent`);
      }
    }

    return {
      decision: normalizedDecision,
      updatedMemory,
      ...(appliedReminder ? { appliedReminder } : {}),
      ...(surfacedMessage ? { surfacedMessage } : {}),
      debug
    };
  }
};
