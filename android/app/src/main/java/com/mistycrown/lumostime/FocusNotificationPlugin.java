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

    // Focus Notification Logic Removed as per user request (unified into Automatic
    // Detection)

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
