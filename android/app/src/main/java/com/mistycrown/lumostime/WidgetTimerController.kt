package com.mistycrown.lumostime

import android.content.Context
import android.content.Intent
import android.net.Uri
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

/**
 * Native widget action controller for timer, daily, and shortcut widgets.
 * Updated 2026-05-02: Added dedicated scene-widget item handling for timer-like cards and checklist cards.
 */
object WidgetTimerController {
    private const val TAP_FEEDBACK_DURATION_MS = 260L

    fun handleSlotTap(
        context: Context,
        appWidgetId: Int,
        widgetSize: String,
        slotIndex: Int
    ): Boolean {
        val normalizedSize = WidgetSizes.normalize(widgetSize)
        val binding =
            WidgetStores.ensureBinding(context, appWidgetId, normalizedSize) ?: return false
        val template = WidgetStores.loadTemplateForSize(context, binding.templateId, normalizedSize) ?: return false
        val slot = template.slots.firstOrNull { it.slotIndex == slotIndex } ?: return false

        return when (WidgetTypes.normalize(slot.slotType)) {
            WidgetTypes.DAILY -> handleDailySlotTap(context, appWidgetId, template, slot)
            WidgetTypes.SHORTCUT -> handleShortcutSlotTap(context, appWidgetId, template, slot)
            else -> handleTimerSlotTap(context, appWidgetId, template, slot)
        }
    }

    fun handleTodoPinItemTap(
        context: Context,
        appWidgetId: Int,
        todoId: String
    ): Boolean {
        if (todoId.isBlank()) {
            return false
        }

        val payload = WidgetStores.loadTodoPinPayload(context) ?: return false
        val item = payload.items.firstOrNull { it.todoId == todoId } ?: return false
        if (!item.isActionable()) {
            return false
        }

        val now = System.currentTimeMillis()
        val currentRuntime = WidgetStores.loadRuntimeState(context)
        val isSameTodoActive = currentRuntime?.linkedTodoId == todoId

        if (isSameTodoActive && currentRuntime != null) {
            finishRuntime(context, currentRuntime, now)
            WidgetStores.saveRuntimeState(context, null)
            WidgetStores.saveLastWidgetStopAt(context, now)
            FloatingWindowService.syncFocusStateIfRunning(currentRuntime.icon, false, 0L)
            return true
        }

        if (currentRuntime != null) {
            finishRuntime(context, currentRuntime, now)
        }

        val nextRuntime = WidgetRuntimeState(
            id = UUID.randomUUID().toString(),
            widgetType = WidgetTypes.TIMER,
            activityId = item.activityId.orEmpty(),
            categoryId = item.categoryId.orEmpty(),
            icon = item.icon?.ifBlank { null } ?: "\u2022",
            label = item.activityLabel?.ifBlank { null } ?: "",
            color = item.color?.ifBlank { null } ?: "#E7E5E4",
            startedAt = now,
            source = "widget",
            linkedTodoId = item.todoId,
            scopeIds = item.scopeIds,
            slotIndex = null,
            templateId = null,
            appWidgetId = appWidgetId
        )

        WidgetStores.saveRuntimeState(context, nextRuntime)
        WidgetStores.saveLastWidgetStopAt(context, null)
        FloatingWindowService.syncFocusStateIfRunning(nextRuntime.icon, true, nextRuntime.startedAt)
        return true
    }

    fun handleSceneItemTap(
        context: Context,
        appWidgetId: Int,
        item: WidgetSceneItem
    ): Boolean {
        return when (WidgetSceneItemTypes.normalize(item.itemType)) {
            WidgetSceneItemTypes.CHECKLIST -> handleSceneChecklistItemTap(context, appWidgetId, item)
            else -> handleSceneTimerItemTap(context, appWidgetId, item)
        }
    }

