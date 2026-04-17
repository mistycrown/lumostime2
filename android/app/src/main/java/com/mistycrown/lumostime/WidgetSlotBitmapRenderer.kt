package com.mistycrown.lumostime

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.text.TextPaint

/**
 * Renders widget slot visuals as bitmaps so RemoteViews can show
 * dynamic timer states and daily-check progress states.
 */
object WidgetSlotBitmapRenderer {
    private const val SLOT_SIZE_DP = 72f
    private const val CIRCLE_INSET_DP = 4f
    private const val STOP_SIZE_DP = 22f
    private const val STOP_RADIUS_DP = 3f
    private const val EMOJI_TEXT_SIZE_DP = 28f
    private const val DAILY_CHECK_TEXT_SIZE_DP = 26f
    private const val DAILY_COUNT_EMOJI_SIZE_DP = 20f
    private const val DAILY_COUNT_TEXT_SIZE_DP = 15f
    private const val CHECK_MARK = "\u2713"

    fun render(context: Context, slot: WidgetSnapshotSlot): Bitmap {
        val sizePx = dpToPx(context, SLOT_SIZE_DP)
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val tapScale = getTapScale(slot.tapAnimationProgress)
        val isTapAnimated = tapScale != 1f

        val baseColor = parseColor(slot.color)
        val dailyAccentColor = darkenColor(baseColor, 0.34f)
        val fillColor = when {
            slot.widgetType == WidgetTypes.TIMER && slot.isActive -> baseColor
            slot.widgetType == WidgetTypes.DAILY && slot.isCompleted -> baseColor
            else -> blendWithWhite(baseColor, 0.82f)
        }

        val circlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = fillColor
            style = Paint.Style.FILL
        }
        val circleInsetPx = dpToPx(context, CIRCLE_INSET_DP).toFloat()
        val circleRadius = ((sizePx / 2f) - circleInsetPx).coerceAtLeast(0f)
        val animatedCircleRadius = (circleRadius * getTapCircleScale(slot.tapAnimationProgress))
            .coerceAtMost((sizePx / 2f) - 1f)
        canvas.drawCircle(sizePx / 2f, sizePx / 2f, animatedCircleRadius, circlePaint)

        if (slot.widgetType == WidgetTypes.TIMER) {
            if (slot.isActive) {
                drawStop(canvas, context, sizePx, tapScale)
            } else {
                drawCenteredText(
                    canvas,
                    context,
                    sizePx,
                    slot.icon,
                    EMOJI_TEXT_SIZE_DP,
                    Color.parseColor("#1F2937"),
                    tapScale
                )
            }
            return bitmap
        }

        if (slot.isCompleted) {
            drawCenteredText(
                canvas,
                context,
                sizePx,
                CHECK_MARK,
                DAILY_CHECK_TEXT_SIZE_DP,
                dailyAccentColor,
                tapScale
            )
            return bitmap
        }

        if (WidgetDailyModes.normalize(slot.manualMode) == WidgetDailyModes.COUNT && slot.currentCount > 0) {
            drawCountLayout(
                canvas,
                context,
                sizePx,
                slot.icon,
                slot.currentCount,
                dailyAccentColor,
                tapScale
            )
            return bitmap
        }

