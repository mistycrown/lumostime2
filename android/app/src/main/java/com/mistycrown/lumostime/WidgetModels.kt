package com.mistycrown.lumostime

/**
 * Lightweight native models used by the Android timer widget.
 * Templates are edited in-app; desktop widget instances only bind to templates.
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

data class WidgetTemplate(
    val id: String,
    val name: String,
    val slots: List<WidgetTimerSlotConfig>,
    val createdAt: Long,
    val updatedAt: Long
)

data class WidgetInstanceBinding(
    val appWidgetId: Int,
    val templateId: String? = null,
    val createdAt: Long,
    val updatedAt: Long
)

data class WidgetTimerRuntimeState(
    val id: String,
    val activityId: String,
    val categoryId: String,
    val icon: String,
    val label: String,
    val color: String,
    val startedAt: Long,
    val source: String,
    val slotIndex: Int? = null,
    val templateId: String? = null,
    val appWidgetId: Int? = null
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
    val appWidgetId: Int,
    val templateId: String?,
    val templateName: String,
    val slots: List<WidgetSnapshotSlot>
)
