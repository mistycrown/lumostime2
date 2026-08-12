package com.mistycrown.lumostime

import android.content.Context

/** Resolves the current frame for refresh buttons that use the shared widget animation. */
object WidgetRefreshIconResolver {
    @JvmStatic
    fun resolve(context: Context, appWidgetId: Int): Int {
        val state = WidgetStores.loadRefreshAnimationState(context, appWidgetId)
            ?: return R.drawable.widget_todo_pin_refresh_icon
        val duration = (state.expiresAt - state.startedAt).coerceAtLeast(1L)
        val progress = ((System.currentTimeMillis() - state.startedAt).coerceAtLeast(0L).toFloat() / duration)
            .coerceAtMost(1f)
        return when {
            progress >= 1f -> R.drawable.widget_todo_pin_refresh_icon
            progress < 0.2f -> R.drawable.widget_todo_pin_refresh_icon_1
            progress < 0.4f -> R.drawable.widget_todo_pin_refresh_icon_2
            progress < 0.6f -> R.drawable.widget_todo_pin_refresh_icon_3
            progress < 0.8f -> R.drawable.widget_todo_pin_refresh_icon_4
            else -> R.drawable.widget_todo_pin_refresh_icon_5
        }
    }
}
