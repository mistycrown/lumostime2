package com.mistycrown.lumostime

/**
 * Builds the lightweight widget UI snapshot from config and native runtime state.
 */
object WidgetSnapshotBuilder {
    fun build(context: android.content.Context): WidgetSnapshot {
        val runtimeState = WidgetStores.loadRuntimeState(context)
        val slots = WidgetStores.loadConfig(context).map { slot ->
            val isActive = runtimeState?.activityId == slot.activityId &&
                runtimeState?.categoryId == slot.categoryId

            WidgetSnapshotSlot(
                slotIndex = slot.slotIndex,
                activityId = slot.activityId,
                categoryId = slot.categoryId,
                icon = slot.icon?.ifBlank { null } ?: "\u2022",
                label = slot.label?.ifBlank { null } ?: "Slot ${slot.slotIndex + 1}",
                color = slot.color?.ifBlank { null } ?: "#E7E5E4",
                isConfigured = slot.isConfigured(),
                isActive = isActive
            )
        }

        return WidgetSnapshot(
            slots = slots,
            runtimeState = runtimeState
        )
    }
}
