/**
 * @file AssistantPendingTriggerStore.java
 * @input Android context plus assistant system-trigger payloads emitted by the native agent service
 * @output Persistent queue of pending assistant triggers that the Web layer can drain after resume if live listeners were unavailable
 * @pos Native Helper
 * @description Stores native assistant triggers in SharedPreferences so background check-ins and reminders can be recovered by the Web layer after the Capacitor runtime resumes.
 * @updated 2026-04-28: Added persistent pending-trigger queue with append, list, and acknowledge helpers for background assistant trigger recovery.
 * @updated 2026-09-02: Deduplicates fallback triggers by trigger ID so repeated native retry ticks do not accumulate duplicate pending Web work.
 */
package com.mistycrown.lumostime;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public final class AssistantPendingTriggerStore {
    private static final String TAG = "AssistantPendingTrigger";
    private static final String PREFS_NAME = "lumostime_assistant_pending_triggers";
    private static final String KEY_TRIGGERS_JSON = "triggers_json";
    private static final int MAX_TRIGGERS = 50;

    private AssistantPendingTriggerStore() {
    }

    public static void append(Context context, JSONObject triggerPayload) {
        if (context == null || triggerPayload == null) {
            return;
        }

        JSONArray existing = readTriggers(context);
        String triggerId = triggerPayload.optString("id", "").trim();
        if (!triggerId.isEmpty()) {
            for (int index = 0; index < existing.length(); index += 1) {
                JSONObject candidate = existing.optJSONObject(index);
                if (candidate != null && triggerId.equals(candidate.optString("id", "").trim())) {
                    return;
                }
            }
        }

        JSONArray next = new JSONArray();
        next.put(triggerPayload);

        for (int index = 0; index < existing.length() && next.length() < MAX_TRIGGERS; index += 1) {
            next.put(existing.opt(index));
        }

        prefs(context).edit().putString(KEY_TRIGGERS_JSON, next.toString()).apply();
    }

    public static JSONArray list(Context context) {
        if (context == null) {
            return new JSONArray();
        }

        return readTriggers(context);
    }

    public static void acknowledge(Context context, String triggerId) {
        if (context == null || triggerId == null || triggerId.trim().isEmpty()) {
            return;
        }

        JSONArray existing = readTriggers(context);
        JSONArray next = new JSONArray();
        for (int index = 0; index < existing.length(); index += 1) {
            Object item = existing.opt(index);
            if (!(item instanceof JSONObject)) {
                continue;
            }

            JSONObject candidate = (JSONObject) item;
            if (triggerId.trim().equals(candidate.optString("id", "").trim())) {
                continue;
            }

            next.put(candidate);
        }

        prefs(context).edit().putString(KEY_TRIGGERS_JSON, next.toString()).apply();
    }

    private static JSONArray readTriggers(Context context) {
        String raw = prefs(context).getString(KEY_TRIGGERS_JSON, "");
        if (raw == null || raw.trim().isEmpty()) {
            return new JSONArray();
        }

        try {
            return new JSONArray(raw);
        } catch (JSONException error) {
            Log.e(TAG, "Failed to parse pending trigger queue", error);
            return new JSONArray();
        }
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }
}
