package com.mistycrown.lumostime;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import androidx.core.app.NotificationCompat;

/**
 * 专注通知前台服务
 * 显示持续的通知，展示当前专注任务和计时
 * 使用 setUsesChronometer 实现系统原生低功耗计时
 */
public class FocusNotificationService extends Service {

    private static final String TAG = "FocusNotifService";
    private static final String CHANNEL_ID = "focus_notification_channel";
    private static final int NOTIFICATION_ID = 1001;

    private String taskName = "专注中";
    private long startTime = 0;
    private NotificationManager notificationManager;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "📱 Service onCreate 被调用");
        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "🚀 Service onStartCommand 被调用");
        if (intent != null) {
            String newTaskName = intent.getStringExtra("taskName");
            if (newTaskName != null) {
                taskName = newTaskName;
            }
            // 每次启动服务时重置开始时间为当前时间
            // 如果需要精确同步React端时间，可以通过Intent传递startTime，但通常误差在几十毫秒内可忽略
            startTime = System.currentTimeMillis();
            Log.d(TAG, "📝 任务名: " + taskName);
        }

        try {
            // 启动前台服务
            startForeground(NOTIFICATION_ID, createNotification());
            Log.d(TAG, "✅ 前台服务已启动，通知ID: " + NOTIFICATION_ID);
        } catch (Exception e) {
            Log.e(TAG, "❌ 启动前台服务失败", e);
        }

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "🛑 Service onDestroy 被调用，正在移除通知");

        // 显式停止前台服务并移除通知
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }

        // 双重保险：取消通知
        if (notificationManager != null) {
            notificationManager.cancel(NOTIFICATION_ID);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    /**
     * 创建通知渠道（Android 8.0+）
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "专注计时通知",
                    NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription("显示当前专注任务和计时");
            channel.setShowBadge(false);
            notificationManager.createNotificationChannel(channel);
        }
    }

    /**
     * 创建通知
     */
    private Notification createNotification() {
        // 点击通知打开应用
        Intent notificationIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                notificationIntent,
                PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(taskName)
                .setContentText("专注进行中...")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_PROGRESS)
                // 关键优化：使用系统计时器，省电且无需频繁更新
                .setUsesChronometer(true)
                .setWhen(startTime);

        return builder.build();
    }
}
