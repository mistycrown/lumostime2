package com.mistycrown.lumostime

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.text.TextPaint

/**
 * Renders the compact icon-only scene tabs used by the dedicated 4x3 scene widget.
 * Updated 2026-08-10: Increased the scrollable tab hit target and icon canvas size.
 */
object WidgetSceneTabBitmapRenderer {
    private const val TAB_SIZE_DP = 44f
    private const val TAB_RADIUS_DP = 12f
    private const val TAB_TEXT_SIZE_DP = 22f
    private const val TAB_UI_ICON_SIZE_DP = 26f

    fun render(
        context: Context,
        icon: String,
        uiIconAssetPath: String?,
        uiIconFallbackAssetPath: String?,
        isSelected: Boolean
    ): Bitmap {
        val sizePx = dpToPx(context, TAB_SIZE_DP)
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        if (isSelected) {
            val backgroundPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#E7E5E4")
                style = Paint.Style.FILL
            }
            val radiusPx = dpToPx(context, TAB_RADIUS_DP).toFloat()
            canvas.drawRoundRect(
                0f,
                0f,
                sizePx.toFloat(),
                sizePx.toFloat(),
                radiusPx,
                radiusPx,
                backgroundPaint
            )
        }

        val uiIcon = WidgetSlotBitmapRenderer.loadUiIconBitmap(
            context,
            uiIconAssetPath,
            uiIconFallbackAssetPath,
            dpToPx(context, TAB_UI_ICON_SIZE_DP)
        )
        if (uiIcon != null) {
            canvas.drawBitmap(
                uiIcon,
                (sizePx - uiIcon.width) / 2f,
                (sizePx - uiIcon.height) / 2f,
                null
            )
            return bitmap
        }

        val textPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor(if (isSelected) "#1F1B16" else "#6C6359")
            textAlign = Paint.Align.CENTER
            textSize = dpToPx(context, TAB_TEXT_SIZE_DP).toFloat()
        }
        val baseline = (sizePx / 2f) - ((textPaint.descent() + textPaint.ascent()) / 2f)
        canvas.drawText(icon.ifBlank { "\u2022" }, sizePx / 2f, baseline, textPaint)
        return bitmap
    }

    private fun dpToPx(context: Context, dp: Float): Int {
        return (dp * context.resources.displayMetrics.density).toInt().coerceAtLeast(1)
    }
}
