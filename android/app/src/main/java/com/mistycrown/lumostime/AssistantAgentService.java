/**
 * @file AssistantAgentService.java
 * @input Foreground-service control intents and assistant schedule config
 * @output Alarm-backed Android assistant scheduling, shared runtime notification state, and bridge-triggered assistant events
 * @pos Native Service
 * @description Runs the Android background AI agent with dedicated alarms for random check-ins, reminders, and letters while sharing one persistent status notification with the floating-window service.
 * @updated 2026-09-03: Replaced periodic random-check-in polling with a dedicated AlarmManager wakeup; protected due checks are abandoned and immediately rescheduled to a new random time.
 * @updated 2026-08-24: Clears the persisted assistant-letter schedule and dispatch marker whenever AI letters are disabled, preventing stale native wakeups after the feature is turned off.
 * @updated 2026-07-07: Added native assistant-letter scheduling so Android can wake at nextLetterAt and dispatch one assistant_letter_due trigger.
 * @updated 2026-06-14: Persisted and reloaded the assistant enabled flag before non-start wakeups so stale reminder alarms or native repokes cannot restart polling after the user disables it.
 * @updated 2026-05-15: Remove a native reminder immediately after it has been persisted as a pending `reminder_due` trigger so background retries do not re-dispatch the same completed reminder every minute.
 * @updated 2026-05-14: Changed Android reminder alarms to dispatch one metadata-rich `reminder_due` trigger back to the Web layer, preserving the local-offset request path and preventing duplicate native-plus-web AI reminder runs.
 * @updated 2026-09-02: Executes due reminders directly through the native background AI executor when its config and snapshot are ready, consuming reminders only after a successful request and retaining Web fallback retries otherwise.
 * @updated 2026-09-02: Executes due assistant letters through the same native executor lifecycle so a suspended WebView cannot consume the scheduled letter before an AI request succeeds.
 * @updated 2026-09-02: Clamps the activity nudge gap to the configured minimum check-in interval so short test intervals are not silently deferred by the default gap.
 * @updated 2026-09-02: Preserves the current random-check-in deadline when native snapshot/config refreshes only require reminder schedule reconciliation.
 * @updated 2026-09-02: Uses a 10-minute default minimum random-check-in nudge gap for new native service state.
 * @updated 2026-05-13: Moved next due-reminder wakeups onto AlarmManager-backed service wakeups so reminder_due dispatch no longer depends on in-process Handler delays while the device is idle.
 * @updated 2026-05-11: Split due-reminder scheduling off the coarse base poll so reminders can fire at their exact next eligible time instead of waiting for the next 5-minute sweep.
 * @updated 2026-05-09: Refreshes the shared persistent notification title once per second while active focus timers exist so timer durations stay live during assistant-only foreground runtime.
 * @updated 2026-04-27: Added persistent native diagnostics for poll ticks, skip reasons, and trigger dispatches so missed background calls can be traced from the shared AI history UI.
 * @updated 2026-04-27: Tracked recent user/task activity plus quiet hours and minimum nudge gaps so native random check-ins stop interrupting immediately after foreground activity.
 * @updated 2026-04-26: Re-schedules the next random check-in whenever runtime config changes so shorter intervals take effect immediately instead of waiting for an older long-delay schedule to expire.
 */
package com.mistycrown.lumostime;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import java.util.Calendar;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.Set;

public class AssistantAgentService extends Service {
    public static final String ACTION_START = "com.mistycrown.lumostime.action.ASSISTANT_AGENT_START";
    public static final String ACTION_STOP = "com.mistycrown.lumostime.action.ASSISTANT_AGENT_STOP";
    public static final String ACTION_UPDATE_CONFIG = "com.mistycrown.lumostime.action.ASSISTANT_AGENT_UPDATE_CONFIG";
    public static final String ACTION_TRIGGER_IMMEDIATE = "com.mistycrown.lumostime.action.ASSISTANT_AGENT_TRIGGER_IMMEDIATE";
    public static final String ACTION_TRIGGER_CHECKIN_TIMER = "com.mistycrown.lumostime.action.ASSISTANT_TRIGGER_CHECKIN_TIMER";
    public static final String ACTION_TRIGGER_REMINDER_TIMER = "com.mistycrown.lumostime.action.ASSISTANT_TRIGGER_REMINDER_TIMER";
    public static final String ACTION_TRIGGER_LETTER_TIMER = "com.mistycrown.lumostime.action.ASSISTANT_TRIGGER_LETTER_TIMER";
    public static final String ACTION_NOTIFY_USER_TURN = "com.mistycrown.lumostime.action.ASSISTANT_AGENT_NOTIFY_USER_TURN";
    public static final String ACTION_NOTIFY_TASK_STATE_CHANGED = "com.mistycrown.lumostime.action.ASSISTANT_AGENT_NOTIFY_TASK_STATE_CHANGED";

