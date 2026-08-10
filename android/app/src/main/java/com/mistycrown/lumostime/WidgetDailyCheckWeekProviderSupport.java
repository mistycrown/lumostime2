package com.mistycrown.lumostime;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.widget.RemoteViews;

/**
 * Renders and refreshes the read-only daily-check weekly widget.
 * Updated 2026-08-09: Added refresh-button handling for the 4x4 weekly widget.
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
                QuickLogWidgetDailyCheckWeek4x4.refreshWidget(context, appWidgetId);
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
            views.setOnClickPendingIntent(
                    R.id.widget_daily_check_week_refresh_root,
                    buildRefreshPendingIntent(context, appWidgetId)
            );
            manager.updateAppWidget(appWidgetId, views);
        }
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
