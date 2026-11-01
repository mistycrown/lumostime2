package com.mistycrown.lumostime

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.UUID

/**
 * Native widget action controller for timer, daily, and shortcut widgets.
 * Updated 2026-11-01: Applies single-timer switching to every native start and prevents retired sessions returning through sync.
 * Updated 2026-10-29: Adds date-validated list taps with capped counts, reusing the native progress/replay queue.
 * Updated 2026-10-14: Merges current preferred scope rules into timer-slot runtime without replacing configured scopes.
 * Updated 2026-05-02: Added dedicated scene-widget item handling for timer-like cards and checklist cards.
 * Updated 2026-05-03: Reused the shared tap-animation state for scene widget items so scene timers and checklist cards get the same springy tap feedback as the timer widget family.
 * Updated 2026-05-03: Consolidated daily-slot and scene-checklist completion handling into one shared helper to keep widget-side checklist rules in sync.
 * Updated 2026-05-05: Added an external-stop helper so the floating window can end widget-started sessions even when the web layer has not hydrated them yet.
 * Updated 2026-05-05: Executes quick-punch shortcuts natively with a daily-style success checkmark instead of foregrounding the app.
 * Updated 2026-05-05: Lets scene widget timer/todo cards try opening configured third-party apps without blocking their normal Lumo runtime actions.
 * Updated 2026-05-05: Preserves scene group/slot/item source metadata when a scene widget starts runtime so app-side flips can stay scoped to the tapped slot.
 * Updated 2026-08-11: Cycles binary and count daily checks locally and queues the matching replay action for the web layer.
 * Updated 2026-08-11: Resolves daily progress by today's date within the weekly widget payload.
 * Updated 2026-08-11: Notifies the WebView immediately after a daily widget action is queued.
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

    @Synchronized
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

    @Synchronized
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
        val currentRuntimes = WidgetStores.loadRuntimeStates(context)
        val currentRuntime = currentRuntimes.find {
            it.source == "widget" && it.linkedTodoId == todoId
        }
        val isSameTodoActive = currentRuntime?.linkedTodoId == todoId

        if (isSameTodoActive && currentRuntime != null) {
            finishRuntime(context, currentRuntime, now)
            val remainingRuntimes = currentRuntimes.filterNot { it.id == currentRuntime.id }
            WidgetStores.saveRuntimeStates(context, remainingRuntimes)
            WidgetStores.saveLastWidgetStopAt(context, now)
            syncFloatingWindow(context, remainingRuntimes)
            return true
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

        startRuntime(context, currentRuntimes, nextRuntime)
        return true
    }

    @Synchronized
    fun handleSceneItemTap(
        context: Context,
        appWidgetId: Int,
        sceneGroupId: String?,
        sceneSlotId: String,
        item: WidgetSceneItem,
        slotIndex: Int
    ): Boolean {
        return when (WidgetSceneItemTypes.normalize(item.itemType)) {
            WidgetSceneItemTypes.CHECKLIST -> handleSceneChecklistItemTap(context, appWidgetId, item, slotIndex)
            else -> handleSceneTimerItemTap(context, appWidgetId, sceneGroupId, sceneSlotId, item, slotIndex)
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
        val scopeIds = WidgetStores.resolveTimerScopeIds(context, slot.activityId, slot.scopeIds)

        if (!slot.isConfigured()) {
            return false
        }

        val now = System.currentTimeMillis()
        val currentRuntimes = WidgetStores.loadRuntimeStates(context)
        val currentRuntime = currentRuntimes.find { runtime ->
            if (runtime.source == "widget" && runtime.templateId == template.id) {
                runtime.slotIndex == slotIndex
            } else {
                runtime.activityId == slot.activityId &&
                    runtime.categoryId == slot.categoryId &&
                    runtime.linkedTodoId == slot.linkedTodoId &&
                    runtime.scopeIds.toSet() == scopeIds.toSet()
            }
        }
        val isSameSlotActive = currentRuntime?.let { runtime ->
            if (runtime.source == "widget" && runtime.templateId == template.id) {
                runtime.slotIndex == slotIndex
            } else {
                runtime.activityId == slot.activityId &&
                    runtime.categoryId == slot.categoryId &&
                    runtime.linkedTodoId == slot.linkedTodoId &&
                    runtime.scopeIds.toSet() == scopeIds.toSet()
            }
        } ?: false

        if (isSameSlotActive && currentRuntime != null) {
            finishRuntime(context, currentRuntime, now)
            val remainingRuntimes = currentRuntimes.filterNot { it.id == currentRuntime.id }
            WidgetStores.saveRuntimeStates(context, remainingRuntimes)
            WidgetStores.saveLastWidgetStopAt(context, now)
            saveTapAnimation(
                context,
                appWidgetId = appWidgetId,
                widgetType = normalizedWidgetType,
                slotIndex = slotIndex,
                animationMode = WidgetTapAnimationModes.TIMER_STOP,
                startedAt = now
            )
            syncFloatingWindow(context, remainingRuntimes)
            return true
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
            scopeIds = scopeIds,
            slotIndex = slotIndex,
            templateId = template.id,
            appWidgetId = appWidgetId
        )

        startRuntime(context, currentRuntimes, nextRuntime)
        saveTapAnimation(
            context,
            appWidgetId = appWidgetId,
            widgetType = normalizedWidgetType,
            slotIndex = slotIndex,
            animationMode = WidgetTapAnimationModes.TIMER_START,
            startedAt = now
        )
        return true
    }

    private fun handleDailySlotTap(
        context: Context,
        appWidgetId: Int,
        slot: WidgetSlotConfig
    ): Boolean {
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
            widgetType = WidgetTypes.normalize(slot.slotType),
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
        sceneGroupId: String?,
        sceneSlotId: String,
        item: WidgetSceneItem,
        slotIndex: Int
    ): Boolean {
        if (item.activityId.isNullOrBlank() || item.categoryId.isNullOrBlank()) {
            return false
        }

        maybeLaunchSceneApp(context, item)

        val now = System.currentTimeMillis()
        val currentRuntimes = WidgetStores.loadRuntimeStates(context)
        val currentRuntime = currentRuntimes.find { runtime ->
            runtime.source == "widget" &&
                runtime.activityId == item.activityId &&
                runtime.categoryId == item.categoryId &&
                runtime.linkedTodoId == item.linkedTodoId &&
                runtime.scopeIds.toSet() == item.scopeIds.toSet() &&
                (runtime.sceneItemId.isNullOrBlank() || runtime.sceneItemId == item.id)
        }
        val isSameItemActive = currentRuntime?.let { runtime ->
            runtime.activityId == item.activityId &&
                runtime.categoryId == item.categoryId &&
                runtime.linkedTodoId == item.linkedTodoId &&
                runtime.scopeIds.toSet() == item.scopeIds.toSet()
        } ?: false

        if (isSameItemActive && currentRuntime != null) {
            finishRuntime(context, currentRuntime, now)
            val remainingRuntimes = currentRuntimes.filterNot { it.id == currentRuntime.id }
            WidgetStores.saveRuntimeStates(context, remainingRuntimes)
            WidgetStores.saveLastWidgetStopAt(context, now)
            saveTapAnimation(
                context,
                appWidgetId = appWidgetId,
                widgetType = WidgetTypes.TIMER,
                slotIndex = slotIndex,
                animationMode = WidgetTapAnimationModes.TIMER_STOP,
                startedAt = now
            )
            syncFloatingWindow(context, remainingRuntimes)
            return true
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
            appWidgetId = appWidgetId,
            sceneGroupId = sceneGroupId,
            sceneSlotId = sceneSlotId,
            sceneItemId = item.id
        )

        startRuntime(context, currentRuntimes, nextRuntime)
        saveTapAnimation(
            context,
            appWidgetId = appWidgetId,
            widgetType = WidgetTypes.TIMER,
            slotIndex = slotIndex,
            animationMode = WidgetTapAnimationModes.TIMER_START,
            startedAt = now
        )
        return true
    }

    private fun maybeLaunchSceneApp(context: Context, item: WidgetSceneItem) {
        if (!item.launchApp) {
            return
        }

        val packageName = item.appPackageName?.trim().orEmpty()
        if (packageName.isBlank()) {
            return
        }

        try {
            val packageManager: PackageManager = context.packageManager
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName) ?: return
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(launchIntent)
        } catch (_: Exception) {
            // Match in-app scene card behavior: launch failure should not block timer/todo actions.
        }
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

    @Synchronized
    fun handleDailyListItemTap(
        context: Context,
        appWidgetId: Int,
        checkItemId: String,
        renderedDate: String
    ): Boolean {
        val payload = WidgetStores.loadDailySyncPayload(context) ?: return false
        val meta = payload.items.firstOrNull { it.checkItemId == checkItemId } ?: return false
        val todayDate = getCurrentDateString()
        val progress = payload.progress.firstOrNull { it.checkItemId == checkItemId && it.date == todayDate }
        val action = WidgetDailyCheckListRules.actionMode(
            meta.type, meta.manualMode, progress?.currentCount ?: 0, meta.targetCount, renderedDate, todayDate
        ) ?: return false
        return applyDailyCheckTap(
            context, appWidgetId, meta.checkTemplateId, checkItemId,
            meta.manualMode, meta.targetCount, null,
            cycleCount = action != "increment", expectedDate = renderedDate
        ) != null
    }

    @Synchronized
    private fun applyDailyCheckTap(
        context: Context,
        appWidgetId: Int,
        checkTemplateId: String?,
        checkItemId: String,
        fallbackManualMode: String?,
        fallbackTargetCount: Int?,
        pendingSlotIndex: Int?,
        cycleCount: Boolean = true,
        expectedDate: String? = null
    ): DailyTapMutationResult? {
        val payload = WidgetStores.loadDailySyncPayload(context)
        val todayDate = getCurrentDateString()
        val meta = payload?.items?.firstOrNull { it.checkItemId == checkItemId }
        if (expectedDate != null && (expectedDate != todayDate || meta?.type != "manual")) return null
        val currentProgress =
            if (payload?.date == todayDate) {
                payload.progress.firstOrNull {
                    it.checkItemId == checkItemId && it.date == todayDate
                }
            } else {
                null
            }

        val manualMode = WidgetDailyModes.normalize(meta?.manualMode ?: fallbackManualMode)
        val targetCount = (meta?.targetCount ?: fallbackTargetCount ?: 1).coerceAtLeast(1)
        val currentCount = (currentProgress?.currentCount ?: 0).coerceAtLeast(0).coerceAtMost(targetCount)
        val isCompleted = currentProgress?.isCompleted ?: false
        val occurredAt = System.currentTimeMillis()

        val actionMode: String
        val animationMode = if (manualMode == WidgetDailyModes.BINARY) {
            val nextCompleted = !isCompleted
            WidgetStores.upsertDailyProgress(
                context,
                WidgetDailyProgress(
                    checkItemId = checkItemId,
                    date = todayDate,
                    manualMode = WidgetDailyModes.BINARY,
                    currentCount = if (nextCompleted) 1 else 0,
                    targetCount = 1,
                    isCompleted = nextCompleted,
                    updatedAt = occurredAt
                )
            )
            actionMode = "toggle"
            if (nextCompleted) {
                WidgetTapAnimationModes.DAILY_COMPLETE
            } else {
                WidgetTapAnimationModes.DAILY_COUNT
            }
        } else {
            if (!cycleCount && currentCount >= targetCount) return null
            val nextCount = if (currentCount >= targetCount) 0 else currentCount + 1
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
            actionMode = if (cycleCount) "cycle" else "increment"

            if (nextCount in 1 until targetCount) {
                WidgetTapAnimationModes.DAILY_COUNT
            } else if (nextCount == targetCount) {
                WidgetTapAnimationModes.DAILY_COMPLETE
            } else {
                WidgetTapAnimationModes.DAILY_COUNT
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
                actionMode = actionMode,
                createdAt = occurredAt,
                appWidgetId = appWidgetId,
                slotIndex = pendingSlotIndex
            )
        )
        WidgetRefreshCoordinator.refreshDailyCheckListWidgets(context)
        WidgetBridgePlugin.notifyDailyActionPending()

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
        return stopWidgetRuntimeFromExternalTrigger(context, null)
    }

    @JvmStatic
    @Synchronized
    fun stopWidgetRuntimeFromExternalTrigger(context: Context, sessionId: String?): WidgetRuntimeState? {
        val runtimeStates = WidgetStores.loadRuntimeStates(context)
        val runtimeState = if (!sessionId.isNullOrBlank()) {
            runtimeStates.firstOrNull { it.id == sessionId && it.source == "widget" }
        } else {
            runtimeStates
                .filter { it.source == "widget" }
                .maxByOrNull { it.startedAt }
        } ?: return null

        val endedAt = System.currentTimeMillis()
        finishRuntime(context, runtimeState, endedAt)
        val remainingRuntimes = runtimeStates.filterNot { it.id == runtimeState.id }
        WidgetStores.saveRuntimeStates(context, remainingRuntimes)
        WidgetStores.saveLastWidgetStopAt(context, endedAt)
        WidgetRefreshCoordinator.refreshTimerWidgets(context)
        WidgetRefreshCoordinator.refreshTodoPinWidgets(context)
        WidgetRefreshCoordinator.refreshSceneWidgets(context)
        syncFloatingWindow(context, remainingRuntimes)
        return runtimeState
    }

    private fun startRuntime(context: Context, current: List<WidgetRuntimeState>, next: WidgetRuntimeState) {
        val remaining = if (WidgetStores.loadAllowConcurrentTimers(context)) {
            current
        } else {
            current.forEach { finishRuntime(context, it, next.startedAt) }
            emptyList()
        }
        val states = remaining + next
        WidgetStores.saveRuntimeStates(context, states)
        WidgetStores.saveLastWidgetStopAt(context, null)
        syncFloatingWindow(context, states)
        WidgetRefreshCoordinator.refreshTimerWidgets(context)
        WidgetRefreshCoordinator.refreshTodoPinWidgets(context)
        WidgetRefreshCoordinator.refreshSceneWidgets(context)
        WidgetBridgePlugin.notifyDailyActionPending()
    }

    @Synchronized
    fun syncRuntimeStates(context: Context, incoming: List<WidgetRuntimeState>, removedIds: Set<String>) {
        removedIds.forEach { WidgetStores.markRuntimeFinished(context, it) }
        val finishedIds = WidgetStores.loadFinishedRuntimeIds(context).toSet()
        val runtimes = incoming.filterNot { it.id in finishedIds }
        val existing = WidgetStores.loadRuntimeStates(context).filterNot { it.id in finishedIds }
        val existingWidgets = existing.filter { it.source == "widget" }
        var states = if (runtimes.any { it.source == "app" } && runtimes.none { it.source == "widget" }) {
            runtimes + existingWidgets.filterNot { widget -> runtimes.any { it.id == widget.id } }
        } else {
            runtimes
        }

        if (!WidgetStores.loadAllowConcurrentTimers(context)) {
            val newAppRuntime = runtimes.filter { runtime ->
                runtime.source == "app" && existing.none { it.id == runtime.id }
            }.maxByOrNull { it.startedAt }
            if (newAppRuntime != null) {
                // A widget can have started while React was still hydrating.
                // Keep whichever start is newer and finish the other only once.
                val winner = (existingWidgets + newAppRuntime).maxByOrNull { it.startedAt }!!
                states.filterNot { it.id == winner.id }.forEach {
                    finishRuntime(context, it, maxOf(it.startedAt, winner.startedAt))
                }
                states = listOf(winner)
            }
        } else {
            val lastStopAt = WidgetStores.loadLastWidgetStopAt(context)
            if (states.any { it.source == "app" } && lastStopAt != null &&
                System.currentTimeMillis() - lastStopAt < 2000L) return
        }

        WidgetStores.saveRuntimeStates(context, states)
        syncFloatingWindow(context, states)
        if (states.size != incoming.size || states.any { state -> incoming.none { it.id == state.id } }) {
            WidgetBridgePlugin.notifyDailyActionPending()
        }
    }

    private fun syncFloatingWindow(context: Context, runtimeStates: List<WidgetRuntimeState>) {
        UnifiedServiceNotificationManager.reconcileNotificationState(context)
        val displayedRuntime = runtimeStates.maxByOrNull { it.startedAt }
        if (displayedRuntime == null) {
            FloatingWindowService.syncFocusStateIfRunning("", false, 0L, null)
            return
        }

        FloatingWindowService.syncFocusStateIfRunning(
            displayedRuntime.icon,
            true,
            displayedRuntime.startedAt,
            displayedRuntime.id
        )
    }

    private fun finishRuntime(context: Context, runtimeState: WidgetRuntimeState, endedAt: Long) {
        if (runtimeState.id in WidgetStores.loadFinishedRuntimeIds(context)) return
        WidgetStores.markRuntimeFinished(context, runtimeState.id)
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
