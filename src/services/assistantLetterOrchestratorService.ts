/**
 * @file assistantLetterOrchestratorService.ts
 * @input Assistant-letter due triggers, background context snapshots, and current assistant memory/config state
 * @output Generated assistant-letter records, optional surfaced chat summary messages, and post-send scheduling/memory updates
 * @pos Service (Assistant Letter Orchestrator)
 * @description Runs the dedicated AI-letter generation flow on top of the shared background assistant context, validates the structured letter payload, persists standalone letter history, surfaces a lightweight chat result entry, and advances the next scheduled send time after success.
 *
 * @updated 2026-07-05: Added the first standalone assistant-letter orchestrator for scheduled AI letters with dedicated prompt mode, storage persistence, and post-send schedule updates.
 */

import AssistantAgent from '../plugins/AssistantAgentPlugin';
import type { AIConversationTurn, AIDebugExchange } from './aiService';
import { aiService } from './aiService';
import { assistantAgentConfigService } from './assistantAgentConfigService';
import { assistantContextBuilder } from './assistantContextBuilder';
import { assistantLetterScheduler } from './assistantLetterScheduler';
import { assistantLetterService } from './assistantLetterService';
import { assistantMemoryService } from './assistantMemoryService';
import {
  assistantOrchestratorService,
  type AssistantBackgroundCallHistoryEntry
} from './assistantOrchestratorService';
import { assistantPromptService } from './assistantPromptService';
import { resolveLatestOrdinaryAssistantBackgroundSession } from '../utils/assistantBackgroundSessionUtils';
import { normalizeAssistantDateTime } from '../utils/assistantTime';
import type {
  AssistantAgentConfig,
  AssistantLetter,
  AssistantLetterDraft,
  AssistantLetterResultCard,
  AssistantMemory,
  AssistantMemoryPatch,
  AssistantSystemTrigger,
  AssistantTurnDictionaryContext
} from '../types/assistant';

interface AssistantLetterRunRequest {
  trigger: AssistantSystemTrigger;
  targetSessionId?: string;
  personaId?: string;
  personaName?: string;
  showSystemNotification?: boolean;
  persistChatMessage?: boolean;
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
}

interface AssistantLetterModelResult {
  letter: AssistantLetterDraft;
  memoryAction: 'no_update' | 'update_memory';
  memoryPatch?: AssistantMemoryPatch;
  decisionSummary?: string;
}

interface PersistedAIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  tone?: 'normal' | 'system' | 'error' | 'pending';
  assistantLetterResult?: AssistantLetterResultCard;
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
  templateMeta?: {
    templateType?: string;
  };
}

interface AssistantLetterRunResult {
  letter: AssistantLetter;
  resultCard: AssistantLetterResultCard;
  updatedMemory: AssistantMemory;
  debug: AIDebugExchange;
  surfacedMessage?: string;
}

interface PersistedAssistantMessageLocation {
  sessionId: string;
  messageId: string;
}

const CHAT_SESSIONS_KEY = 'lumostime_ai_chat_sessions_v1';
const ASSISTANT_DECISION_EVENT = 'lumostime:assistant-chat-updated';
const DEFAULT_PERSONA_ID = 'builtin-default';

const STRICT_JSON_OUTPUT_RULES = [
  '=== Structured Output Contract ===',
  'You must return exactly one strict JSON object.',
  'Do not return any text before or after the JSON object.',
  'Do not use Markdown, code fences, comments, headings, or natural-language explanation.',
  'Your entire response must be valid JSON parsable by JSON.parse with no cleanup step.'
].join('\n');

const createEphemeralMemory = (): AssistantMemory => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  profileMemory: [],
  preferenceMemory: [],
  activeReminders: [],
  recentDecisions: []
});

const createFallbackPersistedSession = (personaId?: string): PersistedAIChatSession => {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: '新对话',
    createdAt: now,
    updatedAt: now,
    personaId: personaId || DEFAULT_PERSONA_ID,
    contextCacheEnabled: true,
    messages: []
  };
};

const safeParseJson = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error('[assistantLetterOrchestratorService] Failed to parse JSON', error);
    return fallback;
  }
};

