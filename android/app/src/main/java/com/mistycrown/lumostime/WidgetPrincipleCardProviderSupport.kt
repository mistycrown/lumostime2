package com.mistycrown.lumostime

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.os.Build
import android.widget.RemoteViews

/**
 * Shared rendering and tap handling for the dedicated 4x2 principle-card widget.
 * @updated 2026-08-09: Keeps one shuffle-bag per widget instance so face flips stay local while refresh advances both the card and background.
 */
object WidgetPrincipleCardProviderSupport {
    const val ACTION_TOGGLE_PRINCIPLE_CARD_FACE =
        "com.mistycrown.lumostime.action.TOGGLE_PRINCIPLE_CARD_FACE"
    const val ACTION_REFRESH_PRINCIPLE_CARD =
        "com.mistycrown.lumostime.action.REFRESH_PRINCIPLE_CARD"

    private data class ResolvedPrincipleCardWidgetState(
        val state: WidgetPrincipleCardState,
        val principle: WidgetPrincipleCard?,
        val backgroundAssetPath: String?
    )

    @JvmStatic
    fun handleCommonReceive(
        context: Context,
        intent: Intent?,
        providerClass: Class<out AppWidgetProvider>
    ): Boolean {
        if (intent == null) {
            return false
        }

        when (intent.action) {
            ACTION_TOGGLE_PRINCIPLE_CARD_FACE -> {
                val appWidgetId = intent.getIntExtra(
                    AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID
                )
                if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                    val resolved = resolveState(context, appWidgetId)
                    WidgetStores.savePrincipleCardState(
                        context,
                        resolved.state.copy(
                            isBackSideVisible = !resolved.state.isBackSideVisible,
                            updatedAt = System.currentTimeMillis()
                        )
                    )
                    refreshSingleWidget(context, appWidgetId, providerClass)
                }
                return true
            }

            ACTION_REFRESH_PRINCIPLE_CARD -> {
                val appWidgetId = intent.getIntExtra(
                    AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID
                )
                if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                    val resolved = resolveState(
                        context = context,
                        appWidgetId = appWidgetId,
                        advanceSelection = true,
                        forceFrontFace = true
                    )
                    WidgetStores.savePrincipleCardState(context, resolved.state)
                    refreshSingleWidget(context, appWidgetId, providerClass)
                } else {
                    refreshAllWidgets(context, providerClass)
                }
                return true
            }
        }

        return Intent.ACTION_DATE_CHANGED.equals(intent.action)
            || Intent.ACTION_TIME_CHANGED.equals(intent.action)
            || Intent.ACTION_TIMEZONE_CHANGED.equals(intent.action)
    }

    @JvmStatic
    fun onDeleted(context: Context, appWidgetIds: IntArray) {
        WidgetStores.removePrincipleCardStates(context, appWidgetIds)
    }

    @JvmStatic
    fun updateWidgets(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
        providerClass: Class<out AppWidgetProvider>
    ) {
        if (appWidgetIds.isEmpty()) {
            return
        }

        appWidgetIds.forEach { appWidgetId ->
            val resolved = resolveState(context, appWidgetId)
            WidgetStores.savePrincipleCardState(context, resolved.state)
            val views = RemoteViews(context.packageName, R.layout.widget_layout_principle_card_4x2)
            views.setImageViewBitmap(
                R.id.widget_principle_card_bitmap,
                WidgetPrincipleCardBitmapRenderer.render(
                    context = context,
                    appWidgetId = appWidgetId,
                    principle = resolved.principle,
                    backgroundAssetPath = resolved.backgroundAssetPath,
                    isBackSideVisible = resolved.state.isBackSideVisible
                )
            )
            views.setImageViewResource(
                R.id.widget_principle_card_refresh_icon,
                R.drawable.widget_todo_pin_refresh_icon
            )

            val toggleIntent = buildTogglePendingIntent(context, appWidgetId, providerClass)
            val refreshIntent = buildRefreshPendingIntent(context, appWidgetId, providerClass)
            views.setOnClickPendingIntent(R.id.widget_principle_card_root, toggleIntent)
            views.setOnClickPendingIntent(R.id.widget_principle_card_bitmap, toggleIntent)
            views.setOnClickPendingIntent(R.id.widget_principle_card_refresh_root, refreshIntent)
            views.setOnClickPendingIntent(R.id.widget_principle_card_refresh_icon, refreshIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }

    private fun resolveState(
        context: Context,
        appWidgetId: Int,
        advanceSelection: Boolean = false,
        forceFrontFace: Boolean? = null
    ): ResolvedPrincipleCardWidgetState {
        val payload = WidgetStores.loadPrincipleCardPayload(context)
        val principles = payload?.principles
            .orEmpty()
            .filter { it.id.isNotBlank() }
            .distinctBy { it.id }
        val backgroundAssetPaths = WidgetPrincipleCardBitmapRenderer.listBackgroundAssetPaths(context)
        val savedState = WidgetStores.loadPrincipleCardState(context, appWidgetId)

        val (principleOrder, principleCursor) = resolveSelectionOrder(
            savedOrder = savedState?.principleOrder.orEmpty(),
            validIds = principles.map { it.id },
            savedCursor = savedState?.principleCursor ?: 0,
            savedSelectionId = savedState?.currentPrincipleId,
            advanceSelection = advanceSelection
        )
        val (backgroundOrder, backgroundCursor) = resolveSelectionOrder(
            savedOrder = savedState?.backgroundOrder.orEmpty(),
            validIds = backgroundAssetPaths,
            savedCursor = savedState?.backgroundCursor ?: 0,
            savedSelectionId = savedState?.currentBackgroundKey,
            advanceSelection = advanceSelection
        )

        val selectedPrinciple = principleOrder.getOrNull(principleCursor)?.let { principleId ->
            principles.firstOrNull { it.id == principleId }
        }
        val selectedBackground = backgroundOrder.getOrNull(backgroundCursor)
        val nextState = WidgetPrincipleCardState(
            appWidgetId = appWidgetId,
            currentPrincipleId = selectedPrinciple?.id,
            currentBackgroundKey = selectedBackground,
            principleOrder = principleOrder,
            backgroundOrder = backgroundOrder,
            principleCursor = principleCursor,
            backgroundCursor = backgroundCursor,
            isBackSideVisible = forceFrontFace?.let { !it } ?: (savedState?.isBackSideVisible ?: false),
            updatedAt = System.currentTimeMillis()
        )

        return ResolvedPrincipleCardWidgetState(
            state = nextState,
            principle = selectedPrinciple,
            backgroundAssetPath = selectedBackground
        )
    }

    private fun resolveSelectionOrder(
        savedOrder: List<String>,
        validIds: List<String>,
        savedCursor: Int,
        savedSelectionId: String?,
        advanceSelection: Boolean
    ): Pair<List<String>, Int> {
        if (validIds.isEmpty()) {
            return emptyList<String>() to 0
        }

        val validDistinct = validIds.distinct()
        var order = savedOrder.filter { validDistinct.contains(it) }.distinct()
        if (order.isEmpty()) {
            order = validDistinct.shuffled()
        } else {
            val missing = validDistinct.filterNot { order.contains(it) }.shuffled()
            order = (order + missing).ifEmpty { validDistinct.shuffled() }
        }

        var cursor = savedCursor.coerceIn(0, order.lastIndex)
        val savedIndex = savedSelectionId?.let(order::indexOf) ?: -1
        if (savedIndex >= 0) {
            cursor = savedIndex
        }

        if (advanceSelection) {
            cursor += 1
            if (cursor >= order.size) {
                order = validDistinct.shuffled()
                cursor = 0
            }
        }

        return order to cursor
    }

    private fun refreshSingleWidget(
        context: Context,
        appWidgetId: Int,
        providerClass: Class<out AppWidgetProvider>
    ) {
        if (appWidgetId <= 0) {
            return
        }

        val appWidgetManager = AppWidgetManager.getInstance(context)
        updateWidgets(context, appWidgetManager, intArrayOf(appWidgetId), providerClass)
    }

    private fun refreshAllWidgets(
        context: Context,
        providerClass: Class<out AppWidgetProvider>
    ) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(android.content.ComponentName(context, providerClass))
        updateWidgets(context, appWidgetManager, appWidgetIds, providerClass)
    }

    private fun buildTogglePendingIntent(
        context: Context,
        appWidgetId: Int,
        providerClass: Class<out AppWidgetProvider>
    ): PendingIntent {
        val intent = Intent(context, providerClass).apply {
            action = ACTION_TOGGLE_PRINCIPLE_CARD_FACE
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        }
        return PendingIntent.getBroadcast(
            context,
            appWidgetId + 9100,
            intent,
            pendingIntentFlags()
        )
    }

    private fun buildRefreshPendingIntent(
        context: Context,
        appWidgetId: Int,
        providerClass: Class<out AppWidgetProvider>
    ): PendingIntent {
        val intent = Intent(context, providerClass).apply {
            action = ACTION_REFRESH_PRINCIPLE_CARD
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        }
        return PendingIntent.getBroadcast(
            context,
            appWidgetId + 9200,
            intent,
            pendingIntentFlags()
        )
    }

    private fun pendingIntentFlags(): Int {
        var flags = PendingIntent.FLAG_UPDATE_CURRENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags = flags or PendingIntent.FLAG_IMMUTABLE
        }
        return flags
    }
}
