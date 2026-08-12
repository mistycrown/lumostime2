/**
 * @file AppUsagePlugin.java
 * @input JS Plugin Calls
 * @output Native Usage Stats and App Rule State
 * @pos Native Plugin
 * @description Capacitor plugin exposing Android foreground-app access, app association rules, and per-app ignore state to the React application.
 * @updated 2026-08-12: Added AppAwareness decision logs and a native-overlay visibility watchdog that falls back to the Web workflow after failed rendering.
 */
package com.mistycrown.lumostime;

import android.accessibilityservice.AccessibilityServiceInfo;
import android.app.AppOpsManager;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.provider.Settings;
import android.util.Base64;
import android.util.Log;
import android.view.accessibility.AccessibilityManager;
import android.view.inputmethod.InputMethodInfo;
import android.view.inputmethod.InputMethodManager;
import android.os.Build;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@CapacitorPlugin(name = "AppUsage")
public class AppUsagePlugin extends Plugin {
    private static final String TAG = "AppAwareness";
    private static final String PREFS_NAME = "AppUsageRules";
    private static final String RULE_NAME_SUFFIX = "_name";
    private static final String IGNORE_SUFFIX = "_ignore";
    private static final String APP_AWARENESS_SUFFIX = "_app_awareness_workflow";
    private static final String APP_AWARENESS_TEMPLATES_KEY = "__app_awareness_templates_json";

    private static String currentRealtimePackage = null;
    private static AppUsagePlugin instance = null;
    private static final android.os.Handler APP_AWARENESS_HANDLER =
            new android.os.Handler(android.os.Looper.getMainLooper());
    private static NativeAppAwarenessRuntime nativeAppAwarenessRuntime = null;
    private static Runnable nativeAppAwarenessCooldownRunnable = null;
    private static Runnable nativeAppAwarenessStartWatchdogRunnable = null;
    private static NativeAppAwarenessTimerRuntime nativeAppAwarenessTimerRuntime = null;
    private static Runnable nativeAppAwarenessTimerRunnable = null;

    private static final class NativeAppAwarenessRuntime {
        final String packageName;
        final String appLabel;
        final org.json.JSONObject template;
        final org.json.JSONObject answers;
        int currentStepIndex;

        NativeAppAwarenessRuntime(String packageName, String appLabel, org.json.JSONObject template) {
            this.packageName = packageName;
            this.appLabel = appLabel;
            this.template = template;
            this.answers = new org.json.JSONObject();
            this.currentStepIndex = 0;
        }
    }

    private static final class NativeAppAwarenessTimerRuntime {
        final String nativeTimerId;
        final String packageName;
        final String appLabel;
        final long startedAt;
        final int expectedDurationMinutes;
        final org.json.JSONObject startPayload;
        final org.json.JSONObject startRecordStep;
        long scheduledEndAt;
        final org.json.JSONArray extensionHistory;
        boolean overtimePromptShown;

        NativeAppAwarenessTimerRuntime(
                String nativeTimerId,
                String packageName,
                String appLabel,
                long startedAt,
                int expectedDurationMinutes,
                org.json.JSONObject startPayload,
                org.json.JSONObject startRecordStep) {
            this.nativeTimerId = nativeTimerId;
            this.packageName = packageName;
            this.appLabel = appLabel;
            this.startedAt = startedAt;
            this.expectedDurationMinutes = expectedDurationMinutes;
            this.startPayload = startPayload;
            this.startRecordStep = startRecordStep;
            this.scheduledEndAt = expectedDurationMinutes > 0
                    ? startedAt + expectedDurationMinutes * 60L * 1000L
                    : 0L;
            this.extensionHistory = new org.json.JSONArray();
            this.overtimePromptShown = false;
        }
    }

    @Override
    public void load() {
        super.load();
        instance = this;
        Log.d(TAG, "AppUsagePlugin loaded");
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        instance = null;
        Log.d(TAG, "AppUsagePlugin destroyed");
    }

    public static void updateCurrentPackage(String packageName) {
        currentRealtimePackage = packageName;
    }

    public static void triggerAppDetected(String packageName, String appLabel) {
        if (instance == null) {
            Log.w(TAG, "Cannot trigger app detection, plugin instance is null");
            return;
        }
        instance.checkAndHandleDetectedApp(packageName, appLabel);
    }

    public static void triggerAppAwarenessOverlayAction(String actionId, String value) {
        if (instance == null || instance.getBridge() == null) {
            Log.w(TAG, "Unable to trigger appAwarenessOverlayAction: plugin instance or bridge is null");
            return;
        }

        JSObject payload = new JSObject();
        payload.put("actionId", actionId);
        if (value != null) {
            payload.put("value", value);
        }

        instance.notifyListeners("appAwarenessOverlayAction", payload, true);
        instance.getBridge().triggerWindowJSEvent("appAwarenessOverlayAction", payload.toString());
    }

    public static void triggerAppAwarenessNativeFinish(JSObject payload) {
        if (instance == null || instance.getBridge() == null || payload == null) {
            Log.w(TAG, "Unable to trigger appAwarenessNativeFinish: plugin instance or bridge is null");
            return;
        }

        instance.notifyListeners("appAwarenessNativeFinish", payload, true);
        instance.getBridge().triggerWindowJSEvent("appAwarenessNativeFinish", payload.toString());
    }

    public static void handleAppAwarenessOverlayAction(String actionId, String value) {
        if (instance != null && instance.handleNativeAppAwarenessOverlayActionInternal(actionId, value)) {
            return;
        }

        triggerAppAwarenessOverlayAction(actionId, value);
    }

    public static void dismissNativeAppAwarenessOverlay() {
        if (instance != null) {
            instance.clearNativeAppAwarenessRuntime(true);
        }
    }

