/**
 * @file useAIBackfillChatQuickAddHandlers.test.ts
 * @input Synthetic quick-add responses and local activity dictionaries
 * @output Integration coverage from quick-add activity resolution through validated log writeback
 * @pos Component support test
 * @updated 2026-10-06: Verifies attribute values survive ID and name-based activity matching.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Category, Log } from '../../types';
import type { AIDebugExchange } from '../../services/aiService';
import { quickAddService } from '../../services/quickAddService';
import { assistantActionExecutor } from '../../services/assistantActionExecutor';
import { assistantContextBuilder } from '../../services/assistantContextBuilder';
import { prepareForegroundTurn } from './AIBackfillChatForegroundTurn';
import { useAIBackfillChatQuickAddHandlers, type AIBackfillChatQuickAddHandlerOptions } from './useAIBackfillChatQuickAddHandlers';

afterEach(() => vi.restoreAllMocks());

describe('quick-add backfill attributes', () => {
  it.each(['ids', 'names'] as const)('preserves attributes after resolving an activity by %s', async (matching) => {
    const categories: Category[] = [{ id: 'sport', name: '运动', icon: 'R', themeColor: '#675e50', activities: [{
      id: 'running', name: '跑步', icon: 'R', color: '#675e50', attributes: [
        { id: 'distance', name: '距离', type: 'number', unit: 'km', order: 0, createdAt: 1, updatedAt: 1 }
      ]
    }] }];
    const attributeValues = [{ attributeId: 'distance', value: 5 }];
    vi.spyOn(quickAddService, 'requestQuickAddBackfillWithDebug').mockResolvedValue({
      toolCall: { toolName: 'create_log', args: {
        date: '2026-10-06', startTime: '07:00', endTime: '08:00', description: '跑步五公里',
        ...(matching === 'ids' ? { categoryId: 'sport', activityId: 'running' } : { categoryName: '运动', activityName: '跑步' }),
        attributeValues
      } }, debug: {} as AIDebugExchange
    });
    let savedLogs: Log[] = [];
    const replacePendingWithResult = vi.fn();
    const options: AIBackfillChatQuickAddHandlerOptions = {
      activeRequestRef: { current: null },
      activeSession: { id: 'session', title: 'Test', createdAt: 1, updatedAt: 1, personaId: 'test', contextCacheEnabled: false, messages: [] },
      categories, defaultDateKey: '2026-10-06', debugMode: false, conversationHistoryCache: new Map(),
      applyPlannedLogToolCalls: (calls) => {
        const result = assistantActionExecutor.applyLogToolCalls({
          categories, defaultDateKey: '2026-10-06', logs: [], todos: [], scopes: [], todoCategories: [],
          autoApplyAutoLinkRules: false, autoLinkRules: []
        }, calls);
        savedLogs = result.nextLogs;
        return result.actions;
      },
      applyQuickAddNoteToolCalls: () => [], applyTodoAndPlannedTimelineLogToolCalls: () => [],
      buildAssistantDictionaryContext: () => assistantContextBuilder.buildDictionaryContext({ categories }),
      buildAssistantStateContext: () => ({ currentDateTime: '2026-10-06T08:00:00+08:00' }),
      buildQuickAddNoteDictionaryContext: () => ({}), buildRetryConversationHistory: () => [],
      createSessionTitleFromUserMessage: (message) => message, getErrorDebugSections: () => [],
      getRetryableAIErrorMessage: () => 'failed', isAbortError: () => false,
      mutateSession: vi.fn(), notifyAssistantTaskStateChanged: vi.fn(), prepareForegroundTurn, replacePendingWithResult,
      setActiveRequestId: vi.fn(), setInputText: vi.fn(), setIsHistoryPanelOpen: vi.fn(), setIsLoading: vi.fn(), setIsPersonaPanelOpen: vi.fn()
    };
    // This orchestration helper uses supplied state adapters and has no React hooks of its own.
    await useAIBackfillChatQuickAddHandlers(options).handleQuickAddBackfill('跑步五公里', '/补记 跑步五公里');
    expect(savedLogs[0]).toMatchObject({ categoryId: 'sport', activityId: 'running', attributeValues });
    expect(replacePendingWithResult).toHaveBeenCalledWith('session', expect.any(String), '已添加补记', expect.objectContaining({
      appliedActions: [expect.objectContaining({ status: 'applied', snapshot: expect.objectContaining({ attributeValues }) })]
    }));
  });
});
