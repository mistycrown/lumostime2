/**
 * @file AssistantCheckinAlarmReceiver.java
 * @input Android alarm broadcasts emitted for the next random assistant check-in
 * @output Wakes the assistant foreground service to consume one due check-in opportunity
 * @pos Native Receiver
 * @description Receives the scheduled check-in alarm and immediately re-enters the assistant agent service without relying on a periodic Handler poll.
 * @updated 2026-09-03: Added the dedicated random check-in alarm receiver.
 */
package com.mistycrown.lumostime;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class AssistantCheckinAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null) {
            return;
        }

        if (!UnifiedServiceNotificationManager.isAssistantEnabled(context)) {
            AssistantCheckinAlarmScheduler.cancel(context);
            return;
        }

        Intent serviceIntent = new Intent(context, AssistantAgentService.class);
        serviceIntent.setAction(AssistantAgentService.ACTION_TRIGGER_CHECKIN_TIMER);
        serviceIntent.putExtra("triggeredAtMs", System.currentTimeMillis());

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
            return;
        }

        context.startService(serviceIntent);
    }
}
