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
import java.util.Map;

public class AppMonitorService extends Service {
    private static final String TAG = "AppMonitorService";
    private static final String CHANNEL_ID = "app_monitor_channel";
    private static final int NOTIFICATION_ID = 2001;
    private static final int CHECK_INTERVAL = 3000; // 3 seconds

    private Handler handler;
    private Runnable checkRunnable;
    private boolean isRunning = false;
    private String lastPackageName = "";
    private UsageStatsManager usageStatsManager;
    private SharedPreferences prefs;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        usageStatsManager = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
        prefs = getSharedPreferences("AppUsageRules", Context.MODE_PRIVATE);
        handler = new Handler(Looper.getMainLooper());

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
            startForeground(NOTIFICATION_ID, createNotification("LumosTime 正在自动记录中..."));
            handler.post(checkRunnable);
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        isRunning = false;
        handler.removeCallbacks(checkRunnable);
        stopForeground(true);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void checkForegroundApp() {
        long endTime = System.currentTimeMillis();
        long startTime = endTime - 60000; // 60s lookback

        UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
        UsageEvents.Event event = new UsageEvents.Event();
        String currentPackage = null;
        long lastTimestamp = 0;

        while (usageEvents.hasNextEvent()) {
            usageEvents.getNextEvent(event);
            if (event.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                if (event.getTimeStamp() > lastTimestamp) {
                    lastTimestamp = event.getTimeStamp();
                    currentPackage = event.getPackageName();
                }
            }
        }

        if (currentPackage != null && !currentPackage.equals(lastPackageName)) {
            // App Changed
            Log.d(TAG, "App changed from " + lastPackageName + " to " + currentPackage);
            lastPackageName = currentPackage;

            // Check if this app is in our rules
            // Although verifying step 4 just requires notification on change, let's look up
            // label for better UX
            String appLabel = currentPackage;
            try {
                PackageManager pm = getPackageManager();
                appLabel = pm.getApplicationLabel(pm.getApplicationInfo(currentPackage, 0)).toString();
            } catch (Exception e) {
            }

            // Send notification
            // We update the existing notification or send a new one?
            // User requested: "Notify user detected [Package]"
            updateNotification("检测到应用: " + appLabel);
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