        drawCenteredText(
            canvas,
            context,
            sizePx,
            slot.icon,
            EMOJI_TEXT_SIZE_DP,
            Color.parseColor("#1F2937"),
            tapScale
        )
        return bitmap
    }

    private fun drawStop(canvas: Canvas, context: Context, sizePx: Int, tapScale: Float) {
        val stopSize = dpToPx(context, STOP_SIZE_DP).toFloat() * tapScale
        val radius = dpToPx(context, STOP_RADIUS_DP).toFloat()
        val left = (sizePx - stopSize) / 2f
        val top = (sizePx - stopSize) / 2f
        val rect = RectF(left, top, left + stopSize, top + stopSize)
        val stopPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE
            style = Paint.Style.FILL
        }
        canvas.drawRoundRect(rect, radius, radius, stopPaint)
    }

    private fun drawCountLayout(
        canvas: Canvas,
        context: Context,
        sizePx: Int,
        icon: String,
        currentCount: Int,
        accentColor: Int,
        tapScale: Float
    ) {
        val emojiPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = accentColor
            textAlign = Paint.Align.CENTER
            textSize = dpToPx(context, DAILY_COUNT_EMOJI_SIZE_DP).toFloat() * tapScale
        }
        val countPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = accentColor
            textAlign = Paint.Align.CENTER
            textSize = dpToPx(context, DAILY_COUNT_TEXT_SIZE_DP).toFloat() * tapScale
            isFakeBoldText = true
        }

        val iconY = sizePx * 0.42f - ((emojiPaint.descent() + emojiPaint.ascent()) / 2f)
        val countY = sizePx * 0.68f - ((countPaint.descent() + countPaint.ascent()) / 2f)
        canvas.drawText(icon.ifBlank { "\u2022" }, sizePx / 2f, iconY, emojiPaint)
        canvas.drawText(currentCount.toString(), sizePx / 2f, countY, countPaint)
    }

    private fun drawCenteredText(
        canvas: Canvas,
        context: Context,
        sizePx: Int,
        text: String,
        textSizeDp: Float,
        textColor: Int,
        tapScale: Float = 1f
    ) {
        val textPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = textColor
            textAlign = Paint.Align.CENTER
            textSize = dpToPx(context, textSizeDp).toFloat() * tapScale
            isFakeBoldText = text == CHECK_MARK
        }
        val baseline = (sizePx / 2f) - ((textPaint.descent() + textPaint.ascent()) / 2f)
        canvas.drawText(text.ifBlank { "\u2022" }, sizePx / 2f, baseline, textPaint)
    }

    private fun getTapScale(progress: Float?): Float {
        val safeProgress = progress ?: return 1f
        return when {
            safeProgress < 0.2f -> lerp(0.94f, 0.985f, safeProgress / 0.2f)
            safeProgress < 0.52f -> lerp(0.985f, 1.11f, (safeProgress - 0.2f) / 0.32f)
            safeProgress < 0.78f -> lerp(1.11f, 1.02f, (safeProgress - 0.52f) / 0.26f)
            else -> lerp(1.02f, 1f, (safeProgress - 0.78f) / 0.22f)
        }
    }

    private fun getTapCircleScale(progress: Float?): Float {
        val safeProgress = progress ?: return 1f
        return when {
            safeProgress < 0.2f -> lerp(0.985f, 1.015f, safeProgress / 0.2f)
            safeProgress < 0.52f -> lerp(1.015f, 1.05f, (safeProgress - 0.2f) / 0.32f)
            safeProgress < 0.78f -> lerp(1.05f, 1.018f, (safeProgress - 0.52f) / 0.26f)
            else -> lerp(1.018f, 1f, (safeProgress - 0.78f) / 0.22f)
        }
    }

    private fun lerp(start: Float, end: Float, progress: Float): Float {
        return start + (end - start) * progress.coerceIn(0f, 1f)
    }

    private fun parseColor(raw: String): Int {
        return try {
            Color.parseColor(raw)
        } catch (_: IllegalArgumentException) {
            Color.parseColor("#E7E5E4")
        }
    }

    private fun blendWithWhite(colorInt: Int, ratio: Float): Int {
        val clamped = ratio.coerceIn(0f, 1f)
        val red = Color.red(colorInt)
        val green = Color.green(colorInt)
        val blue = Color.blue(colorInt)

        val mixedRed = red + ((255 - red) * clamped).toInt()
        val mixedGreen = green + ((255 - green) * clamped).toInt()
        val mixedBlue = blue + ((255 - blue) * clamped).toInt()
        return Color.rgb(mixedRed, mixedGreen, mixedBlue)
    }

    private fun darkenColor(colorInt: Int, ratio: Float): Int {
        val clamped = ratio.coerceIn(0f, 1f)
        val red = (Color.red(colorInt) * (1f - clamped)).toInt()
        val green = (Color.green(colorInt) * (1f - clamped)).toInt()
        val blue = (Color.blue(colorInt) * (1f - clamped)).toInt()
        return Color.rgb(red, green, blue)
    }

    private fun dpToPx(context: Context, dp: Float): Int {
        return (dp * context.resources.displayMetrics.density).toInt().coerceAtLeast(1)
    }
}
