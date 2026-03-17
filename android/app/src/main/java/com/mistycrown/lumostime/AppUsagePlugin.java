/**
 * @file AppUsagePlugin.java
 * @input JS Plugin Calls
 * @output Native Usage Stats and App Rule State
 * @pos Native Plugin
 * @description Capacitor plugin exposing Android foreground-app access, app association rules, and per-app ignore state to the React application.
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

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@CapacitorPlugin(name = "AppUsage")
public class AppUsagePlugin extends Plugin {
    private static final String TAG = "AppUsagePlugin";
    private static final String PREFS_NAME = "AppUsageRules";
    private static final String RULE_NAME_SUFFIX = "_name";
    private static final String IGNORE_SUFFIX = "_ignore";

    private static String currentRealtimePackage = null;
    private static AppUsagePlugin instance = null;

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
        instance.checkAndShowPrompt(packageName, appLabel);
    }

    private void checkAndShowPrompt(String packageName, String appLabel) {
        try {
            if (shouldIgnoreApp(getContext(), packageName, appLabel)) {
                Log.d(TAG, "Ignoring prompt for app: " + packageName + " / " + appLabel);
                return;
            }

            SharedPreferences prefs = getPrefs(getContext());
            String activityId = prefs.getString(packageName, null);
            String activityName = prefs.getString(packageName + RULE_NAME_SUFFIX, null);

            if (activityId == null || activityId.isEmpty()) {
                Log.d(TAG, "No linked activity for app: " + appLabel);
                return;
            }

            String displayName = (activityName != null && !activityName.isEmpty()) ? activityName : appLabel;
            FloatingWindowService.showPrompt(packageName, displayName, appLabel, activityId);
        } catch (Exception e) {
            Log.e(TAG, "Failed to check and show prompt", e);
        }
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
