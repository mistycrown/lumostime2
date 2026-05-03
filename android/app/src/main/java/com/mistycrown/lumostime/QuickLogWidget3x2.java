package com.mistycrown.lumostime;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;

/**
 * 3x2 unified widget provider.
 */
public class QuickLogWidget3x2 extends AppWidgetProvider {
    public static final String WIDGET_SIZE = WidgetSizes.SIZE_3X2;

    private static final int[] SLOT_VIEW_IDS = new int[] {
            R.id.widget_slot_0,
            R.id.widget_slot_1,
            R.id.widget_slot_2,
            R.id.widget_slot_3,
            R.id.widget_slot_4,
            R.id.widget_slot_5
    };

    private static final int[] SLOT_LABEL_VIEW_IDS = new int[] {
            R.id.widget_slot_label_0,
            R.id.widget_slot_label_1,
            R.id.widget_slot_label_2,
            R.id.widget_slot_label_3,
            R.id.widget_slot_label_4,
            R.id.widget_slot_label_5
    };

    public static void refreshAllAsync(Context context) {
        WidgetProviderSupport.refreshAll(
                context,
                QuickLogWidget3x2.class,
                WIDGET_SIZE,
                R.layout.widget_layout_3x2,
                SLOT_VIEW_IDS,
                SLOT_LABEL_VIEW_IDS
        );
    }

    public static void refreshWidget(Context context, int appWidgetId) {
        WidgetProviderSupport.refreshWidget(
                context,
                appWidgetId,
                QuickLogWidget3x2.class,
                WIDGET_SIZE,
                R.layout.widget_layout_3x2,
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
                QuickLogWidget3x2.class,
                WIDGET_SIZE,
                R.layout.widget_layout_3x2,
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
                QuickLogWidget3x2.class,
                WIDGET_SIZE,
                R.layout.widget_layout_3x2,
                SLOT_VIEW_IDS,
                SLOT_LABEL_VIEW_IDS
        );
    }
}
