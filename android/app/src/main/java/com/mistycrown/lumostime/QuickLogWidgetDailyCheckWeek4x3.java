package com.mistycrown.lumostime;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

/**
 * Compact 4x3 daily-check weekly widget with a scrollable read-only list.
 * Updated 2026-08-10: Added the independent compact daily-check weekly provider.
 */
public class QuickLogWidgetDailyCheckWeek4x3 extends AppWidgetProvider {
    public static void refreshAllAsync(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, QuickLogWidgetDailyCheckWeek4x3.class);
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
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        WidgetDailyCheckWeek4x3ProviderSupport.handleReceive(context, intent);
    }

    private static void updateWidgets(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        WidgetDailyCheckWeek4x3ProviderSupport.updateWidgets(context, manager, appWidgetIds);
    }
}
