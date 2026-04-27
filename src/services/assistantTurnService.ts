/**
 * @file assistantTurnService.ts
 * @input Unified assistant-turn input including prompt layers, memory, conversation, state context, and dictionary context
 * @output Structured unified assistant-turn result plus request/response debug exchange
 * @pos Service (Assistant Unified Turn)
 * @description Builds the single-turn prompt payload for the converged assistant architecture and forwards it through aiService so foreground and background flows can gradually migrate off the older multi-prompt planner stack.
 *
 * @updated 2026-04-27: Added structured silent-reason, decision-summary, side-effect, and multi-bubble reply-part guidance to the unified output prompt schema.
 * @updated 2026-04-27: Made long-term-memory prompt sections optional so turns can skip memory rules and snapshots entirely when the feature is disabled.
 * @updated 2026-04-26: Switched dictionary prompt serialization from pretty JSON to compact table-style text to reduce token overhead while preserving candidate ids.
 * @updated 2026-04-26: Broke recent compressed log history into its own prompt section so debug viewers can inspect it separately from candidate dictionaries.
 * @updated 2026-04-26: Added the first unified assistant-turn service with layered prompt assembly, shared context serialization, and a single structured aiService gateway call.
 */

import type { AIDebugExchange, AIConversationTurn } from './aiService';
import { aiService } from './aiService';
import { assistantContextBuilder } from './assistantContextBuilder';
import { assistantPromptService } from './assistantPromptService';
import type {
  AssistantUnifiedTurnInput,
  AssistantUnifiedTurnOutput
} from '../types/assistant';

export interface AssistantUnifiedTurnResult {
  output: AssistantUnifiedTurnOutput;
  debug: AIDebugExchange;
}

const stringifyJson = (value: unknown): string => JSON.stringify(value, null, 2);

const MEMORY_DISABLED_RULE = '- Long-term memory is disabled for this turn. Set memoryAction to "no_update" and omit memoryPatch.';

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

const buildSystemPrompt = async (input: AssistantUnifiedTurnInput): Promise<string> => {
  const memoryEnabled = input.memoryEnabled !== false;
  const [toolSchemaPrompt, memoryRulesPrompt] = await Promise.all([
    buildToolSchemaPrompt(input),
    memoryEnabled ? assistantPromptService.getMemoryRulesPrompt() : Promise.resolve(undefined)
  ]);
  const dictionaryDigest = assistantContextBuilder.buildDictionaryDigest(input.dictionaryContext);
  const modePromptLabel = input.mode === 'background' ? 'Background Mode Prompt' : 'Foreground Mode Prompt';
  const toolPromptLabel = input.mode === 'background' ? 'Background Tool Prompt' : 'Foreground Tool Prompt';
  const outputSchema = memoryEnabled
    ? {
      mode: input.mode,
      outcome: 'reply | clarify | silent',
      assistantReply: 'string',
      assistantReplyParts: ['string'],
      toolCalls: [],
      reminders: [],
      memoryAction: 'no_update | update_memory',
      memoryPatch: {},
      decisionSummary: 'string',
      silentReason: 'active_focus_protection | likely_do_not_disturb | state_still_clear | insufficient_confidence | waiting_for_stronger_signal | followup_already_scheduled',
      silentSideEffects: ['string']
    }
    : {
      mode: input.mode,
      outcome: 'reply | clarify | silent',
      assistantReply: 'string',
      assistantReplyParts: ['string'],
      toolCalls: [],
      reminders: [],
      memoryAction: 'no_update',
      decisionSummary: 'string',
      silentReason: 'active_focus_protection | likely_do_not_disturb | state_still_clear | insufficient_confidence | waiting_for_stronger_signal | followup_already_scheduled',
      silentSideEffects: ['string']
    };
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
    ...(memoryEnabled && memoryRulesPrompt ? ['', '=== Memory Update Rules ===', memoryRulesPrompt] : []),
    '=== Unified Turn Output Schema ===',
    stringifyJson(outputSchema),
    ...(memoryEnabled ? ['', '=== Memory Snapshot ===', stringifyJson(input.memory)] : []),
    '',
    '=== State Context ===',
    stringifyJson(input.stateContext),
    '',
    ...(input.recentLogsDigest ? ['=== Recent Logs Digest ===', input.recentLogsDigest, ''] : []),
    '=== Dictionary Context ===',
    dictionaryDigest
  ].filter(Boolean).join('\n');
};

const buildUserPrompt = (input: AssistantUnifiedTurnInput): string => [
  '=== Trigger ===',
  stringifyJson(input.trigger),
  '',
  '=== Conversation Context ===',
  stringifyJson(input.conversation),
  '',
  'Return one JSON object only.'
].join('\n');

export const assistantTurnService = {
  async runUnifiedTurn(
    input: AssistantUnifiedTurnInput,
    conversationHistory?: AIConversationTurn[]
  ): Promise<AssistantUnifiedTurnResult> {
    const systemPrompt = await buildSystemPrompt(input);
    const { output, debug } = await aiService.requestAssistantUnifiedTurnWithDebug({
      mode: input.mode,
      systemPrompt,
      userPrompt: buildUserPrompt(input),
      conversationHistory
    });

    return {
      output,
      debug
    };
  }
};
