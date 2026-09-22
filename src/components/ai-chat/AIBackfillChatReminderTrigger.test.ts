/**
 * @file AIBackfillChatReminderTrigger.test.ts
 * @input A due assistant reminder and a fixed dispatch time
 * @output Regression coverage for reminder trigger metadata
 * @pos Component Support Test (AI Reminder Workflow)
 * @description Verifies trigger identity, delay calculation, and retry-attempt propagation.
 * @updated 2026-09-22: Added coverage for extracted reminder trigger construction.
 */

import { describe, expect, it } from 'vitest';
import { buildAssistantReminderDueTrigger } from './AIBackfillChatReminderTrigger';

describe('buildAssistantReminderDueTrigger', () => {
  it('preserves reminder identity and computes dispatch delay', () => {
    const trigger = buildAssistantReminderDueTrigger({
      id: 'reminder-1',
      type: 'self_followup',
      dueAt: '2026-09-22T09:50:00+08:00',
      status: 'pending',
      text: 'Review the plan',
      source: 'user',
      createdAt: '2026-09-22T09:00:00+08:00',
      dispatchAttemptCount: 2
    }, new Date('2026-09-22T10:05:00+08:00'));

    expect(trigger.id).toMatch(/^reminder_due:reminder-1:\d+$/);
    expect(trigger.type).toBe('reminder_due');
    expect(trigger.text).toBe('Review the plan');
    expect(trigger.metadata).toMatchObject({
      reminderId: 'reminder-1',
      reminderType: 'self_followup',
      delayMinutes: 15,
      dispatchAttemptCount: 2
    });
  });
});
