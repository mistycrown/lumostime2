/**
 * @file AssistantReminderAlarmReceiver.java
 * @input Android alarm broadcasts emitted for the next pending assistant reminder
 * @output Wakes the assistant foreground service so due reminders can dispatch on time
 * @pos Native Receiver
 * @description Receives the scheduled reminder alarm and immediately re-enters the assistant agent service, avoiding in-process Handler delays while the device is idle.
 * @updated 2026-06-14: Ignore stale reminder alarms when the assistant agent has been disabled so closing background polling cannot be undone by a queued alarm.
 * @updated 2026-05-13: Added a dedicated reminder alarm receiver so due reminders can wake the assistant service from AlarmManager instead of waiting on a delayed Handler callback.
 */
package com.mistycrown.lumostime;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class AssistantReminderAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null) {
            return;
        }

        if (!UnifiedServiceNotificationManager.isAssistantEnabled(context)) {
            AssistantReminderAlarmScheduler.cancel(context);
            return;
        }

        Intent serviceIntent = new Intent(context, AssistantAgentService.class);
        serviceIntent.setAction(AssistantAgentService.ACTION_TRIGGER_REMINDER_TIMER);
        serviceIntent.putExtra("triggeredAtMs", System.currentTimeMillis());

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
            return;
        }

        context.startService(serviceIntent);
    }
}
