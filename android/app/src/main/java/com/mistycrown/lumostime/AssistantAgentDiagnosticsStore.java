/**
 * @file AssistantAgentDiagnosticsStore.java
 * @input Android context plus diagnostic payloads emitted by the assistant agent service
 * @output Persistent JSON-backed native assistant diagnostic history for poll ticks, skips, and dispatches
 * @pos Native Helper
 * @description Stores lightweight assistant-agent diagnostics in SharedPreferences so the web UI can inspect native poll behavior even when no web-layer AI turn was started.
 * @updated 2026-04-27: Added persistent native assistant diagnostic storage with capped history and JSON serialization for plugin-side inspection.
 */
package com.mistycrown.lumostime;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

public final class AssistantAgentDiagnosticsStore {
    private static final String TAG = "AssistantAgentDiagStore";
    private static final String PREFS_NAME = "lumostime_assistant_agent_diagnostics";
    private static final String KEY_ENTRIES_JSON = "entries_json";
    private static final int MAX_ENTRIES = 200;

    private AssistantAgentDiagnosticsStore() {
    }

    public static JSONArray listEntries(Context context) {
        if (context == null) {
            return new JSONArray();
        }

        return readEntries(context);
    }

    public static void clear(Context context) {
        if (context == null) {
            return;
        }

        prefs(context).edit().remove(KEY_ENTRIES_JSON).apply();
        AssistantAgentPlugin.dispatchDiagnosticsUpdated();
    }

    public static void appendEntry(
        Context context,
        String type,
        String level,
        String message,
        String triggerId,
        String triggerType,
        String reason,
        Map<String, String> diagnosticContext
    ) {
        if (context == null) {
            return;
        }

        JSONArray existingEntries = readEntries(context);
        JSONArray nextEntries = new JSONArray();
        nextEntries.put(buildEntry(type, level, message, triggerId, triggerType, reason, diagnosticContext));

        for (int index = 0; index < existingEntries.length() && nextEntries.length() < MAX_ENTRIES; index += 1) {
            nextEntries.put(existingEntries.opt(index));
        }

        prefs(context).edit().putString(KEY_ENTRIES_JSON, nextEntries.toString()).apply();
        AssistantAgentPlugin.dispatchDiagnosticsUpdated();
    }

    private static JSONObject buildEntry(
        String type,
        String level,
        String message,
        String triggerId,
        String triggerType,
        String reason,
        Map<String, String> diagnosticContext
    ) {
        JSONObject entry = new JSONObject();

        try {
            entry.put("id", UUID.randomUUID().toString());
            entry.put("type", safeTrim(type));
            entry.put("level", safeTrim(level));
            entry.put("createdAt", buildIsoTimestamp(System.currentTimeMillis()));
            entry.put("message", safeTrim(message));

            if (!safeTrim(triggerId).isEmpty()) {
                entry.put("triggerId", safeTrim(triggerId));
            }
            if (!safeTrim(triggerType).isEmpty()) {
                entry.put("triggerType", safeTrim(triggerType));
            }
            if (!safeTrim(reason).isEmpty()) {
                entry.put("reason", safeTrim(reason));
            }
            if (diagnosticContext != null && !diagnosticContext.isEmpty()) {
                JSONObject contextObject = new JSONObject();
                Iterator<Map.Entry<String, String>> iterator = diagnosticContext.entrySet().iterator();
                while (iterator.hasNext()) {
                    Map.Entry<String, String> pair = iterator.next();
                    String key = safeTrim(pair.getKey());
                    if (key.isEmpty()) {
                        continue;
                    }
                    contextObject.put(key, safeTrim(pair.getValue()));
                }
                if (contextObject.length() > 0) {
                    entry.put("context", contextObject);
                }
            }
        } catch (JSONException error) {
            Log.e(TAG, "Failed to build diagnostic entry", error);
        }

        return entry;
    }

    private static JSONArray readEntries(Context context) {
        String raw = prefs(context).getString(KEY_ENTRIES_JSON, "");
        if (raw == null || raw.trim().isEmpty()) {
            return new JSONArray();
        }

        try {
            return new JSONArray(raw);
        } catch (JSONException error) {
            Log.e(TAG, "Failed to parse assistant diagnostics JSON", error);
            return new JSONArray();
        }
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private static String buildIsoTimestamp(long timestampMs) {
        return new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US).format(new Date(timestampMs));
    }

    private static String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }
}
