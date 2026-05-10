/**
 * @file FocusNotificationService.java
 * @input Shared notification-state snapshots from the FocusNotification plugin and widget runtime storage
 * @output Dedicated Android foreground-service owner for focus-only persistent notifications
 * @pos Native Service
 * @description Keeps the shared LumosTime runtime notification alive when active focus timers exist without the floating window or assistant agent foreground services, and refreshes timer durations once per second.
 * @updated 2026-05-09: Added a dedicated focus-only foreground service so active timers can keep the shared persistent notification visible and ticking even when no other native foreground service is active.
 */
package com.mistycrown.lumostime;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

public class FocusNotificationService extends Service {
    private static final long REFRESH_INTERVAL_MS = 1000L;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable refreshRunnable = new Runnable() {
        @Override
        public void run() {
            if (!UnifiedServiceNotificationManager.shouldRunDedicatedFocusService(FocusNotificationService.this)) {
                stopSelf();
                return;
            }

            UnifiedServiceNotificationManager.refreshStatusNotification(FocusNotificationService.this);
            handler.postDelayed(this, REFRESH_INTERVAL_MS);
        }
    };

    public static void sync(Context context) {
        if (context == null) {
            return;
        }

        Intent intent = new Intent(context, FocusNotificationService.class);
        if (UnifiedServiceNotificationManager.shouldRunDedicatedFocusService(context)) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
            return;
        }

        context.stopService(intent);
    }

    @Override
    public void onCreate() {
        super.onCreate();
        UnifiedServiceNotificationManager.startForeground(this);
        scheduleRefresh();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (!UnifiedServiceNotificationManager.shouldRunDedicatedFocusService(this)) {
            stopForeground(false);
            stopSelf();
            return START_NOT_STICKY;
        }

        UnifiedServiceNotificationManager.refreshStatusNotification(this);
        scheduleRefresh();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(refreshRunnable);
        stopForeground(false);
        UnifiedServiceNotificationManager.refreshStatusNotification(this);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void scheduleRefresh() {
        handler.removeCallbacks(refreshRunnable);
        handler.postDelayed(refreshRunnable, REFRESH_INTERVAL_MS);
    }
}
