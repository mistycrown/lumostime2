/**
 * @file MainActivity.java
 * @input Application launch and window configuration
 * @output WebView container with edge-to-edge support
 * @pos Android Entry Point
 * @description The main Android activity provided by Capacitor. Serves as the WebView container, configures edge-to-edge window behavior, and registers native plugins.
 * @updated 2026-04-26: Captures assistant-notification navigation intents so the Web layer can reopen the shared AI chat at the targeted background reply after resume or cold start.
 * @updated 2026-07-22: Registers the native status-bar appearance bridge for display-mode synchronization.
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

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;
import com.lumostime.app.AppLauncherPlugin;

public class MainActivity extends BridgeActivity {
    private FrameLayout immersiveProtectionOverlay;
    private View immersiveProtectionTopView;
    private View immersiveProtectionBottomView;
    private View immersiveProtectionLeftView;
    private View immersiveProtectionRightView;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LumosNfcPlugin.class);
        registerPlugin(FocusNotificationPlugin.class);
        registerPlugin(AssistantAgentPlugin.class);
        registerPlugin(AppUsagePlugin.class);
        registerPlugin(IconPlugin.class);
        registerPlugin(AppLauncherPlugin.class);
        registerPlugin(ImmersiveModePlugin.class);
        registerPlugin(NativeStatusBarAppearancePlugin.class);
        registerPlugin(WidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);

        configureWindowForEdgeToEdge();
        AssistantNotificationNavigationStore.captureFromIntent(this, getIntent());
        ensureImmersiveProtectionOverlay();
        initializeIconState();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        AssistantNotificationNavigationStore.captureFromIntent(this, intent);
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

    public void setImmersiveProtectionVisible(boolean visible) {
        ensureImmersiveProtectionOverlay();
        if (immersiveProtectionOverlay == null) {
            return;
        }

        immersiveProtectionOverlay.setVisibility(visible ? View.VISIBLE : View.GONE);
        if (visible) {
            immersiveProtectionOverlay.bringToFront();
            ViewCompat.requestApplyInsets(immersiveProtectionOverlay);
        }
    }

    private void ensureImmersiveProtectionOverlay() {
        if (immersiveProtectionOverlay != null) {
            return;
        }

        FrameLayout contentView = getWindow().findViewById(android.R.id.content);
        if (contentView == null) {
            return;
        }

        immersiveProtectionOverlay = new FrameLayout(this);
        immersiveProtectionOverlay.setClickable(false);
        immersiveProtectionOverlay.setFocusable(false);
        immersiveProtectionOverlay.setFitsSystemWindows(false);
        immersiveProtectionOverlay.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);

        FrameLayout.LayoutParams overlayParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        );
        contentView.addView(immersiveProtectionOverlay, overlayParams);

        immersiveProtectionTopView = createProtectionView();
        immersiveProtectionBottomView = createProtectionView();
        immersiveProtectionLeftView = createProtectionView();
        immersiveProtectionRightView = createProtectionView();

        immersiveProtectionOverlay.addView(
            immersiveProtectionTopView,
            new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                0,
                Gravity.TOP
            )
        );
        immersiveProtectionOverlay.addView(
            immersiveProtectionBottomView,
            new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                0,
                Gravity.BOTTOM
            )
        );
        immersiveProtectionOverlay.addView(
            immersiveProtectionLeftView,
            new FrameLayout.LayoutParams(
                0,
                FrameLayout.LayoutParams.MATCH_PARENT,
                Gravity.START
            )
        );
        immersiveProtectionOverlay.addView(
            immersiveProtectionRightView,
            new FrameLayout.LayoutParams(
                0,
                FrameLayout.LayoutParams.MATCH_PARENT,
                Gravity.END
            )
        );

        immersiveProtectionOverlay.setVisibility(View.GONE);

        ViewCompat.setOnApplyWindowInsetsListener(immersiveProtectionOverlay, (view, insets) -> {
            updateImmersiveProtectionInsets(insets);
            return insets;
        });
        ViewCompat.requestApplyInsets(immersiveProtectionOverlay);
    }

    private View createProtectionView() {
        View view = new View(this);
        view.setBackgroundColor(Color.BLACK);
        view.setClickable(false);
        view.setFocusable(false);
        return view;
    }

    private void updateImmersiveProtectionInsets(WindowInsetsCompat windowInsets) {
        if (immersiveProtectionOverlay == null) {
            return;
        }

        Insets systemBarInsets = windowInsets.getInsetsIgnoringVisibility(WindowInsetsCompat.Type.systemBars());
        Insets displayCutoutInsets = windowInsets.getInsetsIgnoringVisibility(WindowInsetsCompat.Type.displayCutout());
        boolean isLandscape = getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE;
        ImmersiveProtectionInsets protectionInsets = ImmersiveProtectionInsets.resolve(
            systemBarInsets,
            displayCutoutInsets,
            isLandscape
        );

        updateProtectionEdgeLayout(immersiveProtectionTopView, FrameLayout.LayoutParams.MATCH_PARENT, protectionInsets.top, Gravity.TOP);
        updateProtectionEdgeLayout(immersiveProtectionBottomView, FrameLayout.LayoutParams.MATCH_PARENT, protectionInsets.bottom, Gravity.BOTTOM);
        updateProtectionEdgeLayout(immersiveProtectionLeftView, protectionInsets.left, FrameLayout.LayoutParams.MATCH_PARENT, Gravity.START);
        updateProtectionEdgeLayout(immersiveProtectionRightView, protectionInsets.right, FrameLayout.LayoutParams.MATCH_PARENT, Gravity.END);
    }

    private void updateProtectionEdgeLayout(View view, int width, int height, int gravity) {
        FrameLayout.LayoutParams params = (FrameLayout.LayoutParams) view.getLayoutParams();
        if (params.width == width && params.height == height && params.gravity == gravity) {
            return;
        }

        params.width = width;
        params.height = height;
        params.gravity = gravity;
        view.setLayoutParams(params);
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
