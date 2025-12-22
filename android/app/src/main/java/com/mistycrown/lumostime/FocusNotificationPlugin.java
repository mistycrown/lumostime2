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
    private static FocusNotificationPlugin instance = null;

    @Override
    public void load() {
        super.load();
        instance = this;
        Log.d(TAG, "✅ FocusNotificationPlugin loaded, instance saved");
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        instance = null;
        Log.d(TAG, "🔴 FocusNotificationPlugin destroyed, instance cleared");
    }

    /**
     * 静态方法: 从悬浮球触发结束计时事件
     * 供FloatingWindowService调用
     */
    public static void triggerStopFocusFromFloating() {
        if (instance != null && instance.getBridge() != null) {
            Log.d(TAG, "📤 触发停止计时事件到React Native");
            instance.getBridge().triggerWindowJSEvent("stopFocusFromFloating", "{}");
        } else {
            Log.w(TAG, "⚠️ 无法触发事件: Plugin instance或Bridge为null");
        }
    }

    /**
     * 静态方法: 从悬浮球触发开始计时事件(提醒模式)
     */
    public static void triggerStartFocusFromPrompt(String packageName, String appLabel, String realAppName) {
        if (instance != null && instance.getBridge() != null) {
            Log.d(TAG, "📤 触发开始计时事件到React Native: " + packageName);
            String jsonData = String.format("{\"packageName\":\"%s\",\"appLabel\":\"%s\",\"realAppName\":\"%s\"}",
                    packageName.replace("\"", "\\\""),
                    appLabel.replace("\"", "\\\""),
                    realAppName.replace("\"", "\\\""));
            instance.getBridge().triggerWindowJSEvent("startFocusFromPrompt", jsonData);
        } else {
            Log.w(TAG, "⚠️ 无法触发事件: Plugin instance或Bridge为null");
        }
    }

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
     * 停止专注通知
     */
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

    // --- 悬浮窗相关方法 ---

    /**
     * 检查是否有悬浮窗权限
     */
    @PluginMethod
    public void checkFloatingPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            boolean granted = android.provider.Settings.canDrawOverlays(getContext());
            com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
            ret.put("granted", granted);
            call.resolve(ret);
        } else {
            com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        }
    }

    /**
     * 请求悬浮窗权限
     */
    @PluginMethod
    public void requestFloatingPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!android.provider.Settings.canDrawOverlays(getContext())) {
                Intent intent = new Intent(android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        android.net.Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
        }
        call.resolve();
    }

    /**
     * 启动悬浮窗
     */
    @PluginMethod
    public void startFloatingWindow(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, FloatingWindowService.class);
        // 可以传递初始参数
        String icon = call.getString("icon");
        boolean isFocusing = call.getBoolean("isFocusing", false);
        Double startTime = call.getDouble("startTime"); // JS timestamp

        if (icon != null)
            intent.putExtra("icon", icon);
        intent.putExtra("isFocusing", isFocusing);
        if (startTime != null)
            intent.putExtra("startTime", startTime.longValue());

        try {
            context.startService(intent);
            Log.d(TAG, "✅ 启动悬浮窗服务");
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "❌ 启动悬浮窗服务失败", e);
            call.reject(e.getMessage());
        }
    }

    /**
     * 更新悬浮窗内容
     */
    @PluginMethod
    public void updateFloatingWindow(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, FloatingWindowService.class);
        String icon = call.getString("icon");
        boolean isFocusing = call.getBoolean("isFocusing", false);
        String startTimeStr = call.getString("startTime");

        Log.d(TAG,
                "📡 Plugin updateFloatingWindow: focus=" + isFocusing + ", start=" + startTimeStr + ", icon=" + icon);

        intent.putExtra("icon", icon);
        intent.putExtra("isFocusing", isFocusing);
        if (startTimeStr != null) {
            try {
                long start = Long.parseLong(startTimeStr);
                intent.putExtra("startTime", start);
            } catch (Exception e) {
                Log.e(TAG, "Parse start time failed", e);
            }
        }

        try {
            context.startService(intent);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "❌ 更新悬浮窗失败", e);
            call.reject(e.getMessage());
        }
    }

    /**
     * 停止悬浮窗
     */
    @PluginMethod
    public void stopFloatingWindow(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, FloatingWindowService.class);
        context.stopService(intent);
        Log.d(TAG, "✅ 停止悬浮窗服务");
        call.resolve();
    }
}
