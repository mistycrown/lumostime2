/**
 * @file TodoReminderScheduler.java
 * @input Complete committed todo-reminder snapshots and system alarm/lifecycle events
 * @output Durable independent reminder scheduling and Android system notifications
 * @pos Native reminder engine; does not start services, WebView or AI
 * @updated 2026-10-18: Reconciles opt-in calendar events after notification scheduling, isolating calendar failures.
 * @updated 2026-10-17: Adds one batched AlarmManager wakeup, delivery deduplication and snapshot reconciliation.
 */
package com.mistycrown.lumostime;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;
import java.util.TimeZone;

public final class TodoReminderScheduler {
    public static final String CHANNEL_ID = "todo_date_reminders";
    private static final String TAG = "TodoReminder";
    private static final String PREFS = "lumostime_todo_reminders";
    private static final String SNAPSHOT = "snapshot";
    private static final String ACTION = "com.mistycrown.lumostime.TODO_REMINDER_DUE";
    private static final int REQUEST_CODE = 4201;

    private TodoReminderScheduler() {}

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static JSONArray read(Context context) throws JSONException {
        return new JSONArray(prefs(context).getString(SNAPSHOT, "[]"));
    }

    private static void write(Context context, JSONArray reminders) {
        // A receiver may be the only running component: do not defer persistence with apply().
        if (!prefs(context).edit().putString(SNAPSHOT, reminders.toString()).commit()) {
            throw new IllegalStateException("Unable to save reminder snapshot");
        }
    }

    static boolean sameSchedule(JSONObject left, JSONObject right) {
        return left.optString("date").equals(right.optString("date"))
            && left.optString("time").equals(right.optString("time"))
            && left.optInt("daysBefore") == right.optInt("daysBefore");
    }

    public static synchronized void sync(Context context, JSONArray incoming) throws JSONException {
        JSONArray previous = read(context);
        Map<String, JSONObject> oldById = new HashMap<>();
        for (int i = 0; i < previous.length(); i++) {
            JSONObject entry = previous.getJSONObject(i);
            oldById.put(entry.getString("id"), entry);
        }
        JSONArray next = new JSONArray();
        Map<String, JSONObject> retained = new HashMap<>();
        for (int i = 0; i < incoming.length(); i++) {
            JSONObject input = incoming.getJSONObject(i);
            String todoId = input.getString("todoId");
            String field = input.getString("field");
            String id = todoId + ":" + field;
            if (todoId.isEmpty() || !("scheduledDate".equals(field) || "deadlineDate".equals(field))
                || !id.equals(input.getString("id")) || retained.containsKey(id)
                || input.getString("title").trim().isEmpty()) {
                throw new IllegalArgumentException("Invalid reminder identity");
            }
            // Validate the whole batch before replacing the durable snapshot.
            Object offset = input.get("daysBefore");
            if (!(offset instanceof Number) || ((Number) offset).doubleValue() != input.getInt("daysBefore")) {
                throw new IllegalArgumentException("Invalid reminder offset");
            }
            triggerAt(input);
            JSONObject entry = new JSONObject();
            for (String key : new String[] { "id", "todoId", "field", "title", "date", "daysBefore", "time" }) {
                entry.put(key, input.get(key));
            }
            if (Boolean.TRUE.equals(input.opt("calendarSync"))) entry.put("calendarSync", true);
            JSONObject old = oldById.get(id);
            entry.put("delivered", old != null && sameSchedule(old, entry) && old.optBoolean("delivered"));
            next.put(entry);
            retained.put(id, entry);
        }
        write(context, next);
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        for (int i = 0; i < previous.length(); i++) {
            JSONObject old = previous.getJSONObject(i);
            JSONObject replacement = retained.get(old.getString("id"));
            if (manager != null && (replacement == null || !sameSchedule(old, replacement))) {
                manager.cancel(old.getString("id"), 0);
            }
        }
        restore(context);
    }

