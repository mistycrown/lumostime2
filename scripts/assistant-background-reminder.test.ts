/**
 * @file assistant-background-reminder.test.ts
 * @input Android assistant service, alarm, notification, and pending-trigger source files
 * @output Regression coverage for native check-in/reminder scheduling and execution contracts
 * @pos Test (Android Assistant Background Scheduling)
 * @description Locks the Android source-level lifecycle invariants that cannot be exercised by the Web Vitest environment without compiling the native project.
 * @updated 2026-09-03: Added check-in AlarmManager, no-periodic-poll, protected-skip rescheduling, manifest, and fixed-time status contracts.
 * @updated 2026-09-02: Added regression coverage for random-check-in schedules surviving repeated native snapshot/config synchronization.
 * @updated 2026-09-02: Added source-level coverage that explicit silent native outcomes cannot raise Android notifications.
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
const pluginSource = readFileSync(
  new URL('../android/app/src/main/java/com/mistycrown/lumostime/AssistantAgentPlugin.java', import.meta.url),
  'utf8'
);
const nativeExecutorSource = readFileSync(
  new URL('../android/app/src/main/java/com/mistycrown/lumostime/AssistantNativeBackgroundExecutor.java', import.meta.url),
  'utf8'
);
const checkinSchedulerSource = readFileSync(
  new URL('../android/app/src/main/java/com/mistycrown/lumostime/AssistantCheckinAlarmScheduler.java', import.meta.url),
  'utf8'
);
const checkinReceiverSource = readFileSync(
  new URL('../android/app/src/main/java/com/mistycrown/lumostime/AssistantCheckinAlarmReceiver.java', import.meta.url),
  'utf8'
);
const notificationManagerSource = readFileSync(
  new URL('../android/app/src/main/java/com/mistycrown/lumostime/UnifiedServiceNotificationManager.java', import.meta.url),
  'utf8'
);
const androidManifestSource = readFileSync(
  new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url),
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
    expect(serviceSource).toContain('Native alarm dispatched an assistant_letter_due trigger to the native AI executor');
  });

  it('schedules reminder alarms even before native AI config becomes ready', () => {
    expect(scheduleMethod).toContain('if (!enabled)');
    expect(scheduleMethod).not.toContain('AssistantNativeBackgroundExecutor.canExecute');
    expect(scheduleMethod).toContain('AssistantReminderAlarmScheduler.schedule');
  });

  it('deduplicates repeated fallback triggers by trigger id', () => {
    expect(pendingTriggerStoreSource).toContain('triggerId.equals(candidate.optString("id", "").trim())');
  });

  it('does not reset the random check-in alarm when only the native prompt snapshot changes', () => {
    const snapshotMethod = extractMethod(
      pluginSource,
      'public void syncNativeBackgroundSnapshot',
      'public void syncNativeReminders'
    );

    expect(snapshotMethod).not.toContain('repokeRunningAgentService');
    expect(pluginSource).toContain('if (configChanged)');
    expect(pluginSource).toContain('intent.putExtra("refreshSchedules", true)');
    expect(serviceSource).toContain('hasRandomCheckinConfigChanged(intent)');
    expect(serviceSource).toContain('getEffectiveMinimumNudgeGapMinutes');
  });

  it('schedules random check-ins through AlarmManager without a periodic poll', () => {
    const checkinScheduleMethod = extractMethod(
      serviceSource,
      'private void scheduleNextRandomCheckin',
      'private void ensureRandomCheckinScheduled'
    );

    expect(checkinScheduleMethod).toContain('AssistantCheckinAlarmScheduler.schedule');
    expect(checkinSchedulerSource).toContain('setExactAndAllowWhileIdle');
    expect(checkinSchedulerSource).toContain('setAndAllowWhileIdle');
    expect(checkinReceiverSource).toContain('ACTION_TRIGGER_CHECKIN_TIMER');
    expect(checkinReceiverSource).toContain('isAssistantEnabled');
    expect(androidManifestSource).toContain('android:name=".AssistantCheckinAlarmReceiver"');
    expect(serviceSource).not.toContain('pollRunnable');
    expect(serviceSource).not.toContain('basePollMinutes');
  });

  it('abandons a protected due check-in and immediately schedules a new random time', () => {
    const dueCheckinMethod = extractMethod(
      serviceSource,
      'private void handleDueRandomCheckin',
      'private void applyConfig'
    );

    expect(dueCheckinMethod).toContain('if (!shouldDispatchRandomCheckin(nowMs))');
    expect(dueCheckinMethod).toContain('"checkin_skipped"');
    expect(dueCheckinMethod).toContain('scheduleNextRandomCheckin(nowMs)');
    expect(dueCheckinMethod).not.toContain('computeRetryCheckinAt');
  });

  it('keeps the chosen check-in time when foreground activity only updates protection state', () => {
    const userTurnBranch = extractMethod(
      serviceSource,
      'if (ACTION_NOTIFY_USER_TURN.equals(action))',
      'if (ACTION_NOTIFY_TASK_STATE_CHANGED.equals(action))'
    );
    const taskStateBranch = extractMethod(
      serviceSource,
      'if (ACTION_NOTIFY_TASK_STATE_CHANGED.equals(action))',
      'if (ACTION_TRIGGER_IMMEDIATE.equals(action))'
    );

    expect(userTurnBranch).toContain('ensureRandomCheckinScheduled(now)');
    expect(userTurnBranch).not.toContain('scheduleNextRandomCheckin(now)');
    expect(taskStateBranch).toContain('ensureRandomCheckinScheduled(now)');
    expect(taskStateBranch).not.toContain('scheduleNextRandomCheckin(now)');
  });

  it('renders a stable next check-in clock time instead of a polling countdown', () => {
    expect(notificationManagerSource).toContain('new java.text.SimpleDateFormat("HH:mm"');
    expect(notificationManagerSource).not.toContain('remainingMinutes');
    expect(notificationManagerSource).not.toContain('KEY_ASSISTANT_BASE_POLL_MINUTES');
  });

  it('notifies only for explicit replies with assistant content', () => {
    const notificationMethod = extractMethod(
      nativeExecutorSource,
      'private static boolean maybeShowAssistantNotification',
      'private static void appendDiagnostic'
    );

    expect(notificationMethod).toContain('if (!"reply".equals(outcome))');
    expect(notificationMethod).toContain('normalized.opt("assistantReply")');
    expect(notificationMethod).not.toContain('normalized.opt("decisionSummary")');
    expect(notificationMethod).not.toContain('triggerPayload.optString("text"');
  });
});
