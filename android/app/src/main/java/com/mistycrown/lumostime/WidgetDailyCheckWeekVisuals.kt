package com.mistycrown.lumostime

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import kotlin.math.max
import kotlin.math.min

/**
 * Shared visual geometry and state-cell drawing for the daily-check week widgets.
 * Updated 2026-08-10: Unified both widget sizes with the reference square-cell style.
 * Updated 2026-08-10: Moved the grid left and reduced the right inset for denser layouts.
 * Updated 2026-08-10: Moved the grid closer to daily-check labels to match the reference layout.
 * Updated 2026-08-10: Allowed full-widget renderers to use the same effective content inset as list rows.
 * Updated 2026-08-10: Made completion marks and counts use darker shades of their item colors.
 */
object WidgetDailyCheckWeekVisuals {
    private const val DEFAULT_ACCENT_COLOR = "#34D399"
    private const val GRID_LEFT_RATIO = 0.43f
    private const val GRID_LEFT_MIN_DP = 96f
    private const val GRID_RIGHT_INSET_DP = 8f
    private const val CELL_RADIUS_DP = 7.5f

    data class Grid(val left: Float, val right: Float, val step: Float)

    @JvmStatic
    fun grid(width: Int, density: Float, outerInsetDp: Float = 0f): Grid {
        val outerInset = outerInsetDp * density
        val contentWidth = (width - outerInset * 2f).coerceAtLeast(1f)
        val left = outerInset + max(contentWidth * GRID_LEFT_RATIO, GRID_LEFT_MIN_DP * density)
        val right = width - outerInset - GRID_RIGHT_INSET_DP * density
        return Grid(left, right, ((right - left) / 6f).coerceAtLeast(0f))
    }

    @JvmStatic
    fun cellRadius(height: Float, density: Float, columnStep: Float): Float {
        return min(CELL_RADIUS_DP * density, min(height * 0.24f, columnStep * 0.43f))
            .coerceAtLeast(3.8f * density)
    }

    @JvmStatic
    fun drawStateCell(
        canvas: Canvas,
        centerX: Float,
        centerY: Float,
        radius: Float,
        progress: WidgetDailyProgress?,
        item: WidgetDailyCheckMeta,
        density: Float,
        fillPaint: Paint,
        textPaint: Paint,
        checkPaint: Paint
    ) {
        val cellRect = RectF(
            centerX - radius,
            centerY - radius,
            centerX + radius,
            centerY + radius
        )
        if (progress == null || (!progress.isCompleted && progress.currentCount <= 0)) {
            fillPaint.color = Color.rgb(245, 245, 244)
            canvas.drawRoundRect(cellRect, radius * 0.28f, radius * 0.28f, fillPaint)
            return
        }

        fillPaint.color = pastelAccentColor(item.color)
        canvas.drawRoundRect(cellRect, radius * 0.28f, radius * 0.28f, fillPaint)

        if (WidgetDailyModes.normalize(progress.manualMode) == WidgetDailyModes.COUNT
            && progress.currentCount > 0
            && !progress.isCompleted
        ) {
            textPaint.color = foregroundAccentColor(item.color)
            textPaint.textSize = radius * 0.95f
            textPaint.textAlign = Paint.Align.CENTER
            val baseline = centerY - ((textPaint.descent() + textPaint.ascent()) / 2f)
            canvas.drawText(progress.currentCount.toString(), centerX, baseline, textPaint)
            return
        }

        checkPaint.color = foregroundAccentColor(item.color)
        checkPaint.strokeWidth = max(1.65f * density, radius * 0.18f)
        canvas.drawLine(centerX - radius * 0.46f, centerY, centerX - radius * 0.12f, centerY + radius * 0.34f, checkPaint)
        canvas.drawLine(centerX - radius * 0.12f, centerY + radius * 0.34f, centerX + radius * 0.50f, centerY - radius * 0.38f, checkPaint)
    }

    @JvmStatic
    fun pastelAccentColor(color: String?): Int {
        val accent = accentColor(color)
        val red = (Color.red(accent) + 255 * 3) / 4
        val green = (Color.green(accent) + 255 * 3) / 4
        val blue = (Color.blue(accent) + 255 * 3) / 4
        return Color.rgb(red, green, blue)
    }

    @JvmStatic
    fun foregroundAccentColor(color: String?): Int {
        val hsv = FloatArray(3)
        Color.colorToHSV(accentColor(color), hsv)
        hsv[1] = max(hsv[1], 0.55f)
        hsv[2] = min(hsv[2] * 0.62f, 0.62f)
        return Color.HSVToColor(hsv)
    }

    @JvmStatic
    fun accentColor(color: String?): Int {
        val normalized = color?.trim().orEmpty().lowercase()
        if (normalized.startsWith("#")) {
            return runCatching { Color.parseColor(normalized) }
                .getOrDefault(Color.parseColor(DEFAULT_ACCENT_COLOR))
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
}
