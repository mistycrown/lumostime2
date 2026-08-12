/**
 * @file FloatingWindowService.java
 * @input Intent Commands (Start/Stop/Update)
 * @output Floating UI Overlay and Foreground Notification
 * @pos Native Service
 * @description Foreground Android service managing the "LumosTime Island" floating window, including overlay rendering, touch interaction, runtime state updates, and a shared persistent status notification with the AI assistant service.
 * @updated 2026-05-09: Tracks the current app session id inside the floating service so app-origin stops can reconcile precisely after background resume.
 * @updated 2026-05-09: Refreshes the shared persistent notification title once per second while floating-window focus timers are active so elapsed times stay live.
 * @updated 2026-05-04: Routed floating-window foreground startup through the shared runtime notification manager so Android 8+ no longer depends on the removed legacy notification channel.
 * @updated 2026-04-26: Switched the floating-window foreground notification onto the shared runtime-status manager so Android only shows one persistent LumosTime service notification.
 * @updated 2026-06-13: Added updateFocusStateIfRunning to allow direct memory focus state updates, bypassing background startForegroundService limitations on Android 12+.
 * @updated 2026-08-12: Exposes a strict app-awareness overlay visibility check for workflow startup recovery and Logcat diagnostics.
 * @updated 2026-08-12: Keeps the regular side bubble independently disabled when app-awareness starts the shared foreground service.
 */
package com.mistycrown.lumostime;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;

/**
 * 悬浮窗服务
 * 用于在屏幕上显示悬浮球
 */
public class FloatingWindowService extends Service {
    private static final String TAG = "FloatingWindowService";
    private static final String CHANNEL_ID = "floating_window_channel";
    private static final int NOTIFICATION_ID = 2101;
    private static final String SIDE_BUBBLE_PREFS = "floating_window_settings";
    private static final String KEY_SIDE_BUBBLE_ENABLED = "side_bubble_enabled";
    private static FloatingWindowService instance = null;
    private static String pendingAppAwarenessPayloadJson = null;

    private WindowManager windowManager;
    private View floatingView;
    private WindowManager.LayoutParams params;
    private View appAwarenessFloatingView;
    private WindowManager.LayoutParams appAwarenessParams;
    private boolean isAppAwarenessWindowAttached = false;

    private TextView emojiView;
    private TextView timeView;
    private android.widget.ImageView iconView;
    private android.widget.FrameLayout containerView;
    private BroadcastReceiver appChangeReceiver;
    private String currentAppPackage = "";

    // State
    private boolean isMoving = false;
    private boolean isFocusing = false;
    private long startTime = 0;
    private long lastNotificationElapsedSeconds = -1L;
    private String currentSessionId = null;
    private android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
    private static final long CYCLE_DURATION = 9000; // 5s Time + 2s Emoji + 2s Icon
    private static final long SHOW_TIME_DURATION = 5000;
    private static final long SHOW_EMOJI_DURATION = 7000; // 5s to 7s
    private int bubbleX = 100;
    private int bubbleY = 200;

    private int currentDisplayState = 0; // 0: Time, 1: Emoji, 2: Icon

    // 提醒模式状态
    private boolean isPromptMode = false;
    private String promptPackageName = "";
    private String promptAppLabel = ""; // 显示在悬浮球上的文本(可能是标签名)
    private String promptRealAppName = ""; // 真实的应用名称(如"小红书")
    private String promptActivityId = ""; // 关联的Activity ID

    private boolean isAppAwarenessMode = false;
    private android.widget.ScrollView appAwarenessScrollView;
    private android.widget.LinearLayout appAwarenessPanel;
    private TextView appAwarenessProgressView;
    private TextView appAwarenessTitleView;
    private TextView appAwarenessBodyView;
    private TextView appAwarenessCountdownView;
    private TextView appAwarenessCloseButton;
    private TextView appAwarenessInputHintView;
    private android.widget.EditText appAwarenessInputView;
    private android.widget.LinearLayout appAwarenessButtonsContainer;
    private View appAwarenessTimerFloatingView;
    private WindowManager.LayoutParams appAwarenessTimerParams;
    private boolean isAppAwarenessTimerAttached = false;
    private TextView appAwarenessTimerTitleView;
    private TextView appAwarenessTimerTimeView;
    private int appAwarenessTimerX = 120;
    private int appAwarenessTimerY = 120;

    private Runnable updateRunnable = new Runnable() {
        @Override
        public void run() {
            if (!isFocusing)
                return;

            long now = System.currentTimeMillis();
            long cycleTime = now % CYCLE_DURATION;

            int newState;
            if (cycleTime < SHOW_TIME_DURATION) {
                newState = 0; // Time
            } else if (cycleTime < SHOW_EMOJI_DURATION) {
                newState = 1; // Emoji
            } else {
                newState = 2; // Icon
            }

            // Update Time Text constantly
            long elapsed = now - startTime;
            if (startTime <= 0 || elapsed > 24 * 60 * 60 * 1000L) {
                elapsed = 0;
            }
            long elapsedSeconds = elapsed / 1000L;
            String timeText = formatDuration(elapsed);
            timeView.setText(timeText);
            if (timeText.length() > 5) {
                timeView.setTextSize(TypedValue.COMPLEX_UNIT_DIP, 9);
            } else {
                timeView.setTextSize(TypedValue.COMPLEX_UNIT_DIP, 11);
            }

            if (elapsedSeconds != lastNotificationElapsedSeconds) {
                lastNotificationElapsedSeconds = elapsedSeconds;
                updateNotification("\u60ac\u6d6e\u7403\u8ba1\u65f6\u4e2d\uff0c\u70b9\u51fb\u53ef\u7ed3\u675f\u5f53\u524d\u4e13\u6ce8");
            }

            // Handle State Transitions
            if (newState != currentDisplayState) {
                View fromView = getViewForState(currentDisplayState);
                View toView = getViewForState(newState);

                if (fromView != toView) {
                    flipViews(fromView, toView);
                }
                currentDisplayState = newState;
            }

            handler.postDelayed(this, 500);
        }
    };

    private View getViewForState(int state) {
        switch (state) {
            case 0:
                return timeView;
            case 1:
                return emojiView;
            case 2:
                return iconView;
            default:
                return timeView;
        }
    }

