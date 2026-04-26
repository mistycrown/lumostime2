/**
 * @file AssistantAgentService.java
 * @input Foreground-service control intents and lightweight polling config
 * @output Persistent Android agent loop, foreground notification, and bridge-triggered assistant events
 * @pos Native Service
 * @description Minimal Android foreground service scaffold for the background AI agent. Maintains a lightweight polling loop, supports immediate/manual check-ins, and emits assistant system-trigger events through the Capacitor plugin bridge.
 */
package com.mistycrown.lumostime;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import androidx.core.app.NotificationCompat;

import java.util.Locale;
import java.util.Random;

public class AssistantAgentService extends Service {
    public static final String ACTION_START = "com.mistycrown.lumostime.action.ASSISTANT_AGENT_START";
    public static final String ACTION_STOP = "com.mistycrown.lumostime.action.ASSISTANT_AGENT_STOP";
    public static final String ACTION_UPDATE_CONFIG = "com.mistycrown.lumostime.action.ASSISTANT_AGENT_UPDATE_CONFIG";
    public static final String ACTION_TRIGGER_IMMEDIATE = "com.mistycrown.lumostime.action.ASSISTANT_AGENT_TRIGGER_IMMEDIATE";

    private static final String CHANNEL_ID = "assistant_agent_channel";
    private static final int NOTIFICATION_ID = 2201;

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

            updateNotification(buildNotificationText(now));
            handler.postDelayed(this, Math.max(1, basePollMinutes) * 60_000L);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startForeground(NOTIFICATION_ID, createNotification("AI 助理后台待命中"));
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : ACTION_START;

        if (ACTION_STOP.equals(action)) {
            stopAgentLoop();
            stopForeground(true);
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
        }

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        stopAgentLoop();
        stopForeground(true);
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

    private String buildNotificationText(long nowMs) {
        if (!enabled) {
            return "AI 助理后台已暂停";
        }

        if (!enableRandomCheckin || nextRandomCheckinAtMs <= 0L) {
            return String.format(Locale.getDefault(), "AI 助理后台轮询中，每 %d 分钟检查一次", basePollMinutes);
        }

        long remainingMinutes = Math.max(0L, (nextRandomCheckinAtMs - nowMs) / 60_000L);
        return String.format(
            Locale.getDefault(),
            "AI 助理后台轮询中，下次随机检查约 %d 分钟后",
            remainingMinutes
        );
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "AI 助理后台服务",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("保持 LumosTime AI 助理在后台轮询与待命");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification(String contentText) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("LumosTime AI 助理")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    private void updateNotification(String contentText) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, createNotification(contentText));
        }
    }
}
