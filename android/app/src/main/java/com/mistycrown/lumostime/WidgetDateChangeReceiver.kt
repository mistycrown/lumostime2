package com.mistycrown.lumostime

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Refreshes Android widgets when the device rolls into a new day or the user changes
 * the clock/timezone, so daily check slots stop showing stale completion state.
 */
class WidgetDateChangeReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        when (intent?.action) {
            Intent.ACTION_DATE_CHANGED,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED -> WidgetRefreshCoordinator.refreshAllAsync(context)
        }
    }
}
