/**
 * @file MainActivity.java
 * @input Application launch and window configuration
 * @output WebView container with edge-to-edge support
 * @pos Android Entry Point
 * @description The main Android activity provided by Capacitor. Serves as the WebView container, configures edge-to-edge window behavior, and registers native plugins.
 * @updated 2026-04-26: Captures assistant-notification navigation intents so the Web layer can reopen the shared AI chat at the targeted background reply after resume or cold start.
 * @updated 2026-07-22: Registers the native status-bar appearance bridge for display-mode synchronization.
 * @updated 2026-07-22: Draws an explicit top inset backdrop beneath Android 15's transparent status bar.
 * @updated 2026-08-10: Reapplies immersive system-bar hiding after Android orientation and focus transitions, while keeping web controls above the native status-bar backdrop.
 * @updated 2026-08-15: Hides a native ActionBar restored by certain Android activity-alias theme fallbacks so it cannot cover the WebView header.
 * @updated 2026-08-15: Installs the AndroidX splash screen before Activity creation so MIUI applies the configured post-splash NoActionBar theme.
 */
package com.mistycrown.lumostime;

import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;

import androidx.appcompat.app.ActionBar;
import androidx.core.graphics.Insets;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;
import com.lumostime.app.AppLauncherPlugin;

public class MainActivity extends BridgeActivity {
    private View statusBarBackdropView;
    private boolean immersiveModeActive;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        registerPlugin(LumosNfcPlugin.class);
        registerPlugin(FocusNotificationPlugin.class);
        registerPlugin(AssistantAgentPlugin.class);
        registerPlugin(AppUsagePlugin.class);
        registerPlugin(IconPlugin.class);
        registerPlugin(AppLauncherPlugin.class);
        registerPlugin(ImmersiveModePlugin.class);
        registerPlugin(NativeStatusBarAppearancePlugin.class);
        registerPlugin(WidgetBridgePlugin.class);
        configureWindowForEdgeToEdge();
        super.onCreate(savedInstanceState);

        hideUnexpectedNativeActionBar();
        configureWindowForEdgeToEdge();
        AssistantNotificationNavigationStore.captureFromIntent(this, getIntent());
        ensureStatusBarBackdrop();
        initializeIconState();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        AssistantNotificationNavigationStore.captureFromIntent(this, intent);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        hideUnexpectedNativeActionBar();
        configureWindowForEdgeToEdge();
        if (statusBarBackdropView != null) {
            ViewCompat.requestApplyInsets(statusBarBackdropView);
        }
        if (immersiveModeActive) {
            getWindow().getDecorView().post(this::applyImmersiveWindowState);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && immersiveModeActive) {
            getWindow().getDecorView().post(this::applyImmersiveWindowState);
        }
    }

    private void configureWindowForEdgeToEdge() {
        getWindow().setBackgroundDrawable(new ColorDrawable(Color.BLACK));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getWindow().setStatusBarContrastEnforced(false);
            getWindow().setNavigationBarContrastEnforced(false);
        }

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams attributes = getWindow().getAttributes();
            attributes.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(attributes);
        }
    }

    public void setImmersiveModeActive(boolean active) {
        immersiveModeActive = active;
        if (active) {
            applyImmersiveWindowState();
        } else {
            moveStatusBarBackdropToFront();
        }
    }

    private void hideUnexpectedNativeActionBar() {
        ActionBar actionBar = getSupportActionBar();
        if (actionBar != null) {
            actionBar.hide();
        }
    }

    public void setStatusBarBackdropColor(int color) {
        ensureStatusBarBackdrop();
        if (statusBarBackdropView == null) {
            return;
        }

        statusBarBackdropView.setBackgroundColor(color);
        if (immersiveModeActive) {
            moveStatusBarBackdropBehindWebContent();
        } else {
            moveStatusBarBackdropToFront();
        }
        ViewCompat.requestApplyInsets(statusBarBackdropView);
    }

    private void moveStatusBarBackdropBehindWebContent() {
        moveStatusBarBackdropToIndex(0);
    }

    private void moveStatusBarBackdropToFront() {
        if (statusBarBackdropView != null) {
            statusBarBackdropView.bringToFront();
        }
    }

    private void moveStatusBarBackdropToIndex(int index) {
        if (statusBarBackdropView == null) {
            return;
        }

        FrameLayout contentView = getWindow().findViewById(android.R.id.content);
        if (contentView == null || contentView.indexOfChild(statusBarBackdropView) == index) {
            return;
        }

        contentView.removeView(statusBarBackdropView);
        contentView.addView(statusBarBackdropView, index);
    }

    private void ensureStatusBarBackdrop() {
        if (statusBarBackdropView != null) {
            return;
        }

        FrameLayout contentView = getWindow().findViewById(android.R.id.content);
        if (contentView == null) {
            return;
        }

        statusBarBackdropView = new View(this);
        statusBarBackdropView.setBackgroundColor(Color.BLACK);
        statusBarBackdropView.setClickable(false);
        statusBarBackdropView.setFocusable(false);
        statusBarBackdropView.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        contentView.addView(
            statusBarBackdropView,
            new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                0,
                Gravity.TOP
            )
        );

        ViewCompat.setOnApplyWindowInsetsListener(statusBarBackdropView, (view, insets) -> {
            Insets statusBarInsets = insets.getInsetsIgnoringVisibility(WindowInsetsCompat.Type.statusBars());
            FrameLayout.LayoutParams params = (FrameLayout.LayoutParams) view.getLayoutParams();
            if (params.height != statusBarInsets.top) {
                params.height = statusBarInsets.top;
                params.gravity = Gravity.TOP;
                view.setLayoutParams(params);
            }
            return insets;
        });
        ViewCompat.requestApplyInsets(statusBarBackdropView);
    }

    private void applyImmersiveWindowState() {
        View decorView = getWindow().getDecorView();
        decorView.setBackgroundColor(Color.BLACK);
        FrameLayout contentView = getWindow().findViewById(android.R.id.content);
        if (contentView != null) {
            contentView.setBackgroundColor(Color.BLACK);
        }
        setStatusBarBackdropColor(Color.BLACK);

        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), decorView);
        if (controller == null) {
            return;
        }

        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }

    private void initializeIconState() {
        try {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        String currentIcon = getSharedPreferences("lumos_settings", 0)
                            .getString("current_icon", "default");

                        if (currentIcon.equals("default") || currentIcon.isEmpty()) {
                            android.util.Log.d("MainActivity", "使用默认图标");
                        } else {
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
