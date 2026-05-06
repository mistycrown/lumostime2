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
    recentTurns: [],
    summary: 'No history yet'
  },
  stateContext: {
    currentDateTime: '2026-04-27T17:00:00+08:00',
    defaultDate: '2026-04-27'
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
    expect(request?.systemPrompt).toContain('=== Memory Snapshot ===');
    expect(request?.systemPrompt).toContain('"profileMemory": [');
    expect(request?.systemPrompt).toContain('"updatedAt": "2026-04-27T17:00:00+08:00"');
    expect(request?.systemPrompt).not.toContain('"updatedAt": "2026-04-27T09:00:00.000Z"');
    expect(request?.systemPrompt).not.toContain('=== Recent Logs Digest ===');
    expect(request?.userPrompt).toContain('"createdAt": "2026-04-27T17:00:00+08:00"');
  });

  it('serializes the optional timeline review digest without replacing the concrete same-day log list', async () => {
    await assistantTurnService.runUnifiedTurn(createInput({
      stateContext: {
        currentDateTime: '2026-04-27T17:00:00+08:00',
        defaultDate: '2026-04-27',
        todayTimelineSummary: '09:00-10:00 Work / Writing',
        yesterdayTimelineSummary: '14:00-15:00 Work / Writing',
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
    expect(request?.systemPrompt).toContain('"todayTimelineSummary": "09:00-10:00 Work / Writing"');
    expect(request?.systemPrompt).toContain('"yesterdayTimelineSummary": "14:00-15:00 Work / Writing"');
    expect(request?.systemPrompt).toContain('"timelineReviewSummary": "today and yesterday review digest"');
    expect(request?.systemPrompt).toContain('[Logs] rows=1');
    expect(request?.systemPrompt).toContain('"log-1"\t"2026-04-27"\t"09:00-10:00"');
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
});
