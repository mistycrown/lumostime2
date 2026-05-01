/**
 * @file AssistantAgentService.java
 * @input Foreground-service control intents and lightweight polling config
 * @output Persistent Android agent loop, shared runtime notification state, and bridge-triggered assistant events
 * @pos Native Service
 * @description Minimal Android foreground service scaffold for the background AI agent. Maintains a lightweight polling loop, shares one persistent Android status notification with the floating-window service, and emits assistant system-trigger events through the Capacitor plugin bridge.
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
import java.util.Locale;
import java.util.Map;
import java.util.Random;

public class AssistantAgentService extends Service {
    public static final String ACTION_START = "com.mistycrown.lumostime.action.ASSISTANT_AGENT_START";
    public static final String ACTION_STOP = "com.mistycrown.lumostime.action.ASSISTANT_AGENT_STOP";
    public static final String ACTION_UPDATE_CONFIG = "com.mistycrown.lumostime.action.ASSISTANT_AGENT_UPDATE_CONFIG";
    public static final String ACTION_TRIGGER_IMMEDIATE = "com.mistycrown.lumostime.action.ASSISTANT_AGENT_TRIGGER_IMMEDIATE";
    public static final String ACTION_NOTIFY_USER_TURN = "com.mistycrown.lumostime.action.ASSISTANT_AGENT_NOTIFY_USER_TURN";
    public static final String ACTION_NOTIFY_TASK_STATE_CHANGED = "com.mistycrown.lumostime.action.ASSISTANT_AGENT_NOTIFY_TASK_STATE_CHANGED";

    private static final String PREFS_NAME = "lumostime_assistant_agent_state";
    private static final String KEY_LAST_USER_TURN_AT_MS = "last_user_turn_at_ms";
    private static final String KEY_LAST_TASK_STATE_CHANGED_AT_MS = "last_task_state_changed_at_ms";
    private static final String KEY_LAST_ASSISTANT_NUDGE_AT_MS = "last_assistant_nudge_at_ms";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Random random = new Random();

    private boolean enabled = true;
    private boolean enableRandomCheckin = true;
    private int basePollMinutes = 5;
    private int minCheckinMinutes = 45;
    private int maxCheckinMinutes = 120;
    private boolean quietHoursEnabled = false;
    private String quietHoursStart = "";
    private String quietHoursEnd = "";
    private int minimumNudgeGapMinutes = 45;
    private boolean loopStarted = false;
    private long nextRandomCheckinAtMs = 0L;
    private long lastUserTurnAtMs = 0L;
    private long lastTaskStateChangedAtMs = 0L;
    private long lastAssistantNudgeAtMs = 0L;

    private final Runnable pollRunnable = new Runnable() {
        @Override
        public void run() {
            if (!enabled) {
                return;
            }

            long now = System.currentTimeMillis();
            appendDiagnostic(
                "poll_tick",
                "info",
                "Assistant background poll tick",
                null,
                null,
                null,
                buildPollDiagnosticContext(now)
            );
            dispatchDueNativeReminders(now);
            if (enableRandomCheckin && nextRandomCheckinAtMs > 0L && now >= nextRandomCheckinAtMs) {
                if (shouldDispatchRandomCheckin(now)) {
                    String triggerId;
                    if (AssistantNativeBackgroundExecutor.canExecute(AssistantAgentService.this)) {
                        triggerId = java.util.UUID.randomUUID().toString();
                        AssistantNativeBackgroundExecutor.executeAsync(
                            AssistantAgentService.this,
                            triggerId,
                            "checkin",
                            "Assistant background check-in trigger",
                            "system"
                        );
                    } else {
                        triggerId = AssistantAgentPlugin.dispatchSystemTrigger(
                            AssistantAgentService.this,
                            "checkin",
                            "Assistant background check-in trigger",
                            "system"
                        );
                    }
                    recordAssistantNudge(now);
                    scheduleNextRandomCheckin(now);
                    appendDiagnostic(
                        "checkin_dispatched",
                        "success",
                        "Native poll dispatched an assistant check-in trigger",
                        triggerId,
                        "checkin",
                        null,
                        buildPollDiagnosticContext(now)
                    );
                } else {
                    String skipReason = resolveSkipReason(now);
                    nextRandomCheckinAtMs = computeRetryCheckinAt(now);
                    appendDiagnostic(
                        "checkin_skipped",
                        "warning",
                        "Native poll skipped an assistant check-in trigger",
                        null,
                        "checkin",
                        skipReason,
                        buildPollDiagnosticContext(now)
                    );
                }
            }

            syncUnifiedStatusNotification();
            handler.postDelayed(this, Math.max(1, basePollMinutes) * 60_000L);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        loadRuntimeSignals();
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
            UnifiedServiceNotificationManager.refreshStatusNotification(this);
            stopSelf();
            return START_NOT_STICKY;
        }

        applyConfig(intent);
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
            appendDiagnostic(
                "user_turn_recorded",
                "info",
                "Recorded recent foreground user activity for native throttling",
                null,
                null,
                null,
                buildPollDiagnosticContext(now)
            );
            if (loopStarted) {
                rescheduleAgentLoop();
            } else {
                syncUnifiedStatusNotification();
            }
            return START_STICKY;
        }

        if (ACTION_NOTIFY_TASK_STATE_CHANGED.equals(action)) {
            long now = System.currentTimeMillis();
            recordTaskStateChanged(now);
            appendDiagnostic(
                "task_state_changed_recorded",
                "info",
                "Recorded recent task-state activity for native throttling",
                null,
                null,
                null,
                buildPollDiagnosticContext(now)
            );
            if (loopStarted) {
                rescheduleAgentLoop();
            } else {
                syncUnifiedStatusNotification();
            }
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
        }

        if (!loopStarted) {
            loopStarted = true;
            scheduleNextRandomCheckin(System.currentTimeMillis());
            handler.post(pollRunnable);
        } else {
            rescheduleAgentLoop();
        }

        syncUnifiedStatusNotification();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        stopAgentLoop();
        UnifiedServiceNotificationManager.clearAssistantState(this);
        stopForeground(false);
        UnifiedServiceNotificationManager.refreshStatusNotification(this);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void stopAgentLoop() {
        loopStarted = false;
        handler.removeCallbacks(pollRunnable);
    }

    private void dispatchDueNativeReminders(long nowMs) {
        if (!AssistantNativeBackgroundExecutor.canExecute(this)) {
            return;
        }

        org.json.JSONArray dueReminders = AssistantNativeReminderStore.listDue(this, nowMs);
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
            AssistantNativeReminderStore.recordDispatchAttempt(this, reminderId, attemptedAt);
            org.json.JSONObject triggerPayload = AssistantNativeBackgroundExecutor.buildTriggerPayload(
                "reminder_due:" + reminderId + ":" + nowMs,
                "reminder_due",
                safeTrim(reminder.optString("text", "")),
                "system"
            );
            try {
                org.json.JSONObject metadata = new org.json.JSONObject();
                metadata.put("reminderId", reminderId);
                metadata.put("reminderType", safeTrim(reminder.optString("type", "")));
                metadata.put("scheduledDueAt", safeTrim(reminder.optString("dueAt", "")));
                metadata.put("actualDispatchAt", attemptedAt);
                metadata.put("dispatchAttemptCount", reminder.optInt("dispatchAttemptCount", 0));
                long dueAtMs = AssistantTimeParser.parseIsoDateTime(reminder.optString("dueAt", ""));
                if (dueAtMs > 0L) {
                    metadata.put("delayMinutes", Math.max(0L, Math.round((nowMs - dueAtMs) / 60000.0)));
                }
                triggerPayload.put("metadata", metadata);
            } catch (org.json.JSONException ignored) {
            }

            appendDiagnostic(
                "reminder_due_dispatched",
                "success",
                "Native poll dispatched a reminder_due trigger",
                safeTrim(triggerPayload.optString("id", "")),
                "reminder_due",
                null,
                buildPollDiagnosticContext(nowMs)
            );

            AssistantNativeBackgroundExecutor.executeAsync(this, triggerPayload, new AssistantNativeBackgroundExecutor.ExecutionCallback() {
                @Override
                public void onCompleted() {
                    AssistantNativeReminderStore.markDispatched(AssistantAgentService.this, reminderId, isoNow());
                }

                @Override
                public void onFailed() {
                }
            });
        }
    }

    private void rescheduleAgentLoop() {
        handler.removeCallbacks(pollRunnable);
        scheduleNextRandomCheckin(System.currentTimeMillis());
        if (enabled) {
            handler.postDelayed(pollRunnable, Math.max(1, basePollMinutes) * 60_000L);
        }
        syncUnifiedStatusNotification();
    }

    private void applyConfig(Intent intent) {
        if (intent == null) {
            return;
        }

        if (intent.hasExtra("enabled")) {
            enabled = intent.getBooleanExtra("enabled", true);
        }
        if (intent.hasExtra("enableRandomCheckin")) {
            enableRandomCheckin = intent.getBooleanExtra("enableRandomCheckin", true);
        }
        if (intent.hasExtra("basePollMinutes")) {
            basePollMinutes = Math.max(1, intent.getIntExtra("basePollMinutes", 5));
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
            minimumNudgeGapMinutes = Math.max(1, intent.getIntExtra("minimumNudgeGapMinutes", 45));
        }
    }

    private void scheduleNextRandomCheckin(long nowMs) {
        if (!enableRandomCheckin) {
            nextRandomCheckinAtMs = 0L;
            return;
        }

        int minMinutes = Math.max(1, minCheckinMinutes);
        int maxMinutes = Math.max(minMinutes, maxCheckinMinutes);
        int spread = maxMinutes - minMinutes;
        int pickedMinutes = spread <= 0 ? minMinutes : minMinutes + random.nextInt(spread + 1);
        nextRandomCheckinAtMs = nowMs + (pickedMinutes * 60_000L);
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

        long minimumGapMs = Math.max(1, minimumNudgeGapMinutes) * 60_000L;
        return nowMs - latestRelevantActivityAtMs < minimumGapMs;
    }

    private long computeRetryCheckinAt(long nowMs) {
        long retryAt = nowMs + (Math.max(1, basePollMinutes) * 60_000L);
        if (minimumNudgeGapMinutes > 0) {
            long latestRelevantActivityAtMs = Math.max(
                lastAssistantNudgeAtMs,
                Math.max(lastUserTurnAtMs, lastTaskStateChangedAtMs)
            );
            if (latestRelevantActivityAtMs > 0L) {
                retryAt = Math.max(
                    retryAt,
                    latestRelevantActivityAtMs + (Math.max(1, minimumNudgeGapMinutes) * 60_000L)
                );
            }
        }
        return retryAt;
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
        lastUserTurnAtMs = Math.max(0L, sharedPreferences.getLong(KEY_LAST_USER_TURN_AT_MS, 0L));
        lastTaskStateChangedAtMs = Math.max(0L, sharedPreferences.getLong(KEY_LAST_TASK_STATE_CHANGED_AT_MS, 0L));
        lastAssistantNudgeAtMs = Math.max(0L, sharedPreferences.getLong(KEY_LAST_ASSISTANT_NUDGE_AT_MS, 0L));
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
        context.put("basePollMinutes", String.valueOf(basePollMinutes));
        context.put("minCheckinMinutes", String.valueOf(minCheckinMinutes));
        context.put("maxCheckinMinutes", String.valueOf(maxCheckinMinutes));
        context.put("minimumNudgeGapMinutes", String.valueOf(minimumNudgeGapMinutes));
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
            basePollMinutes,
            nextRandomCheckinAtMs
        );
        UnifiedServiceNotificationManager.refreshStatusNotification(this);
    }
}
