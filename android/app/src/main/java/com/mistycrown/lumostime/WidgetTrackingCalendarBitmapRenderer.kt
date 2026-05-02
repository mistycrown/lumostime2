package com.mistycrown.lumostime

import android.appwidget.AppWidgetManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.text.TextPaint
import androidx.collection.LruCache
import java.util.Calendar
import java.util.Locale
import kotlin.math.min

/**
 * Renders the dedicated 2x2 tracking-calendar widget as a single bitmap.
 */
object WidgetTrackingCalendarBitmapRenderer {
    private const val FALLBACK_WIDGET_SIZE_DP = 220f
    private const val DEFAULT_ACCENT_COLOR = "#E7E5E4"
    private val WEEKDAY_LABELS = listOf("M", "T", "W", "T", "F", "S", "S")

    private val iconBitmapCache = object : LruCache<String, Bitmap>(24) {}

    @JvmStatic
    fun render(
        context: Context,
        appWidgetId: Int,
        template: WidgetTemplate?,
        payload: WidgetTrackingCalendarPayload?
    ): Bitmap {
        val density = context.resources.displayMetrics.density
        val widgetWidthPx = resolveWidgetDimensionPx(
            context,
            appWidgetId,
            AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH,
            AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,
            density
        )
        val widgetHeightPx = resolveWidgetDimensionPx(
            context,
            appWidgetId,
            AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT,
            AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,
            density
        )
        val bitmap = Bitmap.createBitmap(widgetWidthPx, widgetHeightPx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.TRANSPARENT)

        val config = template?.trackingConfig
        val accentColor = softenAccentColor(parseColor(config?.color ?: DEFAULT_ACCENT_COLOR))
        val sourcePaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = parseColor("#A8A29E")
            textSize = 9.2f * density
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
            letterSpacing = 0.06f
        }
        val titlePaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = parseColor("#111827")
            textSize = 14.8f * density
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
        }
        val weekdayPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = parseColor("#9CA3AF")
            textSize = 10f * density
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.NORMAL)
            textAlign = Paint.Align.CENTER
        }
        val dayPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = parseColor("#111827")
            textSize = 13f * density
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.NORMAL)
            textAlign = Paint.Align.CENTER
        }
        val activeDayPaint = TextPaint(dayPaint).apply {
            color = Color.WHITE
        }
        val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.FILL
        }

        val headerLeftPadding = 16f * density
        val headerRightPadding = 14f * density
        val gridLeftPadding = 1.5f * density
        val gridRightPadding = 1f * density
        val gridBottomPadding = 2f * density
        val sourceBaseline = 18f * density
        val titleBaseline = 35f * density
        val title = resolveTitle(template).ifBlank { "\u8ffd\u8e2a\u65e5\u5386" }
        val iconCenterY = 28f * density
        val iconCenterX = widgetWidthPx - headerRightPadding - 16f * density

        canvas.drawText(sourceLabelForConfig(config), headerLeftPadding, sourceBaseline, sourcePaint)
        val titleMaxWidth = iconCenterX - headerLeftPadding - 18f * density
        val titleText = ellipsizeText(title, titlePaint, titleMaxWidth)
        canvas.drawText(titleText, headerLeftPadding, titleBaseline, titlePaint)

        drawHeaderIcon(
            canvas = canvas,
            context = context,
            config = config,
            density = density,
            centerX = iconCenterX,
            centerY = iconCenterY
        )

        val payloadTemplate = resolveTemplatePayload(template, payload)
        val calendar = Calendar.getInstance()
        val dayValueMap = payloadTemplate?.entries
            ?.filter { entry -> entry.date.startsWith(monthPrefix(calendar)) }
            ?.associate { entry -> dayOfMonth(entry.date) to entry.value.coerceAtLeast(0) }
            ?: emptyMap()

        val gridTop = 52f * density
        val gridBottom = widgetHeightPx - gridBottomPadding
        val gridLeft = gridLeftPadding
        val gridRight = widgetWidthPx - gridRightPadding
        val weekdayHeight = 12f * density
        val cellGapX = 3.2f * density
        val cellGapY = 5.6f * density
        val cellSize = min(
            (gridRight - gridLeft - cellGapX * 6f) / 7f,
            (gridBottom - (gridTop + weekdayHeight) - cellGapY * 5f) / 6f
        )
        val gridWidth = cellSize * 7f + cellGapX * 6f
        val centeredGridLeft = gridLeft + (gridRight - gridLeft - gridWidth) / 2f
        val centeredGridTop = gridTop + weekdayHeight + 6f * density

        WEEKDAY_LABELS.forEachIndexed { index, label ->
            val centerX = centeredGridLeft + index * (cellSize + cellGapX) + cellSize / 2f
            canvas.drawText(label, centerX, gridTop + weekdayHeight, weekdayPaint)
        }

        val monthStart = Calendar.getInstance().apply {
            time = calendar.time
            set(Calendar.DAY_OF_MONTH, 1)
        }
        val rawDayOfWeek = monthStart.get(Calendar.DAY_OF_WEEK)
        val startOffset = if (rawDayOfWeek == Calendar.SUNDAY) 6 else rawDayOfWeek - Calendar.MONDAY
        val dayCount = monthStart.getActualMaximum(Calendar.DAY_OF_MONTH)
        val circleRadius = cellSize * 0.475f

        for (day in 1..dayCount) {
            val cellIndex = startOffset + day - 1
            val row = cellIndex / 7
            val column = cellIndex % 7
            val centerX = centeredGridLeft + column * (cellSize + cellGapX) + cellSize / 2f
            val centerY = centeredGridTop + row * (cellSize + cellGapY) + cellSize / 2f
            val value = dayValueMap[day] ?: 0
            val isActive = value > 0

            if (isActive) {
                fillPaint.color = accentColor
                canvas.drawCircle(centerX, centerY, circleRadius, fillPaint)
            }

            val textPaint = if (isActive) activeDayPaint else dayPaint
            val baseline = centerY - ((textPaint.descent() + textPaint.ascent()) / 2f)
            canvas.drawText(day.toString(), centerX, baseline, textPaint)
        }

        return bitmap
    }

    @JvmStatic
    fun resolveTitle(template: WidgetTemplate?): String {
        if (template == null) {
            return ""
        }
        return template.name.ifBlank {
            template.trackingConfig?.label?.takeIf { it.isNotBlank() } ?: ""
        }
    }

    private fun sourceLabelForConfig(config: WidgetTrackingCalendarConfig?): String {
        return when (config?.sourceType) {
            "tag" -> "\u6807\u7b7e"
            "scope" -> "\u9886\u57df"
            "daily" -> "\u65e5\u8bfe"
            else -> "\u8ffd\u8e2a"
        }
    }

    private fun resolveTemplatePayload(
        template: WidgetTemplate?,
        payload: WidgetTrackingCalendarPayload?
    ): WidgetTrackingCalendarTemplatePayload? {
        val templateId = template?.id ?: return null
        return payload?.templates?.firstOrNull { it.templateId == templateId }
    }

    private fun drawHeaderIcon(
        canvas: Canvas,
        context: Context,
        config: WidgetTrackingCalendarConfig?,
        density: Float,
        centerX: Float,
        centerY: Float
    ) {
        if (config == null) {
            return
        }

        val iconSizePx = (20f * density).toInt().coerceAtLeast(1)
        val iconBitmap = loadIconBitmap(context, config, iconSizePx)
        if (iconBitmap != null) {
            canvas.drawBitmap(
                iconBitmap,
                centerX - iconBitmap.width / 2f,
                centerY - iconBitmap.height / 2f,
                null
            )
            return
        }

        val emojiPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = parseColor("#44403C")
            textSize = 18f * density
            textAlign = Paint.Align.CENTER
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
        }
        val baseline = centerY - ((emojiPaint.descent() + emojiPaint.ascent()) / 2f)
        canvas.drawText(config.icon?.ifBlank { "\u2022" } ?: "\u2022", centerX, baseline, emojiPaint)
    }

    private fun loadIconBitmap(
        context: Context,
        config: WidgetTrackingCalendarConfig,
        iconSizePx: Int
    ): Bitmap? {
        val primaryPath = config.uiIconAssetPath?.takeIf { it.isNotBlank() } ?: return null
        val fallbackPath = config.uiIconFallbackAssetPath?.takeIf { it.isNotBlank() }
        return decodePackagedBitmap(context, primaryPath, iconSizePx)
            ?: fallbackPath?.let { decodePackagedBitmap(context, it, iconSizePx) }
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

    private fun ellipsizeText(
        text: String,
        paint: TextPaint,
        maxWidth: Float
    ): String {
        if (text.isBlank() || paint.measureText(text) <= maxWidth) {
            return text
        }

        val ellipsis = "\u2026"
        val ellipsisWidth = paint.measureText(ellipsis)
        var trimmed = text
        while (trimmed.isNotEmpty() && paint.measureText(trimmed) + ellipsisWidth > maxWidth) {
            trimmed = trimmed.dropLast(1)
        }
        return if (trimmed.isEmpty()) ellipsis else trimmed + ellipsis
    }

    private fun dayOfMonth(dateStr: String): Int {
        return dateStr.takeLast(2).toIntOrNull() ?: -1
    }

    private fun monthPrefix(calendar: Calendar): String {
        return String.format(
            Locale.getDefault(),
            "%04d-%02d",
            calendar.get(Calendar.YEAR),
            calendar.get(Calendar.MONTH) + 1
        )
    }

    private fun resolveWidgetDimensionPx(
        context: Context,
        appWidgetId: Int,
        primaryKey: String,
        fallbackKey: String,
        density: Float
    ): Int {
        val fallbackPx = (FALLBACK_WIDGET_SIZE_DP * density).toInt().coerceAtLeast(1)
        if (appWidgetId <= 0) {
            return fallbackPx
        }

        return try {
            val options = AppWidgetManager.getInstance(context).getAppWidgetOptions(appWidgetId)
            val primaryDp = options.getInt(primaryKey, 0)
            val fallbackDp = options.getInt(fallbackKey, 0)
            val resolvedDp = maxOf(primaryDp, fallbackDp)
            if (resolvedDp > 0) {
                (resolvedDp * density).toInt().coerceAtLeast(1)
            } else {
                fallbackPx
            }
        } catch (_: Exception) {
            fallbackPx
        }
    }

    private fun softenAccentColor(color: Int): Int {
        val alpha = Color.alpha(color)
        val red = Color.red(color)
        val green = Color.green(color)
        val blue = Color.blue(color)
        val mixRatio = 0.28f
        val mixedRed = (red + ((255 - red) * mixRatio)).toInt().coerceIn(0, 255)
        val mixedGreen = (green + ((255 - green) * mixRatio)).toInt().coerceIn(0, 255)
        val mixedBlue = (blue + ((255 - blue) * mixRatio)).toInt().coerceIn(0, 255)
        return Color.argb(alpha, mixedRed, mixedGreen, mixedBlue)
    }

    private fun parseColor(colorString: String): Int {
        return try {
            Color.parseColor(colorString)
        } catch (_: Exception) {
            Color.parseColor(DEFAULT_ACCENT_COLOR)
        }
    }
}

