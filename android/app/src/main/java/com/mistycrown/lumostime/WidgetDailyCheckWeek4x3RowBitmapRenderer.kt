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

/**
 * Renders compact rows and the weekday header for the 4x3 daily-check widget.
 * Updated 2026-08-10: Matched the shared reference square-cell style and weekday alignment.
 * Updated 2026-08-10: Rendered at content width to preserve text proportions.
 */
object WidgetDailyCheckWeek4x3RowBitmapRenderer {
    private const val FALLBACK_WIDTH_DP = 250f
    private const val CONTENT_HORIZONTAL_INSET_DP = 32f
    private const val ROW_HEIGHT_DP = 31f
    private const val WEEKDAY_HEIGHT_DP = 18f

    @JvmStatic
    fun render(
        context: Context,
        appWidgetId: Int,
        payload: WidgetDailySyncPayload?,
        item: WidgetDailyCheckMeta
    ): Bitmap {
        val density = context.resources.displayMetrics.density
        val width = resolveWidthPx(context, appWidgetId, density)
        val height = (ROW_HEIGHT_DP * density).toInt().coerceAtLeast(1)
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.TRANSPARENT)

        val bodyTypeface = Typeface.create("sans-serif", Typeface.NORMAL)
        val mediumTypeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
        val iconPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.rgb(87, 83, 78)
            textSize = 15f * density
            textAlign = Paint.Align.CENTER
            typeface = bodyTypeface
        }
        val labelPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.rgb(41, 37, 36)
            textSize = 12.1f * density
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

        val centerY = height / 2f
        val iconCenterX = 8f * density
        val labelX = 23f * density
        val visualGrid = WidgetDailyCheckWeekVisuals.grid(width, density)
        val dates = resolveWeekDates(payload)
        val maxLabelWidth = (visualGrid.left - labelX - 8f * density).coerceAtLeast(24f * density)
        val radius = WidgetDailyCheckWeekVisuals.cellRadius(height.toFloat(), density, visualGrid.step)

        val iconBaseline = centerY - ((iconPaint.descent() + iconPaint.ascent()) / 2f)
        canvas.drawText(item.icon?.ifBlank { "•" } ?: "•", iconCenterX, iconBaseline, iconPaint)
        val labelBaseline = centerY - ((labelPaint.descent() + labelPaint.ascent()) / 2f)
        canvas.drawText(ellipsize(item.content, labelPaint, maxLabelWidth), labelX, labelBaseline, labelPaint)

        val progressByDate = payload?.progress.orEmpty()
            .filter { it.checkItemId == item.checkItemId }
            .associateBy { it.date }
        dates.forEachIndexed { index, date ->
            WidgetDailyCheckWeekVisuals.drawStateCell(
                canvas = canvas,
                centerX = visualGrid.left + visualGrid.step * index,
                centerY = centerY,
                radius = radius,
                progress = progressByDate[date],
                item = item,
                density = density,
                fillPaint = fillPaint,
                textPaint = cellTextPaint,
                checkPaint = checkPaint
            )
        }
        return bitmap
    }

    @JvmStatic
    fun renderWeekdays(context: Context, appWidgetId: Int): Bitmap {
        val density = context.resources.displayMetrics.density
        val width = resolveWidthPx(context, appWidgetId, density)
        val height = (WEEKDAY_HEIGHT_DP * density).toInt().coerceAtLeast(1)
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.TRANSPARENT)

        val paint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.rgb(120, 113, 108)
            textSize = 9.3f * density
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
            textAlign = Paint.Align.CENTER
        }
        val baseline = height / 2f - ((paint.descent() + paint.ascent()) / 2f)
        val visualGrid = WidgetDailyCheckWeekVisuals.grid(width, density)
        listOf("一", "二", "三", "四", "五", "六", "日").forEachIndexed { index, label ->
            canvas.drawText(label, visualGrid.left + visualGrid.step * index, baseline, paint)
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

    private fun resolveWidthPx(context: Context, appWidgetId: Int, density: Float): Int {
        val fallback = ((FALLBACK_WIDTH_DP - CONTENT_HORIZONTAL_INSET_DP) * density).toInt().coerceAtLeast(1)
        if (appWidgetId <= 0) return fallback
        return runCatching {
            val options = AppWidgetManager.getInstance(context).getAppWidgetOptions(appWidgetId)
            val widthDp = maxOf(
                options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 0),
                options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
            )
            if (widthDp > CONTENT_HORIZONTAL_INSET_DP) {
                ((widthDp - CONTENT_HORIZONTAL_INSET_DP) * density).toInt().coerceAtLeast(1)
            } else {
                fallback
            }
        }.getOrDefault(fallback)
    }
}
