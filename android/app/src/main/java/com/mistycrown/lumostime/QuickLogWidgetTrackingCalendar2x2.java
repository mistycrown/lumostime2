package com.mistycrown.lumostime;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

/**
 * Dedicated 2x2 tracking-calendar widget provider.
 */
public class QuickLogWidgetTrackingCalendar2x2 extends AppWidgetProvider {
    public static final String WIDGET_SIZE = WidgetSizes.SIZE_2X2;

    public static void refreshAllAsync(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName componentName = new ComponentName(context, QuickLogWidgetTrackingCalendar2x2.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(componentName);
        updateWidgets(context, appWidgetManager, appWidgetIds);
    }

    public static void refreshWidget(Context context, int appWidgetId) {
        if (appWidgetId <= 0) {
            return;
        }
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        updateWidgets(context, appWidgetManager, new int[] { appWidgetId });
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        updateWidgets(context, appWidgetManager, appWidgetIds);
    }

    @Override
    public void onDeleted(Context context, int[] appWidgetIds) {
        super.onDeleted(context, appWidgetIds);
        WidgetProviderSupport.onDeleted(context, appWidgetIds);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (WidgetTrackingCalendarProviderSupport.handleCommonReceive(context, intent)) {
            return;
        }
    }

    private static void updateWidgets(
            Context context,
            AppWidgetManager appWidgetManager,
            int[] appWidgetIds
    ) {
        WidgetTrackingCalendarProviderSupport.updateWidgets(
                context,
                appWidgetManager,
                appWidgetIds,
                R.layout.widget_layout_tracking_calendar_2x2,
                QuickLogWidgetTrackingCalendar2x2.class
        );
    }
}
