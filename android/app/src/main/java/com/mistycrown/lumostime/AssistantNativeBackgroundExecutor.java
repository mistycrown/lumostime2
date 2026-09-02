/**
 * @file AssistantNativeBackgroundExecutor.java
 * @input Native AI config, persisted background prompt snapshot, and a trigger payload
 * @output Immediate Android-side background AI request execution plus diagnostic events
 * @pos Native Helper
 * @description Executes a minimal unified background AI turn directly from Android so check-in requests no longer depend on the Web runtime being awake at dispatch time.
 * @updated 2026-05-13: Captures native background request payloads plus raw provider responses inside diagnostics so the shared Web debug viewer can reconstruct the exact assembled prompts for Android-run turns.
 * @updated 2026-09-02: Reports skipped native executions through diagnostics and invokes failure callbacks when the executor becomes unavailable before a request starts.
 * @updated 2026-09-02: Surfaces every successful native background reply as an Android notification, including check-ins and scheduled assistant letters.
 * @updated 2026-05-13: Reminder_due completions now raise a native high-priority reminder notification immediately and mark that notification in diagnostics so Web hydration does not double-alert.
 * @updated 2026-05-09: Rejects empty or content-free unified background decisions so due reminders stay pending for retry instead of being deleted after blank model responses.
 * @updated 2026-05-01: Normalized JSON null-like assistant reply fields so native background diagnostics no longer persist literal "null" bubbles into chat history.
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

    private static final class NativeRequestEnvelope {
        private final String provider;
        private final String modelName;
        private final String apiKey;
        private final String url;
        private final String method;
        private final JSONObject body;

        private NativeRequestEnvelope(String provider, String modelName, String apiKey, String url, String method, JSONObject body) {
            this.provider = safeTrim(provider);
            this.modelName = safeTrim(modelName);
            this.apiKey = safeTrim(apiKey);
            this.url = safeTrim(url);
            this.method = safeTrim(method);
            this.body = body == null ? new JSONObject() : body;
        }
    }

    private static final class NativeHttpJsonResponse {
        private final int status;
        private final JSONObject body;

        private NativeHttpJsonResponse(int status, JSONObject body) {
            this.status = status;
            this.body = body == null ? new JSONObject() : body;
        }
    }

    private static final class NativeRequestExecutionResult {
        private final NativeRequestEnvelope request;
        private final NativeHttpJsonResponse response;
        private final JSONObject parsedOutput;

        private NativeRequestExecutionResult(
            NativeRequestEnvelope request,
            NativeHttpJsonResponse response,
            JSONObject parsedOutput
        ) {
            this.request = request;
            this.response = response;
            this.parsedOutput = parsedOutput == null ? new JSONObject() : parsedOutput;
        }
    }

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
            if (context != null && triggerPayload != null) {
                appendDiagnostic(
                    context,
                    "native_request_skipped",
                    "warning",
                    "Native background AI request skipped because config or snapshot is unavailable",
                    safeTrim(triggerPayload.optString("id", "")),
                    safeTrim(triggerPayload.optString("type", "")),
                    "native_ai_unavailable",
                    buildContextMap("requestedAt", isoNow())
                );
            }
            if (callback != null) {
                callback.onFailed();
            }
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
        NativeRequestEnvelope request = null;
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
            request = buildRequestEnvelope(config, snapshot.systemPrompt, userPrompt);
            NativeRequestExecutionResult requestResult = requestJsonObject(request);
            JSONObject normalized = normalizeResponse(requestResult.parsedOutput);
            String completedAt = isoNow();
            boolean nativeNotificationShown = maybeShowAssistantNotification(
                context,
                triggerPayload,
                normalized
            );

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
                    requestResult,
                    normalized,
                    nativeNotificationShown
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
                    "requestProvider", request == null ? "" : request.provider,
                    "requestModel", request == null ? "" : request.modelName,
                    "requestUrl", request == null ? "" : request.url,
                    "requestMethod", request == null ? "" : request.method,
                    "requestBodyJson", request == null ? "" : request.body.toString(),
                    "error", safeTrim(error.getMessage())
                )
            );
            if (callback != null) {
                callback.onFailed();
            }
        }
    }

    private static NativeRequestEnvelope buildRequestEnvelope(
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
            return new NativeRequestEnvelope(config.provider, config.modelName, config.apiKey, url, "POST", body);
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
            return new NativeRequestEnvelope(config.provider, config.modelName, config.apiKey, url, "POST", body);
        }

        throw new IllegalStateException("Unsupported AI provider: " + config.provider);
    }

    private static NativeRequestExecutionResult requestJsonObject(
        NativeRequestEnvelope request
    ) throws Exception {
        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", "application/json");
        if ("openai".equals(request.provider) && !request.apiKey.isEmpty()) {
            headers.put("Authorization", "Bearer " + request.apiKey);
        }

        NativeHttpJsonResponse response = postJson(request.url, request.body, headers);
        if ("openai".equals(request.provider)) {
            JSONArray choices = response.body.optJSONArray("choices");
            JSONObject firstChoice = choices == null ? null : choices.optJSONObject(0);
            JSONObject message = firstChoice == null ? null : firstChoice.optJSONObject("message");
            String rawContent = message == null ? "{}" : message.optString("content", "{}");
            return new NativeRequestExecutionResult(
                request,
                response,
                cleanAndParseJsonObject(rawContent)
            );
        }

        if ("gemini".equals(request.provider)) {
            JSONArray candidates = response.body.optJSONArray("candidates");
            JSONObject firstCandidate = candidates == null ? null : candidates.optJSONObject(0);
            JSONObject content = firstCandidate == null ? null : firstCandidate.optJSONObject("content");
            JSONArray parts = content == null ? null : content.optJSONArray("parts");
            JSONObject firstPart = parts == null ? null : parts.optJSONObject(0);
            String rawContent = firstPart == null ? "{}" : firstPart.optString("text", "{}");
            return new NativeRequestExecutionResult(
                request,
                response,
                cleanAndParseJsonObject(rawContent)
            );
        }

        throw new IllegalStateException("Unsupported AI provider: " + request.provider);
    }

    private static JSONObject normalizeResponse(JSONObject rawOutput) throws JSONException {
        if (!hasMeaningfulAssistantDecision(rawOutput)) {
            throw new IllegalStateException("AI returned no assistant decision.");
        }

        String assistantReply = safeModelString(rawOutput.opt("assistantReply"));
        if (assistantReply.isEmpty()) {
            JSONArray assistantReplyParts = rawOutput.optJSONArray("assistantReplyParts");
            if (assistantReplyParts != null && assistantReplyParts.length() > 0) {
                StringBuilder builder = new StringBuilder();
                for (int index = 0; index < assistantReplyParts.length(); index += 1) {
                    String part = safeModelString(assistantReplyParts.opt(index));
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
        normalized.put("decisionSummary", safeModelString(rawOutput.opt("decisionSummary")));
        String memoryAction = safeModelString(rawOutput.opt("memoryAction"));
        normalized.put("memoryAction", "update_memory".equals(memoryAction) ? "update_memory" : "no_update");
        JSONObject memoryPatch = normalizeJsonObject(rawOutput.opt("memoryPatch"));
        if (memoryPatch != null && memoryPatch.length() > 0) {
            normalized.put("memoryPatch", memoryPatch);
        }
        JSONArray reminders = normalizeJsonArray(rawOutput.opt("reminders"));
        if (reminders != null && reminders.length() > 0) {
            normalized.put("reminders", reminders);
        }
        String silentReason = safeModelString(rawOutput.opt("silentReason"));
        if (!silentReason.isEmpty()) {
            normalized.put("silentReason", silentReason);
        }
        return normalized;
    }

    private static boolean hasMeaningfulAssistantDecision(JSONObject rawOutput) {
        if (rawOutput == null || rawOutput.length() == 0) {
            return false;
        }

        if (!safeModelString(rawOutput.opt("outcome")).isEmpty()) {
            return true;
        }

        if (!safeModelString(rawOutput.opt("assistantReply")).isEmpty()) {
            return true;
        }

        JSONArray assistantReplyParts = rawOutput.optJSONArray("assistantReplyParts");
        if (assistantReplyParts != null && assistantReplyParts.length() > 0) {
            for (int index = 0; index < assistantReplyParts.length(); index += 1) {
                if (!safeModelString(assistantReplyParts.opt(index)).isEmpty()) {
                    return true;
                }
            }
        }

        JSONArray reminders = rawOutput.optJSONArray("reminders");
        if (reminders != null && reminders.length() > 0) {
            return true;
        }

        if ("update_memory".equals(safeModelString(rawOutput.opt("memoryAction")))) {
            return true;
        }

        JSONObject memoryPatch = normalizeJsonObject(rawOutput.opt("memoryPatch"));
        if (memoryPatch != null && memoryPatch.length() > 0) {
            return true;
        }

        if (!safeModelString(rawOutput.opt("decisionSummary")).isEmpty()) {
            return true;
        }

        if (!safeModelString(rawOutput.opt("silentReason")).isEmpty()) {
            return true;
        }

        JSONArray silentSideEffects = rawOutput.optJSONArray("silentSideEffects");
        return silentSideEffects != null && silentSideEffects.length() > 0;
    }

    private static NativeHttpJsonResponse postJson(String url, JSONObject body, Map<String, String> headers) throws Exception {
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
            return new NativeHttpJsonResponse(status, responseJson);
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

    private static JSONObject normalizeJsonObject(Object value) {
        if (value instanceof JSONObject) {
            return (JSONObject) value;
        }

        String raw = safeModelString(value);
        if (raw.isEmpty()) {
            return null;
        }

        try {
            return new JSONObject(raw);
        } catch (JSONException error) {
            return null;
        }
    }

    private static JSONArray normalizeJsonArray(Object value) {
        if (value instanceof JSONArray) {
            return (JSONArray) value;
        }

        String raw = safeModelString(value);
        if (raw.isEmpty()) {
            return null;
        }

        try {
            return new JSONArray(raw);
        } catch (JSONException error) {
            return null;
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
        NativeRequestExecutionResult requestResult,
        JSONObject normalized,
        boolean nativeNotificationShown
    ) {
        Map<String, String> context = buildContextMap(
            "requestedAt", requestedAt,
            "completedAt", completedAt,
            "outcome", safeModelString(normalized.opt("outcome")),
            "requestProvider", requestResult.request.provider,
            "requestModel", requestResult.request.modelName,
            "requestUrl", requestResult.request.url,
            "requestMethod", requestResult.request.method,
            "requestBodyJson", requestResult.request.body.toString(),
            "responseStatus", String.valueOf(requestResult.response.status),
            "responseBodyJson", requestResult.response.body.toString()
        );
        String assistantReply = safeModelString(normalized.opt("assistantReply"));
        if (!safeTrim(assistantReply).isEmpty()) {
            context.put("assistantReply", assistantReply);
        }
        String decisionSummary = safeModelString(normalized.opt("decisionSummary"));
        if (!safeTrim(decisionSummary).isEmpty()) {
            context.put("decisionSummary", decisionSummary);
        }
        String memoryAction = safeModelString(normalized.opt("memoryAction"));
        if (!memoryAction.isEmpty()) {
            context.put("memoryAction", memoryAction);
        }
        Object memoryPatch = normalized.opt("memoryPatch");
        if (memoryPatch instanceof JSONObject && ((JSONObject) memoryPatch).length() > 0) {
            context.put("memoryPatch", ((JSONObject) memoryPatch).toString());
        }
        Object reminders = normalized.opt("reminders");
        if (reminders instanceof JSONArray && ((JSONArray) reminders).length() > 0) {
            context.put("reminders", ((JSONArray) reminders).toString());
        }
        String silentReason = safeModelString(normalized.opt("silentReason"));
        if (!silentReason.isEmpty()) {
            context.put("silentReason", silentReason);
        }
        if (nativeNotificationShown) {
            context.put("nativeNotificationShown", "true");
        }
        return context;
    }

    private static boolean maybeShowAssistantNotification(
        Context context,
        JSONObject triggerPayload,
        JSONObject normalized
    ) {
        if (context == null || triggerPayload == null || normalized == null) {
            return false;
        }

        String notificationBody = safeModelString(normalized.opt("assistantReply"));
        if (notificationBody.isEmpty()) {
            notificationBody = safeModelString(normalized.opt("decisionSummary"));
        }
        if (notificationBody.isEmpty()) {
            notificationBody = safeTrim(triggerPayload.optString("text", ""));
        }
        if (notificationBody.isEmpty()) {
            notificationBody = "A reminder is due now.";
        }

        String triggerType = safeTrim(triggerPayload.optString("type", ""));
        String title = "assistant_letter_due".equals(triggerType)
            ? "AI 来信"
            : "reminder_due".equals(triggerType)
                ? "AI Reminder"
                : "AI 助理";
        AssistantMessageNotificationManager.showReminderNotification(
            context,
            title,
            notificationBody,
            "",
            ""
        );
        return true;
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

    private static String safeModelString(Object value) {
        if (value == null || JSONObject.NULL.equals(value)) {
            return "";
        }

        String trimmed = String.valueOf(value).trim();
        if (trimmed.isEmpty() || "null".equalsIgnoreCase(trimmed) || "undefined".equalsIgnoreCase(trimmed)) {
            return "";
        }

        return trimmed;
    }
}
