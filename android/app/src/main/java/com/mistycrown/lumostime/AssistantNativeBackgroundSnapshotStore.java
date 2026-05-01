/**
 * @file AssistantNativeBackgroundSnapshotStore.java
 * @input Synced background assistant prompt snapshot from the Web layer
 * @output SharedPreferences-backed prompt/conversation snapshot for native background AI execution
 * @pos Native Helper
 * @description Persists the latest background system-prompt snapshot so the Android assistant agent can execute native check-ins with the most recent known context.
 * @updated 2026-04-30: Added native background snapshot persistence helpers for immediate Android-side check-in execution.
 */
package com.mistycrown.lumostime;

import android.content.Context;
import android.content.SharedPreferences;

public final class AssistantNativeBackgroundSnapshotStore {
    private static final String PREFS_NAME = "lumostime_assistant_native_background_snapshot";
    private static final String KEY_SYSTEM_PROMPT = "system_prompt";
    private static final String KEY_CONVERSATION_JSON = "conversation_json";

    private AssistantNativeBackgroundSnapshotStore() {
    }

    public static void save(Context context, String systemPrompt, String conversationJson) {
        if (context == null) {
            return;
        }

        prefs(context).edit()
            .putString(KEY_SYSTEM_PROMPT, safeTrim(systemPrompt))
            .putString(KEY_CONVERSATION_JSON, safeTrim(conversationJson))
            .apply();
    }

    public static NativeBackgroundSnapshot load(Context context) {
        if (context == null) {
            return new NativeBackgroundSnapshot("", "");
        }

        SharedPreferences sharedPreferences = prefs(context);
        return new NativeBackgroundSnapshot(
            sharedPreferences.getString(KEY_SYSTEM_PROMPT, ""),
            sharedPreferences.getString(KEY_CONVERSATION_JSON, "")
        );
    }

    public static boolean isReady(Context context) {
        NativeBackgroundSnapshot snapshot = load(context);
        return !snapshot.systemPrompt.isEmpty();
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private static String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }

    public static final class NativeBackgroundSnapshot {
        public final String systemPrompt;
        public final String conversationJson;

        public NativeBackgroundSnapshot(String systemPrompt, String conversationJson) {
            this.systemPrompt = safeTrim(systemPrompt);
            this.conversationJson = safeTrim(conversationJson);
        }
    }
}
