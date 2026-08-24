/**
 * @file AIBackfillChatSessionHelpers.test.ts
 * @input Pure AI chat session helper functions
 * @output Regression coverage for conversation-history helper behavior
 * @pos Component Support Test (AI Integration)
 * @description Verifies that shared AI chat session helpers preserve the turn metadata needed by foreground prompts and native background snapshots.
 * @updated 2026-08-24: Added retry-history coverage so replaced replies never become prompt context.
 */

import { describe, expect, it } from 'vitest';
import type { AIConversationTurn } from '../../services/aiService';
import {
  buildRetryConversationHistory,
  serializeConversationTurnsForAssistantContext
} from './AIBackfillChatSessionHelpers';

describe('serializeConversationTurnsForAssistantContext', () => {
  it('keeps createdAt timestamps so native background snapshots retain time-aware conversation context', () => {
    const history: AIConversationTurn[] = [
      {
        role: 'user',
        content: '昨天那个事情先放一下',
        createdAt: '2026-05-20T09:30:00+08:00'
      },
      {
        role: 'assistant',
        content: '好，我先记成背景线索。',
        createdAt: '2026-05-20T09:31:00+08:00'
      }
    ];

    expect(serializeConversationTurnsForAssistantContext(history)).toEqual(history);
  });

  it('omits blank createdAt fields without dropping the turn itself', () => {
    const history: AIConversationTurn[] = [
      {
        role: 'user',
        content: '现在说新的事情',
        createdAt: '   '
      }
    ];

    expect(serializeConversationTurnsForAssistantContext(history)).toEqual([
      {
        role: 'user',
        content: '现在说新的事情'
      }
    ]);
  });

  it('excludes the original user turn and replaced reply from retry context', () => {
    const history = buildRetryConversationHistory({
      buildConversationHistoryFromMessages: (_session, messages) => messages.map((message) => ({
        role: message.role,
        content: message.content
      })),
      conversationHistoryCache: new Map(),
      retrySourceUserMessageId: 'user-current',
      sessionId: 'session-1',
      sessions: [{
        id: 'session-1',
        title: 'Test',
        personaId: 'persona-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [
          { id: 'user-earlier', role: 'user', content: 'Earlier question', createdAt: 1 },
          { id: 'assistant-earlier', role: 'assistant', content: 'Earlier reply', createdAt: 2 },
          { id: 'user-current', role: 'user', content: 'Retry this question', createdAt: 3 },
          { id: 'assistant-current', role: 'assistant', content: 'Old reply', createdAt: 4, retryInput: 'Retry this question' }
        ]
      }] as any
    });

    expect(history).toEqual([
      { role: 'user', content: 'Earlier question' },
      { role: 'assistant', content: 'Earlier reply' }
    ]);
  });
});
