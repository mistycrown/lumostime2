package com.mistycrown.lumostime

import android.appwidget.AppWidgetManager
import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * SharedPreferences-backed storage for widget templates, instance bindings, runtime state, and pending imports.
 */
object WidgetStores {
    private const val PREFS_NAME = "lumostime_widget_timer"
    private const val KEY_TEMPLATES = "templates_v1"
    private const val KEY_INSTANCE_BINDINGS = "instance_bindings_v1"
    private const val KEY_RUNTIME = "runtime_v1"
    private const val KEY_PENDING_ACTIONS = "pending_actions_v1"
    private const val KEY_LAST_WIDGET_STOP_AT = "last_widget_stop_at_v1"
    private const val KEY_LEGACY_CONFIG = "shared_slots_v1"
    private const val KEY_LEGACY_AUTO_BIND_PENDING = "legacy_auto_bind_pending_v1"
    const val LEGACY_TEMPLATE_ID = "widget-template-legacy-default"
    const val DEFAULT_TEMPLATE_NAME = "我的小组件"

    private fun parseNullableString(value: String?): String? {
        val trimmed = value?.trim() ?: return null
        return if (trimmed.isEmpty() || trimmed.equals("null", ignoreCase = true)) null else trimmed
    }

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

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

    fun loadTemplatesBySize(context: Context, widgetSize: String): List<WidgetTemplate> {
        val normalizedSize = WidgetSizes.normalize(widgetSize)
        return loadTemplates(context).filter { it.size == normalizedSize }
    }

    fun saveTemplates(context: Context, templates: List<WidgetTemplate>) {
        val normalized = templates.map(::normalizeTemplate)
        val array = JSONArray()
        normalized.forEach { template ->
            array.put(JSONObject().apply {
                put("id", template.id)
                put("name", template.name)
                put("size", template.size)
                put("createdAt", template.createdAt)
                put("updatedAt", template.updatedAt)
                put("slots", slotsToJson(template.slots, template.size))
            })
        }

        prefs(context)
            .edit()
            .putString(KEY_TEMPLATES, array.toString())
            .commit()
    }

    fun loadTemplate(context: Context, templateId: String?): WidgetTemplate? {
        val normalizedTemplateId = parseNullableString(templateId)
        if (normalizedTemplateId == null) {
            return null
        }
        return loadTemplates(context).firstOrNull { it.id == normalizedTemplateId }
    }

