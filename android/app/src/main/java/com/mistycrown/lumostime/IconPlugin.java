/**
 * IconPlugin.java - 动态图标切换插件
 * 
 * 功能：允许用户在应用内切换桌面图标样式
 * 
 * 实现方案：
 * - 所有图标（包括默认图标）都对应一个 activity-alias
 * - MainActivity 只负责承载应用逻辑，不作为启动器入口
 * - 图标切换只在 alias 之间进行（启用目标 alias，禁用其他 alias）
 * - MainActivity 状态永远不变，避免覆盖安装时报错
 * 
 * 更新日期：2026-02-09
 */
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
            "wjugjp");

    // 图标别名到Activity别名的映射
    // 所有图标（包括默认图标）都对应一个 activity-alias
    // MainActivity 不再作为启动器入口
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

            // 核心方案：所有图标切换只在 alias 之间进行
            // MainActivity 永远不操作，始终保持 enabled 状态
            // 这样既不会出现两个图标，也不会导致覆盖安装失败

            // 遍历所有图标，启用目标 alias，禁用其他 alias
            for (String availableIcon : AVAILABLE_ICONS) {
                String activityAlias = getActivityAlias(availableIcon);
                ComponentName componentName = new ComponentName(packageName, activityAlias);

                // 选中的 alias 设置为 ENABLED，其他设置为 DISABLED
                int newState = availableIcon.equals(iconId) ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                        : PackageManager.COMPONENT_ENABLED_STATE_DISABLED;

                packageManager.setComponentEnabledSetting(
                        componentName,
                        newState,
                        PackageManager.DONT_KILL_APP);
            }

            // 保存当前图标设置
            getContext().getSharedPreferences("lumos_settings", 0)
                    .edit()
                    .putString("current_icon", iconId)
                    .apply();

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("message", "图标已更新为: " + iconId);
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
            // 在应用启动时确保图标状态正确
            String currentIcon = getContext().getSharedPreferences("lumos_settings", 0)
                    .getString("current_icon", "default");

            PackageManager packageManager = getContext().getPackageManager();
            String packageName = getContext().getPackageName();

            // 所有图标切换只在 alias 之间进行，不操作 MainActivity
            for (String availableIcon : AVAILABLE_ICONS) {
                String activityAlias = getActivityAlias(availableIcon);
                ComponentName componentName = new ComponentName(packageName, activityAlias);
                int state = availableIcon.equals(currentIcon) ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                        : PackageManager.COMPONENT_ENABLED_STATE_DISABLED;
                packageManager.setComponentEnabledSetting(
                        componentName,
                        state,
                        PackageManager.DONT_KILL_APP);
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
        JSObject result = new JSObject();
        result.put("success", true);
        result.put("message", "图标更新完成，启动器会自动刷新");
        call.resolve(result);
    }
}