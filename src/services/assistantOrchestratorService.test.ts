import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssistantMemory, AssistantReminder } from '../types/assistant';

vi.mock('./assistantAgentConfigService', () => ({
  assistantAgentConfigService: {
    getConfig: vi.fn()
  }
}));

vi.mock('./assistantPromptService', () => ({
  assistantPromptService: {
    getAssistantBasePrompt: vi.fn(),
    getBackgroundModePrompt: vi.fn()
  }
}));

vi.mock('./assistantContextBuilder', () => ({
  assistantContextBuilder: {
    buildConversationContext: vi.fn()
  }
}));

vi.mock('./assistantTurnService', () => ({
  assistantTurnService: {
    runUnifiedTurn: vi.fn()
  }
}));

vi.mock('./assistantMemoryService', () => ({
  assistantMemoryService: {
    getMemory: vi.fn(),
    applyPatch: vi.fn(),
    appendDecisionSummary: vi.fn(),
    replaceActiveReminders: vi.fn()
  }
}));

vi.mock('./assistantReminderQueueService', () => ({
  assistantReminderQueueService: {
    enqueueReminder: vi.fn(),
    listReminders: vi.fn()
  }
}));

vi.mock('../plugins/AssistantAgentPlugin', () => ({
  default: {
    showAssistantNotification: vi.fn()
  }
}));

import { assistantAgentConfigService } from './assistantAgentConfigService';
import { assistantContextBuilder } from './assistantContextBuilder';
import { assistantMemoryService } from './assistantMemoryService';
import { assistantOrchestratorService } from './assistantOrchestratorService';
import { assistantPromptService } from './assistantPromptService';
import { assistantReminderQueueService } from './assistantReminderQueueService';
import { assistantTurnService } from './assistantTurnService';
import AssistantAgent from '../plugins/AssistantAgentPlugin';

type LocalStorageMock = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const createLocalStorageMock = (): LocalStorageMock => {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    }
  };
};

const baseMemory: AssistantMemory = {
  version: 1,
  updatedAt: '2026-04-27T10:00:00.000Z',
  profileMemory: [],
  preferenceMemory: [],
  activeReminders: [],
  recentDecisions: []
};

const debugExchange = {
  provider: 'openai' as const,
  requestedAt: '2026-04-27T10:00:00.000Z',
  completedAt: '2026-04-27T10:00:01.000Z',
  request: {
    url: 'https://example.com',
    method: 'POST',
    headers: {},
    body: {}
  },
  response: {
    status: 200,
    ok: true,
    body: {}
  }
};

