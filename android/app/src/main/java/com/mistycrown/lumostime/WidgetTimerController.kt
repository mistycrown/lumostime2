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
            FloatingWindowService.syncFocusStateIfRunning(currentRuntime.icon, false, 0L)
            return
        }

        if (currentRuntime != null) {
            finishRuntime(context, currentRuntime, now)
        }

        val nextRuntime = WidgetTimerRuntimeState(
            id = UUID.randomUUID().toString(),
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

        WidgetStores.saveRuntimeState(
            context,
            nextRuntime
        )
        WidgetStores.saveLastWidgetStopAt(context, null)
        FloatingWindowService.syncFocusStateIfRunning(nextRuntime.icon, true, nextRuntime.startedAt)
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
                createdAt = endedAt,
                linkedTodoId = runtimeState.linkedTodoId,
                scopeIds = runtimeState.scopeIds
            )
        )
    }
}
