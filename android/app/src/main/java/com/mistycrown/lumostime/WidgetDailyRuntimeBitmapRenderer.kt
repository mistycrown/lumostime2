package com.mistycrown.lumostime

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.min

/**
 * Renders DAILY_RUNTIME heatmap widgets as a single bitmap.
 */
object WidgetDailyRuntimeBitmapRenderer {
    private const val GRID_COLUMNS = 24
    private const val GRID_ROWS = 6
    private const val EMPTY_CELL_COLOR = "#F1F5F9"

    private data class DailyRuntimeRenderSpec(
        val bitmapWidthDp: Float,
        val bitmapHeightDp: Float,
        val showLegend: Boolean
    )

    private data class DailyRuntimeLayout(
        val gridRect: RectF,
        val timeBaseline: Float,
        val legendRect: RectF
    )

    private data class LegendMetrics(
        val dotRadius: Float,
        val rowHeight: Float
    )

    private val expandedSpec = DailyRuntimeRenderSpec(
        bitmapWidthDp = 308f,
        bitmapHeightDp = 224f,
        showLegend = true
    )

    private val compactSpec = DailyRuntimeRenderSpec(
        bitmapWidthDp = 308f,
        bitmapHeightDp = 118f,
        showLegend = false
    )

    @JvmStatic
    fun renderExpanded(
        context: Context,
        payload: WidgetDailyRuntimePayload?,
        viewMode: String
    ): Bitmap = render(context, payload, viewMode, expandedSpec)

    @JvmStatic
    fun renderCompact(
        context: Context,
        payload: WidgetDailyRuntimePayload?,
        viewMode: String
    ): Bitmap = render(context, payload, viewMode, compactSpec)

    @JvmStatic
    fun formatRuntimeStatus(totalMinutes: Int): String {
        val safeMinutes = totalMinutes.coerceAtLeast(0)
        val hours = safeMinutes / 60
        val minutes = safeMinutes % 60
        return String.format("SYS_UP: %02dH:%02dM", hours, minutes)
    }

    @JvmStatic
    fun isPayloadForToday(payload: WidgetDailyRuntimePayload?): Boolean {
        if (payload == null) {
            return false
        }
        return payload.date == SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
    }

    private fun render(
        context: Context,
        payload: WidgetDailyRuntimePayload?,
        viewMode: String,
        spec: DailyRuntimeRenderSpec
    ): Bitmap {
        val density = context.resources.displayMetrics.density
        val width = (spec.bitmapWidthDp * density).toInt().coerceAtLeast(1)
        val height = (spec.bitmapHeightDp * density).toInt().coerceAtLeast(1)
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.TRANSPARENT)

        val bodyPadding = 5f * density
        val left = bodyPadding
        val top = 6f * density
        val right = width - bodyPadding
        val bottom = height - 6f * density

        val timePaint = createTimePaint(density)
        val legendNamePaint = createLegendNamePaint(density)
        val legendDurationPaint = createLegendDurationPaint(density)
        val legendMetrics = createLegendMetrics(density, legendNamePaint, legendDurationPaint)
        val activeViewData = resolveViewData(payload, viewMode)
        val layout = buildLayout(
            left = left,
            top = top,
            right = right,
            bottom = bottom,
            density = density,
            viewData = activeViewData,
            legendMetrics = legendMetrics,
            spec = spec
        )

        drawHeatmapGrid(canvas, layout.gridRect, activeViewData, density)
        drawTimeMarkers(
            canvas = canvas,
            left = layout.gridRect.left,
            right = layout.gridRect.right,
            baselineY = layout.timeBaseline,
            paint = timePaint
        )

        if (spec.showLegend) {
            drawLegend(
                canvas = canvas,
                viewData = activeViewData,
                left = layout.legendRect.left,
                top = layout.legendRect.top,
                right = layout.legendRect.right,
                bottom = layout.legendRect.bottom,
                density = density,
                namePaint = legendNamePaint,
                durationPaint = legendDurationPaint,
                metrics = legendMetrics
            )
        }

