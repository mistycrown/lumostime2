import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssistantUnifiedTurnInput } from '../types/assistant';
import { assistantTurnService } from './assistantTurnService';
import { aiService } from './aiService';
import { assistantPromptService } from './assistantPromptService';

vi.mock('./aiService', () => ({
  aiService: {
    requestAssistantUnifiedTurnWithDebug: vi.fn()
  }
}));

vi.mock('./assistantPromptService', () => ({
  assistantPromptService: {
    getForegroundToolsPrompt: vi.fn(),
    getMemoryRulesPrompt: vi.fn()
  }
}));

const createInput = (patch?: Partial<AssistantUnifiedTurnInput>): AssistantUnifiedTurnInput => ({
  mode: 'foreground',
  trigger: {
    type: 'user_message',
    source: 'user',
    text: 'Help me remember today plan',
    createdAt: '2026-04-27T09:00:00.000Z'
  },
  promptLayers: {
    basePrompt: 'base prompt',
    modePrompt: 'foreground mode prompt'
  },
  memoryEnabled: true,
  memory: {
    version: 1,
    updatedAt: '2026-04-27T09:00:00.000Z',
    profileMemory: ['User is preparing a thesis'],
    preferenceMemory: ['Prefers short replies'],
    activeReminders: [],
    recentDecisions: ['Keep tracking today plan']
  },
  conversation: {
    recentTurns: [{
      role: 'user',
      content: '下周二帮我安排讲座',
      createdAt: '2026-05-13T21:47:00+08:00'
    }],
    summary: 'No history yet'
  },
  stateContext: {
    currentDateTime: '2026-04-27T17:00:00+08:00',
    stateContextDate: '2026-04-27',
    currentLocalDate: '2026-04-27',
    currentWeekday: '周一',
    tomorrowDate: '2026-04-28',
    dayAfterTomorrowDate: '2026-04-29',
    currentWeekRange: '2026-04-26..2026-05-02',
    nextWeekdayDates: {
      nextTuesday: '2026-04-28'
    }
  },
  dictionaryContext: {},
  ...patch
});

