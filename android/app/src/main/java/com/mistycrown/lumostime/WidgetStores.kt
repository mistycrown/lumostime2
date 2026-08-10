package com.mistycrown.lumostime

import android.appwidget.AppWidgetManager
import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * SharedPreferences-backed storage for widget templates, instance bindings, runtime state,
 * pending imports, and the daily widget's mirrored review snapshot.
 * Updated 2026-07-22: Persists queued TODAY + PIN checkbox changes until the app writes them back to todo storage.
 * Updated 2026-05-21: Expanded TODAY + PIN payload storage to persist mirrored todo `maybeDates` and recurrence `skipDates`, keeping native rebuild visibility aligned with the app's today schedule.
 * Updated 2026-05-02: Added scene widget payload storage plus per-instance selected-tab persistence.
 * Updated 2026-05-05: Added scene-widget morning refresh date tracking so the first morning unlock only refreshes once per day.
 * Updated 2026-05-05: Expanded TODAY + PIN payload storage to retain mirrored source todos/categories for native-side list rebuilding.
 * Updated 2026-08-06: Persists scene time-slot UI icon asset paths when reloading native payloads.
 * Updated 2026-08-09: Persists principle-card widget payloads and per-instance shuffle state.
 * Updated 2026-08-09: Persists weekly daily-check ranges and per-item colors for the 4x4 statistics widget.
 */
object WidgetStores {
    private const val PREFS_NAME = "lumostime_widget_timer"
    private const val KEY_TEMPLATES = "templates_v1"
    private const val KEY_INSTANCE_BINDINGS = "instance_bindings_v1"
    private const val KEY_RUNTIME = "runtime_v1"
    private const val KEY_PENDING_ACTIONS = "pending_actions_v1"
    private const val KEY_PENDING_DAILY_ACTIONS = "pending_daily_actions_v1"
    private const val KEY_PENDING_TODO_PIN_ACTIONS = "pending_todo_pin_actions_v1"
    private const val KEY_DAILY_SYNC = "daily_sync_v1"
    private const val KEY_DAILY_RUNTIME_SYNC = "daily_runtime_sync_v1"
    private const val KEY_TODO_PIN_SYNC = "todo_pin_sync_v1"
    private const val KEY_TRACKING_CALENDAR_SYNC = "tracking_calendar_sync_v1"
    private const val KEY_PRINCIPLE_CARD_SYNC = "principle_card_sync_v1"
    private const val KEY_PRINCIPLE_CARD_STATES = "principle_card_states_v1"
    private const val KEY_SCENE_SYNC = "scene_sync_v1"
    private const val KEY_SCENE_SELECTIONS = "scene_selections_v1"
    private const val KEY_SCENE_MORNING_REFRESH_DATE = "scene_morning_refresh_date_v1"
    private const val KEY_SCENE_REFRESH_ANIMATION = "scene_refresh_animation_v1"
    private const val KEY_DAILY_RUNTIME_VIEW_MODES = "daily_runtime_view_modes_v1"
    private const val KEY_TAP_ANIMATION = "tap_animation_v1"
    private const val KEY_TODO_PIN_REFRESH_ANIMATION = "todo_pin_refresh_animation_v1"
    private const val KEY_LAST_WIDGET_STOP_AT = "last_widget_stop_at_v1"
    private const val KEY_LOG_TAIL_STATE = "log_tail_state_v1"
    private const val KEY_LEGACY_CONFIG = "shared_slots_v1"
    private const val KEY_LEGACY_AUTO_BIND_PENDING = "legacy_auto_bind_pending_v1"
    const val LEGACY_TEMPLATE_ID = "widget-template-legacy-default"
    const val DEFAULT_TEMPLATE_NAME = "我的小组件"

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private fun parseNullableString(value: String?): String? {
        val trimmed = value?.trim() ?: return null
        return if (trimmed.isEmpty() || trimmed.equals("null", ignoreCase = true)) null else trimmed
    }

    private fun normalizePositiveInt(value: Int?, fallback: Int = 1): Int {
        val safeValue = value ?: fallback
        return safeValue.coerceAtLeast(1)
    }

    fun loadTemplates(context: Context): List<WidgetTemplate> {
        migrateLegacyConfigIfNeeded(context)

        val raw = prefs(context).getString(KEY_TEMPLATES, null)
        if (raw.isNullOrBlank()) {
            return emptyList()
        }

        return runCatching {
            val array = JSONArray(raw)
            buildList {
                for (index in 0 until array.length()) {
                    val item = array.optJSONObject(index) ?: continue
                    val size = WidgetSizes.normalize(item.optString("size"))
                    add(
                        WidgetTemplate(
                            id = item.optString("id").ifBlank { "widget-template-$index" },
                            name = item.optString("name").ifBlank { DEFAULT_TEMPLATE_NAME },
                            size = size,
                            slots = parseSlots(item.optJSONArray("slots"), size),
                            templateType = WidgetTemplateTypes.normalize(item.optString("templateType")),
                            trackingConfig = item.optJSONObject("trackingConfig")?.toTrackingCalendarConfig(),
                            createdAt = item.optLong("createdAt", System.currentTimeMillis()),
                            updatedAt = item.optLong("updatedAt", System.currentTimeMillis())
                        )
                    )
                }
            }
        }.getOrElse {
            emptyList()
        }.map(::normalizeTemplate)
    }

    fun loadTemplatesBySize(
        context: Context,
        widgetSize: String,
        templateType: String = WidgetTemplateTypes.GRID
    ): List<WidgetTemplate> {
        val normalizedSize = WidgetSizes.normalize(widgetSize)
        val normalizedTemplateType = WidgetTemplateTypes.normalize(templateType)
        return loadTemplates(context).filter {
            it.size == normalizedSize && WidgetTemplateTypes.normalize(it.templateType) == normalizedTemplateType
        }
    }

    fun saveTemplates(context: Context, templates: List<WidgetTemplate>) {
        val normalized = templates.map(::normalizeTemplate)
        val array = JSONArray()
        normalized.forEach { template ->
            array.put(JSONObject().apply {
                put("id", template.id)
                put("name", template.name)
                put("size", template.size)
                put("templateType", WidgetTemplateTypes.normalize(template.templateType))
                put("createdAt", template.createdAt)
                put("updatedAt", template.updatedAt)
                put("slots", slotsToJson(template.slots, template.size))
                put("trackingConfig", template.trackingConfig?.toJson() ?: JSONObject.NULL)
            })
        }

        prefs(context).edit().putString(KEY_TEMPLATES, array.toString()).commit()
    }

    fun loadTemplate(context: Context, templateId: String?): WidgetTemplate? {
        val normalizedTemplateId = parseNullableString(templateId) ?: return null
        return loadTemplates(context).firstOrNull { it.id == normalizedTemplateId }
    }

    fun loadTemplateForSize(
        context: Context,
        templateId: String?,
        widgetSize: String,
        templateType: String = WidgetTemplateTypes.GRID
    ): WidgetTemplate? {
        val templates = loadTemplatesBySize(context, widgetSize, templateType)
        val normalizedTemplateId = parseNullableString(templateId) ?: return null
        return templates.firstOrNull { it.id == normalizedTemplateId }
    }

    fun loadInstanceBindings(context: Context): List<WidgetInstanceBinding> {
        val raw = prefs(context).getString(KEY_INSTANCE_BINDINGS, null)
        if (raw.isNullOrBlank()) {
            return emptyList()
        }

        val parsedBindings = runCatching {
            val array = JSONArray(raw)
            buildList {
                for (index in 0 until array.length()) {
                    val item = array.optJSONObject(index) ?: continue
                    add(
                        WidgetInstanceBinding(
                            appWidgetId = item.optInt("appWidgetId", -1),
                            templateId = parseNullableString(item.optString("templateId")),
                            createdAt = item.optLong("createdAt", System.currentTimeMillis()),
                            updatedAt = item.optLong("updatedAt", System.currentTimeMillis())
                        )
                    )
                }
            }.filter { it.appWidgetId > 0 }
        }.getOrElse {
            emptyList()
        }

        val prunedBindings = pruneStaleBindings(context, parsedBindings)
        if (prunedBindings.size != parsedBindings.size) {
            saveBindings(context, prunedBindings)
        }
        return prunedBindings
    }

    fun loadBinding(context: Context, appWidgetId: Int): WidgetInstanceBinding? {
        return loadInstanceBindings(context).firstOrNull { it.appWidgetId == appWidgetId }
    }

    fun ensureBinding(
        context: Context,
        appWidgetId: Int,
        widgetSize: String,
        templateType: String = WidgetTemplateTypes.GRID
    ): WidgetInstanceBinding? {
        if (appWidgetId <= 0) {
            return null
        }

        val normalizedSize = WidgetSizes.normalize(widgetSize)
        val normalizedTemplateType = WidgetTemplateTypes.normalize(templateType)
        val currentBinding = loadBinding(context, appWidgetId)
        if (currentBinding != null) {
            val boundTemplate = loadTemplateForSize(
                context,
                currentBinding.templateId,
                normalizedSize,
                normalizedTemplateType
            )
            if (boundTemplate != null) {
                return currentBinding
            }
        }

        val templates = loadTemplatesBySize(context, normalizedSize, normalizedTemplateType)
        if (templates.isEmpty()) {
            return null
        }

        val defaultTemplate = templates.first()
        saveBinding(context, appWidgetId, defaultTemplate.id)
        return loadBinding(context, appWidgetId)
    }

    fun cycleBindingToNextTemplate(
        context: Context,
        appWidgetId: Int,
        widgetSize: String,
        templateType: String = WidgetTemplateTypes.GRID
    ): WidgetInstanceBinding? {
        if (appWidgetId <= 0) {
            return null
        }

        val normalizedSize = WidgetSizes.normalize(widgetSize)
        val normalizedTemplateType = WidgetTemplateTypes.normalize(templateType)
        val templates = loadTemplatesBySize(context, normalizedSize, normalizedTemplateType)
        if (templates.isEmpty()) {
            return null
        }

        val currentBinding = ensureBinding(context, appWidgetId, normalizedSize, normalizedTemplateType)
        val currentIndex = templates.indexOfFirst { it.id == currentBinding?.templateId }
        val nextTemplate = if (currentIndex < 0) templates.first() else templates[(currentIndex + 1) % templates.size]

        saveBinding(context, appWidgetId, nextTemplate.id)
        return loadBinding(context, appWidgetId)
    }

