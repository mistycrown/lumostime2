package com.lumostime.app;

import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

@CapacitorPlugin(name = "AppLauncher")
public class AppLauncherPlugin extends Plugin {

    @PluginMethod
    public void getInstalledApps(PluginCall call) {
        try {
            PackageManager pm = getContext().getPackageManager();
            Intent mainIntent = new Intent(Intent.ACTION_MAIN, null);
            mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);
            
            List<ResolveInfo> resolveInfoList = pm.queryIntentActivities(mainIntent, 0);
            List<JSObject> appList = new ArrayList<>();
            
            for (ResolveInfo resolveInfo : resolveInfoList) {
                String packageName = resolveInfo.activityInfo.packageName;
                
                // 跳过系统应用（可选）
                // ApplicationInfo appInfo = pm.getApplicationInfo(packageName, 0);
                // if ((appInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0) {
                //     continue;
                // }
                
                JSObject appObj = new JSObject();
                appObj.put("packageName", packageName);
                appObj.put("appName", resolveInfo.loadLabel(pm).toString());
                
                // 获取应用图标（可选，转为Base64）
                try {
                    Drawable icon = resolveInfo.loadIcon(pm);
                    String iconBase64 = drawableToBase64(icon);
                    appObj.put("icon", "data:image/png;base64," + iconBase64);
                } catch (Exception e) {
                    appObj.put("icon", "");
                }
                
                appList.add(appObj);
            }
            
            // 按应用名称排序
            Collections.sort(appList, new Comparator<JSObject>() {
                @Override
                public int compare(JSObject o1, JSObject o2) {
                    try {
                        String name1 = o1.getString("appName");
                        String name2 = o2.getString("appName");
                        return name1.compareTo(name2);
                    } catch (Exception e) {
                        return 0;
                    }
                }
            });
            
            JSObject result = new JSObject();
            JSArray apps = new JSArray();
            for (JSObject app : appList) {
                apps.put(app);
            }
            result.put("apps", apps);
            
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get installed apps", e);
        }
    }

    @PluginMethod
    public void launchApp(PluginCall call) {
        String packageName = call.getString("packageName");
        
        if (packageName == null || packageName.isEmpty()) {
            call.reject("Package name is required");
            return;
        }
        
        try {
            PackageManager pm = getContext().getPackageManager();
            Intent launchIntent = pm.getLaunchIntentForPackage(packageName);
            
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(launchIntent);
                
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            } else {
                JSObject result = new JSObject();
                result.put("success", false);
                call.resolve(result);
            }
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            call.resolve(result);
        }
    }

    @PluginMethod
    public void canLaunchApp(PluginCall call) {
        String packageName = call.getString("packageName");
        
        if (packageName == null || packageName.isEmpty()) {
            call.reject("Package name is required");
            return;
        }
        
        try {
            PackageManager pm = getContext().getPackageManager();
            Intent launchIntent = pm.getLaunchIntentForPackage(packageName);
            
            JSObject result = new JSObject();
            result.put("canLaunch", launchIntent != null);
            call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("canLaunch", false);
            call.resolve(result);
        }
    }

    /**
     * 将Drawable转换为Base64字符串
     */
    private String drawableToBase64(Drawable drawable) {
        Bitmap bitmap;
        
        if (drawable instanceof BitmapDrawable) {
            bitmap = ((BitmapDrawable) drawable).getBitmap();
        } else {
            // 创建一个新的Bitmap
            bitmap = Bitmap.createBitmap(
                drawable.getIntrinsicWidth(),
                drawable.getIntrinsicHeight(),
                Bitmap.Config.ARGB_8888
            );
            Canvas canvas = new Canvas(bitmap);
            drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
            drawable.draw(canvas);
        }
        
        // 压缩为PNG并转为Base64
        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, byteArrayOutputStream);
        byte[] byteArray = byteArrayOutputStream.toByteArray();
        return Base64.encodeToString(byteArray, Base64.NO_WRAP);
    }
}
