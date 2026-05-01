/**
 * @file AssistantNativeBackgroundExecutor.java
 * @input Native AI config, persisted background prompt snapshot, and a trigger payload
 * @output Immediate Android-side background AI request execution plus diagnostic events
 * @pos Native Helper
 * @description Executes a minimal unified background AI turn directly from Android so check-in requests no longer depend on the Web runtime being awake at dispatch time.
 * @updated 2026-04-30: Added direct native OpenAI/Gemini background execution for check-in-style triggers with diagnostic request lifecycle events.
 */
package com.mistycrown.lumostime;

import android.content.Context;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public final class AssistantNativeBackgroundExecutor {
    private static final String TAG = "AssistantNativeExec";

    public interface ExecutionCallback {
        void onCompleted();
        void onFailed();
    }

    private AssistantNativeBackgroundExecutor() {
    }

    public static boolean canExecute(Context context) {
        return AssistantNativeAIConfigStore.isReady(context)
            && AssistantNativeBackgroundSnapshotStore.isReady(context);
    }

    public static void executeAsync(
        Context context,
        String triggerId,
        String triggerType,
        String triggerText,
        String triggerSource
    ) {
        executeAsync(context, buildTriggerPayload(triggerId, triggerType, triggerText, triggerSource), null);
    }

    public static void executeAsync(Context context, JSONObject triggerPayload, ExecutionCallback callback) {
        if (context == null || triggerPayload == null || !canExecute(context)) {
            return;
        }

        final Context appContext = context.getApplicationContext();
        new Thread(() -> executeBlocking(appContext, triggerPayload, callback)).start();
    }

    private static void executeBlocking(
        Context context,
        JSONObject triggerPayload,
        ExecutionCallback callback
    ) {
        String triggerId = safeTrim(triggerPayload.optString("id", ""));
        String triggerType = safeTrim(triggerPayload.optString("type", ""));
        String requestedAt = isoNow();
        appendDiagnostic(
            context,
            "native_request_started",
            "info",
            "Native background AI request started",
            triggerId,
            triggerType,
            null,
            buildContextMap("requestedAt", requestedAt)
        );

        try {
            AssistantNativeAIConfigStore.NativeAIConfig config = AssistantNativeAIConfigStore.load(context);
            AssistantNativeBackgroundSnapshotStore.NativeBackgroundSnapshot snapshot =
                AssistantNativeBackgroundSnapshotStore.load(context);

            String userPrompt = buildUserPrompt(triggerPayload, snapshot.conversationJson);
            JSONObject responseBody = requestJsonObject(config, snapshot.systemPrompt, userPrompt);
            JSONObject normalized = normalizeResponse(responseBody);
            String completedAt = isoNow();

            appendDiagnostic(
                context,
                "native_request_completed",
                "success",
                "Native background AI request completed",
                triggerId,
                triggerType,
                null,
                buildResultContextMap(
                    requestedAt,
                    completedAt,
                    normalized.optString("outcome", ""),
                    normalized.optString("assistantReply", ""),
                    normalized.optString("decisionSummary", "")
                )
            );
            if (callback != null) {
                callback.onCompleted();
            }
        } catch (Exception error) {
            Log.e(TAG, "Native background AI request failed", error);
            appendDiagnostic(
                context,
                "native_request_failed",
                "error",
                "Native background AI request failed",
                triggerId,
                triggerType,
                null,
                buildContextMap(
                    "requestedAt", requestedAt,
                    "error", safeTrim(error.getMessage())
                )
            );
            if (callback != null) {
                callback.onFailed();
            }
        }
    }

    private static JSONObject requestJsonObject(
        AssistantNativeAIConfigStore.NativeAIConfig config,
        String systemPrompt,
        String userPrompt
    ) throws Exception {
        if ("openai".equals(config.provider)) {
            String url = safeTrim(config.baseUrl).isEmpty()
                ? "https://api.openai.com/v1/chat/completions"
                : safeTrim(config.baseUrl) + "/chat/completions";
            JSONObject body = new JSONObject();
            body.put("model", config.modelName);
            JSONArray messages = new JSONArray();
            messages.put(new JSONObject().put("role", "system").put("content", systemPrompt));
            messages.put(new JSONObject().put("role", "user").put("content", userPrompt));
            body.put("messages", messages);
            body.put("response_format", new JSONObject().put("type", "json_object"));
            Map<String, String> headers = new HashMap<>();
            headers.put("Content-Type", "application/json");
            headers.put("Authorization", "Bearer " + config.apiKey);
            JSONObject response = postJson(url, body, headers);
            JSONArray choices = response.optJSONArray("choices");
            JSONObject firstChoice = choices == null ? null : choices.optJSONObject(0);
            JSONObject message = firstChoice == null ? null : firstChoice.optJSONObject("message");
            String rawContent = message == null ? "{}" : message.optString("content", "{}");
            return cleanAndParseJsonObject(rawContent);
        }

        if ("gemini".equals(config.provider)) {
            String baseUrl = safeTrim(config.baseUrl).isEmpty()
                ? "https://generativelanguage.googleapis.com/v1beta/models"
                : safeTrim(config.baseUrl);
            String url = baseUrl + "/" + config.modelName + ":generateContent?key=" + config.apiKey;
            JSONObject body = new JSONObject();
            JSONArray contents = new JSONArray();
            contents.put(new JSONObject()
                .put("role", "user")
                .put("parts", new JSONArray().put(new JSONObject().put("text", userPrompt))));
            body.put("contents", contents);
            body.put("system_instruction", new JSONObject()
                .put("parts", new JSONArray().put(new JSONObject().put("text", systemPrompt))));
            body.put("generationConfig", new JSONObject().put("response_mime_type", "application/json"));
            Map<String, String> headers = new HashMap<>();
            headers.put("Content-Type", "application/json");
            JSONObject response = postJson(url, body, headers);
            JSONArray candidates = response.optJSONArray("candidates");
            JSONObject firstCandidate = candidates == null ? null : candidates.optJSONObject(0);
            JSONObject content = firstCandidate == null ? null : firstCandidate.optJSONObject("content");
            JSONArray parts = content == null ? null : content.optJSONArray("parts");
            JSONObject firstPart = parts == null ? null : parts.optJSONObject(0);
            String rawContent = firstPart == null ? "{}" : firstPart.optString("text", "{}");
            return cleanAndParseJsonObject(rawContent);
        }

        throw new IllegalStateException("Unsupported AI provider: " + config.provider);
    }

    private static JSONObject normalizeResponse(JSONObject rawOutput) throws JSONException {
        String assistantReply = safeTrim(rawOutput.optString("assistantReply", ""));
        if (assistantReply.isEmpty()) {
            JSONArray assistantReplyParts = rawOutput.optJSONArray("assistantReplyParts");
            if (assistantReplyParts != null && assistantReplyParts.length() > 0) {
                StringBuilder builder = new StringBuilder();
                for (int index = 0; index < assistantReplyParts.length(); index += 1) {
                    String part = safeTrim(assistantReplyParts.optString(index, ""));
                    if (part.isEmpty()) {
                        continue;
                    }
                    if (builder.length() > 0) {
                        builder.append('\n');
                    }
                    builder.append(part);
                }
                assistantReply = builder.toString();
            }
        }

        String outcome = safeTrim(rawOutput.optString("outcome", ""));
        if (!"silent".equals(outcome) && !"reply".equals(outcome)) {
            outcome = assistantReply.isEmpty() ? "silent" : "reply";
        }

        JSONObject normalized = new JSONObject();
        normalized.put("outcome", outcome);
        normalized.put("assistantReply", assistantReply);
        normalized.put("decisionSummary", safeTrim(rawOutput.optString("decisionSummary", "")));
        return normalized;
    }

    private static JSONObject postJson(String url, JSONObject body, Map<String, String> headers) throws Exception {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(60_000);
            connection.setReadTimeout(60_000);
            connection.setDoOutput(true);
            for (Map.Entry<String, String> header : headers.entrySet()) {
                connection.setRequestProperty(header.getKey(), header.getValue());
            }

            byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream outputStream = connection.getOutputStream()) {
                outputStream.write(payload);
            }

            int status = connection.getResponseCode();
            InputStream stream = status >= 200 && status < 300
                ? connection.getInputStream()
                : connection.getErrorStream();
            String responseText = readStream(stream);
            JSONObject responseJson = safeJsonObject(responseText);
            if (status < 200 || status >= 300) {
                String errorMessage = responseJson.optJSONObject("error") != null
                    ? responseJson.optJSONObject("error").optString("message", "")
                    : responseText;
                throw new IllegalStateException("HTTP " + status + ": " + errorMessage);
            }
            return responseJson;
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private static JSONObject safeJsonObject(String raw) {
        try {
            return new JSONObject(raw);
        } catch (JSONException error) {
            return new JSONObject();
        }
    }

    private static JSONObject cleanAndParseJsonObject(String raw) {
        String content = safeTrim(raw);
        if (content.contains("```json")) {
            content = content.replace("```json", "").replace("```", "").trim();
        } else if (content.contains("```")) {
            content = content.replace("```", "").trim();
        }

        int objectStart = content.indexOf('{');
        int objectEnd = content.lastIndexOf('}') + 1;
        if (objectStart >= 0 && objectEnd > objectStart) {
            content = content.substring(objectStart, objectEnd);
        }

        try {
            return new JSONObject(content);
        } catch (JSONException error) {
            return new JSONObject();
        }
    }

    private static String buildUserPrompt(JSONObject trigger, String conversationJson) {
        String normalizedConversation = safeTrim(conversationJson);
        if (normalizedConversation.isEmpty()) {
            normalizedConversation = "{\"recentTurns\":[]}";
        }

        return "=== Trigger ===\n"
            + stringifyJson(trigger)
            + "\n\n=== Conversation Context ===\n"
            + normalizedConversation
            + "\n\nReturn one JSON object only.";
    }

    public static JSONObject buildTriggerPayload(String triggerId, String triggerType, String triggerText, String triggerSource) {
        JSONObject payload = new JSONObject();
        try {
            payload.put("id", safeTrim(triggerId));
            payload.put("type", safeTrim(triggerType));
            payload.put("source", safeTrim(triggerSource));
            payload.put("createdAt", isoNow());
            payload.put("text", safeTrim(triggerText));
        } catch (JSONException ignored) {
        }
        return payload;
    }

    private static String readStream(InputStream stream) throws Exception {
        if (stream == null) {
            return "";
        }

        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line);
            }
        }
        return builder.toString();
    }

    private static String stringifyJson(JSONObject object) {
        if (object == null) {
            return "{}";
        }

        try {
            return object.toString(2);
        } catch (JSONException error) {
            return object.toString();
        }
    }

    private static Map<String, String> buildContextMap(String... pairs) {
        Map<String, String> context = new HashMap<>();
        for (int index = 0; index + 1 < pairs.length; index += 2) {
            String key = safeTrim(pairs[index]);
            String value = safeTrim(pairs[index + 1]);
            if (!key.isEmpty() && !value.isEmpty()) {
                context.put(key, value);
            }
        }
        return context;
    }

    private static Map<String, String> buildResultContextMap(
        String requestedAt,
        String completedAt,
        String outcome,
        String assistantReply,
        String decisionSummary
    ) {
        Map<String, String> context = buildContextMap(
            "requestedAt", requestedAt,
            "completedAt", completedAt,
            "outcome", outcome
        );
        if (!safeTrim(assistantReply).isEmpty()) {
            context.put("assistantReply", assistantReply);
        }
        if (!safeTrim(decisionSummary).isEmpty()) {
            context.put("decisionSummary", decisionSummary);
        }
        return context;
    }

    private static void appendDiagnostic(
        Context context,
        String type,
        String level,
        String message,
        String triggerId,
        String triggerType,
        String reason,
        Map<String, String> diagnosticContext
    ) {
        AssistantAgentDiagnosticsStore.appendEntry(
            context,
            type,
            level,
            message,
            triggerId,
            triggerType,
            reason,
            diagnosticContext
        );
    }

    private static String isoNow() {
        return new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US).format(new Date());
    }

    private static String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }
}
