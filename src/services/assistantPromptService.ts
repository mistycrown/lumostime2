/**
 * @file assistantPromptService.ts
 * @input Assistant memory, system-trigger context, and optional static prompt assets
 * @output Persona-aware system-turn prompts for the background AI agent
 * @pos Service (Assistant Prompt Builder)
 * @description Loads or falls back to local assistant prompt templates and assembles compact persona plus system-trigger prompts so background AI turns can stay consistent without duplicating prompt assembly logic across the app.
 *
 * @updated 2026-04-26: Added Android-first assistant persona/system-trigger prompt loading and structured system-turn prompt assembly.
 */

import type { AssistantSystemTurnContext } from '../types/assistant';

const PERSONA_PROMPT_URL = '/assistant/assistant-persona.md';
const SYSTEM_TRIGGER_PROMPT_URL = '/assistant/assistant-system-trigger.md';

const FALLBACK_PERSONA_PROMPT = `
You are LumosTime's continuous assistant.

You help the user keep momentum across time, not just answer one isolated message.
Favor short, concrete, natural Chinese.
Reduce cognitive load.
Do not sound like customer support.
When the user is drifting or overloaded, prefer one small next step.
You may be warm and gently proactive, but avoid over-talking and avoid performative empathy.
`.trim();

const FALLBACK_SYSTEM_TRIGGER_PROMPT = `
SYSTEM ACTION MODE

This is an internal trigger, not a user chat.
Your job is to decide whether to do nothing, update memory, create a reminder, or send one short natural Chinese message.

Priorities:
1. Avoid unnecessary interruption.
2. Maintain continuity with the user's likely real state.
3. Prefer short concrete nudges over lectures.
4. If context is uncertain, be conservative.

Return one JSON object only.
Allowed shapes:
{"action":"silent"}
{"action":"send_message","message":"<one short natural Chinese message>"}
{"action":"create_reminder","reminder":{"dueAt":"<ISO datetime>","text":"<follow-up reminder>","type":"self_followup"}}
{"action":"update_memory","memoryPatch":{"lastKnownState":"...","workingMemorySummary":"...","recentDecisions":["..."]}}
`.trim();

const promptCache = new Map<string, string>();

const loadPromptAsset = async (url: string, fallback: string): Promise<string> => {
  if (promptCache.has(url)) {
    return promptCache.get(url)!;
  }

  if (typeof fetch !== 'function') {
    promptCache.set(url, fallback);
    return fallback;
  }

  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) {
      promptCache.set(url, fallback);
      return fallback;
    }

    const text = (await response.text()).trim();
    const resolved = text || fallback;
    promptCache.set(url, resolved);
    return resolved;
  } catch (error) {
    console.warn('[assistantPromptService] Failed to load prompt asset, using fallback', url, error);
    promptCache.set(url, fallback);
    return fallback;
  }
};

export const assistantPromptService = {
  async getPersonaPrompt(): Promise<string> {
    return loadPromptAsset(PERSONA_PROMPT_URL, FALLBACK_PERSONA_PROMPT);
  },

  async getSystemTriggerPrompt(): Promise<string> {
    return loadPromptAsset(SYSTEM_TRIGGER_PROMPT_URL, FALLBACK_SYSTEM_TRIGGER_PROMPT);
  },

  async buildSystemTurnPrompt(context: AssistantSystemTurnContext): Promise<string> {
    const [personaPrompt, systemTriggerPrompt] = await Promise.all([
      assistantPromptService.getPersonaPrompt(),
      assistantPromptService.getSystemTriggerPrompt()
    ]);

    return [
      personaPrompt,
      '',
      systemTriggerPrompt,
      '',
      'Current Context:',
      `- Current DateTime: ${context.currentDateTime}`,
      `- Default Date: ${context.defaultDate}`,
      `- Trigger Type: ${context.trigger.type}`,
      `- Trigger Source: ${context.trigger.source}`,
      `- Trigger Time: ${context.trigger.createdAt}`,
      '',
      'Assistant Memory Snapshot:',
      JSON.stringify(context.memory),
      '',
      'Today Timeline Summary:',
      context.todayTimelineSummary || '今天还没有时间轴记录。',
      '',
      'Active Session Summary:',
      context.activeSessionSummary || '当前没有进行中的专注会话。',
      '',
      'Todo Summary:',
      context.todoSummary || '当前没有额外的待办摘要。',
      '',
      'Trigger Payload:',
      context.trigger.text,
      context.trigger.metadata ? JSON.stringify(context.trigger.metadata) : ''
    ].filter(Boolean).join('\n');
  }
};
