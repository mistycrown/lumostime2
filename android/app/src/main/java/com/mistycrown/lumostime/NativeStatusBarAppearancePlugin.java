/**
 * @file NativeStatusBarAppearancePlugin.java
 * @input Status-bar color plus light-icon preference from the Web layer
 * @output Android root backdrop color and status-bar icon appearance
 * @pos Native Plugin
 * @description Paints the transparent system-bar backdrop through the Android root view while updating icon appearance.
 * @updated 2026-07-22: Uses a dedicated top-inset backdrop so Android 15's transparent status bar has a deterministic color.
 */
package com.mistycrown.lumostime;

import android.graphics.Color;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeStatusBarAppearance")
public class NativeStatusBarAppearancePlugin extends Plugin {
    private static final String TAG = "NativeStatusBarAppearance";

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
                int parsedColor = Color.parseColor(color);
                View decorView = getActivity().getWindow().getDecorView();
                ViewGroup contentView = getActivity().findViewById(android.R.id.content);
                WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getActivity().getWindow(), decorView);

                // Android 15 renders the status bar transparently. The color must come from
                // the root view behind it instead of Window#setStatusBarColor.
                decorView.setBackgroundColor(parsedColor);
                if (contentView != null) {
                    contentView.setBackgroundColor(parsedColor);
                }
                if (getActivity() instanceof MainActivity) {
                    ((MainActivity) getActivity()).setStatusBarBackdropColor(parsedColor);
                }
                if (controller != null) {
                    controller.setAppearanceLightStatusBars(!lightIcons);
                }
                Log.d(TAG, "Applied status bar color=" + color + ", lightIcons=" + lightIcons);
                call.resolve();
            } catch (Exception exception) {
                call.reject(exception.getMessage());
            }
        });
    }
}
