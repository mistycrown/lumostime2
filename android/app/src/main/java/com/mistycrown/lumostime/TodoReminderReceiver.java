/**
 * @file TodoReminderReceiver.java
 * @input Scheduled reminder, reboot, update, time/timezone and exact-permission broadcasts
 * @output Rebuilt native alarms and due notifications without starting the app runtime
 * @pos Native Receiver
 * @updated 2026-10-18: Moves provider reconciliation off the broadcast main thread with goAsync.
 * @updated 2026-10-17: Restores durable todo reminders independently of the assistant service.
 */
package com.mistycrown.lumostime;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class TodoReminderReceiver extends BroadcastReceiver {
    private static final ExecutorService WORKER = Executors.newSingleThreadExecutor();

    @Override
    public void onReceive(Context context, Intent intent) {
        PendingResult pending = goAsync();
        WORKER.execute(() -> {
            try {
                TodoReminderScheduler.restore(context.getApplicationContext());
            } catch (Exception error) {
                Log.e("TodoReminder", "Reminder broadcast could not be handled", error);
            } finally { pending.finish(); }
        });
    }
}
