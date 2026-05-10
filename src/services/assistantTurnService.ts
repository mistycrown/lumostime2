/**
 * @file assistantTurnService.ts
 * @input Unified assistant-turn input including prompt layers, memory, conversation, state context, and dictionary context
 * @output Structured unified assistant-turn result plus request/response debug exchange
 * @pos Service (Assistant Unified Turn)
 * @description Builds the single-turn prompt payload for the converged assistant architecture and forwards it through aiService so foreground and background flows can gradually migrate off the older multi-prompt planner stack.
 *
 * @updated 2026-05-10: Reordered unified assistant prompt assembly so long-lived dictionary/state sections sit ahead of volatile anchors, improving provider-side prompt-cache reuse across repeated turns.
 * @updated 2026-05-10: Added request-option passthrough so foreground chat can propagate AbortSignal all the way into the unified AI transport and actually stop in-flight turns.
 * @updated 2026-05-06: Tightened the foreground unified-turn schema so front-chat turns no longer advertise unsupported `silent` outcomes.
 * @updated 2026-05-06: Stopped forwarding provider-native `conversationHistory` for unified turns so session context is injected only once through the structured conversation block.
 * @updated 2026-05-06: Added mode-specific output schemas so background turns no longer advertise foreground-only `clarify` or `toolCalls`, and removed the stale recent-log block from unified prompt assembly.
 * @updated 2026-04-27: Re-serialized assistant-facing memory and trigger timestamps into local-offset ISO strings so prompt debug views no longer surface backend UTC `Z` forms.
 * @updated 2026-04-27: Added structured silent-reason, decision-summary, side-effect, and multi-bubble reply-part guidance to the unified output prompt schema.
 * @updated 2026-04-27: Made long-term-memory prompt sections optional so turns can skip memory rules and snapshots entirely when the feature is disabled.
 * @updated 2026-05-05: Added a hard structured-output guardrail so unified assistant turns must return one strict JSON object with no prose, code fences, or extra wrapper text.
 * @updated 2026-04-26: Switched dictionary prompt serialization from pretty JSON to compact table-style text to reduce token overhead while preserving candidate ids.
 * @updated 2026-04-26: Broke recent compressed log history into its own prompt section so debug viewers can inspect it separately from candidate dictionaries.
 * @updated 2026-04-26: Added the first unified assistant-turn service with layered prompt assembly, shared context serialization, and a single structured aiService gateway call.
 */

import type { AIDebugExchange, AIRequestOptions } from './aiService';
import { aiService } from './aiService';
import { assistantContextBuilder } from './assistantContextBuilder';
import { assistantPromptService } from './assistantPromptService';
import { formatAssistantDateTimeForDisplay } from '../utils/assistantTime';
import type {
  AssistantMemory,
  AssistantReminder,
  AssistantTurnTrigger,
  AssistantUnifiedTurnInput,
  AssistantUnifiedTurnOutput
} from '../types/assistant';

export interface AssistantUnifiedTurnResult {
  output: AssistantUnifiedTurnOutput;
  debug: AIDebugExchange;
}

const stringifyJson = (value: unknown): string => JSON.stringify(value, null, 2);

const STABLE_STATE_CONTEXT_KEYS = [
  'todayTimelineSummary',
  'yesterdayTimelineSummary',
  'timelineReviewSummary',
  'todayScheduledTodoSummary',
  'pinnedTodoSummary',
  'overdueTodoSummary'
] as const;

const VOLATILE_STATE_CONTEXT_KEYS = [
  'currentDateTime',
  'defaultDate',
  'activeSessionSummary',
  'reminderSummary'
] as const;

const MEMORY_DISABLED_RULE = '- Long-term memory is disabled for this turn. Set memoryAction to "no_update" and omit memoryPatch.';
const STRICT_JSON_OUTPUT_RULES = [
  '=== Structured Output Contract ===',
  'You must return exactly one strict JSON object.',
  'Do not return any text before or after the JSON object.',
  'Do not use Markdown, code fences, comments, headings, or natural-language explanation.',
  'Do not wrap the JSON in ```json fences.',
  'Do not output placeholder prose such as "Here is the JSON", "There was", or any apology/explanation text.',
  'Every returned field must follow the provided schema exactly. If some field is not needed, omit it instead of explaining it in prose.',
  'Your entire response must be valid JSON parsable by JSON.parse with no cleanup step.'
].join('\n');

const formatPromptDateTime = (value?: string | null): string | undefined => {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  const formatted = formatAssistantDateTimeForDisplay(value);
  return formatted || value.trim();
};

