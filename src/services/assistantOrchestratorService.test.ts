import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssistantMemory, AssistantNativeDiagnosticEntry, AssistantReminder } from '../types/assistant';

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
        assistantReply: '先去写提纲\n\n写完再回来告诉我',
        reasoning: {
          parts: [{
            text: '先判断用户更需要一句短提醒。'
          }]
        },
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

    expect(result.surfacedMessage).toBe('先去写提纲\n\n写完再回来告诉我');
    expect(result.decision.messageParts).toEqual(['先去写提纲', '写完再回来告诉我']);

    const persistedSessions = JSON.parse(localStorage.getItem('lumostime_ai_chat_sessions_v1') || '[]');
    expect(persistedSessions).toHaveLength(1);
    expect(persistedSessions[0].messages).toHaveLength(1);
    expect(persistedSessions[0].messages[0].content).toBe('先去写提纲\n\n写完再回来告诉我');
    expect(persistedSessions[0].messages[0].reasoning).toEqual({
      parts: [{
        text: '先判断用户更需要一句短提醒。'
      }]
    });
    expect(persistedSessions[0].messages[0].displayParts).toEqual(['先去写提纲', '写完再回来告诉我']);

    expect(AssistantAgent.showAssistantNotification).toHaveBeenCalledTimes(1);
    expect(AssistantAgent.showAssistantNotification).toHaveBeenCalledWith(expect.objectContaining({
      title: '赛博导师',
      body: '先去写提纲\n\n写完再回来告诉我',
      targetSessionId: 'session-1'
    }));
    const history = assistantOrchestratorService.listBackgroundCallHistory();
    expect(history[0].triggerId).toBe('trigger-3');
    expect(history[0].debugExchange).toEqual(debugExchange);
  });

  it('falls back only to the latest ordinary conversation with a real user turn', async () => {
    localStorage.setItem('lumostime_ai_chat_sessions_v1', JSON.stringify([
      {
        id: 'template-session',
        title: '周复盘',
        createdAt: 1,
        updatedAt: 999,
        personaId: 'persona-template',
        contextCacheEnabled: true,
        templateMeta: {
          templateType: 'weekly_review'
        },
        messages: [
          {
            id: 'template-user',
            role: 'user',
            content: '写一下这周复盘',
            createdAt: 999
          }
        ]
      },
      {
        id: 'assistant-only-session',
        title: '系统回灌',
        createdAt: 1,
        updatedAt: 800,
        personaId: 'persona-assistant-only',
        contextCacheEnabled: true,
        messages: [
          {
            id: 'assistant-only',
            role: 'assistant',
            content: '我在。',
            createdAt: 800
          }
        ]
      },
      {
        id: 'ordinary-session',
        title: '普通对话',
        createdAt: 1,
        updatedAt: 700,
        personaId: 'persona-normal',
        contextCacheEnabled: true,
        messages: [
          {
            id: 'ordinary-user',
            role: 'user',
            content: '我先去写方案',
            createdAt: 700
          }
        ]
      }
    ]));

    vi.mocked(assistantTurnService.runUnifiedTurn).mockResolvedValue({
      output: {
        mode: 'background',
        outcome: 'reply',
        assistantReply: '写完了回来告诉我。',
        memoryAction: 'no_update'
      },
      debug: debugExchange
    });

    await assistantOrchestratorService.runSystemTurn({
      trigger: {
        id: 'trigger-fallback-session',
        type: 'checkin',
        source: 'system',
        createdAt: '2026-04-27T10:00:00.000Z',
        text: 'check in'
      },
      currentDateTime: '2026-04-27T18:00:00+08:00',
      defaultDate: '2026-04-27',
      todayTimelineSummary: 'timeline'
    });

    const persistedSessions = JSON.parse(localStorage.getItem('lumostime_ai_chat_sessions_v1') || '[]');
    expect(persistedSessions.find((session: any) => session.id === 'ordinary-session')?.messages).toHaveLength(2);
    expect(persistedSessions.find((session: any) => session.id === 'ordinary-session')?.messages[1]?.content).toBe('写完了回来告诉我。');
    expect(persistedSessions.find((session: any) => session.id === 'template-session')?.messages).toHaveLength(1);
    expect(persistedSessions.find((session: any) => session.id === 'assistant-only-session')?.messages).toHaveLength(1);
  });

  it('hydrates native completed replies into persisted chat sessions only once', () => {
    localStorage.setItem('lumostime_ai_chat_sessions_v1', JSON.stringify([{
      id: 'session-1',
      title: '测试会话',
      createdAt: 1,
      updatedAt: 1,
      personaId: 'persona-1',
      contextCacheEnabled: true,
      messages: []
    }]));

    const diagnostics: AssistantNativeDiagnosticEntry[] = [{
      id: 'diagnostic-1',
      type: 'native_request_completed',
      level: 'success',
      createdAt: '2026-05-01T09:34:54.830+08:00',
      message: 'Native background AI request completed',
      triggerId: 'native-trigger-1',
      triggerType: 'checkin',
      context: {
        requestedAt: '2026-05-01T09:34:50.519+08:00',
        completedAt: '2026-05-01T09:34:54.830+08:00',
        assistantReply: '距离上次说话已经过去 9 小时了。还在吗？',
        decisionSummary: '用户 9 小时未回复，发送简短确认消息。',
        requestProvider: 'openai',
        requestModel: 'gpt-test',
        requestUrl: 'https://example.test/v1/chat/completions',
        requestMethod: 'POST',
        requestBodyJson: JSON.stringify({
          model: 'gpt-test',
          messages: [
            { role: 'system', content: '=== Assistant Base Prompt ===\nbase prompt' },
            { role: 'user', content: '=== Trigger ===\n{\n  "type": "checkin"\n}' }
          ],
          response_format: { type: 'json_object' }
        }),
        responseStatus: '200',
        responseBodyJson: JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                outcome: 'reply',
                assistantReply: '距离上次说话已经过去 9 小时了。还在吗？',
                decisionSummary: '用户 9 小时未回复，发送简短确认消息。'
              })
            }
          }]
        })
      }
    }];

    const firstHydration = assistantOrchestratorService.hydrateNativeCompletedReplies(diagnostics, {
      targetSessionId: 'session-1'
    });
    const secondHydration = assistantOrchestratorService.hydrateNativeCompletedReplies(diagnostics, {
      targetSessionId: 'session-1'
    });

    expect(firstHydration.surfacedMessages).toEqual(['距离上次说话已经过去 9 小时了。还在吗？']);
    expect(secondHydration.surfacedMessages).toEqual([]);

    const persistedSessions = JSON.parse(localStorage.getItem('lumostime_ai_chat_sessions_v1') || '[]');
    expect(persistedSessions).toHaveLength(1);
    expect(persistedSessions[0].messages).toHaveLength(1);
    expect(persistedSessions[0].messages[0].content).toBe('距离上次说话已经过去 9 小时了。还在吗？');

    const history = assistantOrchestratorService.listBackgroundCallHistory();
    expect(history).toHaveLength(1);
    expect(history[0].triggerId).toBe('native-trigger-1');
    expect(history[0].targetSessionId).toBe('session-1');
    expect(history[0].action).toBe('send_message');
    expect(history[0].message).toBe('距离上次说话已经过去 9 小时了。还在吗？');
    expect(history[0].debugExchange?.provider).toBe('openai');
    expect(history[0].debugExchange?.request.url).toBe('https://example.test/v1/chat/completions');
    expect((history[0].debugExchange?.request.body as any)?.messages?.[0]?.content).toContain('=== Assistant Base Prompt ===');
  });

  it('shows a system notification for hydrated native replies when requested', () => {
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

    const diagnostics: AssistantNativeDiagnosticEntry[] = [{
      id: 'diagnostic-notify-1',
      type: 'native_request_completed',
      level: 'success',
      createdAt: '2026-05-01T10:00:00.000+08:00',
      message: 'Native background AI request completed',
      triggerId: 'native-trigger-notify-1',
      triggerType: 'checkin',
      context: {
        requestedAt: '2026-05-01T09:59:58.000+08:00',
        completedAt: '2026-05-01T10:00:00.000+08:00',
        assistantReply: '记得回来告诉我进展。',
        decisionSummary: '发出一条简短跟进提醒。'
      }
    }];

    assistantOrchestratorService.hydrateNativeCompletedReplies(diagnostics, {
      targetSessionId: 'session-1',
      showSystemNotification: true
    });

    expect(AssistantAgent.showAssistantNotification).toHaveBeenCalledTimes(1);
    expect(AssistantAgent.showAssistantNotification).toHaveBeenCalledWith(expect.objectContaining({
      title: '赛博导师',
      body: '记得回来告诉我进展。',
      targetSessionId: 'session-1'
    }));
  });

  it('ignores null-like native assistant replies during hydration', () => {
    localStorage.setItem('lumostime_ai_chat_sessions_v1', JSON.stringify([{
      id: 'session-1',
      title: '测试会话',
      createdAt: 1,
      updatedAt: 1,
      personaId: 'persona-1',
      contextCacheEnabled: true,
      messages: []
    }]));

    const diagnostics: AssistantNativeDiagnosticEntry[] = [{
      id: 'diagnostic-null-1',
      type: 'native_request_completed',
      level: 'success',
      createdAt: '2026-05-01T11:53:00.000+08:00',
      message: 'Native background AI request completed',
      triggerId: 'native-trigger-null-1',
      triggerType: 'checkin',
      context: {
        requestedAt: '2026-05-01T11:52:58.000+08:00',
        completedAt: '2026-05-01T11:53:00.000+08:00',
        assistantReply: 'null',
        decisionSummary: 'null'
      }
    }];

    const hydration = assistantOrchestratorService.hydrateNativeCompletedReplies(diagnostics, {
      targetSessionId: 'session-1'
    });

    expect(hydration.surfacedMessages).toEqual([]);

    const persistedSessions = JSON.parse(localStorage.getItem('lumostime_ai_chat_sessions_v1') || '[]');
    expect(persistedSessions[0].messages).toHaveLength(0);

    const history = assistantOrchestratorService.listBackgroundCallHistory();
    expect(history).toHaveLength(1);
    expect(history[0].action).toBe('silent');
    expect(history[0].message).toBeUndefined();
  });

  it('applies native memory patches and decision summaries during hydration', () => {
    localStorage.setItem('lumostime_ai_chat_sessions_v1', JSON.stringify([{
      id: 'session-1',
      title: '测试会话',
      createdAt: 1,
      updatedAt: 1,
      personaId: 'persona-1',
      contextCacheEnabled: true,
      messages: []
    }]));

    const diagnostics: AssistantNativeDiagnosticEntry[] = [{
      id: 'diagnostic-memory-1',
      type: 'native_request_completed',
      level: 'success',
      createdAt: '2026-05-01T12:00:00.000+08:00',
      message: 'Native background AI request completed',
      triggerId: 'native-trigger-memory-1',
      triggerType: 'checkin',
      context: {
        requestedAt: '2026-05-01T11:59:58.000+08:00',
        completedAt: '2026-05-01T12:00:00.000+08:00',
        assistantReply: '我记住你刚刚在处理电脑恢复后的状态了。',
        decisionSummary: '记录了用户刚恢复电脑、当前在重连工作流。',
        memoryAction: 'update_memory',
        memoryPatch: JSON.stringify({
          lastKnownState: '刚处理完电脑恢复，正在回到工作流。',
          workingMemorySummary: '需要重新接续中断前的任务。',
          recentDecisions: ['优先帮助用户恢复上下文']
        })
      }
    }];

    const hydration = assistantOrchestratorService.hydrateNativeCompletedReplies(diagnostics, {
      targetSessionId: 'session-1'
    });

    expect(hydration.surfacedMessages).toEqual(['我记住你刚刚在处理电脑恢复后的状态了。']);
    expect(hydration.didUpdateMemory).toBe(true);
    expect(assistantMemoryService.applyPatch).toHaveBeenCalledWith({
      lastKnownState: '刚处理完电脑恢复，正在回到工作流。',
      workingMemorySummary: '需要重新接续中断前的任务。',
      recentDecisions: ['优先帮助用户恢复上下文']
    });
    expect(assistantMemoryService.appendDecisionSummary).toHaveBeenCalledWith('记录了用户刚恢复电脑、当前在重连工作流。');

    const persistedSessions = JSON.parse(localStorage.getItem('lumostime_ai_chat_sessions_v1') || '[]');
    expect(persistedSessions[0].messages).toHaveLength(1);
    expect(persistedSessions[0].messages[0].memoryUpdates).toEqual([
      { label: '当前状态', items: ['还在写东西'] }
    ]);

    const history = assistantOrchestratorService.listBackgroundCallHistory();
    expect(history[0].memoryAction).toBe('update_memory');
    expect(history[0].decisionSummary).toBe('记录了用户刚恢复电脑、当前在重连工作流。');
  });

  it('marks native hydration as memory-updated even when the patch produces no visible diff sections', () => {
    localStorage.setItem('lumostime_ai_chat_sessions_v1', JSON.stringify([{
      id: 'session-1',
      title: '测试会话',
      createdAt: 1,
      updatedAt: 1,
      personaId: 'persona-1',
      contextCacheEnabled: true,
      messages: []
    }]));

    vi.mocked(assistantMemoryService.getMemory).mockReturnValue({
      ...baseMemory,
      lastKnownState: '用户可能已经休息了'
    });
    vi.mocked(assistantMemoryService.applyPatch).mockReturnValue({
      ...baseMemory,
      lastKnownState: '用户可能已经休息了'
    });

    const diagnostics: AssistantNativeDiagnosticEntry[] = [{
      id: 'diagnostic-memory-2',
      type: 'native_request_completed',
      level: 'success',
      createdAt: '2026-05-01T12:10:00.000+08:00',
      message: 'Native background AI request completed',
      triggerId: 'native-trigger-memory-2',
      triggerType: 'checkin',
      context: {
        requestedAt: '2026-05-01T12:09:58.000+08:00',
        completedAt: '2026-05-01T12:10:00.000+08:00',
        memoryAction: 'update_memory',
        memoryPatch: JSON.stringify({
          lastKnownState: '用户可能已经休息了'
        }),
        decisionSummary: '确认当前仍应视为休息时段。'
      }
    }];

    const hydration = assistantOrchestratorService.hydrateNativeCompletedReplies(diagnostics, {
      targetSessionId: 'session-1'
    });

    expect(hydration.didUpdateMemory).toBe(true);
    expect(assistantMemoryService.applyPatch).toHaveBeenCalledWith({
      lastKnownState: '用户可能已经休息了'
    });
    expect(assistantMemoryService.appendDecisionSummary).toHaveBeenCalledWith('确认当前仍应视为休息时段。');
  });
});
