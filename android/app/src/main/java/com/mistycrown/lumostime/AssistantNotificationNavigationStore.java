/**
 * @file AssistantNotificationNavigationStore.java
 * @input Notification click intents and pending assistant chat navigation metadata
 * @output Persisted one-shot navigation targets that the Web layer can consume after app resume/cold start
 * @pos Native Helper
 * @description Stores and consumes the latest assistant notification navigation payload so tapping an Android system alert can reopen the shared AI chat at the exact session and message.
 */
package com.mistycrown.lumostime;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

public final class AssistantNotificationNavigationStore {
    public static final String EXTRA_TARGET_SESSION_ID = "assistant_target_session_id";
    public static final String EXTRA_TARGET_MESSAGE_ID = "assistant_target_message_id";
    public static final String EXTRA_OPENED_AT = "assistant_opened_at";

    private static final String PREFS_NAME = "lumostime_assistant_notification_navigation";
    private static final String KEY_TARGET_SESSION_ID = "target_session_id";
    private static final String KEY_TARGET_MESSAGE_ID = "target_message_id";
    private static final String KEY_OPENED_AT = "opened_at";
    private static final int REQUEST_CODE = 4101;

    private AssistantNotificationNavigationStore() {
    }

    public static PendingIntent buildContentIntent(
        Context context,
        String targetSessionId,
        String targetMessageId
    ) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra(EXTRA_TARGET_SESSION_ID, targetSessionId);
        intent.putExtra(EXTRA_TARGET_MESSAGE_ID, targetMessageId);
        intent.putExtra(EXTRA_OPENED_AT, String.valueOf(System.currentTimeMillis()));
        return PendingIntent.getActivity(
            context,
            REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    public static void captureFromIntent(Context context, Intent intent) {
        if (context == null || intent == null) {
            return;
        }

        String targetSessionId = safeTrim(intent.getStringExtra(EXTRA_TARGET_SESSION_ID));
        if (targetSessionId.isEmpty()) {
            return;
        }

        String targetMessageId = safeTrim(intent.getStringExtra(EXTRA_TARGET_MESSAGE_ID));
        String openedAt = safeTrim(intent.getStringExtra(EXTRA_OPENED_AT));
        if (openedAt.isEmpty()) {
            openedAt = String.valueOf(System.currentTimeMillis());
        }

        prefs(context).edit()
            .putString(KEY_TARGET_SESSION_ID, targetSessionId)
            .putString(KEY_TARGET_MESSAGE_ID, targetMessageId)
            .putString(KEY_OPENED_AT, openedAt)
            .apply();
    }

    public static PendingNavigation consumePendingNavigation(Context context) {
        SharedPreferences sharedPreferences = prefs(context);
        String targetSessionId = safeTrim(sharedPreferences.getString(KEY_TARGET_SESSION_ID, ""));
        if (targetSessionId.isEmpty()) {
            return null;
        }

        String targetMessageId = safeTrim(sharedPreferences.getString(KEY_TARGET_MESSAGE_ID, ""));
        String openedAt = safeTrim(sharedPreferences.getString(KEY_OPENED_AT, ""));

        sharedPreferences.edit()
            .remove(KEY_TARGET_SESSION_ID)
            .remove(KEY_TARGET_MESSAGE_ID)
            .remove(KEY_OPENED_AT)
            .apply();

        return new PendingNavigation(targetSessionId, targetMessageId, openedAt);
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private static String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }

    public static final class PendingNavigation {
        public final String targetSessionId;
        public final String targetMessageId;
        public final String openedAt;

        PendingNavigation(String targetSessionId, String targetMessageId, String openedAt) {
            this.targetSessionId = targetSessionId;
            this.targetMessageId = targetMessageId;
            this.openedAt = openedAt;
        }
    }
}