const normalizeStringList = (value: unknown): string[] => (
  Array.isArray(value)
    ? value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
    : []
);

const normalizeMemoryPatch = (value: unknown): AssistantMemoryPatch | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const patch: AssistantMemoryPatch = {};

  const profileMemory = normalizeStringList(candidate.profileMemory);
  if (profileMemory.length > 0) {
    patch.profileMemory = profileMemory;
  }

  const preferenceMemory = normalizeStringList(candidate.preferenceMemory);
  if (preferenceMemory.length > 0) {
    patch.preferenceMemory = preferenceMemory;
  }

  if (typeof candidate.lastKnownState === 'string') {
    patch.lastKnownState = candidate.lastKnownState.trim() || null;
  } else if (candidate.lastKnownState === null) {
    patch.lastKnownState = null;
  }

  if (typeof candidate.workingMemorySummary === 'string') {
    patch.workingMemorySummary = candidate.workingMemorySummary.trim() || null;
  } else if (candidate.workingMemorySummary === null) {
    patch.workingMemorySummary = null;
  }

  const recentDecisions = normalizeStringList(candidate.recentDecisions);
  if (recentDecisions.length > 0) {
    patch.recentDecisions = recentDecisions;
  }

  if (typeof candidate.lastAgentRunAt === 'string') {
    const normalized = normalizeAssistantDateTime(candidate.lastAgentRunAt);
    if (normalized) {
      patch.lastAgentRunAt = normalized;
    }
  } else if (candidate.lastAgentRunAt === null) {
    patch.lastAgentRunAt = null;
  }

  return Object.keys(patch).length > 0 ? patch : undefined;
};

const normalizeLetterDraft = (value: unknown): AssistantLetterDraft | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Partial<AssistantLetterDraft>;
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
  const preview = typeof candidate.preview === 'string' ? candidate.preview.trim() : '';
  const content = typeof candidate.content === 'string' ? candidate.content.trim() : '';
  if (!title || !preview || !content) {
    return null;
  }

  return { title, preview, content };
};

const buildSystemPrompt = async (
  request: AssistantLetterRunRequest,
  memory: AssistantMemory,
  memoryEnabled: boolean
): Promise<string> => {
  const [basePrompt, letterModePrompt, memoryRulesPrompt] = await Promise.all([
    assistantPromptService.getAssistantBasePrompt(),
    assistantPromptService.getAssistantLetterModePrompt(),
    memoryEnabled ? assistantPromptService.getMemoryRulesPrompt() : Promise.resolve('')
  ]);

  const outputSchema = memoryEnabled
    ? {
      title: 'string',
      preview: 'string',
      content: 'string',
      memoryAction: 'no_update | update_memory',
      memoryPatch: {},
      decisionSummary: 'string'
    }
    : {
      title: 'string',
      preview: 'string',
      content: 'string',
      memoryAction: 'no_update',
      decisionSummary: 'string'
    };

  return [
    ...(request.userPersonaPrompt ? ['=== User Persona Prompt ===', request.userPersonaPrompt, ''] : []),
    '=== Assistant Base Prompt ===',
    basePrompt,
    '',
    '=== AI Letter Mode Prompt ===',
    letterModePrompt,
    '',
    STRICT_JSON_OUTPUT_RULES,
    '=== Unified Letter Output Schema ===',
    JSON.stringify(outputSchema, null, 2),
    '',
    '=== Dictionary Context ===',
    assistantContextBuilder.buildDictionaryDigest(request.dictionaryContext || {}),
    '',
    '=== State Context ===',
    JSON.stringify({
      currentDateTime: request.currentDateTime,
      stateContextDate: request.defaultDate,
      todayTimelineSummary: request.todayTimelineSummary,
      ...(request.yesterdayTimelineSummary ? { yesterdayTimelineSummary: request.yesterdayTimelineSummary } : {}),
      ...(request.timelineReviewSummary ? { timelineReviewSummary: request.timelineReviewSummary } : {}),
      ...(request.activeSessionSummary ? { activeSessionSummary: request.activeSessionSummary } : {}),
      ...(request.todayScheduledTodoSummary ? { todayScheduledTodoSummary: request.todayScheduledTodoSummary } : {}),
      ...(request.pinnedTodoSummary ? { pinnedTodoSummary: request.pinnedTodoSummary } : {}),
      ...(request.overdueTodoSummary ? { overdueTodoSummary: request.overdueTodoSummary } : {}),
      ...(request.reminderSummary ? { reminderSummary: request.reminderSummary } : {})
    }, null, 2),
    ...(memoryEnabled ? ['', '=== Memory Update Rules ===', memoryRulesPrompt, '', '=== Memory Snapshot ===', JSON.stringify(memory, null, 2)] : [])
  ].filter(Boolean).join('\n');
};

