package com.mistycrown.lumostime

/**
 * Lightweight native models used by the unified Android widget system.
 * Templates are size-based, while each slot carries its own timer, daily, or shortcut type.
 * Updated 2026-05-21: Expanded mirrored TODAY + PIN source models with todo `maybeDates` plus recurrence `skipDates` so native rebuilds can match app-side today visibility.
 * Updated 2026-05-02: Added native scene-widget payload, group, slot, item, and per-instance selection models.
 * Updated 2026-05-05: Added mirrored TODAY + PIN source todo/category models so native widgets can rebuild today's list on refresh without waiting for a new web payload.
 * Updated 2026-05-05: Added optional scene item app-launch metadata so scene widgets can mirror in-app third-party app launching.
 * Updated 2026-05-05: Added optional scene runtime source metadata so app-side scene flips can stay scoped to the tapped scene slot.
 * Updated 2026-08-06: Added packaged UI icon asset paths to scene time slots for native tab rendering.
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

object WidgetDailyRuntimeViewModes {
    const val CATEGORY = "category"
    const val ACTIVITY = "activity"
    const val DEFAULT = CATEGORY

    @JvmStatic
    fun normalize(mode: String?): String {
        return when (mode) {
            ACTIVITY -> ACTIVITY
            CATEGORY -> CATEGORY
            else -> DEFAULT
        }
    }

    @JvmStatic
    fun toggle(mode: String?): String {
        return if (normalize(mode) == CATEGORY) ACTIVITY else CATEGORY
    }
}

object WidgetSceneGroupSwitchModes {
    const val MANUAL = "manual"
    const val AUTO = "auto"
    const val DEFAULT = MANUAL

    @JvmStatic
    fun normalize(mode: String?): String {
        return when (mode) {
            AUTO,
            MANUAL -> mode
            else -> DEFAULT
        }
    }
}

object WidgetSceneGroupAutoSwitchModes {
    const val DISABLED = "disabled"
    const val WEEKDAY = "weekday"
    const val WEEKEND = "weekend"
    const val DATE_RANGE = "dateRange"
    const val CUSTOM_WEEKDAYS = "customWeekdays"
    const val DEFAULT = DISABLED

    @JvmStatic
    fun normalize(mode: String?): String {
        return when (mode) {
            WEEKDAY,
            WEEKEND,
            DATE_RANGE,
            CUSTOM_WEEKDAYS,
            DISABLED -> mode
            else -> DEFAULT
        }
    }
}

object WidgetSceneItemTypes {
    const val TIMER = "timer"
    const val TODO = "todo"
    const val CHECKLIST = "checklist"
    const val DEFAULT = TIMER

    @JvmStatic
    fun normalize(type: String?): String {
        return when (type) {
            TODO,
            CHECKLIST,
            TIMER -> type
            else -> DEFAULT
        }
    }
}

object WidgetTapAnimationModes {
    const val TIMER_START = "timer_start"
    const val TIMER_STOP = "timer_stop"
    const val DAILY_COMPLETE = "daily_complete"
    const val DAILY_COUNT = "daily_count"
    const val SHORTCUT_SUCCESS = "shortcut_success"
}

object WidgetSceneRefreshAnimationModes {
    const val REFRESH = "scene_refresh"
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
            SIZE_4X1 -> 5
            SIZE_4X2 -> 8
            else -> 4
        }
    }
}

object WidgetTemplateTypes {
    const val GRID = "grid"
    const val TRACKING_CALENDAR = "trackingCalendar"
    const val DEFAULT = GRID

    @JvmStatic
    fun normalize(templateType: String?): String {
        return when (templateType) {
            TRACKING_CALENDAR,
            GRID -> templateType
            else -> DEFAULT
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

data class WidgetTrackingCalendarConfig(
    val sourceType: String? = null,
    val categoryId: String? = null,
    val activityId: String? = null,
    val scopeId: String? = null,
    val checkTemplateId: String? = null,
    val checkItemId: String? = null,
    val icon: String? = null,
    val customIcon: String? = null,
    val uiIconAssetPath: String? = null,
    val uiIconFallbackAssetPath: String? = null,
    val label: String? = null,
    val color: String? = null
)

data class WidgetTemplate(
    val id: String,
    val name: String,
    val size: String = WidgetSizes.DEFAULT,
    val slots: List<WidgetSlotConfig>,
    val templateType: String = WidgetTemplateTypes.DEFAULT,
    val trackingConfig: WidgetTrackingCalendarConfig? = null,
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
    val appWidgetId: Int? = null,
    val sceneGroupId: String? = null,
    val sceneSlotId: String? = null,
    val sceneItemId: String? = null
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
    val scopeIds: List<String> = emptyList(),
    val note: String? = null
)

data class WidgetLogTailState(
    val latestLogEndTime: Long? = null
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

data class WidgetDailyRuntimeSegment(
    val index: Int,
    val itemId: String? = null,
    val itemName: String? = null,
    val color: String? = null,
    val minutes: Int = 0
)

data class WidgetDailyRuntimeLegendItem(
    val itemId: String,
    val itemName: String,
    val color: String,
    val totalMinutes: Int
)

data class WidgetDailyRuntimeViewData(
    val segments: List<WidgetDailyRuntimeSegment> = emptyList(),
    val legend: List<WidgetDailyRuntimeLegendItem> = emptyList()
)

data class WidgetDailyRuntimePayload(
    val date: String,
    val totalMinutes: Int,
    val categoryView: WidgetDailyRuntimeViewData = WidgetDailyRuntimeViewData(),
    val activityView: WidgetDailyRuntimeViewData = WidgetDailyRuntimeViewData(),
    val syncedAt: Long
)

data class WidgetTodoPinItem(
    val todoId: String,
    val title: String,
    val isCompleted: Boolean = false,
    val badgeLabel: String,
    val categoryId: String? = null,
    val activityId: String? = null,
    val activityLabel: String? = null,
    val icon: String? = null,
    val color: String? = null,
    val scopeIds: List<String> = emptyList()
) {
    fun isActionable(): Boolean {
        return !activityId.isNullOrBlank() && !categoryId.isNullOrBlank()
    }
}

data class WidgetTodoPinPayload(
    val date: String,
    val items: List<WidgetTodoPinItem> = emptyList(),
    val syncedAt: Long,
    val sourceTodos: List<WidgetTodoPinSourceTodo> = emptyList(),
    val sourceCategories: List<WidgetTodoPinSourceCategory> = emptyList()
)

data class WidgetPendingTodoPinAction(
    val id: String,
    val todoId: String,
    val isCompleted: Boolean,
    val createdAt: Long,
    val actionType: String = "completion",
    val title: String? = null
)

data class WidgetTodoPinSourceRecurrenceRule(
    val frequency: String,
    val startDate: String,
    val endDate: String? = null,
    val interval: Int? = null,
    val weekdays: List<Int> = emptyList(),
    val monthDays: List<Int> = emptyList(),
    val skipDates: List<String> = emptyList(),
    val fallbackToMonthEnd: Boolean = false
)

data class WidgetTodoPinSourceTodo(
    val id: String,
    val title: String,
    val kind: String = "project",
    val isCompleted: Boolean = false,
    val parentTodoId: String? = null,
    val linkedCategoryId: String? = null,
    val linkedActivityId: String? = null,
    val defaultScopeIds: List<String> = emptyList(),
    val pin: Boolean = false,
    val scheduledDate: String? = null,
    val deadlineDate: String? = null,
    val maybeDates: List<String> = emptyList(),
    val recurrenceRule: WidgetTodoPinSourceRecurrenceRule? = null
)

data class WidgetTodoPinSourceActivity(
    val id: String,
    val name: String,
    val icon: String? = null,
    val color: String? = null
)

data class WidgetTodoPinSourceCategory(
    val id: String,
    val icon: String? = null,
    val themeColor: String? = null,
    val activities: List<WidgetTodoPinSourceActivity> = emptyList()
)

data class WidgetTrackingCalendarEntry(
    val date: String,
    val value: Int
)

data class WidgetTrackingCalendarTemplatePayload(
    val templateId: String,
    val entries: List<WidgetTrackingCalendarEntry> = emptyList()
)

data class WidgetTrackingCalendarPayload(
    val templates: List<WidgetTrackingCalendarTemplatePayload> = emptyList(),
    val syncedAt: Long
)

data class WidgetSceneGroupAutoSwitchConfig(
    val mode: String = WidgetSceneGroupAutoSwitchModes.DEFAULT,
    val startDate: String? = null,
    val endDate: String? = null,
    val weekdays: List<Int> = emptyList()
)

data class WidgetSceneItem(
    val id: String,
    val itemType: String = WidgetSceneItemTypes.DEFAULT,
    val title: String,
    val icon: String,
    val uiIconAssetPath: String? = null,
    val uiIconFallbackAssetPath: String? = null,
    val color: String,
    val activityId: String? = null,
    val categoryId: String? = null,
    val linkedTodoId: String? = null,
    val scopeIds: List<String> = emptyList(),
    val checkTemplateId: String? = null,
    val checkItemId: String? = null,
    val checkManualMode: String? = null,
    val checkTargetCount: Int? = null,
    val launchApp: Boolean = false,
    val appPackageName: String? = null,
    val appName: String? = null
)

data class WidgetSceneTimeSlot(
    val id: String,
    val name: String,
    val icon: String,
    val uiIconAssetPath: String? = null,
    val uiIconFallbackAssetPath: String? = null,
    val startTime: String,
    val endTime: String,
    val disableAutoSwitch: Boolean = false,
    val items: List<WidgetSceneItem> = emptyList()
)

data class WidgetSceneGroup(
    val id: String,
    val name: String,
    val autoSwitch: WidgetSceneGroupAutoSwitchConfig = WidgetSceneGroupAutoSwitchConfig(),
    val timeSlots: List<WidgetSceneTimeSlot> = emptyList()
)

data class WidgetScenePayload(
    val switchMode: String = WidgetSceneGroupSwitchModes.DEFAULT,
    val activeGroupId: String? = null,
    val groups: List<WidgetSceneGroup> = emptyList(),
    val syncedAt: Long
)

data class WidgetSceneSelectionState(
    val appWidgetId: Int,
    val selectedSlotId: String? = null,
    val lastAutoSlotId: String? = null
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

data class WidgetTodoPinRefreshAnimationState(
    val appWidgetId: Int,
    val startedAt: Long,
    val expiresAt: Long
)

data class WidgetSceneRefreshAnimationState(
    val appWidgetId: Int,
    val animationMode: String = WidgetSceneRefreshAnimationModes.REFRESH,
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
