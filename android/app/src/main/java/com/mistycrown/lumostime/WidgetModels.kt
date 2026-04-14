package com.mistycrown.lumostime

/**
 * Lightweight native models used by the Android timer widget.
 * Templates are edited in-app; desktop widget instances only bind to templates.
 */
object WidgetSizes {
    const val SIZE_2X1 = "2x1"
    const val SIZE_2X2 = "2x2"
    const val SIZE_3X2 = "3x2"
    const val SIZE_4X1 = "4x1"
    const val SIZE_4X2 = "4x2"
    const val DEFAULT = SIZE_2X2

    @JvmStatic
    fun normalize(size: String?): String {
        return when (size) {
            SIZE_2X1,
            SIZE_2X2,
            SIZE_3X2,
            SIZE_4X1,
            SIZE_4X2 -> size
            else -> DEFAULT
        }
    }

    @JvmStatic
    fun slotCount(size: String?): Int {
        return when (normalize(size)) {
            SIZE_2X1 -> 2
            SIZE_2X2,
            SIZE_3X2 -> 6
            SIZE_4X1 -> 4
            SIZE_4X2 -> 8
            else -> 4
        }
    }
}

data class WidgetTimerSlotConfig(
    val slotIndex: Int,
    val activityId: String? = null,
    val categoryId: String? = null,
    val icon: String? = null,
    val customIcon: String? = null,
    val uiIconAssetPath: String? = null,
    val uiIconFallbackAssetPath: String? = null,
    val label: String? = null,
    val color: String? = null,
    val linkedTodoId: String? = null,
    val scopeIds: List<String> = emptyList()
) {
    fun isConfigured(): Boolean {
        return !activityId.isNullOrBlank() && !categoryId.isNullOrBlank()
    }
}

data class WidgetTemplate(
    val id: String,
    val name: String,
    val size: String = WidgetSizes.DEFAULT,
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
    val linkedTodoId: String? = null,
    val scopeIds: List<String> = emptyList(),
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
    val createdAt: Long,
    val linkedTodoId: String? = null,
    val scopeIds: List<String> = emptyList()
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
    val widgetSize: String,
    val templateId: String?,
    val templateName: String,
    val slots: List<WidgetSnapshotSlot>
)
