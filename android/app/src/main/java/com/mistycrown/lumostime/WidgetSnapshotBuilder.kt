package com.mistycrown.lumostime

/**
 * Builds the lightweight widget UI snapshot from template bindings and native runtime state.
 */
object WidgetSnapshotBuilder {
    fun build(context: android.content.Context, appWidgetId: Int): WidgetSnapshot {
        val runtimeState = WidgetStores.loadRuntimeState(context)
        val binding = WidgetStores.ensureBinding(context, appWidgetId)
        val template = WidgetStores.loadTemplate(context, binding?.templateId)

        val slots = (template?.slots ?: emptySlots()).map { slot ->
            val matchesRuntime = runtimeState?.let { runtime ->
                runtime.activityId == slot.activityId &&
                    runtime.categoryId == slot.categoryId &&
                    slot.isConfigured()
            } ?: false

            WidgetSnapshotSlot(
                slotIndex = slot.slotIndex,
                activityId = slot.activityId,
                categoryId = slot.categoryId,
                icon = slot.icon?.ifBlank { null } ?: "\u2022",
                uiIconAssetPath = slot.uiIconAssetPath,
                uiIconFallbackAssetPath = slot.uiIconFallbackAssetPath,
                label = slot.label?.ifBlank { null } ?: "Slot ${slot.slotIndex + 1}",
                color = slot.color?.ifBlank { null } ?: "#E7E5E4",
                isActive = matchesRuntime
            )
        }

        return WidgetSnapshot(
            appWidgetId = appWidgetId,
            templateId = template?.id,
            templateName = template?.name ?: "暂无模板",
            slots = slots
        )
    }

    private fun emptySlots(): List<WidgetTimerSlotConfig> {
        return (0 until WidgetStores.SLOT_COUNT).map { WidgetTimerSlotConfig(slotIndex = it) }
    }
}
