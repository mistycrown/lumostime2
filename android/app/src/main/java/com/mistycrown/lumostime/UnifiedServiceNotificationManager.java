/**
 * @file UnifiedServiceNotificationManager.java
 * @input Floating-window service and side-bubble state, assistant-agent runtime state, app focus sessions, and widget runtime state
 * @output A single shared Android foreground-status notification for background LumosTime services
 * @pos Native Helper
 * @description Keeps the floating window service, assistant agent service, and focus-only foreground service on one shared persistent Android notification while rendering active timer labels directly in the notification title.
 * @updated 2026-06-14: Exposed the persisted assistant enabled flag so alarm wakeups and service restarts can refuse to revive the agent after the user turns polling off.
 * @updated 2026-05-09: Added app-focus session syncing, widget-runtime title aggregation, and dedicated focus-only foreground-service handoff so active timers can keep the persistent notification visible without the floating window or assistant poller.
 * @updated 2026-04-27: Exposed assistant-runtime activity lookup so plugin-side user-turn and task-state signals only wake the service when the assistant loop is already active.
 * @updated 2026-08-15: Separates shared overlay-service activity from side-bubble visibility so app-awareness notifications never claim the bubble is enabled.
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

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class UnifiedServiceNotificationManager {
    private static final String PREFS_NAME = "lumostime_unified_service_status";
    private static final String CHANNEL_ID = "lumostime_runtime_status_channel";
    private static final int NOTIFICATION_ID = 2101;

    private static final String KEY_FLOATING_ACTIVE = "floating_active";
    private static final String KEY_FLOATING_FOCUSING = "floating_focusing";
    private static final String KEY_FLOATING_SERVICE_ACTIVE = "floating_service_active";
    private static final String KEY_ASSISTANT_ACTIVE = "assistant_active";
    private static final String KEY_ASSISTANT_ENABLED = "assistant_enabled";
    private static final String KEY_ASSISTANT_RANDOM_CHECKIN = "assistant_random_checkin";
    private static final String KEY_ASSISTANT_BASE_POLL_MINUTES = "assistant_base_poll_minutes";
    private static final String KEY_ASSISTANT_NEXT_CHECKIN_AT_MS = "assistant_next_checkin_at_ms";
    private static final String KEY_APP_FOCUS_SESSIONS = "app_focus_sessions";

    private UnifiedServiceNotificationManager() {
    }

    public static void startForeground(Service service) {
        if (service == null) {
            return;
        }

        createChannel(service);
        service.startForeground(NOTIFICATION_ID, buildNotification(service));
    }

    public static void reconcileNotificationState(Context context) {
        if (context == null) {
            return;
        }

        FocusNotificationService.sync(context);
        refreshStatusNotification(context);
    }

    public static void refreshStatusNotification(Context context) {
        if (context == null) {
            return;
        }

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) {
            return;
        }

        if (!hasNotificationDemand(context)) {
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

    public static void setFloatingWindowServiceState(Context context, boolean active) {
        prefs(context).edit()
            .putBoolean(KEY_FLOATING_SERVICE_ACTIVE, active)
            .apply();
    }

    public static void clearFloatingWindowState(Context context) {
        prefs(context).edit()
            .putBoolean(KEY_FLOATING_ACTIVE, false)
            .putBoolean(KEY_FLOATING_FOCUSING, false)
            .putBoolean(KEY_FLOATING_SERVICE_ACTIVE, false)
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

    public static void setActiveFocusSessions(Context context, JSONArray sessions) {
        prefs(context).edit()
            .putString(KEY_APP_FOCUS_SESSIONS, sanitizeFocusSessions(sessions).toString())
            .apply();
    }

    public static boolean hasActiveRuntime(Context context) {
        return hasNotificationDemand(context);
    }

    public static boolean isAssistantActive(Context context) {
        return prefs(context).getBoolean(KEY_ASSISTANT_ACTIVE, false);
    }

    public static boolean isAssistantEnabled(Context context) {
        return prefs(context).getBoolean(KEY_ASSISTANT_ENABLED, false);
    }

    public static boolean hasActiveFocusSessions(Context context) {
        return !getActiveFocusEntries(context).isEmpty();
    }

    public static boolean shouldRunDedicatedFocusService(Context context) {
        if (context == null) {
            return false;
        }

        SharedPreferences sharedPreferences = prefs(context);
        return !sharedPreferences.getBoolean(KEY_FLOATING_ACTIVE, false)
            && !sharedPreferences.getBoolean(KEY_FLOATING_SERVICE_ACTIVE, false)
            && !sharedPreferences.getBoolean(KEY_ASSISTANT_ACTIVE, false)
            && hasActiveFocusSessions(context);
    }

    private static boolean hasNotificationDemand(Context context) {
        SharedPreferences sharedPreferences = prefs(context);
        return sharedPreferences.getBoolean(KEY_FLOATING_ACTIVE, false)
            || sharedPreferences.getBoolean(KEY_FLOATING_SERVICE_ACTIVE, false)
            || sharedPreferences.getBoolean(KEY_ASSISTANT_ACTIVE, false)
            || hasActiveFocusSessions(context);
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
            .setContentTitle(buildTitle(context, System.currentTimeMillis()))
            .setContentText(buildContentText(context))
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    private static String buildTitle(Context context, long nowMs) {
        List<FocusEntry> focusEntries = getActiveFocusEntries(context);
        if (focusEntries.isEmpty()) {
            return "LumosTime \u540e\u53f0\u670d\u52a1\u8fd0\u884c\u4e2d";
        }

        List<String> parts = new ArrayList<>();
        for (FocusEntry entry : focusEntries) {
            parts.add(entry.label + " " + formatElapsed(nowMs - entry.startTime));
        }
        return join(parts, " · ");
    }

    private static String buildContentText(Context context) {
        SharedPreferences sharedPreferences = prefs(context);
        boolean floatingActive = sharedPreferences.getBoolean(KEY_FLOATING_ACTIVE, false);
        boolean floatingFocusing = sharedPreferences.getBoolean(KEY_FLOATING_FOCUSING, false);
        boolean floatingServiceActive = sharedPreferences.getBoolean(KEY_FLOATING_SERVICE_ACTIVE, false);
        boolean assistantActive = sharedPreferences.getBoolean(KEY_ASSISTANT_ACTIVE, false);

        if (floatingActive && assistantActive) {
            return String.format(
                Locale.getDefault(),
                "%s\uff0c%s",
                floatingFocusing ? "\u60ac\u6d6e\u7403\u8ba1\u65f6\u4e2d" : "\u60ac\u6d6e\u7403\u5df2\u5f00\u542f",
                buildAssistantStatusText(sharedPreferences, System.currentTimeMillis())
            );
        }

        if (floatingActive) {
            return floatingFocusing
                ? "\u60ac\u6d6e\u7403\u8ba1\u65f6\u4e2d\uff0c\u70b9\u51fb\u53ef\u7ed3\u675f\u5f53\u524d\u4e13\u6ce8"
                : "\u60ac\u6d6e\u7403\u5df2\u5f00\u542f\uff0c\u70b9\u51fb\u53ef\u8fd4\u56de LumosTime";
        }

        if (assistantActive) {
            return buildAssistantStatusText(sharedPreferences, System.currentTimeMillis());
        }

        if (floatingServiceActive) {
            return "\u5e94\u7528\u611f\u77e5\u670d\u52a1\u8fd0\u884c\u4e2d";
        }

        return "LumosTime \u6b63\u5728\u540e\u53f0\u8fd0\u884c";
    }

    private static String buildAssistantStatusText(SharedPreferences sharedPreferences, long nowMs) {
        boolean assistantEnabled = sharedPreferences.getBoolean(KEY_ASSISTANT_ENABLED, true);
        if (!assistantEnabled) {
            return "AI \u52a9\u7406\u540e\u53f0\u5df2\u6682\u505c";
        }

        boolean enableRandomCheckin = sharedPreferences.getBoolean(KEY_ASSISTANT_RANDOM_CHECKIN, true);
        int basePollMinutes = Math.max(1, sharedPreferences.getInt(KEY_ASSISTANT_BASE_POLL_MINUTES, 5));
        long nextRandomCheckinAtMs = sharedPreferences.getLong(KEY_ASSISTANT_NEXT_CHECKIN_AT_MS, 0L);

        if (!enableRandomCheckin || nextRandomCheckinAtMs <= 0L) {
            return String.format(
                Locale.getDefault(),
                "AI \u52a9\u7406\u540e\u53f0\u8f6e\u8be2\u4e2d\uff0c\u6bcf %d \u5206\u949f\u68c0\u67e5\u4e00\u6b21",
                basePollMinutes
            );
        }

        long remainingMinutes = Math.max(0L, (nextRandomCheckinAtMs - nowMs) / 60_000L);
        return String.format(
            Locale.getDefault(),
            "AI \u52a9\u7406\u540e\u53f0\u8f6e\u8be2\u4e2d\uff0c\u4e0b\u6b21\u968f\u673a\u68c0\u67e5\u7ea6 %d \u5206\u949f\u540e",
            remainingMinutes
        );
    }

    private static List<FocusEntry> getActiveFocusEntries(Context context) {
        if (context == null) {
            return Collections.emptyList();
        }

        Map<String, FocusEntry> dedupedEntries = new LinkedHashMap<>();
        for (FocusEntry entry : getAppFocusEntries(context)) {
            dedupedEntries.put(entry.id, entry);
        }

        FocusEntry widgetEntry = getWidgetFocusEntry(context);
        if (widgetEntry != null) {
            dedupedEntries.put(widgetEntry.id, widgetEntry);
        }

        List<FocusEntry> entries = new ArrayList<>(dedupedEntries.values());
        entries.sort(Comparator.comparingLong(entry -> entry.startTime));
        return entries;
    }

    private static List<FocusEntry> getAppFocusEntries(Context context) {
        List<FocusEntry> entries = new ArrayList<>();
        String raw = prefs(context).getString(KEY_APP_FOCUS_SESSIONS, "[]");
        if (raw == null || raw.trim().isEmpty()) {
            return entries;
        }

        try {
            JSONArray sessions = new JSONArray(raw);
            for (int index = 0; index < sessions.length(); index += 1) {
                JSONObject item = sessions.optJSONObject(index);
                if (item == null) {
                    continue;
                }

                String id = trimToNull(item.optString("id", null));
                String label = sanitizeLabel(item.optString("label", null));
                long startTime = item.optLong("startTime", 0L);
                if (id == null || startTime <= 0L) {
                    continue;
                }

                entries.add(new FocusEntry(id, label, startTime));
            }
        } catch (Exception ignored) {
        }

        return entries;
    }

    private static FocusEntry getWidgetFocusEntry(Context context) {
        try {
            WidgetRuntimeState runtimeState = WidgetStores.INSTANCE.loadRuntimeState(context);
            if (runtimeState == null || runtimeState.getStartedAt() <= 0L) {
                return null;
            }

            if (!"widget".equals(runtimeState.getSource())) {
                return null;
            }

            return new FocusEntry(
                runtimeState.getId(),
                sanitizeLabel(runtimeState.getLabel()),
                runtimeState.getStartedAt()
            );
        } catch (Exception ignored) {
            return null;
        }
    }

    private static JSONArray sanitizeFocusSessions(JSONArray sessions) {
        JSONArray sanitized = new JSONArray();
        if (sessions == null) {
            return sanitized;
        }

        for (int index = 0; index < sessions.length(); index += 1) {
            JSONObject item = sessions.optJSONObject(index);
            if (item == null) {
                continue;
            }

            String id = trimToNull(item.optString("id", null));
            long startTime = item.optLong("startTime", 0L);
            if (id == null || startTime <= 0L) {
                continue;
            }

            JSONObject normalized = new JSONObject();
            try {
                normalized.put("id", id);
                normalized.put("label", sanitizeLabel(item.optString("label", null)));
                normalized.put("startTime", startTime);
                sanitized.put(normalized);
            } catch (Exception ignored) {
            }
        }

        return sanitized;
    }

    private static String sanitizeLabel(String rawLabel) {
        String normalized = trimToNull(rawLabel);
        if (normalized == null) {
            return "\u8ba1\u65f6";
        }

        return normalized.replace('\n', ' ').replace('\r', ' ');
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String formatElapsed(long elapsedMs) {
        long safeElapsedMs = Math.max(0L, elapsedMs);
        if (safeElapsedMs > 24L * 60L * 60L * 1000L) {
            safeElapsedMs = 0L;
        }

        long totalSeconds = safeElapsedMs / 1000L;
        long totalMinutes = totalSeconds / 60L;
        long seconds = totalSeconds % 60L;
        return String.format(Locale.getDefault(), "%02d:%02d", totalMinutes, seconds);
    }

    private static String join(List<String> parts, String delimiter) {
        if (parts.isEmpty()) {
            return "";
        }

        StringBuilder builder = new StringBuilder();
        for (int index = 0; index < parts.size(); index += 1) {
            if (index > 0) {
                builder.append(delimiter);
            }
            builder.append(parts.get(index));
        }
        return builder.toString();
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
            "LumosTime \u540e\u53f0\u670d\u52a1",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("\u7edf\u4e00\u663e\u793a LumosTime \u60ac\u6d6e\u7403\u3001AI \u52a9\u7406\u548c\u4e13\u6ce8\u8ba1\u65f6\u7684\u540e\u53f0\u8fd0\u884c\u72b6\u6001");
        manager.createNotificationChannel(channel);
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private static final class FocusEntry {
        private final String id;
        private final String label;
        private final long startTime;

        private FocusEntry(String id, String label, long startTime) {
            this.id = id;
            this.label = label;
            this.startTime = startTime;
        }
    }
}
