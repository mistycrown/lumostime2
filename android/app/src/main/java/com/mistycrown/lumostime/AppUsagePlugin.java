package com.mistycrown.lumostime;

import android.app.AppOpsManager;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.provider.Settings;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.util.Base64;
import com.getcapacitor.JSArray;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;
import org.json.JSONException;
import org.json.JSONObject;
import android.text.TextUtils;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.view.accessibility.AccessibilityManager;

@CapacitorPlugin(name = "AppUsage")
public class AppUsagePlugin extends Plugin {
    // Real-time package name from AccessibilityService
    private static String currentRealtimePackage = null;

    public static void updateCurrentPackage(String packageName) {
        currentRealtimePackage = packageName;
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        // Redirect to Accessibility Check
        boolean granted = isAccessibilityServiceEnabled();
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        // Redirect to Accessibility Settings
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void checkAccessibilityPermission(PluginCall call) {
        boolean granted = isAccessibilityServiceEnabled();
        JSObject ret = new JSObject();
        ret.put("granted", granted);
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
        // Check screen state first
        android.os.PowerManager pm = (android.os.PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        if (pm != null && !pm.isInteractive()) {
            JSObject ret = new JSObject();
            ret.put("packageName", "SCREEN_OFF");
            call.resolve(ret);
            return;
        }

        // Only use real-time data from AccessibilityService
        if (currentRealtimePackage != null) {
            JSObject ret = new JSObject();
            ret.put("packageName", currentRealtimePackage);
            call.resolve(ret);
            return;
        }

        // If Accessibility not running or no data yet
        JSObject ret = new JSObject();
        ret.put("packageName", "");
        call.resolve(ret);
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
        if (packageName == null || activityId == null) {
            call.reject("Missing packageName or activityId");
            return;
        }

        android.content.SharedPreferences prefs = getContext().getSharedPreferences("AppUsageRules",
                Context.MODE_PRIVATE);
        prefs.edit().putString(packageName, activityId).apply();
        call.resolve();
    }

    @PluginMethod
    public void removeAppRule(PluginCall call) {
        String packageName = call.getString("packageName");
        if (packageName == null) {
            call.reject("Missing packageName");
            return;
        }

        android.content.SharedPreferences prefs = getContext().getSharedPreferences("AppUsageRules",
                Context.MODE_PRIVATE);
        prefs.edit().remove(packageName).apply();
        call.resolve();
    }

    @PluginMethod
    public void getAppRules(PluginCall call) {
        android.content.SharedPreferences prefs = getContext().getSharedPreferences("AppUsageRules",
                Context.MODE_PRIVATE);
        Map<String, ?> all = prefs.getAll();
        JSObject rules = new JSObject();
        for (Map.Entry<String, ?> entry : all.entrySet()) {
            if (entry.getValue() instanceof String) {
                rules.put(entry.getKey(), entry.getValue());
            }
        }
        call.resolve(new JSObject().put("rules", rules));
    }

    private String drawableToBase64(Drawable drawable) {
        Bitmap bitmap;
        if (drawable instanceof BitmapDrawable) {
            bitmap = ((BitmapDrawable) drawable).getBitmap();
        } else {
            int width = drawable.getIntrinsicWidth();
            int height = drawable.getIntrinsicHeight();
            if (width <= 0)
                width = 96;
            if (height <= 0)
                height = 96;

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
        // Deprecated/Removed functionality - just resolve or reject
        call.resolve();
    }

    @PluginMethod
    public void stopMonitor(PluginCall call) {
        // Deprecated/Removed functionality
        call.resolve();
    }

    @PluginMethod
    public void showFloatingText(PluginCall call) {
        String text = call.getString("text");
        if (text == null) {
            call.reject("Missing text");
            return;
        }

        try {
            FloatingWindowService.showTempText(text);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to show text", e);
        }
    }

    @PluginMethod
    public void setSwitchPending(PluginCall call) {
        Boolean pending = call.getBoolean("pending");
        if (pending == null)
            pending = false;
        FloatingWindowService.setSwitchingPending(pending);
        call.resolve();
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
