/**
 * @file AssistantCheckinAlarmScheduler.java
 * @input Android context plus the next random check-in timestamp
 * @output AlarmManager-backed wakeup scheduling for assistant check-ins
 * @pos Native Helper
 * @description Schedules one exact-or-best-available alarm for the next random assistant check-in so it no longer depends on a periodic in-process poll.
 * @updated 2026-09-03: Added dedicated AlarmManager scheduling and cancellation for random assistant check-ins.
 */
package com.mistycrown.lumostime;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public final class AssistantCheckinAlarmScheduler {
    private static final String ACTION_CHECKIN_ALARM =
        "com.mistycrown.lumostime.action.ASSISTANT_CHECKIN_ALARM";
    private static final int REQUEST_CODE = 4104;

    private AssistantCheckinAlarmScheduler() {
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
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent);
                return;
            }

            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent);
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
        Intent intent = new Intent(context, AssistantCheckinAlarmReceiver.class);
        intent.setAction(ACTION_CHECKIN_ALARM);
        intent.setPackage(context.getPackageName());
        return PendingIntent.getBroadcast(
            context,
            REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