describe('assistantOrchestratorService', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true
    });

    vi.clearAllMocks();

    vi.mocked(assistantAgentConfigService.getConfig).mockReturnValue({
      enabled: true,
      enableRandomCheckin: true,
      basePollMinutes: 10,
      minCheckinMinutes: 15,
      maxCheckinMinutes: 60,
      quietHoursEnabled: false,
      minimumNudgeGapMinutes: 15,
      longTermMemoryEnabled: true
    });
    vi.mocked(assistantPromptService.getAssistantBasePrompt).mockResolvedValue('base prompt');
    vi.mocked(assistantPromptService.getBackgroundModePrompt).mockResolvedValue('background prompt');
    vi.mocked(assistantContextBuilder.buildConversationContext).mockReturnValue({
      recentTurns: []
    });
    vi.mocked(assistantMemoryService.getMemory).mockReturnValue(baseMemory);
    vi.mocked(assistantMemoryService.applyPatch).mockReturnValue({
      ...baseMemory,
      lastKnownState: '还在写东西'
    });
    vi.mocked(assistantMemoryService.appendDecisionSummary).mockImplementation((summary: string) => ({
      ...baseMemory,
      recentDecisions: [summary]
    }));
    vi.mocked(assistantMemoryService.replaceActiveReminders).mockImplementation((reminders: AssistantReminder[]) => ({
      ...baseMemory,
      activeReminders: reminders
    }));
    vi.mocked(assistantReminderQueueService.listReminders).mockReturnValue([]);
    vi.mocked(AssistantAgent.showAssistantNotification).mockResolvedValue(undefined);
  });

  it('records readable silent summaries, reasons, and side effects in memory and history', async () => {
    vi.mocked(assistantTurnService.runUnifiedTurn).mockResolvedValue({
      output: {
        mode: 'background',
        outcome: 'silent',
        memoryAction: 'update_memory',
        memoryPatch: {
          lastKnownState: '还在写东西'
        },
        decisionSummary: '这次先不打扰：用户可能仍在专注。已处理：更新了当前状态摘要；记录了最近决策摘要。',
        silentReason: 'active_focus_protection',
        silentSideEffects: ['更新了当前状态摘要']
      },
      debug: debugExchange
    });

    const result = await assistantOrchestratorService.runSystemTurn({
      trigger: {
        id: 'trigger-1',
        type: 'checkin',
        source: 'system',
        createdAt: '2026-04-27T10:00:00.000Z',
        text: 'check in'
      },
      currentDateTime: '2026-04-27T18:00:00+08:00',
      defaultDate: '2026-04-27',
      todayTimelineSummary: 'timeline'
    });

    expect(result.decision.action).toBe('silent');
    expect(result.decision.decisionSummary).toBe('这次先不打扰：用户可能仍在专注。已处理：更新了当前状态摘要；记录了最近决策摘要。');
    expect(result.decision.silentReason).toBe('active_focus_protection');
    expect(result.decision.silentSideEffects).toEqual([
      '更新了当前状态摘要',
      '记录了最近决策摘要'
    ]);
    expect(assistantMemoryService.appendDecisionSummary).toHaveBeenCalledWith(
      '这次先不打扰：用户可能仍在专注。已处理：更新了当前状态摘要；记录了最近决策摘要。'
    );

    const history = assistantOrchestratorService.listBackgroundCallHistory();
    expect(history).toHaveLength(1);
    expect(history[0].triggerId).toBe('trigger-1');
    expect(history[0].decisionSummary).toBe('这次先不打扰：用户可能仍在专注。已处理：更新了当前状态摘要；记录了最近决策摘要。');
    expect(history[0].silentReason).toBe('active_focus_protection');
    expect(history[0].sideEffects).toEqual([
      '更新了当前状态摘要',
      '记录了最近决策摘要'
    ]);
    expect(history[0].debugExchange).toEqual(debugExchange);
    expect(AssistantAgent.showAssistantNotification).not.toHaveBeenCalled();
  });

  it('builds a fallback silent summary when the model omits one', async () => {
    const enqueuedReminder: AssistantReminder = {
      id: 'reminder-1',
      type: 'self_followup',
      dueAt: '2026-04-27T11:00:00.000Z',
      status: 'pending',
      text: '半小时后再看看',
      source: 'agent',
      createdAt: '2026-04-27T10:00:10.000Z'
    };

    vi.mocked(assistantTurnService.runUnifiedTurn).mockResolvedValue({
      output: {
        mode: 'background',
        outcome: 'silent',
        memoryAction: 'no_update',
        reminders: [{
          dueAt: '2026-04-27T11:00:00.000Z',
          text: '半小时后再看看',
          type: 'self_followup'
        }],
        silentReason: 'followup_already_scheduled'
      },
      debug: debugExchange
    });
    vi.mocked(assistantReminderQueueService.enqueueReminder).mockReturnValue(enqueuedReminder);
    vi.mocked(assistantReminderQueueService.listReminders).mockReturnValue([enqueuedReminder]);

    const result = await assistantOrchestratorService.runSystemTurn({
      trigger: {
        id: 'trigger-2',
        type: 'checkin',
        source: 'system',
        createdAt: '2026-04-27T10:00:00.000Z',
        text: 'check in'
      },
      currentDateTime: '2026-04-27T18:00:00+08:00',
      defaultDate: '2026-04-27',
      todayTimelineSummary: 'timeline'
    });

    expect(result.decision.decisionSummary).toContain('这次先不打扰：后续关注已经安排好了。');
    expect(result.decision.decisionSummary).toContain('新增了 1 条后续提醒');
    expect(result.decision.silentSideEffects).toEqual([
      '新增了 1 条后续提醒',
      '记录了最近决策摘要'
    ]);
  });

  it('persists background replies with display parts and uses persona title for notifications', async () => {
    localStorage.setItem('lumostime_ai_chat_sessions_v1', JSON.stringify([{
      id: 'session-1',
      title: '测试会话',
      createdAt: 1,
      updatedAt: 1,
      personaId: 'persona-1',
      contextCacheEnabled: true,
      messages: []
    }]));
    localStorage.setItem('lumostime_ai_chat_personas_v1', JSON.stringify([{
      id: 'persona-1',
      name: '赛博导师'
    }]));

    vi.mocked(assistantTurnService.runUnifiedTurn).mockResolvedValue({
      output: {
        mode: 'background',
        outcome: 'reply',
        assistantReply: '先去写提纲',
        assistantReplyParts: ['先去写提纲', '写完再回来告诉我'],
        memoryAction: 'no_update'
      },
      debug: debugExchange
    });

    const result = await assistantOrchestratorService.runSystemTurn({
      trigger: {
        id: 'trigger-3',
        type: 'checkin',
        source: 'system',
        createdAt: '2026-04-27T10:00:00.000Z',
        text: 'check in'
      },
      targetSessionId: 'session-1',
      showSystemNotification: true,
      currentDateTime: '2026-04-27T18:00:00+08:00',
      defaultDate: '2026-04-27',
      todayTimelineSummary: 'timeline'
    });

    expect(result.surfacedMessage).toBe('先去写提纲');
    expect(result.decision.messageParts).toEqual(['先去写提纲', '写完再回来告诉我']);

    const persistedSessions = JSON.parse(localStorage.getItem('lumostime_ai_chat_sessions_v1') || '[]');
    expect(persistedSessions).toHaveLength(1);
    expect(persistedSessions[0].messages).toHaveLength(1);
    expect(persistedSessions[0].messages[0].content).toBe('先去写提纲');
    expect(persistedSessions[0].messages[0].displayParts).toEqual(['先去写提纲', '写完再回来告诉我']);

    expect(AssistantAgent.showAssistantNotification).toHaveBeenCalledTimes(1);
    expect(AssistantAgent.showAssistantNotification).toHaveBeenCalledWith(expect.objectContaining({
      title: '赛博导师',
      body: '先去写提纲',
      targetSessionId: 'session-1'
    }));
    const history = assistantOrchestratorService.listBackgroundCallHistory();
    expect(history[0].triggerId).toBe('trigger-3');
    expect(history[0].debugExchange).toEqual(debugExchange);
  });
});
