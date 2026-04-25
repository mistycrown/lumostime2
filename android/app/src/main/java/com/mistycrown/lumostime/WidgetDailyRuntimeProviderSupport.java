package com.mistycrown.lumostime;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Build;
import android.widget.RemoteViews;

/**
 * Shared rendering and tap handling for DAILY_RUNTIME widget variants.
 */
public final class WidgetDailyRuntimeProviderSupport {
    public static final String ACTION_TOGGLE_VIEW =
            "com.mistycrown.lumostime.action.TOGGLE_DAILY_RUNTIME_VIEW";
    private static final String EXTRA_APPWIDGET_ID = "daily_runtime_app_widget_id";

    private WidgetDailyRuntimeProviderSupport() {}

    public static boolean handleCommonReceive(Context context, Intent intent) {
        if (intent == null) {
            return false;
        }

        String action = intent.getAction();
        if (ACTION_TOGGLE_VIEW.equals(action)) {
            int appWidgetId = intent.getIntExtra(EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
            if (appWidgetId > 0) {
                String currentMode = WidgetStores.INSTANCE.loadDailyRuntimeViewMode(context, appWidgetId);
                String nextMode = WidgetDailyRuntimeViewModes.toggle(currentMode);
                WidgetStores.INSTANCE.saveDailyRuntimeViewMode(context, appWidgetId, nextMode);
                WidgetRefreshCoordinator.INSTANCE.refreshWidget(context, appWidgetId);
            }
            return true;
        }

        return Intent.ACTION_DATE_CHANGED.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action);
    }

    public static void removeViewModes(Context context, int[] appWidgetIds) {
        WidgetStores.INSTANCE.removeDailyRuntimeViewModes(context, appWidgetIds);
    }

    public static void updateWidgets(
            Context context,
            AppWidgetManager appWidgetManager,
            int[] appWidgetIds,
            int layoutResId,
            boolean compact,
            Class<?> providerClass
    ) {
        if (appWidgetIds == null || appWidgetIds.length == 0) {
            return;
        }

        WidgetDailyRuntimePayload payload = WidgetStores.INSTANCE.loadDailyRuntimePayload(context);
        if (!WidgetDailyRuntimeBitmapRenderer.INSTANCE.isPayloadForToday(payload)) {
            payload = null;
        }

        for (int appWidgetId : appWidgetIds) {
            String viewMode = WidgetStores.INSTANCE.loadDailyRuntimeViewMode(context, appWidgetId);
            Bitmap bitmap = compact
                    ? WidgetDailyRuntimeBitmapRenderer.INSTANCE.renderCompact(context, payload, viewMode)
                    : WidgetDailyRuntimeBitmapRenderer.INSTANCE.renderExpanded(context, payload, viewMode);
            String status = WidgetDailyRuntimeBitmapRenderer.INSTANCE.formatRuntimeStatus(
                    payload != null ? payload.getTotalMinutes() : 0
            );

            RemoteViews views = new RemoteViews(context.getPackageName(), layoutResId);
            PendingIntent openAppIntent = buildOpenAppPendingIntent(context, appWidgetId);
            PendingIntent toggleIntent = buildToggleIntent(context, appWidgetId, providerClass);
            views.setTextViewText(R.id.widget_daily_runtime_status, status);
            views.setImageViewBitmap(R.id.widget_daily_runtime_bitmap, bitmap);
            views.setOnClickPendingIntent(R.id.widget_daily_runtime_root, toggleIntent);
            views.setOnClickPendingIntent(R.id.widget_daily_runtime_bitmap, toggleIntent);
            views.setOnClickPendingIntent(R.id.widget_daily_runtime_header, openAppIntent);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    private static PendingIntent buildOpenAppPendingIntent(Context context, int appWidgetId) {
        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent == null) {
            launchIntent = new Intent(context, MainActivity.class);
        }

        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        launchIntent.setAction(Intent.ACTION_VIEW);
        launchIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        return PendingIntent.getActivity(
                context,
                appWidgetId + 4400,
                launchIntent,
                pendingIntentFlags()
        );
    }

    private static PendingIntent buildToggleIntent(Context context, int appWidgetId, Class<?> providerClass) {
        Intent toggleIntent = new Intent(context, providerClass);
        toggleIntent.setAction(ACTION_TOGGLE_VIEW);
        toggleIntent.putExtra(EXTRA_APPWIDGET_ID, appWidgetId);
        return PendingIntent.getBroadcast(
                context,
                appWidgetId + 5400,
                toggleIntent,
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
