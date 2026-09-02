/**
 * @file assistant-background-reminder.test.ts
 * @input Android assistant service and pending-trigger store source files
 * @output Regression coverage for the native reminder execution/fallback contract
 * @pos Test (Android Assistant Background Reminder)
 * @description Locks the Android source-level lifecycle invariants that cannot be exercised by the Web Vitest environment without compiling the native project.
 * @updated 2026-09-02: Added native success-consumption, failure-retention, Web fallback, alarm scheduling, and fallback dedup assertions.
 */

import { describe, expect, it } from 'vitest';

const { readFileSync } = process.getBuiltinModule('node:fs') as typeof import('node:fs');

const serviceSource = readFileSync(
  new URL('../android/app/src/main/java/com/mistycrown/lumostime/AssistantAgentService.java', import.meta.url),
  'utf8'
);
const pendingTriggerStoreSource = readFileSync(
  new URL('../android/app/src/main/java/com/mistycrown/lumostime/AssistantPendingTriggerStore.java', import.meta.url),
  'utf8'
);

const extractMethod = (source: string, signature: string, nextSignature: string): string => {
  const start = source.indexOf(signature);
  const end = source.indexOf(nextSignature, start + signature.length);
  if (start < 0 || end < 0) {
    throw new Error(`Unable to extract source between ${signature} and ${nextSignature}`);
  }
  return source.slice(start, end);
};

describe('Android assistant background reminder source contract', () => {
  const dispatchMethod = extractMethod(
    serviceSource,
    'private void dispatchDueNativeReminders',
    'private com.getcapacitor.JSObject buildReminderTriggerMetadata'
  );
  const scheduleMethod = extractMethod(
    serviceSource,
    'private void scheduleNextReminderDispatch',
    'private void scheduleNextAssistantLetterDispatch'
  );

  it('consumes a native reminder only from the successful request callback', () => {
    const completedBlock = extractMethod(dispatchMethod, 'public void onCompleted()', 'public void onFailed()');
    const failedBlock = dispatchMethod.slice(dispatchMethod.indexOf('public void onFailed()'));

    expect(dispatchMethod).toContain('AssistantNativeBackgroundExecutor.executeAsync');
    expect(completedBlock).toContain('AssistantNativeReminderStore.markDispatched');
    expect(failedBlock).not.toContain('AssistantNativeReminderStore.markDispatched');
  });

  it('keeps a persistent Web fallback when native AI execution is unavailable', () => {
    expect(dispatchMethod).toContain('AssistantAgentPlugin.dispatchSystemTrigger');
    expect(dispatchMethod).toContain('native_ai_unavailable');
    expect(dispatchMethod).toContain('buildReminderTriggerMetadata');
  });

  it('runs scheduled assistant letters through the native executor before consuming them', () => {
    expect(serviceSource).toContain('nativeLetterRequestInFlight');
    expect(serviceSource).toContain('"assistant_letter_due"');
    expect(serviceSource).toContain('Native poll dispatched an assistant_letter_due trigger to the native AI executor');
  });

  it('schedules reminder alarms even before native AI config becomes ready', () => {
    expect(scheduleMethod).toContain('if (!enabled)');
    expect(scheduleMethod).not.toContain('AssistantNativeBackgroundExecutor.canExecute');
    expect(scheduleMethod).toContain('AssistantReminderAlarmScheduler.schedule');
  });

  it('deduplicates repeated fallback triggers by trigger id', () => {
    expect(pendingTriggerStoreSource).toContain('triggerId.equals(candidate.optString("id", "").trim())');
  });
});
