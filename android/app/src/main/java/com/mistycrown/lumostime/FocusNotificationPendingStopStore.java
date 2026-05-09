/**
 * @file FocusNotificationPendingStopStore.java
 * @input Android context plus floating-window stop payload metadata
 * @output SharedPreferences-backed pending stop request for the FocusNotification plugin
 * @pos Native Helper
 * @description Stores the latest floating-window stop request so the Web layer can reconcile a background stop after the Capacitor runtime resumes.
 * @updated 2026-05-09: Added persistent pending-stop storage with consume semantics for floating-window stop recovery.
 */
package com.mistycrown.lumostime;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

public final class FocusNotificationPendingStopStore {
    private static final String TAG = "FocusPendingStop";
    private static final String PREFS_NAME = "lumostime_focus_pending_stop";
    private static final String KEY_PENDING_STOP_JSON = "pending_stop_json";

    private FocusNotificationPendingStopStore() {
    }

    public static void save(Context context, String sessionId, long stoppedAt) {
        if (context == null) {
            return;
        }

        JSONObject payload = new JSONObject();
        try {
            if (sessionId != null && !sessionId.trim().isEmpty()) {
                payload.put("sessionId", sessionId.trim());
            } else {
                payload.put("sessionId", JSONObject.NULL);
            }
            payload.put("stoppedAt", stoppedAt);
        } catch (JSONException error) {
            Log.e(TAG, "Failed to build pending stop payload", error);
            return;
        }

        prefs(context).edit().putString(KEY_PENDING_STOP_JSON, payload.toString()).apply();
    }

    public static JSONObject consume(Context context) {
        if (context == null) {
            return null;
        }

        SharedPreferences sharedPreferences = prefs(context);
        String raw = sharedPreferences.getString(KEY_PENDING_STOP_JSON, "");
        sharedPreferences.edit().remove(KEY_PENDING_STOP_JSON).apply();

        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }

        try {
            return new JSONObject(raw);
        } catch (JSONException error) {
            Log.e(TAG, "Failed to parse pending stop payload", error);
            return null;
        }
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }
}
