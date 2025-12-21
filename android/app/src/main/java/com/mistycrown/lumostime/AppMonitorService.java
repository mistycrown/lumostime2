package com.mistycrown.lumostime;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import java.util.List;
import java.util.Map;

public class AppMonitorService extends Service {
    private static final String TAG = "AppMonitorService";
    private static final String CHANNEL_ID = "app_monitor_channel";
    private static final int NOTIFICATION_ID = 2001;
    private static final int CHECK_INTERVAL = 1000; // 1 second for faster detection

    private Handler handler;
    private Runnable checkRunnable;
    private boolean isRunning = false;
    private String lastPackageName = "";
    private UsageStatsManager usageStatsManager;
    private SharedPreferences prefs;

    private android.os.PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        usageStatsManager = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
        prefs = getSharedPreferences("AppUsageRules", Context.MODE_PRIVATE);
        handler = new Handler(Looper.getMainLooper());

        // Acquire WakeLock to ensure service runs even when screen is off/doze
        try {
            android.os.PowerManager powerManager = (android.os.PowerManager) getSystemService(POWER_SERVICE);
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK,
                        "LumosTime:MonitorWakeLock");
                wakeLock.setReferenceCounted(false);
                wakeLock.acquire(); // No timeout - will release on service destroy
            }
        } catch (Exception e) {
            Log.e(TAG, "Error acquiring WakeLock", e);
        }

        checkRunnable = new Runnable() {
            @Override
            public void run() {
                if (isRunning) {
                    checkForegroundApp();
                    handler.postDelayed(this, CHECK_INTERVAL);
                }
            }
        };
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (!isRunning) {
            isRunning = true;
            try {
                if (wakeLock != null && !wakeLock.isHeld()) {
                    wakeLock.acquire();
                }
            } catch (Exception e) {
                Log.e(TAG, "WakeLock acquire failed", e);
            }

            // Initialize lastPackageName to current app to avoid triggering on service
            // start
            // Get current foreground app
            long time = System.currentTimeMillis();
            UsageEvents events = usageStatsManager.queryEvents(time - 5000, time);
            if (events != null) {
                UsageEvents.Event event = new UsageEvents.Event();
                long lastTime = 0;
                while (events.hasNextEvent()) {
                    events.getNextEvent(event);
                    if (event.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND
                            && event.getTimeStamp() > lastTime) {
                        lastTime = event.getTimeStamp();
                        lastPackageName = event.getPackageName();
                    }
                }
            }
            Log.i(TAG, "Service started, initial app: " + lastPackageName);

            startForeground(NOTIFICATION_ID, createNotification("LumosTime 正在自动记录中..."));
            handler.post(checkRunnable);
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        isRunning = false;
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception e) {
            Log.e(TAG, "WakeLock release failed", e);
        }
        handler.removeCallbacks(checkRunnable);
        stopForeground(true);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void checkForegroundApp() {
        String currentPackage = null;
        long time = System.currentTimeMillis();

        // Use queryEvents to get the most recent MOVE_TO_FOREGROUND event
        // This is the most reliable way to detect app switches
        long startTime = time - 3000; // Look back 3 seconds (we poll every 1 second now)

        Log.d(TAG, "checkForegroundApp() called, querying events from " + startTime + " to " + time);

        UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, time);
        if (usageEvents == null) {
            Log.e(TAG, "usageEvents is null - PERMISSION NOT GRANTED!");
            return;
        }

        UsageEvents.Event event = new UsageEvents.Event();
        long lastTimestamp = 0;
        int eventCount = 0;
        int foregroundEventCount = 0;

        while (usageEvents.hasNextEvent()) {
            usageEvents.getNextEvent(event);
            eventCount++;
            if (event.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                foregroundEventCount++;
                Log.d(TAG, "Found MOVE_TO_FOREGROUND event: " + event.getPackageName() + " at " + event.getTimeStamp());
                if (event.getTimeStamp() > lastTimestamp) {
                    lastTimestamp = event.getTimeStamp();
                    currentPackage = event.getPackageName();
                }
            }
        }

        Log.d(TAG, "Total events: " + eventCount + ", Foreground events: " + foregroundEventCount);

        // If no MOVE_TO_FOREGROUND event found, try queryUsageStats as fallback
        // to get the app with most recent usage
        if (currentPackage == null) {
            Log.d(TAG, "No MOVE_TO_FOREGROUND events found, trying queryUsageStats fallback");
            List<android.app.usage.UsageStats> stats = usageStatsManager.queryUsageStats(
                    UsageStatsManager.INTERVAL_BEST, time - 3000, time);

            if (stats != null && !stats.isEmpty()) {
                Log.d(TAG, "queryUsageStats returned " + stats.size() + " apps");
                android.app.usage.UsageStats mostRecent = null;
                for (android.app.usage.UsageStats usageStats : stats) {
                    if (mostRecent == null || usageStats.getLastTimeUsed() > mostRecent.getLastTimeUsed()) {
                        mostRecent = usageStats;
                    }
                }
                if (mostRecent != null) {
                    currentPackage = mostRecent.getPackageName();
                    Log.d(TAG, "Most recent app from stats: " + currentPackage);
                }
            } else {
                Log.w(TAG, "queryUsageStats returned null or empty");
            }
        }

        Log.d(TAG, "Current package: " + currentPackage + ", Last package: " + lastPackageName);

        if (currentPackage != null && !currentPackage.equals(lastPackageName)) {
            // App Changed
            Log.i(TAG, "===== APP CHANGED: " + lastPackageName + " -> " + currentPackage + " =====");
            lastPackageName = currentPackage;

            // Check if this app is in our rules
            String appLabel = currentPackage;
            try {
                PackageManager pm = getPackageManager();
                appLabel = pm.getApplicationLabel(pm.getApplicationInfo(currentPackage, 0)).toString();
            } catch (Exception e) {
                Log.w(TAG, "Could not get app label for " + currentPackage);
            }

            // Send notification
            updateNotification("检测到应用: " + appLabel);

            // Update Floating Window
            FloatingWindowService.updateCurrentApp(currentPackage, appLabel);
            // Update Plugin State
            AppUsagePlugin.updateCurrentPackage(currentPackage);

            // Show Toast
            String finalAppLabel = appLabel;
            handler.post(() -> {
                android.widget.Toast
                        .makeText(getApplicationContext(), "检测到切换: " + finalAppLabel, android.widget.Toast.LENGTH_SHORT)
                        .show();
            });
        } else if (currentPackage == null) {
            Log.w(TAG, "Could not determine current package!");
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "自动记录服务",
                    NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("后台监测应用运行状态");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification(String contentText) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent,
                PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("LumosTime")
                .setContentText(contentText)
                .setSmallIcon(android.R.drawable.ic_menu_recent_history) // Use a system icon or app icon
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    private void updateNotification(String text) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, createNotification(text));
        }
    }
}
