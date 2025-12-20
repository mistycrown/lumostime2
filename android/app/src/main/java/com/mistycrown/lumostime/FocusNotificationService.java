package com.mistycrown.lumostime;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import org.json.JSONObject;

/**
 * 专注通知前台服务
 * 显示持续的通知，展示当前专注任务和计时
 */
public class FocusNotificationService extends Service {

    private static final String TAG = "FocusNotifService";
    private static final String CHANNEL_ID = "focus_notification_channel";
    private static final int NOTIFICATION_ID = 1001;
    private static final String ACTION_UPDATE = "com.mistycrown.lumostime.UPDATE_FOCUS_TIME";
    private static final String ACTION_STOP = "com.mistycrown.lumostime.STOP_FOCUS";

    private String taskName = "专注中";
    private int elapsedSeconds = 0;
    private NotificationManager notificationManager;

    // 广播接收器：接收更新时间的指令
    private final BroadcastReceiver updateReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            Log.d(TAG, "📡 收到广播: " + intent.getAction());
            if (ACTION_UPDATE.equals(intent.getAction())) {
                elapsedSeconds = intent.getIntExtra("elapsedSeconds", 0);
                Log.d(TAG, "⏱️ 更新时间: " + elapsedSeconds + "秒 (" + formatTime(elapsedSeconds) + ")");
                updateNotification();
            }
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "📱 Service onCreate 被调用");
        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannel();

        // 注册广播接收器
        IntentFilter filter = new IntentFilter(ACTION_UPDATE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(updateReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(updateReceiver, filter);
        }
        Log.d(TAG, "✅ 广播接收器已注册");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "🚀 Service onStartCommand 被调用");
        if (intent != null) {
            taskName = intent.getStringExtra("taskName");
            if (taskName == null)
                taskName = "专注中";
            elapsedSeconds = 0;
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

        try {
            unregisterReceiver(updateReceiver);
        } catch (Exception e) {
            // 忽略取消注册错误
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
                    NotificationManager.IMPORTANCE_DEFAULT); // 改为DEFAULT确保状态栏显示
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

        // 格式化时间
        String timeText = formatTime(elapsedSeconds);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(taskName)
                .setContentText(timeText)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_PROGRESS);

        // 添加小米超级岛JSON扩展参数
        try {
            JSONObject focusParam = new JSONObject();
            focusParam.put("version", 1);

            // 焦点通知内容
            JSONObject focus = new JSONObject();
            focus.put("title", "正在专注");
            focus.put("content", taskName + " - " + timeText);
            focusParam.put("focus", focus);

            // AOD息屏显示
            JSONObject aod = new JSONObject();
            aod.put("aodTitle", taskName);
            aod.put("aodContent", timeText);
            focusParam.put("aod", aod);

            // 状态栏文案
            focusParam.put("ticker", "LumosTime 正在计时");

            // 将JSON参数添加到通知的extras中
            Bundle extras = new Bundle();
            extras.putString("miui.focus.param", focusParam.toString());
            builder.addExtras(extras);

        } catch (Exception e) {
            // 如果JSON构建失败，忽略错误，降级为普通通知
            e.printStackTrace();
        }

        return builder.build();
    }

    /**
     * 更新通知
     */
    private void updateNotification() {
        notificationManager.notify(NOTIFICATION_ID, createNotification());
    }

    /**
     * 格式化时间为 HH:MM:SS
     */
    private String formatTime(int seconds) {
        int hours = seconds / 3600;
        int minutes = (seconds % 3600) / 60;
        int secs = seconds % 60;
        return String.format("%02d:%02d:%02d", hours, minutes, secs);
    }

    /**
     * 发送更新广播的静态方法
     */
    public static void sendUpdateBroadcast(Context context, int elapsedSeconds) {
        Log.d("FocusNotifService", "📤 发送更新广播: " + elapsedSeconds + "秒");
        Intent intent = new Intent(ACTION_UPDATE);
        // 显式指定接收者组件（解决Android 13+隐式广播限制）
        intent.setPackage(context.getPackageName());
        intent.putExtra("elapsedSeconds", elapsedSeconds);
        context.sendBroadcast(intent);
    }
}
