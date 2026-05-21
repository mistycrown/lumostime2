/**
 * @file AIBackfillChatSessionHelpers.test.ts
 * @input Pure AI chat session helper functions
 * @output Regression coverage for conversation-history helper behavior
 * @pos Component Support Test (AI Integration)
 * @description Verifies that shared AI chat session helpers preserve the turn metadata needed by foreground prompts and native background snapshots.
 */

import { describe, expect, it } from 'vitest';
import type { AIConversationTurn } from '../../services/aiService';
import { serializeConversationTurnsForAssistantContext } from './AIBackfillChatSessionHelpers';

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
});
