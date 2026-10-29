package com.mistycrown.lumostime

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import android.widget.RemoteViewsService.RemoteViewsFactory
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * @file WidgetDailyCheckListRemoteViewsService.kt
 * @input Today's shared native daily progress and ordered template metadata.
 * @output Stable checklist rows for both Android 12+ collections and legacy launcher factories.
 * @updated 2026-10-29: Adds read-only automatic rows, count progress and native manual actions.
 * @updated 2026-10-29: Aligns row typography, leading controls and compact icons with QUICK TODO / TODAY + PIN.
 */
internal data class WidgetDailyCheckListRow(
    val meta: WidgetDailyCheckMeta,
    val date: String,
    val currentCount: Int,
    val targetCount: Int,
    val completed: Boolean
)

internal object WidgetDailyCheckListRows {
    fun load(context: Context, date: String): List<WidgetDailyCheckListRow> {
        val payload = WidgetStores.loadDailySyncPayload(context) ?: return emptyList()
        val progress = payload.progress.filter { it.date == date }.associateBy { it.checkItemId }
        return payload.items.map { meta ->
            val state = progress[meta.checkItemId]
            val target = meta.targetCount.coerceAtLeast(1)
            val count = (state?.currentCount ?: 0).coerceIn(0, target)
            WidgetDailyCheckListRow(
                meta, date, count, target,
                if (meta.type == "manual" && meta.manualMode == WidgetDailyModes.COUNT) count >= target else state?.isCompleted == true
            )
        }
    }

    fun render(context: Context, row: WidgetDailyCheckListRow, widgetId: Int, isLast: Boolean): RemoteViews {
        val meta = row.meta
        val views = RemoteViews(context.packageName, R.layout.widget_daily_check_list_item)
        val countMode = meta.type == "manual" && meta.manualMode == WidgetDailyModes.COUNT
        val readOnly = meta.type != "manual"
        val enabled = WidgetDailyCheckListRules.actionMode(meta.type, meta.manualMode, row.currentCount, row.targetCount, row.date, row.date) != null
        views.setTextViewText(R.id.widget_daily_list_item_title, meta.content)
        views.setTextViewText(R.id.widget_daily_list_item_count, if (countMode) "${row.currentCount} / ${row.targetCount}" else if (readOnly) context.getString(R.string.widget_daily_list_auto) else "")
        views.setViewVisibility(R.id.widget_daily_list_item_count, if (countMode || readOnly) View.VISIBLE else View.GONE)
        views.setViewVisibility(R.id.widget_daily_list_item_divider, if (isLast) View.GONE else View.VISIBLE)
        views.setImageViewResource(R.id.widget_daily_list_item_action, when {
            row.completed -> R.drawable.widget_todo_pin_checkbox_checked
            countMode -> R.drawable.widget_quick_todo_add_icon
            readOnly -> R.drawable.widget_daily_list_auto
            else -> R.drawable.widget_todo_pin_checkbox_unchecked
        })
        views.setBoolean(R.id.widget_daily_list_item_action, "setEnabled", enabled)
        views.setContentDescription(R.id.widget_daily_list_item_action, when {
            readOnly -> context.getString(R.string.widget_daily_list_auto)
            countMode && row.completed -> context.getString(R.string.widget_daily_list_completed)
            countMode -> context.getString(R.string.widget_daily_list_increment)
            row.completed -> context.getString(R.string.widget_daily_list_cancel)
            else -> context.getString(R.string.widget_daily_list_check)
        } + "：" + meta.content)
        val bitmap = WidgetSlotBitmapRenderer.loadUiIconBitmap(
            context, meta.uiIconAssetPath, meta.uiIconFallbackAssetPath,
            (14 * context.resources.displayMetrics.density).toInt().coerceAtLeast(1)
        )
        val emoji = meta.icon?.takeIf {
            it.isNotBlank() && !it.startsWith("ui:") && Character.codePointCount(it, 0, it.length) <= 5
        }
        views.setViewVisibility(R.id.widget_daily_list_item_icon_image, if (bitmap != null) View.VISIBLE else View.GONE)
        views.setViewVisibility(R.id.widget_daily_list_item_icon_text, if (bitmap == null && emoji != null) View.VISIBLE else View.GONE)
        if (bitmap != null) views.setImageViewBitmap(R.id.widget_daily_list_item_icon_image, bitmap)
        else views.setTextViewText(R.id.widget_daily_list_item_icon_text, emoji.orEmpty())
        if (enabled) {
            val fillIn = Intent().apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
                putExtra(QuickLogWidgetDailyCheckList4x3.EXTRA_ITEM_ID, meta.checkItemId)
                putExtra(QuickLogWidgetDailyCheckList4x3.EXTRA_DATE, row.date)
            }
            views.setOnClickFillInIntent(R.id.widget_daily_list_item_action, fillIn)
        }
        return views
    }
}

class WidgetDailyCheckListRemoteViewsService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory = Factory(applicationContext, intent)

    private class Factory(private val context: Context, intent: Intent) : RemoteViewsFactory {
        private val widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        private var rows = emptyList<WidgetDailyCheckListRow>()
        override fun onCreate() { onDataSetChanged() }
        override fun onDataSetChanged() {
            rows = WidgetDailyCheckListRows.load(context, SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()))
        }
        override fun onDestroy() { rows = emptyList() }
        override fun getCount() = rows.size
        override fun getViewAt(position: Int): RemoteViews? = rows.getOrNull(position)?.let {
            WidgetDailyCheckListRows.render(context, it, widgetId, position == rows.lastIndex)
        }
        override fun getLoadingView(): RemoteViews? = null
        override fun getViewTypeCount() = 1
        override fun getItemId(position: Int) = rows.getOrNull(position)?.meta?.checkItemId?.hashCode()?.toLong() ?: position.toLong()
        override fun hasStableIds() = true
    }
}
