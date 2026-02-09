package com.mistycrown.lumostime;

import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Arrays;
import java.util.List;

@CapacitorPlugin(name = "IconPlugin")
public class IconPlugin extends Plugin {

    // 定义可用的图标别名
    private static final List<String> AVAILABLE_ICONS = Arrays.asList(
        "default",
        "neon", 
        "paper",
        "pixel",
        "sketch",
        "art-deco",
        "blueprint", 
        "chalkboard",
        "christmas",
        "embroidery",
        "graffiti",
        "lego",
        "origami",
        "pointillism",
        "pop-art",
        "stained-glass",
        "ukiyo-e",
        "simple",
        "cat",
        "fox",
        "frog",
        "panda",
        "heart",
        "moon",
        "mushroom",
        "plant",
        "sea",
        "knot",
        "bijiaso",
        "cdqm",
        "ciww",
        "uvcd",
        "wjugjp"
    );

    // 图标别名到Activity别名的映射
    private String getActivityAlias(String iconId) {
        switch (iconId) {
            case "default":
                return "com.mistycrown.lumostime.MainActivityDefault";
            case "neon":
                return "com.mistycrown.lumostime.MainActivityNeon";
            case "paper":
                return "com.mistycrown.lumostime.MainActivityPaper";
            case "pixel":
                return "com.mistycrown.lumostime.MainActivityPixel";
            case "sketch":
                return "com.mistycrown.lumostime.MainActivitySketch";
            case "art-deco":
                return "com.mistycrown.lumostime.MainActivityArtDeco";
            case "blueprint":
                return "com.mistycrown.lumostime.MainActivityBlueprint";
            case "chalkboard":
                return "com.mistycrown.lumostime.MainActivityChalkboard";
            case "christmas":
                return "com.mistycrown.lumostime.MainActivityChristmas";
            case "embroidery":
                return "com.mistycrown.lumostime.MainActivityEmbroidery";
            case "graffiti":
                return "com.mistycrown.lumostime.MainActivityGraffiti";
            case "lego":
                return "com.mistycrown.lumostime.MainActivityLego";
            case "origami":
                return "com.mistycrown.lumostime.MainActivityOrigami";
            case "pointillism":
                return "com.mistycrown.lumostime.MainActivityPointillism";
            case "pop-art":
                return "com.mistycrown.lumostime.MainActivityPopArt";
            case "stained-glass":
                return "com.mistycrown.lumostime.MainActivityStainedGlass";
            case "ukiyo-e":
                return "com.mistycrown.lumostime.MainActivityUkiyoE";
            case "simple":
                return "com.mistycrown.lumostime.MainActivitySimple";
            case "cat":
                return "com.mistycrown.lumostime.MainActivityCat";
            case "fox":
                return "com.mistycrown.lumostime.MainActivityFox";
            case "frog":
                return "com.mistycrown.lumostime.MainActivityFrog";
            case "panda":
                return "com.mistycrown.lumostime.MainActivityPanda";
            case "heart":
                return "com.mistycrown.lumostime.MainActivityHeart";
            case "moon":
                return "com.mistycrown.lumostime.MainActivityMoon";
            case "mushroom":
                return "com.mistycrown.lumostime.MainActivityMushroom";
            case "plant":
                return "com.mistycrown.lumostime.MainActivityPlant";
            case "sea":
                return "com.mistycrown.lumostime.MainActivitySea";
            case "knot":
                return "com.mistycrown.lumostime.MainActivityKnot";
            case "bijiaso":
                return "com.mistycrown.lumostime.MainActivityBijiaso";
            case "cdqm":
                return "com.mistycrown.lumostime.MainActivityCdqm";
            case "ciww":
                return "com.mistycrown.lumostime.MainActivityCiww";
            case "uvcd":
                return "com.mistycrown.lumostime.MainActivityUvcd";
            case "wjugjp":
                return "com.mistycrown.lumostime.MainActivityWjugjp";
            default:
                return "com.mistycrown.lumostime.MainActivityDefault";
        }
    }

