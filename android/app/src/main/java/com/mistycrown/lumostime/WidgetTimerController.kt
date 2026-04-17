package com.mistycrown.lumostime

import android.content.Context
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

/**
 * Native widget action controller for timer and daily widgets.
 */
object WidgetTimerController {
    private const val TAP_FEEDBACK_DURATION_MS = 260L

    fun handleSlotTap(
        context: Context,
        appWidgetId: Int,
        widgetType: String,
        widgetSize: String,
        slotIndex: Int
    ): Boolean {
        return when (WidgetTypes.normalize(widgetType)) {
            WidgetTypes.DAILY -> handleDailySlotTap(context, appWidgetId, widgetType, widgetSize, slotIndex)
            else -> handleTimerSlotTap(context, appWidgetId, widgetType, widgetSize, slotIndex)
        }
    }

    private fun handleTimerSlotTap(
        context: Context,
        appWidgetId: Int,
        widgetType: String,
        widgetSize: String,
        slotIndex: Int
    ): Boolean {
        val normalizedWidgetType = WidgetTypes.normalize(widgetType)
        val normalizedSize = WidgetSizes.normalize(widgetSize)
        val binding = WidgetStores.ensureBinding(context, appWidgetId, normalizedWidgetType, normalizedSize) ?: return false
        val template = WidgetStores.loadTemplateForTypeAndSize(
            context,
            binding.templateId,
            normalizedWidgetType,
            normalizedSize
        ) ?: return false
        val slot = template.slots.firstOrNull { it.slotIndex == slotIndex } ?: return false

        if (!slot.isConfigured()) {
            return false
        }

        val now = System.currentTimeMillis()
        val currentRuntime = WidgetStores.loadRuntimeState(context)
        val isSameSlotActive = currentRuntime?.let { runtime ->
            if (runtime.source == "widget" && runtime.templateId == template.id) {
                runtime.slotIndex == slotIndex
            } else {
                runtime.activityId == slot.activityId &&
                    runtime.categoryId == slot.categoryId &&
                    runtime.linkedTodoId == slot.linkedTodoId &&
                    runtime.scopeIds.toSet() == slot.scopeIds.toSet()
            }
        } ?: false

        if (isSameSlotActive && currentRuntime != null) {
            finishRuntime(context, currentRuntime, now)
            WidgetStores.saveRuntimeState(context, null)
            WidgetStores.saveLastWidgetStopAt(context, now)
            saveTapAnimation(
                context,
                appWidgetId = appWidgetId,
                widgetType = normalizedWidgetType,
                slotIndex = slotIndex,
                animationMode = WidgetTapAnimationModes.TIMER_STOP,
                startedAt = now
            )
            FloatingWindowService.syncFocusStateIfRunning(currentRuntime.icon, false, 0L)
            return true
        }

        if (currentRuntime != null) {
            finishRuntime(context, currentRuntime, now)
        }

        val nextRuntime = WidgetRuntimeState(
            id = UUID.randomUUID().toString(),
            widgetType = normalizedWidgetType,
            activityId = slot.activityId.orEmpty(),
            categoryId = slot.categoryId.orEmpty(),
            icon = slot.icon?.ifBlank { null } ?: "\u2022",
            label = slot.label?.ifBlank { null } ?: "",
            color = slot.color?.ifBlank { null } ?: "#E7E5E4",
            startedAt = now,
            source = "widget",
            linkedTodoId = slot.linkedTodoId,
            scopeIds = slot.scopeIds,
            slotIndex = slotIndex,
            templateId = template.id,
            appWidgetId = appWidgetId
        )

        WidgetStores.saveRuntimeState(context, nextRuntime)
        WidgetStores.saveLastWidgetStopAt(context, null)
        saveTapAnimation(
            context,
            appWidgetId = appWidgetId,
            widgetType = normalizedWidgetType,
            slotIndex = slotIndex,
            animationMode = WidgetTapAnimationModes.TIMER_START,
            startedAt = now
        )
        FloatingWindowService.syncFocusStateIfRunning(nextRuntime.icon, true, nextRuntime.startedAt)
        return true
    }

