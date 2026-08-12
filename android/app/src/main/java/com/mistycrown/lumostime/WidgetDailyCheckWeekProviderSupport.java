package com.mistycrown.lumostime;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Renders and refreshes the read-only daily-check weekly widget.
 * Updated 2026-08-10: Unified date, refresh, weekday header, and square-cell styling.
 * Updated 2026-08-12: Animates the manual refresh icon during 4x4 widget redraws.
 */
public final class WidgetDailyCheckWeekProviderSupport {
    public static final String ACTION_REFRESH =
            "com.mistycrown.lumostime.action.REFRESH_DAILY_CHECK_WEEK";
    private static final String EXTRA_APPWIDGET_ID = "daily_check_week_app_widget_id";

    private WidgetDailyCheckWeekProviderSupport() {}

    public static void handleReceive(Context context, Intent intent) {
        if (intent == null) {
            return;
        }

        String action = intent.getAction();
        if (ACTION_REFRESH.equals(action)) {
            int appWidgetId = intent.getIntExtra(EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
            if (appWidgetId > 0) {
                WidgetRefreshCoordinator.INSTANCE.refreshWidgetWithRefreshFeedback(context, appWidgetId);
            } else {
                QuickLogWidgetDailyCheckWeek4x4.refreshAllAsync(context);
            }
            return;
        }

        if (Intent.ACTION_DATE_CHANGED.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action)) {
            QuickLogWidgetDailyCheckWeek4x4.refreshAllAsync(context);
        }
    }

    public static void updateWidgets(
            Context context,
            AppWidgetManager manager,
            int[] appWidgetIds
    ) {
        if (appWidgetIds == null || appWidgetIds.length == 0) {
            return;
        }

        WidgetDailySyncPayload payload = WidgetStores.INSTANCE.loadDailySyncPayload(context);
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout_daily_check_week_4x4);
            views.setImageViewBitmap(
                    R.id.widget_daily_check_week_bitmap,
                    WidgetDailyCheckWeekBitmapRenderer.INSTANCE.render(context, appWidgetId, payload)
            );
            views.setTextViewText(
                    R.id.widget_daily_check_week_date,
                    formatWeekRange(payload)
            );
            views.setImageViewResource(
                    R.id.widget_daily_check_week_refresh_root,
                    WidgetRefreshIconResolver.resolve(context, appWidgetId)
            );
            views.setOnClickPendingIntent(
                    R.id.widget_daily_check_week_refresh_root,
                    buildRefreshPendingIntent(context, appWidgetId)
            );
            manager.updateAppWidget(appWidgetId, views);
        }
    }

    private static String formatWeekRange(WidgetDailySyncPayload payload) {
        String start = payload == null ? null : payload.getWeekStartDate();
        String end = payload == null ? null : payload.getWeekEndDate();
        if (start != null && end != null && start.length() >= 10 && end.length() >= 10) {
            return start.substring(5).replace('-', '/') + " - " + end.substring(5).replace('-', '/');
        }
        return new SimpleDateFormat("MM/dd", Locale.getDefault()).format(new Date());
    }

    private static PendingIntent buildRefreshPendingIntent(Context context, int appWidgetId) {
        Intent intent = new Intent(context, QuickLogWidgetDailyCheckWeek4x4.class);
        intent.setAction(ACTION_REFRESH);
        intent.putExtra(EXTRA_APPWIDGET_ID, appWidgetId);
        return PendingIntent.getBroadcast(
                context,
                appWidgetId + 8600,
                intent,
                pendingIntentFlags()
        );
    }

    private static int pendingIntentFlags() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return flags;
    }
}
