package com.mistycrown.lumostime;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;

/**
 * Dedicated 4x2 principle-card widget provider.
 * Updated 2026-08-09: Refreshes on launcher time/date broadcasts while delegating face flips and manual refreshes to provider support.
 * Updated 2026-08-09: Advances the card/background shuffle on phone unlock via ACTION_USER_PRESENT.
 */
public class QuickLogWidgetPrincipleCard4x2 extends AppWidgetProvider {
    public static void refreshAllAsync(Context context) {
        refreshAllAsync(context, false, null);
    }

    public static void refreshAllAsync(Context context, boolean advanceSelection, Boolean forceFrontFace) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(
                new android.content.ComponentName(context, QuickLogWidgetPrincipleCard4x2.class)
        );
        WidgetPrincipleCardProviderSupport.INSTANCE.updateWidgets(
                context,
                appWidgetManager,
                appWidgetIds,
                QuickLogWidgetPrincipleCard4x2.class,
                advanceSelection,
                forceFrontFace
        );
    }

    public static void refreshWidget(Context context, int appWidgetId) {
        refreshWidget(context, appWidgetId, false, null);
    }

    public static void refreshWidget(Context context, int appWidgetId, boolean advanceSelection, Boolean forceFrontFace) {
        if (appWidgetId <= 0) {
            return;
        }

        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        WidgetPrincipleCardProviderSupport.INSTANCE.updateWidgets(
                context,
                appWidgetManager,
                new int[] { appWidgetId },
                QuickLogWidgetPrincipleCard4x2.class,
                advanceSelection,
                forceFrontFace
        );
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        WidgetPrincipleCardProviderSupport.INSTANCE.updateWidgets(
                context,
                appWidgetManager,
                appWidgetIds,
                QuickLogWidgetPrincipleCard4x2.class
        );
    }

    @Override
    public void onDeleted(Context context, int[] appWidgetIds) {
        super.onDeleted(context, appWidgetIds);
        WidgetPrincipleCardProviderSupport.INSTANCE.onDeleted(context, appWidgetIds);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (WidgetPrincipleCardProviderSupport.INSTANCE.handleCommonReceive(
                context,
                intent,
                QuickLogWidgetPrincipleCard4x2.class
        )) {
            String action = intent != null ? intent.getAction() : null;
            if (Intent.ACTION_USER_PRESENT.equals(action)) {
                refreshAllAsync(context, true, true);
            } else if (!WidgetPrincipleCardProviderSupport.ACTION_TOGGLE_PRINCIPLE_CARD_FACE.equals(action)
                    && !WidgetPrincipleCardProviderSupport.ACTION_REFRESH_PRINCIPLE_CARD.equals(action)) {
                refreshAllAsync(context);
            }
        }
    }
}
