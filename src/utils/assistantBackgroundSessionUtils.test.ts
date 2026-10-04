/**
 * @file assistantBackgroundSessionUtils.test.ts
 * @input Ordinary, template, and background-created chat fixtures
 * @output Regression coverage for background conversation selection
 * @pos Test (Assistant Background Sessions)
 * @updated 2026-10-04: Covers background conversation reuse while prioritizing real user activity.
 */
import { describe, expect, it } from 'vitest';
import {
  getLatestAssistantBackgroundUserMessageAt,
  isOrdinaryAssistantBackgroundSession,
  resolveAssistantBackgroundSession,
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
  it('reuses background replies only when no user-active conversation remains', () => {
    const background = buildSession({
      id: 'background', updatedAt: 300,
      messages: [{ role: 'assistant', createdAt: 300, backgroundDebugHistoryId: 'call-1' }]
    });
    const ordinary = buildSession({
      id: 'ordinary', updatedAt: 100,
      messages: [{ role: 'user', createdAt: 100 }]
    });
    expect(resolveAssistantBackgroundSession([background])).toBe(background);
    expect(resolveAssistantBackgroundSession([background, ordinary])).toBe(ordinary);
    expect(resolveAssistantBackgroundSession([
      { ...background, templateMeta: { templateType: 'weekly_review' } },
      buildSession({ id: 'empty' }),
      buildSession({ id: 'assistant-only', messages: [{ role: 'assistant', createdAt: 500 }] })
    ])).toBeUndefined();
  });

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