    private fun handleTimerSlotTap(
        context: Context,
        appWidgetId: Int,
        template: WidgetTemplate,
        slot: WidgetSlotConfig
    ): Boolean {
        val normalizedWidgetType = WidgetTypes.normalize(slot.slotType)
        val slotIndex = slot.slotIndex

        if (!slot.isConfigured()) {
            return false
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
            saveTapAnimation(
                context,
                appWidgetId = appWidgetId,
                widgetType = normalizedWidgetType,
                slotIndex = slotIndex,
                animationMode = WidgetTapAnimationModes.TIMER_STOP,
                startedAt = now
            )
            FloatingWindowService.syncFocusStateIfRunning(currentRuntime.icon, false, 0L)
            return true
        }

        if (currentRuntime != null) {
            finishRuntime(context, currentRuntime, now)
        }

        val nextRuntime = WidgetRuntimeState(
            id = UUID.randomUUID().toString(),
            widgetType = normalizedWidgetType,
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

        WidgetStores.saveRuntimeState(context, nextRuntime)
        WidgetStores.saveLastWidgetStopAt(context, null)
        saveTapAnimation(
            context,
            appWidgetId = appWidgetId,
            widgetType = normalizedWidgetType,
            slotIndex = slotIndex,
            animationMode = WidgetTapAnimationModes.TIMER_START,
            startedAt = now
        )
        FloatingWindowService.syncFocusStateIfRunning(nextRuntime.icon, true, nextRuntime.startedAt)
        return true
    }

    private fun handleDailySlotTap(
        context: Context,
        appWidgetId: Int,
        template: WidgetTemplate,
        slot: WidgetSlotConfig
    ): Boolean {
        val normalizedWidgetType = WidgetTypes.normalize(slot.slotType)
        val slotIndex = slot.slotIndex
        val checkItemId = slot.checkItemId ?: return false

        val payload = WidgetStores.loadDailySyncPayload(context)
        val todayDate = getCurrentDateString()
        val meta = payload?.items?.firstOrNull { it.checkItemId == checkItemId }
        val currentProgress =
            if (payload?.date == todayDate) payload.progress.firstOrNull { it.checkItemId == checkItemId } else null

        val manualMode = WidgetDailyModes.normalize(meta?.manualMode ?: slot.checkManualMode)
        val targetCount = (meta?.targetCount ?: slot.checkTargetCount ?: 1).coerceAtLeast(1)
        val currentCount = (currentProgress?.currentCount ?: 0).coerceAtLeast(0).coerceAtMost(targetCount)
        val isCompleted = currentProgress?.isCompleted ?: false

        if (manualMode == WidgetDailyModes.BINARY) {
            if (isCompleted) {
                return false
            }

            WidgetStores.upsertDailyProgress(
                context,
                WidgetDailyProgress(
                    checkItemId = checkItemId,
                    date = todayDate,
                    manualMode = WidgetDailyModes.BINARY,
                    currentCount = 1,
                    targetCount = 1,
                    isCompleted = true,
                    updatedAt = System.currentTimeMillis()
                )
            )
        } else {
            if (currentCount >= targetCount) {
                return false
            }

            val nextCount = (currentCount + 1).coerceAtMost(targetCount)
            WidgetStores.upsertDailyProgress(
                context,
                WidgetDailyProgress(
                    checkItemId = checkItemId,
                    date = todayDate,
                    manualMode = WidgetDailyModes.COUNT,
                    currentCount = nextCount,
                    targetCount = targetCount,
                    isCompleted = nextCount >= targetCount,
                    updatedAt = System.currentTimeMillis()
                )
            )
        }

        WidgetStores.appendPendingDailyAction(
            context,
            WidgetPendingDailyAction(
                id = UUID.randomUUID().toString(),
                widgetType = WidgetTypes.DAILY,
                date = todayDate,
                checkTemplateId = slot.checkTemplateId,
                checkItemId = checkItemId,
                actionMode = "complete_once",
                createdAt = System.currentTimeMillis(),
                appWidgetId = appWidgetId,
                slotIndex = slotIndex
            )
        )

        saveTapAnimation(
            context,
            appWidgetId = appWidgetId,
            widgetType = normalizedWidgetType,
            slotIndex = slotIndex,
            animationMode = if (manualMode == WidgetDailyModes.COUNT && currentCount + 1 < targetCount) {
                WidgetTapAnimationModes.DAILY_COUNT
            } else {
                WidgetTapAnimationModes.DAILY_COMPLETE
            },
            startedAt = System.currentTimeMillis()
        )
        return true
    }

    private fun handleShortcutSlotTap(
        context: Context,
        appWidgetId: Int,
        template: WidgetTemplate,
        slot: WidgetSlotConfig
    ): Boolean {
        val action = slot.shortcutAction ?: return false
        val normalizedWidgetType = WidgetTypes.normalize(slot.slotType)
        val startedAt = System.currentTimeMillis()

        saveTapAnimation(
            context,
            appWidgetId = appWidgetId,
            widgetType = normalizedWidgetType,
            slotIndex = slot.slotIndex,
            animationMode = WidgetTapAnimationModes.TIMER_START,
            startedAt = startedAt
        )

        val intent = Intent(
            Intent.ACTION_VIEW,
            Uri.parse("lumostime://widget?action=$action")
        ).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            `package` = context.packageName
        }
        context.startActivity(intent)
        return true
    }

