package com.mistycrown.lumostime

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.text.TextPaint
import androidx.collection.LruCache
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import kotlin.math.min

/**
 * Renders the dedicated 2x2 tracking-calendar widget body as a bitmap.
 */
object WidgetTrackingCalendarBitmapRenderer {
    private const val BITMAP_WIDTH_DP = 220f
    private const val BITMAP_HEIGHT_DP = 118f
    private const val EMPTY_DAY_COLOR = "#F5F5F4"
    private const val DEFAULT_ACCENT_COLOR = "#E7E5E4"

    private val iconBitmapCache = object : LruCache<String, Bitmap>(24) {}

    @JvmStatic
    fun render(
        context: Context,
        template: WidgetTemplate?,
        payload: WidgetTrackingCalendarPayload?
    ): Bitmap {
        val density = context.resources.displayMetrics.density
        val width = (BITMAP_WIDTH_DP * density).toInt().coerceAtLeast(1)
        val height = (BITMAP_HEIGHT_DP * density).toInt().coerceAtLeast(1)
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.TRANSPARENT)

        val config = template?.trackingConfig
        val accentColor = parseColor(config?.color ?: DEFAULT_ACCENT_COLOR)
        val weekdayPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = parseColor("#78716C")
            textSize = 9.8f * density
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
            textAlign = Paint.Align.CENTER
        }
        val dayPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = parseColor("#1C1917")
            textSize = 12.4f * density
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textAlign = Paint.Align.CENTER
        }
        val activeDayPaint = TextPaint(dayPaint).apply {
            color = Color.WHITE
        }
        val monthPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = parseColor("#A8A29E")
            textSize = 9.4f * density
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.NORMAL)
            letterSpacing = 0.04f
            textAlign = Paint.Align.RIGHT
        }
        val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.FILL
        }
        val outlinePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = 1.4f * density
            color = parseColor("#D6D3D1")
        }

        drawHeaderIcon(
            canvas = canvas,
            context = context,
            config = config,
            density = density
        )

        val calendar = Calendar.getInstance()
        val payloadTemplate = resolveTemplatePayload(template, payload)
        val dayValueMap = payloadTemplate?.entries
            ?.filter { entry -> entry.date.startsWith(monthPrefix(calendar)) }
            ?.associate { entry -> dayOfMonth(entry.date) to entry.value.coerceAtLeast(0) }
            ?: emptyMap()

        canvas.drawText(
            String.format(Locale.getDefault(), "%d.%02d", calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH) + 1),
            width - 12f * density,
            18f * density,
            monthPaint
        )

        val left = 8f * density
        val top = 24f * density
        val right = width - 8f * density
        val bottom = height - 4f * density
        val weekdayRowHeight = 12f * density
        val weekdayLabels = listOf("日", "一", "二", "三", "四", "五", "六")
        val cellGap = 4f * density
        val gridTop = top + weekdayRowHeight + 6f * density
        val gridHeight = bottom - gridTop
        val cellSize = min(
            (right - left - cellGap * 6f) / 7f,
            (gridHeight - cellGap * 5f) / 6f
        )
        val gridWidth = cellSize * 7f + cellGap * 6f
        val gridLeft = left + (right - left - gridWidth) / 2f

        weekdayLabels.forEachIndexed { index, label ->
            val centerX = gridLeft + index * (cellSize + cellGap) + cellSize / 2f
            canvas.drawText(label, centerX, top + weekdayRowHeight, weekdayPaint)
        }

        val monthStart = Calendar.getInstance().apply {
            time = calendar.time
            set(Calendar.DAY_OF_MONTH, 1)
        }
        val startOffset = monthStart.get(Calendar.DAY_OF_WEEK) - 1
        val dayCount = monthStart.getActualMaximum(Calendar.DAY_OF_MONTH)
        val todayDay = if (isTodayInMonth(calendar)) calendar.get(Calendar.DAY_OF_MONTH) else -1
        val circleRadius = cellSize * 0.46f

        for (day in 1..dayCount) {
            val cellIndex = startOffset + day - 1
            val row = cellIndex / 7
            val column = cellIndex % 7
            val centerX = gridLeft + column * (cellSize + cellGap) + cellSize / 2f
            val centerY = gridTop + row * (cellSize + cellGap) + cellSize / 2f
            val value = dayValueMap[day] ?: 0
            val isActive = value > 0
            val isToday = day == todayDay

            fillPaint.color = if (isActive) accentColor else parseColor(EMPTY_DAY_COLOR)
            canvas.drawCircle(centerX, centerY, circleRadius, fillPaint)
            if (isToday && !isActive) {
                canvas.drawCircle(centerX, centerY, circleRadius, outlinePaint)
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

        return template.trackingConfig?.label?.takeIf { it.isNotBlank() }
            ?: template.name
    }

    @JvmStatic
    fun formatStatus(
        template: WidgetTemplate?,
        payload: WidgetTrackingCalendarPayload?
    ): String {
        val config = template?.trackingConfig ?: return "未配置"
        val currentMonthValues = resolveTemplatePayload(template, payload)?.entries
            ?.filter { it.date.startsWith(monthPrefix(Calendar.getInstance())) }
            .orEmpty()

        return if (config.sourceType == "daily") {
            "${currentMonthValues.count { it.value > 0 }}天"
        } else {
            formatDuration(currentMonthValues.sumOf { it.value.coerceAtLeast(0) })
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
        density: Float
    ) {
        if (config == null) {
            return
        }

        val centerX = 16f * density
        val centerY = 14f * density
        val iconSizePx = (18f * density).toInt().coerceAtLeast(1)
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
            textSize = 16f * density
            textAlign = Paint.Align.CENTER
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
        }
        val baseline = centerY - ((emojiPaint.descent() + emojiPaint.ascent()) / 2f)
        canvas.drawText(config.icon?.ifBlank { "•" } ?: "•", centerX, baseline, emojiPaint)
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
            context.assets.open(normalizedAssetPath).use { inputStream ->
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

    private fun isTodayInMonth(calendar: Calendar): Boolean {
        val now = Calendar.getInstance()
        return now.get(Calendar.YEAR) == calendar.get(Calendar.YEAR)
            && now.get(Calendar.MONTH) == calendar.get(Calendar.MONTH)
    }

    private fun formatDuration(totalMinutes: Int): String {
        val safeMinutes = totalMinutes.coerceAtLeast(0)
        val hours = safeMinutes / 60
        val minutes = safeMinutes % 60
        return when {
            hours > 0 && minutes > 0 -> "${hours}h${minutes}m"
            hours > 0 -> "${hours}h"
            else -> "${minutes}m"
        }
    }

    private fun parseColor(colorString: String): Int {
        return try {
            Color.parseColor(colorString)
        } catch (_: Exception) {
            Color.parseColor(DEFAULT_ACCENT_COLOR)
        }
    }
}