const buildPromptReminder = (reminder: AssistantReminder): AssistantReminder => ({
  ...reminder,
  dueAt: formatPromptDateTime(reminder.dueAt) || reminder.dueAt,
  createdAt: formatPromptDateTime(reminder.createdAt) || reminder.createdAt,
  ...(reminder.lastDispatchAttemptAt
    ? { lastDispatchAttemptAt: formatPromptDateTime(reminder.lastDispatchAttemptAt) || reminder.lastDispatchAttemptAt }
    : {}),
  ...(reminder.lastDispatchedAt
    ? { lastDispatchedAt: formatPromptDateTime(reminder.lastDispatchedAt) || reminder.lastDispatchedAt }
    : {})
});

const buildPromptMemorySnapshot = (memory: AssistantMemory): AssistantMemory => ({
  ...memory,
  updatedAt: formatPromptDateTime(memory.updatedAt) || memory.updatedAt,
  activeReminders: memory.activeReminders.map(buildPromptReminder),
  ...(memory.lastAgentRunAt
    ? { lastAgentRunAt: formatPromptDateTime(memory.lastAgentRunAt) || memory.lastAgentRunAt }
    : {})
});

const buildPromptTrigger = (trigger: AssistantTurnTrigger): AssistantTurnTrigger => ({
  ...trigger,
  createdAt: formatPromptDateTime(trigger.createdAt) || trigger.createdAt,
  ...(trigger.metadata
    ? {
      metadata: Object.fromEntries(
        Object.entries(trigger.metadata).map(([key, value]) => {
          if (
            typeof value === 'string'
            && /(DateTime|DueAt|DispatchAt|createdAt)$/i.test(key)
          ) {
            return [key, formatPromptDateTime(value) || value];
          }
          return [key, value];
        })
      )
    }
    : {})
});

const buildToolSchemaPrompt = async (input: AssistantUnifiedTurnInput): Promise<string> => {
  const memoryEnabled = input.memoryEnabled !== false;

  if (input.mode === 'background') {
    return [
      'Allowed output behavior:',
      '- outcome may be "reply" or "silent".',
      '- Do not emit toolCalls in background mode.',
      '- reminders may be returned when a future follow-up is appropriate.',
      '- If outcome is "silent", provide decisionSummary whenever possible.',
      '- If outcome is "silent", silentReason should be one of: active_focus_protection, likely_do_not_disturb, state_still_clear, insufficient_confidence, waiting_for_stronger_signal, followup_already_scheduled.',
      '- If outcome is "silent", silentSideEffects may list any state, memory, or reminder updates in short Chinese phrases.',
      '- If you send a message, you may optionally provide assistantReplyParts as 2 to 4 short Chinese message bubbles.',
      '- If a visible message would otherwise become a medium or long paragraph, strongly prefer assistantReplyParts over one dense block.',
      '- memoryAction must always be "no_update" or "update_memory".',
      '- Only include memoryPatch when memoryAction is "update_memory".',
      ...(memoryEnabled ? [] : [MEMORY_DISABLED_RULE])
    ].join('\n');
  }

  const foregroundToolsPrompt = await assistantPromptService.getForegroundToolsPrompt();
  return memoryEnabled
    ? foregroundToolsPrompt
    : [foregroundToolsPrompt, MEMORY_DISABLED_RULE].join('\n');
};

const pickPromptSection = <
  TSource extends Record<string, unknown>,
  TKey extends keyof TSource
>(
  source: TSource,
  keys: readonly TKey[]
): Partial<Pick<TSource, TKey>> => (
  Object.fromEntries(
    keys.flatMap((key) => (
      source[key] === undefined
        ? []
        : [[key, source[key]] as const]
    ))
  ) as Partial<Pick<TSource, TKey>>
);

const buildPromptCacheKeySeed = (systemPrompt: string, userPrompt: string, mode: AssistantUnifiedTurnInput['mode']): string => {
  const stableSystemPrefix = systemPrompt.split('\n=== Volatile State Anchors ===\n')[0]?.trim() || systemPrompt.trim();
  const stableUserPrefix = userPrompt.split('\n=== Trigger ===\n')[0]?.trim() || userPrompt.trim();

  return [
    `mode:${mode}`,
    stableSystemPrefix,
    stableUserPrefix
  ].filter(Boolean).join('\n\n');
};

