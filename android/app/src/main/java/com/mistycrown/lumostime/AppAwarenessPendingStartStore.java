/**
 * @file AppAwarenessPendingStartStore.java
 * @input Android context plus app-awareness native-start payload
 * @output SharedPreferences-backed pending app-awareness start payload
 * @pos Native Helper
 * @description Persists the latest native app-awareness start payload so the Web layer can recover timer starts even when the Capacitor runtime is backgrounded.
 * @updated 2026-06-21: Added consume semantics for app-awareness native-start recovery.
 */
package com.mistycrown.lumostime;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

public final class AppAwarenessPendingStartStore {
    private static final String TAG = "AppAwarePendingStart";
    private static final String PREFS_NAME = "lumostime_app_awareness_pending_start";
    private static final String KEY_PENDING_START_JSON = "pending_start_json";

    private AppAwarenessPendingStartStore() {
    }

    public static void save(Context context, JSONObject payload) {
        if (context == null || payload == null) {
            return;
        }

        prefs(context).edit().putString(KEY_PENDING_START_JSON, payload.toString()).apply();
    }

    public static JSONObject consume(Context context) {
        if (context == null) {
            return null;
        }

        SharedPreferences sharedPreferences = prefs(context);
        String raw = sharedPreferences.getString(KEY_PENDING_START_JSON, "");
        sharedPreferences.edit().remove(KEY_PENDING_START_JSON).apply();

        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }

        try {
            return new JSONObject(raw);
        } catch (JSONException error) {
            Log.e(TAG, "Failed to parse pending start payload", error);
            return null;
        }
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }
}
