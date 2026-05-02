package com.mistycrown.lumostime;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Build;
import android.widget.RemoteViews;

/**
 * Shared rendering and title-cycle handling for tracking-calendar widgets.
 */
public final class WidgetTrackingCalendarProviderSupport {
    private static final String ACTION_CYCLE_TEMPLATE =
            "com.mistycrown.lumostime.action.CYCLE_TRACKING_CALENDAR_TEMPLATE";
    private static final String EXTRA_APPWIDGET_ID = "tracking_calendar_app_widget_id";

    private WidgetTrackingCalendarProviderSupport() {}

    public static boolean handleCommonReceive(Context context, Intent intent) {
        if (intent == null) {
            return false;
        }

        String action = intent.getAction();
        if (ACTION_CYCLE_TEMPLATE.equals(action)) {
            int appWidgetId = intent.getIntExtra(EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
            if (appWidgetId > 0) {
                WidgetStores.INSTANCE.cycleBindingToNextTemplate(
                        context,
                        appWidgetId,
                        WidgetSizes.SIZE_2X2,
                        WidgetTemplateTypes.TRACKING_CALENDAR
                );
                WidgetRefreshCoordinator.INSTANCE.refreshWidget(context, appWidgetId);
            }
            return true;
        }

        if (
                Intent.ACTION_DATE_CHANGED.equals(action)
                        || Intent.ACTION_TIME_CHANGED.equals(action)
                        || Intent.ACTION_TIMEZONE_CHANGED.equals(action)
        ) {
            QuickLogWidgetTrackingCalendar2x2.refreshAllAsync(context);
            return true;
        }

        return false;
    }

    public static void updateWidgets(
            Context context,
            AppWidgetManager appWidgetManager,
            int[] appWidgetIds,
            int layoutResId,
            Class<?> providerClass
    ) {
        if (appWidgetIds == null || appWidgetIds.length == 0) {
            return;
        }

        WidgetStores.INSTANCE.ensureBindings(
                context,
                appWidgetIds,
                WidgetSizes.SIZE_2X2,
                WidgetTemplateTypes.TRACKING_CALENDAR
        );
        WidgetTrackingCalendarPayload payload = WidgetStores.INSTANCE.loadTrackingCalendarPayload(context);

        for (int appWidgetId : appWidgetIds) {
            WidgetInstanceBinding binding = WidgetStores.INSTANCE.loadBinding(context, appWidgetId);
            WidgetTemplate template = WidgetStores.INSTANCE.loadTemplateForSize(
                    context,
                    binding != null ? binding.getTemplateId() : null,
                    WidgetSizes.SIZE_2X2,
                    WidgetTemplateTypes.TRACKING_CALENDAR
            );

            RemoteViews views = new RemoteViews(context.getPackageName(), layoutResId);
            Bitmap bitmap = WidgetTrackingCalendarBitmapRenderer.INSTANCE.render(
                    context,
                    appWidgetId,
                    template,
                    payload
            );
            String title = WidgetTrackingCalendarBitmapRenderer.INSTANCE.resolveTitle(template);
            PendingIntent cycleIntent = buildCycleIntent(context, appWidgetId, providerClass);

            views.setTextViewText(R.id.widget_title, title);
            views.setImageViewBitmap(R.id.widget_tracking_calendar_bitmap, bitmap);
            views.setOnClickPendingIntent(R.id.widget_title, cycleIntent);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    private static PendingIntent buildCycleIntent(Context context, int appWidgetId, Class<?> providerClass) {
        Intent cycleIntent = new Intent(context, providerClass);
        cycleIntent.setAction(ACTION_CYCLE_TEMPLATE);
        cycleIntent.putExtra(EXTRA_APPWIDGET_ID, appWidgetId);
        return PendingIntent.getBroadcast(
                context,
                appWidgetId + 6400,
                cycleIntent,
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
