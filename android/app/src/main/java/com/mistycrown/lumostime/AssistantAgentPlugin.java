/**
 * @file AssistantAgentPlugin.java
 * @input JS-side assistant-agent control requests
 * @output Android foreground-service control and assistant system-trigger events
 * @pos Native Plugin
 * @description Capacitor plugin bridge for the Android-first background assistant agent. Starts and stops the foreground agent service, updates lightweight polling config, and relays native system-trigger events back into the web layer.
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
        String text = call.getString("text", "");
        String at = call.getString("at", "");
        Log.d(TAG, "notifyUserTurn text=" + text + " at=" + at);
        call.resolve();
    }

    @PluginMethod
    public void notifyTaskStateChanged(PluginCall call) {
        Log.d(TAG, "notifyTaskStateChanged");
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

    public static void dispatchSystemTrigger(String triggerType, String text, String source) {
        if (instance == null) {
            Log.w(TAG, "dispatchSystemTrigger skipped because plugin instance is null");
            return;
        }

        JSObject payload = new JSObject();
        payload.put("id", java.util.UUID.randomUUID().toString());
        payload.put("type", triggerType);
        payload.put("source", source);
        payload.put("createdAt", new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", java.util.Locale.US)
            .format(new java.util.Date()));
        payload.put("text", text);
        instance.notifyListeners("assistantSystemTrigger", payload, true);
    }

    private void startAgentService(Context context, Intent intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
            return;
        }

        context.startService(intent);
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
    }
}
