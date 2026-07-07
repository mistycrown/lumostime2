/**
 * @file AssistantLetterAlarmReceiver.java
 * @input Android alarm broadcasts emitted for the next scheduled assistant letter
 * @output Wakes the assistant foreground service so due AI letters can dispatch on time
 * @pos Native Receiver
 * @description Receives the scheduled assistant-letter alarm and re-enters the assistant agent service to emit one assistant_letter_due system trigger.
 * @updated 2026-07-07: Added the native receiver used by AI letter scheduling on Android.
 */
package com.mistycrown.lumostime;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class AssistantLetterAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null) {
            return;
        }

        if (!UnifiedServiceNotificationManager.isAssistantEnabled(context)) {
            AssistantLetterAlarmScheduler.cancel(context);
            return;
        }

        Intent serviceIntent = new Intent(context, AssistantAgentService.class);
        serviceIntent.setAction(AssistantAgentService.ACTION_TRIGGER_LETTER_TIMER);
        serviceIntent.putExtra("triggeredAtMs", System.currentTimeMillis());

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
            return;
        }

        context.startService(serviceIntent);
    }
}
