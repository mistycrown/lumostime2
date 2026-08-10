package com.mistycrown.lumostime

import android.appwidget.AppWidgetManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.os.Build
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.text.TextUtils
import androidx.collection.LruCache
import java.util.Locale
import kotlin.math.max

/**
 * Renders the dedicated 4x2 principle-card widget as a single bitmap.
 * @updated 2026-08-09: Supports packaged PNG/WebP card backgrounds with a left-anchored principle text block and face-aware content.
 * @updated 2026-08-09: Clips the rendered bitmap to larger rounded corners, removes the left mask, and keeps the body text serif, justified, and smaller.
 * @updated 2026-08-09: Slightly overscans card backgrounds after cover-scaling so source-image rounded corners cannot expose white edges.
 * @updated 2026-08-09: Uses a shared dark-gray text color instead of pure black for a softer card treatment.
 */
object WidgetPrincipleCardBitmapRenderer {
    private const val BACKGROUND_ASSET_DIR = "public/card"
    private const val FALLBACK_WIDGET_WIDTH_DP = 360f
    private const val FALLBACK_WIDGET_HEIGHT_DP = 180f
    private const val CARD_CORNER_RADIUS_DP = 24f
    private const val MIN_BODY_TEXT_SP = 10f
    private const val MAX_BODY_TEXT_SP = 16f
    private const val TITLE_TEXT_SP = 9.5f
    private const val BODY_LINE_SPACING_MULTIPLIER = 1.18f
    private const val BODY_LINE_SPACING_EXTRA_DP = 2.2f
    private const val BACKGROUND_OVERSCAN_SCALE = 1.03f
    private const val PRINCIPLE_TEXT_COLOR = "#2F2F2F"
    private val SUPPORTED_EXTENSIONS = setOf("png", "webp")
    private val backgroundBitmapCache = object : LruCache<String, Bitmap>(12) {}

    @JvmStatic
    fun listBackgroundAssetPaths(context: Context): List<String> {
        return runCatching {
            val assetNames = context.assets.list(BACKGROUND_ASSET_DIR)?.toList().orEmpty()
            val groupedByStem = assetNames
                .mapNotNull { assetName ->
                    val trimmed = assetName.trim()
                    if (trimmed.isEmpty() || '.' !in trimmed) {
                        return@mapNotNull null
                    }

                    val extension = trimmed.substringAfterLast('.', "").lowercase(Locale.ROOT)
                    if (!SUPPORTED_EXTENSIONS.contains(extension)) {
                        return@mapNotNull null
                    }

                    val stem = trimmed.substringBeforeLast('.')
                    stem to trimmed
                }
                .groupBy({ it.first }, { it.second })

            groupedByStem.keys.sorted().mapNotNull { stem ->
                val candidates = groupedByStem[stem].orEmpty()
                val selected = candidates.firstOrNull { it.endsWith(".webp", ignoreCase = true) }
                    ?: candidates.firstOrNull { it.endsWith(".png", ignoreCase = true) }
                selected?.let { "$BACKGROUND_ASSET_DIR/$it" }
            }
        }.getOrElse {
            emptyList()
        }
    }

