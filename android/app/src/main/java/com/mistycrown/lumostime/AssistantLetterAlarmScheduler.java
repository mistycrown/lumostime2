/**
 * @file AssistantLetterAlarmScheduler.java
 * @input Android context plus the next assistant-letter dispatch timestamp
 * @output AlarmManager-backed wakeup scheduling for due assistant-letter triggers
 * @pos Native Helper
 * @description Schedules one exact-or-best-available alarm for the next AI letter so assistant_letter_due can be emitted while the app is idle.
 * @updated 2026-07-07: Added native assistant-letter alarm scheduling parallel to the reminder alarm path.
 */
package com.mistycrown.lumostime;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public final class AssistantLetterAlarmScheduler {
    private static final String ACTION_LETTER_ALARM =
        "com.mistycrown.lumostime.action.ASSISTANT_LETTER_ALARM";
    private static final int REQUEST_CODE = 4103;

    private AssistantLetterAlarmScheduler() {
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
        Intent intent = new Intent(context, AssistantLetterAlarmReceiver.class);
        intent.setAction(ACTION_LETTER_ALARM);
        intent.setPackage(context.getPackageName());
        return PendingIntent.getBroadcast(
            context,
            REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
