/**
 * @file MainActivity.java
 * @input Application Launch
 * @output WebView Container
 * @pos Android Entry Point
 * @description The main Android Activity provided by Capacitor. Serves as the container for the WebView.
 */
package com.mistycrown.lumostime;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(LumosNfcPlugin.class);
        registerPlugin(FocusNotificationPlugin.class); // 注册专注通知插件
        registerPlugin(AppUsagePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
