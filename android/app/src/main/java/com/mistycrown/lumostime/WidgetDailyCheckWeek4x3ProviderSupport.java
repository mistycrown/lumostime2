package com.mistycrown.lumostime;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Provider wiring for the compact scrollable daily-check weekly widget.
 * Updated 2026-08-10: Unified date, refresh, weekday header, and scrollable matrix styling.
 * Updated 2026-08-10: Moved the weekday header into the collection to guarantee one rendered row.
 * Updated 2026-08-12: Animates the manual refresh icon during compact widget redraws.
 */
public final class WidgetDailyCheckWeek4x3ProviderSupport {
    public static final String ACTION_REFRESH =
            "com.mistycrown.lumostime.action.REFRESH_DAILY_CHECK_WEEK_4X3";
    private static final String EXTRA_APPWIDGET_ID = "daily_check_week_4x3_app_widget_id";
    private static final String REMOTE_VIEWS_VERSION = "v4";

    private WidgetDailyCheckWeek4x3ProviderSupport() {}

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
                QuickLogWidgetDailyCheckWeek4x3.refreshAllAsync(context);
            }
            return;
        }

        if (Intent.ACTION_DATE_CHANGED.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action)) {
            QuickLogWidgetDailyCheckWeek4x3.refreshAllAsync(context);
        }
    }

    public static void updateWidgets(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        if (appWidgetIds == null || appWidgetIds.length == 0) {
            return;
        }

        WidgetDailySyncPayload payload = WidgetStores.INSTANCE.loadDailySyncPayload(context);
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(
                    context.getPackageName(),
                    R.layout.widget_layout_daily_check_week_4x3
            );
            Intent serviceIntent = new Intent(context, WidgetDailyCheckWeek4x3RemoteViewsService.class);
            serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            serviceIntent.setData(Uri.parse(
                    "lumostime://daily-check-week-4x3/" + REMOTE_VIEWS_VERSION + "/" + appWidgetId
            ));

            views.setRemoteAdapter(R.id.widget_daily_check_week_4x3_list, serviceIntent);
            views.setEmptyView(
                    R.id.widget_daily_check_week_4x3_list,
                    R.id.widget_daily_check_week_4x3_empty
            );
            views.setTextViewText(
                    R.id.widget_daily_check_week_4x3_date,
                    formatWeekRange(payload)
            );
            views.setImageViewResource(
                    R.id.widget_daily_check_week_4x3_refresh,
                    WidgetRefreshIconResolver.resolve(context, appWidgetId)
            );
            views.setOnClickPendingIntent(
                    R.id.widget_daily_check_week_4x3_refresh,
                    buildRefreshPendingIntent(context, appWidgetId)
            );
            manager.notifyAppWidgetViewDataChanged(
                    new int[] { appWidgetId },
                    R.id.widget_daily_check_week_4x3_list
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
        Intent intent = new Intent(context, QuickLogWidgetDailyCheckWeek4x3.class);
        intent.setAction(ACTION_REFRESH);
        intent.putExtra(EXTRA_APPWIDGET_ID, appWidgetId);
        return PendingIntent.getBroadcast(
                context,
                appWidgetId + 8700,
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
