package com.mistycrown.lumostime

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.os.Handler
import android.os.Looper

/**
 * Refreshes every registered widget provider so runtime state stays in sync across sizes.
 * Updated 2026-05-02: Added the dedicated scene 4x3 widget provider to global refresh routing.
 * Updated 2026-05-03: Added widget-family refresh helpers so bridge sync calls can refresh only the providers that depend on each payload.
 * Updated 2026-05-05: Extended tap-feedback refresh frames so shortcut success states can animate back after one second.
 * Updated 2026-07-22: Registered the quick-todo 4x3 provider in global and targeted refresh routing.
 * Updated 2026-08-09: Added refresh routing for the dedicated principle-card 4x2 widget.
 * Updated 2026-08-09: Added refresh routing for the dedicated 4x4 daily-check weekly widget.
 */
object WidgetRefreshCoordinator {
    private val mainHandler = Handler(Looper.getMainLooper())
    private val tapFeedbackFrameDelays = longArrayOf(0L, 48L, 108L, 176L, 244L, 520L, 1000L)
    private val sceneRefreshFrameDelays = longArrayOf(0L, 70L, 140L, 210L, 280L, 350L, 420L)
    private val todoPinRefreshFrameDelays = longArrayOf(0L, 72L, 144L, 216L, 288L, 360L)

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

    fun refreshTodoPinWidgetWithFeedback(context: Context, appWidgetId: Int) {
        val appContext = context.applicationContext
        todoPinRefreshFrameDelays.forEach { delayMs ->
            mainHandler.postDelayed(
                { refreshWidget(appContext, appWidgetId) },
                delayMs
            )
        }
    }

    fun refreshSceneWidgetWithFeedback(context: Context, appWidgetId: Int) {
        val appContext = context.applicationContext
        sceneRefreshFrameDelays.forEach { delayMs ->
            mainHandler.postDelayed(
                { refreshWidget(appContext, appWidgetId) },
                delayMs
            )
        }
    }

    fun refreshTimerWidgets(context: Context) {
        QuickLogWidget.refreshAllAsync(context)
        QuickLogWidget2x1.refreshAllAsync(context)
        QuickLogWidget3x2.refreshAllAsync(context)
        QuickLogWidget4x1.refreshAllAsync(context)
        QuickLogWidget4x2.refreshAllAsync(context)
    }

    fun refreshTrackingCalendarWidgets(context: Context) {
        QuickLogWidgetTrackingCalendar2x2.refreshAllAsync(context)
    }

    fun refreshPrincipleCardWidgets(context: Context) {
        QuickLogWidgetPrincipleCard4x2.refreshAllAsync(context)
    }

    fun refreshDailyRuntimeWidgets(context: Context) {
        QuickLogWidgetDailyRuntime4x2.refreshAllAsync(context)
        QuickLogWidgetDailyRuntime4x4.refreshAllAsync(context)
    }

    fun refreshDailyCheckWeekWidgets(context: Context) {
        QuickLogWidgetDailyCheckWeek4x4.refreshAllAsync(context)
    }

    fun refreshTodoPinWidgets(context: Context) {
        QuickLogWidgetTodoPin4x2.refreshAllAsync(context)
        QuickLogWidgetTodoPin4x3.refreshAllAsync(context)
        QuickLogWidgetQuickTodo4x2.refreshAllAsync(context)
        QuickLogWidgetQuickTodo4x3.refreshAllAsync(context)
    }

    fun refreshSceneWidgets(context: Context) {
        QuickLogWidgetScene4x3.refreshAllAsync(context)
    }

    fun refreshAll(context: Context) {
        refreshTimerWidgets(context)
        refreshTrackingCalendarWidgets(context)
        refreshPrincipleCardWidgets(context)
        refreshDailyRuntimeWidgets(context)
        refreshDailyCheckWeekWidgets(context)
        refreshTodoPinWidgets(context)
        refreshSceneWidgets(context)
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
            ComponentName(context, QuickLogWidgetTrackingCalendar2x2::class.java).className ->
                QuickLogWidgetTrackingCalendar2x2.refreshWidget(context, appWidgetId)
            ComponentName(context, QuickLogWidgetPrincipleCard4x2::class.java).className ->
                QuickLogWidgetPrincipleCard4x2.refreshWidget(context, appWidgetId)
            ComponentName(context, QuickLogWidgetDailyRuntime4x2::class.java).className ->
                QuickLogWidgetDailyRuntime4x2.refreshWidget(context, appWidgetId)
            ComponentName(context, QuickLogWidgetTodoPin4x2::class.java).className ->
                QuickLogWidgetTodoPin4x2.refreshWidget(context, appWidgetId)
            ComponentName(context, QuickLogWidgetTodoPin4x3::class.java).className ->
                QuickLogWidgetTodoPin4x3.refreshWidget(context, appWidgetId)
            ComponentName(context, QuickLogWidgetQuickTodo4x2::class.java).className ->
                QuickLogWidgetQuickTodo4x2.refreshWidget(context, appWidgetId)
            ComponentName(context, QuickLogWidgetQuickTodo4x3::class.java).className ->
                QuickLogWidgetQuickTodo4x3.refreshWidget(context, appWidgetId)
            ComponentName(context, QuickLogWidgetScene4x3::class.java).className ->
                QuickLogWidgetScene4x3.refreshWidget(context, appWidgetId)
            ComponentName(context, QuickLogWidgetDailyRuntime4x4::class.java).className ->
                QuickLogWidgetDailyRuntime4x4.refreshWidget(context, appWidgetId)
            ComponentName(context, QuickLogWidgetDailyCheckWeek4x4::class.java).className ->
                QuickLogWidgetDailyCheckWeek4x4.refreshWidget(context, appWidgetId)
            else -> refreshAll(context)
        }
    }
}
