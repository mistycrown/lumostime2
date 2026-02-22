/**
 * @file MainActivity.java
 * @input Application Launch
 * @output WebView Container
 * @pos Android Entry Point
 * @description The main Android Activity provided by Capacitor. Serves as the container for the WebView.
 */
package com.mistycrown.lumostime;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LumosNfcPlugin.class);
        registerPlugin(FocusNotificationPlugin.class); // 注册专注通知插件
        registerPlugin(AppUsagePlugin.class);
        registerPlugin(IconPlugin.class); // 注册图标切换插件
        super.onCreate(savedInstanceState);
        
        // 初始化图标状态，确保应用有正确的入口点
        initializeIconState();
    }
    
    private void initializeIconState() {
        try {
            // 在后台线程中初始化图标状态，避免阻塞主线程
            new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        // 获取当前保存的图标设置
                        String currentIcon = getSharedPreferences("lumos_settings", 0)
                            .getString("current_icon", "default");
                        
                        // 如果没有设置或设置为默认，确保主 Activity 可用
                        if (currentIcon.equals("default") || currentIcon.isEmpty()) {
                            // 主 Activity 已经在运行，无需额外操作
                            android.util.Log.d("MainActivity", "使用默认图标");
                        } else {
                            // 记录当前使用的图标
                            android.util.Log.d("MainActivity", "当前图标: " + currentIcon);
                        }
                    } catch (Exception e) {
                        android.util.Log.e("MainActivity", "初始化图标状态失败: " + e.getMessage());
                    }
                }
            }).start();
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "启动图标初始化失败: " + e.getMessage());
        }
    }
}
