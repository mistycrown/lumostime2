/**
 * @file AssistantMessageNotificationManager.java
 * @input Assistant notification title/body plus target chat navigation metadata
 * @output Android system notifications for active assistant messages
 * @pos Native Helper
 * @description Shows the single retained Android assistant alert notification that sits alongside the shared runtime status notification and routes taps back into the AI chat.
 */
package com.mistycrown.lumostime;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;

import androidx.core.app.NotificationCompat;

public final class AssistantMessageNotificationManager {
    private static final String CHANNEL_ID = "assistant_active_message_channel";
    private static final int NOTIFICATION_ID = 2202;

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

        String resolvedTitle = safeTrim(title).isEmpty() ? "LumosTime AI 助理" : title.trim();
        String resolvedBody = safeTrim(body).isEmpty() ? "AI 助理有一条新的后台提醒。" : body.trim();

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
            "AI 助理提醒",
            NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription("显示 LumosTime AI 助理需要用户注意的后台提醒");
        manager.createNotificationChannel(channel);
    }

    private static String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }
}
