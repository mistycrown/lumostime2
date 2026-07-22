/**
 * @file NativeStatusBarAppearancePlugin.java
 * @input Status-bar color plus light-icon preference from the Web layer
 * @output Android Window status-bar color and icon appearance
 * @pos Native Plugin
 * @description Applies status-bar appearance directly to the Android Window so edge-to-edge WebView layout does not leave a stale system-bar color.
 * @updated 2026-07-22: Added native bridge for display-mode status-bar synchronization.
 */
package com.mistycrown.lumostime;

import android.graphics.Color;
import android.view.View;
import android.view.Window;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeStatusBarAppearance")
public class NativeStatusBarAppearancePlugin extends Plugin {

    @PluginMethod
    public void apply(PluginCall call) {
        String color = call.getString("color");
        boolean lightIcons = call.getBoolean("lightIcons", false);

        if (color == null) {
            call.reject("Color must be provided");
            return;
        }

        if (getActivity() == null) {
            call.reject("Activity unavailable");
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                Window window = getActivity().getWindow();
                View decorView = window.getDecorView();
                WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decorView);
                window.setStatusBarColor(Color.parseColor(color));
                if (controller != null) {
                    controller.setAppearanceLightStatusBars(!lightIcons);
                }
                call.resolve();
            } catch (Exception exception) {
                call.reject(exception.getMessage());
            }
        });
    }
}