    fun saveBinding(context: Context, appWidgetId: Int, templateId: String?) {
        if (appWidgetId <= 0) {
            return
        }

        val now = System.currentTimeMillis()
        val existing = loadBinding(context, appWidgetId)
        val nextBinding = WidgetInstanceBinding(
            appWidgetId = appWidgetId,
            templateId = parseNullableString(templateId),
            createdAt = existing?.createdAt ?: now,
            updatedAt = now
        )

        val bindings = loadInstanceBindings(context)
            .filterNot { it.appWidgetId == appWidgetId }
            .toMutableList()
        bindings.add(nextBinding)
        saveBindings(context, bindings)
    }

    fun removeBinding(context: Context, appWidgetId: Int) {
        if (appWidgetId <= 0) {
            return
        }

        val nextBindings = loadInstanceBindings(context).filterNot { it.appWidgetId == appWidgetId }
        saveBindings(context, nextBindings)
    }

    fun maybeAutoBindLegacyWidgets(
        context: Context,
        appWidgetIds: IntArray,
        widgetSize: String
    ) {
        if (WidgetSizes.normalize(widgetSize) != WidgetSizes.DEFAULT) {
            return
        }

        if (!prefs(context).getBoolean(KEY_LEGACY_AUTO_BIND_PENDING, false)) {
            return
        }

        val templates = loadTemplatesBySize(context, WidgetSizes.DEFAULT, WidgetTemplateTypes.GRID)
        val defaultTemplate = templates.firstOrNull { it.id == LEGACY_TEMPLATE_ID } ?: templates.firstOrNull()
        if (defaultTemplate == null) {
            prefs(context).edit().putBoolean(KEY_LEGACY_AUTO_BIND_PENDING, false).commit()
            return
        }

        appWidgetIds.forEach { appWidgetId ->
            val binding = loadBinding(context, appWidgetId)
            if (binding == null) {
                saveBinding(context, appWidgetId, defaultTemplate.id)
            }
        }

        prefs(context).edit().putBoolean(KEY_LEGACY_AUTO_BIND_PENDING, false).commit()
    }

    fun ensureBindings(
        context: Context,
        appWidgetIds: IntArray,
        widgetSize: String,
        templateType: String = WidgetTemplateTypes.GRID
    ) {
        appWidgetIds.forEach { appWidgetId ->
            ensureBinding(context, appWidgetId, widgetSize, templateType)
        }
    }

    fun loadRuntimeState(context: Context): WidgetRuntimeState? {
        val raw = prefs(context).getString(KEY_RUNTIME, null)
        if (raw.isNullOrBlank()) {
            return null
        }

        return runCatching {
            val json = JSONObject(raw)
            WidgetRuntimeState(
                id = json.getString("id"),
                widgetType = WidgetTypes.normalize(json.optString("widgetType")),
                activityId = json.getString("activityId"),
                categoryId = json.getString("categoryId"),
                icon = json.optString("icon", "\u2022"),
                label = json.optString("label", ""),
                color = json.optString("color", "#E7E5E4"),
                startedAt = json.getLong("startedAt"),
                source = json.optString("source", "widget"),
                linkedTodoId = parseNullableString(json.optString("linkedTodoId")),
                scopeIds = json.optJSONArray("scopeIds").toStringList(),
                slotIndex = if (json.has("slotIndex")) json.optInt("slotIndex") else null,
                templateId = parseNullableString(json.optString("templateId")),
                appWidgetId = if (json.has("appWidgetId")) json.optInt("appWidgetId") else null,
                sceneGroupId = parseNullableString(json.optString("sceneGroupId")),
                sceneSlotId = parseNullableString(json.optString("sceneSlotId")),
                sceneItemId = parseNullableString(json.optString("sceneItemId"))
            )
        }.getOrNull()
    }

    fun saveRuntimeState(context: Context, runtimeState: WidgetRuntimeState?) {
        val editor = prefs(context).edit()
        if (runtimeState == null) {
            editor.remove(KEY_RUNTIME).commit()
            return
        }

        val json = JSONObject().apply {
            put("id", runtimeState.id)
            put("widgetType", WidgetTypes.normalize(runtimeState.widgetType))
            put("activityId", runtimeState.activityId)
            put("categoryId", runtimeState.categoryId)
            put("icon", runtimeState.icon)
            put("label", runtimeState.label)
            put("color", runtimeState.color)
            put("startedAt", runtimeState.startedAt)
            put("source", runtimeState.source)
            if (!runtimeState.linkedTodoId.isNullOrBlank()) {
                put("linkedTodoId", runtimeState.linkedTodoId)
            }
            if (runtimeState.scopeIds.isNotEmpty()) {
                put("scopeIds", runtimeState.scopeIds.toJsonArray())
            }
            if (runtimeState.slotIndex != null) {
                put("slotIndex", runtimeState.slotIndex)
            }
            if (!runtimeState.templateId.isNullOrBlank()) {
                put("templateId", runtimeState.templateId)
            }
            if (runtimeState.appWidgetId != null) {
                put("appWidgetId", runtimeState.appWidgetId)
            }
            if (!runtimeState.sceneGroupId.isNullOrBlank()) {
                put("sceneGroupId", runtimeState.sceneGroupId)
            }
            if (!runtimeState.sceneSlotId.isNullOrBlank()) {
                put("sceneSlotId", runtimeState.sceneSlotId)
            }
            if (!runtimeState.sceneItemId.isNullOrBlank()) {
                put("sceneItemId", runtimeState.sceneItemId)
            }
        }
        editor.putString(KEY_RUNTIME, json.toString()).commit()
    }

    fun loadLastWidgetStopAt(context: Context): Long? {
        val raw = prefs(context).getLong(KEY_LAST_WIDGET_STOP_AT, -1L)
        return if (raw > 0L) raw else null
    }

    fun saveLastWidgetStopAt(context: Context, stoppedAt: Long?) {
        val editor = prefs(context).edit()
        if (stoppedAt == null) {
            editor.remove(KEY_LAST_WIDGET_STOP_AT).commit()
            return
        }
        editor.putLong(KEY_LAST_WIDGET_STOP_AT, stoppedAt).commit()
    }

    fun loadLogTailState(context: Context): WidgetLogTailState? {
        val raw = prefs(context).getString(KEY_LOG_TAIL_STATE, null)
        if (raw.isNullOrBlank()) {
            return null
        }

        return runCatching {
            val json = JSONObject(raw)
            WidgetLogTailState(
                latestLogEndTime = if (json.has("latestLogEndTime")) {
                    val latestLogEndTime = json.optLong("latestLogEndTime", -1L)
                    if (latestLogEndTime > 0L) latestLogEndTime else null
                } else {
                    null
                }
            )
        }.getOrNull()
    }

    fun saveLogTailState(context: Context, state: WidgetLogTailState?) {
        val editor = prefs(context).edit()
        if (state == null) {
            editor.remove(KEY_LOG_TAIL_STATE).commit()
            return
        }

        val json = JSONObject().apply {
            if (state.latestLogEndTime != null && state.latestLogEndTime > 0L) {
                put("latestLogEndTime", state.latestLogEndTime)
            } else {
                put("latestLogEndTime", JSONObject.NULL)
            }
        }
        editor.putString(KEY_LOG_TAIL_STATE, json.toString()).commit()
    }

    fun loadPendingActions(context: Context): List<WidgetPendingAction> {
        val raw = prefs(context).getString(KEY_PENDING_ACTIONS, null)
        if (raw.isNullOrBlank()) {
            return emptyList()
        }

        return runCatching {
            val array = JSONArray(raw)
            buildList {
                for (index in 0 until array.length()) {
                    val item = array.optJSONObject(index) ?: continue
                    add(
                        WidgetPendingAction(
                            id = item.getString("id"),
                            widgetType = WidgetTypes.normalize(item.optString("widgetType")),
                            activityId = item.getString("activityId"),
                            categoryId = item.getString("categoryId"),
                            icon = item.optString("icon", "\u2022"),
                            label = item.optString("label", ""),
                            color = item.optString("color", "#E7E5E4"),
                            startedAt = item.getLong("startedAt"),
                            endedAt = item.getLong("endedAt"),
                            createdAt = item.getLong("createdAt"),
                            linkedTodoId = parseNullableString(item.optString("linkedTodoId")),
                            scopeIds = item.optJSONArray("scopeIds").toStringList(),
                            note = parseNullableString(item.optString("note"))
                        )
                    )
                }
            }
        }.getOrElse {
            emptyList()
        }
    }

    fun appendPendingAction(context: Context, action: WidgetPendingAction) {
        val actions = loadPendingActions(context).toMutableList()
        actions.add(action)
        savePendingActions(context, actions)
    }

    fun clearPendingActions(context: Context, ids: Set<String>) {
        if (ids.isEmpty()) {
            return
        }

        val remaining = loadPendingActions(context).filterNot { ids.contains(it.id) }
        savePendingActions(context, remaining)
    }

    fun loadPendingDailyActions(context: Context): List<WidgetPendingDailyAction> {
        val raw = prefs(context).getString(KEY_PENDING_DAILY_ACTIONS, null)
        if (raw.isNullOrBlank()) {
            return emptyList()
        }

        return runCatching {
            val array = JSONArray(raw)
            buildList {
                for (index in 0 until array.length()) {
                    val item = array.optJSONObject(index) ?: continue
                    add(
                        WidgetPendingDailyAction(
                            id = item.getString("id"),
                            widgetType = WidgetTypes.normalize(item.optString("widgetType")),
                            date = item.optString("date"),
                            checkTemplateId = parseNullableString(item.optString("checkTemplateId")),
                            checkItemId = item.optString("checkItemId"),
                            actionMode = item.optString("actionMode", "complete_once"),
                            createdAt = item.getLong("createdAt"),
                            appWidgetId = if (item.has("appWidgetId")) item.optInt("appWidgetId") else null,
                            slotIndex = if (item.has("slotIndex")) item.optInt("slotIndex") else null
                        )
                    )
                }
            }
        }.getOrElse {
            emptyList()
        }
    }

