package com.mistycrown.lumostime;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

/**
 * Classic AppWidgetProvider implementation for the 2x2 timer widget.
 * Uses explicit broadcasts so slot taps reliably toggle state on the home screen.
 */
public class QuickLogWidget extends AppWidgetProvider {
    private static final String ACTION_TOGGLE_SLOT = "com.mistycrown.lumostime.action.TOGGLE_WIDGET_SLOT";
    private static final String EXTRA_SLOT_INDEX = "slot_index";

    private static final int[] SLOT_VIEW_IDS = new int[] {
            R.id.widget_slot_0,
            R.id.widget_slot_1,
            R.id.widget_slot_2,
            R.id.widget_slot_3
    };

    public static void refreshAllAsync(Context context) {
        refreshAll(context);
    }

    public static void refreshAll(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName componentName = new ComponentName(context, QuickLogWidget.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(componentName);
        if (appWidgetIds == null || appWidgetIds.length == 0) {
            return;
        }
        updateWidgets(context, appWidgetManager, appWidgetIds);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        updateWidgets(context, appWidgetManager, appWidgetIds);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent == null) {
            return;
        }

        if (ACTION_TOGGLE_SLOT.equals(intent.getAction())) {
            int slotIndex = intent.getIntExtra(EXTRA_SLOT_INDEX, -1);
            if (slotIndex >= 0) {
                WidgetTimerController.INSTANCE.handleSlotTap(context, slotIndex);
                refreshAll(context);
            }
        }
    }

    private static void updateWidgets(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        WidgetSnapshot snapshot = WidgetSnapshotBuilder.INSTANCE.build(context);
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);
            bindSlots(context, views, snapshot, appWidgetId);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    private static void bindSlots(Context context, RemoteViews views, WidgetSnapshot snapshot, int appWidgetId) {
        for (int index = 0; index < SLOT_VIEW_IDS.length; index++) {
            int viewId = SLOT_VIEW_IDS[index];
            WidgetSnapshotSlot slot = snapshot.getSlots().get(index);
            views.setImageViewBitmap(viewId, WidgetSlotBitmapRenderer.INSTANCE.render(context, slot));
            views.setOnClickPendingIntent(viewId, buildSlotPendingIntent(context, appWidgetId, slot.getSlotIndex()));
        }
    }

    private static PendingIntent buildSlotPendingIntent(Context context, int appWidgetId, int slotIndex) {
        Intent intent = new Intent(context, QuickLogWidget.class);
        intent.setAction(ACTION_TOGGLE_SLOT);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        intent.putExtra(EXTRA_SLOT_INDEX, slotIndex);

        int requestCode = appWidgetId * 10 + slotIndex;
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getBroadcast(context, requestCode, intent, flags);
    }
}
