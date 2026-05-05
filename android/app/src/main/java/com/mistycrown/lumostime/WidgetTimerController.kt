package com.mistycrown.lumostime

import android.content.Context
import android.content.Intent
import android.net.Uri
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.UUID

/**
 * Native widget action controller for timer, daily, and shortcut widgets.
 * Updated 2026-05-02: Added dedicated scene-widget item handling for timer-like cards and checklist cards.
 * Updated 2026-05-03: Reused the shared tap-animation state for scene widget items so scene timers and checklist cards get the same springy tap feedback as the timer widget family.
 * Updated 2026-05-03: Consolidated daily-slot and scene-checklist completion handling into one shared helper to keep widget-side checklist rules in sync.
 * Updated 2026-05-05: Added an external-stop helper so the floating window can end widget-started sessions even when the web layer has not hydrated them yet.
 * Updated 2026-05-05: Executes quick-punch shortcuts natively with a daily-style success checkmark instead of foregrounding the app.
 */
object WidgetTimerController {
    private const val TAP_FEEDBACK_DURATION_MS = 260L
    private const val SHORTCUT_SUCCESS_FEEDBACK_DURATION_MS = 1000L
    private const val QUICK_PUNCH_CATEGORY_ID = "uncategorized"
    private const val QUICK_PUNCH_ACTIVITY_ID = "quick_punch"
    private const val QUICK_PUNCH_TITLE = "快速打点"

