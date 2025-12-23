/**
 * @file FloatingWindowService.java
 * @input Intent Commands (Start/Stop/Update)
 * @output Floating UI Overlay
 * @pos Native Service
 * @description Background service managing the "LumosTime Island" floating window. Handles UI rendering, touch events, and state updates (Time/Icon/Emoji).
 */
package com.mistycrown.lumostime;

import android.app.Service;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;
import android.util.TypedValue;

/**
 * 悬浮窗服务
 * 用于在屏幕上显示悬浮球
 */
public class FloatingWindowService extends Service {
    private static final String TAG = "FloatingWindowService";
    private static FloatingWindowService instance = null;

    private WindowManager windowManager;
    private View floatingView;
    private WindowManager.LayoutParams params;

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
    private android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
    private static final long CYCLE_DURATION = 9000; // 5s Time + 2s Emoji + 2s Icon
    private static final long SHOW_TIME_DURATION = 5000;
    private static final long SHOW_EMOJI_DURATION = 7000; // 5s to 7s

    private int currentDisplayState = 0; // 0: Time, 1: Emoji, 2: Icon

    // 提醒模式状态
    private boolean isPromptMode = false;
    private String promptPackageName = "";
    private String promptAppLabel = ""; // 显示在悬浮球上的文本(可能是标签名)
    private String promptRealAppName = ""; // 真实的应用名称(如"小红书")
    private String promptActivityId = ""; // 关联的Activity ID

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
            String timeText = formatDuration(elapsed);
            timeView.setText(timeText);
            if (timeText.length() > 5) {
                timeView.setTextSize(TypedValue.COMPLEX_UNIT_DIP, 9);
            } else {
                timeView.setTextSize(TypedValue.COMPLEX_UNIT_DIP, 11);
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

            Log.d(TAG, "📥 Service onStartCommand: focus=" + focusing + ", start=" + start + ", icon=" + icon);
            updateContent(icon, focusing, start);
        }
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        instance = null;
        Log.d(TAG, "🔴 悬浮窗服务销毁, instance已清空");
        if (floatingView != null) {
            try {
                windowManager.removeView(floatingView);
            } catch (Exception e) {
                Log.e(TAG, "Remove view failed", e);
            }
            floatingView = null;
        }
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

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        initView();
        registerAppChangeReceiver();
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

    private void initView() {
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

        // App Name View removed
        // appNameView = new TextView(this);
        // ...

        floatingView = containerView;

        // Layout Params
        int layoutType;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutType = WindowManager.LayoutParams.TYPE_PHONE;
        }

        int sizePx = dpToPx(45); // Reduced from 50dp to 45dp
        params = new WindowManager.LayoutParams(
                sizePx, sizePx, // 稍微加大一点
                layoutType,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT);

        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 100;
        params.y = 200;

        setupTouchListener();

        try {
            windowManager.addView(floatingView, params);
            Log.d(TAG, "✅ 悬浮窗已添加到屏幕");
        } catch (Exception e) {
            Log.e(TAG, "Add view failed", e);
        }
    }

    private void updateContent(String icon, boolean focusing, long start) {
        if (containerView == null)
            return;

        this.isFocusing = focusing;
        this.startTime = start;

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
        } else {
            // Stop Focusing Mode -> Show App Icon
            handler.removeCallbacks(updateRunnable);

            // Clean up animations
            emojiView.animate().cancel();
            timeView.animate().cancel();
            iconView.animate().cancel();

            emojiView.setVisibility(View.GONE);
            timeView.setVisibility(View.GONE);

            iconView.setScaleY(1f);
            iconView.setVisibility(View.VISIBLE);
        }
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
                FocusNotificationPlugin.triggerStopFocusFromFloating();
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
}