    @PluginMethod
    public void setIcon(PluginCall call) {
        String iconId = call.getString("iconId", "default");
        
        if (!AVAILABLE_ICONS.contains(iconId)) {
            call.reject("无效的图标ID: " + iconId);
            return;
        }

        try {
            PackageManager packageManager = getContext().getPackageManager();
            String packageName = getContext().getPackageName();
            
            // 1. 处理主 MainActivity（默认图标）
            ComponentName mainActivity = new ComponentName(packageName, 
                "com.mistycrown.lumostime.MainActivity");
            
            // 重要修复：主 Activity 始终保持启用状态，只控制 alias 的显示
            // 这样可以避免重新安装时找不到 MainActivity 的问题
            
            if (iconId.equals("default")) {
                // 选择默认图标：确保主 Activity 启用，禁用所有 alias
                packageManager.setComponentEnabledSetting(
                    mainActivity,
                    PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                    PackageManager.DONT_KILL_APP
                );
                
                // 禁用所有 alias
                for (String availableIcon : AVAILABLE_ICONS) {
                    if (availableIcon.equals("default")) continue;
                    
                    String activityAlias = getActivityAlias(availableIcon);
                    ComponentName componentName = new ComponentName(packageName, activityAlias);
                    packageManager.setComponentEnabledSetting(
                        componentName,
                        PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                        PackageManager.DONT_KILL_APP
                    );
                }
            } else {
                // 选择其他图标：保持主 Activity 启用但隐藏，启用对应的 alias
                // 注意：这里不禁用主 Activity，而是让 alias 优先显示
                packageManager.setComponentEnabledSetting(
                    mainActivity,
                    PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                    PackageManager.DONT_KILL_APP
                );
                
                // 处理所有 alias
                for (String availableIcon : AVAILABLE_ICONS) {
                    if (availableIcon.equals("default")) continue;
                    
                    String activityAlias = getActivityAlias(availableIcon);
                    ComponentName componentName = new ComponentName(packageName, activityAlias);
                    
                    int newState = availableIcon.equals(iconId) ? 
                        PackageManager.COMPONENT_ENABLED_STATE_ENABLED : 
                        PackageManager.COMPONENT_ENABLED_STATE_DISABLED;
                        
                    packageManager.setComponentEnabledSetting(
                        componentName,
                        newState,
                        PackageManager.DONT_KILL_APP
                    );
                }
            }
            
            // 保存当前图标设置
            getContext().getSharedPreferences("lumos_settings", 0)
                .edit()
                .putString("current_icon", iconId)
                .apply();
            
            // 延迟刷新启动器，确保系统有时间处理组件状态变更
            new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                @Override
                public void run() {
                    refreshLauncher();
                }
            }, 1000); // 延迟1秒
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("message", "图标已更新为: " + iconId + "，启动器将在几秒内刷新");
            call.resolve(result);
            
        } catch (Exception e) {
            call.reject("设置图标失败: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getCurrentIcon(PluginCall call) {
        String currentIcon = getContext().getSharedPreferences("lumos_settings", 0)
            .getString("current_icon", "default");
            
        JSObject result = new JSObject();
        result.put("iconId", currentIcon);
        call.resolve(result);
    }

    @PluginMethod
    public void getAvailableIcons(PluginCall call) {
        JSObject result = new JSObject();
        result.put("icons", AVAILABLE_ICONS);
        call.resolve(result);
    }

    @PluginMethod
    public void initializeIconState(PluginCall call) {
        try {
            // 在应用启动时确保至少有一个入口点是启用的
            String currentIcon = getContext().getSharedPreferences("lumos_settings", 0)
                .getString("current_icon", "default");
            
            PackageManager packageManager = getContext().getPackageManager();
            String packageName = getContext().getPackageName();
            
            // 检查当前设置的图标是否正确启用
            if (currentIcon.equals("default")) {
                // 确保主 Activity 启用
                ComponentName mainActivity = new ComponentName(packageName, 
                    "com.mistycrown.lumostime.MainActivity");
                packageManager.setComponentEnabledSetting(
                    mainActivity,
                    PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                    PackageManager.DONT_KILL_APP
                );
            } else {
                // 确保对应的 alias 启用
                String activityAlias = getActivityAlias(currentIcon);
                ComponentName componentName = new ComponentName(packageName, activityAlias);
                packageManager.setComponentEnabledSetting(
                    componentName,
                    PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                    PackageManager.DONT_KILL_APP
                );
            }
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("currentIcon", currentIcon);
            call.resolve(result);
            
        } catch (Exception e) {
            call.reject("初始化图标状态失败: " + e.getMessage());
        }
    }

    @PluginMethod
    public void refreshLauncher(PluginCall call) {
        refreshLauncher();
        
        JSObject result = new JSObject();
        result.put("success", true);
        result.put("message", "启动器刷新请求已发送");
        call.resolve(result);
    }
    private void refreshLauncher() {
        try {
            // 方法1: 发送启动器刷新广播
            Intent refreshIntent = new Intent("android.intent.action.MAIN");
            refreshIntent.addCategory("android.intent.category.HOME");
            refreshIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            
            // 方法2: 发送包替换广播 (需要权限，可能不会成功)
            try {
                String packageName = getContext().getPackageName();
                Intent packageReplacedIntent = new Intent(Intent.ACTION_PACKAGE_REPLACED);
                packageReplacedIntent.setData(android.net.Uri.parse("package:" + packageName));
                getContext().sendBroadcast(packageReplacedIntent);
            } catch (Exception e) {
                // 忽略权限错误
            }
            
            // 方法3: 创建桌面快捷方式刷新 (Android 8.0+)
            try {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    android.content.pm.ShortcutManager shortcutManager = 
                        getContext().getSystemService(android.content.pm.ShortcutManager.class);
                    if (shortcutManager != null) {
                        // 更新动态快捷方式可能触发启动器刷新
                        shortcutManager.updateShortcuts(java.util.Collections.emptyList());
                    }
                }
            } catch (Exception e) {
                // 忽略错误
            }
            
            // 方法4: 延迟重启应用 (最后手段)
            new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                @Override
                public void run() {
                    try {
                        // 提示用户手动刷新
                        android.widget.Toast.makeText(
                            getContext(), 
                            "图标已更新，如未显示请重启启动器或重启设备", 
                            android.widget.Toast.LENGTH_LONG
                        ).show();
                    } catch (Exception e) {
                        // 忽略错误
                    }
                }
            }, 2000);
            
        } catch (Exception e) {
            // 记录错误但不抛出异常
            android.util.Log.w("IconPlugin", "刷新启动器失败: " + e.getMessage());
        }
    }
}