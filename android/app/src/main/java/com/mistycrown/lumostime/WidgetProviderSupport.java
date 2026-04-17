package com.mistycrown.lumostime;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

/**
 * Shared provider-side rendering and tap handling for all widget sizes.
 */
public final class WidgetProviderSupport {
    public static final String ACTION_TOGGLE_SLOT = "com.mistycrown.lumostime.action.TOGGLE_WIDGET_SLOT";
    public static final String ACTION_CYCLE_TEMPLATE = "com.mistycrown.lumostime.action.CYCLE_WIDGET_TEMPLATE";
    public static final String EXTRA_SLOT_INDEX = "slot_index";

    private WidgetProviderSupport() {}

    public static void refreshAll(
            Context context,
            Class<? extends AppWidgetProvider> providerClass,
            String widgetType,
            String widgetSize,
            int layoutResId,
            int[] slotViewIds
    ) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName componentName = new ComponentName(context, providerClass);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(componentName);
        if (appWidgetIds == null || appWidgetIds.length == 0) {
            return;
        }
        WidgetStores.INSTANCE.maybeAutoBindLegacyWidgets(context, appWidgetIds, widgetType, widgetSize);
        WidgetStores.INSTANCE.ensureBindings(context, appWidgetIds, widgetType, widgetSize);
        updateWidgets(
                context,
                appWidgetManager,
                appWidgetIds,
                providerClass,
                widgetType,
                widgetSize,
                layoutResId,
                slotViewIds
        );
    }

    public static void refreshWidget(
            Context context,
            int appWidgetId,
            Class<? extends AppWidgetProvider> providerClass,
            String widgetType,
            String widgetSize,
            int layoutResId,
            int[] slotViewIds
    ) {
        if (appWidgetId <= 0) {
            return;
        }

        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        updateWidgets(
                context,
                appWidgetManager,
                new int[] { appWidgetId },
                providerClass,
                widgetType,
                widgetSize,
                layoutResId,
                slotViewIds
        );
    }

    public static void onUpdate(
            Context context,
            AppWidgetManager appWidgetManager,
            int[] appWidgetIds,
            Class<? extends AppWidgetProvider> providerClass,
            String widgetType,
            String widgetSize,
            int layoutResId,
            int[] slotViewIds
    ) {
        WidgetStores.INSTANCE.maybeAutoBindLegacyWidgets(context, appWidgetIds, widgetType, widgetSize);
        WidgetStores.INSTANCE.ensureBindings(context, appWidgetIds, widgetType, widgetSize);
        updateWidgets(
                context,
                appWidgetManager,
                appWidgetIds,
                providerClass,
                widgetType,
                widgetSize,
                layoutResId,
                slotViewIds
        );
    }

    public static void onDeleted(Context context, int[] appWidgetIds) {
        if (appWidgetIds == null) {
            return;
        }

        for (int appWidgetId : appWidgetIds) {
            WidgetStores.INSTANCE.removeBinding(context, appWidgetId);
        }
    }

    public static void onReceive(
            Context context,
            Intent intent,
            Class<? extends AppWidgetProvider> providerClass,
            String widgetType,
            String widgetSize,
            int layoutResId,
            int[] slotViewIds
    ) {
        if (intent == null) {
            return;
        }

        if (ACTION_TOGGLE_SLOT.equals(intent.getAction())) {
            int slotIndex = intent.getIntExtra(EXTRA_SLOT_INDEX, -1);
            int appWidgetId = intent.getIntExtra(
                    AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID
            );
            if (slotIndex >= 0 && appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                boolean didChange = WidgetTimerController.INSTANCE.handleSlotTap(
                        context,
                        appWidgetId,
                        widgetType,
                        widgetSize,
                        slotIndex
                );
                if (didChange) {
                    WidgetRefreshCoordinator.INSTANCE.refreshWidgetWithTapFeedback(context, appWidgetId);
                } else {
                    WidgetRefreshCoordinator.INSTANCE.refreshAllAsync(context);
                }
            }
            return;
        }

        if (ACTION_CYCLE_TEMPLATE.equals(intent.getAction())) {
            int appWidgetId = intent.getIntExtra(
                    AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID
            );
            if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                WidgetStores.INSTANCE.cycleBindingToNextTemplate(context, appWidgetId, widgetType, widgetSize);
                refreshWidget(
                        context,
                        appWidgetId,
                        providerClass,
                        widgetType,
                        widgetSize,
                        layoutResId,
                        slotViewIds
                );
            }
        }
    }

    private static void updateWidgets(
            Context context,
            AppWidgetManager appWidgetManager,
            int[] appWidgetIds,
            Class<? extends AppWidgetProvider> providerClass,
            String widgetType,
            String widgetSize,
            int layoutResId,
            int[] slotViewIds
    ) {
        if (appWidgetIds == null || appWidgetIds.length == 0) {
            return;
        }

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), layoutResId);
            WidgetSnapshot snapshot = WidgetSnapshotBuilder.INSTANCE.build(
                    context,
                    appWidgetId,
                    widgetType,
                    widgetSize
            );
            views.setTextViewText(R.id.widget_title, snapshot.getTemplateName());
            views.setOnClickPendingIntent(
                    R.id.widget_title,
                    buildCycleTemplatePendingIntent(context, providerClass, appWidgetId)
            );
            bindSlots(context, views, snapshot, appWidgetId, providerClass, slotViewIds);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    private static void bindSlots(
            Context context,
            RemoteViews views,
            WidgetSnapshot snapshot,
            int appWidgetId,
            Class<? extends AppWidgetProvider> providerClass,
            int[] slotViewIds
    ) {
        int slotCount = Math.min(slotViewIds.length, snapshot.getSlots().size());
        for (int index = 0; index < slotCount; index++) {
            int viewId = slotViewIds[index];
            WidgetSnapshotSlot slot = snapshot.getSlots().get(index);
            views.setImageViewBitmap(viewId, WidgetSlotBitmapRenderer.INSTANCE.render(context, slot));
            views.setOnClickPendingIntent(
                    viewId,
                    buildSlotPendingIntent(context, providerClass, appWidgetId, slot.getSlotIndex())
            );
        }
    }

    private static PendingIntent buildSlotPendingIntent(
            Context context,
            Class<? extends AppWidgetProvider> providerClass,
            int appWidgetId,
            int slotIndex
    ) {
        Intent intent = new Intent(context, providerClass);
        intent.setAction(ACTION_TOGGLE_SLOT);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        intent.putExtra(EXTRA_SLOT_INDEX, slotIndex);

        int requestCode = appWidgetId * 100 + slotIndex;
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getBroadcast(context, requestCode, intent, flags);
    }

    private static PendingIntent buildCycleTemplatePendingIntent(
            Context context,
            Class<? extends AppWidgetProvider> providerClass,
            int appWidgetId
    ) {
        Intent intent = new Intent(context, providerClass);
        intent.setAction(ACTION_CYCLE_TEMPLATE);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);

        int requestCode = appWidgetId * 100 + 99;
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getBroadcast(context, requestCode, intent, flags);
    }
}
