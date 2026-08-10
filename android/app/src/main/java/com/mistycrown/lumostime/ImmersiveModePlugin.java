/**
 * @file ImmersiveModePlugin.java
 * @input Immersive enter and exit requests from the web layer
 * @output Android system bar visibility changes
 * @pos Native Plugin
 * @description Provides Android immersive mode controls for fullscreen experiences, hiding and restoring system bars while keeping edge-to-edge enabled.
 * @updated 2026-08-10: Delegates immersive state restoration across Android orientation and focus transitions to MainActivity.
 */
package com.mistycrown.lumostime;

import android.view.View;
import android.view.Window;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ImmersiveMode")
public class ImmersiveModePlugin extends Plugin {
    @PluginMethod
    public void enter(PluginCall call) {
        if (getActivity() == null) {
            call.reject("Activity unavailable");
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                Window window = getActivity().getWindow();
                View decorView = window.getDecorView();
                WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decorView);
                if (controller == null) {
                    call.reject("WindowInsetsController unavailable");
                    return;
                }

                if (getActivity() instanceof MainActivity) {
                    ((MainActivity) getActivity()).setImmersiveModeActive(true);
                } else {
                    controller.setSystemBarsBehavior(
                        WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                    );
                    controller.hide(WindowInsetsCompat.Type.systemBars());
                }
                call.resolve();
            } catch (Exception exception) {
                call.reject(exception.getMessage());
            }
        });
    }

    @PluginMethod
    public void exit(PluginCall call) {
        if (getActivity() == null) {
            call.reject("Activity unavailable");
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                Window window = getActivity().getWindow();
                View decorView = window.getDecorView();
                WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decorView);
                if (controller == null) {
                    call.reject("WindowInsetsController unavailable");
                    return;
                }

                controller.show(WindowInsetsCompat.Type.systemBars());
                if (getActivity() instanceof MainActivity) {
                    ((MainActivity) getActivity()).setImmersiveModeActive(false);
                }
                call.resolve();
            } catch (Exception exception) {
                call.reject(exception.getMessage());
            }
        });
    }
}
