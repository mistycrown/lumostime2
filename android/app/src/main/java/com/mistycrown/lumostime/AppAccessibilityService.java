/**
 * @file AppAccessibilityService.java
 * @input System Accessibility Events
 * @output Foreground App Change Events
 * @pos Native Service
 * @description Accessibility service detecting foreground app changes and filtering ignored apps before updating the floating window and prompt logic.
 * @updated 2026-09-02: Keeps foreground-app deduplication across workflow cancellation so closing an overlay does not retrigger it while the target app remains foregrounded.
 */
package com.mistycrown.lumostime;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;

import java.util.List;

public class AppAccessibilityService extends AccessibilityService {
    private static final String TAG = "AppAwareness";
    private static AppAccessibilityService instance;

    private String lastPackageName = "";

    @Override
    public void onServiceConnected() {
        super.onServiceConnected();
        instance = this;

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
        if (event.getEventType() != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED || event.getPackageName() == null) {
            return;
        }

        String currentPackage = event.getPackageName().toString();
        boolean isAppAwarenessOverlayShowing = FloatingWindowService.isAppAwarenessOverlayShowing();
        if (currentPackage.equals(lastPackageName)) {
            Log.v(TAG, "Detection skipped: package unchanged=" + currentPackage);
            return;
        }

        if (currentPackage.equals(getPackageName()) && isAppAwarenessOverlayShowing) {
            Log.d(TAG, "Ignoring host-app accessibility event while app-awareness overlay is showing");
            return;
        }

        if (!isInterestingApp(currentPackage)) {
            if (isAppAwarenessOverlayShowing) {
                Log.d(TAG, "Ignoring transient non-launchable window while app-awareness overlay is showing: " + currentPackage);
                return;
            }
            AppUsagePlugin.dismissNativeAppAwarenessOverlay();
            Log.d(TAG, "Ignored non-launchable app: " + currentPackage);
            return;
        }

        String appLabel = currentPackage;
        try {
            PackageManager pm = getPackageManager();
            appLabel = pm.getApplicationLabel(pm.getApplicationInfo(currentPackage, 0)).toString();
        } catch (Exception e) {
            Log.w(TAG, "Could not get app label for " + currentPackage, e);
        }

        // 1. 如果切换回本应用自身，直接更新悬浮窗图标和当前包名，但不触发 triggerAppDetected 提示
        if (currentPackage.equals(getPackageName())) {
            Log.i(TAG, "APP SWITCHED (Self): " + lastPackageName + " -> " + currentPackage);
            lastPackageName = currentPackage;

            AppUsagePlugin.dismissNativeAppAwarenessOverlay();
            FloatingWindowService.updateCurrentApp(currentPackage, appLabel);
            AppUsagePlugin.updateCurrentPackage(currentPackage);
            return;
        }

        // 2. 对于其他应用，按规则检查是否应该忽略
        if (isAppAwarenessOverlayShowing
                && AppUsagePlugin.isLikelyInputMethodPackage(getApplicationContext(), currentPackage, appLabel)) {
            Log.d(TAG, "Ignoring input method while app-awareness overlay is showing: " + currentPackage);
            return;
        }

        if (AppUsagePlugin.shouldIgnoreApp(getApplicationContext(), currentPackage, appLabel)) {
            AppUsagePlugin.dismissNativeAppAwarenessOverlay();
            Log.d(TAG, "Ignored app by default or user rule: " + currentPackage + " / " + appLabel);
            return;
        }

        Log.i(TAG, "Detection accepted: " + lastPackageName + " -> " + currentPackage
                + " (label=" + appLabel + ", overlayShowing=" + isAppAwarenessOverlayShowing + ")");
        lastPackageName = currentPackage;

        FloatingWindowService.updateCurrentApp(currentPackage, appLabel);
        AppUsagePlugin.updateCurrentPackage(currentPackage);
        AppUsagePlugin.triggerAppDetected(currentPackage, appLabel);
    }

    @Override
    public void onInterrupt() {
        Log.w(TAG, "AccessibilityService interrupted");
    }

    private boolean isInterestingApp(String packageName) {
        try {
            PackageManager pm = getPackageManager();

            Intent homeIntent = new Intent(Intent.ACTION_MAIN);
            homeIntent.addCategory(Intent.CATEGORY_HOME);

            ResolveInfo defaultLauncher = pm.resolveActivity(homeIntent, PackageManager.MATCH_DEFAULT_ONLY);
            if (defaultLauncher != null && packageName.equals(defaultLauncher.activityInfo.packageName)) {
                return true;
            }

            List<ResolveInfo> homeActivities = pm.queryIntentActivities(homeIntent, PackageManager.MATCH_DEFAULT_ONLY);
            for (ResolveInfo info : homeActivities) {
                if (packageName.equals(info.activityInfo.packageName)) {
                    return true;
                }
            }

            Intent launchIntent = pm.getLaunchIntentForPackage(packageName);
            return launchIntent != null;
        } catch (Exception e) {
            Log.w(TAG, "Failed to inspect app launchability for " + packageName, e);
            return false;
        }
    }

    @Override
    public void onDestroy() {
        instance = null;
        super.onDestroy();
        Log.i(TAG, "AccessibilityService destroyed");
    }
}