    @JvmStatic
    fun render(
        context: Context,
        appWidgetId: Int,
        principle: WidgetPrincipleCard?,
        backgroundAssetPath: String?,
        isBackSideVisible: Boolean
    ): Bitmap {
        val density = context.resources.displayMetrics.density
        val scaledDensity = context.resources.displayMetrics.scaledDensity
        val widgetWidthPx = resolveWidgetDimensionPx(
            context,
            appWidgetId,
            AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH,
            AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,
            density,
            FALLBACK_WIDGET_WIDTH_DP
        )
        val widgetHeightPx = resolveWidgetDimensionPx(
            context,
            appWidgetId,
            AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT,
            AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,
            density,
            FALLBACK_WIDGET_HEIGHT_DP
        )
        val bitmap = Bitmap.createBitmap(widgetWidthPx, widgetHeightPx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val clipPath = Path().apply {
            addRoundRect(
                RectF(0f, 0f, widgetWidthPx.toFloat(), widgetHeightPx.toFloat()),
                CARD_CORNER_RADIUS_DP * density,
                CARD_CORNER_RADIUS_DP * density,
                Path.Direction.CW
            )
        }

        canvas.save()
        canvas.clipPath(clipPath)
        drawBackground(canvas, context, widgetWidthPx, widgetHeightPx, backgroundAssetPath)
        drawPrincipleText(
            canvas = canvas,
            principle = principle,
            isBackSideVisible = isBackSideVisible,
            widthPx = widgetWidthPx,
            heightPx = widgetHeightPx,
            density = density,
            scaledDensity = scaledDensity
        )
        canvas.restore()

        return bitmap
    }

    private fun drawBackground(
        canvas: Canvas,
        context: Context,
        widgetWidthPx: Int,
        widgetHeightPx: Int,
        backgroundAssetPath: String?
    ) {
        val backgroundBitmap = backgroundAssetPath?.let { loadBackgroundBitmap(context, it) }
        if (backgroundBitmap != null) {
            val scale = max(
                widgetWidthPx.toFloat() / backgroundBitmap.width.toFloat(),
                widgetHeightPx.toFloat() / backgroundBitmap.height.toFloat()
            ) * BACKGROUND_OVERSCAN_SCALE
            val scaledWidth = backgroundBitmap.width * scale
            val scaledHeight = backgroundBitmap.height * scale
            val left = (widgetWidthPx - scaledWidth) / 2f
            val top = (widgetHeightPx - scaledHeight) / 2f
            canvas.drawBitmap(
                backgroundBitmap,
                null,
                RectF(left, top, left + scaledWidth, top + scaledHeight),
                null
            )
            return
        }

        canvas.drawColor(Color.parseColor("#F7F3EC"))
    }

    private fun drawPrincipleText(
        canvas: Canvas,
        principle: WidgetPrincipleCard?,
        isBackSideVisible: Boolean,
        widthPx: Int,
        heightPx: Int,
        density: Float,
        scaledDensity: Float
    ) {
        val leftPadding = 16f * density
        val topPadding = 14f * density
        val textRightBound = widthPx * 0.74f
        val textWidth = (textRightBound - leftPadding).toInt().coerceAtLeast((120f * density).toInt())
        val title = principle?.title.orEmpty()
        val titleText = when {
            title.isNotBlank() -> title
            principle != null -> "原则卡"
            else -> "原则卡"
        }
        val titlePaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor(PRINCIPLE_TEXT_COLOR)
            textSize = TITLE_TEXT_SP * scaledDensity
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
        }
        val bodyPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor(PRINCIPLE_TEXT_COLOR)
            textSize = resolveInitialBodyTextSizeSp(resolveBodyText(principle, isBackSideVisible)) * scaledDensity
            typeface = Typeface.create("serif", Typeface.NORMAL)
        }

        val titleLayout = buildTextLayout(
            text = titleText,
            paint = titlePaint,
            widthPx = textWidth,
            maxLines = 1
        )
        canvas.save()
        canvas.translate(leftPadding, topPadding)
        titleLayout.draw(canvas)
        canvas.restore()

        val bodyText = resolveBodyText(principle, isBackSideVisible)
        val bodyTop = topPadding + titleLayout.height + (10f * density)
        val maxBodyHeight = (heightPx - bodyTop - (16f * density)).toInt().coerceAtLeast((40f * density).toInt())
        val bodyLayout = buildBodyLayout(
            text = bodyText,
            paint = bodyPaint,
            widthPx = textWidth,
            maxHeightPx = maxBodyHeight,
            scaledDensity = scaledDensity
        )

