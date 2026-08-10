/**
 * @file ImmersiveModePlugin.java
 * @input Immersive enter and exit requests from the web layer
 * @output Android system bar visibility changes
 * @pos Native Plugin
 * @description Provides Android immersive mode controls for fullscreen experiences, hiding and restoring system bars while keeping edge-to-edge enabled.
 * @updated 2026-08-10: Adds temporary native immersive transition diagnostics for logcat investigation.
 */
package com.mistycrown.lumostime;

import android.util.Log;
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
    private static final String TAG = "ImmersiveDebug";

    @PluginMethod
    public void enter(PluginCall call) {
        Log.i(TAG, "Native immersive enter requested");
        if (getActivity() == null) {
            Log.e(TAG, "Native immersive enter rejected: Activity unavailable");
            call.reject("Activity unavailable");
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                Window window = getActivity().getWindow();
                View decorView = window.getDecorView();
                WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decorView);
                if (controller == null) {
                    Log.e(TAG, "Native immersive enter rejected: WindowInsetsController unavailable");
                    call.reject("WindowInsetsController unavailable");
                    return;
                }

                if (getActivity() instanceof MainActivity) {
                    ((MainActivity) getActivity()).setImmersiveProtectionVisible(true);
                }

                controller.setSystemBarsBehavior(
                    WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                );
                controller.hide(WindowInsetsCompat.Type.systemBars());
                Log.i(TAG, "Native immersive enter applied: system bars hidden");
                call.resolve();
            } catch (Exception exception) {
                Log.e(TAG, "Native immersive enter failed", exception);
                call.reject(exception.getMessage());
            }
        });
    }

    @PluginMethod
    public void exit(PluginCall call) {
        Log.i(TAG, "Native immersive exit requested");
        if (getActivity() == null) {
            Log.e(TAG, "Native immersive exit rejected: Activity unavailable");
            call.reject("Activity unavailable");
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                Window window = getActivity().getWindow();
                View decorView = window.getDecorView();
                WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decorView);
                if (controller == null) {
                    Log.e(TAG, "Native immersive exit rejected: WindowInsetsController unavailable");
                    call.reject("WindowInsetsController unavailable");
                    return;
                }

                controller.show(WindowInsetsCompat.Type.systemBars());
                if (getActivity() instanceof MainActivity) {
                    ((MainActivity) getActivity()).setImmersiveProtectionVisible(false);
                }
                Log.i(TAG, "Native immersive exit applied: system bars shown");
                call.resolve();
            } catch (Exception exception) {
                Log.e(TAG, "Native immersive exit failed", exception);
                call.reject(exception.getMessage());
            }
        });
    }
}
