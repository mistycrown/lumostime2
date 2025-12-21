package com.mistycrown.lumostime;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.pm.PackageManager;
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

                // Show Toast notification
                String finalAppLabel = appLabel;
                handler.post(() -> {
                    android.widget.Toast.makeText(
                            getApplicationContext(),
                            "检测到切换: " + finalAppLabel,
                            android.widget.Toast.LENGTH_SHORT).show();
                });
            }
        }
    }

    @Override
    public void onInterrupt() {
        Log.w(TAG, "AccessibilityService interrupted");
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.i(TAG, "AccessibilityService destroyed");
    }
}
