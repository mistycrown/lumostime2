/**
 * @file FocusNotificationPlugin.java
 * @input JS Plugin Calls
 * @output Native Floating Window Control
 * @pos Native Plugin
 * @description Capacitor plugin implementation for controlling the Floating Window (LumosTime Island) feature and starting its Android foreground service safely across API levels.
 * @updated 2026-05-09: Persisted floating-window stop requests and exposed a consume hook so background stops can reconcile after the Web runtime resumes.
 * @updated 2026-05-09: Added active focus-session syncing so native Android can render app timer labels inside the shared persistent notification title.
 * @updated 2026-04-15: Switched floating-window launches to foreground-service startup on Android 8+.
 * @updated 2026-07-11: Prevent idle updateFloatingWindow calls from starting the floating-window service when it is not already running.
 * @updated 2026-06-13: Prefer direct memory state update in updateFloatingWindow to avoid Android 12+ background startForegroundService limitations.
  */
package com.mistycrown.lumostime;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(name = "FocusNotification", permissions = {
        @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications")
})
public class FocusNotificationPlugin extends Plugin {

    private static final String TAG = "FocusNotification";
    private static FocusNotificationPlugin instance = null;

    @Override
    public void load() {
        super.load();
        instance = this;
        Log.d(TAG, "✅ FocusNotificationPlugin loaded, instance saved");
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        instance = null;
        Log.d(TAG, "🔴 FocusNotificationPlugin destroyed, instance cleared");
    }

    public static void triggerStopFocusFromFloating() {
        if (instance != null && instance.getBridge() != null) {
            FocusNotificationPendingStopStore.save(instance.getContext(), null, System.currentTimeMillis());
            Log.d(TAG, "📛 Trigger stop event to WebView without session id");
            instance.notifyListeners("stopFocusFromFloating", new JSObject(), true);
            instance.getBridge().triggerWindowJSEvent("stopFocusFromFloating", "{}");
        } else {
            Log.w(TAG, "⚠️ Unable to trigger stop event: plugin instance or bridge is null");
        }
    }

    public static void triggerStopFocusFromFloating(String sessionId) {
        if (instance != null && instance.getBridge() != null) {
            FocusNotificationPendingStopStore.save(instance.getContext(), sessionId, System.currentTimeMillis());
            Log.d(TAG, "Trigger stop event to WebView with sessionId=" + sessionId);
            JSObject payload = new JSObject();
            payload.put("sessionId", sessionId);
            instance.notifyListeners("stopFocusFromFloating", payload, true);
            instance.getBridge().triggerWindowJSEvent("stopFocusFromFloating", payload.toString());
        } else {
            Log.w(TAG, "Unable to trigger stopFocusFromFloating: plugin instance or bridge is null");
        }
    }

    public static void triggerStartFocusFromPrompt(String packageName, String appLabel, String realAppName,
            String activityId) {
        if (instance != null && instance.getBridge() != null) {
            String jsonData = String.format(
                    "{\"packageName\":\"%s\",\"appLabel\":\"%s\",\"realAppName\":\"%s\",\"activityId\":\"%s\"}",
                    packageName.replace("\"", "\\\""),
                    appLabel.replace("\"", "\\\""),
                    realAppName.replace("\"", "\\\""),
                    activityId.replace("\"", "\\\""));
            instance.getBridge().triggerWindowJSEvent("startFocusFromPrompt", jsonData);
        } else {
            Log.w(TAG, "⚠️ Unable to trigger start event: plugin instance or bridge is null");
        }
    }

    @PluginMethod
    public void checkFloatingPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            boolean granted = Settings.canDrawOverlays(getContext());
            JSObject ret = new JSObject();
            ret.put("granted", granted);
            call.resolve(ret);
        } else {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void checkNotificationPermission(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", areNotificationsEnabled());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestFloatingPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(getContext())) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (areNotificationsEnabled()) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationPermissionCallback");
            return;
        }

        openNotificationSettings();
        JSObject ret = new JSObject();
        ret.put("granted", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void startFloatingWindow(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, FloatingWindowService.class);
        String icon = call.getString("icon");
        boolean isFocusing = call.getBoolean("isFocusing", false);
        Double startTime = call.getDouble("startTime");
        String sessionId = call.getString("sessionId");

        if (icon != null) {
            intent.putExtra("icon", icon);
        }
        intent.putExtra("isFocusing", isFocusing);
        if (startTime != null) {
            intent.putExtra("startTime", startTime.longValue());
        }
        if (sessionId != null) {
            intent.putExtra("sessionId", sessionId);
        }

        try {
            startFloatingWindowService(context, intent);
            Log.d(TAG, "✅ Started floating window service");
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to start floating window service", e);
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void updateFloatingWindow(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, FloatingWindowService.class);
        String icon = call.getString("icon");
        boolean isFocusing = call.getBoolean("isFocusing", false);
        String startTimeStr = call.getString("startTime");
        String sessionId = call.getString("sessionId");

        Log.d(TAG, "📗 Plugin updateFloatingWindow: focus=" + isFocusing + ", start=" + startTimeStr
                + ", icon=" + icon + ", sessionId=" + sessionId);

        intent.putExtra("icon", icon);
        intent.putExtra("isFocusing", isFocusing);
        if (sessionId != null) {
            intent.putExtra("sessionId", sessionId);
        }
        long start = 0;
        if (startTimeStr != null) {
            try {
                start = Long.parseLong(startTimeStr);
                intent.putExtra("startTime", start);
            } catch (Exception e) {
                Log.e(TAG, "Parse start time failed", e);
            }
        }

        // 优先在内存中直接更新状态，避免因为应用在后台而被 Android 系统限制 startForegroundService 导致更新失败
        if (FloatingWindowService.updateFocusStateIfRunning(icon, isFocusing, start, sessionId)) {
            Log.d(TAG, "✅ Updated floating window state via direct memory call");
            call.resolve();
            return;
        }

        if (!isFocusing) {
            Log.d(TAG, "Floating window service is not running; ignored idle update without starting service");
            call.resolve();
            return;
        }

        try {
            startFloatingWindowService(context, intent);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to update floating window", e);
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void stopFloatingWindow(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, FloatingWindowService.class);
        context.stopService(intent);
        Log.d(TAG, "✅ Stopped floating window service");
        call.resolve();
    }

    @PluginMethod
    public void syncActiveSessions(PluginCall call) {
        UnifiedServiceNotificationManager.setActiveFocusSessions(getContext(), call.getArray("sessions"));
        UnifiedServiceNotificationManager.reconcileNotificationState(getContext());
        call.resolve();
    }

    @PluginMethod
    public void consumePendingStopRequest(PluginCall call) {
        JSObject ret = new JSObject();
        org.json.JSONObject payload = FocusNotificationPendingStopStore.consume(getContext());
        if (payload == null) {
            ret.put("hasPending", false);
            call.resolve(ret);
            return;
        }

        ret.put("hasPending", true);
        if (!payload.isNull("sessionId")) {
            ret.put("sessionId", payload.optString("sessionId", null));
        } else {
            ret.put("sessionId", JSObject.NULL);
        }
        ret.put("stoppedAt", payload.optLong("stoppedAt", 0L));
        call.resolve(ret);
    }

    private void startFloatingWindowService(Context context, Intent intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
            return;
        }

        context.startService(intent);
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        boolean granted = areNotificationsEnabled();
        if (!granted) {
            openNotificationSettings();
        }

        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    private boolean areNotificationsEnabled() {
        return NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
    }

    private void openNotificationSettings() {
        Intent intent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        } else {
            intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        }

        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
    }
}