        return bitmap
    }

    private fun resolveViewData(
        payload: WidgetDailyRuntimePayload?,
        viewMode: String
    ): WidgetDailyRuntimeViewData? {
        if (payload == null) {
            return null
        }
        return if (WidgetDailyRuntimeViewModes.normalize(viewMode) == WidgetDailyRuntimeViewModes.ACTIVITY) {
            payload.activityView
        } else {
            payload.categoryView
        }
    }

    private fun drawHeatmapGrid(
        canvas: Canvas,
        rect: RectF,
        viewData: WidgetDailyRuntimeViewData?,
        density: Float
    ) {
        val segments = normalizeSegments(viewData)
        val gap = 3.2f * density
        val cellSize = (rect.width() - gap * (GRID_COLUMNS - 1)) / GRID_COLUMNS
        val radius = cellSize * 0.16f
        val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.FILL
        }

        for (column in 0 until GRID_COLUMNS) {
            for (row in 0 until GRID_ROWS) {
                val segmentIndex = column * GRID_ROWS + row
                val segment = segments.getOrNull(segmentIndex)
                val left = rect.left + column * (cellSize + gap)
                val top = rect.top + row * (cellSize + gap)
                val cellRect = RectF(left, top, left + cellSize, top + cellSize)
                fillPaint.color = parseColor(segment?.color ?: EMPTY_CELL_COLOR)
                canvas.drawRoundRect(cellRect, radius, radius, fillPaint)
            }
        }
    }

    private fun drawTimeMarkers(
        canvas: Canvas,
        left: Float,
        right: Float,
        baselineY: Float,
        paint: Paint
    ) {
        canvas.drawText("00:00", left, baselineY, paint)

        val centerText = "12:00"
        val centerX = (left + right - paint.measureText(centerText)) / 2f
        canvas.drawText(centerText, centerX, baselineY, paint)

        val endText = "23:59"
        canvas.drawText(endText, right - paint.measureText(endText), baselineY, paint)
    }

    private fun drawLegend(
        canvas: Canvas,
        viewData: WidgetDailyRuntimeViewData?,
        left: Float,
        top: Float,
        right: Float,
        bottom: Float,
        density: Float,
        namePaint: Paint,
        durationPaint: Paint,
        metrics: LegendMetrics
    ) {
        val legend = viewData?.legend.orEmpty()
        if (legend.isEmpty()) {
            val emptyPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = parseColor("#CBD5E1")
                textSize = 11f * density
                typeface = Typeface.create("sans-serif", Typeface.NORMAL)
            }
            val centerY = min(bottom, top + metrics.rowHeight / 2f)
            canvas.drawText("No runtime yet", left, centeredBaseline(centerY, emptyPaint), emptyPaint)
            return
        }

        val dotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.FILL
        }
        val itemGap = 10f * density
        val rowGap = 5f * density
        var cursorX = left
        var rowTop = top
        val maxBottom = bottom - metrics.rowHeight

        legend.forEach { item ->
            val durationText = formatLegendDuration(item.totalMinutes)
            val labelMaxWidth = (right - left) * 0.26f
            val labelText = ellipsizeText(item.itemName, namePaint, labelMaxWidth)
            val itemWidth =
                metrics.dotRadius * 2 +
                    5f * density +
                    namePaint.measureText(labelText) +
                    6f * density +
                    durationPaint.measureText(durationText)

            if (cursorX + itemWidth > right && cursorX > left) {
                cursorX = left
                rowTop += metrics.rowHeight + rowGap
            }

            if (rowTop > maxBottom) {
                return@forEach
            }

            val centerY = rowTop + metrics.rowHeight / 2f
            dotPaint.color = parseColor(item.color)
            canvas.drawCircle(cursorX + metrics.dotRadius, centerY, metrics.dotRadius, dotPaint)
            var textX = cursorX + metrics.dotRadius * 2 + 6f * density
            canvas.drawText(labelText, textX, centeredBaseline(centerY, namePaint), namePaint)
            textX += namePaint.measureText(labelText) + 8f * density
            canvas.drawText(durationText, textX, centeredBaseline(centerY, durationPaint), durationPaint)
            cursorX += itemWidth + itemGap
        }
    }

    private fun normalizeSegments(viewData: WidgetDailyRuntimeViewData?): List<WidgetDailyRuntimeSegment> {
        val segments = viewData?.segments.orEmpty()
            .filter { it.index in 0 until GRID_COLUMNS * GRID_ROWS }
            .sortedBy { it.index }
        if (segments.size == GRID_COLUMNS * GRID_ROWS) {
            return segments
        }

        val segmentMap = segments.associateBy { it.index }
        return List(GRID_COLUMNS * GRID_ROWS) { index ->
            segmentMap[index] ?: WidgetDailyRuntimeSegment(index = index)
        }
    }

    private fun buildGridRect(
        left: Float,
        top: Float,
        right: Float,
        maxBottom: Float,
        density: Float
    ): RectF {
        val gap = 3.2f * density
        val maxGridWidth = (right - left - 8f * density).coerceAtLeast(120f * density)
        val maxGridHeight = (maxBottom - top).coerceAtLeast(54f * density)
        val cellSize = min(
            (maxGridWidth - gap * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
            (maxGridHeight - gap * (GRID_ROWS - 1)) / GRID_ROWS
        )
        val gridHeight = cellSize * GRID_ROWS + gap * (GRID_ROWS - 1)
        val gridWidth = cellSize * GRID_COLUMNS + gap * (GRID_COLUMNS - 1)
        val gridLeft = left + (right - left - gridWidth) / 2f
        return RectF(gridLeft, top, gridLeft + gridWidth, top + gridHeight)
    }

    private fun buildLayout(
        left: Float,
        top: Float,
        right: Float,
        bottom: Float,
        density: Float,
        viewData: WidgetDailyRuntimeViewData?,
        legendMetrics: LegendMetrics,
        spec: DailyRuntimeRenderSpec
    ): DailyRuntimeLayout {
        val timeGap = 13f * density
        val timeHeight = 12f * density
        val legendGap = if (spec.showLegend) 16f * density else 0f
        val legendRows = if (!spec.showLegend) 0 else if (viewData?.legend.isNullOrEmpty()) 1 else 2
        val legendHeight =
            if (!spec.showLegend) 0f
            else legendMetrics.rowHeight * legendRows + if (legendRows > 1) 6f * density else 0f
        val maxGridBottom = bottom - timeHeight - legendGap - legendHeight - timeGap
        val gridRect = buildGridRect(left, top, right, maxGridBottom, density)
        val timeBaseline = gridRect.bottom + timeGap + timeHeight
        val legendTop = timeBaseline + legendGap
        return DailyRuntimeLayout(
            gridRect = gridRect,
            timeBaseline = timeBaseline,
            legendRect = RectF(left, legendTop, right, bottom)
        )
    }

    private fun createTimePaint(density: Float) = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = parseColor("#94A3B8")
        textSize = 10f * density
        typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
        letterSpacing = 0.08f
    }

    private fun createLegendNamePaint(density: Float) = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = parseColor("#334155")
        textSize = 10.2f * density
        typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
    }

    private fun createLegendDurationPaint(density: Float) = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = parseColor("#94A3B8")
        textSize = 8.8f * density
        typeface = Typeface.create(Typeface.MONOSPACE, Typeface.NORMAL)
    }

    private fun createLegendMetrics(
        density: Float,
        namePaint: Paint,
        durationPaint: Paint
    ): LegendMetrics {
        val rowHeight = maxOf(
            16f * density,
            namePaint.fontMetrics.run { descent - ascent },
            durationPaint.fontMetrics.run { descent - ascent }
        ) + 3f * density
        return LegendMetrics(
            dotRadius = 3.5f * density,
            rowHeight = rowHeight
        )
    }

    private fun centeredBaseline(centerY: Float, paint: Paint): Float {
        val metrics = paint.fontMetrics
        return centerY - (metrics.ascent + metrics.descent) / 2f
    }

    private fun ellipsizeText(text: String, paint: Paint, maxWidth: Float): String {
        if (paint.measureText(text) <= maxWidth) {
            return text
        }
        val ellipsis = "..."
        var end = text.length
        while (end > 1 && paint.measureText(text.substring(0, end) + ellipsis) > maxWidth) {
            end -= 1
        }
        return if (end <= 1) ellipsis else text.substring(0, end) + ellipsis
    }

    private fun formatLegendDuration(totalMinutes: Int): String {
        val safeMinutes = totalMinutes.coerceAtLeast(0)
        val hours = safeMinutes / 60
        val minutes = safeMinutes % 60
        return if (hours > 0) {
            if (minutes == 0) {
                String.format("%dH", hours)
            } else {
                String.format("%dH%02dM", hours, minutes)
            }
        } else {
            "${minutes}M"
        }
    }

    private fun parseColor(color: String): Int {
        return runCatching { Color.parseColor(color) }.getOrElse { Color.parseColor(EMPTY_CELL_COLOR) }
    }
}
