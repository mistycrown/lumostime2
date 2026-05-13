/**
 * @file AssistantMessageNotificationManager.java
 * @input Assistant notification title/body plus target chat navigation metadata
 * @output Android system notifications for active assistant messages
 * @pos Native Helper
 * @description Shows assistant notifications and keeps due reminders on a dedicated high-priority alert channel.
 * @updated 2026-05-13: Added a dedicated high-priority reminder channel so native reminder_due completions can alert immediately with their own sound/vibration path.
 */
package com.mistycrown.lumostime;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;

import androidx.core.app.NotificationCompat;

public final class AssistantMessageNotificationManager {
    private static final String CHANNEL_ID = "assistant_active_message_channel";
    private static final String REMINDER_CHANNEL_ID = "assistant_due_reminder_channel";
    private static final int NOTIFICATION_ID = 2202;
    private static final int REMINDER_NOTIFICATION_ID = 2203;

    private AssistantMessageNotificationManager() {
    }

    public static void showNotification(
        Context context,
        String title,
        String body,
        String targetSessionId,
        String targetMessageId
    ) {
        if (context == null) {
            return;
        }

        createChannel(context);
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) {
            return;
        }

        String resolvedTitle = safeTrim(title).isEmpty() ? "LumosTime AI" : title.trim();
        String resolvedBody = safeTrim(body).isEmpty() ? "The assistant has a new background message." : body.trim();

        manager.notify(
            NOTIFICATION_ID,
            new NotificationCompat.Builder(context, CHANNEL_ID)
                .setContentTitle(resolvedTitle)
                .setContentText(resolvedBody)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(resolvedBody))
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setContentIntent(
                    AssistantNotificationNavigationStore.buildContentIntent(
                        context,
                        targetSessionId,
                        targetMessageId
                    )
                )
                .build()
        );
    }

    public static void showReminderNotification(
        Context context,
        String title,
        String body,
        String targetSessionId,
        String targetMessageId
    ) {
        if (context == null) {
            return;
        }

        createReminderChannel(context);
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) {
            return;
        }

        String resolvedTitle = safeTrim(title).isEmpty() ? "AI Reminder" : title.trim();
        String resolvedBody = safeTrim(body).isEmpty() ? "A reminder is due now." : body.trim();

        manager.notify(
            REMINDER_NOTIFICATION_ID,
            new NotificationCompat.Builder(context, REMINDER_CHANNEL_ID)
                .setContentTitle(resolvedTitle)
                .setContentText(resolvedBody)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(resolvedBody))
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setAutoCancel(true)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(
                    AssistantNotificationNavigationStore.buildContentIntent(
                        context,
                        targetSessionId,
                        targetMessageId
                    )
                )
                .build()
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
            "AI Assistant Messages",
            NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription("Background assistant messages from LumosTime.");
        manager.createNotificationChannel(channel);
    }

    private static void createReminderChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
            REMINDER_CHANNEL_ID,
            "AI Reminder Alerts",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("High-priority alerts for due AI reminders.");
        channel.enableVibration(true);
        manager.createNotificationChannel(channel);
    }

    private static String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }
}
