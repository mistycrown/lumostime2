/**
 * @file AssistantNativeReminderStore.java
 * @input Synced assistant reminder queue payloads from the Web layer
 * @output SharedPreferences-backed native reminder queue for background reminder_due execution
 * @pos Native Helper
 * @description Mirrors the assistant reminder queue onto Android so the foreground service can dispatch due reminders without relying on the Web runtime.
 * @updated 2026-05-11: Added next-eligible reminder lookup so the native assistant service can schedule exact due-reminder wakeups instead of waiting for the next coarse poll cycle.
 * @updated 2026-04-30: Added native reminder queue persistence, due lookup, dispatch-attempt tracking, and completion helpers.
 */
package com.mistycrown.lumostime;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public final class AssistantNativeReminderStore {
    private static final String TAG = "AssistantNativeReminder";
    private static final String PREFS_NAME = "lumostime_assistant_native_reminders";
    private static final String KEY_REMINDERS_JSON = "reminders_json";
    private static final long REMINDER_RETRY_DELAY_MS = 60_000L;

    private AssistantNativeReminderStore() {
    }

    public static void save(Context context, JSONArray reminders) {
        if (context == null) {
            return;
        }

        prefs(context).edit().putString(KEY_REMINDERS_JSON, reminders == null ? "[]" : reminders.toString()).apply();
    }

    public static JSONArray list(Context context) {
        if (context == null) {
            return new JSONArray();
        }

        return read(context);
    }

    public static JSONArray listDue(Context context, long nowMs) {
        JSONArray reminders = read(context);
        JSONArray due = new JSONArray();
        for (int index = 0; index < reminders.length(); index += 1) {
            JSONObject reminder = reminders.optJSONObject(index);
            long eligibleAtMs = resolveNextEligibleAt(reminder);
            if (reminder == null || eligibleAtMs <= 0L || eligibleAtMs > nowMs) {
                continue;
            }

            due.put(reminder);
        }
        return due;
    }

    public static long findNextEligibleAt(Context context) {
        if (context == null) {
            return -1L;
        }

        JSONArray reminders = read(context);
        long nextEligibleAtMs = -1L;
        for (int index = 0; index < reminders.length(); index += 1) {
            long eligibleAtMs = resolveNextEligibleAt(reminders.optJSONObject(index));
            if (eligibleAtMs <= 0L) {
                continue;
            }

            if (nextEligibleAtMs <= 0L || eligibleAtMs < nextEligibleAtMs) {
                nextEligibleAtMs = eligibleAtMs;
            }
        }

        return nextEligibleAtMs;
    }

    public static void recordDispatchAttempt(Context context, String reminderId, String attemptedAt) {
        mutateReminder(context, reminderId, (reminder) -> {
            try {
                int nextAttemptCount = Math.max(0, reminder.optInt("dispatchAttemptCount", 0)) + 1;
                reminder.put("dispatchAttemptCount", nextAttemptCount);
                reminder.put("lastDispatchAttemptAt", attemptedAt);
            } catch (JSONException error) {
                Log.e(TAG, "Failed to record reminder dispatch attempt", error);
            }
            return reminder;
        });
    }

    public static void markDispatched(Context context, String reminderId, String dispatchedAt) {
        JSONArray reminders = read(context);
        JSONArray next = new JSONArray();
        for (int index = 0; index < reminders.length(); index += 1) {
            JSONObject reminder = reminders.optJSONObject(index);
            if (reminder == null) {
                continue;
            }

            if (reminderId.equals(reminder.optString("id", "").trim())) {
                continue;
            }

            next.put(reminder);
        }
        prefs(context).edit().putString(KEY_REMINDERS_JSON, next.toString()).apply();
    }

    private interface ReminderMutator {
        JSONObject mutate(JSONObject reminder);
    }

    private static void mutateReminder(Context context, String reminderId, ReminderMutator mutator) {
        JSONArray reminders = read(context);
        JSONArray next = new JSONArray();
        for (int index = 0; index < reminders.length(); index += 1) {
            JSONObject reminder = reminders.optJSONObject(index);
            if (reminder == null) {
                continue;
            }

            if (reminderId.equals(reminder.optString("id", "").trim())) {
                next.put(mutator.mutate(reminder));
                continue;
            }

            next.put(reminder);
        }
        prefs(context).edit().putString(KEY_REMINDERS_JSON, next.toString()).apply();
    }

    private static JSONArray read(Context context) {
        String raw = prefs(context).getString(KEY_REMINDERS_JSON, "");
        if (raw == null || raw.trim().isEmpty()) {
            return new JSONArray();
        }

        try {
            return new JSONArray(raw);
        } catch (JSONException error) {
            Log.e(TAG, "Failed to parse native reminder queue", error);
            return new JSONArray();
        }
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private static long resolveNextEligibleAt(JSONObject reminder) {
        if (reminder == null) {
            return -1L;
        }

        if (!"pending".equals(reminder.optString("status", "").trim())) {
            return -1L;
        }

        long dueAtMs = AssistantTimeParser.parseIsoDateTime(reminder.optString("dueAt", ""));
        if (dueAtMs <= 0L) {
            return -1L;
        }

        long eligibleAtMs = dueAtMs;
        long lastAttemptMs = AssistantTimeParser.parseIsoDateTime(
            reminder.optString("lastDispatchAttemptAt", "").trim()
        );
        if (lastAttemptMs > 0L) {
            eligibleAtMs = Math.max(eligibleAtMs, lastAttemptMs + REMINDER_RETRY_DELAY_MS);
        }

        return eligibleAtMs;
    }
}
