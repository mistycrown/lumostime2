package com.mistycrown.lumostime;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;

/**
 * 4x1 shortcut widget provider.
 */
public class ShortcutWidget4x1 extends AppWidgetProvider {
    public static final String WIDGET_TYPE = WidgetTypes.SHORTCUT;
    public static final String WIDGET_SIZE = WidgetSizes.SIZE_4X1;

    private static final int[] SLOT_VIEW_IDS = new int[] {
            R.id.widget_slot_0,
            R.id.widget_slot_1,
            R.id.widget_slot_2,
            R.id.widget_slot_3
    };

    public static void refreshAllAsync(Context context) {
        WidgetProviderSupport.refreshAll(
                context,
                ShortcutWidget4x1.class,
                WIDGET_TYPE,
                WIDGET_SIZE,
                R.layout.widget_layout_shortcut_4x1,
                SLOT_VIEW_IDS
        );
    }

    public static void refreshWidget(Context context, int appWidgetId) {
        WidgetProviderSupport.refreshWidget(
                context,
                appWidgetId,
                ShortcutWidget4x1.class,
                WIDGET_TYPE,
                WIDGET_SIZE,
                R.layout.widget_layout_shortcut_4x1,
                SLOT_VIEW_IDS
        );
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        WidgetProviderSupport.onUpdate(
                context,
                appWidgetManager,
                appWidgetIds,
                ShortcutWidget4x1.class,
                WIDGET_TYPE,
                WIDGET_SIZE,
                R.layout.widget_layout_shortcut_4x1,
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
                ShortcutWidget4x1.class,
                WIDGET_TYPE,
                WIDGET_SIZE,
                R.layout.widget_layout_shortcut_4x1,
                SLOT_VIEW_IDS
        );
    }
}
