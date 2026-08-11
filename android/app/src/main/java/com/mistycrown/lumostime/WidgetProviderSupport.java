package com.mistycrown.lumostime;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;

/**
 * Shared provider-side rendering and tap handling for all widget sizes.
 * Updated 2026-08-11: Keeps slot actions isolated from the title-row refresh button.
 * Updated 2026-08-11: Uses the dedicated refresh icon as the only refresh click target.
 */
public final class WidgetProviderSupport {
    public static final String ACTION_TOGGLE_SLOT = "com.mistycrown.lumostime.action.TOGGLE_WIDGET_SLOT";
    public static final String ACTION_CYCLE_TEMPLATE = "com.mistycrown.lumostime.action.CYCLE_WIDGET_TEMPLATE";
    public static final String ACTION_REFRESH_WIDGET = "com.mistycrown.lumostime.action.REFRESH_WIDGET";
    public static final String EXTRA_SLOT_INDEX = "slot_index";
    private static final int MAX_SLOT_LABEL_CODE_POINTS = 4;

    private WidgetProviderSupport() {}

    public static void refreshAll(
            Context context,
            Class<? extends AppWidgetProvider> providerClass,
            String widgetSize,
            int layoutResId,
            int[] slotViewIds,
            int[] slotLabelViewIds
    ) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName componentName = new ComponentName(context, providerClass);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(componentName);
        if (appWidgetIds == null || appWidgetIds.length == 0) {
            return;
        }
        WidgetStores.INSTANCE.maybeAutoBindLegacyWidgets(context, appWidgetIds, widgetSize);
        WidgetStores.INSTANCE.ensureBindings(
                context,
                appWidgetIds,
                widgetSize,
                WidgetTemplateTypes.GRID
        );
        updateWidgets(
                context,
                appWidgetManager,
                appWidgetIds,
                providerClass,
                widgetSize,
                layoutResId,
                slotViewIds,
                slotLabelViewIds
        );
    }

    public static void refreshWidget(
            Context context,
            int appWidgetId,
            Class<? extends AppWidgetProvider> providerClass,
            String widgetSize,
            int layoutResId,
            int[] slotViewIds,
            int[] slotLabelViewIds
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
                widgetSize,
                layoutResId,
                slotViewIds,
                slotLabelViewIds
        );
    }

    public static void onUpdate(
            Context context,
            AppWidgetManager appWidgetManager,
            int[] appWidgetIds,
            Class<? extends AppWidgetProvider> providerClass,
            String widgetSize,
            int layoutResId,
            int[] slotViewIds,
            int[] slotLabelViewIds
    ) {
        WidgetStores.INSTANCE.maybeAutoBindLegacyWidgets(context, appWidgetIds, widgetSize);
        WidgetStores.INSTANCE.ensureBindings(
                context,
                appWidgetIds,
                widgetSize,
                WidgetTemplateTypes.GRID
        );
        updateWidgets(
                context,
                appWidgetManager,
                appWidgetIds,
                providerClass,
                widgetSize,
                layoutResId,
                slotViewIds,
                slotLabelViewIds
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
            String widgetSize,
            int layoutResId,
            int[] slotViewIds,
            int[] slotLabelViewIds
    ) {
        if (intent == null) {
            return;
        }

        if (isWidgetDateRefreshAction(intent.getAction())) {
            refreshAll(
                    context,
                    providerClass,
                    widgetSize,
                    layoutResId,
                    slotViewIds,
                    slotLabelViewIds
            );
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

        if (ACTION_REFRESH_WIDGET.equals(intent.getAction())) {
            int appWidgetId = intent.getIntExtra(
                    AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID
            );
            if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                refreshWidget(
                        context,
                        appWidgetId,
                        providerClass,
                        widgetSize,
                        layoutResId,
                        slotViewIds,
                        slotLabelViewIds
                );
            }
            return;
        }

        if (ACTION_CYCLE_TEMPLATE.equals(intent.getAction())) {
            int appWidgetId = intent.getIntExtra(
                    AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID
            );
            if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                WidgetStores.INSTANCE.cycleBindingToNextTemplate(
                        context,
                        appWidgetId,
                        widgetSize,
                        WidgetTemplateTypes.GRID
                );
                refreshWidget(
                        context,
                        appWidgetId,
                        providerClass,
                        widgetSize,
                        layoutResId,
                        slotViewIds,
                        slotLabelViewIds
                );
            }
        }
    }

    private static boolean isWidgetDateRefreshAction(String action) {
        return Intent.ACTION_DATE_CHANGED.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action);
    }

    private static void updateWidgets(
            Context context,
            AppWidgetManager appWidgetManager,
            int[] appWidgetIds,
            Class<? extends AppWidgetProvider> providerClass,
            String widgetSize,
            int layoutResId,
            int[] slotViewIds,
            int[] slotLabelViewIds
    ) {
        if (appWidgetIds == null || appWidgetIds.length == 0) {
            return;
        }

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), layoutResId);
            WidgetSnapshot snapshot = WidgetSnapshotBuilder.INSTANCE.build(
                    context,
                    appWidgetId,
                    widgetSize,
                    WidgetTemplateTypes.GRID
            );
            PendingIntent cycleTemplateIntent = buildCycleTemplatePendingIntent(context, providerClass, appWidgetId);
            PendingIntent refreshIntent = buildRefreshPendingIntent(context, providerClass, appWidgetId);
            views.setTextViewText(R.id.widget_title, snapshot.getTemplateName());
            views.setImageViewResource(R.id.widget_refresh_icon, R.drawable.widget_todo_pin_refresh_icon);
            views.setOnClickPendingIntent(R.id.widget_title, cycleTemplateIntent);
            views.setOnClickPendingIntent(R.id.widget_refresh_icon, refreshIntent);
            bindSlots(context, views, snapshot, appWidgetId, providerClass, slotViewIds, slotLabelViewIds);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    private static void bindSlots(
            Context context,
            RemoteViews views,
            WidgetSnapshot snapshot,
            int appWidgetId,
            Class<? extends AppWidgetProvider> providerClass,
            int[] slotViewIds,
            int[] slotLabelViewIds
    ) {
        int slotCount = Math.min(slotViewIds.length, snapshot.getSlots().size());
        for (int index = 0; index < slotCount; index++) {
            int viewId = slotViewIds[index];
            WidgetSnapshotSlot slot = snapshot.getSlots().get(index);
            PendingIntent slotPendingIntent = buildSlotPendingIntent(
                    context,
                    providerClass,
                    appWidgetId,
                    slot.getSlotIndex()
            );
            views.setImageViewBitmap(viewId, WidgetSlotBitmapRenderer.INSTANCE.render(context, slot));
            views.setOnClickPendingIntent(viewId, slotPendingIntent);

            if (slotLabelViewIds != null && index < slotLabelViewIds.length) {
                int labelViewId = slotLabelViewIds[index];
                String label = formatSlotLabel(slot.getLabel());
                views.setTextViewText(labelViewId, label);
                views.setViewVisibility(labelViewId, label.isEmpty() ? View.GONE : View.VISIBLE);
                views.setOnClickPendingIntent(labelViewId, slotPendingIntent);
            }
        }
    }

    private static String formatSlotLabel(String label) {
        if (label == null) {
            return "";
        }

        String trimmed = label.trim();
        if (trimmed.isEmpty()) {
            return "";
        }

        if (trimmed.codePointCount(0, trimmed.length()) <= MAX_SLOT_LABEL_CODE_POINTS) {
            return trimmed;
        }

        int endIndex = trimmed.offsetByCodePoints(0, MAX_SLOT_LABEL_CODE_POINTS);
        return trimmed.substring(0, endIndex) + "…";
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

    private static PendingIntent buildRefreshPendingIntent(
            Context context,
            Class<? extends AppWidgetProvider> providerClass,
            int appWidgetId
    ) {
        Intent intent = new Intent(context, providerClass);
        intent.setAction(ACTION_REFRESH_WIDGET);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);

        int requestCode = appWidgetId * 100 + 98;
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getBroadcast(context, requestCode, intent, flags);
    }
}
