import { describe, expect, it } from 'vitest';
import {
  getLatestAssistantBackgroundUserMessageAt,
  isOrdinaryAssistantBackgroundSession,
  resolveLatestOrdinaryAssistantBackgroundSession,
  type AssistantBackgroundSessionLike
} from './assistantBackgroundSessionUtils';

const buildSession = (overrides: Partial<AssistantBackgroundSessionLike>): AssistantBackgroundSessionLike => ({
  id: overrides.id || 'session',
  updatedAt: overrides.updatedAt ?? 0,
  messages: overrides.messages || [],
  ...(overrides.templateMeta !== undefined ? { templateMeta: overrides.templateMeta } : {})
});

describe('assistantBackgroundSessionUtils', () => {
  it('treats sessions without template metadata as ordinary conversations', () => {
    expect(isOrdinaryAssistantBackgroundSession(buildSession({}))).toBe(true);
    expect(isOrdinaryAssistantBackgroundSession(buildSession({
      templateMeta: { templateType: 'weekly_review' }
    }))).toBe(false);
  });

  it('returns the latest user-authored message timestamp within one session', () => {
    expect(getLatestAssistantBackgroundUserMessageAt(buildSession({
      messages: [
        { role: 'assistant', createdAt: 30 },
        { role: 'user', createdAt: 10 },
        { role: 'user', createdAt: 20 }
      ]
    }))).toBe(20);

    expect(getLatestAssistantBackgroundUserMessageAt(buildSession({
      messages: [{ role: 'assistant', createdAt: 30 }]
    }))).toBeNull();
  });

  it('selects only ordinary conversations and ranks them by latest user activity', () => {
    const selected = resolveLatestOrdinaryAssistantBackgroundSession([
      buildSession({
        id: 'template-session',
        updatedAt: 500,
        templateMeta: { templateType: 'weekly_review' },
        messages: [{ role: 'user', createdAt: 500 }]
      }),
      buildSession({
        id: 'assistant-only-session',
        updatedAt: 400,
        messages: [{ role: 'assistant', createdAt: 400 }]
      }),
      buildSession({
        id: 'older-user-session',
        updatedAt: 900,
        messages: [{ role: 'user', createdAt: 200 }]
      }),
      buildSession({
        id: 'newest-user-session',
        updatedAt: 300,
        messages: [
          { role: 'assistant', createdAt: 250 },
          { role: 'user', createdAt: 800 }
        ]
      })
    ]);

    expect(selected?.id).toBe('newest-user-session');
  });

  it('returns undefined when no ordinary conversation contains user activity', () => {
    expect(resolveLatestOrdinaryAssistantBackgroundSession([
      buildSession({
        id: 'template-session',
        templateMeta: { templateType: 'weekly_review' },
        messages: [{ role: 'user', createdAt: 100 }]
      }),
      buildSession({
        id: 'assistant-only-session',
        messages: [{ role: 'assistant', createdAt: 200 }]
      })
    ])).toBeUndefined();
  });
});
