package com.mistycrown.lumostime;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

/**
 * Displays every daily check with its current Monday-to-Sunday completion history.
 * Updated 2026-08-09: Added the dedicated 4x4 daily-check weekly statistics widget.
 */
public class QuickLogWidgetDailyCheckWeek4x4 extends AppWidgetProvider {
    public static void refreshAllAsync(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, QuickLogWidgetDailyCheckWeek4x4.class);
        updateWidgets(context, manager, manager.getAppWidgetIds(component));
    }

    public static void refreshWidget(Context context, int appWidgetId) {
        if (appWidgetId <= 0) {
            return;
        }
        updateWidgets(context, AppWidgetManager.getInstance(context), new int[] { appWidgetId });
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        updateWidgets(context, manager, appWidgetIds);
    }

    @Override
    public void onAppWidgetOptionsChanged(
            Context context,
            AppWidgetManager manager,
            int appWidgetId,
            android.os.Bundle newOptions
    ) {
        refreshWidget(context, appWidgetId);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        WidgetDailyCheckWeekProviderSupport.handleReceive(context, intent);
    }

    private static void updateWidgets(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        WidgetDailyCheckWeekProviderSupport.updateWidgets(context, manager, appWidgetIds);
    }
}
