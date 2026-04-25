package com.mistycrown.lumostime;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

/**
 * DAILY_RUNTIME 4x3 widget provider.
 */
public class QuickLogWidgetDailyRuntime4x4 extends AppWidgetProvider {
    public static void refreshAllAsync(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName componentName = new ComponentName(context, QuickLogWidgetDailyRuntime4x4.class);
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
        WidgetDailyRuntimeProviderSupport.removeViewModes(context, appWidgetIds);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (WidgetDailyRuntimeProviderSupport.handleCommonReceive(context, intent)) {
            if (intent == null || !WidgetDailyRuntimeProviderSupport.ACTION_TOGGLE_VIEW.equals(intent.getAction())) {
                refreshAllAsync(context);
            }
            return;
        }
    }

    private static void updateWidgets(
            Context context,
            AppWidgetManager appWidgetManager,
            int[] appWidgetIds
    ) {
        WidgetDailyRuntimeProviderSupport.updateWidgets(
                context,
                appWidgetManager,
                appWidgetIds,
                R.layout.widget_layout_daily_runtime_4x4,
                false,
                QuickLogWidgetDailyRuntime4x4.class
        );
    }
}
