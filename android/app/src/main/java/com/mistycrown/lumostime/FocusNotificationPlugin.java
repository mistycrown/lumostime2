package com.mistycrown.lumostime;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;
import androidx.core.content.ContextCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * 专注通知插件
 * 用于在Android设备上显示小米超级岛/常驻通知
 */
@CapacitorPlugin(name = "FocusNotification", permissions = {
        @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications")
})
public class FocusNotificationPlugin extends Plugin {

    private static final String TAG = "FocusNotification";

    /**
     * 启动专注通知
     * 
     * @param call 包含 taskName 参数
     */
    @PluginMethod
    public void startFocusNotification(PluginCall call) {
        String taskName = call.getString("taskName", "专注中");
        Log.d(TAG, "🔔 startFocusNotification 被调用，任务名: " + taskName);

        // 检查通知权限（Android 13+）
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (!hasRequiredPermissions()) {
                Log.w(TAG, "⚠️ 通知权限未授予，请求权限");

                // 保存任务名到call data
                try {
                    call.getData().put("savedTaskName", taskName);
                } catch (Exception e) {
                    Log.e(TAG, "保存taskName失败", e);
                }

                requestAllPermissions(call, "permissionCallback");
                return;
            }
        }

        startForegroundServiceInternal(taskName, call);
    }

    /**
     * 权限请求结果回调
     */
    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(getContext(),
                    Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                Log.e(TAG, "❌ 用户拒绝了通知权限");
                call.reject("通知权限被拒绝");
                return;
            }
        }

        Log.d(TAG, "✅ 通知权限已授予");
        String taskName = call.getData().optString("savedTaskName", "专注中");
        startForegroundServiceInternal(taskName, call);
    }

    /**
     * 实际启动服务的内部方法
     */
    private void startForegroundServiceInternal(String taskName, PluginCall call) {
        Context context = getContext();
        Intent serviceIntent = new Intent(context, FocusNotificationService.class);
        serviceIntent.putExtra("taskName", taskName);

        try {
            // 启动前台服务
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
                Log.d(TAG, "✅ 前台服务启动命令已发送 (API 26+)");
            } else {
                context.startService(serviceIntent);
                Log.d(TAG, "✅ 服务启动命令已发送 (API < 26)");
            }
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "❌ 启动服务失败", e);
            call.reject("启动服务失败: " + e.getMessage());
        }
    }

    /**
     * 更新专注计时
     * 
     * @param call 包含 elapsedSeconds 参数
     */
    @PluginMethod
    public void updateFocusTime(PluginCall call) {
        Integer elapsedSeconds = call.getInt("elapsedSeconds", 0);

        // 发送广播更新通知
        FocusNotificationService.sendUpdateBroadcast(getContext(), elapsedSeconds);

        call.resolve();
    }

    /**
     * 停止专注通知
     */
    @PluginMethod
    public void stopFocusNotification(PluginCall call) {
        Log.d(TAG, "🛑 stopFocusNotification 被调用");

        Context context = getContext();
        Intent serviceIntent = new Intent(context, FocusNotificationService.class);
        context.stopService(serviceIntent);

        Log.d(TAG, "✅ 服务停止命令已发送");
        call.resolve();
    }
}
