package com.mistycrown.lumostime

/**
 * Lightweight native models used by the unified Android widget system.
 * Templates are size-based, while each slot carries its own timer, daily, or shortcut type.
 */
object WidgetTypes {
    const val TIMER = "timer"
    const val DAILY = "daily"
    const val SHORTCUT = "shortcut"
    const val DEFAULT = TIMER

    @JvmStatic
    fun normalize(widgetType: String?): String {
        return when (widgetType) {
            TIMER,
            DAILY,
            SHORTCUT -> widgetType
            else -> DEFAULT
        }
    }
}

object WidgetDailyModes {
    const val BINARY = "binary"
    const val COUNT = "count"
    const val DEFAULT = BINARY

    @JvmStatic
    fun normalize(manualMode: String?): String {
        return when (manualMode) {
            COUNT -> COUNT
            BINARY -> BINARY
            else -> DEFAULT
        }
    }
}

object WidgetTapAnimationModes {
    const val TIMER_START = "timer_start"
    const val TIMER_STOP = "timer_stop"
    const val DAILY_COMPLETE = "daily_complete"
    const val DAILY_COUNT = "daily_count"
}

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
            SIZE_2X2 -> 4
            SIZE_3X2 -> 6
            SIZE_4X1 -> 4
            SIZE_4X2 -> 8
            else -> 4
        }
    }
}

data class WidgetSlotConfig(
    val slotIndex: Int,
    val slotType: String? = null,
    val activityId: String? = null,
    val categoryId: String? = null,
    val icon: String? = null,
    val customIcon: String? = null,
    val uiIconAssetPath: String? = null,
    val uiIconFallbackAssetPath: String? = null,
    val label: String? = null,
    val color: String? = null,
    val linkedTodoId: String? = null,
    val scopeIds: List<String> = emptyList(),
    val checkTemplateId: String? = null,
    val checkItemId: String? = null,
    val checkManualMode: String? = null,
    val checkTargetCount: Int? = null,
    val shortcutAction: String? = null
) {
    fun isConfigured(): Boolean {
        return when (WidgetTypes.normalize(slotType)) {
            WidgetTypes.DAILY -> !checkItemId.isNullOrBlank()
            WidgetTypes.SHORTCUT -> !shortcutAction.isNullOrBlank()
            else -> !activityId.isNullOrBlank() && !categoryId.isNullOrBlank()
        }
    }
}

data class WidgetTemplate(
    val id: String,
    val name: String,
    val size: String = WidgetSizes.DEFAULT,
    val slots: List<WidgetSlotConfig>,
    val createdAt: Long,
    val updatedAt: Long
)

data class WidgetInstanceBinding(
    val appWidgetId: Int,
    val templateId: String? = null,
    val createdAt: Long,
    val updatedAt: Long
)

data class WidgetRuntimeState(
    val id: String,
    val widgetType: String = WidgetTypes.DEFAULT,
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
    val widgetType: String = WidgetTypes.DEFAULT,
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

data class WidgetDailyCheckMeta(
    val checkTemplateId: String,
    val checkItemId: String,
    val content: String,
    val category: String,
    val manualMode: String = WidgetDailyModes.DEFAULT,
    val targetCount: Int = 1,
    val icon: String? = null,
    val uiIcon: String? = null
)

data class WidgetDailyProgress(
    val checkItemId: String,
    val date: String,
    val manualMode: String = WidgetDailyModes.DEFAULT,
    val currentCount: Int = 0,
    val targetCount: Int = 1,
    val isCompleted: Boolean = false,
    val updatedAt: Long
)

data class WidgetDailySyncPayload(
    val date: String,
    val items: List<WidgetDailyCheckMeta>,
    val progress: List<WidgetDailyProgress>,
    val syncedAt: Long
)

data class WidgetPendingDailyAction(
    val id: String,
    val widgetType: String = WidgetTypes.DAILY,
    val date: String,
    val checkTemplateId: String? = null,
    val checkItemId: String,
    val actionMode: String = "complete_once",
    val createdAt: Long,
    val appWidgetId: Int? = null,
    val slotIndex: Int? = null
)

data class WidgetTapAnimationState(
    val appWidgetId: Int,
    val widgetType: String = WidgetTypes.DEFAULT,
    val slotIndex: Int,
    val animationMode: String,
    val startedAt: Long,
    val expiresAt: Long
)

data class WidgetSnapshotSlot(
    val slotIndex: Int,
    val slotType: String? = null,
    val activityId: String?,
    val categoryId: String?,
    val checkItemId: String? = null,
    val icon: String,
    val uiIconAssetPath: String?,
    val uiIconFallbackAssetPath: String?,
    val label: String,
    val color: String,
    val isActive: Boolean,
    val manualMode: String? = null,
    val currentCount: Int = 0,
    val targetCount: Int = 1,
    val isCompleted: Boolean = false,
    val tapAnimationMode: String? = null,
    val tapAnimationProgress: Float? = null
)

data class WidgetSnapshot(
    val appWidgetId: Int,
    val widgetSize: String,
    val templateId: String?,
    val templateName: String,
    val slots: List<WidgetSnapshotSlot>
)
