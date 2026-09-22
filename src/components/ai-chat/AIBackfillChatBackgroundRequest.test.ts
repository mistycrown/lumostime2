/**
 * @file AIBackfillChatBackgroundRequest.test.ts
 * @input A representative background state context and trigger
 * @output Regression coverage for optional background request fields
 * @pos Component Support Test (AI Background Workflow)
 * @description Verifies that background request assembly keeps required fields and omits empty optional prompt sections.
 * @updated 2026-09-22: Added coverage for extracted background request assembly.
 */

import { describe, expect, it } from 'vitest';
import { buildAssistantBackgroundTurnRequest } from './AIBackfillChatBackgroundRequest';

describe('buildAssistantBackgroundTurnRequest', () => {
  it('maps state context fields and omits blank optional values', () => {
    const request = buildAssistantBackgroundTurnRequest({
      trigger: {
        id: 'trigger-1',
        type: 'checkin',
        source: 'system',
        text: 'Check in',
        createdAt: '2026-09-22T10:00:00+08:00'
      },
      targetSessionId: 'session-1',
      showSystemNotification: false,
      stateContext: {
        currentDateTime: '2026-09-22T10:00:00+08:00',
        stateContextDate: '2026-09-22',
        timelineSummaryForDate: 'Today',
        timelineSummaryForPreviousDate: '',
        overdueTodoSummary: 'One overdue'
      },
      reminderSummary: '',
      userPersonaPrompt: 'Be concise',
      dictionaryContext: { categories: [] } as any,
      conversationHistory: [{ role: 'user', content: 'Hello' }]
    });

    expect(request).toMatchObject({
      targetSessionId: 'session-1',
      currentDateTime: '2026-09-22T10:00:00+08:00',
      defaultDate: '2026-09-22',
      todayTimelineSummary: 'Today',
      overdueTodoSummary: 'One overdue',
      userPersonaPrompt: 'Be concise'
    });
    expect(request).not.toHaveProperty('reminderSummary');
    expect(request).not.toHaveProperty('yesterdayTimelineSummary');
  });

  it('only enables persisted debug output when requested', () => {
    const request = buildAssistantBackgroundTurnRequest({
      trigger: {
        type: 'checkin',
        source: 'system',
        text: 'Check in',
        createdAt: '2026-09-22T10:00:00+08:00'
      },
      showSystemNotification: true,
      stateContext: {
        currentDateTime: 'now',
        stateContextDate: 'today'
      },
      includeDebugInPersistedMessage: true
    });

    expect(request.includeDebugInPersistedMessage).toBe(true);
  });
});
