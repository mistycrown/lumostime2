package com.mistycrown.lumostime

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * @file QuickLogWidgetDailyCheckList4x3.kt
 * @input Mirrored daily templates/progress, launcher updates, refresh and dated row taps.
 * @output A scrollable 4x3 paper-style daily checklist with native offline punch actions.
 * @updated 2026-10-29: Adds the approved list design with stable rows and capped count actions.
 */
class QuickLogWidgetDailyCheckList4x3 : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
        updateWidgets(context, manager, appWidgetIds)
    }

    override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, appWidgetId: Int, newOptions: Bundle) {
        super.onAppWidgetOptionsChanged(context, manager, appWidgetId, newOptions)
        refreshWidget(context, appWidgetId)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        when (intent.action) {
            ACTION_PUNCH -> {
                val widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
                val itemId = intent.getStringExtra(EXTRA_ITEM_ID) ?: return
                val renderedDate = intent.getStringExtra(EXTRA_DATE) ?: return
                if (widgetId <= 0) return
                if (WidgetTimerController.handleDailyListItemTap(context, widgetId, itemId, renderedDate)) {
                    // Update every daily surface sharing the same native progress, including sibling lists.
                    WidgetRefreshCoordinator.refreshTimerWidgets(context)
                    WidgetRefreshCoordinator.refreshDailyCheckWeekWidgets(context)
                    WidgetRefreshCoordinator.refreshSceneWidgets(context)
                } else {
                    refreshWidget(context, widgetId)
                }
            }
            ACTION_REFRESH -> {
                val widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
                if (widgetId > 0) WidgetRefreshCoordinator.refreshWidgetWithRefreshFeedback(context, widgetId)
            }
            Intent.ACTION_DATE_CHANGED, Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED, Intent.ACTION_USER_PRESENT -> refreshAllAsync(context)
        }
    }

    companion object {
        const val ACTION_PUNCH = "com.mistycrown.lumostime.action.PUNCH_DAILY_CHECK_LIST"
        const val ACTION_REFRESH = "com.mistycrown.lumostime.action.REFRESH_DAILY_CHECK_LIST"
        const val EXTRA_ITEM_ID = "daily_list_item_id"
        const val EXTRA_DATE = "daily_list_rendered_date"

        @JvmStatic fun refreshAllAsync(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            updateWidgets(context, manager, manager.getAppWidgetIds(ComponentName(context, QuickLogWidgetDailyCheckList4x3::class.java)))
        }

        @JvmStatic fun refreshWidget(context: Context, appWidgetId: Int) {
            if (appWidgetId > 0) updateWidgets(context, AppWidgetManager.getInstance(context), intArrayOf(appWidgetId))
        }

        private fun updateWidgets(context: Context, manager: AppWidgetManager, ids: IntArray) {
            if (ids.isEmpty()) return
            val now = Date()
            val date = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(now)
            val rows = WidgetDailyCheckListRows.load(context, date)
            for (widgetId in ids) {
                val views = RemoteViews(context.packageName, R.layout.widget_layout_daily_check_list_4x3)
                views.setTextViewText(R.id.widget_daily_list_date, SimpleDateFormat("MM.dd  EEE", Locale.getDefault()).format(now))
                views.setTextViewText(R.id.widget_daily_list_progress, "${rows.count { it.completed }} / ${rows.size}")
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val collection = RemoteViews.RemoteCollectionItems.Builder()
                        .setHasStableIds(true).setViewTypeCount(1)
                    rows.forEachIndexed { index, row ->
                        collection.addItem(row.meta.checkItemId.hashCode().toLong(), WidgetDailyCheckListRows.render(context, row, widgetId, index == rows.lastIndex))
                    }
                    views.setRemoteAdapter(R.id.widget_daily_list, collection.build())
                } else {
                    val service = Intent(context, WidgetDailyCheckListRemoteViewsService::class.java).apply {
                        putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
                        // Date changes must create a fresh factory; ordinary taps retain scroll position.
                        data = Uri.parse("lumostime-widget://daily-list/v1/$widgetId/$date")
                    }
                    views.setRemoteAdapter(R.id.widget_daily_list, service)
                }
                views.setEmptyView(R.id.widget_daily_list, R.id.widget_daily_list_empty)
                views.setPendingIntentTemplate(R.id.widget_daily_list, punchIntent(context, widgetId))
                views.setOnClickPendingIntent(R.id.widget_daily_list_open, openReviewIntent(context, widgetId))
                views.setOnClickPendingIntent(R.id.widget_daily_list_empty, openReviewIntent(context, widgetId))
                views.setImageViewResource(R.id.widget_daily_list_refresh, WidgetRefreshIconResolver.resolve(context, widgetId))
                views.setOnClickPendingIntent(R.id.widget_daily_list_refresh, refreshIntent(context, widgetId))
                manager.updateAppWidget(widgetId, views)
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
                    manager.notifyAppWidgetViewDataChanged(intArrayOf(widgetId), R.id.widget_daily_list)
                }
            }
        }

        private fun punchIntent(context: Context, widgetId: Int): PendingIntent {
            val intent = Intent(context, QuickLogWidgetDailyCheckList4x3::class.java).apply {
                action = ACTION_PUNCH
                data = Uri.parse("lumostime-widget://daily-list/punch/$widgetId")
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            }
            // Collection fill-in intents need mutable templates, including Android 6–11.
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0)
            return PendingIntent.getBroadcast(context, widgetId, intent, flags)
        }

        private fun refreshIntent(context: Context, widgetId: Int): PendingIntent {
            val intent = Intent(context, QuickLogWidgetDailyCheckList4x3::class.java).apply {
                action = ACTION_REFRESH
                data = Uri.parse("lumostime-widget://daily-list/refresh/$widgetId")
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            }
            return PendingIntent.getBroadcast(context, widgetId, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }

        private fun openReviewIntent(context: Context, widgetId: Int): PendingIntent {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("lumostime://widget?action=open_today_review"), context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            return PendingIntent.getActivity(context, widgetId, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }
    }
}