        canvas.save()
        canvas.translate(leftPadding, bodyTop)
        bodyLayout.draw(canvas)
        canvas.restore()
    }

    private fun resolveBodyText(
        principle: WidgetPrincipleCard?,
        isBackSideVisible: Boolean
    ): String {
        if (principle == null) {
            return "打开应用同步原则库"
        }

        val preferredText = if (isBackSideVisible) principle.backText else principle.frontText
        val fallbackText = if (isBackSideVisible) principle.frontText else principle.backText
        return listOf(preferredText, fallbackText, principle.title)
            .firstOrNull { !it.isNullOrBlank() }
            ?.trim()
            .orEmpty()
    }

    private fun resolveInitialBodyTextSizeSp(text: String): Float {
        val normalizedLength = text.replace(Regex("\\s+"), "").length
        return when {
            normalizedLength <= 18 -> 16f
            normalizedLength <= 36 -> 15f
            normalizedLength <= 54 -> 14f
            normalizedLength <= 78 -> 13f
            normalizedLength <= 108 -> 12f
            normalizedLength <= 144 -> 11f
            else -> MIN_BODY_TEXT_SP
        }
    }

    private fun buildBodyLayout(
        text: String,
        paint: TextPaint,
        widthPx: Int,
        maxHeightPx: Int,
        scaledDensity: Float
    ): StaticLayout {
        val minTextSize = MIN_BODY_TEXT_SP * scaledDensity
        val maxTextSize = MAX_BODY_TEXT_SP * scaledDensity
        val lineSpacingExtraPx = BODY_LINE_SPACING_EXTRA_DP * scaledDensity
        paint.textSize = paint.textSize.coerceIn(minTextSize, maxTextSize)

        var layout = buildTextLayout(
            text = text,
            paint = paint,
            widthPx = widthPx,
            maxLines = null,
            lineSpacingExtraPx = lineSpacingExtraPx,
            justify = true
        )

        while (layout.height > maxHeightPx && paint.textSize > minTextSize) {
            paint.textSize = max(minTextSize, paint.textSize - (1.2f * scaledDensity))
            layout = buildTextLayout(
                text = text,
                paint = paint,
                widthPx = widthPx,
                maxLines = null,
                lineSpacingExtraPx = lineSpacingExtraPx,
                justify = true
            )
        }

        if (layout.height > maxHeightPx) {
            val estimatedLineHeight = max(1f, paint.textSize * BODY_LINE_SPACING_MULTIPLIER)
            val maxLines = max(1, (maxHeightPx / estimatedLineHeight).toInt())
            layout = buildTextLayout(
                text = text,
                paint = paint,
                widthPx = widthPx,
                maxLines = maxLines,
                lineSpacingExtraPx = lineSpacingExtraPx,
                justify = true
            )
        }

        return layout
    }

    private fun buildTextLayout(
        text: String,
        paint: TextPaint,
        widthPx: Int,
        maxLines: Int?,
        lineSpacingExtraPx: Float = 0f,
        justify: Boolean = false
    ): StaticLayout {
        val builder = StaticLayout.Builder
            .obtain(text, 0, text.length, paint, widthPx)
            .setAlignment(Layout.Alignment.ALIGN_NORMAL)
            .setIncludePad(false)
            .setLineSpacing(lineSpacingExtraPx, BODY_LINE_SPACING_MULTIPLIER)

        if (justify && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder.setJustificationMode(Layout.JUSTIFICATION_MODE_INTER_WORD)
        }

        if (maxLines != null) {
            builder
                .setMaxLines(maxLines)
                .setEllipsize(TextUtils.TruncateAt.END)
        }

        return builder.build()
    }

    private fun loadBackgroundBitmap(
        context: Context,
        assetPath: String
    ): Bitmap? {
        val normalizedAssetPath = assetPath.replace('\\', '/').trimStart('/')
        val cacheKey = normalizedAssetPath
        backgroundBitmapCache.get(cacheKey)?.let { cached ->
            if (!cached.isRecycled) {
                return cached
            }
            backgroundBitmapCache.remove(cacheKey)
        }

        return try {
            context.assets.open(normalizedAssetPath).use { inputStream ->
                val decoded = BitmapFactory.decodeStream(inputStream) ?: return null
                backgroundBitmapCache.put(cacheKey, decoded)
                decoded
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun resolveWidgetDimensionPx(
        context: Context,
        appWidgetId: Int,
        primaryKey: String,
        fallbackKey: String,
        density: Float,
        fallbackDp: Float
    ): Int {
        val fallbackPx = (fallbackDp * density).toInt().coerceAtLeast(1)
        if (appWidgetId <= 0) {
            return fallbackPx
        }

        return try {
            val options = AppWidgetManager.getInstance(context).getAppWidgetOptions(appWidgetId)
            val primaryDp = options.getInt(primaryKey, 0)
            val fallbackValueDp = options.getInt(fallbackKey, 0)
            val resolvedDp = maxOf(primaryDp, fallbackValueDp)
            if (resolvedDp > 0) {
                (resolvedDp * density).toInt().coerceAtLeast(1)
            } else {
                fallbackPx
            }
        } catch (_: Exception) {
            fallbackPx
        }
    }
}
