package com.mistycrown.lumostime

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path

/**
 * Renders the compact scene-widget refresh icon as a lightweight bitmap so
 * RemoteViews can show a single-turn spin feedback animation on tap.
 */
object WidgetSceneRefreshBitmapRenderer {
    private const val ICON_SIZE_DP = 18f
    private const val STROKE_WIDTH_DP = 1.55f
    private const val ARC_INSET_DP = 2.8f
    private const val ARROW_SIZE_DP = 4.2f
    private const val START_ANGLE = -48f
    private const val SWEEP_ANGLE = 282f
    private const val TOTAL_ROTATION_DEGREES = 360f
    private const val IDLE_COLOR = "#8A8178"
    private const val ACTIVE_COLOR = "#5F564D"

    fun render(context: Context, progress: Float?): Bitmap {
        val sizePx = dpToPx(context, ICON_SIZE_DP)
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val center = sizePx / 2f
        val normalizedProgress = progress?.coerceIn(0f, 1f) ?: 0f
        val rotation = TOTAL_ROTATION_DEGREES * easeInOut(normalizedProgress)
        val strokeWidth = dpToPx(context, STROKE_WIDTH_DP).toFloat()
        val inset = dpToPx(context, ARC_INSET_DP).toFloat()
        val radius = (center - inset).coerceAtLeast(strokeWidth)

        val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor(if (normalizedProgress in 0.001f..0.999f) ACTIVE_COLOR else IDLE_COLOR)
            style = Paint.Style.STROKE
            strokeCap = Paint.Cap.ROUND
            this.strokeWidth = strokeWidth
        }
        val arrowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = strokePaint.color
            style = Paint.Style.FILL
        }

        canvas.save()
        canvas.rotate(rotation, center, center)
        canvas.drawArc(
            inset,
            inset,
            sizePx - inset,
            sizePx - inset,
            START_ANGLE,
            SWEEP_ANGLE,
            false,
            strokePaint
        )

        val arrowSize = dpToPx(context, ARROW_SIZE_DP).toFloat()
        val arrowAngleRad = Math.toRadians((START_ANGLE + SWEEP_ANGLE).toDouble())
        val tipX = center + (radius * kotlin.math.cos(arrowAngleRad)).toFloat()
        val tipY = center + (radius * kotlin.math.sin(arrowAngleRad)).toFloat()
        val tangentX = (-kotlin.math.sin(arrowAngleRad)).toFloat()
        val tangentY = kotlin.math.cos(arrowAngleRad).toFloat()
        val normalX = kotlin.math.cos(arrowAngleRad).toFloat()
        val normalY = kotlin.math.sin(arrowAngleRad).toFloat()

        val arrowPath = Path().apply {
            moveTo(tipX, tipY)
            lineTo(
                tipX - (tangentX * arrowSize) - (normalX * (arrowSize * 0.55f)),
                tipY - (tangentY * arrowSize) - (normalY * (arrowSize * 0.55f))
            )
            lineTo(
                tipX - (tangentX * (arrowSize * 0.18f)) + (normalX * (arrowSize * 1.05f)),
                tipY - (tangentY * (arrowSize * 0.18f)) + (normalY * (arrowSize * 1.05f))
            )
            close()
        }
        canvas.drawPath(arrowPath, arrowPaint)
        canvas.restore()
        return bitmap
    }

    private fun easeInOut(progress: Float): Float {
        return if (progress < 0.5f) {
            4f * progress * progress * progress
        } else {
            val shifted = (-2f * progress) + 2f
            1f - ((shifted * shifted * shifted) / 2f)
        }
    }

    private fun dpToPx(context: Context, dp: Float): Int {
        return (dp * context.resources.displayMetrics.density).toInt().coerceAtLeast(1)
    }
}
