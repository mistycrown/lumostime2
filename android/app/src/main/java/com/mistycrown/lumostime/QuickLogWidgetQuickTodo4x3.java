package com.mistycrown.lumostime;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

/** Dedicated 4x3 Android widget for lightweight quick todos. */
public class QuickLogWidgetQuickTodo4x3 extends AppWidgetProvider {
    public static void refreshAllAsync(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, QuickLogWidgetQuickTodo4x3.class));
        WidgetQuickTodoProviderSupport.updateWidgets(
                context, manager, ids, QuickLogWidgetQuickTodo4x3.class, R.layout.widget_layout_quick_todo_4x3
        );
    }

    public static void refreshWidget(Context context, int appWidgetId) {
        if (appWidgetId <= 0) return;
        WidgetQuickTodoProviderSupport.updateWidgets(
                context,
                AppWidgetManager.getInstance(context),
                new int[] { appWidgetId },
                QuickLogWidgetQuickTodo4x3.class,
                R.layout.widget_layout_quick_todo_4x3
        );
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        WidgetQuickTodoProviderSupport.updateWidgets(
                context, manager, ids, QuickLogWidgetQuickTodo4x3.class, R.layout.widget_layout_quick_todo_4x3
        );
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (WidgetQuickTodoProviderSupport.handleReceive(context, intent)) {
            refreshAllAsync(context);
        }
    }
}
