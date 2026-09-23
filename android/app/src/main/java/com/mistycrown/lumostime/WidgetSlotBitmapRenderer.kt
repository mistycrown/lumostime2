package com.mistycrown.lumostime

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.text.TextPaint
import android.util.LruCache

/**
 * Renders widget slot visuals as bitmaps so RemoteViews can show
 * dynamic timer states and daily-check progress states.
 *
 * Updated 2026-04-25: Prefer packaged UI icon assets for widget slots and
 * cache decoded bitmaps so unlocked icon rendering does not add visible lag.
 * Updated 2026-05-05: Reused the daily completion checkmark for successful quick-punch shortcut taps.
 * Updated 2026-08-06: Exposed packaged UI icon loading for scene time-slot tab rendering.
 */
object WidgetSlotBitmapRenderer {
    private const val SLOT_SIZE_DP = 72f
    private const val CIRCLE_INSET_DP = 4f
    private const val SHORTCUT_CIRCLE_INSET_DP = 3f
    private const val SHORTCUT_EMOJI_TEXT_SIZE_DP = 34f
    private const val STOP_SIZE_DP = 22f
    private const val STOP_RADIUS_DP = 3f
    private const val EMOJI_TEXT_SIZE_DP = 28f
    private const val DAILY_CHECK_TEXT_SIZE_DP = 26f
    private const val DAILY_COUNT_EMOJI_SIZE_DP = 20f
    private const val DAILY_COUNT_TEXT_SIZE_DP = 15f
    private const val CHECK_MARK = "\u2713"

    private val iconBitmapCache = object : LruCache<String, Bitmap>(48) {}

    fun render(context: Context, slot: WidgetSnapshotSlot): Bitmap {
        val sizePx = dpToPx(context, SLOT_SIZE_DP)
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val tapScale = getTapScale(slot.tapAnimationProgress)
        val slotType = WidgetTypes.normalize(slot.slotType)

        if (slotType == WidgetTypes.SHORTCUT) {
            drawShortcutSlot(canvas, context, sizePx, slot, tapScale)
            return bitmap
        }

        val baseColor = parseColor(slot.color)
        val dailyAccentColor = darkenColor(baseColor, 0.34f)
        val fillColor = when {
            slotType == WidgetTypes.TIMER && slot.isActive -> baseColor
            slotType == WidgetTypes.DAILY && slot.isCompleted -> baseColor
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

        if (slotType == WidgetTypes.TIMER) {
            if (slot.isActive) {
                drawStop(canvas, context, sizePx, tapScale)
            } else {
                drawCenteredIconOrText(
                    canvas = canvas,
                    context = context,
                    sizePx = sizePx,
                    slot = slot,
                    text = slot.icon,
                    textSizeDp = EMOJI_TEXT_SIZE_DP,
                    textColor = Color.parseColor("#1F2937"),
                    tapScale = tapScale
                )
            }
            return bitmap
        }

        if (slot.isCompleted) {
            drawCenteredText(
                canvas = canvas,
                context = context,
                sizePx = sizePx,
                text = CHECK_MARK,
                textSizeDp = DAILY_CHECK_TEXT_SIZE_DP,
                textColor = dailyAccentColor,
                tapScale = tapScale
            )
            return bitmap
        }

        if (WidgetDailyModes.normalize(slot.manualMode) == WidgetDailyModes.COUNT && slot.currentCount > 0) {
            drawCountLayout(
                canvas = canvas,
                context = context,
                sizePx = sizePx,
                slot = slot,
                currentCount = slot.currentCount,
                accentColor = dailyAccentColor,
                tapScale = tapScale
            )
            return bitmap
        }

        drawCenteredIconOrText(
            canvas = canvas,
            context = context,
            sizePx = sizePx,
            slot = slot,
            text = slot.icon,
            textSizeDp = EMOJI_TEXT_SIZE_DP,
            textColor = Color.parseColor("#1F2937"),
            tapScale = tapScale
        )
        return bitmap
    }

    private fun drawShortcutSlot(
        canvas: Canvas,
        context: Context,
        sizePx: Int,
        slot: WidgetSnapshotSlot,
        tapScale: Float
    ) {
        val baseColor = parseColor(slot.color)
        val accentColor = darkenColor(baseColor, 0.34f)
        val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = blendWithWhite(baseColor, 0.76f)
            style = Paint.Style.FILL
        }
        val circleInsetPx = dpToPx(context, SHORTCUT_CIRCLE_INSET_DP).toFloat()
        val circleRadius = ((sizePx / 2f) - circleInsetPx).coerceAtLeast(0f)
        val animatedCircleRadius = (circleRadius * getTapCircleScale(slot.tapAnimationProgress))
            .coerceAtMost((sizePx / 2f) - 1f)
        canvas.drawCircle(sizePx / 2f, sizePx / 2f, animatedCircleRadius, fillPaint)

        if (slot.tapAnimationMode == WidgetTapAnimationModes.SHORTCUT_SUCCESS) {
            drawCenteredText(
                canvas = canvas,
                context = context,
                sizePx = sizePx,
                text = CHECK_MARK,
                textSizeDp = DAILY_CHECK_TEXT_SIZE_DP,
                textColor = accentColor,
                tapScale = tapScale
            )
            return
        }

        drawCenteredIconOrText(
            canvas = canvas,
            context = context,
            sizePx = sizePx,
            slot = slot,
            text = slot.icon,
            textSizeDp = SHORTCUT_EMOJI_TEXT_SIZE_DP,
            textColor = Color.parseColor("#1F2937"),
            tapScale = tapScale
        )
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
        slot: WidgetSnapshotSlot,
        currentCount: Int,
        accentColor: Int,
        tapScale: Float
    ) {
        val iconCenterX = sizePx / 2f
        val iconCenterY = sizePx * 0.42f
        val iconSizePx = (dpToPx(context, DAILY_COUNT_EMOJI_SIZE_DP).toFloat() * 1.22f * tapScale)
            .toInt()
            .coerceAtLeast(1)

        if (!drawBitmapIcon(
                canvas = canvas,
                context = context,
                slot = slot,
                centerX = iconCenterX,
                centerY = iconCenterY,
                iconSizePx = iconSizePx
            )
        ) {
            val emojiPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
                color = accentColor
                textAlign = Paint.Align.CENTER
                textSize = dpToPx(context, DAILY_COUNT_EMOJI_SIZE_DP).toFloat() * tapScale
            }
            val iconY = iconCenterY - ((emojiPaint.descent() + emojiPaint.ascent()) / 2f)
            canvas.drawText(slot.icon.ifBlank { "\u2022" }, iconCenterX, iconY, emojiPaint)
        }

