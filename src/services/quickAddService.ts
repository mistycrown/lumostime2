/**
 * @file quickAddService.ts
 * @input AI configuration, user quick-add descriptions, and runtime dictionaries
 * @output Structured one-turn quick-add tool calls for todos, backfills, and notes
 * @pos Service (AI Quick Add)
 * @description Keeps all quick-add prompts, contracts, and normalization isolated from the general AI service.
 */

import type { AssistantTurnDictionaryContext } from '../types/assistant';
import { aiService, type AIRequestOptions, type AITodoToolCall, type AIDebugExchange } from './aiService';

export interface AIBackfillCreateLogArgs {
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  categoryId: string;
  activityId: string;
  scopeIds?: string[];
  linkedTodoId?: string;
  progressIncrement?: number;
}

export interface AIBackfillToolCall {
  toolName: 'create_log';
  args: AIBackfillCreateLogArgs;
}

export interface AIQuickAddTodoResult {
  toolCall?: AITodoToolCall;
  debug: AIDebugExchange;
}

export interface AIQuickAddBackfillCreateLogArgs {
  date?: string;
  startTime?: string;
  endTime?: string;
  description: string;
  categoryId?: string;
  activityId?: string;
  scopeIds?: string[];
  categoryName?: string;
  activityName?: string;
}

export interface AIQuickAddBackfillToolCall {
  toolName: 'create_log';
  args: AIQuickAddBackfillCreateLogArgs;
}

export interface AIQuickAddBackfillResult {
  toolCall?: AIQuickAddBackfillToolCall;
  debug: AIDebugExchange;
}

export interface AIQuickAddBackfillTimeContext {
  currentDateTime?: string;
  todayTimelineSummary?: string;
}

export interface AIQuickAddNoteItem {
  logId?: string;
  text: string;
}

export interface AIQuickAddNoteToolCall {
  toolName: 'append_log_notes';
  args: {
    items: AIQuickAddNoteItem[];
  };
}

export interface AIQuickAddNoteResult {
  toolCall?: AIQuickAddNoteToolCall;
  debug: AIDebugExchange;
}

export interface AIQuickAddNoteTimeContext {
  currentDateTime?: string;
}

const normalizeText = (value: unknown): string | undefined => (
  typeof value === 'string' && value.trim() ? value.trim() : undefined
);