    public static synchronized void restore(Context context) {
        try {
            createChannel(context);
            JSONArray reminders = read(context);
            long now = System.currentTimeMillis();
            boolean changed = false;
            if (notificationsEnabled(context)) {
                for (int i = 0; i < reminders.length(); i++) {
                    JSONObject entry = reminders.getJSONObject(i);
                    long at;
                    try { at = triggerAt(entry); } catch (IllegalArgumentException invalid) { continue; }
                    if (TodoReminderTime.shouldDeliver(at, now, entry.optBoolean("delivered"))) {
                        show(context, entry);
                        entry.put("delivered", true);
                        changed = true;
                    }
                }
            }
            if (changed) write(context, reminders);
            scheduleNext(context, reminders, now);
            TodoReminderCalendar.reconcile(context, reminders);
        } catch (Exception error) {
            Log.e(TAG, "Unable to restore todo reminders", error);
            throw new IllegalStateException("Unable to schedule todo reminders", error);
        }
    }

    private static long triggerAt(JSONObject entry) throws JSONException {
        return TodoReminderTime.triggerAt(entry.getString("date"), entry.getInt("daysBefore"),
            entry.getString("time"), TimeZone.getDefault());
    }

    private static void scheduleNext(Context context, JSONArray reminders, long now) throws JSONException {
        AlarmManager manager = context.getSystemService(AlarmManager.class);
        if (manager == null) throw new IllegalStateException("Alarm service unavailable");
        Intent intent = new Intent(context, TodoReminderReceiver.class).setAction(ACTION);
        PendingIntent pending = PendingIntent.getBroadcast(context, REQUEST_CODE, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        manager.cancel(pending);
        long next = Long.MAX_VALUE;
        for (int i = 0; i < reminders.length(); i++) {
            JSONObject entry = reminders.getJSONObject(i);
            if (entry.optBoolean("delivered")) continue;
            try {
                long at = triggerAt(entry);
                if (at > now) next = Math.min(next, at);
            } catch (IllegalArgumentException invalid) {
                Log.w(TAG, "Skipping unavailable local reminder time");
            }
        }
        if (next == Long.MAX_VALUE) { pending.cancel(); return; }
        if (canScheduleExact(context)) {
            try {
                manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pending);
                return;
            } catch (SecurityException revoked) {
                Log.w(TAG, "Exact alarm access changed; scheduling approximate reminder", revoked);
            }
        }
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pending);
    }

    public static boolean canScheduleExact(Context context) {
        AlarmManager manager = context.getSystemService(AlarmManager.class);
        return manager != null && (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || manager.canScheduleExactAlarms());
    }

    public static boolean notificationsEnabled(Context context) {
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            NotificationChannel channel = manager == null ? null : manager.getNotificationChannel(CHANNEL_ID);
            return channel == null || channel.getImportance() != NotificationManager.IMPORTANCE_NONE;
        }
        return true;
    }

    static void createChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "待办提醒", NotificationManager.IMPORTANCE_HIGH);
        channel.enableVibration(true);
        manager.createNotificationChannel(channel);
    }

    private static void show(Context context, JSONObject entry) throws JSONException {
        String todoId = entry.getString("todoId");
        String field = entry.getString("field");
        String text = ("deadlineDate".equals(field) ? "截止日期 · " : "安排日期 · ") + entry.getString("date").replace('-', '.');
        Intent intent = new Intent(context, MainActivity.class)
            .setAction("com.mistycrown.lumostime.OPEN_TODO_REMINDER")
            .setData(Uri.parse("lumostime://todo-reminder/" + Uri.encode(todoId) + "/" + field))
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP)
            .putExtra("todo_reminder_target", todoId);
        PendingIntent content = PendingIntent.getActivity(context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) throw new IllegalStateException("Notification service unavailable");
        manager.notify(entry.getString("id"), 0, new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_popup_reminder)
            .setContentTitle(entry.getString("title"))
            .setContentText(text)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setContentIntent(content)
            .setAutoCancel(true)
            .build());
    }
}
