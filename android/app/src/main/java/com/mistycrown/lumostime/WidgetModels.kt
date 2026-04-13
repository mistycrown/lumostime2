package com.mistycrown.lumostime

/**
 * Lightweight native models used by the Android timer widget.
 * First version keeps a shared 4-slot config for all widget instances.
 */
data class WidgetTimerSlotConfig(
    val slotIndex: Int,
    val activityId: String? = null,
    val categoryId: String? = null,
    val icon: String? = null,
    val uiIconAssetPath: String? = null,
    val uiIconFallbackAssetPath: String? = null,
    val label: String? = null,
    val color: String? = null
) {
    fun isConfigured(): Boolean {
        return !activityId.isNullOrBlank() && !categoryId.isNullOrBlank()
    }
}

data class WidgetTimerRuntimeState(
    val id: String,
    val activityId: String,
    val categoryId: String,
    val icon: String,
    val label: String,
    val color: String,
    val startedAt: Long,
    val source: String,
    val slotIndex: Int? = null
)

data class WidgetPendingAction(
    val id: String,
    val activityId: String,
    val categoryId: String,
    val icon: String,
    val label: String,
    val color: String,
    val startedAt: Long,
    val endedAt: Long,
    val createdAt: Long
)

data class WidgetSnapshotSlot(
    val slotIndex: Int,
    val activityId: String?,
    val categoryId: String?,
    val icon: String,
    val uiIconAssetPath: String?,
    val uiIconFallbackAssetPath: String?,
    val label: String,
    val color: String,
    val isActive: Boolean
)

data class WidgetSnapshot(
    val slots: List<WidgetSnapshotSlot>
)