    fun appendPendingDailyAction(context: Context, action: WidgetPendingDailyAction) {
        val actions = loadPendingDailyActions(context).toMutableList()
        actions.add(action)
        savePendingDailyActions(context, actions)
    }

    fun clearPendingDailyActions(context: Context, ids: Set<String>) {
        if (ids.isEmpty()) {
            return
        }

        val remaining = loadPendingDailyActions(context).filterNot { ids.contains(it.id) }
        savePendingDailyActions(context, remaining)
    }

    fun loadPendingTodoPinActions(context: Context): List<WidgetPendingTodoPinAction> {
        val raw = prefs(context).getString(KEY_PENDING_TODO_PIN_ACTIONS, null)
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            val array = JSONArray(raw)
            buildList {
                for (index in 0 until array.length()) {
                    val item = array.optJSONObject(index) ?: continue
                    add(WidgetPendingTodoPinAction(
                        id = item.getString("id"),
                        todoId = item.getString("todoId"),
                        isCompleted = item.optBoolean("isCompleted", false),
                        createdAt = item.getLong("createdAt"),
                        actionType = item.optString("actionType", "completion"),
                        title = parseNullableString(item.optString("title"))
                    ))
                }
            }
        }.getOrElse { emptyList() }
    }

    fun appendPendingTodoPinAction(context: Context, action: WidgetPendingTodoPinAction) {
        val actions = loadPendingTodoPinActions(context)
            .filterNot { it.todoId == action.todoId }
            .toMutableList()
        actions.add(action)
        savePendingTodoPinActions(context, actions)
    }

    fun clearPendingTodoPinActions(context: Context, ids: Set<String>) {
        if (ids.isEmpty()) return
        savePendingTodoPinActions(context, loadPendingTodoPinActions(context).filterNot { ids.contains(it.id) })
    }

    fun loadDailySyncPayload(context: Context): WidgetDailySyncPayload? {
        val raw = prefs(context).getString(KEY_DAILY_SYNC, null)
        if (raw.isNullOrBlank()) {
            return null
        }

        return runCatching {
            val json = JSONObject(raw)
            WidgetDailySyncPayload(
                date = json.optString("date"),
                weekStartDate = json.optString("weekStartDate").ifBlank { json.optString("date") },
                weekEndDate = json.optString("weekEndDate").ifBlank { json.optString("date") },
                items = json.optJSONArray("items").toDailyMetaList(),
                progress = json.optJSONArray("progress").toDailyProgressList(),
                syncedAt = json.optLong("syncedAt", System.currentTimeMillis())
            )
        }.getOrNull()
    }

    fun saveDailySyncPayload(context: Context, payload: WidgetDailySyncPayload?) {
        val editor = prefs(context).edit()
        if (payload == null) {
            editor.remove(KEY_DAILY_SYNC).commit()
            return
        }

        val json = JSONObject().apply {
            put("date", payload.date)
            put("weekStartDate", payload.weekStartDate)
            put("weekEndDate", payload.weekEndDate)
            put("items", payload.items.toDailyMetaJsonArray())
            put("progress", payload.progress.toDailyProgressJsonArray())
            put("syncedAt", payload.syncedAt)
        }
        editor.putString(KEY_DAILY_SYNC, json.toString()).commit()
    }

    fun loadDailyRuntimePayload(context: Context): WidgetDailyRuntimePayload? {
        val raw = prefs(context).getString(KEY_DAILY_RUNTIME_SYNC, null)
        if (raw.isNullOrBlank()) {
            return null
        }

        return runCatching {
            val json = JSONObject(raw)
            val legacySegments = json.optJSONArray("segments").toDailyRuntimeSegmentList()
            val legacyLegend = json.optJSONArray("legend").toDailyRuntimeLegendList()
            WidgetDailyRuntimePayload(
                date = json.optString("date"),
                totalMinutes = json.optInt("totalMinutes", 0).coerceAtLeast(0),
                categoryView = json.optJSONObject("categoryView")?.toDailyRuntimeViewData()
                    ?: WidgetDailyRuntimeViewData(
                        segments = legacySegments,
                        legend = legacyLegend
                    ),
                activityView = json.optJSONObject("activityView")?.toDailyRuntimeViewData()
                    ?: WidgetDailyRuntimeViewData(
                        segments = legacySegments,
                        legend = legacyLegend
                    ),
                syncedAt = json.optLong("syncedAt", System.currentTimeMillis())
            )
        }.getOrNull()
    }

    fun saveDailyRuntimePayload(context: Context, payload: WidgetDailyRuntimePayload?) {
        val editor = prefs(context).edit()
        if (payload == null) {
            editor.remove(KEY_DAILY_RUNTIME_SYNC).commit()
            return
        }

        val json = JSONObject().apply {
            put("date", payload.date)
            put("totalMinutes", payload.totalMinutes.coerceAtLeast(0))
            put("categoryView", payload.categoryView.toDailyRuntimeViewDataJson())
            put("activityView", payload.activityView.toDailyRuntimeViewDataJson())
            put("syncedAt", payload.syncedAt)
        }
        editor.putString(KEY_DAILY_RUNTIME_SYNC, json.toString()).commit()
    }

    fun loadTodoPinPayload(context: Context): WidgetTodoPinPayload? {
        val raw = prefs(context).getString(KEY_TODO_PIN_SYNC, null)
        if (raw.isNullOrBlank()) {
            return null
        }

        return runCatching {
            val json = JSONObject(raw)
            WidgetTodoPinPayload(
                date = json.optString("date"),
                items = json.optJSONArray("items").toTodoPinItemList(),
                syncedAt = json.optLong("syncedAt", System.currentTimeMillis()),
                sourceTodos = json.optJSONArray("sourceTodos").toTodoPinSourceTodoList(),
                sourceCategories = json.optJSONArray("sourceCategories").toTodoPinSourceCategoryList()
            )
        }.getOrNull()
    }

    fun saveTodoPinPayload(context: Context, payload: WidgetTodoPinPayload?) {
        val editor = prefs(context).edit()
        if (payload == null) {
            editor.remove(KEY_TODO_PIN_SYNC).commit()
            return
        }

        val json = JSONObject().apply {
            put("date", payload.date)
            put("items", payload.items.toTodoPinItemJsonArray())
            put("syncedAt", payload.syncedAt)
            put("sourceTodos", payload.sourceTodos.toTodoPinSourceTodoJsonArray())
            put("sourceCategories", payload.sourceCategories.toTodoPinSourceCategoryJsonArray())
        }
        editor.putString(KEY_TODO_PIN_SYNC, json.toString()).commit()
    }

    fun loadTrackingCalendarPayload(context: Context): WidgetTrackingCalendarPayload? {
        val raw = prefs(context).getString(KEY_TRACKING_CALENDAR_SYNC, null)
        if (raw.isNullOrBlank()) {
            return null
        }

        return runCatching {
            val json = JSONObject(raw)
            WidgetTrackingCalendarPayload(
                templates = json.optJSONArray("templates").toTrackingCalendarTemplatePayloadList(),
                syncedAt = json.optLong("syncedAt", System.currentTimeMillis())
            )
        }.getOrNull()
    }

    fun saveTrackingCalendarPayload(context: Context, payload: WidgetTrackingCalendarPayload?) {
        val editor = prefs(context).edit()
        if (payload == null) {
            editor.remove(KEY_TRACKING_CALENDAR_SYNC).commit()
            return
        }

        val json = JSONObject().apply {
            put("templates", payload.templates.toTrackingCalendarTemplatePayloadJsonArray())
            put("syncedAt", payload.syncedAt)
        }
        editor.putString(KEY_TRACKING_CALENDAR_SYNC, json.toString()).commit()
    }

    fun loadPrincipleCardPayload(context: Context): WidgetPrincipleCardPayload? {
        val raw = prefs(context).getString(KEY_PRINCIPLE_CARD_SYNC, null)
        if (raw.isNullOrBlank()) {
            return null
        }

        return runCatching {
            val json = JSONObject(raw)
            WidgetPrincipleCardPayload(
                principles = json.optJSONArray("principles").toPrincipleCardList(),
                syncedAt = json.optLong("syncedAt", System.currentTimeMillis())
            )
        }.getOrNull()
    }

    fun savePrincipleCardPayload(context: Context, payload: WidgetPrincipleCardPayload?) {
        val editor = prefs(context).edit()
        if (payload == null) {
            editor.remove(KEY_PRINCIPLE_CARD_SYNC).commit()
            return
        }

        val json = JSONObject().apply {
            put("principles", payload.principles.toPrincipleCardJsonArray())
            put("syncedAt", payload.syncedAt)
        }
        editor.putString(KEY_PRINCIPLE_CARD_SYNC, json.toString()).commit()
    }

    fun loadScenePayload(context: Context): WidgetScenePayload? {
        val raw = prefs(context).getString(KEY_SCENE_SYNC, null)
        if (raw.isNullOrBlank()) {
            return null
        }

        return runCatching {
            val json = JSONObject(raw)
            WidgetScenePayload(
                switchMode = WidgetSceneGroupSwitchModes.normalize(json.optString("switchMode")),
                activeGroupId = parseNullableString(json.optString("activeGroupId")),
                groups = json.optJSONArray("groups").toSceneGroupList(),
                syncedAt = json.optLong("syncedAt", System.currentTimeMillis())
            )
        }.getOrNull()
    }

    fun saveScenePayload(context: Context, payload: WidgetScenePayload?) {
        val editor = prefs(context).edit()
        if (payload == null) {
            editor.remove(KEY_SCENE_SYNC).commit()
            return
        }

        val json = JSONObject().apply {
            put("switchMode", WidgetSceneGroupSwitchModes.normalize(payload.switchMode))
            put("activeGroupId", payload.activeGroupId ?: JSONObject.NULL)
            put("groups", payload.groups.toSceneGroupJsonArray())
            put("syncedAt", payload.syncedAt)
        }
        editor.putString(KEY_SCENE_SYNC, json.toString()).commit()
    }

    fun loadSceneSelectionState(context: Context, appWidgetId: Int): WidgetSceneSelectionState? {
        if (appWidgetId <= 0) {
            return null
        }

        val raw = prefs(context).getString(KEY_SCENE_SELECTIONS, null)
        if (raw.isNullOrBlank()) {
            return null
        }

        return runCatching {
            val root = JSONObject(raw)
            val item = root.optJSONObject(appWidgetId.toString())
            if (item == null) {
                null
            } else {
                WidgetSceneSelectionState(
                    appWidgetId = appWidgetId,
                    selectedSlotId = parseNullableString(item.optString("selectedSlotId")),
                    lastAutoSlotId = parseNullableString(item.optString("lastAutoSlotId"))
                )
            }
        }.getOrNull()
    }

    fun saveSceneSelectionState(context: Context, state: WidgetSceneSelectionState) {
        if (state.appWidgetId <= 0) {
            return
        }

        val root = runCatching {
            JSONObject(prefs(context).getString(KEY_SCENE_SELECTIONS, null) ?: "{}")
        }.getOrElse {
            JSONObject()
        }

        root.put(state.appWidgetId.toString(), JSONObject().apply {
            put("selectedSlotId", state.selectedSlotId ?: JSONObject.NULL)
            put("lastAutoSlotId", state.lastAutoSlotId ?: JSONObject.NULL)
        })

        prefs(context).edit().putString(KEY_SCENE_SELECTIONS, root.toString()).commit()
    }

    fun loadPrincipleCardState(context: Context, appWidgetId: Int): WidgetPrincipleCardState? {
        if (appWidgetId <= 0) {
            return null
        }

        val raw = prefs(context).getString(KEY_PRINCIPLE_CARD_STATES, null)
        if (raw.isNullOrBlank()) {
            return null
        }

        return runCatching {
            val root = JSONObject(raw)
            val item = root.optJSONObject(appWidgetId.toString()) ?: return@runCatching null
            WidgetPrincipleCardState(
                appWidgetId = appWidgetId,
                currentPrincipleId = parseNullableString(item.optString("currentPrincipleId")),
                currentBackgroundKey = parseNullableString(item.optString("currentBackgroundKey")),
                principleOrder = item.optJSONArray("principleOrder").toStringList(),
                backgroundOrder = item.optJSONArray("backgroundOrder").toStringList(),
                principleCursor = item.optInt("principleCursor", 0).coerceAtLeast(0),
                backgroundCursor = item.optInt("backgroundCursor", 0).coerceAtLeast(0),
                isBackSideVisible = item.optBoolean("isBackSideVisible", false),
                updatedAt = item.optLong("updatedAt", System.currentTimeMillis())
            )
        }.getOrNull()
    }

    fun savePrincipleCardState(context: Context, state: WidgetPrincipleCardState) {
        if (state.appWidgetId <= 0) {
            return
        }

        val root = runCatching {
            JSONObject(prefs(context).getString(KEY_PRINCIPLE_CARD_STATES, null) ?: "{}")
        }.getOrElse {
            JSONObject()
        }

        root.put(state.appWidgetId.toString(), JSONObject().apply {
            put("currentPrincipleId", state.currentPrincipleId ?: JSONObject.NULL)
            put("currentBackgroundKey", state.currentBackgroundKey ?: JSONObject.NULL)
            put("principleOrder", state.principleOrder.toJsonArray())
            put("backgroundOrder", state.backgroundOrder.toJsonArray())
            put("principleCursor", state.principleCursor.coerceAtLeast(0))
            put("backgroundCursor", state.backgroundCursor.coerceAtLeast(0))
            put("isBackSideVisible", state.isBackSideVisible)
            put("updatedAt", state.updatedAt)
        })

        prefs(context).edit().putString(KEY_PRINCIPLE_CARD_STATES, root.toString()).commit()
    }

    fun removePrincipleCardStates(context: Context, appWidgetIds: IntArray) {
        if (appWidgetIds.isEmpty()) {
            return
        }

        val raw = prefs(context).getString(KEY_PRINCIPLE_CARD_STATES, null)
        if (raw.isNullOrBlank()) {
            return
        }

        val root = runCatching { JSONObject(raw) }.getOrElse { JSONObject() }
        appWidgetIds.forEach { appWidgetId ->
            if (appWidgetId > 0) {
                root.remove(appWidgetId.toString())
            }
        }
        prefs(context).edit().putString(KEY_PRINCIPLE_CARD_STATES, root.toString()).commit()
    }

    fun removeSceneSelectionStates(context: Context, appWidgetIds: IntArray) {
        if (appWidgetIds.isEmpty()) {
            return
        }

        val raw = prefs(context).getString(KEY_SCENE_SELECTIONS, null)
        if (raw.isNullOrBlank()) {
            return
        }

        val root = runCatching { JSONObject(raw) }.getOrElse { JSONObject() }
        appWidgetIds.forEach { appWidgetId ->
            if (appWidgetId > 0) {
                root.remove(appWidgetId.toString())
            }
        }
        prefs(context).edit().putString(KEY_SCENE_SELECTIONS, root.toString()).commit()
    }

    fun loadSceneMorningRefreshDate(context: Context): String? =
        parseNullableString(prefs(context).getString(KEY_SCENE_MORNING_REFRESH_DATE, null))

    fun saveSceneMorningRefreshDate(context: Context, dateKey: String?) {
        val editor = prefs(context).edit()
        val normalizedDateKey = parseNullableString(dateKey)
        if (normalizedDateKey == null) {
            editor.remove(KEY_SCENE_MORNING_REFRESH_DATE).commit()
            return
        }
        editor.putString(KEY_SCENE_MORNING_REFRESH_DATE, normalizedDateKey).commit()
    }

    fun loadSceneRefreshAnimationState(context: Context): WidgetSceneRefreshAnimationState? {
        val raw = prefs(context).getString(KEY_SCENE_REFRESH_ANIMATION, null)
        if (raw.isNullOrBlank()) {
            return null
        }

        val state = runCatching {
            val json = JSONObject(raw)
            WidgetSceneRefreshAnimationState(
                appWidgetId = json.optInt("appWidgetId", -1),
                animationMode = json.optString("animationMode", WidgetSceneRefreshAnimationModes.REFRESH),
                startedAt = json.optLong("startedAt", 0L),
                expiresAt = json.optLong("expiresAt", 0L)
            )
        }.getOrNull()

        if (
            state == null ||
            state.appWidgetId <= 0 ||
            state.expiresAt <= System.currentTimeMillis()
        ) {
            clearSceneRefreshAnimationState(context)
            return null
        }

        return state
    }

    fun saveSceneRefreshAnimationState(context: Context, state: WidgetSceneRefreshAnimationState?) {
        val editor = prefs(context).edit()
        if (state == null) {
            editor.remove(KEY_SCENE_REFRESH_ANIMATION).commit()
            return
        }

        val json = JSONObject().apply {
            put("appWidgetId", state.appWidgetId)
            put("animationMode", state.animationMode)
            put("startedAt", state.startedAt)
            put("expiresAt", state.expiresAt)
        }
        editor.putString(KEY_SCENE_REFRESH_ANIMATION, json.toString()).commit()
    }

    fun clearSceneRefreshAnimationState(context: Context) {
        prefs(context).edit().remove(KEY_SCENE_REFRESH_ANIMATION).commit()
    }

    fun loadDailyRuntimeViewMode(context: Context, appWidgetId: Int): String {
        if (appWidgetId <= 0) {
            return WidgetDailyRuntimeViewModes.DEFAULT
        }

        val raw = prefs(context).getString(KEY_DAILY_RUNTIME_VIEW_MODES, null)
        if (raw.isNullOrBlank()) {
            return WidgetDailyRuntimeViewModes.DEFAULT
        }

        return runCatching {
            val json = JSONObject(raw)
            WidgetDailyRuntimeViewModes.normalize(json.optString(appWidgetId.toString()))
        }.getOrElse {
            WidgetDailyRuntimeViewModes.DEFAULT
        }
    }

    fun saveDailyRuntimeViewMode(context: Context, appWidgetId: Int, mode: String) {
        if (appWidgetId <= 0) {
            return
        }

        val normalizedMode = WidgetDailyRuntimeViewModes.normalize(mode)
        val json = runCatching {
            JSONObject(prefs(context).getString(KEY_DAILY_RUNTIME_VIEW_MODES, null) ?: "{}")
        }.getOrElse {
            JSONObject()
        }
        json.put(appWidgetId.toString(), normalizedMode)
        prefs(context).edit().putString(KEY_DAILY_RUNTIME_VIEW_MODES, json.toString()).commit()
    }

    fun removeDailyRuntimeViewModes(context: Context, appWidgetIds: IntArray) {
        if (appWidgetIds.isEmpty()) {
            return
        }

        val raw = prefs(context).getString(KEY_DAILY_RUNTIME_VIEW_MODES, null)
        if (raw.isNullOrBlank()) {
            return
        }

        val json = runCatching { JSONObject(raw) }.getOrElse { JSONObject() }
        appWidgetIds.forEach { appWidgetId ->
            if (appWidgetId > 0) {
                json.remove(appWidgetId.toString())
            }
        }
        prefs(context).edit().putString(KEY_DAILY_RUNTIME_VIEW_MODES, json.toString()).commit()
    }

    fun loadTapAnimationState(context: Context): WidgetTapAnimationState? {
        val raw = prefs(context).getString(KEY_TAP_ANIMATION, null)
        if (raw.isNullOrBlank()) {
            return null
        }

        val state = runCatching {
            val json = JSONObject(raw)
            WidgetTapAnimationState(
                appWidgetId = json.optInt("appWidgetId", -1),
                widgetType = WidgetTypes.normalize(json.optString("widgetType")),
                slotIndex = json.optInt("slotIndex", -1),
                animationMode = json.optString("animationMode"),
                startedAt = json.optLong("startedAt", 0L),
                expiresAt = json.optLong("expiresAt", 0L)
            )
        }.getOrNull()

        if (
            state == null ||
            state.appWidgetId <= 0 ||
            state.slotIndex < 0 ||
            state.animationMode.isBlank() ||
            state.expiresAt <= System.currentTimeMillis()
        ) {
            clearTapAnimationState(context)
            return null
        }

        return state
    }

    fun saveTapAnimationState(context: Context, state: WidgetTapAnimationState?) {
        val editor = prefs(context).edit()
        if (state == null) {
            editor.remove(KEY_TAP_ANIMATION).commit()
            return
        }

        val json = JSONObject().apply {
            put("appWidgetId", state.appWidgetId)
            put("widgetType", WidgetTypes.normalize(state.widgetType))
            put("slotIndex", state.slotIndex)
            put("animationMode", state.animationMode)
            put("startedAt", state.startedAt)
            put("expiresAt", state.expiresAt)
        }
        editor.putString(KEY_TAP_ANIMATION, json.toString()).commit()
    }

    fun clearTapAnimationState(context: Context) {
        prefs(context).edit().remove(KEY_TAP_ANIMATION).commit()
    }

    fun loadTodoPinRefreshAnimationState(context: Context): WidgetTodoPinRefreshAnimationState? {
        val raw = prefs(context).getString(KEY_TODO_PIN_REFRESH_ANIMATION, null)
        if (raw.isNullOrBlank()) {
            return null
        }

        val state = runCatching {
            val json = JSONObject(raw)
            WidgetTodoPinRefreshAnimationState(
                appWidgetId = json.optInt("appWidgetId", -1),
                startedAt = json.optLong("startedAt", 0L),
                expiresAt = json.optLong("expiresAt", 0L)
            )
        }.getOrNull()

        if (
            state == null ||
            state.appWidgetId <= 0 ||
            state.expiresAt <= System.currentTimeMillis()
        ) {
            clearTodoPinRefreshAnimationState(context)
            return null
        }

        return state
    }

    fun saveTodoPinRefreshAnimationState(
        context: Context,
        state: WidgetTodoPinRefreshAnimationState?
    ) {
        val editor = prefs(context).edit()
        if (state == null) {
            editor.remove(KEY_TODO_PIN_REFRESH_ANIMATION).commit()
            return
        }

        val json = JSONObject().apply {
            put("appWidgetId", state.appWidgetId)
            put("startedAt", state.startedAt)
            put("expiresAt", state.expiresAt)
        }
        editor.putString(KEY_TODO_PIN_REFRESH_ANIMATION, json.toString()).commit()
    }

    fun clearTodoPinRefreshAnimationState(context: Context) {
        prefs(context).edit().remove(KEY_TODO_PIN_REFRESH_ANIMATION).commit()
    }

    fun upsertDailyProgress(context: Context, progress: WidgetDailyProgress) {
        val existing = loadDailySyncPayload(context)
        val baseItems = existing?.items ?: emptyList()
        val nextProgress = existing?.progress.orEmpty()
            .filterNot {
                it.checkItemId == progress.checkItemId && it.date == progress.date
            }
            .toMutableList()
            .apply { add(progress) }

        saveDailySyncPayload(
            context,
            WidgetDailySyncPayload(
                date = progress.date,
                weekStartDate = existing?.weekStartDate ?: progress.date,
                weekEndDate = existing?.weekEndDate ?: progress.date,
                items = baseItems,
                progress = nextProgress.sortedBy { it.checkItemId },
                syncedAt = System.currentTimeMillis()
            )
        )
    }

    private fun saveBindings(context: Context, bindings: List<WidgetInstanceBinding>) {
        val array = JSONArray()
        bindings
            .filter { it.appWidgetId > 0 }
            .sortedBy { it.appWidgetId }
            .forEach { binding ->
                array.put(JSONObject().apply {
                    put("appWidgetId", binding.appWidgetId)
                    put("templateId", binding.templateId ?: JSONObject.NULL)
                    put("createdAt", binding.createdAt)
                    put("updatedAt", binding.updatedAt)
                })
            }

        prefs(context).edit().putString(KEY_INSTANCE_BINDINGS, array.toString()).commit()
    }

    private fun savePendingActions(context: Context, actions: List<WidgetPendingAction>) {
        val array = JSONArray()
        actions.forEach { action ->
            array.put(JSONObject().apply {
                put("id", action.id)
                put("widgetType", WidgetTypes.normalize(action.widgetType))
                put("activityId", action.activityId)
                put("categoryId", action.categoryId)
                put("icon", action.icon)
                put("label", action.label)
                put("color", action.color)
                put("startedAt", action.startedAt)
                put("endedAt", action.endedAt)
                put("createdAt", action.createdAt)
                if (!action.linkedTodoId.isNullOrBlank()) {
                    put("linkedTodoId", action.linkedTodoId)
                }
                if (action.scopeIds.isNotEmpty()) {
                    put("scopeIds", action.scopeIds.toJsonArray())
                }
                if (!action.note.isNullOrBlank()) {
                    put("note", action.note)
                }
            })
        }

        prefs(context).edit().putString(KEY_PENDING_ACTIONS, array.toString()).commit()
    }

    private fun savePendingDailyActions(context: Context, actions: List<WidgetPendingDailyAction>) {
        val array = JSONArray()
        actions.forEach { action ->
            array.put(JSONObject().apply {
                put("id", action.id)
                put("widgetType", WidgetTypes.normalize(action.widgetType))
                put("date", action.date)
                put("checkTemplateId", action.checkTemplateId ?: JSONObject.NULL)
                put("checkItemId", action.checkItemId)
                put("actionMode", action.actionMode)
                put("createdAt", action.createdAt)
                if (action.appWidgetId != null) {
                    put("appWidgetId", action.appWidgetId)
                }
                if (action.slotIndex != null) {
                    put("slotIndex", action.slotIndex)
                }
            })
        }

        prefs(context).edit().putString(KEY_PENDING_DAILY_ACTIONS, array.toString()).commit()
    }

    private fun savePendingTodoPinActions(context: Context, actions: List<WidgetPendingTodoPinAction>) {
        val array = JSONArray()
        actions.forEach { action ->
            array.put(JSONObject().apply {
                put("id", action.id)
                put("todoId", action.todoId)
                put("isCompleted", action.isCompleted)
                put("createdAt", action.createdAt)
                put("actionType", action.actionType)
                put("title", action.title ?: JSONObject.NULL)
            })
        }
        prefs(context).edit().putString(KEY_PENDING_TODO_PIN_ACTIONS, array.toString()).commit()
    }

    private fun pruneStaleBindings(
        context: Context,
        bindings: List<WidgetInstanceBinding>
    ): List<WidgetInstanceBinding> {
        if (bindings.isEmpty()) {
            return bindings
        }

        val appWidgetManager = AppWidgetManager.getInstance(context)
        return bindings.filter { binding ->
            appWidgetManager.getAppWidgetInfo(binding.appWidgetId) != null
        }
    }

    private fun normalizeSlots(
        slots: List<WidgetSlotConfig>,
        widgetSize: String
    ): List<WidgetSlotConfig> {
        val slotCount = WidgetSizes.slotCount(widgetSize)
        val slotMap = slots.associateBy { it.slotIndex }
        return (0 until slotCount).map { index ->
            val slot = slotMap[index]
            if (slot == null) {
                WidgetSlotConfig(slotIndex = index, slotType = null)
            } else {
                slot.copy(
                    slotType = slot.slotType?.let(WidgetTypes::normalize),
                    checkManualMode = if (slot.checkManualMode == null) null else WidgetDailyModes.normalize(slot.checkManualMode),
                    checkTargetCount = slot.checkTargetCount?.coerceAtLeast(1),
                    shortcutAction = parseNullableString(slot.shortcutAction)
                )
            }
        }
    }

    private fun normalizeTemplate(template: WidgetTemplate): WidgetTemplate {
        val templateType = WidgetTemplateTypes.normalize(template.templateType)
        val size = if (templateType == WidgetTemplateTypes.TRACKING_CALENDAR) {
            WidgetSizes.SIZE_2X2
        } else {
            WidgetSizes.normalize(template.size)
        }
        return WidgetTemplate(
            id = template.id,
            name = template.name.ifBlank { DEFAULT_TEMPLATE_NAME },
            size = size,
            slots = normalizeSlots(template.slots, size),
            templateType = templateType,
            trackingConfig = normalizeTrackingCalendarConfig(template.trackingConfig),
            createdAt = template.createdAt,
            updatedAt = template.updatedAt
        )
    }

    private fun parseSlots(
        array: JSONArray?,
        widgetSize: String
    ): List<WidgetSlotConfig> {
        if (array == null) {
            return normalizeSlots(emptyList(), widgetSize)
        }

        val slots = mutableListOf<WidgetSlotConfig>()
        for (index in 0 until array.length()) {
            val item = array.optJSONObject(index) ?: continue
            slots += WidgetSlotConfig(
                slotIndex = item.optInt("slotIndex", index),
                slotType = parseNullableString(item.optString("slotType"))?.let(WidgetTypes::normalize),
                activityId = parseNullableString(item.optString("activityId")),
                categoryId = parseNullableString(item.optString("categoryId")),
                icon = parseNullableString(item.optString("icon")),
                customIcon = parseNullableString(item.optString("customIcon")),
                uiIconAssetPath = parseNullableString(item.optString("uiIconAssetPath")),
                uiIconFallbackAssetPath = parseNullableString(item.optString("uiIconFallbackAssetPath")),
                label = parseNullableString(item.optString("label")),
                color = parseNullableString(item.optString("color")),
                linkedTodoId = parseNullableString(item.optString("linkedTodoId")),
                scopeIds = item.optJSONArray("scopeIds").toStringList(),
                checkTemplateId = parseNullableString(item.optString("checkTemplateId")),
                checkItemId = parseNullableString(item.optString("checkItemId")),
                checkManualMode = parseNullableString(item.optString("checkManualMode")),
                checkTargetCount = if (item.has("checkTargetCount")) item.optInt("checkTargetCount") else null,
                shortcutAction = parseNullableString(item.optString("shortcutAction"))
            )
        }

        return normalizeSlots(slots, widgetSize)
    }

    private fun slotsToJson(
        slots: List<WidgetSlotConfig>,
        widgetSize: String
    ): JSONArray {
        val array = JSONArray()
        normalizeSlots(slots, widgetSize).forEach { slot ->
            array.put(JSONObject().apply {
                put("slotIndex", slot.slotIndex)
                put("slotType", slot.slotType?.let(WidgetTypes::normalize) ?: JSONObject.NULL)
                put("activityId", slot.activityId ?: JSONObject.NULL)
                put("categoryId", slot.categoryId ?: JSONObject.NULL)
                put("icon", slot.icon ?: JSONObject.NULL)
                put("customIcon", slot.customIcon ?: JSONObject.NULL)
                put("uiIconAssetPath", slot.uiIconAssetPath ?: JSONObject.NULL)
                put("uiIconFallbackAssetPath", slot.uiIconFallbackAssetPath ?: JSONObject.NULL)
                put("label", slot.label ?: JSONObject.NULL)
                put("color", slot.color ?: JSONObject.NULL)
                put("linkedTodoId", slot.linkedTodoId ?: JSONObject.NULL)
                put("scopeIds", slot.scopeIds.toJsonArray())
                put("checkTemplateId", slot.checkTemplateId ?: JSONObject.NULL)
                put("checkItemId", slot.checkItemId ?: JSONObject.NULL)
                put("checkManualMode", slot.checkManualMode ?: JSONObject.NULL)
                put("checkTargetCount", slot.checkTargetCount ?: JSONObject.NULL)
                put("shortcutAction", slot.shortcutAction ?: JSONObject.NULL)
            })
        }
        return array
    }

    private fun normalizeTrackingCalendarConfig(
        config: WidgetTrackingCalendarConfig?
    ): WidgetTrackingCalendarConfig? {
        if (config == null) {
            return null
        }

        val normalizedSourceType = parseNullableString(config.sourceType)
        return WidgetTrackingCalendarConfig(
            sourceType = when (normalizedSourceType) {
                "tag", "scope", "daily" -> normalizedSourceType
                else -> null
            },
            categoryId = parseNullableString(config.categoryId),
            activityId = parseNullableString(config.activityId),
            scopeId = parseNullableString(config.scopeId),
            checkTemplateId = parseNullableString(config.checkTemplateId),
            checkItemId = parseNullableString(config.checkItemId),
            icon = parseNullableString(config.icon),
            customIcon = parseNullableString(config.customIcon),
            uiIconAssetPath = parseNullableString(config.uiIconAssetPath),
            uiIconFallbackAssetPath = parseNullableString(config.uiIconFallbackAssetPath),
            label = parseNullableString(config.label),
            color = parseNullableString(config.color)
        )
    }

    private fun JSONObject.toTrackingCalendarConfig(): WidgetTrackingCalendarConfig {
        return normalizeTrackingCalendarConfig(
            WidgetTrackingCalendarConfig(
                sourceType = parseNullableString(optString("sourceType")),
                categoryId = parseNullableString(optString("categoryId")),
                activityId = parseNullableString(optString("activityId")),
                scopeId = parseNullableString(optString("scopeId")),
                checkTemplateId = parseNullableString(optString("checkTemplateId")),
                checkItemId = parseNullableString(optString("checkItemId")),
                icon = parseNullableString(optString("icon")),
                customIcon = parseNullableString(optString("customIcon")),
                uiIconAssetPath = parseNullableString(optString("uiIconAssetPath")),
                uiIconFallbackAssetPath = parseNullableString(optString("uiIconFallbackAssetPath")),
                label = parseNullableString(optString("label")),
                color = parseNullableString(optString("color"))
            )
        ) ?: WidgetTrackingCalendarConfig()
    }

    private fun WidgetTrackingCalendarConfig.toJson(): JSONObject {
        return JSONObject().apply {
            put("sourceType", sourceType ?: JSONObject.NULL)
            put("categoryId", categoryId ?: JSONObject.NULL)
            put("activityId", activityId ?: JSONObject.NULL)
            put("scopeId", scopeId ?: JSONObject.NULL)
            put("checkTemplateId", checkTemplateId ?: JSONObject.NULL)
            put("checkItemId", checkItemId ?: JSONObject.NULL)
            put("icon", icon ?: JSONObject.NULL)
            put("customIcon", customIcon ?: JSONObject.NULL)
            put("uiIconAssetPath", uiIconAssetPath ?: JSONObject.NULL)
            put("uiIconFallbackAssetPath", uiIconFallbackAssetPath ?: JSONObject.NULL)
            put("label", label ?: JSONObject.NULL)
            put("color", color ?: JSONObject.NULL)
        }
    }

    private fun JSONArray?.toStringList(): List<String> {
        if (this == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until length()) {
                val value = parseNullableString(optString(index)) ?: continue
                add(value)
            }
        }
    }

    private fun List<String>.toJsonArray(): JSONArray {
        val array = JSONArray()
        forEach { value ->
            if (value.isNotBlank()) {
                array.put(value)
            }
        }
        return array
    }

    private fun JSONArray?.toPrincipleCardList(): List<WidgetPrincipleCard> {
        if (this == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until length()) {
                val item = optJSONObject(index) ?: continue
                val id = parseNullableString(item.optString("id")) ?: continue
                val title = parseNullableString(item.optString("title")) ?: continue
                val frontText = parseNullableString(item.optString("frontText")) ?: continue
                add(
                    WidgetPrincipleCard(
                        id = id,
                        title = title,
                        frontText = frontText,
                        backText = parseNullableString(item.optString("backText")) ?: ""
                    )
                )
            }
        }
    }

    private fun List<WidgetPrincipleCard>.toPrincipleCardJsonArray(): JSONArray {
        val array = JSONArray()
        forEach { item ->
            if (item.id.isBlank() || item.title.isBlank() || item.frontText.isBlank()) {
                return@forEach
            }

            array.put(JSONObject().apply {
                put("id", item.id)
                put("title", item.title)
                put("frontText", item.frontText)
                put("backText", item.backText)
            })
        }
        return array
    }

    private fun JSONArray?.toDailyMetaList(): List<WidgetDailyCheckMeta> {
        if (this == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until length()) {
                val item = optJSONObject(index) ?: continue
                val checkTemplateId = parseNullableString(item.optString("checkTemplateId")) ?: continue
                val checkItemId = parseNullableString(item.optString("checkItemId")) ?: continue
                add(
                    WidgetDailyCheckMeta(
                        checkTemplateId = checkTemplateId,
                        checkItemId = checkItemId,
                        content = item.optString("content"),
                        category = item.optString("category"),
                        manualMode = WidgetDailyModes.normalize(item.optString("manualMode")),
                        targetCount = normalizePositiveInt(
                            if (item.has("targetCount")) item.optInt("targetCount") else 1
                        ),
                        color = parseNullableString(item.optString("color")),
                        icon = parseNullableString(item.optString("icon")),
                        uiIcon = parseNullableString(item.optString("uiIcon"))
                    )
                )
            }
        }
    }

    private fun JSONArray?.toDailyProgressList(): List<WidgetDailyProgress> {
        if (this == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until length()) {
                val item = optJSONObject(index) ?: continue
                val checkItemId = parseNullableString(item.optString("checkItemId")) ?: continue
                add(
                    WidgetDailyProgress(
                        checkItemId = checkItemId,
                        date = item.optString("date"),
                        manualMode = WidgetDailyModes.normalize(item.optString("manualMode")),
                        currentCount = item.optInt("currentCount", 0).coerceAtLeast(0),
                        targetCount = normalizePositiveInt(
                            if (item.has("targetCount")) item.optInt("targetCount") else 1
                        ),
                        isCompleted = item.optBoolean("isCompleted", false),
                        updatedAt = item.optLong("updatedAt", System.currentTimeMillis())
                    )
                )
            }
        }
    }

    private fun List<WidgetDailyCheckMeta>.toDailyMetaJsonArray(): JSONArray {
        val array = JSONArray()
        forEach { item ->
            array.put(JSONObject().apply {
                put("checkTemplateId", item.checkTemplateId)
                put("checkItemId", item.checkItemId)
                put("content", item.content)
                put("category", item.category)
                put("manualMode", WidgetDailyModes.normalize(item.manualMode))
                put("targetCount", normalizePositiveInt(item.targetCount))
                put("color", item.color ?: JSONObject.NULL)
                put("icon", item.icon ?: JSONObject.NULL)
                put("uiIcon", item.uiIcon ?: JSONObject.NULL)
            })
        }
        return array
    }

    private fun List<WidgetDailyProgress>.toDailyProgressJsonArray(): JSONArray {
        val array = JSONArray()
        forEach { item ->
            array.put(JSONObject().apply {
                put("checkItemId", item.checkItemId)
                put("date", item.date)
                put("manualMode", WidgetDailyModes.normalize(item.manualMode))
                put("currentCount", item.currentCount.coerceAtLeast(0))
                put("targetCount", normalizePositiveInt(item.targetCount))
                put("isCompleted", item.isCompleted)
                put("updatedAt", item.updatedAt)
            })
        }
        return array
    }

    private fun JSONArray?.toDailyRuntimeSegmentList(): List<WidgetDailyRuntimeSegment> {
        if (this == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until length()) {
                val item = optJSONObject(index) ?: continue
                add(
                    WidgetDailyRuntimeSegment(
                        index = item.optInt("index", index).coerceAtLeast(0),
                        itemId = parseNullableString(item.optString("itemId"))
                            ?: parseNullableString(item.optString("categoryId")),
                        itemName = parseNullableString(item.optString("itemName"))
                            ?: parseNullableString(item.optString("categoryName")),
                        color = parseNullableString(item.optString("color")),
                        minutes = item.optInt("minutes", 0).coerceAtLeast(0)
                    )
                )
            }
        }
    }

    private fun JSONArray?.toDailyRuntimeLegendList(): List<WidgetDailyRuntimeLegendItem> {
        if (this == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until length()) {
                val item = optJSONObject(index) ?: continue
                val itemId = parseNullableString(item.optString("itemId"))
                    ?: parseNullableString(item.optString("categoryId"))
                    ?: continue
                val itemName = parseNullableString(item.optString("itemName"))
                    ?: parseNullableString(item.optString("categoryName"))
                    ?: continue
                val color = parseNullableString(item.optString("color")) ?: continue
                add(
                    WidgetDailyRuntimeLegendItem(
                        itemId = itemId,
                        itemName = itemName,
                        color = color,
                        totalMinutes = item.optInt("totalMinutes", 0).coerceAtLeast(0)
                    )
                )
            }
        }
    }

    private fun JSONObject.toDailyRuntimeViewData(): WidgetDailyRuntimeViewData {
        return WidgetDailyRuntimeViewData(
            segments = optJSONArray("segments").toDailyRuntimeSegmentList(),
            legend = optJSONArray("legend").toDailyRuntimeLegendList()
        )
    }

    private fun List<WidgetDailyRuntimeSegment>.toDailyRuntimeSegmentJsonArray(): JSONArray {
        val array = JSONArray()
        forEach { item ->
            array.put(JSONObject().apply {
                put("index", item.index.coerceAtLeast(0))
                put("itemId", item.itemId ?: JSONObject.NULL)
                put("itemName", item.itemName ?: JSONObject.NULL)
                put("color", item.color ?: JSONObject.NULL)
                put("minutes", item.minutes.coerceAtLeast(0))
            })
        }
        return array
    }

    private fun List<WidgetDailyRuntimeLegendItem>.toDailyRuntimeLegendJsonArray(): JSONArray {
        val array = JSONArray()
        forEach { item ->
            array.put(JSONObject().apply {
                put("itemId", item.itemId)
                put("itemName", item.itemName)
                put("color", item.color)
                put("totalMinutes", item.totalMinutes.coerceAtLeast(0))
            })
        }
        return array
    }

    private fun WidgetDailyRuntimeViewData.toDailyRuntimeViewDataJson(): JSONObject {
        return JSONObject().apply {
            put("segments", segments.toDailyRuntimeSegmentJsonArray())
            put("legend", legend.toDailyRuntimeLegendJsonArray())
        }
    }

    private fun JSONArray?.toTodoPinItemList(): List<WidgetTodoPinItem> {
        if (this == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until length()) {
                val item = optJSONObject(index) ?: continue
                val todoId = parseNullableString(item.optString("todoId")) ?: continue
                val title = parseNullableString(item.optString("title")) ?: continue
                add(
                    WidgetTodoPinItem(
                        todoId = todoId,
                        title = title,
                        isCompleted = item.optBoolean("isCompleted", false),
                        badgeLabel = parseNullableString(item.optString("badgeLabel")) ?: "TODAY",
                        categoryId = parseNullableString(item.optString("categoryId")),
                        activityId = parseNullableString(item.optString("activityId")),
                        activityLabel = parseNullableString(item.optString("activityLabel")),
                        icon = parseNullableString(item.optString("icon")),
                        color = parseNullableString(item.optString("color")),
                        scopeIds = item.optJSONArray("scopeIds").toStringList()
                    )
                )
            }
        }
    }

    private fun List<WidgetTodoPinItem>.toTodoPinItemJsonArray(): JSONArray {
        val array = JSONArray()
        forEach { item ->
            array.put(JSONObject().apply {
                put("todoId", item.todoId)
                put("title", item.title)
                put("isCompleted", item.isCompleted)
                put("badgeLabel", item.badgeLabel)
                put("categoryId", item.categoryId ?: JSONObject.NULL)
                put("activityId", item.activityId ?: JSONObject.NULL)
                put("activityLabel", item.activityLabel ?: JSONObject.NULL)
                put("icon", item.icon ?: JSONObject.NULL)
                put("color", item.color ?: JSONObject.NULL)
                put("scopeIds", item.scopeIds.toJsonArray())
            })
        }
        return array
    }

    private fun JSONArray?.toTodoPinSourceTodoList(): List<WidgetTodoPinSourceTodo> {
        if (this == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until length()) {
                val item = optJSONObject(index) ?: continue
                val id = parseNullableString(item.optString("id")) ?: continue
                val title = parseNullableString(item.optString("title")) ?: continue
                add(
                    WidgetTodoPinSourceTodo(
                        id = id,
                        title = title,
                        kind = parseNullableString(item.optString("kind")) ?: "project",
                        isCompleted = item.optBoolean("isCompleted", false),
                        parentTodoId = parseNullableString(item.optString("parentTodoId")),
                        linkedCategoryId = parseNullableString(item.optString("linkedCategoryId")),
                        linkedActivityId = parseNullableString(item.optString("linkedActivityId")),
                        defaultScopeIds = item.optJSONArray("defaultScopeIds").toStringList(),
                        pin = item.optBoolean("pin", false),
                        scheduledDate = parseNullableString(item.optString("scheduledDate")),
                        deadlineDate = parseNullableString(item.optString("deadlineDate")),
                        maybeDates = item.optJSONArray("maybeDates").toStringList(),
                        recurrenceRule = item.optJSONObject("recurrenceRule")?.toTodoPinSourceRecurrenceRule()
                    )
                )
            }
        }
    }

    private fun JSONObject.toTodoPinSourceRecurrenceRule(): WidgetTodoPinSourceRecurrenceRule? {
        val frequency = parseNullableString(optString("frequency")) ?: return null
        val startDate = parseNullableString(optString("startDate")) ?: return null
        return WidgetTodoPinSourceRecurrenceRule(
            frequency = frequency,
            startDate = startDate,
            endDate = parseNullableString(optString("endDate")),
            interval = if (has("interval")) optInt("interval").takeIf { it > 0 } else null,
            weekdays = optJSONArray("weekdays").toIntList(),
            monthDays = optJSONArray("monthDays").toIntList(),
            skipDates = optJSONArray("skipDates").toStringList(),
            fallbackToMonthEnd = optBoolean("fallbackToMonthEnd", false)
        )
    }

    private fun JSONArray?.toTodoPinSourceCategoryList(): List<WidgetTodoPinSourceCategory> {
        if (this == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until length()) {
                val item = optJSONObject(index) ?: continue
                val id = parseNullableString(item.optString("id")) ?: continue
                add(
                    WidgetTodoPinSourceCategory(
                        id = id,
                        icon = parseNullableString(item.optString("icon")),
                        themeColor = parseNullableString(item.optString("themeColor")),
                        activities = item.optJSONArray("activities").toTodoPinSourceActivityList()
                    )
                )
            }
        }
    }

    private fun JSONArray?.toTodoPinSourceActivityList(): List<WidgetTodoPinSourceActivity> {
        if (this == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until length()) {
                val item = optJSONObject(index) ?: continue
                val id = parseNullableString(item.optString("id")) ?: continue
                val name = parseNullableString(item.optString("name")) ?: continue
                add(
                    WidgetTodoPinSourceActivity(
                        id = id,
                        name = name,
                        icon = parseNullableString(item.optString("icon")),
                        color = parseNullableString(item.optString("color"))
                    )
                )
            }
        }
    }

    private fun List<WidgetTodoPinSourceTodo>.toTodoPinSourceTodoJsonArray(): JSONArray {
        val array = JSONArray()
        forEach { item ->
            array.put(JSONObject().apply {
                put("id", item.id)
                put("title", item.title)
                put("kind", item.kind)
                put("isCompleted", item.isCompleted)
                put("parentTodoId", item.parentTodoId ?: JSONObject.NULL)
                put("linkedCategoryId", item.linkedCategoryId ?: JSONObject.NULL)
                put("linkedActivityId", item.linkedActivityId ?: JSONObject.NULL)
                put("defaultScopeIds", item.defaultScopeIds.toJsonArray())
                put("pin", item.pin)
                put("scheduledDate", item.scheduledDate ?: JSONObject.NULL)
                put("deadlineDate", item.deadlineDate ?: JSONObject.NULL)
                put("maybeDates", item.maybeDates.toJsonArray())
                put("recurrenceRule", item.recurrenceRule?.toTodoPinSourceRecurrenceRuleJson() ?: JSONObject.NULL)
            })
        }
        return array
    }

    private fun WidgetTodoPinSourceRecurrenceRule.toTodoPinSourceRecurrenceRuleJson(): JSONObject {
        return JSONObject().apply {
            put("frequency", frequency)
            put("startDate", startDate)
            put("endDate", endDate ?: JSONObject.NULL)
            put("interval", interval ?: JSONObject.NULL)
            put("weekdays", weekdays.toIntJsonArray())
            put("monthDays", monthDays.toIntJsonArray())
            put("skipDates", skipDates.toJsonArray())
            put("fallbackToMonthEnd", fallbackToMonthEnd)
        }
    }

    private fun List<WidgetTodoPinSourceCategory>.toTodoPinSourceCategoryJsonArray(): JSONArray {
        val array = JSONArray()
        forEach { item ->
            array.put(JSONObject().apply {
                put("id", item.id)
                put("icon", item.icon ?: JSONObject.NULL)
                put("themeColor", item.themeColor ?: JSONObject.NULL)
                put("activities", item.activities.toTodoPinSourceActivityJsonArray())
            })
        }
        return array
    }

    private fun List<WidgetTodoPinSourceActivity>.toTodoPinSourceActivityJsonArray(): JSONArray {
        val array = JSONArray()
        forEach { item ->
            array.put(JSONObject().apply {
                put("id", item.id)
                put("name", item.name)
                put("icon", item.icon ?: JSONObject.NULL)
                put("color", item.color ?: JSONObject.NULL)
            })
        }
        return array
    }

    private fun JSONArray?.toIntList(): List<Int> {
        if (this == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until length()) {
                val value = optInt(index, Int.MIN_VALUE)
                if (value != Int.MIN_VALUE && !contains(value)) {
                    add(value)
                }
            }
        }
    }

    private fun List<Int>.toIntJsonArray(): JSONArray {
        val array = JSONArray()
        forEach { value -> array.put(value) }
        return array
    }

    private fun JSONArray?.toTrackingCalendarTemplatePayloadList(): List<WidgetTrackingCalendarTemplatePayload> {
        if (this == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until length()) {
                val item = optJSONObject(index) ?: continue
                val templateId = parseNullableString(item.optString("templateId")) ?: continue
                add(
                    WidgetTrackingCalendarTemplatePayload(
                        templateId = templateId,
                        entries = item.optJSONArray("entries").toTrackingCalendarEntryList()
                    )
                )
            }
        }
    }

    private fun JSONArray?.toTrackingCalendarEntryList(): List<WidgetTrackingCalendarEntry> {
        if (this == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until length()) {
                val item = optJSONObject(index) ?: continue
                val date = parseNullableString(item.optString("date")) ?: continue
                add(
                    WidgetTrackingCalendarEntry(
                        date = date,
                        value = item.optInt("value", 0).coerceAtLeast(0)
                    )
                )
            }
        }
    }

    private fun List<WidgetTrackingCalendarTemplatePayload>.toTrackingCalendarTemplatePayloadJsonArray(): JSONArray {
        val array = JSONArray()
        forEach { templatePayload ->
            array.put(JSONObject().apply {
                put("templateId", templatePayload.templateId)
                put("entries", templatePayload.entries.toTrackingCalendarEntryJsonArray())
            })
        }
        return array
    }

    private fun List<WidgetTrackingCalendarEntry>.toTrackingCalendarEntryJsonArray(): JSONArray {
        val array = JSONArray()
        forEach { entry ->
            array.put(JSONObject().apply {
                put("date", entry.date)
                put("value", entry.value.coerceAtLeast(0))
            })
        }
        return array
    }

    private fun JSONArray?.toSceneGroupList(): List<WidgetSceneGroup> {
        if (this == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until length()) {
                val item = optJSONObject(index) ?: continue
                val id = parseNullableString(item.optString("id")) ?: continue
                add(
                    WidgetSceneGroup(
                        id = id,
                        name = parseNullableString(item.optString("name")) ?: id,
                        autoSwitch = item.optJSONObject("autoSwitch")?.toSceneAutoSwitchConfig()
                            ?: WidgetSceneGroupAutoSwitchConfig(),
                        timeSlots = item.optJSONArray("timeSlots").toSceneTimeSlotList()
                    )
                )
            }
        }
    }

    private fun JSONObject.toSceneAutoSwitchConfig(): WidgetSceneGroupAutoSwitchConfig {
        return WidgetSceneGroupAutoSwitchConfig(
            mode = WidgetSceneGroupAutoSwitchModes.normalize(optString("mode")),
            startDate = parseNullableString(optString("startDate")),
            endDate = parseNullableString(optString("endDate")),
            weekdays = optJSONArray("weekdays").toSceneWeekdayList()
        )
    }

    private fun JSONArray?.toSceneWeekdayList(): List<Int> {
        if (this == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until length()) {
                val day = optInt(index, -1)
                if (day in 0..6 && !contains(day)) {
                    add(day)
                }
            }
        }.sorted()
    }

    private fun JSONArray?.toSceneTimeSlotList(): List<WidgetSceneTimeSlot> {
        if (this == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until length()) {
                val item = optJSONObject(index) ?: continue
                val id = parseNullableString(item.optString("id")) ?: continue
                val name = parseNullableString(item.optString("name")) ?: id
                val startTime = parseNullableString(item.optString("startTime")) ?: continue
                val endTime = parseNullableString(item.optString("endTime")) ?: continue
                add(
                    WidgetSceneTimeSlot(
                        id = id,
                        name = name,
                        icon = parseNullableString(item.optString("icon")) ?: "\u2022",
                        uiIconAssetPath = parseNullableString(item.optString("uiIconAssetPath")),
                        uiIconFallbackAssetPath = parseNullableString(item.optString("uiIconFallbackAssetPath")),
                        startTime = startTime,
                        endTime = endTime,
                        disableAutoSwitch = item.optBoolean("disableAutoSwitch", false),
                        items = item.optJSONArray("items").toSceneItemList()
                    )
                )
            }
        }
    }

    private fun JSONArray?.toSceneItemList(): List<WidgetSceneItem> {
        if (this == null) {
            return emptyList()
        }

        return buildList {
            for (index in 0 until length()) {
                val item = optJSONObject(index) ?: continue
                val id = parseNullableString(item.optString("id")) ?: continue
                val title = parseNullableString(item.optString("title")) ?: continue
                add(
                    WidgetSceneItem(
                        id = id,
                        itemType = WidgetSceneItemTypes.normalize(item.optString("itemType")),
                        title = title,
                        icon = parseNullableString(item.optString("icon")) ?: "\u2022",
                        uiIconAssetPath = parseNullableString(item.optString("uiIconAssetPath")),
                        uiIconFallbackAssetPath = parseNullableString(item.optString("uiIconFallbackAssetPath")),
                        color = parseNullableString(item.optString("color")) ?: "#E7E5E4",
                        activityId = parseNullableString(item.optString("activityId")),
                        categoryId = parseNullableString(item.optString("categoryId")),
                        linkedTodoId = parseNullableString(item.optString("linkedTodoId")),
                        scopeIds = item.optJSONArray("scopeIds").toStringList(),
                        checkTemplateId = parseNullableString(item.optString("checkTemplateId")),
                        checkItemId = parseNullableString(item.optString("checkItemId")),
                        checkManualMode = parseNullableString(item.optString("checkManualMode"))
                            ?.let(WidgetDailyModes::normalize),
                        checkTargetCount = if (item.has("checkTargetCount")) {
                            normalizePositiveInt(item.optInt("checkTargetCount"), 1)
                        } else {
                            null
                        },
                        launchApp = item.optBoolean("launchApp", false),
                        appPackageName = parseNullableString(item.optString("appPackageName")),
                        appName = parseNullableString(item.optString("appName"))
                    )
                )
            }
        }
    }

    private fun List<WidgetSceneGroup>.toSceneGroupJsonArray(): JSONArray {
        val array = JSONArray()
        forEach { group ->
            array.put(JSONObject().apply {
                put("id", group.id)
                put("name", group.name)
                put("autoSwitch", group.autoSwitch.toSceneAutoSwitchJson())
                put("timeSlots", group.timeSlots.toSceneTimeSlotJsonArray())
            })
        }
        return array
    }

    private fun WidgetSceneGroupAutoSwitchConfig.toSceneAutoSwitchJson(): JSONObject {
        return JSONObject().apply {
            put("mode", WidgetSceneGroupAutoSwitchModes.normalize(mode))
            put("startDate", startDate ?: JSONObject.NULL)
            put("endDate", endDate ?: JSONObject.NULL)
            put("weekdays", weekdays.toSceneWeekdayJsonArray())
        }
    }

    private fun List<Int>.toSceneWeekdayJsonArray(): JSONArray {
        val array = JSONArray()
        sorted().forEach { day ->
            if (day in 0..6) {
                array.put(day)
            }
        }
        return array
    }

    private fun List<WidgetSceneTimeSlot>.toSceneTimeSlotJsonArray(): JSONArray {
        val array = JSONArray()
        forEach { slot ->
            array.put(JSONObject().apply {
                put("id", slot.id)
                put("name", slot.name)
                put("icon", slot.icon)
                put("uiIconAssetPath", slot.uiIconAssetPath ?: JSONObject.NULL)
                put("uiIconFallbackAssetPath", slot.uiIconFallbackAssetPath ?: JSONObject.NULL)
                put("startTime", slot.startTime)
                put("endTime", slot.endTime)
                put("disableAutoSwitch", slot.disableAutoSwitch)
                put("items", slot.items.toSceneItemJsonArray())
            })
        }
        return array
    }

    private fun List<WidgetSceneItem>.toSceneItemJsonArray(): JSONArray {
        val array = JSONArray()
        forEach { item ->
            array.put(JSONObject().apply {
                put("id", item.id)
                put("itemType", WidgetSceneItemTypes.normalize(item.itemType))
                put("title", item.title)
                put("icon", item.icon)
                put("uiIconAssetPath", item.uiIconAssetPath ?: JSONObject.NULL)
                put("uiIconFallbackAssetPath", item.uiIconFallbackAssetPath ?: JSONObject.NULL)
                put("color", item.color)
                put("activityId", item.activityId ?: JSONObject.NULL)
                put("categoryId", item.categoryId ?: JSONObject.NULL)
                put("linkedTodoId", item.linkedTodoId ?: JSONObject.NULL)
                put("scopeIds", item.scopeIds.toJsonArray())
                put("checkTemplateId", item.checkTemplateId ?: JSONObject.NULL)
                put("checkItemId", item.checkItemId ?: JSONObject.NULL)
                put("checkManualMode", item.checkManualMode ?: JSONObject.NULL)
                put("checkTargetCount", item.checkTargetCount ?: JSONObject.NULL)
                put("launchApp", item.launchApp)
                put("appPackageName", item.appPackageName ?: JSONObject.NULL)
                put("appName", item.appName ?: JSONObject.NULL)
            })
        }
        return array
    }

    private fun migrateLegacyConfigIfNeeded(context: Context) {
        val prefs = prefs(context)
        val currentTemplates = prefs.getString(KEY_TEMPLATES, null)
        if (!currentTemplates.isNullOrBlank()) {
            return
        }

        val legacyRaw = prefs.getString(KEY_LEGACY_CONFIG, null)
        if (legacyRaw.isNullOrBlank()) {
            return
        }

        val legacySlots = runCatching {
            parseSlots(JSONArray(legacyRaw), WidgetSizes.DEFAULT)
        }.getOrElse {
            normalizeSlots(emptyList(), WidgetSizes.DEFAULT)
        }

        if (!legacySlots.any { it.isConfigured() }) {
            return
        }

        val now = System.currentTimeMillis()
        val migratedTemplate = WidgetTemplate(
            id = LEGACY_TEMPLATE_ID,
            name = DEFAULT_TEMPLATE_NAME,
            size = WidgetSizes.DEFAULT,
            slots = legacySlots.map {
                it.copy(slotType = if (!it.activityId.isNullOrBlank() && !it.categoryId.isNullOrBlank()) WidgetTypes.TIMER else null)
            },
            templateType = WidgetTemplateTypes.GRID,
            trackingConfig = null,
            createdAt = now,
            updatedAt = now
        )

        saveTemplates(context, listOf(migratedTemplate))
        prefs.edit().putBoolean(KEY_LEGACY_AUTO_BIND_PENDING, true).commit()
    }
}
