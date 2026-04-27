/**
 * @file UnifiedServiceNotificationManager.java
 * @input Floating-window runtime state and assistant-agent runtime state
 * @output A single shared Android foreground-status notification for background LumosTime services
 * @pos Native Helper
 * @description Keeps the floating window service and assistant agent service on one shared persistent Android notification while still letting AI active-message alerts appear as separate non-ongoing notifications.
 * @updated 2026-04-27: Exposed assistant-runtime activity lookup so plugin-side user-turn and task-state signals only wake the service when the assistant loop is already active.
 */
package com.mistycrown.lumostime;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import java.util.Locale;

public final class UnifiedServiceNotificationManager {
    private static final String PREFS_NAME = "lumostime_unified_service_status";
    private static final String CHANNEL_ID = "lumostime_runtime_status_channel";
    private static final int NOTIFICATION_ID = 2101;

    private static final String KEY_FLOATING_ACTIVE = "floating_active";
    private static final String KEY_FLOATING_FOCUSING = "floating_focusing";
    private static final String KEY_ASSISTANT_ACTIVE = "assistant_active";
    private static final String KEY_ASSISTANT_ENABLED = "assistant_enabled";
    private static final String KEY_ASSISTANT_RANDOM_CHECKIN = "assistant_random_checkin";
    private static final String KEY_ASSISTANT_BASE_POLL_MINUTES = "assistant_base_poll_minutes";
    private static final String KEY_ASSISTANT_NEXT_CHECKIN_AT_MS = "assistant_next_checkin_at_ms";

    private UnifiedServiceNotificationManager() {
    }

    public static void startForeground(Service service) {
        if (service == null) {
            return;
        }

        createChannel(service);
        service.startForeground(NOTIFICATION_ID, buildNotification(service));
    }

    public static void refreshStatusNotification(Context context) {
        if (context == null) {
            return;
        }

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) {
            return;
        }

        if (!hasActiveRuntime(context)) {
            manager.cancel(NOTIFICATION_ID);
            return;
        }

        createChannel(context);
        manager.notify(NOTIFICATION_ID, buildNotification(context));
    }

    public static void setFloatingWindowState(Context context, boolean active, boolean isFocusing) {
        prefs(context).edit()
            .putBoolean(KEY_FLOATING_ACTIVE, active)
            .putBoolean(KEY_FLOATING_FOCUSING, active && isFocusing)
            .apply();
    }

    public static void clearFloatingWindowState(Context context) {
        prefs(context).edit()
            .putBoolean(KEY_FLOATING_ACTIVE, false)
            .putBoolean(KEY_FLOATING_FOCUSING, false)
            .apply();
    }

    public static void setAssistantState(
        Context context,
        boolean active,
        boolean enabled,
        boolean enableRandomCheckin,
        int basePollMinutes,
        long nextRandomCheckinAtMs
    ) {
        prefs(context).edit()
            .putBoolean(KEY_ASSISTANT_ACTIVE, active)
            .putBoolean(KEY_ASSISTANT_ENABLED, enabled)
            .putBoolean(KEY_ASSISTANT_RANDOM_CHECKIN, enableRandomCheckin)
            .putInt(KEY_ASSISTANT_BASE_POLL_MINUTES, Math.max(1, basePollMinutes))
            .putLong(KEY_ASSISTANT_NEXT_CHECKIN_AT_MS, Math.max(0L, nextRandomCheckinAtMs))
            .apply();
    }

    public static void clearAssistantState(Context context) {
        prefs(context).edit()
            .putBoolean(KEY_ASSISTANT_ACTIVE, false)
            .putBoolean(KEY_ASSISTANT_ENABLED, false)
            .putBoolean(KEY_ASSISTANT_RANDOM_CHECKIN, true)
            .putInt(KEY_ASSISTANT_BASE_POLL_MINUTES, 5)
            .putLong(KEY_ASSISTANT_NEXT_CHECKIN_AT_MS, 0L)
            .apply();
    }

    public static boolean hasActiveRuntime(Context context) {
        SharedPreferences sharedPreferences = prefs(context);
        return sharedPreferences.getBoolean(KEY_FLOATING_ACTIVE, false)
            || sharedPreferences.getBoolean(KEY_ASSISTANT_ACTIVE, false);
    }

    public static boolean isAssistantActive(Context context) {
        return prefs(context).getBoolean(KEY_ASSISTANT_ACTIVE, false);
    }

    private static Notification buildNotification(Context context) {
        Intent notificationIntent = new Intent(context, MainActivity.class);
        notificationIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            NOTIFICATION_ID,
            notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle("LumosTime 后台服务运行中")
            .setContentText(buildContentText(context))
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    private static String buildContentText(Context context) {
        SharedPreferences sharedPreferences = prefs(context);
        boolean floatingActive = sharedPreferences.getBoolean(KEY_FLOATING_ACTIVE, false);
        boolean floatingFocusing = sharedPreferences.getBoolean(KEY_FLOATING_FOCUSING, false);
        boolean assistantActive = sharedPreferences.getBoolean(KEY_ASSISTANT_ACTIVE, false);

        if (floatingActive && assistantActive) {
            return String.format(
                Locale.getDefault(),
                "%s，%s",
                floatingFocusing ? "悬浮球计时中" : "悬浮球已开启",
                buildAssistantStatusText(sharedPreferences, System.currentTimeMillis())
            );
        }

        if (floatingActive) {
            return floatingFocusing
                ? "悬浮球计时中，点击可结束当前专注"
                : "悬浮球已开启，点击可返回 LumosTime";
        }

        if (assistantActive) {
            return buildAssistantStatusText(sharedPreferences, System.currentTimeMillis());
        }

        return "LumosTime 正在后台运行";
    }

    private static String buildAssistantStatusText(SharedPreferences sharedPreferences, long nowMs) {
        boolean assistantEnabled = sharedPreferences.getBoolean(KEY_ASSISTANT_ENABLED, true);
        if (!assistantEnabled) {
            return "AI 助理后台已暂停";
        }

        boolean enableRandomCheckin = sharedPreferences.getBoolean(KEY_ASSISTANT_RANDOM_CHECKIN, true);
        int basePollMinutes = Math.max(1, sharedPreferences.getInt(KEY_ASSISTANT_BASE_POLL_MINUTES, 5));
        long nextRandomCheckinAtMs = sharedPreferences.getLong(KEY_ASSISTANT_NEXT_CHECKIN_AT_MS, 0L);

        if (!enableRandomCheckin || nextRandomCheckinAtMs <= 0L) {
            return String.format(
                Locale.getDefault(),
                "AI 助理后台轮询中，每 %d 分钟检查一次",
                basePollMinutes
            );
        }

        long remainingMinutes = Math.max(0L, (nextRandomCheckinAtMs - nowMs) / 60_000L);
        return String.format(
            Locale.getDefault(),
            "AI 助理后台轮询中，下次随机检查约 %d 分钟后",
            remainingMinutes
        );
    }

    private static void createChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "LumosTime 后台服务",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("统一显示 LumosTime 悬浮球和 AI 助理的后台运行状态");
        manager.createNotificationChannel(channel);
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }
}