    private void checkAndHandleDetectedApp(String packageName, String appLabel) {
        try {
            Log.i(TAG, "Workflow dispatch requested: package=" + packageName + ", label=" + appLabel);
            if (nativeAppAwarenessTimerRuntime != null
                    && packageName.equals(nativeAppAwarenessTimerRuntime.packageName)) {
                Log.i(TAG, "Workflow skipped: native timer already active for package=" + packageName);
                return;
            }

            if (nativeAppAwarenessRuntime != null
                    && packageName.equals(nativeAppAwarenessRuntime.packageName)) {
                if (FloatingWindowService.isAppAwarenessOverlayVisible()) {
                    Log.i(TAG, "Workflow skipped: visible native runtime already active for package=" + packageName);
                    return;
                }

                Log.w(TAG, "Stale native runtime found without a visible overlay; restarting package=" + packageName
                        + ", state=" + FloatingWindowService.getAppAwarenessOverlayState());
                clearNativeAppAwarenessRuntime(false);
            }

            if (nativeAppAwarenessRuntime != null
                    && !packageName.equals(nativeAppAwarenessRuntime.packageName)) {
                clearNativeAppAwarenessRuntime(true);
            }

            if (shouldIgnoreApp(getContext(), packageName, appLabel)) {
                Log.i(TAG, "Workflow skipped: app is ignored, package=" + packageName);
                return;
            }

            SharedPreferences prefs = getPrefs(getContext());
            String workflowTemplateId = prefs.getString(packageName + APP_AWARENESS_SUFFIX, null);
            if (workflowTemplateId != null && !workflowTemplateId.isEmpty()) {
                Log.i(TAG, "Workflow binding found: package=" + packageName + ", template=" + workflowTemplateId);
                if (!ensureFloatingWindowServiceRunning()) {
                    Log.w(TAG, "Workflow skipped: floating overlay service is unavailable");
                    return;
                }
                if (startNativeAppAwarenessWorkflow(packageName, appLabel, workflowTemplateId)) {
                    scheduleNativeAppAwarenessStartWatchdog(nativeAppAwarenessRuntime, workflowTemplateId);
                } else {
                    Log.w(TAG, "Native workflow unavailable; falling back to Web workflow, template=" + workflowTemplateId);
                    triggerAppAwarenessDetected(packageName, appLabel, workflowTemplateId);
                }
                return;
            }

            String activityId = prefs.getString(packageName, null);
            String activityName = prefs.getString(packageName + RULE_NAME_SUFFIX, null);

            if (activityId == null || activityId.isEmpty()) {
                Log.i(TAG, "Workflow skipped: no app-awareness binding or legacy activity rule for package=" + packageName);
                return;
            }

            String displayName = (activityName != null && !activityName.isEmpty()) ? activityName : appLabel;
            if (!ensureFloatingWindowServiceRunning()) {
                return;
            }
            FloatingWindowService.showPrompt(packageName, displayName, appLabel, activityId);
        } catch (Exception e) {
            Log.e(TAG, "Failed to check and show prompt", e);
        }
    }