describe('assistantTurnService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assistantPromptService.getForegroundToolsPrompt).mockResolvedValue('foreground tools prompt');
    vi.mocked(assistantPromptService.getMemoryRulesPrompt).mockResolvedValue('memory rules prompt');
    vi.mocked(aiService.requestAssistantUnifiedTurnWithDebug).mockResolvedValue({
      output: {
        mode: 'foreground',
        outcome: 'reply',
        assistantReply: 'Okay, I noted it.',
        memoryAction: 'no_update'
      },
      debug: {
        provider: 'openai',
        requestedAt: '2026-04-27T09:00:00.000Z',
        completedAt: '2026-04-27T09:00:01.000Z',
        request: {
          url: 'https://example.test',
          method: 'POST',
          headers: {},
          body: {}
        },
        response: {
          status: 200,
          ok: true,
          body: {}
        }
      }
    });
  });

  it('includes memory sections when long-term memory is enabled', async () => {
    await assistantTurnService.runUnifiedTurn(createInput());

    const request = vi.mocked(aiService.requestAssistantUnifiedTurnWithDebug).mock.calls[0]?.[0];
    expect(request?.systemPrompt).toContain('=== Structured Output Contract ===');
    expect(request?.systemPrompt).toContain('You must return exactly one strict JSON object.');
    expect(request?.systemPrompt).toContain('Your entire response must be valid JSON parsable by JSON.parse with no cleanup step.');
    expect(request?.systemPrompt).toContain('=== Memory Update Rules ===');
    expect(request?.systemPrompt).toContain('memory rules prompt');
    expect(request?.systemPrompt).toContain('=== Volatile State Anchors ===');
    expect(request?.systemPrompt).toContain('=== Memory Snapshot ===');
    expect(request?.systemPrompt).toContain('"profileMemory": [');
    expect(request?.systemPrompt).toContain('"updatedAt": "2026-04-27T17:00:00+08:00"');
    expect(request?.systemPrompt).not.toContain('"updatedAt": "2026-04-27T09:00:00.000Z"');
    expect(request?.systemPrompt).not.toContain('=== Recent Logs Digest ===');
    expect(request?.systemPrompt).toContain('"currentLocalDate": "2026-04-27"');
    expect(request?.systemPrompt).toContain('"currentWeekday": "周一"');
    expect(request?.systemPrompt).toContain('"tomorrowDate": "2026-04-28"');
    expect(request?.systemPrompt).toContain('"dayAfterTomorrowDate": "2026-04-29"');
    expect(request?.systemPrompt).toContain('"currentWeekRange": "2026-04-26..2026-05-02"');
    expect(request?.systemPrompt).toContain('"nextTuesday": "2026-04-28"');
    expect((request?.userPrompt.indexOf('=== Conversation Context ===') || 0)).toBeLessThan(request?.userPrompt.indexOf('=== Trigger ===') || 0);
    expect(request?.userPrompt).toContain('"createdAt": "2026-04-27T17:00:00+08:00"');
    expect(request?.userPrompt).toContain('"createdAt": "2026-05-13T21:47:00+08:00"');
    expect(request?.cacheHint?.scope).toBe('assistant_unified_turn');
    expect(typeof request?.cacheHint?.keySeed).toBe('string');
  });

  it('places the optional user persona prompt before the base system prompt', async () => {
    await assistantTurnService.runUnifiedTurn(createInput({
      promptLayers: {
        basePrompt: 'base prompt',
        modePrompt: 'foreground mode prompt',
        userPersonaPrompt: 'persona prompt'
      }
    }));

    const request = vi.mocked(aiService.requestAssistantUnifiedTurnWithDebug).mock.calls[0]?.[0];
    const personaIndex = request?.systemPrompt?.indexOf('=== User Persona Prompt ===') ?? -1;
    const baseIndex = request?.systemPrompt?.indexOf('=== Assistant Base Prompt ===') ?? -1;

    expect(request?.systemPrompt).toContain('persona prompt');
    expect(personaIndex).toBeGreaterThanOrEqual(0);
    expect(baseIndex).toBeGreaterThan(personaIndex);
  });

  it('serializes the optional timeline review digest without replacing the concrete same-day log list', async () => {
    await assistantTurnService.runUnifiedTurn(createInput({
      stateContext: {
        currentDateTime: '2026-04-27T17:00:00+08:00',
        stateContextDate: '2026-04-27',
        timelineSummaryForDate: '09:00-10:00 Work / Writing',
        timelineSummaryForPreviousDate: '14:00-15:00 Work / Writing',
        timelineReviewSummary: 'today and yesterday review digest'
      },
      dictionaryContext: {
        logs: [{
          id: 'log-1',
          date: '2026-04-27',
          timeRange: '09:00-10:00',
          activityId: 'act-writing',
          activityName: 'Writing'
        }]
      }
    }));

    const request = vi.mocked(aiService.requestAssistantUnifiedTurnWithDebug).mock.calls[0]?.[0];
    const dictionaryIndex = request?.systemPrompt.indexOf('=== Dictionary Context ===') || -1;
    const volatileStateIndex = request?.systemPrompt.indexOf('=== Volatile State Anchors ===') || -1;
    expect(request?.systemPrompt).toContain('"timelineSummaryForDate": "09:00-10:00 Work / Writing"');
    expect(request?.systemPrompt).toContain('"timelineSummaryForPreviousDate": "14:00-15:00 Work / Writing"');
    expect(request?.systemPrompt).toContain('"timelineReviewSummary": "today and yesterday review digest"');
    expect(request?.systemPrompt).toContain('[Logs] rows=1');
    expect(request?.systemPrompt).toContain('"log-1"\t"2026-04-27"\t"09:00-10:00"');
    expect(dictionaryIndex).toBeGreaterThanOrEqual(0);
    expect(volatileStateIndex).toBeGreaterThan(dictionaryIndex);
    expect(request).not.toHaveProperty('conversationHistory');
  });

  it('uses a background-specific output schema without foreground-only clarify or toolCalls', async () => {
    await assistantTurnService.runUnifiedTurn(createInput({
      mode: 'background',
      trigger: {
        type: 'checkin',
        source: 'system',
        text: 'check in',
        createdAt: '2026-04-27T09:00:00.000Z'
      },
      promptLayers: {
        basePrompt: 'base prompt',
        modePrompt: 'background mode prompt'
      }
    }));

    const request = vi.mocked(aiService.requestAssistantUnifiedTurnWithDebug).mock.calls[0]?.[0];
    expect(request?.systemPrompt).toContain('"outcome": "reply | silent"');
    expect(request?.systemPrompt).not.toContain('"outcome": "reply | clarify | silent"');
    expect(request?.systemPrompt).not.toContain('"toolCalls": []');
  });

  it('uses a foreground-specific output schema without unsupported silent outcomes', async () => {
    await assistantTurnService.runUnifiedTurn(createInput());

    const request = vi.mocked(aiService.requestAssistantUnifiedTurnWithDebug).mock.calls[0]?.[0];
    expect(request?.systemPrompt).toContain('"outcome": "reply | clarify"');
    expect(request?.systemPrompt).not.toContain('"outcome": "reply | clarify | silent"');
  });

  it('omits memory sections and forces no_update guidance when long-term memory is disabled', async () => {
    await assistantTurnService.runUnifiedTurn(createInput({
      memoryEnabled: false
    }));

    const request = vi.mocked(aiService.requestAssistantUnifiedTurnWithDebug).mock.calls[0]?.[0];
    expect(request?.systemPrompt).toContain('=== Structured Output Contract ===');
    expect(request?.systemPrompt).toContain('Do not return any text before or after the JSON object.');
    expect(vi.mocked(assistantPromptService.getMemoryRulesPrompt)).not.toHaveBeenCalled();
    expect(request?.systemPrompt).not.toContain('=== Memory Update Rules ===');
    expect(request?.systemPrompt).not.toContain('=== Memory Snapshot ===');
    expect(request?.systemPrompt).toContain('Long-term memory is disabled for this turn. Set memoryAction to "no_update" and omit memoryPatch.');
    expect(request?.systemPrompt).toContain('"memoryAction": "no_update"');
  });

  it('passes request options through to aiService so callers can cancel in-flight turns', async () => {
    const controller = new AbortController();

    await assistantTurnService.runUnifiedTurn(createInput(), {
      signal: controller.signal
    });

    const forwardedOptions = vi.mocked(aiService.requestAssistantUnifiedTurnWithDebug).mock.calls[0]?.[1];
    expect(forwardedOptions).toEqual({
      signal: controller.signal
    });
  });
});
