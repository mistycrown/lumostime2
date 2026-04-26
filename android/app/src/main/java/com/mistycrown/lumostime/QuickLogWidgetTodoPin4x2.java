package com.mistycrown.lumostime;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

/**
 * Dedicated TODAY + PIN 4x2 widget provider with a scrollable todo list.
 */
public class QuickLogWidgetTodoPin4x2 extends AppWidgetProvider {
    public static void refreshAllAsync(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName componentName = new ComponentName(context, QuickLogWidgetTodoPin4x2.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(componentName);
        WidgetTodoPinProviderSupport.updateWidgets(
                context,
                appWidgetManager,
                appWidgetIds,
                QuickLogWidgetTodoPin4x2.class
        );
    }

    public static void refreshWidget(Context context, int appWidgetId) {
        if (appWidgetId <= 0) {
            return;
        }
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        WidgetTodoPinProviderSupport.updateWidgets(
                context,
                appWidgetManager,
                new int[] { appWidgetId },
                QuickLogWidgetTodoPin4x2.class
        );
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        WidgetTodoPinProviderSupport.updateWidgets(
                context,
                appWidgetManager,
                appWidgetIds,
                QuickLogWidgetTodoPin4x2.class
        );
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (WidgetTodoPinProviderSupport.handleCommonReceive(context, intent, QuickLogWidgetTodoPin4x2.class)) {
            if (intent == null || !WidgetTodoPinProviderSupport.ACTION_TOGGLE_TODO_ITEM.equals(intent.getAction())) {
                refreshAllAsync(context);
            }
        }
    }
}
