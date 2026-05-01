/**
 * @file AssistantNativeAIConfigStore.java
 * @input Synced AI configuration from the Web layer
 * @output SharedPreferences-backed native AI config snapshot for background assistant execution
 * @pos Native Helper
 * @description Persists the active AI provider config so the Android assistant agent can send background requests without relying on live Web/JS access.
 * @updated 2026-04-30: Added native AI config persistence helpers for background assistant execution.
 */
package com.mistycrown.lumostime;

import android.content.Context;
import android.content.SharedPreferences;

public final class AssistantNativeAIConfigStore {
    private static final String PREFS_NAME = "lumostime_assistant_native_ai_config";
    private static final String KEY_PROVIDER = "provider";
    private static final String KEY_API_KEY = "api_key";
    private static final String KEY_BASE_URL = "base_url";
    private static final String KEY_MODEL_NAME = "model_name";

    private AssistantNativeAIConfigStore() {
    }

    public static void save(
        Context context,
        String provider,
        String apiKey,
        String baseUrl,
        String modelName
    ) {
        if (context == null) {
            return;
        }

        prefs(context).edit()
            .putString(KEY_PROVIDER, safeTrim(provider))
            .putString(KEY_API_KEY, safeTrim(apiKey))
            .putString(KEY_BASE_URL, safeTrim(baseUrl))
            .putString(KEY_MODEL_NAME, safeTrim(modelName))
            .apply();
    }

    public static void clear(Context context) {
        if (context == null) {
            return;
        }

        prefs(context).edit().clear().apply();
    }

    public static boolean isReady(Context context) {
        NativeAIConfig config = load(context);
        return !config.provider.isEmpty() && !config.apiKey.isEmpty() && !config.modelName.isEmpty();
    }

    public static NativeAIConfig load(Context context) {
        if (context == null) {
          return new NativeAIConfig("", "", "", "");
        }

        SharedPreferences sharedPreferences = prefs(context);
        return new NativeAIConfig(
            sharedPreferences.getString(KEY_PROVIDER, ""),
            sharedPreferences.getString(KEY_API_KEY, ""),
            sharedPreferences.getString(KEY_BASE_URL, ""),
            sharedPreferences.getString(KEY_MODEL_NAME, "")
        );
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private static String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }

    public static final class NativeAIConfig {
        public final String provider;
        public final String apiKey;
        public final String baseUrl;
        public final String modelName;

        public NativeAIConfig(String provider, String apiKey, String baseUrl, String modelName) {
            this.provider = safeTrim(provider);
            this.apiKey = safeTrim(apiKey);
            this.baseUrl = safeTrim(baseUrl);
            this.modelName = safeTrim(modelName);
        }
    }
}
