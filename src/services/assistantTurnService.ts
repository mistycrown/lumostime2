/**
 * @file assistantTurnService.ts
 * @input Unified assistant-turn input including prompt layers, memory, conversation, state context, and dictionary context
 * @output Structured unified assistant-turn result plus request/response debug exchange
 * @pos Service (Assistant Unified Turn)
 * @description Builds the single-turn prompt payload for the converged assistant architecture and forwards it through aiService so foreground and background flows can gradually migrate off the older multi-prompt planner stack.
 *
 * @updated 2026-04-26: Broke recent compressed log history into its own prompt section so debug viewers can inspect it separately from candidate dictionaries.
 * @updated 2026-04-26: Added the first unified assistant-turn service with layered prompt assembly, shared context serialization, and a single structured aiService gateway call.
 */

import type { AIDebugExchange, AIConversationTurn } from './aiService';
import { aiService } from './aiService';
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

const buildToolSchemaPrompt = async (mode: AssistantUnifiedTurnInput['mode']): Promise<string> => {
  if (mode === 'background') {
    return [
      'Allowed output behavior:',
      '- outcome may be "reply" or "silent".',
      '- Do not emit toolCalls in background mode.',
      '- reminders may be returned when a future follow-up is appropriate.',
      '- memoryAction must always be "no_update" or "update_memory".',
      '- Only include memoryPatch when memoryAction is "update_memory".'
    ].join('\n');
  }

  return assistantPromptService.getForegroundToolsPrompt();
};

const buildSystemPrompt = async (input: AssistantUnifiedTurnInput): Promise<string> => {
  const [toolSchemaPrompt, memoryRulesPrompt] = await Promise.all([
    buildToolSchemaPrompt(input.mode),
    assistantPromptService.getMemoryRulesPrompt()
  ]);
  const modePromptLabel = input.mode === 'background' ? 'Background Mode Prompt' : 'Foreground Mode Prompt';
  const toolPromptLabel = input.mode === 'background' ? 'Background Tool Prompt' : 'Foreground Tool Prompt';
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
    '=== Memory Update Rules ===',
    memoryRulesPrompt,
    '',
    '=== Unified Turn Output Schema ===',
    stringifyJson({
      mode: input.mode,
      outcome: 'reply | clarify | silent',
      assistantReply: 'string',
      toolCalls: [],
      reminders: [],
      memoryAction: 'no_update | update_memory',
      memoryPatch: {}
    }),
    '',
    '=== Memory Snapshot ===',
    stringifyJson(input.memory),
    '',
    '=== State Context ===',
    stringifyJson(input.stateContext),
    '',
    ...(input.recentLogsDigest ? ['=== Recent Logs Digest ===', input.recentLogsDigest, ''] : []),
    '=== Dictionary Context ===',
    stringifyJson(input.dictionaryContext)
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
