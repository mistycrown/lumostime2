package com.mistycrown.lumostime

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context

/**
 * Refreshes every registered widget provider so runtime state stays in sync across sizes.
 */
object WidgetRefreshCoordinator {
    fun refreshAllAsync(context: Context) {
        refreshAll(context)
    }

    fun refreshAll(context: Context) {
        QuickLogWidget.refreshAllAsync(context)
        QuickLogWidget1x2.refreshAllAsync(context)
        QuickLogWidget2x1.refreshAllAsync(context)
        QuickLogWidget1x4.refreshAllAsync(context)
        QuickLogWidget4x1.refreshAllAsync(context)
        QuickLogWidget2x4.refreshAllAsync(context)
        QuickLogWidget4x2.refreshAllAsync(context)
    }

    fun refreshWidget(context: Context, appWidgetId: Int) {
        if (appWidgetId <= 0) {
            return
        }

        val appWidgetManager = AppWidgetManager.getInstance(context)
        val providerClassName = appWidgetManager.getAppWidgetInfo(appWidgetId)?.provider?.className
        when (providerClassName) {
            ComponentName(context, QuickLogWidget::class.java).className ->
                QuickLogWidget.refreshWidget(context, appWidgetId)
            ComponentName(context, QuickLogWidget1x2::class.java).className ->
                QuickLogWidget1x2.refreshWidget(context, appWidgetId)
            ComponentName(context, QuickLogWidget2x1::class.java).className ->
                QuickLogWidget2x1.refreshWidget(context, appWidgetId)
            ComponentName(context, QuickLogWidget1x4::class.java).className ->
                QuickLogWidget1x4.refreshWidget(context, appWidgetId)
            ComponentName(context, QuickLogWidget4x1::class.java).className ->
                QuickLogWidget4x1.refreshWidget(context, appWidgetId)
            ComponentName(context, QuickLogWidget2x4::class.java).className ->
                QuickLogWidget2x4.refreshWidget(context, appWidgetId)
            ComponentName(context, QuickLogWidget4x2::class.java).className ->
                QuickLogWidget4x2.refreshWidget(context, appWidgetId)
            else -> refreshAll(context)
        }
    }
}
