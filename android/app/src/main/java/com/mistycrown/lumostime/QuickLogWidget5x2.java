package com.mistycrown.lumostime;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;

/**
 * 5x2 unified widget provider with ten configurable slots.
 */
public class QuickLogWidget5x2 extends AppWidgetProvider {
    public static final String WIDGET_SIZE = WidgetSizes.SIZE_5X2;

    private static final int[] SLOT_VIEW_IDS = new int[] {
            R.id.widget_slot_0,
            R.id.widget_slot_1,
            R.id.widget_slot_2,
            R.id.widget_slot_3,
            R.id.widget_slot_4,
            R.id.widget_slot_5,
            R.id.widget_slot_6,
            R.id.widget_slot_7,
            R.id.widget_slot_8,
            R.id.widget_slot_9
    };

    private static final int[] SLOT_LABEL_VIEW_IDS = new int[] {
            R.id.widget_slot_label_0,
            R.id.widget_slot_label_1,
            R.id.widget_slot_label_2,
            R.id.widget_slot_label_3,
            R.id.widget_slot_label_4,
            R.id.widget_slot_label_5,
            R.id.widget_slot_label_6,
            R.id.widget_slot_label_7,
            R.id.widget_slot_label_8,
            R.id.widget_slot_label_9
    };

    public static void refreshAllAsync(Context context) {
        WidgetProviderSupport.refreshAll(
                context,
                QuickLogWidget5x2.class,
                WIDGET_SIZE,
                R.layout.widget_layout_5x2,
                SLOT_VIEW_IDS,
                SLOT_LABEL_VIEW_IDS
        );
    }

    public static void refreshWidget(Context context, int appWidgetId) {
        WidgetProviderSupport.refreshWidget(
                context,
                appWidgetId,
                QuickLogWidget5x2.class,
                WIDGET_SIZE,
                R.layout.widget_layout_5x2,
                SLOT_VIEW_IDS,
                SLOT_LABEL_VIEW_IDS
        );
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        WidgetProviderSupport.onUpdate(
                context,
                appWidgetManager,
                appWidgetIds,
                QuickLogWidget5x2.class,
                WIDGET_SIZE,
                R.layout.widget_layout_5x2,
                SLOT_VIEW_IDS,
                SLOT_LABEL_VIEW_IDS
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
                QuickLogWidget5x2.class,
                WIDGET_SIZE,
                R.layout.widget_layout_5x2,
                SLOT_VIEW_IDS,
                SLOT_LABEL_VIEW_IDS
        );
    }
}
