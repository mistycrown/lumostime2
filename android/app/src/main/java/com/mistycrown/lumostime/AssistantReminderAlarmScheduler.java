/**
 * @file AssistantReminderAlarmScheduler.java
 * @input Android context plus the next eligible reminder dispatch timestamp
 * @output AlarmManager-backed wakeup scheduling for assistant due reminders
 * @pos Native Helper
 * @description Schedules one exact-or-best-available alarm for the next pending assistant reminder so reminder_due dispatch can wake promptly even while the app process is idle.
 * @updated 2026-05-13: Added AlarmManager scheduling and cancellation helpers for assistant due reminders, preferring exact idle-allowed alarms when the platform grants that access.
 */
package com.mistycrown.lumostime;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public final class AssistantReminderAlarmScheduler {
    private static final String ACTION_REMINDER_ALARM =
        "com.mistycrown.lumostime.action.ASSISTANT_REMINDER_ALARM";
    private static final int REQUEST_CODE = 4102;

    private AssistantReminderAlarmScheduler() {
    }

    public static void schedule(Context context, long triggerAtMs) {
        if (context == null) {
            return;
        }

        cancel(context);
        if (triggerAtMs <= 0L) {
            return;
        }

        AlarmManager alarmManager = context.getSystemService(AlarmManager.class);
        if (alarmManager == null) {
            return;
        }

        PendingIntent pendingIntent = buildPendingIntent(context);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarmManager.canScheduleExactAlarms()) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent);
            return;
        }

        alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent);
    }

    public static void cancel(Context context) {
        if (context == null) {
            return;
        }

        AlarmManager alarmManager = context.getSystemService(AlarmManager.class);
        PendingIntent pendingIntent = buildPendingIntent(context);
        if (alarmManager != null) {
            alarmManager.cancel(pendingIntent);
        }
        pendingIntent.cancel();
    }

    private static PendingIntent buildPendingIntent(Context context) {
        Intent intent = new Intent(context, AssistantReminderAlarmReceiver.class);
        intent.setAction(ACTION_REMINDER_ALARM);
        intent.setPackage(context.getPackageName());
        return PendingIntent.getBroadcast(
            context,
            REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