    private fun handleSceneTimerItemTap(
        context: Context,
        appWidgetId: Int,
        item: WidgetSceneItem
    ): Boolean {
        if (item.activityId.isNullOrBlank() || item.categoryId.isNullOrBlank()) {
            return false
        }

        val now = System.currentTimeMillis()
        val currentRuntime = WidgetStores.loadRuntimeState(context)
        val isSameItemActive = currentRuntime?.let { runtime ->
            runtime.activityId == item.activityId &&
                runtime.categoryId == item.categoryId &&
                runtime.linkedTodoId == item.linkedTodoId &&
                runtime.scopeIds.toSet() == item.scopeIds.toSet()
        } ?: false

        if (isSameItemActive && currentRuntime != null) {
            finishRuntime(context, currentRuntime, now)
            WidgetStores.saveRuntimeState(context, null)
            WidgetStores.saveLastWidgetStopAt(context, now)
            FloatingWindowService.syncFocusStateIfRunning(currentRuntime.icon, false, 0L)
            return true
        }

        if (currentRuntime != null) {
            finishRuntime(context, currentRuntime, now)
        }

        val nextRuntime = WidgetRuntimeState(
            id = UUID.randomUUID().toString(),
            widgetType = WidgetTypes.TIMER,
            activityId = item.activityId.orEmpty(),
            categoryId = item.categoryId.orEmpty(),
            icon = item.icon.ifBlank { "\u2022" },
            label = item.title,
            color = item.color.ifBlank { "#E7E5E4" },
            startedAt = now,
            source = "widget",
            linkedTodoId = item.linkedTodoId,
            scopeIds = item.scopeIds,
            slotIndex = null,
            templateId = null,
            appWidgetId = appWidgetId
        )

        WidgetStores.saveRuntimeState(context, nextRuntime)
        WidgetStores.saveLastWidgetStopAt(context, null)
        FloatingWindowService.syncFocusStateIfRunning(nextRuntime.icon, true, nextRuntime.startedAt)
        return true
    }

    private fun handleSceneChecklistItemTap(
        context: Context,
        appWidgetId: Int,
        item: WidgetSceneItem
    ): Boolean {
        val checkItemId = item.checkItemId ?: return false

        val payload = WidgetStores.loadDailySyncPayload(context)
        val todayDate = getCurrentDateString()
        val meta = payload?.items?.firstOrNull { it.checkItemId == checkItemId }
        val currentProgress =
            if (payload?.date == todayDate) payload.progress.firstOrNull { it.checkItemId == checkItemId } else null

        val manualMode = WidgetDailyModes.normalize(meta?.manualMode ?: item.checkManualMode)
        val targetCount = (meta?.targetCount ?: item.checkTargetCount ?: 1).coerceAtLeast(1)
        val currentCount = (currentProgress?.currentCount ?: 0).coerceAtLeast(0).coerceAtMost(targetCount)
        val isCompleted = currentProgress?.isCompleted ?: false

        if (manualMode == WidgetDailyModes.BINARY) {
            if (isCompleted) {
                return false
            }

            WidgetStores.upsertDailyProgress(
                context,
                WidgetDailyProgress(
                    checkItemId = checkItemId,
                    date = todayDate,
                    manualMode = WidgetDailyModes.BINARY,
                    currentCount = 1,
                    targetCount = 1,
                    isCompleted = true,
                    updatedAt = System.currentTimeMillis()
                )
            )
        } else {
            if (currentCount >= targetCount) {
                return false
            }

            val nextCount = (currentCount + 1).coerceAtMost(targetCount)
            WidgetStores.upsertDailyProgress(
                context,
                WidgetDailyProgress(
                    checkItemId = checkItemId,
                    date = todayDate,
                    manualMode = WidgetDailyModes.COUNT,
                    currentCount = nextCount,
                    targetCount = targetCount,
                    isCompleted = nextCount >= targetCount,
                    updatedAt = System.currentTimeMillis()
                )
            )
        }

        WidgetStores.appendPendingDailyAction(
            context,
            WidgetPendingDailyAction(
                id = UUID.randomUUID().toString(),
                widgetType = WidgetTypes.DAILY,
                date = todayDate,
                checkTemplateId = item.checkTemplateId,
                checkItemId = checkItemId,
                actionMode = "complete_once",
                createdAt = System.currentTimeMillis(),
                appWidgetId = appWidgetId,
                slotIndex = null
            )
        )

        return true
    }

    private fun saveTapAnimation(
        context: Context,
        appWidgetId: Int,
        widgetType: String,
        slotIndex: Int,
        animationMode: String,
        startedAt: Long
    ) {
        WidgetStores.saveTapAnimationState(
            context,
            WidgetTapAnimationState(
                appWidgetId = appWidgetId,
                widgetType = widgetType,
                slotIndex = slotIndex,
                animationMode = animationMode,
                startedAt = startedAt,
                expiresAt = startedAt + TAP_FEEDBACK_DURATION_MS
            )
        )
    }

    private fun finishRuntime(context: Context, runtimeState: WidgetRuntimeState, endedAt: Long) {
        if (endedAt - runtimeState.startedAt < 1000L) {
            return
        }

        WidgetStores.appendPendingAction(
            context,
            WidgetPendingAction(
                id = runtimeState.id,
                widgetType = runtimeState.widgetType,
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

    private fun getCurrentDateString(): String {
        return SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
    }
}