        val countPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = accentColor
            textAlign = Paint.Align.CENTER
            textSize = dpToPx(context, DAILY_COUNT_TEXT_SIZE_DP).toFloat() * tapScale
            isFakeBoldText = true
        }
        val countY = sizePx * 0.68f - ((countPaint.descent() + countPaint.ascent()) / 2f)
        canvas.drawText(currentCount.toString(), sizePx / 2f, countY, countPaint)
    }

    private fun drawCenteredIconOrText(
        canvas: Canvas,
        context: Context,
        sizePx: Int,
        slot: WidgetSnapshotSlot,
        text: String,
        textSizeDp: Float,
        textColor: Int,
        tapScale: Float
    ) {
        val iconSizePx = (dpToPx(context, textSizeDp).toFloat() * 1.18f * tapScale)
            .toInt()
            .coerceAtLeast(1)
        val didDrawBitmap = drawBitmapIcon(
            canvas = canvas,
            context = context,
            slot = slot,
            centerX = sizePx / 2f,
            centerY = sizePx / 2f,
            iconSizePx = iconSizePx
        )

        if (!didDrawBitmap) {
            drawCenteredText(
                canvas = canvas,
                context = context,
                sizePx = sizePx,
                text = text,
                textSizeDp = textSizeDp,
                textColor = textColor,
                tapScale = tapScale
            )
        }
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

    private fun drawBitmapIcon(
        canvas: Canvas,
        context: Context,
        slot: WidgetSnapshotSlot,
        centerX: Float,
        centerY: Float,
        iconSizePx: Int
    ): Boolean {
        val bitmap = loadSlotIconBitmap(context, slot, iconSizePx) ?: return false
        val left = centerX - (bitmap.width / 2f)
        val top = centerY - (bitmap.height / 2f)
        canvas.drawBitmap(bitmap, left, top, null)
        return true
    }

    private fun loadSlotIconBitmap(
        context: Context,
        slot: WidgetSnapshotSlot,
        iconSizePx: Int
    ): Bitmap? {
        return loadUiIconBitmap(
            context,
            slot.uiIconAssetPath,
            slot.uiIconFallbackAssetPath,
            iconSizePx
        )
    }

    fun loadUiIconBitmap(
        context: Context,
        primaryPath: String?,
        fallbackPath: String?,
        iconSizePx: Int
    ): Bitmap? {
        val primaryPathValue = primaryPath?.takeIf { it.isNotBlank() } ?: return null
        val fallbackPathValue = fallbackPath?.takeIf { it.isNotBlank() }
        return decodePackagedBitmap(context, primaryPathValue, iconSizePx)
            ?: fallbackPathValue?.let { decodePackagedBitmap(context, it, iconSizePx) }
    }

    private fun decodePackagedBitmap(
        context: Context,
        assetPath: String,
        iconSizePx: Int
    ): Bitmap? {
        val normalizedAssetPath = assetPath.replace('\\', '/').trimStart('/')
        val cacheKey = "$normalizedAssetPath@$iconSizePx"
        iconBitmapCache.get(cacheKey)?.let { cached ->
            if (!cached.isRecycled) {
                return cached
            }
            iconBitmapCache.remove(cacheKey)
        }

        return try {
            context.assets.open("public/$normalizedAssetPath").use { inputStream ->
                val decoded = BitmapFactory.decodeStream(inputStream) ?: return null
                val scaledBitmap =
                    if (decoded.width == iconSizePx && decoded.height == iconSizePx) {
                        decoded
                    } else {
                        Bitmap.createScaledBitmap(decoded, iconSizePx, iconSizePx, true).also {
                            if (it != decoded) {
                                decoded.recycle()
                            }
                        }
                    }
                iconBitmapCache.put(cacheKey, scaledBitmap)
                scaledBitmap
            }
        } catch (_: Exception) {
            null
        }
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