const buildSystemPrompt = async (input: AssistantUnifiedTurnInput): Promise<string> => {
  const memoryEnabled = input.memoryEnabled !== false;
  const [toolSchemaPrompt, memoryRulesPrompt] = await Promise.all([
    buildToolSchemaPrompt(input),
    memoryEnabled ? assistantPromptService.getMemoryRulesPrompt() : Promise.resolve(undefined)
  ]);
  const dictionaryDigest = assistantContextBuilder.buildDictionaryDigest(input.dictionaryContext);
  const stableStateContext = pickPromptSection(input.stateContext, STABLE_STATE_CONTEXT_KEYS);
  const volatileStateContext = pickPromptSection(input.stateContext, VOLATILE_STATE_CONTEXT_KEYS);
  const modePromptLabel = input.mode === 'background' ? 'Background Mode Prompt' : 'Foreground Mode Prompt';
  const toolPromptLabel = input.mode === 'background' ? 'Background Tool Prompt' : 'Foreground Tool Prompt';
  const outputSchema = input.mode === 'background'
    ? (
      memoryEnabled
        ? {
          mode: input.mode,
          outcome: 'reply | silent',
          assistantReply: 'string',
          assistantReplyParts: ['string'],
          reminders: [],
          memoryAction: 'no_update | update_memory',
          memoryPatch: {},
          decisionSummary: 'string',
          silentReason: 'active_focus_protection | likely_do_not_disturb | state_still_clear | insufficient_confidence | waiting_for_stronger_signal | followup_already_scheduled',
          silentSideEffects: ['string']
        }
        : {
          mode: input.mode,
          outcome: 'reply | silent',
          assistantReply: 'string',
          assistantReplyParts: ['string'],
          reminders: [],
          memoryAction: 'no_update',
          decisionSummary: 'string',
          silentReason: 'active_focus_protection | likely_do_not_disturb | state_still_clear | insufficient_confidence | waiting_for_stronger_signal | followup_already_scheduled',
          silentSideEffects: ['string']
        }
    )
    : (
      memoryEnabled
        ? {
          mode: input.mode,
          outcome: 'reply | clarify',
          assistantReply: 'string',
          assistantReplyParts: ['string'],
          toolCalls: [],
          reminders: [],
          memoryAction: 'no_update | update_memory',
          memoryPatch: {}
        }
        : {
          mode: input.mode,
          outcome: 'reply | clarify',
          assistantReply: 'string',
          assistantReplyParts: ['string'],
          toolCalls: [],
          reminders: [],
          memoryAction: 'no_update'
        }
    );
  return [
    '=== Assistant Base Prompt ===',
    input.promptLayers.basePrompt,
    '',
    `=== ${modePromptLabel} ===`,
    input.promptLayers.modePrompt,
    ...(input.promptLayers.userPersonaPrompt ? ['', '=== User Persona Prompt ===', input.promptLayers.userPersonaPrompt] : []),
    '',
    `=== ${toolPromptLabel} ===`,
    toolSchemaPrompt,
    '',
    STRICT_JSON_OUTPUT_RULES,
    '=== Unified Turn Output Schema ===',
    stringifyJson(outputSchema),
    '',
    '=== Dictionary Context ===',
    dictionaryDigest,
    ...(Object.keys(stableStateContext).length > 0
      ? ['', '=== Stable State Context ===', stringifyJson(stableStateContext)]
      : []),
    ...(memoryEnabled && memoryRulesPrompt ? ['', '=== Memory Update Rules ===', memoryRulesPrompt] : []),
    ...(Object.keys(volatileStateContext).length > 0
      ? ['', '=== Volatile State Anchors ===', stringifyJson(volatileStateContext)]
      : []),
    ...(memoryEnabled ? ['', '=== Memory Snapshot ===', stringifyJson(buildPromptMemorySnapshot(input.memory))] : [])
  ].filter(Boolean).join('\n');
};

const buildUserPrompt = (input: AssistantUnifiedTurnInput): string => [
  '=== Conversation Context ===',
  stringifyJson(input.conversation),
  '',
  '=== Trigger ===',
  stringifyJson(buildPromptTrigger(input.trigger)),
  '',
  'Return one JSON object only.'
].join('\n');

export const assistantTurnService = {
  buildSystemPrompt,
  buildUserPrompt,
  async runUnifiedTurn(
    input: AssistantUnifiedTurnInput,
    options: AIRequestOptions = {}
  ): Promise<AssistantUnifiedTurnResult> {
    const systemPrompt = await buildSystemPrompt(input);
    const userPrompt = buildUserPrompt(input);
    const { output, debug } = await aiService.requestAssistantUnifiedTurnWithDebug({
      mode: input.mode,
      systemPrompt,
      userPrompt,
      cacheHint: {
        keySeed: buildPromptCacheKeySeed(systemPrompt, userPrompt, input.mode),
        scope: 'assistant_unified_turn'
      }
    }, options);

    return {
      output,
      debug
    };
  }
};