    private data class DailyTapMutationResult(
        val animationMode: String,
        val occurredAt: Long
    )

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
            WidgetTypes.DAILY -> handleDailySlotTap(context, appWidgetId, slot)
            WidgetTypes.SHORTCUT -> handleShortcutSlotTap(context, appWidgetId, slot)
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
        item: WidgetSceneItem,
        slotIndex: Int
    ): Boolean {
        return when (WidgetSceneItemTypes.normalize(item.itemType)) {
            WidgetSceneItemTypes.CHECKLIST -> handleSceneChecklistItemTap(context, appWidgetId, item, slotIndex)
            else -> handleSceneTimerItemTap(context, appWidgetId, item, slotIndex)
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
        slot: WidgetSlotConfig
    ): Boolean {
        val normalizedWidgetType = WidgetTypes.normalize(slot.slotType)
        val checkItemId = slot.checkItemId ?: return false
        val mutation = applyDailyCheckTap(
            context = context,
            appWidgetId = appWidgetId,
            checkTemplateId = slot.checkTemplateId,
            checkItemId = checkItemId,
            fallbackManualMode = slot.checkManualMode,
            fallbackTargetCount = slot.checkTargetCount,
            pendingSlotIndex = slot.slotIndex
        ) ?: return false

        saveTapAnimation(
            context,
            appWidgetId = appWidgetId,
            widgetType = normalizedWidgetType,
            slotIndex = slot.slotIndex,
            animationMode = mutation.animationMode,
            startedAt = mutation.occurredAt
        )
        return true
    }

    private fun handleShortcutSlotTap(
        context: Context,
        appWidgetId: Int,
        slot: WidgetSlotConfig
    ): Boolean {
        val action = slot.shortcutAction ?: return false
        val normalizedWidgetType = WidgetTypes.normalize(slot.slotType)
        val startedAt = System.currentTimeMillis()

        if (action == QUICK_PUNCH_ACTIVITY_ID) {
            val didRecord = handleQuickPunchShortcut(context, appWidgetId, slot, startedAt)
            if (!didRecord) {
                return false
            }

            saveTapAnimation(
                context,
                appWidgetId = appWidgetId,
                widgetType = normalizedWidgetType,
                slotIndex = slot.slotIndex,
                animationMode = WidgetTapAnimationModes.SHORTCUT_SUCCESS,
                startedAt = startedAt,
                durationMs = SHORTCUT_SUCCESS_FEEDBACK_DURATION_MS
            )
            return true
        }

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

    private fun handleQuickPunchShortcut(
        context: Context,
        appWidgetId: Int,
        slot: WidgetSlotConfig,
        occurredAt: Long
    ): Boolean {
        val todayStart = Calendar.getInstance().apply {
            timeInMillis = occurredAt
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }.timeInMillis
        val latestLogEndTime = WidgetStores.loadLogTailState(context)?.latestLogEndTime

        if (latestLogEndTime != null && latestLogEndTime > occurredAt) {
            return false
        }

        val startTime = maxOf(latestLogEndTime ?: todayStart, todayStart)
        if (occurredAt <= startTime) {
            return false
        }

        val pendingAction = WidgetPendingAction(
            id = UUID.randomUUID().toString(),
            widgetType = WidgetTypes.SHORTCUT,
            activityId = QUICK_PUNCH_ACTIVITY_ID,
            categoryId = QUICK_PUNCH_CATEGORY_ID,
            icon = slot.icon?.ifBlank { null } ?: "\u26A1",
            label = slot.label?.ifBlank { null } ?: QUICK_PUNCH_TITLE,
            color = slot.color?.ifBlank { null } ?: "#FEF3C7",
            startedAt = startTime,
            endedAt = occurredAt,
            createdAt = occurredAt,
            note = ""
        )
        WidgetStores.appendPendingAction(context, pendingAction)
        WidgetStores.saveLogTailState(
            context,
            WidgetLogTailState(latestLogEndTime = occurredAt)
        )
        WidgetRefreshCoordinator.refreshWidgetWithTapFeedback(context, appWidgetId)
        return true
    }

    private fun handleSceneTimerItemTap(
        context: Context,
        appWidgetId: Int,
        item: WidgetSceneItem,
        slotIndex: Int
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
            saveTapAnimation(
                context,
                appWidgetId = appWidgetId,
                widgetType = WidgetTypes.TIMER,
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
        saveTapAnimation(
            context,
            appWidgetId = appWidgetId,
            widgetType = WidgetTypes.TIMER,
            slotIndex = slotIndex,
            animationMode = WidgetTapAnimationModes.TIMER_START,
            startedAt = now
        )
        FloatingWindowService.syncFocusStateIfRunning(nextRuntime.icon, true, nextRuntime.startedAt)
        return true
    }

    private fun handleSceneChecklistItemTap(
        context: Context,
        appWidgetId: Int,
        item: WidgetSceneItem,
        slotIndex: Int
    ): Boolean {
        val checkItemId = item.checkItemId ?: return false
        val mutation = applyDailyCheckTap(
            context = context,
            appWidgetId = appWidgetId,
            checkTemplateId = item.checkTemplateId,
            checkItemId = checkItemId,
            fallbackManualMode = item.checkManualMode,
            fallbackTargetCount = item.checkTargetCount,
            pendingSlotIndex = null
        ) ?: return false

        saveTapAnimation(
            context,
            appWidgetId = appWidgetId,
            widgetType = WidgetTypes.DAILY,
            slotIndex = slotIndex,
            animationMode = mutation.animationMode,
            startedAt = mutation.occurredAt
        )
        return true
    }

    private fun applyDailyCheckTap(
        context: Context,
        appWidgetId: Int,
        checkTemplateId: String?,
        checkItemId: String,
        fallbackManualMode: String?,
        fallbackTargetCount: Int?,
        pendingSlotIndex: Int?
    ): DailyTapMutationResult? {
        val payload = WidgetStores.loadDailySyncPayload(context)
        val todayDate = getCurrentDateString()
        val meta = payload?.items?.firstOrNull { it.checkItemId == checkItemId }
        val currentProgress =
            if (payload?.date == todayDate) payload.progress.firstOrNull { it.checkItemId == checkItemId } else null

        val manualMode = WidgetDailyModes.normalize(meta?.manualMode ?: fallbackManualMode)
        val targetCount = (meta?.targetCount ?: fallbackTargetCount ?: 1).coerceAtLeast(1)
        val currentCount = (currentProgress?.currentCount ?: 0).coerceAtLeast(0).coerceAtMost(targetCount)
        val isCompleted = currentProgress?.isCompleted ?: false
        val occurredAt = System.currentTimeMillis()

        val animationMode = if (manualMode == WidgetDailyModes.BINARY) {
            if (isCompleted) {
                return null
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
                    updatedAt = occurredAt
                )
            )
            WidgetTapAnimationModes.DAILY_COMPLETE
        } else {
            if (currentCount >= targetCount) {
                return null
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
                    updatedAt = occurredAt
                )
            )

            if (nextCount < targetCount) {
                WidgetTapAnimationModes.DAILY_COUNT
            } else {
                WidgetTapAnimationModes.DAILY_COMPLETE
            }
        }

        WidgetStores.appendPendingDailyAction(
            context,
            WidgetPendingDailyAction(
                id = UUID.randomUUID().toString(),
                widgetType = WidgetTypes.DAILY,
                date = todayDate,
                checkTemplateId = checkTemplateId,
                checkItemId = checkItemId,
                actionMode = "complete_once",
                createdAt = occurredAt,
                appWidgetId = appWidgetId,
                slotIndex = pendingSlotIndex
            )
        )

        return DailyTapMutationResult(
            animationMode = animationMode,
            occurredAt = occurredAt
        )
    }

    private fun saveTapAnimation(
        context: Context,
        appWidgetId: Int,
        widgetType: String,
        slotIndex: Int,
        animationMode: String,
        startedAt: Long,
        durationMs: Long = TAP_FEEDBACK_DURATION_MS
    ) {
        WidgetStores.saveTapAnimationState(
            context,
            WidgetTapAnimationState(
                appWidgetId = appWidgetId,
                widgetType = widgetType,
                slotIndex = slotIndex,
                animationMode = animationMode,
                startedAt = startedAt,
                expiresAt = startedAt + durationMs
            )
        )
    }

    @JvmStatic
    fun stopWidgetRuntimeFromExternalTrigger(context: Context): WidgetRuntimeState? {
        val runtimeState = WidgetStores.loadRuntimeState(context) ?: return null
        if (runtimeState.source != "widget") {
            return null
        }

        val endedAt = System.currentTimeMillis()
        finishRuntime(context, runtimeState, endedAt)
        WidgetStores.saveRuntimeState(context, null)
        WidgetStores.saveLastWidgetStopAt(context, endedAt)
        WidgetRefreshCoordinator.refreshTimerWidgets(context)
        WidgetRefreshCoordinator.refreshTodoPinWidgets(context)
        WidgetRefreshCoordinator.refreshSceneWidgets(context)
        FloatingWindowService.syncFocusStateIfRunning(runtimeState.icon, false, 0L)
        return runtimeState
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