    fun loadTemplateForSize(context: Context, templateId: String?, widgetSize: String): WidgetTemplate? {
        val normalizedSize = WidgetSizes.normalize(widgetSize)
        val templates = loadTemplatesBySize(context, normalizedSize)
        val normalizedTemplateId = parseNullableString(templateId)
        val boundTemplate = templates.firstOrNull { it.id == normalizedTemplateId }
        return boundTemplate ?: templates.firstOrNull()
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

    fun ensureBinding(context: Context, appWidgetId: Int, widgetSize: String): WidgetInstanceBinding? {
        if (appWidgetId <= 0) {
            return null
        }

        val templates = loadTemplatesBySize(context, widgetSize)
        if (templates.isEmpty()) {
            return null
        }

        val currentBinding = loadBinding(context, appWidgetId)
        val currentTemplateId = currentBinding?.templateId
        val hasValidTemplate = templates.any { it.id == currentTemplateId }
        if (currentBinding != null && hasValidTemplate) {
            return currentBinding
        }

        val defaultTemplate = templates.first()
        saveBinding(context, appWidgetId, defaultTemplate.id)
        return loadBinding(context, appWidgetId)
    }

    fun cycleBindingToNextTemplate(
        context: Context,
        appWidgetId: Int,
        widgetSize: String
    ): WidgetInstanceBinding? {
        if (appWidgetId <= 0) {
            return null
        }

        val templates = loadTemplatesBySize(context, widgetSize)
        if (templates.isEmpty()) {
            return null
        }

        val currentBinding = ensureBinding(context, appWidgetId, widgetSize)
        val currentIndex = templates.indexOfFirst { it.id == currentBinding?.templateId }
        val nextTemplate = if (currentIndex < 0) {
            templates.first()
        } else {
            templates[(currentIndex + 1) % templates.size]
        }

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

    fun maybeAutoBindLegacyWidgets(context: Context, appWidgetIds: IntArray, widgetSize: String) {
        if (WidgetSizes.normalize(widgetSize) != WidgetSizes.DEFAULT) {
            return
        }

        if (!prefs(context).getBoolean(KEY_LEGACY_AUTO_BIND_PENDING, false)) {
            return
        }

        val templates = loadTemplatesBySize(context, WidgetSizes.DEFAULT)
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

    fun ensureBindings(context: Context, appWidgetIds: IntArray, widgetSize: String) {
        appWidgetIds.forEach { appWidgetId ->
            ensureBinding(context, appWidgetId, widgetSize)
        }
    }

    fun loadRuntimeState(context: Context): WidgetTimerRuntimeState? {
        val raw = prefs(context).getString(KEY_RUNTIME, null)
        if (raw.isNullOrBlank()) {
            return null
        }

        return runCatching {
            val json = JSONObject(raw)
            WidgetTimerRuntimeState(
                id = json.getString("id"),
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
                appWidgetId = if (json.has("appWidgetId")) json.optInt("appWidgetId") else null
            )
        }.getOrNull()
    }

    fun saveRuntimeState(context: Context, runtimeState: WidgetTimerRuntimeState?) {
        val editor = prefs(context).edit()
        if (runtimeState == null) {
            editor.remove(KEY_RUNTIME).commit()
            return
        }

        val json = JSONObject().apply {
            put("id", runtimeState.id)
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
                            activityId = item.getString("activityId"),
                            categoryId = item.getString("categoryId"),
                            icon = item.optString("icon", "\u2022"),
                            label = item.optString("label", ""),
                            color = item.optString("color", "#E7E5E4"),
                            startedAt = item.getLong("startedAt"),
                            endedAt = item.getLong("endedAt"),
                            createdAt = item.getLong("createdAt"),
                            linkedTodoId = parseNullableString(item.optString("linkedTodoId")),
                            scopeIds = item.optJSONArray("scopeIds").toStringList()
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
            })
        }

        prefs(context).edit().putString(KEY_PENDING_ACTIONS, array.toString()).commit()
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
        slots: List<WidgetTimerSlotConfig>,
        widgetSize: String
    ): List<WidgetTimerSlotConfig> {
        val slotCount = WidgetSizes.slotCount(widgetSize)
        val slotMap = slots.associateBy { it.slotIndex }
        return (0 until slotCount).map { index ->
            slotMap[index] ?: WidgetTimerSlotConfig(slotIndex = index)
        }
    }

    private fun normalizeTemplate(template: WidgetTemplate): WidgetTemplate {
        val size = WidgetSizes.normalize(template.size)
        return WidgetTemplate(
            id = template.id,
            name = template.name.ifBlank { DEFAULT_TEMPLATE_NAME },
            size = size,
            slots = normalizeSlots(template.slots, size),
            createdAt = template.createdAt,
            updatedAt = template.updatedAt
        )
    }

    private fun parseSlots(array: JSONArray?, widgetSize: String): List<WidgetTimerSlotConfig> {
        if (array == null) {
            return normalizeSlots(emptyList(), widgetSize)
        }

        val slots = mutableListOf<WidgetTimerSlotConfig>()
        for (index in 0 until array.length()) {
            val item = array.optJSONObject(index) ?: continue
            slots += WidgetTimerSlotConfig(
                slotIndex = item.optInt("slotIndex", index),
                activityId = parseNullableString(item.optString("activityId")),
                categoryId = parseNullableString(item.optString("categoryId")),
                icon = parseNullableString(item.optString("icon")),
                customIcon = parseNullableString(item.optString("customIcon")),
                uiIconAssetPath = parseNullableString(item.optString("uiIconAssetPath")),
                uiIconFallbackAssetPath = parseNullableString(item.optString("uiIconFallbackAssetPath")),
                label = parseNullableString(item.optString("label")),
                color = parseNullableString(item.optString("color")),
                linkedTodoId = parseNullableString(item.optString("linkedTodoId")),
                scopeIds = item.optJSONArray("scopeIds").toStringList()
            )
        }
        return normalizeSlots(slots, widgetSize)
    }

    private fun slotsToJson(slots: List<WidgetTimerSlotConfig>, widgetSize: String): JSONArray {
        val array = JSONArray()
        normalizeSlots(slots, widgetSize).forEach { slot ->
            array.put(JSONObject().apply {
                put("slotIndex", slot.slotIndex)
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
            })
        }
        return array
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
            slots = legacySlots,
            createdAt = now,
            updatedAt = now
        )

        saveTemplates(context, listOf(migratedTemplate))
        prefs.edit().putBoolean(KEY_LEGACY_AUTO_BIND_PENDING, true).commit()
    }
}
