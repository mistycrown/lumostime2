/**
 * @file AssistantAgentService.java
 * @input Foreground-service control intents and lightweight polling config
 * @output Persistent Android agent loop, shared runtime notification state, and bridge-triggered assistant events
 * @pos Native Service
 * @description Minimal Android foreground service scaffold for the background AI agent. Maintains a lightweight polling loop, shares one persistent Android status notification with the floating-window service, and emits assistant system-trigger events through the Capacitor plugin bridge.
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
            if (enableRandomCheckin && nextRandomCheckinAtMs > 0L && now >= nextRandomCheckinAtMs) {
                if (shouldDispatchRandomCheckin(now)) {
                    AssistantAgentPlugin.dispatchSystemTrigger(
                        "checkin",
                        "Assistant background check-in trigger",
                        "system"
                    );
                    recordAssistantNudge(now);
                    scheduleNextRandomCheckin(now);
                } else {
                    nextRandomCheckinAtMs = computeRetryCheckinAt(now);
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
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : ACTION_START;

        if (ACTION_STOP.equals(action)) {
            stopAgentLoop();
            UnifiedServiceNotificationManager.clearAssistantState(this);
            stopForeground(false);
            UnifiedServiceNotificationManager.refreshStatusNotification(this);
            stopSelf();
            return START_NOT_STICKY;
        }

        applyConfig(intent);

        if (ACTION_NOTIFY_USER_TURN.equals(action)) {
            recordUserTurn(System.currentTimeMillis());
            if (loopStarted) {
                rescheduleAgentLoop();
            } else {
                syncUnifiedStatusNotification();
            }
            return START_STICKY;
        }

        if (ACTION_NOTIFY_TASK_STATE_CHANGED.equals(action)) {
            recordTaskStateChanged(System.currentTimeMillis());
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
            AssistantAgentPlugin.dispatchSystemTrigger(
                "manual_background_nudge",
                "Manual immediate background assistant trigger",
                "system"
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
