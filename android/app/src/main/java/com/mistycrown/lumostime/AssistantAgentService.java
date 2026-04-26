/**
 * @file AssistantAgentService.java
 * @input Foreground-service control intents and lightweight polling config
 * @output Persistent Android agent loop, shared runtime notification state, and bridge-triggered assistant events
 * @pos Native Service
 * @description Minimal Android foreground service scaffold for the background AI agent. Maintains a lightweight polling loop, shares one persistent Android status notification with the floating-window service, and emits assistant system-trigger events through the Capacitor plugin bridge.
 * @updated 2026-04-26: Re-schedules the next random check-in whenever runtime config changes so shorter intervals take effect immediately instead of waiting for an older long-delay schedule to expire.
 */
package com.mistycrown.lumostime;

import android.app.Service;
import android.content.Intent;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import java.util.Random;

public class AssistantAgentService extends Service {
    public static final String ACTION_START = "com.mistycrown.lumostime.action.ASSISTANT_AGENT_START";
    public static final String ACTION_STOP = "com.mistycrown.lumostime.action.ASSISTANT_AGENT_STOP";
    public static final String ACTION_UPDATE_CONFIG = "com.mistycrown.lumostime.action.ASSISTANT_AGENT_UPDATE_CONFIG";
    public static final String ACTION_TRIGGER_IMMEDIATE = "com.mistycrown.lumostime.action.ASSISTANT_AGENT_TRIGGER_IMMEDIATE";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Random random = new Random();

    private boolean enabled = true;
    private boolean enableRandomCheckin = true;
    private int basePollMinutes = 5;
    private int minCheckinMinutes = 45;
    private int maxCheckinMinutes = 120;
    private boolean loopStarted = false;
    private long nextRandomCheckinAtMs = 0L;

    private final Runnable pollRunnable = new Runnable() {
        @Override
        public void run() {
            if (!enabled) {
                return;
            }

            long now = System.currentTimeMillis();
            if (enableRandomCheckin && nextRandomCheckinAtMs > 0L && now >= nextRandomCheckinAtMs) {
                AssistantAgentPlugin.dispatchSystemTrigger(
                    "checkin",
                    "Assistant background check-in trigger",
                    "system"
                );
                scheduleNextRandomCheckin(now);
            }

            syncUnifiedStatusNotification();
            handler.postDelayed(this, Math.max(1, basePollMinutes) * 60_000L);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
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

        if (ACTION_TRIGGER_IMMEDIATE.equals(action)) {
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