    private static final String PREFS_NAME = "lumostime_assistant_agent_state";
    private static final String KEY_LAST_USER_TURN_AT_MS = "last_user_turn_at_ms";
    private static final String KEY_LAST_TASK_STATE_CHANGED_AT_MS = "last_task_state_changed_at_ms";
    private static final String KEY_LAST_ASSISTANT_NUDGE_AT_MS = "last_assistant_nudge_at_ms";
    private static final String KEY_ENABLE_RANDOM_CHECKIN = "enable_random_checkin";
    private static final String KEY_MIN_CHECKIN_MINUTES = "min_checkin_minutes";
    private static final String KEY_MAX_CHECKIN_MINUTES = "max_checkin_minutes";
    private static final String KEY_QUIET_HOURS_ENABLED = "quiet_hours_enabled";
    private static final String KEY_QUIET_HOURS_START = "quiet_hours_start";
    private static final String KEY_QUIET_HOURS_END = "quiet_hours_end";
    private static final String KEY_MINIMUM_NUDGE_GAP_MINUTES = "minimum_nudge_gap_minutes";
    private static final String KEY_NEXT_RANDOM_CHECKIN_AT_MS = "next_random_checkin_at_ms";
    private static final String KEY_LETTER_ENABLED = "letter_enabled";
    private static final String KEY_NEXT_LETTER_AT = "next_letter_at";
    private static final String KEY_LAST_LETTER_DISPATCHED_FOR = "last_letter_dispatched_for";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Random random = new Random();

    private boolean enabled = false;
    private boolean enableRandomCheckin = true;
    private int minCheckinMinutes = 45;
    private int maxCheckinMinutes = 120;
    private boolean quietHoursEnabled = false;
    private String quietHoursStart = "";
    private String quietHoursEnd = "";
    private int minimumNudgeGapMinutes = 10;
    private boolean letterEnabled = false;
    private String nextLetterAt = "";
    private String lastLetterDispatchedFor = "";
    private long nextRandomCheckinAtMs = 0L;
    private long nextReminderDispatchAtMs = 0L;
    private long nextLetterDispatchAtMs = 0L;
    private long lastUserTurnAtMs = 0L;
    private long lastTaskStateChangedAtMs = 0L;
    private long lastAssistantNudgeAtMs = 0L;
    private final Set<String> nativeReminderRequestsInFlight = new HashSet<>();
    private boolean nativeLetterRequestInFlight = false;
    private final Runnable notificationRefreshRunnable = new Runnable() {
        @Override
        public void run() {
            if (!UnifiedServiceNotificationManager.hasActiveFocusSessions(AssistantAgentService.this)) {
                return;
            }

            UnifiedServiceNotificationManager.reconcileNotificationState(AssistantAgentService.this);
            handler.postDelayed(this, 1000L);
        }
    };

    private final Runnable reminderDispatchRunnable = new Runnable() {
        @Override
        public void run() {
            if (!enabled) {
                return;
            }

            long now = System.currentTimeMillis();
            appendDiagnostic(
                "reminder_tick",
                "info",
                "Assistant reminder timer fired",
                null,
                "reminder_due",
                null,
                buildPollDiagnosticContext(now)
            );
            dispatchDueNativeReminders(now);
            scheduleNextReminderDispatch(System.currentTimeMillis());
            syncUnifiedStatusNotification();
        }
    };

