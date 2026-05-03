package com.mistycrown.lumostime;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;

/**
 * 2x1 unified widget provider.
 */
public class QuickLogWidget2x1 extends AppWidgetProvider {
    public static final String WIDGET_SIZE = WidgetSizes.SIZE_2X1;

    private static final int[] SLOT_VIEW_IDS = new int[] {
            R.id.widget_slot_0,
            R.id.widget_slot_1
    };

    private static final int[] SLOT_LABEL_VIEW_IDS = new int[] {
            R.id.widget_slot_label_0,
            R.id.widget_slot_label_1
    };

    public static void refreshAllAsync(Context context) {
        WidgetProviderSupport.refreshAll(
                context,
                QuickLogWidget2x1.class,
                WIDGET_SIZE,
                R.layout.widget_layout_2x1,
                SLOT_VIEW_IDS,
                SLOT_LABEL_VIEW_IDS
        );
    }

    public static void refreshWidget(Context context, int appWidgetId) {
        WidgetProviderSupport.refreshWidget(
                context,
                appWidgetId,
                QuickLogWidget2x1.class,
                WIDGET_SIZE,
                R.layout.widget_layout_2x1,
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
                QuickLogWidget2x1.class,
                WIDGET_SIZE,
                R.layout.widget_layout_2x1,
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
                QuickLogWidget2x1.class,
                WIDGET_SIZE,
                R.layout.widget_layout_2x1,
                SLOT_VIEW_IDS,
                SLOT_LABEL_VIEW_IDS
        );
    }
}
