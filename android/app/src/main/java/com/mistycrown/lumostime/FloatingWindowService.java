package com.mistycrown.lumostime;

import android.app.Service;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
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
    private WindowManager windowManager;
    private View floatingView;
    private WindowManager.LayoutParams params;

    private TextView emojiView;
    private TextView timeView;
    private android.widget.ImageView iconView;
    private android.widget.FrameLayout containerView;

    // State
    private boolean isMoving = false;
    private boolean isFocusing = false;
    private long startTime = 0;
    private android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
    private static final long CYCLE_DURATION = 7000;
    private static final long SHOW_TIME_DURATION = 5000;

    private boolean isShowingTime = false;
    private Runnable updateRunnable = new Runnable() {
        @Override
        public void run() {
            if (!isFocusing)
                return;

            long now = System.currentTimeMillis();
            long cycleTime = now % CYCLE_DURATION;

            boolean shouldShowTime = cycleTime < SHOW_TIME_DURATION;

            if (shouldShowTime) {
                // Update time text
                long elapsed = now - startTime;
                if (startTime <= 0 || elapsed > 24 * 60 * 60 * 1000L) {
                    elapsed = 0; // Prevent huge numbers if startTime is invalid
                }

                String timeText = formatDuration(elapsed);
                timeView.setText(timeText);

                // Adaptive Text Size: Force DP units in loop
                if (timeText.length() > 5) {
                    timeView.setTextSize(TypedValue.COMPLEX_UNIT_DIP, 9);
                } else {
                    timeView.setTextSize(TypedValue.COMPLEX_UNIT_DIP, 11);
                }

                if (!isShowingTime) {
                    // Switch to Time
                    flipViews(emojiView, timeView);
                    isShowingTime = true;
                }
            } else {
                if (isShowingTime) {
                    // Switch to Icon
                    flipViews(timeView, emojiView);
                    isShowingTime = false;
                }
            }

            handler.postDelayed(this, 500);
        }
    };

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
    }

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "🟢 悬浮窗服务 onCreate");

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        initView();
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
            timeView.setVisibility(View.VISIBLE);
            isShowingTime = true;

            handler.removeCallbacks(updateRunnable);
            handler.post(updateRunnable);
        } else {
            // Stop Focusing Mode -> Show App Icon
            handler.removeCallbacks(updateRunnable);

            // Clean up animations
            emojiView.animate().cancel();
            timeView.animate().cancel();

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
