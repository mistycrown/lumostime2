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
import java.util.Date
import java.util.Locale
import kotlin.math.min

/**
 * Renders the read-only weekly matrix for every daily check as one widget bitmap.
 * Updated 2026-08-09: Added the Android 4x4 daily-check weekly statistics renderer.
 */
object WidgetDailyCheckWeekBitmapRenderer {
    private const val FALLBACK_WIDTH_DP = 250f
    private const val FALLBACK_HEIGHT_DP = 250f
    private const val DEFAULT_ACCENT_COLOR = "#34D399"

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

        val textTypeface = Typeface.create("sans-serif", Typeface.NORMAL)
        val titlePaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.rgb(28, 25, 23)
            textSize = 13.5f * density
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
        }
        val rangePaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.rgb(120, 113, 108)
            textSize = 9.5f * density
            typeface = textTypeface
        }
        val iconPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.rgb(87, 83, 78)
            textSize = 15f * density
            typeface = textTypeface
            textAlign = Paint.Align.CENTER
        }
        val labelPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.rgb(41, 37, 36)
            typeface = textTypeface
        }
        val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
        val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.rgb(231, 229, 228)
            style = Paint.Style.STROKE
            strokeWidth = maxOf(0.8f * density, 1f)
        }
        val checkPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE
            style = Paint.Style.STROKE
            strokeCap = Paint.Cap.ROUND
            strokeJoin = Paint.Join.ROUND
            strokeWidth = maxOf(1.15f * density, 1f)
        }

        val left = 13f * density
        canvas.drawText("\u65e5\u8bfe\u5468\u7edf\u8ba1", left, 21f * density, titlePaint)
        canvas.drawText(formatWeekRange(payload), left, 38f * density, rangePaint)
        canvas.drawLine(left, 47f * density, width - 13f * density, 47f * density, strokePaint)

        val items = payload?.items.orEmpty()
        if (items.isEmpty()) {
            val emptyPaint = TextPaint(labelPaint).apply {
                textSize = 12f * density
                color = Color.rgb(168, 162, 158)
                textAlign = Paint.Align.CENTER
            }
            val baseline = height / 2f - ((emptyPaint.descent() + emptyPaint.ascent()) / 2f)
            canvas.drawText("\u6682\u65e0\u65e5\u8bfe", width / 2f, baseline, emptyPaint)
            return bitmap
        }

        val weekDates = resolveWeekDates(payload)
        val progressByKey = payload?.progress.orEmpty().associateBy { "${it.checkItemId}|${it.date}" }
        val contentTop = 52f * density
        val contentBottom = height - 8f * density
        val rowHeight = ((contentBottom - contentTop) / items.size).coerceAtLeast(19f * density)
        val iconCenterX = left + 7.5f * density
        val labelX = left + 22f * density
        val dotLeft = maxOf(width * 0.53f, 135f * density)
        val dotRight = width - 14f * density
        val dotStep = if (weekDates.size > 1) (dotRight - dotLeft) / (weekDates.size - 1) else 0f
        val maxLabelWidth = (dotLeft - labelX - 8f * density).coerceAtLeast(28f * density)
        val labelSize = min(12.5f * density, rowHeight * 0.40f).coerceAtLeast(8.8f * density)
        labelPaint.textSize = labelSize
        val radius = min(8.2f * density, rowHeight * 0.24f).coerceAtLeast(3.2f * density)

        items.forEachIndexed { index, item ->
            val centerY = contentTop + rowHeight * index + rowHeight / 2f
            val iconBaseline = centerY - ((iconPaint.descent() + iconPaint.ascent()) / 2f)
            canvas.drawText(item.icon?.ifBlank { "\u2022" } ?: "\u2022", iconCenterX, iconBaseline, iconPaint)

            val labelBaseline = centerY - ((labelPaint.descent() + labelPaint.ascent()) / 2f)
            canvas.drawText(ellipsize(item.content, labelPaint, maxLabelWidth), labelX, labelBaseline, labelPaint)

            weekDates.forEachIndexed { dayIndex, date ->
                val centerX = dotLeft + dotStep * dayIndex
                val progress = progressByKey["${item.checkItemId}|$date"]
                if (progress?.isCompleted == true) {
                    fillPaint.color = resolveAccentColor(item.color)
                    canvas.drawCircle(centerX, centerY, radius, fillPaint)
                    drawCheck(canvas, centerX, centerY, radius, checkPaint)
                } else {
                    canvas.drawCircle(centerX, centerY, radius, strokePaint)
                }
            }
        }

        return bitmap
    }

    private fun resolveWeekDates(payload: WidgetDailySyncPayload?): List<String> {
        val start = payload?.weekStartDate?.takeIf { it.matches(Regex("\\d{4}-\\d{2}-\\d{2}")) }
        if (start != null) {
            val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val startDate = formatter.parse(start)
            if (startDate != null) {
                val calendar = Calendar.getInstance().apply { time = startDate }
                return List(7) {
                    val result = formatter.format(calendar.time)
                    calendar.add(Calendar.DAY_OF_MONTH, 1)
                    result
                }
            }
        }
        return emptyList()
    }

    private fun formatWeekRange(payload: WidgetDailySyncPayload?): String {
        val start = payload?.weekStartDate?.takeIf { it.isNotBlank() }
        val end = payload?.weekEndDate?.takeIf { it.isNotBlank() }
        return if (start != null && end != null && start.length >= 10 && end.length >= 10) {
            "${start.substring(5).replace('-', '/')} - ${end.substring(5).replace('-', '/')}"
        } else {
            "--/-- - --/--"
        }
    }

    private fun drawCheck(canvas: Canvas, centerX: Float, centerY: Float, radius: Float, paint: Paint) {
        canvas.drawLine(centerX - radius * 0.42f, centerY, centerX - radius * 0.10f, centerY + radius * 0.31f, paint)
        canvas.drawLine(centerX - radius * 0.10f, centerY + radius * 0.31f, centerX + radius * 0.48f, centerY - radius * 0.34f, paint)
    }

    private fun ellipsize(text: String, paint: TextPaint, maxWidth: Float): String {
        if (text.isBlank() || paint.measureText(text) <= maxWidth) {
            return text
        }
        val suffix = "\u2026"
        var value = text
        while (value.isNotEmpty() && paint.measureText(value + suffix) > maxWidth) {
            value = value.dropLast(1)
        }
        return if (value.isBlank()) suffix else value + suffix
    }

    private fun resolveAccentColor(color: String?): Int {
        val normalized = color?.trim().orEmpty()
        if (normalized.startsWith("#")) {
            return runCatching { Color.parseColor(normalized) }.getOrDefault(Color.parseColor(DEFAULT_ACCENT_COLOR))
        }
        val palette = when {
            normalized.contains("rose") -> "#F43F5E"
            normalized.contains("red") -> "#EF4444"
            normalized.contains("orange") -> "#F97316"
            normalized.contains("amber") -> "#F59E0B"
            normalized.contains("yellow") -> "#EAB308"
            normalized.contains("lime") -> "#84CC16"
            normalized.contains("emerald") -> "#10B981"
            normalized.contains("green") -> "#22C55E"
            normalized.contains("teal") -> "#14B8A6"
            normalized.contains("cyan") -> "#06B6D4"
            normalized.contains("sky") -> "#0EA5E9"
            normalized.contains("blue") -> "#3B82F6"
            normalized.contains("indigo") -> "#6366F1"
            normalized.contains("violet") -> "#8B5CF6"
            normalized.contains("purple") -> "#A855F7"
            else -> DEFAULT_ACCENT_COLOR
        }
        return Color.parseColor(palette)
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