export const quickAddService = {
  requestQuickAddTodoWithDebug: async (
    description: string,
    options: AIRequestOptions = {},
    dictionaryContext: AssistantTurnDictionaryContext = {}
  ): Promise<AIQuickAddTodoResult> => {
    const systemPrompt = [
      'You are the structured tool caller for quick-add todos.',
      'Create exactly one todo from the user description. Do not chat, explain, summarize, or call another tool.',
      'Return JSON: {"toolCalls":[{"toolName":"create_todo","args":{"title":"todo title","kind":"project","categoryId":"todo category id","linkedCategoryId":"activity category id","linkedActivityId":"activity id","defaultScopeIds":["scope id"]}}]}.',
      'Keep the key information from the user description. Select ids only from the supplied dictionary.',
      'Do not use the reserved quick category; use a normal todo category and linked activity when possible.',
      'If the description contains an explicit note/date/deadline, preserve it in note/scheduledDate/deadlineDate without inventing information.',
      JSON.stringify(dictionaryContext)
    ].join('\n');

    const { result, debug } = await aiService.requestStructuredJsonWithDebug({
      systemPrompt,
      userPrompt: description.trim(),
      normalizeResult: (rawValue: any) => {
        const rawToolCalls = Array.isArray(rawValue?.toolCalls)
          ? rawValue.toolCalls.map((item: any) => item?.toolName === 'create_todo'
            ? { ...item, args: { ...(item.args || {}), kind: 'project' } }
            : item)
          : [];
        const toolCall = rawToolCalls.find((item: any) => item?.toolName === 'create_todo') as AITodoToolCall | undefined;
        return { toolCall };
      }
    }, options);

    return { toolCall: result.toolCall, debug };
  },

  requestQuickAddBackfillWithDebug: async (
    description: string,
    options: AIRequestOptions = {},
    dictionaryContext: AssistantTurnDictionaryContext = {},
    timeContext: AIQuickAddBackfillTimeContext = {}
  ): Promise<AIQuickAddBackfillResult> => {
    const currentDateTime = timeContext.currentDateTime?.trim();
    const todayTimelineSummary = timeContext.todayTimelineSummary?.trim();
    const systemPrompt = [
      'You are the structured tool caller for quick-add backfills.',
      'Create exactly one already-happened timeline log from the user description. Do not chat, explain, summarize, or call another tool.',
      'Return JSON: {"toolCalls":[{"toolName":"create_log","args":{"date":"YYYY-MM-DD","startTime":"HH:mm","endTime":"HH:mm","description":"original backfill content","categoryId":"activity category id","activityId":"activity id","scopeIds":["scope id"]}}]}.',
      `Current local time: ${currentDateTime || 'not provided'}`,
      `Target-day timeline summary: ${todayTimelineSummary || 'none'}`,
      'Preserve all key information from the user description. Select ids only from the supplied dictionary; leave ids empty when no reliable match exists.',
      JSON.stringify(dictionaryContext)
    ].join('\n');

    const { result, debug } = await aiService.requestStructuredJsonWithDebug({
      systemPrompt,
      userPrompt: description.trim(),
      normalizeResult: (rawValue: any) => {
        const rawToolCall = Array.isArray(rawValue?.toolCalls)
          ? rawValue.toolCalls.find((item: any) => item?.toolName === 'create_log')
          : undefined;
        if (!rawToolCall?.args || typeof rawToolCall.args !== 'object') {
          return { toolCall: undefined };
        }
        const args = rawToolCall.args as Record<string, unknown>;
        const normalizedDescription = normalizeText(args.description) || description.trim();
        if (!normalizedDescription) {
          return { toolCall: undefined };
        }
        return {
          toolCall: {
            toolName: 'create_log' as const,
            args: {
              ...(normalizeText(args.date) ? { date: normalizeText(args.date) } : {}),
              ...(normalizeText(args.startTime) ? { startTime: normalizeText(args.startTime) } : {}),
              ...(normalizeText(args.endTime) ? { endTime: normalizeText(args.endTime) } : {}),
              description: normalizedDescription,
              ...(normalizeText(args.categoryId) ? { categoryId: normalizeText(args.categoryId) } : {}),
              ...(normalizeText(args.activityId) ? { activityId: normalizeText(args.activityId) } : {}),
              ...(Array.isArray(args.scopeIds) ? { scopeIds: args.scopeIds.map((scopeId) => String(scopeId).trim()).filter(Boolean) } : {}),
              ...(normalizeText(args.categoryName) ? { categoryName: normalizeText(args.categoryName) } : {}),
              ...(normalizeText(args.activityName) ? { activityName: normalizeText(args.activityName) } : {})
            }
          }
        };
      }
    }, options);

    return { toolCall: result.toolCall, debug };
  },

  requestQuickAddNoteWithDebug: async (
    description: string,
    options: AIRequestOptions = {},
    dictionaryContext: AssistantTurnDictionaryContext = {},
    timeContext: AIQuickAddNoteTimeContext = {}
  ): Promise<AIQuickAddNoteResult> => {
    const currentDateTime = timeContext.currentDateTime?.trim() || 'not provided';
    const systemPrompt = [
      'You are the structured tool caller for quick-add notes.',
      'Split the user text into contiguous fragments without rewriting, summarizing, translating, correcting, or adding any words.',
      'Assign every fragment to one existing timeline log from the provided logs dictionary by log id.',
      'Use the current local time, date, time ranges, activity names, and existing notes to choose the best log.',
      'If a fragment cannot be matched confidently, assign it to the log nearest to the current local time. Never create a log and never edit or delete an existing note.',
      'Return JSON only: {"toolCalls":[{"toolName":"append_log_notes","args":{"items":[{"logId":"existing log id","text":"exact contiguous user fragment"}]}}]}.',
      'The text values must be exact contiguous substrings of the user input. Keep the original order. Do not return empty fragments.',
      `Current local time: ${currentDateTime}`,
      JSON.stringify(dictionaryContext)
    ].join('\n');

    const { result, debug } = await aiService.requestStructuredJsonWithDebug({
      systemPrompt,
      userPrompt: description,
      normalizeResult: (rawValue: any) => {
        const rawToolCall = Array.isArray(rawValue?.toolCalls)
          ? rawValue.toolCalls.find((item: any) => item?.toolName === 'append_log_notes')
          : undefined;
        const rawItems = rawToolCall?.args?.items;
        if (!Array.isArray(rawItems)) {
          return { toolCall: undefined };
        }
        const items = rawItems.flatMap((item: any) => {
          const text = typeof item?.text === 'string' ? item.text : '';
          if (!text.trim()) return [];
          const logId = normalizeText(item?.logId);
          return [{ ...(logId ? { logId } : {}), text }];
        });
        return items.length > 0
          ? { toolCall: { toolName: 'append_log_notes' as const, args: { items } } }
          : { toolCall: undefined };
      }
    }, options);

    return { toolCall: result.toolCall, debug };
  }
};
