package com.mistycrown.lumostime;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

/**
 * Dedicated scene 4x3 widget provider with icon tabs and a scrollable scene card grid.
 * Updated 2026-05-05: Added a manual refresh action plus a first-morning-unlock refresh hook for the scene widget.
 */
public class QuickLogWidgetScene4x3 extends AppWidgetProvider {
    public static void refreshAllAsync(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName componentName = new ComponentName(context, QuickLogWidgetScene4x3.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(componentName);
        WidgetSceneProviderSupport.updateWidgets(
                context,
                appWidgetManager,
                appWidgetIds,
                QuickLogWidgetScene4x3.class
        );
    }

    public static void refreshWidget(Context context, int appWidgetId) {
        if (appWidgetId <= 0) {
            return;
        }
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        WidgetSceneProviderSupport.updateWidgets(
                context,
                appWidgetManager,
                new int[] { appWidgetId },
                QuickLogWidgetScene4x3.class
        );
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        WidgetSceneProviderSupport.updateWidgets(
                context,
                appWidgetManager,
                appWidgetIds,
                QuickLogWidgetScene4x3.class
        );
    }

    @Override
    public void onDeleted(Context context, int[] appWidgetIds) {
        super.onDeleted(context, appWidgetIds);
        WidgetSceneProviderSupport.onDeleted(context, appWidgetIds);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (WidgetSceneProviderSupport.handleCommonReceive(context, intent, QuickLogWidgetScene4x3.class)) {
            String action = intent != null ? intent.getAction() : null;
            if (!WidgetSceneProviderSupport.ACTION_SELECT_SCENE_TAB.equals(action)
                    && !WidgetSceneProviderSupport.ACTION_TOGGLE_SCENE_ITEM.equals(action)) {
                refreshAllAsync(context);
            }
        }
    }
}
