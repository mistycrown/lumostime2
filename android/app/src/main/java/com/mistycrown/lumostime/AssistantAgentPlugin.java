/**
 * @file AssistantAgentPlugin.java
 * @input JS-side assistant-agent control requests
 * @output Android foreground-service control and assistant system-trigger events
 * @pos Native Plugin
 * @description Capacitor plugin bridge for the Android-first background assistant agent. Starts and stops the foreground agent service, updates lightweight polling config, relays native system-trigger events back into the web layer, and surfaces assistant notification navigation.
 * @updated 2026-07-07: Forwarded assistant-letter enablement and next-send timestamps into the native service so Android can schedule due letter wakeups.
 * @updated 2026-06-14: Persisted the disabled assistant state and cancelled reminder alarms before sending the stop intent so native repokes cannot race the user's polling toggle.
 * @updated 2026-05-14: Added metadata-aware native trigger dispatch so Android reminder alarms can wake the app and hand one local-offset `reminder_due` trigger to the Web layer without also running a duplicate native AI request.
 * @updated 2026-05-13: Re-pokes the running native assistant service after AI-config and background-snapshot syncs so reminder alarms are rescheduled as soon as native execution becomes ready.
 * @updated 2026-05-11: Re-pokes the running native assistant service after reminder-queue syncs so newly added reminders can reschedule their exact next due wakeup immediately.
 * @updated 2026-04-27: Added native diagnostic list, clear, and live-update bridge methods so Android poll decisions can be inspected from the shared AI history UI.
 * @updated 2026-04-28: Added pending-trigger queue list and acknowledge methods so Web can recover native assistant triggers after resume.
 * @updated 2026-04-27: Routed user-turn and task-state notifications into the running Android agent service so native throttling can respect recent foreground activity and background task changes.
 */
package com.mistycrown.lumostime;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;

@CapacitorPlugin(name = "AssistantAgent")
public class AssistantAgentPlugin extends Plugin {
    private static final String TAG = "AssistantAgentPlugin";
    private static AssistantAgentPlugin instance = null;

    @Override
    public void load() {
        super.load();
        instance = this;
        Log.d(TAG, "AssistantAgentPlugin loaded");
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        instance = null;
        Log.d(TAG, "AssistantAgentPlugin destroyed");
    }

    @PluginMethod
    public void startAgent(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, AssistantAgentService.class);
        intent.setAction(AssistantAgentService.ACTION_START);
        putConfigExtras(intent, call);

