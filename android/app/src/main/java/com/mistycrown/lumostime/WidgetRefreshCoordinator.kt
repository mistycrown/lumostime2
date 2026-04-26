package com.mistycrown.lumostime

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.os.Handler
import android.os.Looper

/**
 * Refreshes every registered widget provider so runtime state stays in sync across sizes.
 */
object WidgetRefreshCoordinator {
    private val mainHandler = Handler(Looper.getMainLooper())
    private val tapFeedbackFrameDelays = longArrayOf(0L, 48L, 108L, 176L, 244L)

    fun refreshAllAsync(context: Context) {
        refreshAll(context)
    }

    fun refreshWidgetWithTapFeedback(context: Context, appWidgetId: Int) {
        val appContext = context.applicationContext
        tapFeedbackFrameDelays.forEach { delayMs ->
            mainHandler.postDelayed(
                { refreshWidget(appContext, appWidgetId) },
                delayMs
            )
        }
    }

    fun refreshAll(context: Context) {
        QuickLogWidget.refreshAllAsync(context)
        QuickLogWidget2x1.refreshAllAsync(context)
        QuickLogWidget3x2.refreshAllAsync(context)
        QuickLogWidget4x1.refreshAllAsync(context)
        QuickLogWidget4x2.refreshAllAsync(context)
        QuickLogWidgetDailyRuntime4x2.refreshAllAsync(context)
        QuickLogWidgetTodoPin4x2.refreshAllAsync(context)
        QuickLogWidgetDailyRuntime4x4.refreshAllAsync(context)
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
            ComponentName(context, QuickLogWidget2x1::class.java).className ->
                QuickLogWidget2x1.refreshWidget(context, appWidgetId)
            ComponentName(context, QuickLogWidget3x2::class.java).className ->
                QuickLogWidget3x2.refreshWidget(context, appWidgetId)
            ComponentName(context, QuickLogWidget4x1::class.java).className ->
                QuickLogWidget4x1.refreshWidget(context, appWidgetId)
            ComponentName(context, QuickLogWidget4x2::class.java).className ->
                QuickLogWidget4x2.refreshWidget(context, appWidgetId)
            ComponentName(context, QuickLogWidgetDailyRuntime4x2::class.java).className ->
                QuickLogWidgetDailyRuntime4x2.refreshWidget(context, appWidgetId)
            ComponentName(context, QuickLogWidgetTodoPin4x2::class.java).className ->
                QuickLogWidgetTodoPin4x2.refreshWidget(context, appWidgetId)
            ComponentName(context, QuickLogWidgetDailyRuntime4x4::class.java).className ->
                QuickLogWidgetDailyRuntime4x4.refreshWidget(context, appWidgetId)
            else -> refreshAll(context)
        }
    }
}