const buildUserPrompt = (request: AssistantLetterRunRequest): string => (
  [
    '=== Conversation Context ===',
    JSON.stringify(
      assistantContextBuilder.buildConversationContext(
        (request.conversationHistory || []).map((turn) => ({
          role: turn.role,
          content: turn.content,
          ...(typeof turn.createdAt === 'string' && turn.createdAt.trim()
            ? { createdAt: turn.createdAt.trim() }
            : {})
        }))
      ),
      null,
      2
    ),
    '',
    '=== Trigger ===',
    JSON.stringify(request.trigger, null, 2),
    '',
    '只返回一个 JSON object。'
  ].join('\n')
);

const loadPersistedSessions = (): PersistedAIChatSession[] => (
  safeParseJson<PersistedAIChatSession[]>(localStorage.getItem(CHAT_SESSIONS_KEY), [])
);

const persistLetterChatEntry = (
  letter: AssistantLetter,
  targetSessionId?: string,
  personaId?: string,
  debug?: AIDebugExchange
): PersistedAssistantMessageLocation | null => {
  const existingSessions = loadPersistedSessions();
  const sessions = existingSessions.length > 0
    ? existingSessions
    : [createFallbackPersistedSession(personaId)];
  const resolvedTargetSessionId = (
    targetSessionId
    && sessions.some((session) => session.id === targetSessionId)
  )
    ? targetSessionId
    : resolveLatestOrdinaryAssistantBackgroundSession(sessions)?.id || sessions[0]?.id;

  if (!resolvedTargetSessionId) {
    return null;
  }

  const resultCard: AssistantLetterResultCard = {
    letterId: letter.id,
    title: letter.title,
    preview: letter.preview,
    personaName: letter.personaName,
    sentAt: letter.sentAt
  };
  const now = Date.now();
  const nextMessage: PersistedAIChatMessage = {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: '收到了一封来信。',
    createdAt: now,
    tone: 'system',
    assistantLetterResult: resultCard,
    ...(debug
      ? {
        debugSections: [{
          label: 'AI 来信调试',
          exchange: debug
        }]
      }
      : {})
  };

  const nextSessions = sessions.map((session) => (
    session.id === resolvedTargetSessionId
      ? {
        ...session,
        updatedAt: now,
        messages: [...session.messages, nextMessage]
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

export const assistantLetterOrchestratorService = {
  async runDueLetter(request: AssistantLetterRunRequest): Promise<AssistantLetterRunResult> {
    const assistantConfig = assistantAgentConfigService.getConfig();
    const memoryEnabled = assistantConfig.longTermMemoryEnabled;
    const memory = memoryEnabled
      ? assistantMemoryService.getMemory()
      : createEphemeralMemory();
    const systemPrompt = await buildSystemPrompt(request, memory, memoryEnabled);
    const userPrompt = buildUserPrompt(request);
    const backgroundCallId = crypto.randomUUID();
    const pendingRequestedAt = new Date().toISOString();

    assistantOrchestratorService.upsertBackgroundCallHistoryEntry({
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

    let result: AssistantLetterModelResult;
    let debug: AIDebugExchange;
    try {
      const response = await aiService.requestStructuredJsonWithDebug<AssistantLetterModelResult>({
        systemPrompt,
        userPrompt,
        conversationHistory: request.conversationHistory,
        cacheHint: {
          keySeed: [
            'assistant_letter',
            request.trigger.type,
            request.personaId || '',
            request.defaultDate
          ].filter(Boolean).join(':'),
          scope: 'assistant_letter'
        },
        normalizeResult: (rawValue) => {
          const letter = normalizeLetterDraft(rawValue);
          if (!letter) {
            throw new Error('AI letter payload is invalid.');
          }

          const memoryAction = rawValue?.memoryAction === 'update_memory'
            ? 'update_memory'
            : 'no_update';
          const memoryPatch = normalizeMemoryPatch(rawValue?.memoryPatch);
          const decisionSummary = typeof rawValue?.decisionSummary === 'string'
            ? rawValue.decisionSummary.trim()
            : undefined;

          return {
            letter,
            memoryAction,
            ...(memoryPatch ? { memoryPatch } : {}),
            ...(decisionSummary ? { decisionSummary } : {})
          };
        }
      });
      result = response.result;
      debug = response.debug;
    } catch (error) {
      assistantOrchestratorService.upsertBackgroundCallHistoryEntry({
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

    const sentAt = normalizeAssistantDateTime(new Date().toISOString()) || new Date().toISOString();
    const letter: AssistantLetter = {
      id: crypto.randomUUID(),
      title: result.letter.title,
      preview: result.letter.preview,
      content: result.letter.content,
      personaId: request.personaId?.trim() || DEFAULT_PERSONA_ID,
      personaName: request.personaName?.trim() || 'AI',
      scheduledFor: request.trigger.metadata?.scheduledFor && typeof request.trigger.metadata.scheduledFor === 'string'
        ? request.trigger.metadata.scheduledFor
        : assistantConfig.nextLetterAt || sentAt,
      sentAt,
      createdAt: sentAt,
      ...(request.trigger.id ? { sourceTriggerId: request.trigger.id } : {}),
      status: 'sent'
    };
    const resultCard: AssistantLetterResultCard = {
      letterId: letter.id,
      title: letter.title,
      preview: letter.preview,
      personaName: letter.personaName,
      sentAt: letter.sentAt
    };

    assistantLetterService.saveLetter(letter);

    let updatedMemory = memory;
    if (memoryEnabled && result.memoryAction === 'update_memory' && result.memoryPatch) {
      updatedMemory = assistantMemoryService.applyPatch(result.memoryPatch);
    }

    const decisionSummary = result.decisionSummary || `已生成来信《${letter.title}》`;
    if (memoryEnabled && decisionSummary) {
      updatedMemory = assistantMemoryService.appendDecisionSummary(decisionSummary);
    }

    const schedulePatch = assistantLetterScheduler.buildSuccessPatch(assistantConfig, { sentAt });
    if (schedulePatch) {
      assistantAgentConfigService.saveConfig(schedulePatch as Partial<AssistantAgentConfig>);
    }

    const persistedLocation = request.persistChatMessage === false
      ? null
      : persistLetterChatEntry(letter, request.targetSessionId, request.personaId, debug);

    const historyEntry: AssistantBackgroundCallHistoryEntry = {
      id: backgroundCallId,
      ...(request.trigger.id ? { triggerId: request.trigger.id } : {}),
      triggerType: request.trigger.type,
      triggerText: request.trigger.text,
      ...(request.targetSessionId ? { targetSessionId: request.targetSessionId } : {}),
      requestedAt: debug.requestedAt,
      completedAt: debug.completedAt,
      status: 'completed',
      action: 'send_message',
      memoryAction: result.memoryAction,
      reminderCount: 0,
      message: '收到了一封来信。',
      decisionSummary: result.decisionSummary || `已生成来信《${letter.title}》`,
      ...(persistedLocation ? { persistedMessageId: persistedLocation.messageId } : {}),
      debugExchange: debug
    };
    assistantOrchestratorService.upsertBackgroundCallHistoryEntry(historyEntry);

    if (request.showSystemNotification && persistedLocation) {
      void AssistantAgent.showAssistantNotification({
        title: letter.personaName || 'AI 来信',
        body: letter.preview,
        targetSessionId: persistedLocation.sessionId,
        targetMessageId: persistedLocation.messageId
      }).catch((error) => {
        console.error('[assistantLetterOrchestratorService] Failed to show assistant-letter notification', error);
      });
    }

    return {
      letter,
      resultCard,
      updatedMemory,
      debug,
      surfacedMessage: '收到了一封来信。'
    };
  }
};
