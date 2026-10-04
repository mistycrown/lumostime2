/**
 * @file AIBackfillChatBackgroundRecovery.test.ts
 * @input Background dispatch callbacks with a deleted conversation target
 * @output Regression coverage for reminder and system-trigger delivery without an existing chat
 * @pos Test (AI Background Workflow)
 * @updated 2026-10-04: Verifies triggers reach the orchestrator and use the recovered notification destination.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('react', () => ({ useCallback: (callback: unknown) => callback }));

import { useAIBackfillChatBackgroundDispatch } from './useAIBackfillChatBackgroundDispatch';
import { useAIBackfillChatBackgroundTriggers } from './useAIBackfillChatBackgroundTriggers';

const createOptions = () => ({
  assistantAgentConfig: { enabled: true },
  isAssistantBackgroundContextReady: true,
  getBackgroundTargetSession: vi.fn(() => undefined),
  conversationHistoryCache: new Map(),
  processingDueReminderIdsRef: { current: new Set() },
  processingAssistantTriggerIdsRef: { current: new Set() },
  handledAssistantTriggerIdsRef: { current: new Set() },
  assistantOrchestratorService: {
    runSystemTurn: vi.fn().mockResolvedValue({
      surfacedMessage: 'Reminder', targetSessionId: 'recovered-session', persistedMessageId: 'recovered-message'
    })
  },
  assistantReminderQueueService: { recordDispatchAttempt: vi.fn() },
  assistantScheduledTaskService: { consumeTriggeredReminder: vi.fn() },
  AssistantAgent: { acknowledgeSystemTrigger: vi.fn().mockResolvedValue(undefined) },
  buildBackgroundTurnRequest: vi.fn((request) => request),
  buildAssistantReminderDueTrigger: vi.fn((reminder) => ({ type: 'reminder_due', metadata: { reminderId: reminder.id } })),
  shouldShowBackgroundSystemNotification: vi.fn(() => true),
  reloadPersistedChatSessions: vi.fn(),
  syncAssistantScheduledTasks: vi.fn(),
  refreshAssistantMemorySnapshot: vi.fn(),
  refreshAssistantNativeDiagnostics: vi.fn(),
  isOpenRef: { current: false },
  onUnreadAssistantMessage: vi.fn(),
  getBackgroundPersonaDisplayName: vi.fn(() => 'AI'),
  addToast: vi.fn()
});

describe('background delivery after conversation deletion', () => {
  it('dispatches a due reminder without a target and surfaces its recovered location', async () => {
    const options = createOptions();
    const { dispatchDueReminder } = useAIBackfillChatBackgroundDispatch(options);
    dispatchDueReminder({ id: 'reminder-1', text: 'Reminder' } as any);
    await vi.waitFor(() => expect(options.processingDueReminderIdsRef.current.size).toBe(0));
    expect(options.assistantOrchestratorService.runSystemTurn).toHaveBeenCalledWith(expect.objectContaining({
      targetSession: undefined, conversationHistory: []
    }));
    expect(options.onUnreadAssistantMessage).toHaveBeenCalledWith(1, {
      targetSessionId: 'recovered-session', targetMessageId: 'recovered-message'
    });
    expect(options.assistantScheduledTaskService.consumeTriggeredReminder).toHaveBeenCalledWith('reminder-1', expect.any(String));
  });

  it('handles and acknowledges a check-in even when its conversation was deleted', async () => {
    const options = createOptions();
    const { handleAssistantSystemTrigger } = useAIBackfillChatBackgroundTriggers(options);
    await handleAssistantSystemTrigger({
      id: 'trigger-1', type: 'checkin', source: 'system', text: 'Check in', createdAt: new Date().toISOString()
    });
    expect(options.assistantOrchestratorService.runSystemTurn).toHaveBeenCalledWith(expect.objectContaining({
      targetSession: undefined, conversationHistory: []
    }));
    expect(options.AssistantAgent.acknowledgeSystemTrigger).toHaveBeenCalledWith({ id: 'trigger-1' });
    expect(options.onUnreadAssistantMessage).toHaveBeenCalledWith(1, {
      targetSessionId: 'recovered-session', targetMessageId: 'recovered-message'
    });
    expect(options.processingAssistantTriggerIdsRef.current.size).toBe(0);
  });

  it('sends a submitted log and its reply to the recovered conversation', async () => {
    const base = createOptions();
    const session = {
      id: 'recovered-session', title: 'Chat', createdAt: 1, updatedAt: 1,
      personaId: 'builtin-default', contextCacheEnabled: true,
      messages: [{ id: 'log-message', role: 'user', content: 'Completed a log', createdAt: 1 }]
    };
    const options = {
      ...base,
      assistantOrchestratorService: {
        ...base.assistantOrchestratorService,
        persistBackgroundUserMessage: vi.fn(() => ({ sessionId: session.id, messageId: 'log-message' }))
      },
      reloadPersistedChatSessions: vi.fn(() => [session]),
      matchesAssistantLogSubmissionTrigger: vi.fn(() => true),
      upsertLogForAssistantContext: vi.fn(() => []),
      buildAssistantLogSubmissionUserMessage: vi.fn(() => 'Completed a log'),
      buildAssistantLogSubmissionTrigger: vi.fn(() => ({ id: 'log-trigger', type: 'log_submitted' })),
      buildConversationHistoryFromMessages: vi.fn(() => [])
    };
    const { handleAssistantLogSubmittedEvent } = useAIBackfillChatBackgroundTriggers(options);
    await handleAssistantLogSubmittedEvent({ detail: { log: { id: 'log-1' } } } as any);
    expect(options.assistantOrchestratorService.persistBackgroundUserMessage).toHaveBeenCalledWith('Completed a log', undefined);
    expect(options.assistantOrchestratorService.runSystemTurn).toHaveBeenCalledWith(expect.objectContaining({ targetSession: session }));
    expect(options.buildConversationHistoryFromMessages).toHaveBeenCalledWith(session, session.messages);
  });
});
