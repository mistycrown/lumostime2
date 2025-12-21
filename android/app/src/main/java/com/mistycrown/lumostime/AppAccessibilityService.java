package com.mistycrown.lumostime;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import java.util.List;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;

public class AppAccessibilityService extends AccessibilityService {
    private static final String TAG = "AppAccessibilityService";
    private String lastPackageName = "";
    private Handler handler;

    @Override
    public void onServiceConnected() {
        super.onServiceConnected();
        handler = new Handler(Looper.getMainLooper());

        AccessibilityServiceInfo info = new AccessibilityServiceInfo();
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED;
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
        info.flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS;
        info.notificationTimeout = 100;

        setServiceInfo(info);
        Log.i(TAG, "AccessibilityService connected and configured");
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            if (event.getPackageName() != null) {
                String currentPackage = event.getPackageName().toString();

                // Ignore if same as last detected app
                if (currentPackage.equals(lastPackageName)) {
                    return;
                }

                // Filter out system/background apps (ignore apps without launch intent)
                if (!isInterestingApp(currentPackage)) {
                    Log.d(TAG, "Ignored non-launchable app: " + currentPackage);
                    return;
                }

                Log.i(TAG, "===== APP SWITCHED: " + lastPackageName + " -> " + currentPackage + " =====");
                lastPackageName = currentPackage;

                // Get app label
                String appLabel = currentPackage;
                try {
                    PackageManager pm = getPackageManager();
                    appLabel = pm.getApplicationLabel(pm.getApplicationInfo(currentPackage, 0)).toString();
                } catch (Exception e) {
                    Log.w(TAG, "Could not get app label for " + currentPackage);
                }

                // Toast notification removed
                // String finalAppLabel = appLabel;
                // handler.post(() -> { ... });

                // Update FloatingWindowService directly via static method
                Log.i(TAG, "📤 Calling FloatingWindowService.updateCurrentApp");
                FloatingWindowService.updateCurrentApp(currentPackage, appLabel);

                // Also update AppUsagePlugin for frontend access
                AppUsagePlugin.updateCurrentPackage(currentPackage);

                Log.i(TAG, "📤 Call completed");
            }
        }
    }

    @Override
    public void onInterrupt() {
        Log.w(TAG, "AccessibilityService interrupted");
    }

    private boolean isInterestingApp(String packageName) {
        try {
            PackageManager pm = getPackageManager();

            // 1. Check if it's a Home app (Launcher)
            // System launchers should be recorded as they signify end of app usage
            Intent homeIntent = new Intent(Intent.ACTION_MAIN);
            homeIntent.addCategory(Intent.CATEGORY_HOME);

            // Check default launcher
            ResolveInfo defaultLauncher = pm.resolveActivity(homeIntent, PackageManager.MATCH_DEFAULT_ONLY);
            if (defaultLauncher != null && packageName.equals(defaultLauncher.activityInfo.packageName)) {
                return true;
            }

            // Comprehensive check for any home activity
            List<ResolveInfo> homeActivities = pm.queryIntentActivities(homeIntent, PackageManager.MATCH_DEFAULT_ONLY);
            for (ResolveInfo info : homeActivities) {
                if (packageName.equals(info.activityInfo.packageName)) {
                    return true;
                }
            }

            // 2. Filter out Input Methods (IMEs)
            // Even if they have a launcher icon (like settings), we don't want to track
            // them as active apps
            android.view.inputmethod.InputMethodManager imm = (android.view.inputmethod.InputMethodManager) getSystemService(
                    INPUT_METHOD_SERVICE);
            java.util.List<android.view.inputmethod.InputMethodInfo> inputMethods = imm.getInputMethodList();
            for (android.view.inputmethod.InputMethodInfo imi : inputMethods) {
                if (packageName.equals(imi.getPackageName())) {
                    return false;
                }
            }

            // 3. Apps that can be launched by user (have a launcher icon)
            Intent launchIntent = pm.getLaunchIntentForPackage(packageName);
            return launchIntent != null;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.i(TAG, "AccessibilityService destroyed");
    }
}