    private void flipViews(final View from, final View to) {
        from.animate().scaleY(0f).setDuration(200).withEndAction(new Runnable() {
            @Override
            public void run() {
                from.setVisibility(View.GONE);
                to.setScaleY(0f);
                to.setVisibility(View.VISIBLE);
                to.animate().scaleY(1f).setDuration(200).start();
            }
        }).start();
    }

    private String formatDuration(long millis) {
        long seconds = millis / 1000;
        long m = seconds / 60; // Total minutes
        long s = seconds % 60;
        return String.format("%02d:%02d", m, s);
    }

    // Helper for DP to PX
    private int dpToPx(int dp) {
        float density = getResources().getDisplayMetrics().density;
        return Math.round((float) dp * density);
    }

    private int getStatusBarHeight() {
        int resourceId = getResources().getIdentifier("status_bar_height", "dimen", "android");
        if (resourceId > 0) {
            return getResources().getDimensionPixelSize(resourceId);
        }
        return dpToPx(24);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String icon = intent.getStringExtra("icon");
            boolean focusing = intent.getBooleanExtra("isFocusing", false);
            long start = intent.getLongExtra("startTime", 0);
            String sessionId = intent.getStringExtra("sessionId");

            Log.d(TAG, "📥 Service onStartCommand: focus=" + focusing + ", start=" + start + ", icon=" + icon + ", sessionId=" + sessionId);
            updateContent(icon, focusing, start, sessionId);
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        instance = null;
        UnifiedServiceNotificationManager.clearFloatingWindowState(this);
        stopForeground(false);
        UnifiedServiceNotificationManager.reconcileNotificationState(this);
        Log.d(TAG, "🔴 悬浮窗服务销毁, instance已清空");
        if (floatingView != null) {
            try {
                windowManager.removeView(floatingView);
            } catch (Exception e) {
                Log.e(TAG, "Remove view failed", e);
            }
            floatingView = null;
        }
        if (appAwarenessFloatingView != null && isAppAwarenessWindowAttached) {
            try {
                windowManager.removeView(appAwarenessFloatingView);
            } catch (Exception e) {
                Log.e(TAG, "Remove app-awareness view failed", e);
            }
        }
        if (appAwarenessTimerFloatingView != null && isAppAwarenessTimerAttached) {
            try {
                windowManager.removeView(appAwarenessTimerFloatingView);
            } catch (Exception e) {
                Log.e(TAG, "Remove app-awareness timer view failed", e);
            }
        }
        isAppAwarenessWindowAttached = false;
        isAppAwarenessTimerAttached = false;
        appAwarenessFloatingView = null;
        appAwarenessTimerFloatingView = null;
        handler.removeCallbacks(updateRunnable);

        if (appChangeReceiver != null) {
            try {
                unregisterReceiver(appChangeReceiver);
            } catch (Exception e) {
                Log.e(TAG, "Unregister receiver failed", e);
            }
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        Log.d(TAG, "🟢 悬浮窗服务 onCreate");

        createNotificationChannel();
        UnifiedServiceNotificationManager.setFloatingWindowState(this, true, false);
        startForeground(NOTIFICATION_ID, createNotification("悬浮球已开启，点击可返回 LumosTime"));
        UnifiedServiceNotificationManager.reconcileNotificationState(this);

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        if (isSideBubbleEnabled()) {
            initBubbleView();
        }
        initAppAwarenessWindow();
        initAppAwarenessTimerWindow();
        registerAppChangeReceiver();
        if (pendingAppAwarenessPayloadJson != null) {
            final String cachedPayload = pendingAppAwarenessPayloadJson;
            pendingAppAwarenessPayloadJson = null;
            new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
                showAppAwarenessOverlayInternal(cachedPayload);
            });
        }
    }

    // Public method for external access
    public static void updateCurrentApp(String packageName, String appLabel) {
        Log.d(TAG, "📥 updateCurrentApp被调用: package=" + packageName + ", label=" + appLabel);
        if (instance != null) {
            Log.d(TAG, "✅ instance存在, isFocusing=" + instance.isFocusing);
            instance.updateAppIconInternal(packageName, appLabel);
        } else {
            Log.w(TAG, "⚠️ FloatingWindowService instance为null, 无法更新图标");
        }
    }

    public static void showTempText(String text) {
        Log.d(TAG, "📥 showTempText被调用: " + text);
        if (instance != null) {
            Log.d(TAG, "✅ instance存在,准备显示文字");
            new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
                instance.showTempTextInternal(text);
            });
        } else {
            Log.w(TAG, "⚠️ FloatingWindowService instance为null, 无法显示文字");
        }
    }

    public static void showAppAwarenessOverlay(String payloadJson) {
        if (instance == null) {
            pendingAppAwarenessPayloadJson = payloadJson;
            Log.w(TAG, "FloatingWindowService instance涓簄ull, 鏃犳硶鏄剧ず搴旂敤鎰熺煡闈㈡澘");
            return;
        }

        pendingAppAwarenessPayloadJson = null;
        new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
            instance.showAppAwarenessOverlayInternal(payloadJson);
        });
    }

    public static void hideAppAwarenessOverlay() {
        pendingAppAwarenessPayloadJson = null;
        if (instance == null) {
            return;
        }

        new android.os.Handler(android.os.Looper.getMainLooper()).post(instance::hideAppAwarenessOverlayInternal);
    }

    public static void updateAppAwarenessOverlay(String payloadJson) {
        pendingAppAwarenessPayloadJson = payloadJson;
        if (instance == null) {
            return;
        }

        new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
            instance.updateAppAwarenessOverlayInternal(payloadJson);
        });
    }

    public static boolean isAppAwarenessOverlayShowing() {
        return instance != null && instance.isAppAwarenessMode;
    }

    public static boolean isAppAwarenessOverlayVisible() {
        return instance != null
                && instance.isAppAwarenessMode
                && instance.isAppAwarenessWindowAttached
                && instance.appAwarenessScrollView != null
                && instance.appAwarenessScrollView.getVisibility() == View.VISIBLE;
    }

    public static String getAppAwarenessOverlayState() {
        if (instance == null) {
            return "service=missing";
        }

        return "service=ready, mode=" + instance.isAppAwarenessMode
                + ", attached=" + instance.isAppAwarenessWindowAttached
                + ", panel=" + (instance.appAwarenessScrollView != null)
                + ", visible=" + (instance.appAwarenessScrollView != null
                    && instance.appAwarenessScrollView.getVisibility() == View.VISIBLE);
    }

    public static void showAppAwarenessTimerBar(String payloadJson) {
        if (instance == null) {
            return;
        }

        new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
            instance.showAppAwarenessTimerBarInternal(payloadJson);
        });
    }

    public static void updateAppAwarenessTimerBar(String payloadJson) {
        if (instance == null) {
            return;
        }

        new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
            instance.updateAppAwarenessTimerBarInternal(payloadJson);
        });
    }

    public static void hideAppAwarenessTimerBar() {
        if (instance == null) {
            return;
        }

        new android.os.Handler(android.os.Looper.getMainLooper()).post(instance::hideAppAwarenessTimerBarInternal);
    }

    public static void syncFocusStateIfRunning(String icon, boolean focusing, long startTime) {
        if (instance == null) {
            Log.d(TAG, "Floating window service is not running, skip widget sync");
            return;
        }

        new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
            instance.updateContent(icon, focusing, startTime, null);
        });
    }

    public static boolean updateFocusStateIfRunning(String icon, boolean focusing, long startTime, String sessionId) {
        if (instance == null) {
            return false;
        }

        new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
            instance.updateContent(icon, focusing, startTime, sessionId);
        });
        return true;
    }

    public static void setSideBubbleEnabled(Context context, boolean enabled) {
        context.getSharedPreferences(SIDE_BUBBLE_PREFS, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(KEY_SIDE_BUBBLE_ENABLED, enabled)
                .apply();

        if (instance != null) {
            new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
                if (enabled) {
                    instance.initBubbleView();
                } else {
                    instance.removeSideBubbleView();
                }
            });
        }
    }

    private void showTempTextInternal(String text) {
        Log.d(TAG, "🔤 showTempTextInternal: " + text);
        if (timeView != null) {
            // 暂停循环更新
            handler.removeCallbacks(updateRunnable);

            // 隐藏其他视图
            if (emojiView != null)
                emojiView.setVisibility(View.GONE);
            if (iconView != null)
                iconView.setVisibility(View.GONE);

            // 显示文字
            timeView.setText(text);
            timeView.setTextSize(TypedValue.COMPLEX_UNIT_DIP, 9);
            timeView.setVisibility(View.VISIBLE);
            timeView.setScaleY(1f);

            Log.d(TAG, "✅ 文字已显示在timeView (持久显示,等待用户点击)");
            // 不再设置定时器,持久显示直到点击
        } else {
            Log.w(TAG, "⚠️ timeView为null");
        }
    }

    public static void showPrompt(String packageName, String appLabel, String realAppName, String activityId) {
        Log.d(TAG, "📥 showPrompt被调用: " + packageName + " / " + appLabel + " / " + realAppName + " / " + activityId);
        if (instance != null) {
            instance.showPromptInternal(packageName, appLabel, realAppName, activityId);
        } else {
            Log.w(TAG, "⚠️ FloatingWindowService instance为null");
        }
    }

    private void showPromptInternal(String packageName, String appLabel, String realAppName, String activityId) {
        if (isFocusing) {
            Log.d(TAG, "⏸️ 当前正在专注中, 忽略提醒: " + appLabel);
            return;
        }

        this.isPromptMode = true;
        this.promptPackageName = packageName;
        this.promptAppLabel = appLabel;
        this.promptRealAppName = realAppName;
        this.promptActivityId = activityId;

        showTempTextInternal("开始?\n" + appLabel);
        Log.d(TAG, "✅ 进入提醒模式: " + appLabel + " (原应用: " + realAppName + ")");
    }

    private void hidePrompt() {
        this.isPromptMode = false;
        this.promptPackageName = "";
        this.promptAppLabel = "";

        // 恢复显示应用图标
        if (timeView != null)
            timeView.setVisibility(View.GONE);
        if (iconView != null)
            iconView.setVisibility(View.VISIBLE);

        Log.d(TAG, "✅ 退出提醒模式");
    }

    private android.graphics.drawable.GradientDrawable createBubbleBackground() {
        android.graphics.drawable.GradientDrawable bg = new android.graphics.drawable.GradientDrawable();
        bg.setShape(android.graphics.drawable.GradientDrawable.OVAL);
        bg.setColor(Color.WHITE);
        bg.setStroke(1, Color.parseColor("#E5E7EB"));
        return bg;
    }

    private android.graphics.drawable.GradientDrawable createPanelBackground() {
        android.graphics.drawable.GradientDrawable bg = new android.graphics.drawable.GradientDrawable();
        bg.setShape(android.graphics.drawable.GradientDrawable.RECTANGLE);
        bg.setCornerRadius(dpToPx(18));
        bg.setColor(Color.parseColor("#FFFDF8"));
        bg.setStroke(1, Color.parseColor("#E7E5E4"));
        return bg;
    }

    private android.graphics.drawable.GradientDrawable createInputBackground() {
        android.graphics.drawable.GradientDrawable bg = new android.graphics.drawable.GradientDrawable();
        bg.setShape(android.graphics.drawable.GradientDrawable.RECTANGLE);
        bg.setCornerRadius(dpToPx(14));
        bg.setColor(Color.parseColor("#FFFFFF"));
        bg.setStroke(1, Color.parseColor("#D6D3D1"));
        return bg;
    }

    private android.graphics.drawable.GradientDrawable createButtonBackground(String style) {
        android.graphics.drawable.GradientDrawable bg = new android.graphics.drawable.GradientDrawable();
        bg.setShape(android.graphics.drawable.GradientDrawable.RECTANGLE);
        bg.setCornerRadius(dpToPx(14));
        if ("danger".equals(style)) {
            bg.setColor(Color.parseColor("#FEF2F2"));
            bg.setStroke(1, Color.parseColor("#FECACA"));
            return bg;
        }
        if ("secondary".equals(style)) {
            bg.setColor(Color.parseColor("#F5F5F4"));
            bg.setStroke(1, Color.parseColor("#E7E5E4"));
            return bg;
        }
        bg.setColor(Color.parseColor("#1C1917"));
        return bg;
    }

    private void ensureAppAwarenessWindowAttached() {
        if (appAwarenessFloatingView == null || appAwarenessParams == null || windowManager == null || isAppAwarenessWindowAttached) {
            return;
        }

        try {
            windowManager.addView(appAwarenessFloatingView, appAwarenessParams);
            isAppAwarenessWindowAttached = true;
            Log.i(TAG, "App-awareness overlay attached");
        } catch (Exception e) {
            Log.w(TAG, "Failed to attach app-awareness window", e);
        }
    }

    private void detachAppAwarenessWindow() {
        if (appAwarenessFloatingView == null || windowManager == null || !isAppAwarenessWindowAttached) {
            return;
        }

        try {
            windowManager.removeView(appAwarenessFloatingView);
        } catch (Exception e) {
            Log.w(TAG, "Failed to detach app-awareness window", e);
        } finally {
            isAppAwarenessWindowAttached = false;
        }
    }

    private void ensureAppAwarenessTimerWindowAttached() {
        if (appAwarenessTimerFloatingView == null || appAwarenessTimerParams == null || windowManager == null || isAppAwarenessTimerAttached) {
            return;
        }

        try {
            windowManager.addView(appAwarenessTimerFloatingView, appAwarenessTimerParams);
            isAppAwarenessTimerAttached = true;
        } catch (Exception e) {
            Log.w(TAG, "Failed to attach app-awareness timer window", e);
        }
    }

    private void detachAppAwarenessTimerWindow() {
        if (appAwarenessTimerFloatingView == null || windowManager == null || !isAppAwarenessTimerAttached) {
            return;
        }

        try {
            windowManager.removeView(appAwarenessTimerFloatingView);
        } catch (Exception e) {
            Log.w(TAG, "Failed to detach app-awareness timer window", e);
        } finally {
            isAppAwarenessTimerAttached = false;
        }
    }

    private void showAppAwarenessOverlayInternal(String payloadJson) {
        if (appAwarenessScrollView == null || appAwarenessPanel == null) {
            Log.e(TAG, "Cannot show app-awareness overlay: panel has not been initialized");
            return;
        }

        try {
            pendingAppAwarenessPayloadJson = null;
            org.json.JSONObject payload = new org.json.JSONObject(payloadJson);
            org.json.JSONArray buttons = payload.optJSONArray("buttons");

            isAppAwarenessMode = true;
            ensureAppAwarenessWindowAttached();
            appAwarenessScrollView.setVisibility(View.VISIBLE);
            Log.i(TAG, "Showing app-awareness overlay: " + getAppAwarenessOverlayState());

            String progressText = payload.optString("progressText", "");
            boolean allowClose = payload.optBoolean("allowClose", true);
            if (progressText.isEmpty()) {
                appAwarenessProgressView.setVisibility(View.GONE);
            } else {
                appAwarenessProgressView.setVisibility(View.VISIBLE);
                appAwarenessProgressView.setText(progressText);
            }

            appAwarenessTitleView.setText(payload.optString("title", "应用感知"));
            appAwarenessBodyView.setText(payload.optString("body", ""));
            bindAppAwarenessCountdown(payload);

            boolean showInput = payload.optBoolean("showInput", false);
            String inputHint = payload.optString("inputHint", "");
            if (inputHint.isEmpty()) {
                appAwarenessInputHintView.setVisibility(View.GONE);
            } else {
                appAwarenessInputHintView.setVisibility(View.VISIBLE);
                appAwarenessInputHintView.setText(inputHint);
            }

            if (showInput) {
                appAwarenessInputView.setVisibility(View.VISIBLE);
                appAwarenessInputView.setHint(payload.optString("inputPlaceholder", ""));
                appAwarenessInputView.setText(payload.optString("inputValue", ""));
                appAwarenessInputView.requestFocus();
                android.view.inputmethod.InputMethodManager imm =
                        (android.view.inputmethod.InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                if (imm != null) {
                    imm.showSoftInput(appAwarenessInputView, android.view.inputmethod.InputMethodManager.SHOW_IMPLICIT);
                }
            } else {
                appAwarenessInputView.setVisibility(View.GONE);
                appAwarenessInputView.clearFocus();
                appAwarenessInputView.setText("");
            }

            appAwarenessButtonsContainer.removeAllViews();
            int buttonCount = buttons == null ? 0 : buttons.length();
            int totalButtonCount = buttonCount + (allowClose ? 1 : 0);
            appAwarenessButtonsContainer.setVisibility(totalButtonCount > 0 ? View.VISIBLE : View.GONE);
            for (int index = 0; index < buttonCount; index++) {
                org.json.JSONObject button = buttons.optJSONObject(index);
                if (button == null) {
                    continue;
                }

                appendAppAwarenessButton(button, index);
            }

            if (allowClose) {
                org.json.JSONObject closeButton = new org.json.JSONObject();
                closeButton.put("id", "workflow-cancel");
                closeButton.put("label", "关闭");
                closeButton.put("style", "danger");
                appendAppAwarenessButton(closeButton, buttonCount);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to show app-awareness overlay", e);
        }
    }

    private void updateAppAwarenessOverlayInternal(String payloadJson) {
        if (!isAppAwarenessMode || appAwarenessScrollView == null || appAwarenessPanel == null) {
            showAppAwarenessOverlayInternal(payloadJson);
            return;
        }

        try {
            pendingAppAwarenessPayloadJson = payloadJson;
            org.json.JSONObject payload = new org.json.JSONObject(payloadJson);

            String progressText = payload.optString("progressText", "");
            if (progressText.isEmpty()) {
                appAwarenessProgressView.setVisibility(View.GONE);
            } else {
                appAwarenessProgressView.setVisibility(View.VISIBLE);
                appAwarenessProgressView.setText(progressText);
            }

            appAwarenessTitleView.setText(payload.optString("title", "应用感知"));
            appAwarenessBodyView.setText(payload.optString("body", ""));
            bindAppAwarenessCountdown(payload);
        } catch (Exception e) {
            Log.e(TAG, "Failed to update app-awareness overlay", e);
        }
    }

    private void appendAppAwarenessButton(org.json.JSONObject button, int index) {
        if (button == null || appAwarenessButtonsContainer == null) {
            return;
        }

        final String actionId = button.optString("id", "");
        final String value = button.isNull("value") ? null : button.optString("value", null);
        final boolean submitTextValue = button.optBoolean("submitTextValue", false);
        final String style = button.optString("style", "primary");

        android.widget.TextView buttonView = new android.widget.TextView(this);
        buttonView.setText(button.optString("label", "继续"));
        buttonView.setGravity(Gravity.CENTER);
        buttonView.setTextSize(TypedValue.COMPLEX_UNIT_DIP, 15);
        buttonView.setTypeface(
                android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD));
        buttonView.setPadding(dpToPx(16), dpToPx(14), dpToPx(16), dpToPx(14));
        buttonView.setBackground(createButtonBackground(style));
        buttonView.setClickable(true);
        buttonView.setFocusable(true);
        buttonView.setTextColor("primary".equals(style)
                ? Color.WHITE
                : ("danger".equals(style) ? Color.parseColor("#B91C1C") : Color.parseColor("#292524")));

        android.widget.LinearLayout.LayoutParams buttonParams = new android.widget.LinearLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.WRAP_CONTENT);
        if (index > 0) {
            buttonParams.topMargin = dpToPx(10);
        }

        buttonView.setOnClickListener((view) -> {
            String resolvedValue = value;
            if (submitTextValue) {
                resolvedValue = appAwarenessInputView.getText() == null
                        ? ""
                        : appAwarenessInputView.getText().toString();
            }
            AppUsagePlugin.handleAppAwarenessOverlayAction(actionId, resolvedValue);
        });

        appAwarenessButtonsContainer.addView(buttonView, buttonParams);
    }

    private void bindAppAwarenessCountdown(org.json.JSONObject payload) {
        if (appAwarenessCountdownView == null) {
            return;
        }

        int countdownSeconds = payload.optInt("countdownSeconds", -1);
        if (countdownSeconds < 0) {
            appAwarenessCountdownView.setVisibility(View.GONE);
            appAwarenessCountdownView.setText("");
            return;
        }

        appAwarenessCountdownView.setVisibility(View.VISIBLE);
        appAwarenessCountdownView.setText(String.valueOf(Math.max(0, countdownSeconds)));
    }

    private void hideAppAwarenessOverlayInternal() {
        if (!isAppAwarenessMode) {
            return;
        }

        isAppAwarenessMode = false;
        appAwarenessInputView.clearFocus();
        android.view.inputmethod.InputMethodManager imm =
                (android.view.inputmethod.InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
        if (imm != null) {
            imm.hideSoftInputFromWindow(appAwarenessInputView.getWindowToken(), 0);
        }

        if (appAwarenessScrollView != null) {
            appAwarenessScrollView.setVisibility(View.GONE);
        }
        detachAppAwarenessWindow();
    }

    private void showAppAwarenessTimerBarInternal(String payloadJson) {
        if (appAwarenessTimerFloatingView == null || appAwarenessTimerTitleView == null || appAwarenessTimerTimeView == null) {
            return;
        }

        try {
            org.json.JSONObject payload = new org.json.JSONObject(payloadJson);
            ensureAppAwarenessTimerWindowAttached();
            appAwarenessTimerTitleView.setText(payload.optString("title", "应用感知计时中"));
            appAwarenessTimerTimeView.setText(payload.optString("timeText", "00:00"));
            appAwarenessTimerFloatingView.setVisibility(View.VISIBLE);
        } catch (Exception e) {
            Log.e(TAG, "Failed to show app-awareness timer bar", e);
        }
    }

    private void updateAppAwarenessTimerBarInternal(String payloadJson) {
        if (!isAppAwarenessTimerAttached || appAwarenessTimerFloatingView == null) {
            showAppAwarenessTimerBarInternal(payloadJson);
            return;
        }

        try {
            org.json.JSONObject payload = new org.json.JSONObject(payloadJson);
            appAwarenessTimerTimeView.setText(payload.optString("timeText", "00:00"));
        } catch (Exception e) {
            Log.e(TAG, "Failed to update app-awareness timer bar", e);
        }
    }

    private void hideAppAwarenessTimerBarInternal() {
        if (appAwarenessTimerFloatingView != null) {
            appAwarenessTimerFloatingView.setVisibility(View.GONE);
        }
        detachAppAwarenessTimerWindow();
    }

    private void registerAppChangeReceiver() {
        appChangeReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                Log.i(TAG, "📥 Broadcast received!");
                String packageName = intent.getStringExtra("packageName");
                String appLabel = intent.getStringExtra("appLabel");
                Log.i(TAG, "Package: " + packageName + ", Label: " + appLabel + ", isFocusing: " + isFocusing);

                if (packageName != null && !isFocusing) {
                    updateAppIconInternal(packageName, appLabel);
                } else {
                    Log.w(TAG, "Skipped update: packageName=" + packageName + ", isFocusing=" + isFocusing);
                }
            }
        };
        IntentFilter filter = new IntentFilter("com.mistycrown.lumostime.APP_CHANGED");

        // Android 13+ requires explicit export flag
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(appChangeReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(appChangeReceiver, filter);
        }
        Log.d(TAG, "Registered app change receiver");
    }

    private void updateAppIconInternal(String packageName, String appLabel) {
        if (packageName.equals(currentAppPackage)) {
            return; // No change
        }

        // Fix: If we were in prompt mode for an app, and user switched to another app,
        // clear the prompt
        if (isPromptMode && !packageName.equals(promptPackageName)) {
            Log.d(TAG, "User switched from " + promptPackageName + " to " + packageName + ", clearing prompt.");
            hidePrompt();
        }

        currentAppPackage = packageName;

        try {
            PackageManager pm = getPackageManager();
            Drawable appIcon = pm.getApplicationIcon(packageName);
            iconView.setImageDrawable(appIcon);

            // Ensure icon is visible and others hidden
            iconView.setVisibility(View.VISIBLE);
            if (emojiView != null)
                emojiView.setVisibility(View.GONE);
            if (timeView != null)
                timeView.setVisibility(View.GONE);

            Log.i(TAG, "✅ Updated icon for:: " + packageName);
        } catch (PackageManager.NameNotFoundException e) {
            Log.w(TAG, "❌ Could not find app icon for: " + packageName);
            // Fallback to default
            try {
                iconView.setImageDrawable(getPackageManager().getApplicationIcon(getPackageName()));
                iconView.setVisibility(View.VISIBLE);
            } catch (Exception ex) {
                iconView.setImageResource(android.R.drawable.sym_def_app_icon);
            }
        }
    }

    private int resolveOverlayLayoutType() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        }
        return WindowManager.LayoutParams.TYPE_PHONE;
    }

    private void initBubbleView() {
        if (floatingView != null || windowManager == null) {
            return;
        }
        // 容器
        containerView = new android.widget.FrameLayout(this);
        android.graphics.drawable.GradientDrawable bg = new android.graphics.drawable.GradientDrawable();
        bg.setShape(android.graphics.drawable.GradientDrawable.OVAL);
        bg.setColor(Color.WHITE);
        // Add subtle shadow/stroke
        bg.setStroke(1, Color.parseColor("#E5E7EB")); // Stone-200
        containerView.setBackground(bg);

        // 只有API 21+支持Elevation，不过现在基本都支持
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            containerView.setElevation(5f); // Reduced elevation for lighter shadow
        }

        // App Icon (默认显示)
        iconView = new android.widget.ImageView(this);
        try {
            iconView.setImageDrawable(getPackageManager().getApplicationIcon(getPackageName()));
        } catch (Exception e) {
            // fallback
            iconView.setImageResource(android.R.drawable.sym_def_app_icon);
            e.printStackTrace();
        }
        android.widget.FrameLayout.LayoutParams iconParams = new android.widget.FrameLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.MATCH_PARENT);
        int padding = dpToPx(8); // Reduced padding to make icon larger
        iconParams.setMargins(padding, padding, padding, padding);
        containerView.addView(iconView, iconParams);

        // Emoji Text (专注时显示)
        emojiView = new TextView(this);
        emojiView.setTextColor(Color.parseColor("#374151")); // Gray-700
        emojiView.setGravity(Gravity.CENTER);
        // Use DP for Emoji size too
        emojiView.setTextSize(TypedValue.COMPLEX_UNIT_DIP, 17);
        emojiView.setVisibility(View.GONE);
        containerView.addView(emojiView, new android.widget.FrameLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.MATCH_PARENT));

        // Time View
        timeView = new TextView(this);
        timeView.setTextColor(Color.parseColor("#4B5563")); // Gray-600
        timeView.setGravity(Gravity.CENTER);
        // Use DP for Time size
        timeView.setTextSize(TypedValue.COMPLEX_UNIT_DIP, 11);
        // Use SERIF to approximate "Song" style (Huawen Zhongsong)
        // Add BOLD to make it legible
        timeView.setTypeface(
                android.graphics.Typeface.create(android.graphics.Typeface.SERIF, android.graphics.Typeface.BOLD));
        timeView.setVisibility(View.GONE);
        containerView.addView(timeView, new android.widget.FrameLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.MATCH_PARENT));

        floatingView = containerView;

        int sizePx = dpToPx(45); // Reduced from 50dp to 45dp
        params = new WindowManager.LayoutParams(
                sizePx, sizePx, // 稍微加大一点
                resolveOverlayLayoutType(),
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT);

        params.gravity = Gravity.TOP | Gravity.START;
        params.x = bubbleX;
        params.y = bubbleY;

        setupTouchListener();

        try {
            windowManager.addView(floatingView, params);
            Log.d(TAG, "✅ 悬浮窗已添加到屏幕");
        } catch (Exception e) {
            Log.e(TAG, "Add view failed", e);
        }
    }

    private boolean isSideBubbleEnabled() {
        return getSharedPreferences(SIDE_BUBBLE_PREFS, MODE_PRIVATE)
                .getBoolean(KEY_SIDE_BUBBLE_ENABLED, false);
    }

    private void removeSideBubbleView() {
        handler.removeCallbacks(updateRunnable);
        isFocusing = false;
        currentSessionId = null;

        if (floatingView == null || windowManager == null) {
            return;
        }

        try {
            windowManager.removeView(floatingView);
        } catch (Exception e) {
            Log.e(TAG, "Remove side bubble failed", e);
        }
        floatingView = null;
        containerView = null;
        emojiView = null;
        timeView = null;
        iconView = null;
        params = null;
    }

    private void initAppAwarenessWindow() {
        android.widget.FrameLayout overlayContainer = new android.widget.FrameLayout(this);
        overlayContainer.setBackgroundColor(Color.parseColor("#F7F4EE"));
        overlayContainer.setClickable(true);
        overlayContainer.setFocusable(true);

        appAwarenessScrollView = new android.widget.ScrollView(this);
        appAwarenessScrollView.setVisibility(View.GONE);
        appAwarenessScrollView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        appAwarenessScrollView.setFillViewport(true);

        appAwarenessPanel = new android.widget.LinearLayout(this);
        appAwarenessPanel.setOrientation(android.widget.LinearLayout.VERTICAL);
        int horizontalPadding = dpToPx(20);
        appAwarenessPanel.setPadding(
                horizontalPadding,
                getStatusBarHeight() + dpToPx(18),
                horizontalPadding,
                dpToPx(24));

        appAwarenessProgressView = new TextView(this);
        appAwarenessProgressView.setTextColor(Color.parseColor("#78716C"));
        appAwarenessProgressView.setTextSize(TypedValue.COMPLEX_UNIT_DIP, 12);
        appAwarenessProgressView.setVisibility(View.GONE);
        appAwarenessPanel.addView(appAwarenessProgressView);

        appAwarenessTitleView = new TextView(this);
        appAwarenessTitleView.setTextColor(Color.parseColor("#1C1917"));
        appAwarenessTitleView.setTextSize(TypedValue.COMPLEX_UNIT_DIP, 28);
        appAwarenessTitleView.setTypeface(
                android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD));
        android.widget.LinearLayout.LayoutParams titleParams = new android.widget.LinearLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.WRAP_CONTENT);
        titleParams.topMargin = dpToPx(14);
        appAwarenessPanel.addView(appAwarenessTitleView, titleParams);

        appAwarenessBodyView = new TextView(this);
        appAwarenessBodyView.setTextColor(Color.parseColor("#57534E"));
        appAwarenessBodyView.setTextSize(TypedValue.COMPLEX_UNIT_DIP, 16);
        appAwarenessBodyView.setLineSpacing(0f, 1.25f);
        appAwarenessBodyView.setGravity(Gravity.START);
        android.widget.LinearLayout.LayoutParams bodyParams = new android.widget.LinearLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.WRAP_CONTENT);
        bodyParams.topMargin = dpToPx(14);
        appAwarenessPanel.addView(appAwarenessBodyView, bodyParams);

        appAwarenessCountdownView = new TextView(this);
        appAwarenessCountdownView.setTextColor(Color.parseColor("#1C1917"));
        appAwarenessCountdownView.setTextSize(TypedValue.COMPLEX_UNIT_DIP, 42);
        appAwarenessCountdownView.setGravity(Gravity.START);
        appAwarenessCountdownView.setTypeface(
                android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD));
        appAwarenessCountdownView.setVisibility(View.GONE);
        android.widget.LinearLayout.LayoutParams countdownParams = new android.widget.LinearLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.WRAP_CONTENT);
        countdownParams.topMargin = dpToPx(24);
        appAwarenessPanel.addView(appAwarenessCountdownView, countdownParams);

        appAwarenessInputHintView = new TextView(this);
        appAwarenessInputHintView.setTextColor(Color.parseColor("#A8A29E"));
        appAwarenessInputHintView.setTextSize(TypedValue.COMPLEX_UNIT_DIP, 12);
        appAwarenessInputHintView.setVisibility(View.GONE);
        android.widget.LinearLayout.LayoutParams hintParams = new android.widget.LinearLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.WRAP_CONTENT);
        hintParams.topMargin = dpToPx(22);
        appAwarenessPanel.addView(appAwarenessInputHintView, hintParams);

        appAwarenessInputView = new android.widget.EditText(this);
        appAwarenessInputView.setVisibility(View.GONE);
        appAwarenessInputView.setMinLines(3);
        appAwarenessInputView.setMaxLines(6);
        appAwarenessInputView.setTextColor(Color.parseColor("#1C1917"));
        appAwarenessInputView.setHintTextColor(Color.parseColor("#A8A29E"));
        appAwarenessInputView.setBackground(createInputBackground());
        appAwarenessInputView.setPadding(dpToPx(14), dpToPx(12), dpToPx(14), dpToPx(12));
        appAwarenessInputView.setTextSize(TypedValue.COMPLEX_UNIT_DIP, 16);
        android.widget.LinearLayout.LayoutParams inputParams = new android.widget.LinearLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.WRAP_CONTENT);
        inputParams.topMargin = dpToPx(10);
        appAwarenessPanel.addView(appAwarenessInputView, inputParams);

        android.widget.Space contentSpacer = new android.widget.Space(this);
        android.widget.LinearLayout.LayoutParams spacerParams = new android.widget.LinearLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1f);
        spacerParams.topMargin = dpToPx(20);
        appAwarenessPanel.addView(contentSpacer, spacerParams);

        appAwarenessButtonsContainer = new android.widget.LinearLayout(this);
        appAwarenessButtonsContainer.setOrientation(android.widget.LinearLayout.VERTICAL);
        android.widget.LinearLayout.LayoutParams buttonGroupParams = new android.widget.LinearLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.WRAP_CONTENT);
        buttonGroupParams.topMargin = dpToPx(12);
        appAwarenessPanel.addView(appAwarenessButtonsContainer, buttonGroupParams);

        appAwarenessScrollView.addView(appAwarenessPanel, new android.widget.FrameLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.MATCH_PARENT));
        overlayContainer.addView(appAwarenessScrollView, new android.widget.FrameLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.MATCH_PARENT));

        appAwarenessFloatingView = overlayContainer;
        appAwarenessParams = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                resolveOverlayLayoutType(),
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT);
        appAwarenessParams.gravity = Gravity.TOP | Gravity.START;
        appAwarenessParams.x = 0;
        appAwarenessParams.y = 0;
        appAwarenessParams.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE;
    }

    private void initAppAwarenessTimerWindow() {
        android.widget.LinearLayout timerContainer = new android.widget.LinearLayout(this);
        timerContainer.setOrientation(android.widget.LinearLayout.VERTICAL);
        timerContainer.setPadding(dpToPx(14), dpToPx(10), dpToPx(14), dpToPx(10));
        timerContainer.setBackground(createPanelBackground());
        timerContainer.setClickable(true);
        timerContainer.setMinimumWidth(dpToPx(148));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            timerContainer.setElevation(10f);
        }

        appAwarenessTimerTitleView = new TextView(this);
        appAwarenessTimerTitleView.setTextColor(Color.parseColor("#57534E"));
        appAwarenessTimerTitleView.setTextSize(TypedValue.COMPLEX_UNIT_DIP, 12);
        appAwarenessTimerTitleView.setSingleLine(true);
        appAwarenessTimerTitleView.setGravity(Gravity.CENTER_HORIZONTAL);
        timerContainer.addView(appAwarenessTimerTitleView, new android.widget.LinearLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.WRAP_CONTENT));

        appAwarenessTimerTimeView = new TextView(this);
        appAwarenessTimerTimeView.setTextColor(Color.parseColor("#1C1917"));
        appAwarenessTimerTimeView.setTextSize(TypedValue.COMPLEX_UNIT_DIP, 18);
        appAwarenessTimerTimeView.setTypeface(
                android.graphics.Typeface.create(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD));
        appAwarenessTimerTimeView.setMinEms(5);
        appAwarenessTimerTimeView.setGravity(Gravity.CENTER_HORIZONTAL);
        android.widget.LinearLayout.LayoutParams timeParams = new android.widget.LinearLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.WRAP_CONTENT);
        timeParams.topMargin = dpToPx(2);
        timerContainer.addView(appAwarenessTimerTimeView, timeParams);

        appAwarenessTimerFloatingView = timerContainer;
        appAwarenessTimerFloatingView.setVisibility(View.GONE);
        appAwarenessTimerParams = new WindowManager.LayoutParams(
                dpToPx(148),
                WindowManager.LayoutParams.WRAP_CONTENT,
                resolveOverlayLayoutType(),
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT);
        appAwarenessTimerParams.gravity = Gravity.TOP | Gravity.START;
        appAwarenessTimerParams.x = appAwarenessTimerX;
        appAwarenessTimerParams.y = getStatusBarHeight() + dpToPx(8);
        appAwarenessTimerY = appAwarenessTimerParams.y;

        setupAppAwarenessTimerTouchListener();
    }

    private void setupAppAwarenessTimerTouchListener() {
        if (appAwarenessTimerFloatingView == null) {
            return;
        }

        appAwarenessTimerFloatingView.setOnTouchListener(new View.OnTouchListener() {
            private int initialX;
            private int initialY;
            private float initialTouchX;
            private float initialTouchY;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                if (appAwarenessTimerParams == null || windowManager == null) {
                    return false;
                }

                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = appAwarenessTimerParams.x;
                        initialY = appAwarenessTimerParams.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        appAwarenessTimerParams.x = initialX + (int) (event.getRawX() - initialTouchX);
                        appAwarenessTimerParams.y = initialY + (int) (event.getRawY() - initialTouchY);
                        windowManager.updateViewLayout(appAwarenessTimerFloatingView, appAwarenessTimerParams);
                        return true;
                    case MotionEvent.ACTION_UP:
                        appAwarenessTimerX = appAwarenessTimerParams.x;
                        appAwarenessTimerY = appAwarenessTimerParams.y;
                        return true;
                    default:
                        return false;
                }
            }
        });
    }

    private void updateContent(String icon, boolean focusing, long start, String sessionId) {
        if (containerView == null)
            return;

        this.isFocusing = focusing;
        this.startTime = start;
        this.lastNotificationElapsedSeconds = -1L;
        this.currentSessionId = normalizeSessionId(sessionId);

        if (focusing) {
            // Start Focusing Mode
            iconView.setVisibility(View.GONE);

            if (icon != null && !icon.isEmpty()) {
                emojiView.setText(icon);
            }
            // Reset to Time initially
            emojiView.setVisibility(View.GONE);
            iconView.setVisibility(View.GONE);
            timeView.setVisibility(View.VISIBLE);
            timeView.setScaleY(1f); // Ensure scale is reset
            currentDisplayState = 0;

            handler.removeCallbacks(updateRunnable);
            handler.post(updateRunnable);
            updateNotification("悬浮球计时中，点击可结束当前专注");
        } else {
            // Stop Focusing Mode -> Show App Icon
            handler.removeCallbacks(updateRunnable);
            lastNotificationElapsedSeconds = -1L;
            currentSessionId = null;

            // Clean up animations
            emojiView.animate().cancel();
            timeView.animate().cancel();
            iconView.animate().cancel();

            emojiView.setVisibility(View.GONE);
            timeView.setVisibility(View.GONE);

            iconView.setScaleY(1f);
            iconView.setVisibility(View.VISIBLE);
            updateNotification("悬浮球已开启，点击可返回 LumosTime");
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "悬浮球服务",
                    NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("保持 LumosTime 悬浮球在后台持续运行");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification(String contentText) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                notificationIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        return new androidx.core.app.NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("LumosTime 悬浮球运行中")
                .setContentText(contentText)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setSilent(true)
                .setPriority(androidx.core.app.NotificationCompat.PRIORITY_LOW)
                .build();
    }

    private void updateNotification(String contentText) {
        UnifiedServiceNotificationManager.setFloatingWindowState(this, true, this.isFocusing);
        UnifiedServiceNotificationManager.reconcileNotificationState(this);
    }

    private void setupTouchListener() {
        floatingView.setOnTouchListener(new View.OnTouchListener() {
            private int initialX;
            private int initialY;
            private float initialTouchX;
            private float initialTouchY;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = params.x;
                        initialY = params.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        isMoving = false;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        int dx = (int) (event.getRawX() - initialTouchX);
                        int dy = (int) (event.getRawY() - initialTouchY);
                        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                            isMoving = true;
                        }
                        params.x = initialX + dx;
                        params.y = initialY + dy;
                        windowManager.updateViewLayout(floatingView, params);
                        return true;
                    case MotionEvent.ACTION_UP:
                        bubbleX = params.x;
                        bubbleY = params.y;
                        if (!isMoving) {
                            // 点击事件
                            openApp();
                        }
                        return true;
                }
                return false;
            }
        });
    }

    private void openApp() {
        try {
            // 如果当前是专注状态,通知React Native结束计时
            if (isFocusing) {
                Log.d(TAG, "🎯 悬浮球点击: 专注状态 -> 触发结束计时");
                WidgetRuntimeState stoppedWidgetRuntime = WidgetTimerController.stopWidgetRuntimeFromExternalTrigger(this);
                if (stoppedWidgetRuntime != null) {
                    FocusNotificationPlugin.triggerStopFocusFromFloating(stoppedWidgetRuntime.getId());
                } else {
                    String normalizedSessionId = normalizeSessionId(currentSessionId);
                    if (normalizedSessionId != null) {
                        FocusNotificationPlugin.triggerStopFocusFromFloating(normalizedSessionId);
                    } else {
                        FocusNotificationPlugin.triggerStopFocusFromFloating();
                    }
                }
                AppUsagePlugin.stopActiveAppAwarenessTimerFromFloatingBall();
                updateContent("", false, 0L, null);
                return;
            }

            // 如果是提醒模式,隐藏提醒并显示"开始计时"
            if (isPromptMode) {
                Log.d(TAG, "🎯 悬浮球点击: 提醒模式 -> 开始计时 " + promptAppLabel);

                // 1. 触发React Native开始计时
                FocusNotificationPlugin.triggerStartFocusFromPrompt(promptPackageName, promptAppLabel,
                        promptRealAppName, promptActivityId);

                // 2. 隐藏提醒,显示"开始计时"
                hidePrompt();
                showTempText("开始计时");
                return;
            }

            // 空闲状态: 打开应用
            Log.d(TAG, "🎯 悬浮球点击: 空闲状态 -> 打开应用");
            Intent intent = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_BROUGHT_TO_FRONT);
                startActivity(intent);

                // 收起通知栏（可选，如果在通知栏点击的话）
                // Intent closeIntent = new Intent(Intent.ACTION_CLOSE_SYSTEM_DIALOGS);
                // sendBroadcast(closeIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Open app failed", e);
        }
    }

    private String normalizeSessionId(String sessionId) {
        if (sessionId == null) {
            return null;
        }

        String trimmed = sessionId.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
