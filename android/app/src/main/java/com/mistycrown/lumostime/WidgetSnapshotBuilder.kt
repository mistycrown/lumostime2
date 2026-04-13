package com.mistycrown.lumostime

/**
 * Builds the lightweight widget UI snapshot from config and native runtime state.
 */
object WidgetSnapshotBuilder {
    fun build(context: android.content.Context): WidgetSnapshot {
        val runtimeState = WidgetStores.loadRuntimeState(context)
        val slots = WidgetStores.loadConfig(context).map { slot ->
            val matchesRuntime = runtimeState?.let { runtime ->
                if (runtime.slotIndex != null) {
                    runtime.slotIndex == slot.slotIndex
                } else {
                    runtime.activityId == slot.activityId &&
                        runtime.categoryId == slot.categoryId
                }
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

        return WidgetSnapshot(slots = slots)
    }
}