        try {
            startAgentService(context, intent);
            call.resolve();
        } catch (Exception exception) {
            call.reject(exception.getMessage());
        }
    }

    @PluginMethod
    public void stopAgent(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, AssistantAgentService.class);
        intent.setAction(AssistantAgentService.ACTION_STOP);

        try {
            UnifiedServiceNotificationManager.clearAssistantState(context);
            AssistantReminderAlarmScheduler.cancel(context);
            AssistantLetterAlarmScheduler.cancel(context);
            context.startService(intent);
            call.resolve();
        } catch (Exception exception) {
            call.reject(exception.getMessage());
        }
    }

    @PluginMethod
    public void updateAgentConfig(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, AssistantAgentService.class);
        intent.setAction(AssistantAgentService.ACTION_UPDATE_CONFIG);
        putConfigExtras(intent, call);

        try {
            startAgentService(context, intent);
            call.resolve();
        } catch (Exception exception) {
            call.reject(exception.getMessage());
        }
    }

    @PluginMethod
    public void notifyUserTurn(PluginCall call) {
        String at = call.getString("at", "");
        Context context = getContext();
        if (!UnifiedServiceNotificationManager.isAssistantActive(context)) {
            call.resolve();
            return;
        }

        Intent intent = new Intent(context, AssistantAgentService.class);
        intent.setAction(AssistantAgentService.ACTION_NOTIFY_USER_TURN);
        if (at != null && !at.trim().isEmpty()) {
            intent.putExtra("at", at.trim());
        }

        try {
            startAgentService(context, intent);
        } catch (Exception exception) {
            call.reject(exception.getMessage());
            return;
        }

        call.resolve();
    }

    @PluginMethod
    public void notifyTaskStateChanged(PluginCall call) {
        Context context = getContext();
        if (!UnifiedServiceNotificationManager.isAssistantActive(context)) {
            call.resolve();
            return;
        }

        Intent intent = new Intent(context, AssistantAgentService.class);
        intent.setAction(AssistantAgentService.ACTION_NOTIFY_TASK_STATE_CHANGED);

        try {
            startAgentService(context, intent);
        } catch (Exception exception) {
            call.reject(exception.getMessage());
            return;
        }

        call.resolve();
    }

    @PluginMethod
    public void triggerImmediateCheckin(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, AssistantAgentService.class);
        intent.setAction(AssistantAgentService.ACTION_TRIGGER_IMMEDIATE);

        try {
            startAgentService(context, intent);
            call.resolve();
        } catch (Exception exception) {
            call.reject(exception.getMessage());
        }
    }

    @PluginMethod
    public void listDiagnostics(PluginCall call) {
        JSObject result = new JSObject();
        result.put("entries", AssistantAgentDiagnosticsStore.listEntries(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void clearDiagnostics(PluginCall call) {
        AssistantAgentDiagnosticsStore.clear(getContext());
        call.resolve();
    }

    @PluginMethod
    public void listPendingSystemTriggers(PluginCall call) {
        JSObject result = new JSObject();
        result.put("triggers", AssistantPendingTriggerStore.list(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void acknowledgeSystemTrigger(PluginCall call) {
        String triggerId = call.getString("id", "");
        AssistantPendingTriggerStore.acknowledge(getContext(), triggerId);
        call.resolve();
    }

    @PluginMethod
    public void syncNativeAIConfig(PluginCall call) {
        Context context = getContext();
        AssistantNativeAIConfigStore.save(
            context,
            call.getString("provider", ""),
            call.getString("apiKey", ""),
            call.getString("baseUrl", ""),
            call.getString("modelName", "")
        );
        repokeRunningAgentService(context);
        call.resolve();
    }

    @PluginMethod
    public void clearNativeAIConfig(PluginCall call) {
        AssistantNativeAIConfigStore.clear(getContext());
        call.resolve();
    }

    @PluginMethod
    public void syncNativeBackgroundSnapshot(PluginCall call) {
        Context context = getContext();
        JSObject conversation = call.getObject("conversation");
        AssistantNativeBackgroundSnapshotStore.save(
            context,
            call.getString("systemPrompt", ""),
            conversation == null ? "" : conversation.toString()
        );
        repokeRunningAgentService(context);
        call.resolve();
    }

    @PluginMethod
    public void syncNativeReminders(PluginCall call) {
        Context context = getContext();
        JSONArray reminders = call.getArray("reminders");
        AssistantNativeReminderStore.save(context, reminders);

        if (UnifiedServiceNotificationManager.isAssistantActive(context)) {
            Intent intent = new Intent(context, AssistantAgentService.class);
            intent.setAction(AssistantAgentService.ACTION_UPDATE_CONFIG);

            try {
                startAgentService(context, intent);
            } catch (Exception exception) {
                call.reject(exception.getMessage());
                return;
            }
        }

        call.resolve();
    }

    @PluginMethod
    public void listNativeReminders(PluginCall call) {
        JSObject result = new JSObject();
        result.put("reminders", AssistantNativeReminderStore.list(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void showAssistantNotification(PluginCall call) {
        String title = call.getString("title", "LumosTime AI 助理");
        String body = call.getString("body", "");
        String targetSessionId = call.getString("targetSessionId", "");
        String targetMessageId = call.getString("targetMessageId", "");

        if (targetSessionId == null || targetSessionId.trim().isEmpty()) {
            call.reject("targetSessionId is required");
            return;
        }

        AssistantMessageNotificationManager.showNotification(
            getContext(),
            title,
            body,
            targetSessionId.trim(),
            targetMessageId == null ? "" : targetMessageId.trim()
        );
        call.resolve();
    }

    @PluginMethod
    public void consumePendingAssistantNavigation(PluginCall call) {
        AssistantNotificationNavigationStore.PendingNavigation pendingNavigation =
            AssistantNotificationNavigationStore.consumePendingNavigation(getContext());

        JSObject result = new JSObject();
        if (pendingNavigation == null) {
            result.put("hasPending", false);
            call.resolve(result);
            return;
        }

        result.put("hasPending", true);
        result.put("targetSessionId", pendingNavigation.targetSessionId);
        result.put("targetMessageId", pendingNavigation.targetMessageId);
        result.put("openedAt", pendingNavigation.openedAt);
        call.resolve(result);
    }

    public static String dispatchSystemTrigger(Context context, String triggerType, String text, String source) {
        return dispatchSystemTrigger(context, triggerType, text, source, null, null);
    }

    public static String dispatchSystemTrigger(
        Context context,
        String triggerType,
        String text,
        String source,
        String explicitTriggerId,
        JSObject metadata
    ) {
        String triggerId = java.util.UUID.randomUUID().toString();
        if (explicitTriggerId != null && !explicitTriggerId.trim().isEmpty()) {
            triggerId = explicitTriggerId.trim();
        }
        JSObject payload = new JSObject();
        payload.put("id", triggerId);
        payload.put("type", triggerType);
        payload.put("source", source);
        payload.put("createdAt", new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", java.util.Locale.US)
            .format(new java.util.Date()));
        payload.put("text", text);
        if (metadata != null) {
            payload.put("metadata", metadata);
        }
        AssistantPendingTriggerStore.append(context, payload);

        if (instance == null) {
            Log.w(TAG, "dispatchSystemTrigger skipped because plugin instance is null");
            return triggerId;
        }
        instance.notifyListeners("assistantSystemTrigger", payload, true);
        return triggerId;
    }

    public static void dispatchDiagnosticsUpdated() {
        if (instance == null) {
            return;
        }

        instance.notifyListeners("assistantDiagnosticsUpdated", new JSObject(), true);
    }

    private void startAgentService(Context context, Intent intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
            return;
        }

        context.startService(intent);
    }

    private void repokeRunningAgentService(Context context) {
        if (context == null || !UnifiedServiceNotificationManager.isAssistantActive(context)) {
            return;
        }

        Intent intent = new Intent(context, AssistantAgentService.class);
        intent.setAction(AssistantAgentService.ACTION_UPDATE_CONFIG);
        startAgentService(context, intent);
    }

    private void putConfigExtras(Intent intent, PluginCall call) {
        if (call.getData().has("enabled")) {
            intent.putExtra("enabled", call.getBoolean("enabled", true));
        }
        if (call.getData().has("enableRandomCheckin")) {
            intent.putExtra("enableRandomCheckin", call.getBoolean("enableRandomCheckin", true));
        }
        if (call.getData().has("basePollMinutes")) {
            intent.putExtra("basePollMinutes", call.getInt("basePollMinutes", 5));
        }
        if (call.getData().has("minCheckinMinutes")) {
            intent.putExtra("minCheckinMinutes", call.getInt("minCheckinMinutes", 45));
        }
        if (call.getData().has("maxCheckinMinutes")) {
            intent.putExtra("maxCheckinMinutes", call.getInt("maxCheckinMinutes", 120));
        }
        if (call.getData().has("quietHoursEnabled")) {
            intent.putExtra("quietHoursEnabled", call.getBoolean("quietHoursEnabled", false));
        }
        if (call.getData().has("quietHoursStart")) {
            String quietHoursStart = call.getString("quietHoursStart", "");
            if (quietHoursStart != null) {
                intent.putExtra("quietHoursStart", quietHoursStart);
            }
        }
        if (call.getData().has("quietHoursEnd")) {
            String quietHoursEnd = call.getString("quietHoursEnd", "");
            if (quietHoursEnd != null) {
                intent.putExtra("quietHoursEnd", quietHoursEnd);
            }
        }
        if (call.getData().has("minimumNudgeGapMinutes")) {
            intent.putExtra("minimumNudgeGapMinutes", call.getInt("minimumNudgeGapMinutes", 45));
        }
        if (call.getData().has("letterEnabled")) {
            intent.putExtra("letterEnabled", call.getBoolean("letterEnabled", false));
        }
        if (call.getData().has("nextLetterAt")) {
            String nextLetterAt = call.getString("nextLetterAt", "");
            if (nextLetterAt != null) {
                intent.putExtra("nextLetterAt", nextLetterAt);
            }
        }
    }
}
