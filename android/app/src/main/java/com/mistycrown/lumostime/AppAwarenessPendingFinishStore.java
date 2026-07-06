/**
 * @file AppAwarenessPendingFinishStore.java
 * @input Android context plus app-awareness native-finish payload
 * @output SharedPreferences-backed pending app-awareness finish payload
 * @pos Native Helper
 * @description Persists the latest native app-awareness finish payload so the Web layer can reconcile record submission after the Capacitor runtime resumes.
 * @updated 2026-07-06: Switched pending-finish recovery to peek/ack semantics so finish events can retry until the Web session exists.
 * @updated 2026-06-21: Added consume semantics for app-awareness finish recovery.
 */
package com.mistycrown.lumostime;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

public final class AppAwarenessPendingFinishStore {
    private static final String TAG = "AppAwarePendingFinish";
    private static final String PREFS_NAME = "lumostime_app_awareness_pending_finish";
    private static final String KEY_PENDING_FINISH_JSON = "pending_finish_json";

    private AppAwarenessPendingFinishStore() {
    }

    public static void save(Context context, JSONObject payload) {
        if (context == null || payload == null) {
            return;
        }

        prefs(context).edit().putString(KEY_PENDING_FINISH_JSON, payload.toString()).apply();
    }

    public static JSONObject peek(Context context) {
        if (context == null) {
            return null;
        }

        SharedPreferences sharedPreferences = prefs(context);
        String raw = sharedPreferences.getString(KEY_PENDING_FINISH_JSON, "");

        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }

        try {
            return new JSONObject(raw);
        } catch (JSONException error) {
            Log.e(TAG, "Failed to parse pending finish payload", error);
            return null;
        }
    }

    public static void acknowledge(Context context) {
        if (context == null) {
            return;
        }

        prefs(context).edit().remove(KEY_PENDING_FINISH_JSON).apply();
    }

    public static JSONObject consume(Context context) {
        JSONObject payload = peek(context);
        acknowledge(context);
        return payload;
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }
}
