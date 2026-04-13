package com.mistycrown.lumostime

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.text.TextPaint

/**
 * Renders widget slot visuals as bitmaps so RemoteViews can show
 * dynamic activity colors and packaged uiIcon image assets.
 */
object WidgetSlotBitmapRenderer {
    private const val SLOT_SIZE_DP = 42f
    private const val ICON_SIZE_DP = 20f
    private const val STOP_SIZE_DP = 12f
    private const val STOP_RADIUS_DP = 3f
    private const val EMOJI_TEXT_SIZE_DP = 16f

    fun render(context: Context, slot: WidgetSnapshotSlot): Bitmap {
        val sizePx = dpToPx(context, SLOT_SIZE_DP)
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        val baseColor = parseColor(slot.color)
        val fillColor = if (slot.isActive) {
            baseColor
        } else {
            blendWithWhite(baseColor, 0.82f)
        }

        val circlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = fillColor
            style = Paint.Style.FILL
        }
        canvas.drawCircle(sizePx / 2f, sizePx / 2f, sizePx / 2f, circlePaint)

        if (slot.isActive) {
            drawStop(canvas, context, sizePx)
            return bitmap
        }

        val iconBitmap = loadSlotIconBitmap(context, slot)
        if (iconBitmap != null) {
            drawCenteredBitmap(canvas, iconBitmap, context, sizePx)
            return bitmap
        }

        drawEmoji(canvas, context, sizePx, slot.icon)
        return bitmap
    }

    private fun drawStop(canvas: Canvas, context: Context, sizePx: Int) {
        val stopSize = dpToPx(context, STOP_SIZE_DP).toFloat()
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

    private fun drawCenteredBitmap(canvas: Canvas, iconBitmap: Bitmap, context: Context, sizePx: Int) {
        val iconSize = dpToPx(context, ICON_SIZE_DP)
        val scaled = Bitmap.createScaledBitmap(iconBitmap, iconSize, iconSize, true)
        val left = (sizePx - iconSize) / 2f
        val top = (sizePx - iconSize) / 2f
        canvas.drawBitmap(scaled, left, top, null)
    }

    private fun drawEmoji(canvas: Canvas, context: Context, sizePx: Int, icon: String) {
        val textPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#1F2937")
            textAlign = Paint.Align.CENTER
            textSize = dpToPx(context, EMOJI_TEXT_SIZE_DP).toFloat()
        }
        val baseline = (sizePx / 2f) - ((textPaint.descent() + textPaint.ascent()) / 2f)
        canvas.drawText(icon.ifBlank { "\u2022" }, sizePx / 2f, baseline, textPaint)
    }

    private fun loadSlotIconBitmap(context: Context, slot: WidgetSnapshotSlot): Bitmap? {
        val primary = slot.uiIconAssetPath?.takeIf { it.isNotBlank() }
        val fallback = slot.uiIconFallbackAssetPath?.takeIf { it.isNotBlank() }
        return loadAssetBitmap(context, primary) ?: loadAssetBitmap(context, fallback)
    }

    private fun loadAssetBitmap(context: Context, assetPath: String?): Bitmap? {
        if (assetPath.isNullOrBlank()) {
            return null
        }

        return runCatching {
            context.assets.open("public/$assetPath").use { input ->
                BitmapFactory.decodeStream(input)
            }
        }.getOrNull()
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

    private fun dpToPx(context: Context, dp: Float): Int {
        return (dp * context.resources.displayMetrics.density).toInt().coerceAtLeast(1)
    }
}