    private fun handleDailySlotTap(
        context: Context,
        appWidgetId: Int,
        widgetType: String,
        widgetSize: String,
        slotIndex: Int
    ): Boolean {
        val normalizedWidgetType = WidgetTypes.normalize(widgetType)
        val normalizedSize = WidgetSizes.normalize(widgetSize)
        val binding = WidgetStores.ensureBinding(context, appWidgetId, normalizedWidgetType, normalizedSize) ?: return false
        val template = WidgetStores.loadTemplateForTypeAndSize(
            context,
            binding.templateId,
            normalizedWidgetType,
            normalizedSize
        ) ?: return false
        val slot = template.slots.firstOrNull { it.slotIndex == slotIndex } ?: return false
        val checkItemId = slot.checkItemId ?: return false

        val payload = WidgetStores.loadDailySyncPayload(context)
        val todayDate = getCurrentDateString()
        val meta = payload?.items?.firstOrNull { it.checkItemId == checkItemId }
        val currentProgress =
            if (payload?.date == todayDate) payload.progress.firstOrNull { it.checkItemId == checkItemId } else null

        val manualMode = WidgetDailyModes.normalize(meta?.manualMode ?: slot.checkManualMode)
        val targetCount = (meta?.targetCount ?: slot.checkTargetCount ?: 1).coerceAtLeast(1)
        val currentCount = (currentProgress?.currentCount ?: 0).coerceAtLeast(0).coerceAtMost(targetCount)
        val isCompleted = currentProgress?.isCompleted ?: false

        if (manualMode == WidgetDailyModes.BINARY) {
            if (isCompleted) {
                return false
            }

            WidgetStores.upsertDailyProgress(
                context,
                WidgetDailyProgress(
                    checkItemId = checkItemId,
                    date = todayDate,
                    manualMode = WidgetDailyModes.BINARY,
                    currentCount = 1,
                    targetCount = 1,
                    isCompleted = true,
                    updatedAt = System.currentTimeMillis()
                )
            )
        } else {
            if (currentCount >= targetCount) {
                return false
            }

            val nextCount = (currentCount + 1).coerceAtMost(targetCount)
            WidgetStores.upsertDailyProgress(
                context,
                WidgetDailyProgress(
                    checkItemId = checkItemId,
                    date = todayDate,
                    manualMode = WidgetDailyModes.COUNT,
                    currentCount = nextCount,
                    targetCount = targetCount,
                    isCompleted = nextCount >= targetCount,
                    updatedAt = System.currentTimeMillis()
                )
            )
        }

        WidgetStores.appendPendingDailyAction(
            context,
            WidgetPendingDailyAction(
                id = UUID.randomUUID().toString(),
                widgetType = WidgetTypes.DAILY,
                date = todayDate,
                checkTemplateId = slot.checkTemplateId,
                checkItemId = checkItemId,
                actionMode = "complete_once",
                createdAt = System.currentTimeMillis(),
                appWidgetId = appWidgetId,
                slotIndex = slotIndex
            )
        )

        saveTapAnimation(
            context,
            appWidgetId = appWidgetId,
            widgetType = normalizedWidgetType,
            slotIndex = slotIndex,
            animationMode = if (manualMode == WidgetDailyModes.COUNT && currentCount + 1 < targetCount) {
                WidgetTapAnimationModes.DAILY_COUNT
            } else {
                WidgetTapAnimationModes.DAILY_COMPLETE
            },
            startedAt = System.currentTimeMillis()
        )
        return true
    }

    private fun saveTapAnimation(
        context: Context,
        appWidgetId: Int,
        widgetType: String,
        slotIndex: Int,
        animationMode: String,
        startedAt: Long
    ) {
        WidgetStores.saveTapAnimationState(
            context,
            WidgetTapAnimationState(
                appWidgetId = appWidgetId,
                widgetType = widgetType,
                slotIndex = slotIndex,
                animationMode = animationMode,
                startedAt = startedAt,
                expiresAt = startedAt + TAP_FEEDBACK_DURATION_MS
            )
        )
    }

    private fun finishRuntime(context: Context, runtimeState: WidgetRuntimeState, endedAt: Long) {
        if (endedAt - runtimeState.startedAt < 1000L) {
            return
        }

        WidgetStores.appendPendingAction(
            context,
            WidgetPendingAction(
                id = runtimeState.id,
                widgetType = runtimeState.widgetType,
                activityId = runtimeState.activityId,
                categoryId = runtimeState.categoryId,
                icon = runtimeState.icon,
                label = runtimeState.label,
                color = runtimeState.color,
                startedAt = runtimeState.startedAt,
                endedAt = endedAt,
                createdAt = endedAt,
                linkedTodoId = runtimeState.linkedTodoId,
                scopeIds = runtimeState.scopeIds
            )
        )
    }

    private fun getCurrentDateString(): String {
        return SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
    }
}