    private final Runnable letterDispatchRunnable = new Runnable() {
        @Override
        public void run() {
            if (!enabled) {
                return;
            }

            long now = System.currentTimeMillis();
            appendDiagnostic(
                "letter_tick",
                "info",
                "Assistant letter timer fired",
                null,
                "assistant_letter_due",
                null,
                buildPollDiagnosticContext(now)
            );
            dispatchDueAssistantLetter(now);
            scheduleNextAssistantLetterDispatch(System.currentTimeMillis());
            syncUnifiedStatusNotification();
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        loadRuntimeSignals();
        enabled = UnifiedServiceNotificationManager.isAssistantEnabled(this);
        UnifiedServiceNotificationManager.startForeground(this);
        syncUnifiedStatusNotification();
        appendDiagnostic(
            "service_started",
            "info",
            "Assistant agent service created",
            null,
            null,
            null,
            buildPollDiagnosticContext(System.currentTimeMillis())
        );
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : ACTION_START;

        if (ACTION_STOP.equals(action)) {
            setPersistedEnabled(false);
            enabled = false;
            appendDiagnostic(
                "service_stopped",
                "info",
                "Assistant agent service stop requested",
                null,
                null,
                null,
                buildPollDiagnosticContext(System.currentTimeMillis())
            );
            stopAgentLoop();
            UnifiedServiceNotificationManager.clearAssistantState(this);
            stopForeground(false);
            UnifiedServiceNotificationManager.reconcileNotificationState(this);
            stopSelf();
            return START_NOT_STICKY;
        }

        boolean randomCheckinConfigChanged = hasRandomCheckinConfigChanged(intent);
        applyConfig(intent);
        if (!enabled) {
            appendDiagnostic(
                "service_disabled_skip",
                "info",
                String.format(Locale.US, "Assistant agent ignored action while disabled: %s", action),
                null,
                null,
                "assistant_disabled",
                buildPollDiagnosticContext(System.currentTimeMillis())
            );
            stopAgentLoop();
            UnifiedServiceNotificationManager.clearAssistantState(this);
            stopForeground(false);
            UnifiedServiceNotificationManager.reconcileNotificationState(this);
            stopSelf();
            return START_NOT_STICKY;
        }

        appendDiagnostic(
            "config_applied",
            "info",
            String.format(Locale.US, "Assistant agent handled action: %s", action),
            null,
            null,
            null,
            buildPollDiagnosticContext(System.currentTimeMillis())
        );

        if (ACTION_NOTIFY_USER_TURN.equals(action)) {
            long now = System.currentTimeMillis();
            recordUserTurn(now);
            ensureRandomCheckinScheduled(now);
            appendDiagnostic(
                "user_turn_recorded",
                "info",
                "Recorded recent foreground user activity for native throttling",
                null,
                null,
                null,
                buildPollDiagnosticContext(now)
            );
            syncUnifiedStatusNotification();
            return START_STICKY;
        }

        if (ACTION_NOTIFY_TASK_STATE_CHANGED.equals(action)) {
            long now = System.currentTimeMillis();
            recordTaskStateChanged(now);
            ensureRandomCheckinScheduled(now);
            appendDiagnostic(
                "task_state_changed_recorded",
                "info",
                "Recorded recent task-state activity for native throttling",
                null,
                null,
                null,
                buildPollDiagnosticContext(now)
            );
            syncUnifiedStatusNotification();
            return START_STICKY;
        }

        if (ACTION_TRIGGER_IMMEDIATE.equals(action)) {
            long now = System.currentTimeMillis();
            recordAssistantNudge(now);
            String triggerId;
            if (AssistantNativeBackgroundExecutor.canExecute(this)) {
                triggerId = java.util.UUID.randomUUID().toString();
                AssistantNativeBackgroundExecutor.executeAsync(
                    this,
                    triggerId,
                    "manual_background_nudge",
                    "Manual immediate background assistant trigger",
                    "system"
                );
            } else {
                triggerId = AssistantAgentPlugin.dispatchSystemTrigger(
                    this,
                    "manual_background_nudge",
                    "Manual immediate background assistant trigger",
                    "system"
                );
            }
            appendDiagnostic(
                "manual_trigger_dispatched",
                "success",
                "Manual background assistant trigger dispatched",
                triggerId,
                "manual_background_nudge",
                null,
                buildPollDiagnosticContext(now)
            );
            ensureRandomCheckinScheduled(now);
            syncUnifiedStatusNotification();
            return START_STICKY;
        }

        if (ACTION_TRIGGER_CHECKIN_TIMER.equals(action)) {
            long now = System.currentTimeMillis();
            handleDueRandomCheckin(now);
            scheduleNextReminderDispatch(now);
            scheduleNextAssistantLetterDispatch(now);
            syncUnifiedStatusNotification();
            return START_STICKY;
        }

        if (ACTION_TRIGGER_REMINDER_TIMER.equals(action)) {
            long now = System.currentTimeMillis();
            ensureRandomCheckinScheduled(now);
            scheduleNextAssistantLetterDispatch(now);
            handler.removeCallbacks(reminderDispatchRunnable);
            handler.post(reminderDispatchRunnable);
            syncUnifiedStatusNotification();
            return START_STICKY;
        }

        if (ACTION_TRIGGER_LETTER_TIMER.equals(action)) {
            long now = System.currentTimeMillis();
            ensureRandomCheckinScheduled(now);
            scheduleNextReminderDispatch(now);
            handler.removeCallbacks(letterDispatchRunnable);
            handler.post(letterDispatchRunnable);
            syncUnifiedStatusNotification();
            return START_STICKY;
        }

        long now = System.currentTimeMillis();
        if (randomCheckinConfigChanged) {
            scheduleNextRandomCheckin(now);
        } else {
            ensureRandomCheckinScheduled(now);
        }
        scheduleNextReminderDispatch(now);
        scheduleNextAssistantLetterDispatch(now);

        syncUnifiedStatusNotification();
        return START_STICKY;
    }

    private boolean hasRandomCheckinConfigChanged(Intent intent) {
        if (intent == null) {
            return false;
        }

        return (intent.hasExtra("enabled") && intent.getBooleanExtra("enabled", true) != enabled)
            || (
                intent.hasExtra("enableRandomCheckin")
                && intent.getBooleanExtra("enableRandomCheckin", true) != enableRandomCheckin
            )
            || (
                intent.hasExtra("minCheckinMinutes")
                && Math.max(1, intent.getIntExtra("minCheckinMinutes", 45)) != minCheckinMinutes
            )
            || (
                intent.hasExtra("maxCheckinMinutes")
                && Math.max(1, intent.getIntExtra("maxCheckinMinutes", 120)) != maxCheckinMinutes
            )
            || (
                intent.hasExtra("quietHoursEnabled")
                && intent.getBooleanExtra("quietHoursEnabled", false) != quietHoursEnabled
            )
            || (
                intent.hasExtra("quietHoursStart")
                && !safeTrim(intent.getStringExtra("quietHoursStart")).equals(quietHoursStart)
            )
            || (
                intent.hasExtra("quietHoursEnd")
                && !safeTrim(intent.getStringExtra("quietHoursEnd")).equals(quietHoursEnd)
            )
            || (
                intent.hasExtra("minimumNudgeGapMinutes")
                && Math.max(1, intent.getIntExtra("minimumNudgeGapMinutes", 10)) != minimumNudgeGapMinutes
            );
    }

    @Override
    public void onDestroy() {
        stopAgentLoop();
        UnifiedServiceNotificationManager.clearAssistantState(this);
        stopForeground(false);
        UnifiedServiceNotificationManager.reconcileNotificationState(this);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void stopAgentLoop() {
        handler.removeCallbacks(reminderDispatchRunnable);
        handler.removeCallbacks(letterDispatchRunnable);
        handler.removeCallbacks(notificationRefreshRunnable);
        nativeReminderRequestsInFlight.clear();
        nativeLetterRequestInFlight = false;
        AssistantCheckinAlarmScheduler.cancel(this);
        AssistantReminderAlarmScheduler.cancel(this);
        AssistantLetterAlarmScheduler.cancel(this);
        nextRandomCheckinAtMs = 0L;
        prefs().edit().remove(KEY_NEXT_RANDOM_CHECKIN_AT_MS).apply();
        nextReminderDispatchAtMs = 0L;
        nextLetterDispatchAtMs = 0L;
    }

    private void dispatchDueNativeReminders(long nowMs) {
        org.json.JSONArray dueReminders = AssistantNativeReminderStore.listDue(this, nowMs);
        boolean canExecuteNatively = AssistantNativeBackgroundExecutor.canExecute(this);
        for (int index = 0; index < dueReminders.length(); index += 1) {
            org.json.JSONObject reminder = dueReminders.optJSONObject(index);
            if (reminder == null) {
                continue;
            }

            String reminderId = safeTrim(reminder.optString("id", ""));
            if (reminderId.isEmpty()) {
                continue;
            }

            String attemptedAt = formatTimestamp(nowMs);
            if (canExecuteNatively && nativeReminderRequestsInFlight.contains(reminderId)) {
                continue;
            }

            AssistantNativeReminderStore.recordDispatchAttempt(this, reminderId, attemptedAt);
            if (canExecuteNatively) {
                final String triggerId = "reminder_due:" + reminderId;
                nativeReminderRequestsInFlight.add(reminderId);
                org.json.JSONObject triggerPayload = AssistantNativeBackgroundExecutor.buildTriggerPayload(
                    triggerId,
                    "reminder_due",
                    safeTrim(reminder.optString("text", "")),
                    "system"
                );
                try {
                    triggerPayload.put("metadata", buildReminderTriggerMetadata(reminder, reminderId, attemptedAt, nowMs));
                } catch (org.json.JSONException ignored) {
                }
                AssistantNativeBackgroundExecutor.executeAsync(
                    this,
                    triggerPayload,
                    new AssistantNativeBackgroundExecutor.ExecutionCallback() {
                        @Override
                        public void onCompleted() {
                            AssistantNativeReminderStore.markDispatched(AssistantAgentService.this, reminderId, isoNow());
                            handler.post(() -> {
                                nativeReminderRequestsInFlight.remove(reminderId);
                                scheduleNextReminderDispatch(System.currentTimeMillis());
                                syncUnifiedStatusNotification();
                            });
                        }

                        @Override
                        public void onFailed() {
                            handler.post(() -> {
                                nativeReminderRequestsInFlight.remove(reminderId);
                                scheduleNextReminderDispatch(System.currentTimeMillis());
                                syncUnifiedStatusNotification();
                            });
                        }
                    }
                );

                appendDiagnostic(
                    "reminder_due_dispatched",
                    "success",
                    "Native alarm dispatched a reminder_due trigger to the native AI executor",
                    triggerId,
                    "reminder_due",
                    null,
                    buildPollDiagnosticContext(nowMs)
                );
                continue;
            }

            String triggerId = "reminder_due:" + reminderId;
            com.getcapacitor.JSObject metadata = buildReminderTriggerMetadata(reminder, reminderId, attemptedAt, nowMs);
            triggerId = AssistantAgentPlugin.dispatchSystemTrigger(
                this,
                "reminder_due",
                safeTrim(reminder.optString("text", "")),
                "system",
                triggerId,
                metadata
            );

            appendDiagnostic(
                "reminder_due_dispatched",
                "warning",
                "Native alarm dispatched a reminder_due trigger to the Web fallback because native AI is unavailable",
                triggerId,
                "reminder_due",
                "native_ai_unavailable",
                buildPollDiagnosticContext(nowMs)
            );
        }

        scheduleNextReminderDispatch(System.currentTimeMillis());
        syncUnifiedStatusNotification();
    }

    private com.getcapacitor.JSObject buildReminderTriggerMetadata(
        org.json.JSONObject reminder,
        String reminderId,
        String attemptedAt,
        long nowMs
    ) {
        com.getcapacitor.JSObject metadata = new com.getcapacitor.JSObject();
        metadata.put("reminderId", reminderId);
        metadata.put("reminderType", safeTrim(reminder.optString("type", "")));
        metadata.put("scheduledDueAt", safeTrim(reminder.optString("dueAt", "")));
        metadata.put("actualDispatchAt", attemptedAt);
        metadata.put("dispatchAttemptCount", reminder.optInt("dispatchAttemptCount", 0));
        long dueAtMs = AssistantTimeParser.parseIsoDateTime(reminder.optString("dueAt", ""));
        if (dueAtMs > 0L) {
            metadata.put("delayMinutes", Math.max(0L, Math.round((nowMs - dueAtMs) / 60000.0)));
        }
        return metadata;
    }

    private void dispatchDueAssistantLetter(long nowMs) {
        String normalizedNextLetterAt = safeTrim(nextLetterAt);
        long dueAtMs = AssistantTimeParser.parseIsoDateTime(normalizedNextLetterAt);
        if (
            !enabled
            || !letterEnabled
            || normalizedNextLetterAt.isEmpty()
            || dueAtMs <= 0L
            || dueAtMs > nowMs
            || normalizedNextLetterAt.equals(safeTrim(lastLetterDispatchedFor))
        ) {
            return;
        }

        String attemptedAt = formatTimestamp(nowMs);
        String triggerId = "assistant_letter_due:" + normalizedNextLetterAt;
        com.getcapacitor.JSObject metadata = new com.getcapacitor.JSObject();
        metadata.put("scheduledFor", normalizedNextLetterAt);
        metadata.put("actualDispatchAt", attemptedAt);
        metadata.put("delayMinutes", Math.max(0L, Math.round((nowMs - dueAtMs) / 60000.0)));

        if (AssistantNativeBackgroundExecutor.canExecute(this) && !nativeLetterRequestInFlight) {
            nativeLetterRequestInFlight = true;
            org.json.JSONObject triggerPayload = AssistantNativeBackgroundExecutor.buildTriggerPayload(
                triggerId,
                "assistant_letter_due",
                "Scheduled assistant letter is due",
                "system"
            );
            try {
                triggerPayload.put("metadata", metadata);
            } catch (org.json.JSONException ignored) {
            }

            AssistantNativeBackgroundExecutor.executeAsync(
                this,
                triggerPayload,
                new AssistantNativeBackgroundExecutor.ExecutionCallback() {
                    @Override
                    public void onCompleted() {
                        lastLetterDispatchedFor = normalizedNextLetterAt;
                        prefs().edit().putString(KEY_LAST_LETTER_DISPATCHED_FOR, lastLetterDispatchedFor).apply();
                        handler.post(() -> {
                            nativeLetterRequestInFlight = false;
                            scheduleNextAssistantLetterDispatch(System.currentTimeMillis());
                            syncUnifiedStatusNotification();
                        });
                    }

                    @Override
                    public void onFailed() {
                        handler.post(() -> {
                            nativeLetterRequestInFlight = false;
                            scheduleNextAssistantLetterDispatch(System.currentTimeMillis());
                            syncUnifiedStatusNotification();
                        });
                    }
                }
            );

            appendDiagnostic(
                "assistant_letter_due_dispatched",
                "success",
                "Native alarm dispatched an assistant_letter_due trigger to the native AI executor",
                triggerId,
                "assistant_letter_due",
                null,
                buildPollDiagnosticContext(nowMs)
            );
            return;
        }

        triggerId = AssistantAgentPlugin.dispatchSystemTrigger(
            this,
            "assistant_letter_due",
            "Scheduled assistant letter is due",
            "system",
            triggerId,
            metadata
        );
        lastLetterDispatchedFor = normalizedNextLetterAt;
        prefs().edit().putString(KEY_LAST_LETTER_DISPATCHED_FOR, lastLetterDispatchedFor).apply();

        appendDiagnostic(
            "assistant_letter_due_dispatched",
            "success",
            "Native alarm dispatched an assistant_letter_due trigger to the Web layer",
            triggerId,
            "assistant_letter_due",
            null,
            buildPollDiagnosticContext(nowMs)
        );
    }

    private void handleDueRandomCheckin(long nowMs) {
        if (!enabled || !enableRandomCheckin) {
            scheduleNextRandomCheckin(nowMs);
            return;
        }

        if (nextRandomCheckinAtMs <= 0L) {
            scheduleNextRandomCheckin(nowMs);
            return;
        }

        if (nowMs < nextRandomCheckinAtMs) {
            AssistantCheckinAlarmScheduler.schedule(this, nextRandomCheckinAtMs);
            return;
        }

        AssistantCheckinAlarmScheduler.cancel(this);
        nextRandomCheckinAtMs = 0L;
        prefs().edit().remove(KEY_NEXT_RANDOM_CHECKIN_AT_MS).apply();

        String skipReason = resolveSkipReason(nowMs);
        if (!shouldDispatchRandomCheckin(nowMs)) {
            scheduleNextRandomCheckin(nowMs);
            appendDiagnostic(
                "checkin_skipped",
                "warning",
                "Scheduled assistant check-in was skipped",
                null,
                "checkin",
                skipReason,
                buildPollDiagnosticContext(nowMs)
            );
            return;
        }

        String triggerId;
        if (AssistantNativeBackgroundExecutor.canExecute(this)) {
            triggerId = java.util.UUID.randomUUID().toString();
            AssistantNativeBackgroundExecutor.executeAsync(
                this,
                triggerId,
                "checkin",
                "Assistant background check-in trigger",
                "system"
            );
        } else {
            triggerId = AssistantAgentPlugin.dispatchSystemTrigger(
                this,
                "checkin",
                "Assistant background check-in trigger",
                "system"
            );
        }
        recordAssistantNudge(nowMs);
        scheduleNextRandomCheckin(nowMs);
        appendDiagnostic(
            "checkin_dispatched",
            "success",
            "Scheduled alarm dispatched an assistant check-in trigger",
            triggerId,
            "checkin",
            null,
            buildPollDiagnosticContext(nowMs)
        );
    }

    private void applyConfig(Intent intent) {
        if (intent == null) {
            enabled = UnifiedServiceNotificationManager.isAssistantEnabled(this);
            return;
        }

        if (intent.hasExtra("enabled")) {
            enabled = intent.getBooleanExtra("enabled", true);
            setPersistedEnabled(enabled);
        } else {
            enabled = UnifiedServiceNotificationManager.isAssistantEnabled(this);
        }
        if (intent.hasExtra("enableRandomCheckin")) {
            enableRandomCheckin = intent.getBooleanExtra("enableRandomCheckin", true);
        }
        if (intent.hasExtra("minCheckinMinutes")) {
            minCheckinMinutes = Math.max(1, intent.getIntExtra("minCheckinMinutes", 45));
        }
        if (intent.hasExtra("maxCheckinMinutes")) {
            maxCheckinMinutes = Math.max(minCheckinMinutes, intent.getIntExtra("maxCheckinMinutes", 120));
        }
        if (intent.hasExtra("quietHoursEnabled")) {
            quietHoursEnabled = intent.getBooleanExtra("quietHoursEnabled", false);
        }
        if (intent.hasExtra("quietHoursStart")) {
            quietHoursStart = safeTrim(intent.getStringExtra("quietHoursStart"));
        }
        if (intent.hasExtra("quietHoursEnd")) {
            quietHoursEnd = safeTrim(intent.getStringExtra("quietHoursEnd"));
        }
        if (intent.hasExtra("minimumNudgeGapMinutes")) {
            minimumNudgeGapMinutes = Math.max(1, intent.getIntExtra("minimumNudgeGapMinutes", 10));
        }
        maxCheckinMinutes = Math.max(minCheckinMinutes, maxCheckinMinutes);
        prefs().edit()
            .putBoolean(KEY_ENABLE_RANDOM_CHECKIN, enableRandomCheckin)
            .putInt(KEY_MIN_CHECKIN_MINUTES, minCheckinMinutes)
            .putInt(KEY_MAX_CHECKIN_MINUTES, maxCheckinMinutes)
            .putBoolean(KEY_QUIET_HOURS_ENABLED, quietHoursEnabled)
            .putString(KEY_QUIET_HOURS_START, quietHoursStart)
            .putString(KEY_QUIET_HOURS_END, quietHoursEnd)
            .putInt(KEY_MINIMUM_NUDGE_GAP_MINUTES, minimumNudgeGapMinutes)
            .apply();
        if (intent.hasExtra("letterEnabled")) {
            letterEnabled = intent.getBooleanExtra("letterEnabled", false);
            prefs().edit().putBoolean(KEY_LETTER_ENABLED, letterEnabled).apply();
        } else {
            letterEnabled = prefs().getBoolean(KEY_LETTER_ENABLED, false);
        }
        if (intent.hasExtra("nextLetterAt")) {
            String incomingNextLetterAt = safeTrim(intent.getStringExtra("nextLetterAt"));
            if (!incomingNextLetterAt.equals(nextLetterAt)) {
                nextLetterAt = incomingNextLetterAt;
                if (!nextLetterAt.equals(safeTrim(lastLetterDispatchedFor))) {
                    lastLetterDispatchedFor = "";
                    prefs().edit().remove(KEY_LAST_LETTER_DISPATCHED_FOR).apply();
                }
            }
            prefs().edit().putString(KEY_NEXT_LETTER_AT, nextLetterAt).apply();
        } else {
            nextLetterAt = safeTrim(prefs().getString(KEY_NEXT_LETTER_AT, ""));
        }
        if (!letterEnabled || nextLetterAt.isEmpty()) {
            nextLetterDispatchAtMs = 0L;
            AssistantLetterAlarmScheduler.cancel(this);
            if (!letterEnabled) {
                nextLetterAt = "";
                lastLetterDispatchedFor = "";
                prefs().edit()
                    .remove(KEY_NEXT_LETTER_AT)
                    .remove(KEY_LAST_LETTER_DISPATCHED_FOR)
                    .apply();
            }
        }
    }

    private void scheduleNextRandomCheckin(long nowMs) {
        AssistantCheckinAlarmScheduler.cancel(this);
        if (!enabled || !enableRandomCheckin) {
            nextRandomCheckinAtMs = 0L;
            prefs().edit().remove(KEY_NEXT_RANDOM_CHECKIN_AT_MS).apply();
            return;
        }

        int minMinutes = Math.max(1, minCheckinMinutes);
        int maxMinutes = Math.max(minMinutes, maxCheckinMinutes);
        int spread = maxMinutes - minMinutes;
        int pickedMinutes = spread <= 0 ? minMinutes : minMinutes + random.nextInt(spread + 1);
        nextRandomCheckinAtMs = nowMs + (pickedMinutes * 60_000L);
        prefs().edit().putLong(KEY_NEXT_RANDOM_CHECKIN_AT_MS, nextRandomCheckinAtMs).apply();
        AssistantCheckinAlarmScheduler.schedule(this, nextRandomCheckinAtMs);
    }

    private void ensureRandomCheckinScheduled(long nowMs) {
        if (!enabled || !enableRandomCheckin) {
            scheduleNextRandomCheckin(nowMs);
            return;
        }

        if (nextRandomCheckinAtMs <= nowMs) {
            scheduleNextRandomCheckin(nowMs);
            return;
        }

        AssistantCheckinAlarmScheduler.schedule(this, nextRandomCheckinAtMs);
    }

    private void scheduleNextReminderDispatch(long nowMs) {
        handler.removeCallbacks(reminderDispatchRunnable);
        AssistantReminderAlarmScheduler.cancel(this);
        nextReminderDispatchAtMs = 0L;

        if (!enabled) {
            return;
        }

        long nextEligibleAtMs = AssistantNativeReminderStore.findNextEligibleAt(this);
        if (nextEligibleAtMs <= 0L) {
            return;
        }

        nextReminderDispatchAtMs = nextEligibleAtMs;
        long delayMs = Math.max(0L, nextEligibleAtMs - nowMs);
        if (delayMs <= 0L) {
            handler.post(reminderDispatchRunnable);
            return;
        }

        AssistantReminderAlarmScheduler.schedule(this, nextEligibleAtMs);
    }

    private void scheduleNextAssistantLetterDispatch(long nowMs) {
        handler.removeCallbacks(letterDispatchRunnable);
        AssistantLetterAlarmScheduler.cancel(this);
        nextLetterDispatchAtMs = 0L;

        String normalizedNextLetterAt = safeTrim(nextLetterAt);
        if (!enabled || !letterEnabled || normalizedNextLetterAt.isEmpty()) {
            return;
        }

        long nextLetterAtMs = AssistantTimeParser.parseIsoDateTime(normalizedNextLetterAt);
        if (nextLetterAtMs <= 0L) {
            return;
        }

        if (nextLetterAtMs <= nowMs && normalizedNextLetterAt.equals(safeTrim(lastLetterDispatchedFor))) {
            return;
        }

        nextLetterDispatchAtMs = nextLetterAtMs;
        long delayMs = Math.max(0L, nextLetterAtMs - nowMs);
        if (delayMs <= 0L) {
            handler.post(letterDispatchRunnable);
            return;
        }

        AssistantLetterAlarmScheduler.schedule(this, nextLetterAtMs);
    }

    private boolean shouldDispatchRandomCheckin(long nowMs) {
        return !isWithinQuietHours(nowMs) && !isWithinMinimumNudgeGap(nowMs);
    }

    private boolean isWithinMinimumNudgeGap(long nowMs) {
        long latestRelevantActivityAtMs = Math.max(
            lastAssistantNudgeAtMs,
            Math.max(lastUserTurnAtMs, lastTaskStateChangedAtMs)
        );
        if (latestRelevantActivityAtMs <= 0L) {
            return false;
        }

        long minimumGapMs = getEffectiveMinimumNudgeGapMinutes() * 60_000L;
        return nowMs - latestRelevantActivityAtMs < minimumGapMs;
    }

    private int getEffectiveMinimumNudgeGapMinutes() {
        return Math.max(1, Math.min(minimumNudgeGapMinutes, minCheckinMinutes));
    }

    private String resolveSkipReason(long nowMs) {
        if (isWithinQuietHours(nowMs)) {
            return "quiet_hours";
        }

        if (isWithinMinimumNudgeGap(nowMs)) {
            return "minimum_nudge_gap";
        }

        return "condition_blocked";
    }

    private boolean isWithinQuietHours(long nowMs) {
        if (!quietHoursEnabled) {
            return false;
        }

        int startMinutes = parseTimeOfDayMinutes(quietHoursStart);
        int endMinutes = parseTimeOfDayMinutes(quietHoursEnd);
        if (startMinutes < 0 || endMinutes < 0 || startMinutes == endMinutes) {
            return false;
        }

        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(nowMs);
        int currentMinutes = (calendar.get(Calendar.HOUR_OF_DAY) * 60) + calendar.get(Calendar.MINUTE);

        if (startMinutes < endMinutes) {
            return currentMinutes >= startMinutes && currentMinutes < endMinutes;
        }

        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    private int parseTimeOfDayMinutes(String value) {
        String normalized = safeTrim(value);
        if (normalized.matches("^\\d{4}$")) {
            normalized = normalized.substring(0, 2) + ":" + normalized.substring(2, 4);
        }

        if (!normalized.matches("^\\d{2}:\\d{2}$")) {
            return -1;
        }

        try {
            int hours = Integer.parseInt(normalized.substring(0, 2));
            int minutes = Integer.parseInt(normalized.substring(3, 5));
            if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                return -1;
            }
            return (hours * 60) + minutes;
        } catch (NumberFormatException ignored) {
            return -1;
        }
    }

    private void loadRuntimeSignals() {
        SharedPreferences sharedPreferences = prefs();
        enableRandomCheckin = sharedPreferences.getBoolean(KEY_ENABLE_RANDOM_CHECKIN, true);
        minCheckinMinutes = Math.max(1, sharedPreferences.getInt(KEY_MIN_CHECKIN_MINUTES, 45));
        maxCheckinMinutes = Math.max(
            minCheckinMinutes,
            sharedPreferences.getInt(KEY_MAX_CHECKIN_MINUTES, 120)
        );
        quietHoursEnabled = sharedPreferences.getBoolean(KEY_QUIET_HOURS_ENABLED, false);
        quietHoursStart = safeTrim(sharedPreferences.getString(KEY_QUIET_HOURS_START, ""));
        quietHoursEnd = safeTrim(sharedPreferences.getString(KEY_QUIET_HOURS_END, ""));
        minimumNudgeGapMinutes = Math.max(
            1,
            sharedPreferences.getInt(KEY_MINIMUM_NUDGE_GAP_MINUTES, 10)
        );
        nextRandomCheckinAtMs = Math.max(
            0L,
            sharedPreferences.getLong(KEY_NEXT_RANDOM_CHECKIN_AT_MS, 0L)
        );
        lastUserTurnAtMs = Math.max(0L, sharedPreferences.getLong(KEY_LAST_USER_TURN_AT_MS, 0L));
        lastTaskStateChangedAtMs = Math.max(0L, sharedPreferences.getLong(KEY_LAST_TASK_STATE_CHANGED_AT_MS, 0L));
        lastAssistantNudgeAtMs = Math.max(0L, sharedPreferences.getLong(KEY_LAST_ASSISTANT_NUDGE_AT_MS, 0L));
        letterEnabled = sharedPreferences.getBoolean(KEY_LETTER_ENABLED, false);
        nextLetterAt = safeTrim(sharedPreferences.getString(KEY_NEXT_LETTER_AT, ""));
        lastLetterDispatchedFor = safeTrim(sharedPreferences.getString(KEY_LAST_LETTER_DISPATCHED_FOR, ""));
    }

    private void recordUserTurn(long atMs) {
        lastUserTurnAtMs = Math.max(0L, atMs);
        prefs().edit().putLong(KEY_LAST_USER_TURN_AT_MS, lastUserTurnAtMs).apply();
    }

    private void recordTaskStateChanged(long atMs) {
        lastTaskStateChangedAtMs = Math.max(0L, atMs);
        prefs().edit().putLong(KEY_LAST_TASK_STATE_CHANGED_AT_MS, lastTaskStateChangedAtMs).apply();
    }

    private void recordAssistantNudge(long atMs) {
        lastAssistantNudgeAtMs = Math.max(0L, atMs);
        prefs().edit().putLong(KEY_LAST_ASSISTANT_NUDGE_AT_MS, lastAssistantNudgeAtMs).apply();
    }

    private void setPersistedEnabled(boolean nextEnabled) {
        UnifiedServiceNotificationManager.setAssistantState(
            this,
            nextEnabled,
            nextEnabled,
            enableRandomCheckin,
            nextEnabled ? nextRandomCheckinAtMs : 0L
        );
    }

    private SharedPreferences prefs() {
        return getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }

    private void appendDiagnostic(
        String type,
        String level,
        String message,
        String triggerId,
        String triggerType,
        String reason,
        Map<String, String> diagnosticContext
    ) {
        AssistantAgentDiagnosticsStore.appendEntry(
            this,
            type,
            level,
            message,
            triggerId,
            triggerType,
            reason,
            diagnosticContext
        );
    }

    private Map<String, String> buildPollDiagnosticContext(long nowMs) {
        Map<String, String> context = new HashMap<>();
        context.put("enabled", String.valueOf(enabled));
        context.put("enableRandomCheckin", String.valueOf(enableRandomCheckin));
        context.put("minCheckinMinutes", String.valueOf(minCheckinMinutes));
        context.put("maxCheckinMinutes", String.valueOf(maxCheckinMinutes));
        context.put("minimumNudgeGapMinutes", String.valueOf(minimumNudgeGapMinutes));
        context.put("effectiveMinimumNudgeGapMinutes", String.valueOf(getEffectiveMinimumNudgeGapMinutes()));
        context.put("quietHoursEnabled", String.valueOf(quietHoursEnabled));
        if (!safeTrim(quietHoursStart).isEmpty()) {
            context.put("quietHoursStart", safeTrim(quietHoursStart));
        }
        if (!safeTrim(quietHoursEnd).isEmpty()) {
            context.put("quietHoursEnd", safeTrim(quietHoursEnd));
        }
        context.put("nowMs", String.valueOf(nowMs));
        context.put("nowLocal", formatTimestamp(nowMs));
        context.put("nextRandomCheckinAtMs", String.valueOf(nextRandomCheckinAtMs));
        context.put("nextRandomCheckinAtLocal", formatTimestamp(nextRandomCheckinAtMs));
        context.put("nextReminderDispatchAtMs", String.valueOf(nextReminderDispatchAtMs));
        context.put("nextReminderDispatchAtLocal", formatTimestamp(nextReminderDispatchAtMs));
        context.put("letterEnabled", String.valueOf(letterEnabled));
        if (!safeTrim(nextLetterAt).isEmpty()) {
            context.put("nextLetterAt", safeTrim(nextLetterAt));
        }
        context.put("nextLetterDispatchAtMs", String.valueOf(nextLetterDispatchAtMs));
        context.put("nextLetterDispatchAtLocal", formatTimestamp(nextLetterDispatchAtMs));
        if (!safeTrim(lastLetterDispatchedFor).isEmpty()) {
            context.put("lastLetterDispatchedFor", safeTrim(lastLetterDispatchedFor));
        }
        context.put("lastUserTurnAtMs", String.valueOf(lastUserTurnAtMs));
        context.put("lastUserTurnAtLocal", formatTimestamp(lastUserTurnAtMs));
        context.put("lastTaskStateChangedAtMs", String.valueOf(lastTaskStateChangedAtMs));
        context.put("lastTaskStateChangedAtLocal", formatTimestamp(lastTaskStateChangedAtMs));
        context.put("lastAssistantNudgeAtMs", String.valueOf(lastAssistantNudgeAtMs));
        context.put("lastAssistantNudgeAtLocal", formatTimestamp(lastAssistantNudgeAtMs));
        context.put("withinQuietHours", String.valueOf(isWithinQuietHours(nowMs)));
        context.put("withinMinimumNudgeGap", String.valueOf(isWithinMinimumNudgeGap(nowMs)));
        return context;
    }

    private String formatTimestamp(long timestampMs) {
        if (timestampMs <= 0L) {
            return "";
        }

        return new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US)
            .format(new java.util.Date(timestampMs));
    }

    private String isoNow() {
        return formatTimestamp(System.currentTimeMillis());
    }

    private void syncUnifiedStatusNotification() {
        UnifiedServiceNotificationManager.setAssistantState(
            this,
            true,
            enabled,
            enableRandomCheckin,
            nextRandomCheckinAtMs
        );
        UnifiedServiceNotificationManager.reconcileNotificationState(this);
        syncNotificationRefreshLoop();
    }

    private void syncNotificationRefreshLoop() {
        handler.removeCallbacks(notificationRefreshRunnable);
        if (UnifiedServiceNotificationManager.hasActiveFocusSessions(this)) {
            handler.postDelayed(notificationRefreshRunnable, 1000L);
        }
    }
}
