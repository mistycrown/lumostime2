package com.mistycrown.lumostime;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;

/**
 * 2x4 timer widget provider.
 */
public class QuickLogWidget2x4 extends AppWidgetProvider {
    public static final String WIDGET_SIZE = WidgetSizes.SIZE_2X4;

    private static final int[] SLOT_VIEW_IDS = new int[] {
            R.id.widget_slot_0,
            R.id.widget_slot_1,
            R.id.widget_slot_2,
            R.id.widget_slot_3,
            R.id.widget_slot_4,
            R.id.widget_slot_5,
            R.id.widget_slot_6,
            R.id.widget_slot_7
    };

    public static void refreshAllAsync(Context context) {
        WidgetProviderSupport.refreshAll(
                context,
                QuickLogWidget2x4.class,
                WIDGET_SIZE,
                R.layout.widget_layout_2x4,
                SLOT_VIEW_IDS
        );
    }

    public static void refreshWidget(Context context, int appWidgetId) {
        WidgetProviderSupport.refreshWidget(
                context,
                appWidgetId,
                QuickLogWidget2x4.class,
                WIDGET_SIZE,
                R.layout.widget_layout_2x4,
                SLOT_VIEW_IDS
        );
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        WidgetProviderSupport.onUpdate(
                context,
                appWidgetManager,
                appWidgetIds,
                QuickLogWidget2x4.class,
                WIDGET_SIZE,
                R.layout.widget_layout_2x4,
                SLOT_VIEW_IDS
        );
    }

    @Override
    public void onDeleted(Context context, int[] appWidgetIds) {
        super.onDeleted(context, appWidgetIds);
        WidgetProviderSupport.onDeleted(context, appWidgetIds);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        WidgetProviderSupport.onReceive(
                context,
                intent,
                QuickLogWidget2x4.class,
                WIDGET_SIZE,
                R.layout.widget_layout_2x4,
                SLOT_VIEW_IDS
        );
    }
}
