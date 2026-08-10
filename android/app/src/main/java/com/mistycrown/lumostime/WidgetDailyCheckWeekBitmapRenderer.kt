package com.mistycrown.lumostime

import android.appwidget.AppWidgetManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.text.TextPaint
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import kotlin.math.min

/**
 * Renders the read-only weekly matrix for the 4x4 daily-check widget.
 * Updated 2026-08-10: Replaced circles with the shared reference square-cell style.
 * Updated 2026-08-10: Limited row height so sparse daily checks remain compact.
 * Updated 2026-08-10: Tightened row spacing to better match the reference table density.
 */
object WidgetDailyCheckWeekBitmapRenderer {
    private const val FALLBACK_WIDTH_DP = 250f
    private const val FALLBACK_HEIGHT_DP = 250f

    @JvmStatic
    fun render(context: Context, appWidgetId: Int, payload: WidgetDailySyncPayload?): Bitmap {
        val density = context.resources.displayMetrics.density
        val width = resolveDimensionPx(
            context,
            appWidgetId,
            AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH,
            AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,
            FALLBACK_WIDTH_DP,
            density
        )
        val height = resolveDimensionPx(
            context,
            appWidgetId,
            AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT,
            AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,
            FALLBACK_HEIGHT_DP,
            density
        )
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.TRANSPARENT)

        val bodyTextTypeface = Typeface.create("sans-serif", Typeface.NORMAL)
        val mediumTypeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
        val weekdayPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.rgb(120, 113, 108)
            textSize = 9.5f * density
            typeface = mediumTypeface
            textAlign = Paint.Align.CENTER
        }
        val iconPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.rgb(87, 83, 78)
            textSize = 15f * density
            typeface = bodyTextTypeface
            textAlign = Paint.Align.CENTER
        }
        val labelPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.rgb(41, 37, 36)
            typeface = mediumTypeface
        }
        val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
        val cellTextPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = mediumTypeface
            textAlign = Paint.Align.CENTER
        }
        val checkPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeCap = Paint.Cap.ROUND
            strokeJoin = Paint.Join.ROUND
        }

        val left = 16f * density
        val visualGrid = WidgetDailyCheckWeekVisuals.grid(width, density)
        val weekDates = resolveWeekDates(payload)
        val weekdayBaseline = 48f * density
        listOf("一", "二", "三", "四", "五", "六", "日").forEachIndexed { index, label ->
            canvas.drawText(
                label,
                visualGrid.left + visualGrid.step * index,
                weekdayBaseline,
                weekdayPaint
            )
        }

        val items = payload?.items.orEmpty()
        if (items.isEmpty()) {
            val emptyPaint = TextPaint(labelPaint).apply {
                textSize = 12f * density
                color = Color.rgb(168, 162, 158)
                textAlign = Paint.Align.CENTER
            }
            val baseline = height / 2f - ((emptyPaint.descent() + emptyPaint.ascent()) / 2f)
            canvas.drawText("暂无日课", width / 2f, baseline, emptyPaint)
            return bitmap
        }

        val progressByKey = payload?.progress.orEmpty().associateBy { "${it.checkItemId}|${it.date}" }
        val contentTop = 59f * density
        val contentBottom = height - 10f * density
        val rowHeight = min(24f * density, (contentBottom - contentTop) / items.size)
            .coerceAtLeast(19f * density)
        val iconCenterX = left + 7.5f * density
        val labelX = left + 22f * density
        val maxLabelWidth = (visualGrid.left - labelX - 8f * density).coerceAtLeast(28f * density)
        val labelSize = min(12.3f * density, rowHeight * 0.40f).coerceAtLeast(9f * density)
        labelPaint.textSize = labelSize
        val radius = WidgetDailyCheckWeekVisuals.cellRadius(rowHeight, density, visualGrid.step)

        items.forEachIndexed { index, item ->
            val centerY = contentTop + rowHeight * index + rowHeight / 2f
            val iconBaseline = centerY - ((iconPaint.descent() + iconPaint.ascent()) / 2f)
            canvas.drawText(item.icon?.ifBlank { "•" } ?: "•", iconCenterX, iconBaseline, iconPaint)

            val labelBaseline = centerY - ((labelPaint.descent() + labelPaint.ascent()) / 2f)
            canvas.drawText(ellipsize(item.content, labelPaint, maxLabelWidth), labelX, labelBaseline, labelPaint)

            weekDates.forEachIndexed { dayIndex, date ->
                WidgetDailyCheckWeekVisuals.drawStateCell(
                    canvas = canvas,
                    centerX = visualGrid.left + visualGrid.step * dayIndex,
                    centerY = centerY,
                    radius = radius,
                    progress = progressByKey["${item.checkItemId}|$date"],
                    item = item,
                    density = density,
                    fillPaint = fillPaint,
                    textPaint = cellTextPaint,
                    checkPaint = checkPaint
                )
            }
        }

        return bitmap
    }

    private fun resolveWeekDates(payload: WidgetDailySyncPayload?): List<String> {
        val start = payload?.weekStartDate?.takeIf { it.matches(Regex("\\d{4}-\\d{2}-\\d{2}")) }
            ?: return emptyList()
        val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val startDate = formatter.parse(start) ?: return emptyList()
        val calendar = Calendar.getInstance().apply { time = startDate }
        return List(7) {
            val result = formatter.format(calendar.time)
            calendar.add(Calendar.DAY_OF_MONTH, 1)
            result
        }
    }

    private fun ellipsize(text: String, paint: TextPaint, maxWidth: Float): String {
        if (text.isBlank() || paint.measureText(text) <= maxWidth) return text
        val suffix = "…"
        var value = text
        while (value.isNotEmpty() && paint.measureText(value + suffix) > maxWidth) value = value.dropLast(1)
        return if (value.isBlank()) suffix else value + suffix
    }

    private fun resolveDimensionPx(
        context: Context,
        appWidgetId: Int,
        primaryKey: String,
        fallbackKey: String,
        fallbackDp: Float,
        density: Float
    ): Int {
        val fallback = (fallbackDp * density).toInt().coerceAtLeast(1)
        if (appWidgetId <= 0) return fallback
        return runCatching {
            val options = AppWidgetManager.getInstance(context).getAppWidgetOptions(appWidgetId)
            val primary = options.getInt(primaryKey, 0)
            val secondary = options.getInt(fallbackKey, 0)
            (maxOf(primary, secondary).takeIf { it > 0 }?.times(density)?.toInt() ?: fallback).coerceAtLeast(1)
        }.getOrDefault(fallback)
    }
}
