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
    private TextView switchStateView;
    // private TextView appNameView; // Debug removed
    private android.widget.ImageView iconView;
    private android.widget.FrameLayout containerView;
    private BroadcastReceiver appChangeReceiver;
    private String currentAppPackage = "";

    // State
    private boolean isMoving = false;
    private boolean isFocusing = false;
    private boolean isSwitching = false;
    private long startTime = 0;
    private long switchingStartTime = 0; // Track when switching started
    private android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
    private static final long CYCLE_DURATION = 9000; // 5s Time + 2s Emoji + 2s Icon
    private static final long SHOW_TIME_DURATION = 5000;
    private static final long SHOW_EMOJI_DURATION = 7000; // 5s to 7s

    private int currentDisplayState = 0; // 0: Time, 1: Emoji, 2: Icon

    private Runnable updateRunnable = new Runnable() {
        @Override
        public void run() {
            if (!isFocusing)
                return;

            long now = System.currentTimeMillis();
            long cycleTime = now % CYCLE_DURATION;

            // Native Timeout Check (60s)
            if (isSwitching && isFocusing) {
                if (now - switchingStartTime > 60000) {
                    Log.i(TAG, "⏰ Native Timeout Triggered! Ending Session Visuals.");
                    isSwitching = false;
                    isFocusing = false;
                    updateContent(null, false, 0); // Reset to default state
                    showTempTextInternal("自动结束");
                    return; // Next cycle will handle the rest
                }
            }

            int newState;
            if (cycleTime < SHOW_TIME_DURATION) {
                newState = 0; // Time
            } else if (cycleTime < SHOW_EMOJI_DURATION) {
                newState = 1; // Emoji
            } else {
                newState = isSwitching ? 3 : 2; // Icon or SwitchText
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
            case 3:
                return switchStateView;
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
        Log.d(TAG, "🔴 悬浮窗服务销毁");
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
        if (instance != null) {
            instance.updateAppIconInternal(packageName, appLabel);
        } else {
            Log.w(TAG, "FloatingWindowService instance is null, cannot update");
        }
    }

    public static void setSwitchingPending(boolean pending) {
        if (instance != null) {
            if (pending && !instance.isSwitching) {
                instance.switchingStartTime = System.currentTimeMillis();
            }
            instance.isSwitching = pending;
        }
    }

    public static void showTempText(String text) {
        if (instance != null) {
            new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
                instance.showTempTextInternal(text);
            });
        }
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

    private void showTempTextInternal(String text) {
        if (timeView != null) {
            // Temporarily override display to show text
            handler.removeCallbacks(updateRunnable); // Pause the cycle

            // Hide others
            if (emojiView != null)
                emojiView.setVisibility(View.GONE);
            if (iconView != null)
                iconView.setVisibility(View.GONE);

            // Show text
            timeView.setText(text);
            timeView.setTextSize(TypedValue.COMPLEX_UNIT_DIP, 11);
            timeView.setVisibility(View.VISIBLE);
            timeView.setScaleY(1f);

            // Resume cycle after 2 seconds (or wait for next update)
            handler.postDelayed(updateRunnable, 2000);
        }
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

        // Switch State View
        switchStateView = new TextView(this);
        switchStateView.setText("切换页面");
        switchStateView.setTextColor(Color.parseColor("#EF4444")); // Red-500
        switchStateView.setGravity(Gravity.CENTER);
        switchStateView.setTextSize(TypedValue.COMPLEX_UNIT_DIP, 11);
        switchStateView.setTypeface(
                android.graphics.Typeface.create(android.graphics.Typeface.SERIF, android.graphics.Typeface.BOLD));
        switchStateView.setVisibility(View.GONE);
        containerView.addView(switchStateView, new android.widget.FrameLayout.LayoutParams(
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
