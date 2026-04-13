package com.mistycrown.lumostime

import android.content.Context
import java.util.UUID

/**
 * Native start/stop/switch controller for the Android timer widget.
 */
object WidgetTimerController {
    fun handleSlotTap(context: Context, appWidgetId: Int, widgetSize: String, slotIndex: Int) {
        val normalizedSize = WidgetSizes.normalize(widgetSize)
        val binding = WidgetStores.ensureBinding(context, appWidgetId, normalizedSize) ?: return
        val template = WidgetStores.loadTemplateForSize(context, binding.templateId, normalizedSize) ?: return
        val slot = template.slots.firstOrNull { it.slotIndex == slotIndex } ?: return

        if (!slot.isConfigured()) {
            return
        }

        val now = System.currentTimeMillis()
        val currentRuntime = WidgetStores.loadRuntimeState(context)
        val isSameSlotActive = currentRuntime?.activityId == slot.activityId &&
            currentRuntime?.categoryId == slot.categoryId

        if (isSameSlotActive && currentRuntime != null) {
            finishRuntime(context, currentRuntime, now)
            WidgetStores.saveRuntimeState(context, null)
            WidgetStores.saveLastWidgetStopAt(context, now)
            return
        }

        if (currentRuntime != null) {
            finishRuntime(context, currentRuntime, now)
        }

        WidgetStores.saveRuntimeState(
            context,
            WidgetTimerRuntimeState(
                id = UUID.randomUUID().toString(),
                activityId = slot.activityId.orEmpty(),
                categoryId = slot.categoryId.orEmpty(),
                icon = slot.icon?.ifBlank { null } ?: "\u2022",
                label = slot.label?.ifBlank { null } ?: "",
                color = slot.color?.ifBlank { null } ?: "#E7E5E4",
                startedAt = now,
                source = "widget",
                slotIndex = slotIndex,
                templateId = template.id,
                appWidgetId = appWidgetId
            )
        )
        WidgetStores.saveLastWidgetStopAt(context, null)
    }

    private fun finishRuntime(context: Context, runtimeState: WidgetTimerRuntimeState, endedAt: Long) {
        if (endedAt - runtimeState.startedAt < 1000L) {
            return
        }

        WidgetStores.appendPendingAction(
            context,
            WidgetPendingAction(
                id = runtimeState.id,
                activityId = runtimeState.activityId,
                categoryId = runtimeState.categoryId,
                icon = runtimeState.icon,
                label = runtimeState.label,
                color = runtimeState.color,
                startedAt = runtimeState.startedAt,
                endedAt = endedAt,
                createdAt = endedAt
            )
        )
    }
}