    private boolean ensureFloatingWindowServiceRunning() {
        Context context = getContext();
        if (context == null) {
            Log.w(TAG, "Unable to start FloatingWindowService: context is null");
            return false;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
            Log.w(TAG, "Skipping FloatingWindowService start because overlay permission is missing");
            return false;
        }

        try {
            Intent serviceIntent = new Intent(context, FloatingWindowService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            Log.d(TAG, "Floating overlay service start requested");
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Failed to ensure FloatingWindowService is running", e);
            return false;
        }
    }

    private void triggerAppAwarenessDetected(String packageName, String appLabel, String workflowTemplateId) {
        if (getBridge() == null) {
            Log.w(TAG, "Unable to trigger appAwarenessDetected: bridge is null");
            return;
        }

        JSObject payload = new JSObject();
        payload.put("packageName", packageName);
        payload.put("appLabel", appLabel);
        payload.put("workflowTemplateId", workflowTemplateId);
        Log.i(TAG, "Dispatching Web workflow fallback: package=" + packageName + ", template=" + workflowTemplateId);
        notifyListeners("appAwarenessDetected", payload, true);
        getBridge().triggerWindowJSEvent("appAwarenessDetected", payload.toString());
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasUsageStatsPermission());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (!hasUsageStatsPermission()) {
            Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void checkAccessibilityPermission(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", isAccessibilityServiceEnabled());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestAccessibilityPermission(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getRunningApp(PluginCall call) {
        if (currentRealtimePackage != null) {
            JSObject ret = new JSObject();
            ret.put("packageName", currentRealtimePackage);
            call.resolve(ret);
            return;
        }

        if (!hasUsageStatsPermission()) {
            call.reject("Permission denied");
            return;
        }

        String packageName = getTopPackageName();
        JSObject ret = new JSObject();
        ret.put("packageName", packageName != null ? packageName : "");
        call.resolve(ret);
    }

    private String getTopPackageName() {
        UsageStatsManager usageStatsManager = (UsageStatsManager) getContext()
                .getSystemService(Context.USAGE_STATS_SERVICE);
        long endTime = System.currentTimeMillis();
        long startTime = endTime - 60000;

        android.app.usage.UsageEvents.Event event = new android.app.usage.UsageEvents.Event();
        android.app.usage.UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
        String packageName = null;
        long lastTimestamp = 0;

        while (usageEvents.hasNextEvent()) {
            usageEvents.getNextEvent(event);
            if (event.getEventType() == android.app.usage.UsageEvents.Event.MOVE_TO_FOREGROUND
                    && event.getTimeStamp() > lastTimestamp) {
                lastTimestamp = event.getTimeStamp();
                packageName = event.getPackageName();
            }
        }
        return packageName;
    }

    @PluginMethod
    public void getInstalledApps(PluginCall call) {
        new Thread(() -> {
            try {
                PackageManager pm = getContext().getPackageManager();
                List<ApplicationInfo> apps = pm.getInstalledApplications(PackageManager.GET_META_DATA);
                JSArray ret = new JSArray();

                for (ApplicationInfo app : apps) {
                    if ((app.flags & ApplicationInfo.FLAG_SYSTEM) == 0
                            || (app.flags & ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0) {
                        JSObject obj = new JSObject();
                        obj.put("packageName", app.packageName);
                        obj.put("label", pm.getApplicationLabel(app).toString());
                        try {
                            Drawable icon = pm.getApplicationIcon(app);
                            obj.put("icon", drawableToBase64(icon));
                        } catch (Exception e) {
                            obj.put("icon", "");
                        }
                        ret.put(obj);
                    }
                }
                call.resolve(new JSObject().put("apps", ret));
            } catch (Exception e) {
                call.reject("Failed to get apps", e);
            }
        }).start();
    }

    @PluginMethod
    public void saveAppRule(PluginCall call) {
        String packageName = call.getString("packageName");
        String activityId = call.getString("activityId");
        String activityName = call.getString("activityName");
        if (packageName == null || activityId == null) {
            call.reject("Missing packageName or activityId");
            return;
        }

        SharedPreferences prefs = getPrefs(getContext());
        prefs.edit()
                .putString(packageName, activityId)
                .putString(packageName + RULE_NAME_SUFFIX, activityName != null ? activityName : "")
                .apply();
        call.resolve();
    }

    @PluginMethod
    public void removeAppRule(PluginCall call) {
        String packageName = call.getString("packageName");
        if (packageName == null) {
            call.reject("Missing packageName");
            return;
        }

        SharedPreferences prefs = getPrefs(getContext());
        prefs.edit()
                .remove(packageName)
                .remove(packageName + RULE_NAME_SUFFIX)
                .apply();
        call.resolve();
    }

    @PluginMethod
    public void setAppIgnored(PluginCall call) {
        String packageName = call.getString("packageName");
        Boolean ignored = call.getBoolean("ignored");
        if (packageName == null || ignored == null) {
            call.reject("Missing packageName or ignored");
            return;
        }

        SharedPreferences prefs = getPrefs(getContext());
        prefs.edit()
                .putBoolean(packageName + IGNORE_SUFFIX, ignored)
                .apply();
        call.resolve();
    }

    @PluginMethod
    public void getAppRules(PluginCall call) {
        SharedPreferences prefs = getPrefs(getContext());
        Map<String, ?> all = prefs.getAll();
        JSObject rules = new JSObject();
        JSObject ignoredApps = new JSObject();

        for (Map.Entry<String, ?> entry : all.entrySet()) {
            String key = entry.getKey();
            Object value = entry.getValue();

            if (key.endsWith(RULE_NAME_SUFFIX)) {
                continue;
            }

            if (key.endsWith(IGNORE_SUFFIX)) {
                String packageName = key.substring(0, key.length() - IGNORE_SUFFIX.length());
                ignoredApps.put(packageName, value instanceof Boolean ? (Boolean) value : false);
                continue;
            }

            if (value instanceof String) {
                rules.put(key, value);
            }
        }

        JSObject result = new JSObject();
        result.put("rules", rules);
        result.put("ignoredApps", ignoredApps);
        call.resolve(result);
    }

    @PluginMethod
    public void syncAppAwarenessTemplates(PluginCall call) {
        SharedPreferences prefs = getPrefs(getContext());
        SharedPreferences.Editor editor = prefs.edit();
        JSArray templates = call.getArray("templates");
        editor.putString(APP_AWARENESS_TEMPLATES_KEY, templates != null ? templates.toString() : "[]");
        editor.apply();
        call.resolve();
    }

    @PluginMethod
    public void syncAppAwarenessBindings(PluginCall call) {
        SharedPreferences prefs = getPrefs(getContext());
        SharedPreferences.Editor editor = prefs.edit();

        for (Map.Entry<String, ?> entry : prefs.getAll().entrySet()) {
            String key = entry.getKey();
            if (key.endsWith(APP_AWARENESS_SUFFIX)) {
                editor.remove(key);
            }
        }

        JSObject bindings = call.getObject("bindings");
        if (bindings != null) {
            Iterator<String> keys = bindings.keys();
            while (keys.hasNext()) {
                String packageName = keys.next();
                String workflowTemplateId = bindings.optString(packageName, null);
                if (workflowTemplateId != null && !workflowTemplateId.isEmpty()) {
                    editor.putString(packageName + APP_AWARENESS_SUFFIX, workflowTemplateId);
                }
            }
        }

        editor.apply();
        call.resolve();
    }

    @PluginMethod
    public void getAppAwarenessBindings(PluginCall call) {
        SharedPreferences prefs = getPrefs(getContext());
        JSObject bindings = new JSObject();

        for (Map.Entry<String, ?> entry : prefs.getAll().entrySet()) {
            String key = entry.getKey();
            Object value = entry.getValue();

            if (!key.endsWith(APP_AWARENESS_SUFFIX) || !(value instanceof String)) {
                continue;
            }

            String packageName = key.substring(0, key.length() - APP_AWARENESS_SUFFIX.length());
            bindings.put(packageName, value);
        }

        JSObject result = new JSObject();
        result.put("bindings", bindings);
        call.resolve(result);
    }

    @PluginMethod
    public void consumePendingAppAwarenessStart(PluginCall call) {
        JSObject ret = new JSObject();
        org.json.JSONObject payload = AppAwarenessPendingStartStore.peek(getContext());
        if (payload == null) {
            ret.put("hasPending", false);
            call.resolve(ret);
            return;
        }

        ret.put("hasPending", true);
        try {
            Iterator<String> keys = payload.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                Object value = payload.opt(key);
                ret.put(key, value == null ? JSObject.NULL : value);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to convert pending app-awareness start payload", e);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void acknowledgePendingAppAwarenessStart(PluginCall call) {
        AppAwarenessPendingStartStore.acknowledge(getContext());
        call.resolve();
    }

    @PluginMethod
    public void consumePendingAppAwarenessFinish(PluginCall call) {
        JSObject ret = new JSObject();
        org.json.JSONObject payload = AppAwarenessPendingFinishStore.peek(getContext());
        if (payload == null) {
            ret.put("hasPending", false);
            call.resolve(ret);
            return;
        }

        ret.put("hasPending", true);
        try {
            Iterator<String> keys = payload.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                Object value = payload.opt(key);
                ret.put(key, value == null ? JSObject.NULL : value);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to convert pending app-awareness finish payload", e);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void acknowledgePendingAppAwarenessFinish(PluginCall call) {
        AppAwarenessPendingFinishStore.acknowledge(getContext());
        call.resolve();
    }

    @PluginMethod
    public void showAppAwarenessOverlay(PluginCall call) {
        JSObject payload = call.getObject("payload");
        if (payload == null) {
            call.reject("Missing payload");
            return;
        }

        if (!ensureFloatingWindowServiceRunning()) {
            call.reject("Floating overlay permission missing or service unavailable");
            return;
        }
        FloatingWindowService.showAppAwarenessOverlay(payload.toString());
        call.resolve();
    }

    @PluginMethod
    public void hideAppAwarenessOverlay(PluginCall call) {
        clearNativeAppAwarenessRuntime(false);
        FloatingWindowService.hideAppAwarenessOverlay();
        call.resolve();
    }

    @PluginMethod
    public void stopCurrentAppAwarenessTimer(PluginCall call) {
        clearNativeAppAwarenessTimerRuntime(true, true);
        call.resolve();
    }

    public static void stopActiveAppAwarenessTimerFromFloatingBall() {
        if (instance == null) {
            return;
        }

        NativeAppAwarenessTimerRuntime runtime = nativeAppAwarenessTimerRuntime;
        if (runtime != null) {
            JSObject finishPayload = buildNativeAppAwarenessFinishPayload(runtime, System.currentTimeMillis());
            AppAwarenessPendingFinishStore.save(instance.getContext(), finishPayload);
            triggerAppAwarenessNativeFinish(finishPayload);
        }

        instance.clearNativeAppAwarenessTimerRuntime(true, true);
    }

    private boolean startNativeAppAwarenessWorkflow(String packageName, String appLabel, String workflowTemplateId) {
        org.json.JSONObject template = getStoredAppAwarenessTemplate(workflowTemplateId);
        if (template == null) {
            Log.w(TAG, "No stored native app-awareness template for " + workflowTemplateId);
            return false;
        }

        clearNativeAppAwarenessRuntime(false);
        nativeAppAwarenessRuntime = new NativeAppAwarenessRuntime(packageName, appLabel, template);
        Log.i(TAG, "Starting native workflow: package=" + packageName + ", template=" + workflowTemplateId);
        renderNativeAppAwarenessStep(nativeAppAwarenessRuntime);
        return nativeAppAwarenessRuntime != null;
    }

    private org.json.JSONObject getStoredAppAwarenessTemplate(String workflowTemplateId) {
        SharedPreferences prefs = getPrefs(getContext());
        String stored = prefs.getString(APP_AWARENESS_TEMPLATES_KEY, "[]");
        try {
            org.json.JSONArray templates = new org.json.JSONArray(stored);
            for (int index = 0; index < templates.length(); index++) {
                org.json.JSONObject template = templates.optJSONObject(index);
                if (template == null) {
                    continue;
                }

                if (workflowTemplateId.equals(template.optString("id"))) {
                    return template;
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to parse stored app-awareness templates", e);
        }
        return null;
    }

    private void clearNativeAppAwarenessRuntime(boolean hideOverlay) {
        cancelNativeAppAwarenessCooldown();
        cancelNativeAppAwarenessStartWatchdog();
        nativeAppAwarenessRuntime = null;
        if (hideOverlay) {
            FloatingWindowService.hideAppAwarenessOverlay();
        }
    }

    private void cancelNativeAppAwarenessCooldown() {
        if (nativeAppAwarenessCooldownRunnable != null) {
            APP_AWARENESS_HANDLER.removeCallbacks(nativeAppAwarenessCooldownRunnable);
            nativeAppAwarenessCooldownRunnable = null;
        }
    }

    private void scheduleNativeAppAwarenessStartWatchdog(
            final NativeAppAwarenessRuntime runtime,
            final String workflowTemplateId) {
        cancelNativeAppAwarenessStartWatchdog();
        if (runtime == null) {
            return;
        }

        nativeAppAwarenessStartWatchdogRunnable = new Runnable() {
            @Override
            public void run() {
                nativeAppAwarenessStartWatchdogRunnable = null;
                if (nativeAppAwarenessRuntime != runtime) {
                    return;
                }

                String overlayState = FloatingWindowService.getAppAwarenessOverlayState();
                if (FloatingWindowService.isAppAwarenessOverlayVisible()) {
                    Log.i(TAG, "Native workflow visibility verified: " + overlayState);
                    return;
                }

                Log.w(TAG, "Native workflow rendered no visible overlay; falling back to Web workflow: " + overlayState);
                clearNativeAppAwarenessRuntime(true);
                triggerAppAwarenessDetected(runtime.packageName, runtime.appLabel, workflowTemplateId);
            }
        };
        APP_AWARENESS_HANDLER.postDelayed(nativeAppAwarenessStartWatchdogRunnable, 750L);
    }

    private void cancelNativeAppAwarenessStartWatchdog() {
        if (nativeAppAwarenessStartWatchdogRunnable != null) {
            APP_AWARENESS_HANDLER.removeCallbacks(nativeAppAwarenessStartWatchdogRunnable);
            nativeAppAwarenessStartWatchdogRunnable = null;
        }
    }

    private void clearNativeAppAwarenessTimerRuntime(boolean hideTimerBar, boolean hideOverlay) {
        if (nativeAppAwarenessTimerRunnable != null) {
            APP_AWARENESS_HANDLER.removeCallbacks(nativeAppAwarenessTimerRunnable);
            nativeAppAwarenessTimerRunnable = null;
        }
        nativeAppAwarenessTimerRuntime = null;
        if (hideTimerBar) {
            FloatingWindowService.hideAppAwarenessTimerBar();
        }
        if (hideOverlay) {
            FloatingWindowService.hideAppAwarenessOverlay();
        }
    }

    private void startNativeTimerRuntime(org.json.JSONObject startPayload, org.json.JSONObject startRecordStep) {
        if (startPayload == null) {
            return;
        }

        String nativeTimerId = startPayload.optString("nativeTimerId", "");
        long startedAt = startPayload.optLong("startedAt", System.currentTimeMillis());
        int expectedDurationMinutes = Math.max(0, startPayload.optInt("expectedDurationMinutes", 0));
        if (expectedDurationMinutes <= 0) {
            clearNativeAppAwarenessTimerRuntime(true, false);
            return;
        }

        nativeAppAwarenessTimerRuntime = new NativeAppAwarenessTimerRuntime(
                nativeTimerId,
                startPayload.optString("packageName", ""),
                startPayload.optString("appLabel", ""),
                startedAt,
                expectedDurationMinutes,
                startPayload,
                startRecordStep);
        scheduleNativeTimerRuntime(nativeAppAwarenessTimerRuntime);
    }

    private void scheduleNativeTimerRuntime(final NativeAppAwarenessTimerRuntime runtime) {
        clearNativeAppAwarenessTimerRuntime(true, false);
        nativeAppAwarenessTimerRuntime = runtime;

        try {
            FloatingWindowService.showAppAwarenessTimerBar(buildNativeTimerBarPayload(runtime).toString());
        } catch (Exception e) {
            Log.e(TAG, "Failed to render native app-awareness timer bar", e);
        }

        nativeAppAwarenessTimerRunnable = new Runnable() {
            @Override
            public void run() {
                if (nativeAppAwarenessTimerRuntime != runtime) {
                    return;
                }

                try {
                    FloatingWindowService.updateAppAwarenessTimerBar(buildNativeTimerBarPayload(runtime).toString());
                } catch (Exception e) {
                    Log.e(TAG, "Failed to update native app-awareness timer bar", e);
                }

                if (runtime.expectedDurationMinutes > 0
                        && !runtime.overtimePromptShown
                        && runtime.scheduledEndAt > 0
                        && System.currentTimeMillis() >= runtime.scheduledEndAt
                        && runtime.packageName.equals(currentRealtimePackage)) {
                    runtime.overtimePromptShown = true;
                    try {
                        FloatingWindowService.showAppAwarenessOverlay(buildNativeOvertimePayload(runtime).toString());
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to show native overtime prompt", e);
                    }
                }

                APP_AWARENESS_HANDLER.postDelayed(this, 1000);
            }
        };
        APP_AWARENESS_HANDLER.post(nativeAppAwarenessTimerRunnable);
    }

    private boolean handleNativeAppAwarenessOverlayActionInternal(String actionId, String value) {
        NativeAppAwarenessTimerRuntime timerRuntime = nativeAppAwarenessTimerRuntime;
        if (timerRuntime != null && handleNativeTimerOverlayActionInternal(timerRuntime, actionId, value)) {
            return true;
        }

        NativeAppAwarenessRuntime runtime = nativeAppAwarenessRuntime;
        if (runtime == null) {
            return false;
        }

        if ("workflow-cancel".equals(actionId)) {
            clearNativeAppAwarenessRuntime(true);
            return true;
        }

        org.json.JSONArray steps = runtime.template.optJSONArray("steps");
        if (steps == null || runtime.currentStepIndex < 0 || runtime.currentStepIndex >= steps.length()) {
            clearNativeAppAwarenessRuntime(true);
            return true;
        }

        org.json.JSONObject step = steps.optJSONObject(runtime.currentStepIndex);
        if (step == null) {
            clearNativeAppAwarenessRuntime(true);
            return true;
        }

        try {
            String stepType = step.optString("type", "");
            if ("cooldown_wait".equals(stepType)) {
                return true;
            }

            if ("text_question".equals(stepType) && "text-submit".equals(actionId)) {
                String textValue = value == null ? "" : value.trim();
                if (step.optBoolean("required", true) && textValue.isEmpty()) {
                    renderNativeAppAwarenessStep(runtime);
                    return true;
                }

                runtime.answers.put(step.optString("answerKey", "purpose"), textValue);
                runtime.currentStepIndex += 1;
                renderNativeAppAwarenessStep(runtime);
                return true;
            }

            if ("single_choice".equals(stepType) && "choice-select".equals(actionId)) {
                runtime.answers.put(step.optString("answerKey", "usage"), value == null ? "" : value);
                runtime.currentStepIndex += 1;
                renderNativeAppAwarenessStep(runtime);
                return true;
            }

            if ("expected_duration".equals(stepType) && "duration-select".equals(actionId)) {
                int durationMinutes = safeParsePositiveInt(value, 0);
                if (durationMinutes > 0) {
                    runtime.answers.put(step.optString("answerKey", "durationMinutes"), durationMinutes);
                    runtime.currentStepIndex += 1;
                    renderNativeAppAwarenessStep(runtime);
                }
                return true;
            }

            if ("start_record".equals(stepType) && "activity-start".equals(actionId)) {
                org.json.JSONObject selectedActivity = findNativeActivityOption(step.optJSONArray("activityOptions"), value);
                if (selectedActivity == null) {
                    Log.w(TAG, "Selected native app-awareness activity option not found: " + value);
                    return true;
                }

                JSObject startPayload = buildNativeAppAwarenessStartPayload(runtime, step, selectedActivity);
                dispatchNativeAppAwarenessStart(startPayload);
                syncFloatingWindowForNativeStart(startPayload);
                startNativeTimerRuntime(startPayload, step);
                clearNativeAppAwarenessRuntime(true);
                return true;
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to handle native app-awareness action", e);
            clearNativeAppAwarenessRuntime(true);
            return true;
        }

        return false;
    }

    private boolean handleNativeTimerOverlayActionInternal(
            NativeAppAwarenessTimerRuntime runtime,
            String actionId,
            String value) {
        if (!"overtime-finish".equals(actionId)
                && !"overtime-extend".equals(actionId)
                && !"overtime-dismiss".equals(actionId)
                && !"workflow-cancel".equals(actionId)) {
            return false;
        }

        if ("overtime-finish".equals(actionId)) {
            JSObject finishPayload = buildNativeAppAwarenessFinishPayload(runtime, System.currentTimeMillis());
            AppAwarenessPendingFinishStore.save(getContext(), finishPayload);
            triggerAppAwarenessNativeFinish(finishPayload);
            syncFloatingWindowForNativeStop();
            clearNativeAppAwarenessTimerRuntime(true, true);
            return true;
        }

        if ("overtime-extend".equals(actionId)) {
            int nextDurationMinutes = safeParsePositiveInt(value, 0);
            if (nextDurationMinutes > 0) {
                runtime.scheduledEndAt = System.currentTimeMillis() + nextDurationMinutes * 60L * 1000L;
                runtime.overtimePromptShown = false;
                runtime.extensionHistory.put(nextDurationMinutes);
                try {
                    runtime.startPayload.put("expectedDurationMinutes", nextDurationMinutes);
                } catch (Exception e) {
                    Log.w(TAG, "Failed to update native timer payload duration", e);
                }
                FloatingWindowService.hideAppAwarenessOverlay();
                triggerAppAwarenessOverlayAction(actionId, String.valueOf(nextDurationMinutes));
            }
            return true;
        }

        FloatingWindowService.hideAppAwarenessOverlay();
        runtime.overtimePromptShown = true;
        triggerAppAwarenessOverlayAction(actionId, value);
        return true;
    }

    private static JSObject buildNativeAppAwarenessFinishPayload(
            NativeAppAwarenessTimerRuntime runtime,
            long finishedAt) {
        JSObject finishPayload = new JSObject();
        finishPayload.put("nativeTimerId", runtime.nativeTimerId);
        finishPayload.put("packageName", runtime.packageName);
        finishPayload.put("finishedAt", finishedAt);
        return finishPayload;
    }

    private JSObject buildNativeAppAwarenessStartPayload(
            NativeAppAwarenessRuntime runtime,
            org.json.JSONObject startRecordStep,
            org.json.JSONObject selectedActivity) {
        JSObject payload = new JSObject();
        payload.put("nativeTimerId", UUID.randomUUID().toString());
        payload.put("packageName", runtime.packageName);
        payload.put("appLabel", runtime.appLabel);
        payload.put("workflowTemplateId", runtime.template.optString("id", ""));
        payload.put("answers", runtime.answers);
        payload.put("selectedActivity", selectedActivity);
        payload.put("startedAt", System.currentTimeMillis());
        int expectedDurationMinutes = resolveNativeExpectedDurationMinutes(runtime, startRecordStep);
        if (expectedDurationMinutes > 0) {
            payload.put("expectedDurationMinutes", expectedDurationMinutes);
        }
        return payload;
    }

    private void dispatchNativeAppAwarenessStart(JSObject payload) {
        if (payload == null) {
            return;
        }

        AppAwarenessPendingStartStore.save(getContext(), payload);
        if (getBridge() == null) {
            Log.w(TAG, "Unable to trigger native app-awareness start immediately: bridge is null, payload persisted");
            return;
        }

        notifyListeners("appAwarenessNativeStart", payload, true);
        getBridge().triggerWindowJSEvent("appAwarenessNativeStart", payload.toString());
    }

    private void syncFloatingWindowForNativeStart(JSObject startPayload) {
        if (startPayload == null) {
            return;
        }

        org.json.JSONObject selectedActivity = startPayload.optJSONObject("selectedActivity");
        String activityIcon = selectedActivity == null ? "" : selectedActivity.optString("icon", "");
        long startedAt = startPayload.optLong("startedAt", System.currentTimeMillis());
        if (!FloatingWindowService.updateFocusStateIfRunning(activityIcon, true, startedAt, null)) {
            if (!ensureFloatingWindowServiceRunning()) {
                return;
            }
            FloatingWindowService.updateFocusStateIfRunning(activityIcon, true, startedAt, null);
        }
    }

    private void syncFloatingWindowForNativeStop() {
        FloatingWindowService.updateFocusStateIfRunning("", false, 0L, null);
    }

    private org.json.JSONObject buildNativeTimerBarPayload(NativeAppAwarenessTimerRuntime runtime) throws org.json.JSONException {
        org.json.JSONObject payload = new org.json.JSONObject();
        payload.put("title", runtime.appLabel + " 剩余时间");
        payload.put("timeText", formatNativeTimerText(runtime));
        return payload;
    }

    private org.json.JSONObject buildNativeOvertimePayload(NativeAppAwarenessTimerRuntime runtime) throws org.json.JSONException {
        org.json.JSONObject payload = new org.json.JSONObject();
        payload.put("title", "是否结束当前活动？");
        payload.put("body", runtime.appLabel + " 还在前台，你可以现在结束，或继续延长一段时间。");
        payload.put("progressText", "已到预计时长");
        payload.put("allowClose", false);
        org.json.JSONArray buttons = new org.json.JSONArray();
        buttons.put(createOverlayButton("overtime-finish", "结束活动", "primary", null, false));

        org.json.JSONArray extensionOptions = runtime.startRecordStep.optBoolean("allowContinueExtensions", true)
                ? runtime.startRecordStep.optJSONArray("extensionMinutesOptions")
                : null;
        if (extensionOptions != null) {
            for (int index = 0; index < extensionOptions.length(); index++) {
                int minutes = Math.max(1, extensionOptions.optInt(index, 0));
                if (minutes <= 0) {
                    continue;
                }
                buttons.put(createOverlayButton(
                        "overtime-extend",
                        "继续 " + minutes + " 分钟",
                        "secondary",
                        String.valueOf(minutes),
                        false));
            }
        }

        payload.put("buttons", buttons);
        return payload;
    }

    private String formatNativeTimerText(NativeAppAwarenessTimerRuntime runtime) {
        long now = System.currentTimeMillis();
        if (runtime.expectedDurationMinutes > 0 && runtime.scheduledEndAt > 0) {
            long remainingMillis = Math.max(0L, runtime.scheduledEndAt - now);
            long remainingSeconds = remainingMillis / 1000L;
            long minutes = remainingSeconds / 60L;
            long seconds = remainingSeconds % 60L;
            return String.format(Locale.getDefault(), "%02d:%02d", minutes, seconds);
        }

        long elapsedSeconds = Math.max(0L, (now - runtime.startedAt) / 1000L);
        long minutes = elapsedSeconds / 60L;
        long seconds = elapsedSeconds % 60L;
        return String.format(Locale.getDefault(), "%02d:%02d", minutes, seconds);
    }

    private int resolveNativeExpectedDurationMinutes(
            NativeAppAwarenessRuntime runtime,
            org.json.JSONObject startRecordStep) {
        String durationSource = startRecordStep.optString("durationSource", "from_step");
        if ("fixed".equals(durationSource)) {
            return Math.max(0, startRecordStep.optInt("defaultDurationMinutes", 0));
        }

        if ("none".equals(durationSource)) {
            return 0;
        }

        org.json.JSONArray steps = runtime.template.optJSONArray("steps");
        if (steps == null) {
            return 0;
        }

        for (int index = 0; index < steps.length(); index++) {
            org.json.JSONObject step = steps.optJSONObject(index);
            if (step == null || !"expected_duration".equals(step.optString("type"))) {
                continue;
            }

            String answerKey = step.optString("answerKey", "durationMinutes");
            return Math.max(0, runtime.answers.optInt(answerKey, 0));
        }

        return 0;
    }

    private org.json.JSONObject findNativeActivityOption(org.json.JSONArray options, String selectedId) {
        if (options == null || selectedId == null) {
            return null;
        }

        for (int index = 0; index < options.length(); index++) {
            org.json.JSONObject option = options.optJSONObject(index);
            if (option != null && selectedId.equals(option.optString("id"))) {
                return option;
            }
        }

        return null;
    }

    private void renderNativeAppAwarenessStep(NativeAppAwarenessRuntime runtime) {
        if (runtime == null || nativeAppAwarenessRuntime != runtime) {
            return;
        }

        org.json.JSONArray steps = runtime.template.optJSONArray("steps");
        if (steps == null || steps.length() == 0 || runtime.currentStepIndex >= steps.length()) {
            clearNativeAppAwarenessRuntime(true);
            return;
        }

        org.json.JSONObject step = steps.optJSONObject(runtime.currentStepIndex);
        if (step == null) {
            clearNativeAppAwarenessRuntime(true);
            return;
        }

        String stepType = step.optString("type", "");
        Log.i(TAG, "Rendering native workflow step: package=" + runtime.packageName
                + ", index=" + runtime.currentStepIndex + ", type=" + stepType);
        if ("cooldown_wait".equals(stepType)) {
            long endsAt = System.currentTimeMillis() + Math.max(1, step.optInt("durationSeconds", 30)) * 1000L;
            scheduleNativeCooldown(runtime, step, steps.length(), endsAt);
            return;
        }

        try {
            FloatingWindowService.showAppAwarenessOverlay(
                    buildNativeAppAwarenessStepPayload(runtime, step, steps.length()).toString());
        } catch (Exception e) {
            Log.e(TAG, "Failed to render native app-awareness step", e);
            clearNativeAppAwarenessRuntime(true);
        }
    }

    private void scheduleNativeCooldown(
            final NativeAppAwarenessRuntime runtime,
            final org.json.JSONObject step,
            final int totalSteps,
            final long endsAt) {
        cancelNativeAppAwarenessCooldown();
        try {
            int initialRemainingSeconds = (int) Math.ceil(Math.max(0L, endsAt - System.currentTimeMillis()) / 1000d);
            FloatingWindowService.showAppAwarenessOverlay(
                    buildNativeCooldownPayload(runtime, step, totalSteps, initialRemainingSeconds).toString());
        } catch (Exception e) {
            Log.e(TAG, "Failed to render initial native app-awareness cooldown", e);
            clearNativeAppAwarenessRuntime(true);
            return;
        }

        nativeAppAwarenessCooldownRunnable = new Runnable() {
            @Override
            public void run() {
                if (nativeAppAwarenessRuntime != runtime) {
                    return;
                }

                long remainingMillis = Math.max(0L, endsAt - System.currentTimeMillis());
                int remainingSeconds = (int) Math.ceil(remainingMillis / 1000d);
                if (remainingSeconds <= 0) {
                    runtime.currentStepIndex += 1;
                    renderNativeAppAwarenessStep(runtime);
                    return;
                }

                try {
                    FloatingWindowService.updateAppAwarenessOverlay(
                            buildNativeCooldownPayload(runtime, step, totalSteps, remainingSeconds).toString());
                } catch (Exception e) {
                    Log.e(TAG, "Failed to update native app-awareness cooldown", e);
                    clearNativeAppAwarenessRuntime(true);
                    return;
                }

                APP_AWARENESS_HANDLER.postDelayed(this, 1000);
            }
        };
        APP_AWARENESS_HANDLER.postDelayed(nativeAppAwarenessCooldownRunnable, 1000);
    }

    private org.json.JSONObject buildNativeCooldownPayload(
            NativeAppAwarenessRuntime runtime,
            org.json.JSONObject step,
            int totalSteps,
            int remainingSeconds) throws org.json.JSONException {
        org.json.JSONObject payload = createOverlayPayloadBase(
                step.optString("title", "冷静一下"),
                step.optString("description", runtime.appLabel + " 之前先冷静 " + remainingSeconds + " 秒。"),
                buildNativeProgressText(runtime.currentStepIndex, totalSteps),
                runtime.template.optBoolean("allowClose", true));
        payload.put("countdownSeconds", Math.max(0, remainingSeconds));
        payload.put("body", runtime.appLabel + " 之前先冷静 " + Math.max(0, remainingSeconds) + " 秒。");
        payload.put("buttons", new org.json.JSONArray());
        return payload;
    }

    private org.json.JSONObject buildNativeAppAwarenessStepPayload(
            NativeAppAwarenessRuntime runtime,
            org.json.JSONObject step,
            int totalSteps) throws org.json.JSONException {
        String stepType = step.optString("type", "");
        org.json.JSONObject payload = createOverlayPayloadBase(
                step.optString("title", "应用感知"),
                step.optString("description", ""),
                buildNativeProgressText(runtime.currentStepIndex, totalSteps),
                runtime.template.optBoolean("allowClose", true));
        org.json.JSONArray buttons = new org.json.JSONArray();

        if ("text_question".equals(stepType)) {
            String answerKey = step.optString("answerKey", "purpose");
            payload.put("body", step.optString("description", runtime.appLabel + " 这次是为了做什么？"));
            payload.put("showInput", true);
            payload.put("inputPlaceholder", step.optString("placeholder", "写下这次打开它的目的"));
            payload.put("inputHint", "填写后继续");
            payload.put("inputValue", runtime.answers.optString(answerKey, ""));
            buttons.put(createOverlayButton("text-submit", "下一步", "primary", null, true));
            payload.put("buttons", buttons);
            return payload;
        }

        if ("single_choice".equals(stepType)) {
            payload.put("body", step.optString("description", runtime.appLabel + " 这次主要在做什么？"));
            org.json.JSONArray options = step.optJSONArray("options");
            if (options != null) {
                for (int index = 0; index < options.length(); index++) {
                    org.json.JSONObject option = options.optJSONObject(index);
                    if (option == null) {
                        continue;
                    }
                    buttons.put(createOverlayButton(
                            "choice-select",
                            option.optString("label", "继续"),
                            "secondary",
                            option.optString("value", ""),
                            false));
                }
            }
            payload.put("buttons", buttons);
            return payload;
        }

        if ("expected_duration".equals(stepType)) {
            payload.put("body", step.optString("description", "预计这次会花多久？"));
            org.json.JSONArray durations = step.optJSONArray("durationMinutesOptions");
            if (durations != null) {
                for (int index = 0; index < durations.length(); index++) {
                    int minutes = Math.max(1, durations.optInt(index, 0));
                    if (minutes <= 0) {
                        continue;
                    }
                    buttons.put(createOverlayButton(
                            "duration-select",
                            minutes + " 分钟",
                            "secondary",
                            String.valueOf(minutes),
                            false));
                }
            }
            payload.put("buttons", buttons);
            return payload;
        }

        if ("start_record".equals(stepType)) {
            payload.put("body", step.optString("description", "选择这次要记录成什么活动，并开始计时。"));
            org.json.JSONArray activityOptions = step.optJSONArray("activityOptions");
            if (activityOptions != null) {
                for (int index = 0; index < activityOptions.length(); index++) {
                    org.json.JSONObject option = activityOptions.optJSONObject(index);
                    if (option == null) {
                        continue;
                    }
                    buttons.put(createOverlayButton(
                            "activity-start",
                            getNativeActivityDisplayLabel(option.optString("label", "")),
                            "secondary",
                            option.optString("id", ""),
                            false));
                }
            }
            payload.put("buttons", buttons);
            return payload;
        }

        payload.put("buttons", buttons);
        return payload;
    }

    private org.json.JSONObject createOverlayPayloadBase(
            String title,
            String body,
            String progressText,
            boolean allowClose) throws org.json.JSONException {
        org.json.JSONObject payload = new org.json.JSONObject();
        payload.put("title", title);
        payload.put("body", body);
        payload.put("progressText", progressText);
        payload.put("allowClose", allowClose);
        return payload;
    }

    private org.json.JSONObject createOverlayButton(
            String id,
            String label,
            String style,
            String value,
            boolean submitTextValue) throws org.json.JSONException {
        org.json.JSONObject button = new org.json.JSONObject();
        button.put("id", id);
        button.put("label", label);
        button.put("style", style);
        if (value != null) {
            button.put("value", value);
        }
        if (submitTextValue) {
            button.put("submitTextValue", true);
        }
        return button;
    }

    private String buildNativeProgressText(int currentStepIndex, int totalSteps) {
        return Math.min(currentStepIndex + 1, totalSteps) + "/" + totalSteps;
    }

    private int safeParsePositiveInt(String value, int fallback) {
        try {
            int parsed = Integer.parseInt(value == null ? "" : value.trim());
            return parsed > 0 ? parsed : fallback;
        } catch (Exception e) {
            return fallback;
        }
    }

    private String getNativeActivityDisplayLabel(String label) {
        if (label == null) {
            return "";
        }

        String[] segments = label.split("/");
        String resolved = segments.length == 0 ? label : segments[segments.length - 1];
        return resolved.trim();
    }

    @PluginMethod
    public void showFloatingText(PluginCall call) {
        String text = call.getString("text");
        if (text == null || text.isEmpty()) {
            call.reject("Missing text");
            return;
        }

        FloatingWindowService.showTempText(text);
        call.resolve();
    }

    private static SharedPreferences getPrefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    public static boolean shouldIgnoreApp(Context context, String packageName, String appLabel) {
        if (context == null || packageName == null || packageName.isEmpty()) {
            return true;
        }

        if (packageName.equals(context.getPackageName())) {
            return true;
        }

        return isAppIgnoredByUser(context, packageName) || isDefaultIgnoredApp(context, packageName, appLabel);
    }

    public static boolean isLikelyInputMethodPackage(Context context, String packageName, String appLabel) {
        if (context == null || packageName == null || packageName.isEmpty()) {
            return false;
        }
        return isLikelyInputMethod(context, packageName, appLabel);
    }

    private static boolean isAppIgnoredByUser(Context context, String packageName) {
        return getPrefs(context).getBoolean(packageName + IGNORE_SUFFIX, false);
    }

    private static boolean isDefaultIgnoredApp(Context context, String packageName, String appLabel) {
        if (isLikelyInputMethod(context, packageName, appLabel)) {
            return true;
        }

        return isSystemApp(context, packageName);
    }

    private static boolean isLikelyInputMethod(Context context, String packageName, String appLabel) {
        try {
            InputMethodManager imm = (InputMethodManager) context.getSystemService(Context.INPUT_METHOD_SERVICE);
            if (imm != null) {
                List<InputMethodInfo> enabledInputMethods = imm.getEnabledInputMethodList();
                for (InputMethodInfo info : enabledInputMethods) {
                    if (packageName.equals(info.getPackageName())) {
                        return true;
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to inspect input methods for " + packageName, e);
        }

        String normalizedPackage = packageName.toLowerCase(Locale.ROOT);
        String normalizedLabel = appLabel == null ? "" : appLabel.toLowerCase(Locale.ROOT);
        String[] keywords = new String[] {
                "\u8f93\u5165\u6cd5",
                "\u952e\u76d8",
                "keyboard",
                "input method",
                "inputmethod",
                ".ime",
                "ime.",
                "gboard",
                "swiftkey"
        };
        for (String keyword : keywords) {
            if (normalizedPackage.contains(keyword) || normalizedLabel.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    private static boolean isSystemApp(Context context, String packageName) {
        try {
            PackageManager pm = context.getPackageManager();
            ApplicationInfo appInfo = pm.getApplicationInfo(packageName, 0);
            boolean isSystem = (appInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0;
            boolean isUpdatedSystem = (appInfo.flags & ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0;
            return isSystem && !isUpdatedSystem;
        } catch (Exception e) {
            Log.w(TAG, "Failed to inspect app info for " + packageName, e);
            return false;
        }
    }

    private String drawableToBase64(Drawable drawable) {
        Bitmap bitmap;
        if (drawable instanceof BitmapDrawable) {
            bitmap = ((BitmapDrawable) drawable).getBitmap();
        } else {
            int width = drawable.getIntrinsicWidth();
            int height = drawable.getIntrinsicHeight();
            if (width <= 0) {
                width = 96;
            }
            if (height <= 0) {
                height = 96;
            }

            bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
            drawable.draw(canvas);
        }

        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, byteArrayOutputStream);
        byte[] byteArray = byteArrayOutputStream.toByteArray();
        return "data:image/png;base64," + Base64.encodeToString(byteArray, Base64.NO_WRAP);
    }

    @PluginMethod
    public void startMonitor(PluginCall call) {
        if (!hasUsageStatsPermission()) {
            call.reject("Permission denied");
            return;
        }

        try {
            Intent serviceIntent = new Intent(getContext(), AppMonitorService.class);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                getContext().startForegroundService(serviceIntent);
            } else {
                getContext().startService(serviceIntent);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to start service", e);
        }
    }

    @PluginMethod
    public void stopMonitor(PluginCall call) {
        try {
            Intent serviceIntent = new Intent(getContext(), AppMonitorService.class);
            getContext().stopService(serviceIntent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to stop service", e);
        }
    }

    private boolean hasUsageStatsPermission() {
        AppOpsManager appOps = (AppOpsManager) getContext().getSystemService(Context.APP_OPS_SERVICE);
        int mode = appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                getContext().getPackageName()
        );
        return mode == AppOpsManager.MODE_ALLOWED;
    }

    private boolean isAccessibilityServiceEnabled() {
        AccessibilityManager am = (AccessibilityManager) getContext().getSystemService(Context.ACCESSIBILITY_SERVICE);
        List<AccessibilityServiceInfo> serviceInfoList = am
                .getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_GENERIC);

        String expectedComponentName = getContext().getPackageName() + "/.AppAccessibilityService";
        for (AccessibilityServiceInfo info : serviceInfoList) {
            String id = info.getId();
            if (id != null && id.equals(expectedComponentName)) {
                return true;
            }
        }
        return false;
    }
}
