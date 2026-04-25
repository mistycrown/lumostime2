package com.mistycrown.lumostime

import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONArray
import org.json.JSONObject

/**
 * Capacitor bridge for widget templates, instance binding state, runtime synchronization, and pending action import.
 */
@CapacitorPlugin(name = "WidgetBridge")
class WidgetBridgePlugin : Plugin() {
    private fun parseNullableString(value: String?): String? {
        val trimmed = value?.trim() ?: return null
        return if (trimmed.isEmpty() || trimmed.equals("null", ignoreCase = true)) null else trimmed
    }

    @PluginMethod
    fun getTemplates(call: PluginCall) {
        val result = JSObject()
        val payload = JSArray()
        WidgetStores.loadTemplates(context).forEach { payload.put(templateToJs(it)) }
        result.put("templates", payload)
        call.resolve(result)
    }

    @PluginMethod
    fun saveTemplates(call: PluginCall) {
        val templatesArray = call.getArray("templates") ?: JSArray()
        val templates = mutableListOf<WidgetTemplate>()

        for (index in 0 until templatesArray.length()) {
            val item = templatesArray.optJSONObject(index) ?: continue
            val size = WidgetSizes.normalize(item.optString("size"))
            templates += WidgetTemplate(
                id = item.optString("id").ifBlank { "widget-template-$index" },
                name = item.optString("name").ifBlank { WidgetStores.DEFAULT_TEMPLATE_NAME },
                size = size,
                slots = parseSlots(item.optJSONArray("slots"), size),
                createdAt = item.optLong("createdAt", System.currentTimeMillis()),
                updatedAt = item.optLong("updatedAt", System.currentTimeMillis())
            )
        }

        WidgetStores.saveTemplates(context, templates)
        WidgetRefreshCoordinator.refreshAllAsync(context)
        call.resolve()
    }

    @PluginMethod
    fun getInstanceBindings(call: PluginCall) {
        val result = JSObject()
        val payload = JSArray()
        WidgetStores.loadInstanceBindings(context).forEach { payload.put(bindingToJs(it)) }
        result.put("bindings", payload)
        call.resolve(result)
    }

    @PluginMethod
    fun getPendingActions(call: PluginCall) {
        val result = JSObject()
        val actions = JSArray()
        WidgetStores.loadPendingActions(context).forEach { actions.put(actionToJs(it)) }
        result.put("actions", actions)
        call.resolve(result)
    }

    @PluginMethod
    fun clearPendingActions(call: PluginCall) {
        val idsArray = call.getArray("ids") ?: JSArray()
        val ids = mutableSetOf<String>()

        for (index in 0 until idsArray.length()) {
            val id = idsArray.optString(index)
            if (!id.isNullOrBlank()) {
                ids.add(id)
            }
        }

        WidgetStores.clearPendingActions(context, ids)
        call.resolve()
    }

    @PluginMethod
    fun getPendingDailyActions(call: PluginCall) {
        val result = JSObject()
        val actions = JSArray()
        WidgetStores.loadPendingDailyActions(context).forEach { actions.put(dailyActionToJs(it)) }
        result.put("actions", actions)
        call.resolve(result)
    }

    @PluginMethod
    fun clearPendingDailyActions(call: PluginCall) {
        val idsArray = call.getArray("ids") ?: JSArray()
        val ids = mutableSetOf<String>()

        for (index in 0 until idsArray.length()) {
            val id = idsArray.optString(index)
            if (!id.isNullOrBlank()) {
                ids.add(id)
            }
        }

        WidgetStores.clearPendingDailyActions(context, ids)
        call.resolve()
    }

    @PluginMethod
    fun getRuntimeState(call: PluginCall) {
        val result = JSObject()
        result.put("runtimeState", WidgetStores.loadRuntimeState(context)?.let(::runtimeToJs))
        call.resolve(result)
    }

    @PluginMethod
    fun syncRuntimeState(call: PluginCall) {
        val runtimeJson = call.getObject("runtimeState")
        val runtimeState = runtimeJson?.let {
            WidgetRuntimeState(
                id = it.getString("id") ?: "",
                widgetType = WidgetTypes.normalize(it.optString("widgetType")),
                activityId = it.getString("activityId") ?: "",
                categoryId = it.getString("categoryId") ?: "",
                icon = it.optString("icon", "\u2022"),
                label = it.optString("label", ""),
                color = it.optString("color", "#E7E5E4"),
                startedAt = it.getLong("startedAt"),
                source = it.optString("source", "app"),
                linkedTodoId = parseNullableString(it.optString("linkedTodoId")),
                scopeIds = it.optJSONArray("scopeIds").toStringList(),
                slotIndex = if (it.has("slotIndex")) it.optInt("slotIndex") else null,
                templateId = parseNullableString(it.optString("templateId")),
                appWidgetId = if (it.has("appWidgetId")) it.optInt("appWidgetId") else null
            )
        }

        val lastWidgetStopAt = WidgetStores.loadLastWidgetStopAt(context)
        if (runtimeState != null &&
            runtimeState.source == "app" &&
            lastWidgetStopAt != null &&
            System.currentTimeMillis() - lastWidgetStopAt < 2000L
        ) {
            call.resolve()
            return
        }

        WidgetStores.saveRuntimeState(context, runtimeState)
        WidgetRefreshCoordinator.refreshAllAsync(context)
        call.resolve()
    }

    @PluginMethod
    fun syncDailyWidgetData(call: PluginCall) {
        val payloadJson = call.getObject("payload")
        val payload = payloadJson?.let {
            WidgetDailySyncPayload(
                date = it.optString("date"),
                items = it.optJSONArray("items").toDailyMetaList(),
                progress = it.optJSONArray("progress").toDailyProgressList(),
                syncedAt = it.optLong("syncedAt", System.currentTimeMillis())
            )
        }

        WidgetStores.saveDailySyncPayload(context, payload)
        WidgetRefreshCoordinator.refreshAllAsync(context)
        call.resolve()
    }

    @PluginMethod
    fun syncDailyRuntimeWidgetData(call: PluginCall) {
        val payloadJson = call.getObject("payload")
        val payload = payloadJson?.let {
            WidgetDailyRuntimePayload(
                date = it.optString("date"),
                totalMinutes = it.optInt("totalMinutes", 0).coerceAtLeast(0),
                categoryView = it.optJSONObject("categoryView")?.toDailyRuntimeViewData()
                    ?: WidgetDailyRuntimeViewData(),
                activityView = it.optJSONObject("activityView")?.toDailyRuntimeViewData()
                    ?: WidgetDailyRuntimeViewData(),
                syncedAt = it.optLong("syncedAt", System.currentTimeMillis())
            )
        }

        WidgetStores.saveDailyRuntimePayload(context, payload)
        WidgetRefreshCoordinator.refreshAllAsync(context)
        call.resolve()
    }

    @PluginMethod
    fun refreshWidget(call: PluginCall) {
        val appWidgetId = call.getInt("appWidgetId") ?: -1
        val templateId = parseNullableString(call.getString("templateId"))
        if (appWidgetId > 0) {
            WidgetRefreshCoordinator.refreshWidget(context, appWidgetId)
        } else if (templateId != null) {
            WidgetStores.loadInstanceBindings(context)
                .filter { it.templateId == templateId }
                .forEach { binding ->
                    WidgetRefreshCoordinator.refreshWidget(context, binding.appWidgetId)
                }
        } else {
            WidgetRefreshCoordinator.refreshAllAsync(context)
        }
        call.resolve()
    }

    private fun parseSlots(
        slotsArray: JSONArray?,
        widgetSize: String
    ): List<WidgetSlotConfig> {
        if (slotsArray == null) {
            return (0 until WidgetSizes.slotCount(widgetSize)).map {
                WidgetSlotConfig(slotIndex = it, slotType = null)
            }
        }

        val slots = mutableListOf<WidgetSlotConfig>()
        for (index in 0 until slotsArray.length()) {
            val item = slotsArray.optJSONObject(index) ?: continue
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
        return slots
    }

    private fun templateToJs(template: WidgetTemplate): JSObject {
        return JSObject().apply {
            put("id", template.id)
            put("name", template.name)
            put("size", template.size)
            put("createdAt", template.createdAt)
            put("updatedAt", template.updatedAt)
            put("slots", JSArray().apply {
                template.slots.forEach { put(slotToJs(it)) }
            })
        }
    }

    private fun bindingToJs(binding: WidgetInstanceBinding): JSObject {
        return JSObject().apply {
            put("appWidgetId", binding.appWidgetId)
            put("templateId", binding.templateId)
            put("createdAt", binding.createdAt)
            put("updatedAt", binding.updatedAt)
        }
    }

    private fun slotToJs(slot: WidgetSlotConfig): JSObject {
        return JSObject().apply {
            put("slotIndex", slot.slotIndex)
            put("slotType", slot.slotType?.let(WidgetTypes::normalize))
            put("activityId", slot.activityId)
            put("categoryId", slot.categoryId)
            put("icon", slot.icon)
            put("customIcon", slot.customIcon)
            put("uiIconAssetPath", slot.uiIconAssetPath)
            put("uiIconFallbackAssetPath", slot.uiIconFallbackAssetPath)
            put("label", slot.label)
            put("color", slot.color)
            put("linkedTodoId", slot.linkedTodoId)
            put("scopeIds", slot.scopeIds.toJsonArray())
            put("checkTemplateId", slot.checkTemplateId)
            put("checkItemId", slot.checkItemId)
            put("checkManualMode", slot.checkManualMode)
            put("checkTargetCount", slot.checkTargetCount)
            put("shortcutAction", slot.shortcutAction)
        }
    }

    private fun actionToJs(action: WidgetPendingAction): JSObject {
        return JSObject().apply {
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
            put("linkedTodoId", action.linkedTodoId)
            put("scopeIds", action.scopeIds.toJsonArray())
        }
    }

    private fun dailyActionToJs(action: WidgetPendingDailyAction): JSObject {
        return JSObject().apply {
            put("id", action.id)
            put("widgetType", WidgetTypes.normalize(action.widgetType))
            put("date", action.date)
            put("checkTemplateId", action.checkTemplateId)
            put("checkItemId", action.checkItemId)
            put("actionMode", action.actionMode)
            put("createdAt", action.createdAt)
            put("appWidgetId", action.appWidgetId)
            put("slotIndex", action.slotIndex)
        }
    }

    private fun runtimeToJs(runtimeState: WidgetRuntimeState): JSObject {
        return JSObject().apply {
            put("id", runtimeState.id)
            put("widgetType", WidgetTypes.normalize(runtimeState.widgetType))
            put("activityId", runtimeState.activityId)
            put("categoryId", runtimeState.categoryId)
            put("icon", runtimeState.icon)
            put("label", runtimeState.label)
            put("color", runtimeState.color)
            put("startedAt", runtimeState.startedAt)
            put("source", runtimeState.source)
            put("linkedTodoId", runtimeState.linkedTodoId)
            put("scopeIds", runtimeState.scopeIds.toJsonArray())
            put("slotIndex", runtimeState.slotIndex)
            put("templateId", runtimeState.templateId)
            put("appWidgetId", runtimeState.appWidgetId)
        }
    }

    private fun JSONArray?.toStringList(): List<String> {
        if (this == null) {
            return emptyList()
        }

        val values = mutableListOf<String>()
        for (index in 0 until length()) {
            val value = parseNullableString(optString(index)) ?: continue
            values.add(value)
        }
        return values
    }

    private fun JSONArray?.toDailyMetaList(): List<WidgetDailyCheckMeta> {
        if (this == null) {
            return emptyList()
        }

        val values = mutableListOf<WidgetDailyCheckMeta>()
        for (index in 0 until length()) {
            val item = optJSONObject(index) ?: continue
            val checkTemplateId = parseNullableString(item.optString("checkTemplateId")) ?: continue
            val checkItemId = parseNullableString(item.optString("checkItemId")) ?: continue
            values.add(
                WidgetDailyCheckMeta(
                    checkTemplateId = checkTemplateId,
                    checkItemId = checkItemId,
                    content = item.optString("content"),
                    category = item.optString("category"),
                    manualMode = WidgetDailyModes.normalize(item.optString("manualMode")),
                    targetCount = item.optInt("targetCount", 1).coerceAtLeast(1),
                    icon = parseNullableString(item.optString("icon")),
                    uiIcon = parseNullableString(item.optString("uiIcon"))
                )
            )
        }
        return values
    }

    private fun JSONArray?.toDailyProgressList(): List<WidgetDailyProgress> {
        if (this == null) {
            return emptyList()
        }

        val values = mutableListOf<WidgetDailyProgress>()
        for (index in 0 until length()) {
            val item = optJSONObject(index) ?: continue
            val checkItemId = parseNullableString(item.optString("checkItemId")) ?: continue
            values.add(
                WidgetDailyProgress(
                    checkItemId = checkItemId,
                    date = item.optString("date"),
                    manualMode = WidgetDailyModes.normalize(item.optString("manualMode")),
                    currentCount = item.optInt("currentCount", 0).coerceAtLeast(0),
                    targetCount = item.optInt("targetCount", 1).coerceAtLeast(1),
                    isCompleted = item.optBoolean("isCompleted", false),
                    updatedAt = item.optLong("updatedAt", System.currentTimeMillis())
                )
            )
        }
        return values
    }

    private fun List<String>.toJsonArray(): JSArray {
        val array = JSArray()
        forEach { value ->
            if (value.isNotBlank()) {
                array.put(value)
            }
        }
        return array
    }

    private fun JSONArray?.toDailyRuntimeSegmentList(): List<WidgetDailyRuntimeSegment> {
        if (this == null) {
            return emptyList()
        }

        val values = mutableListOf<WidgetDailyRuntimeSegment>()
        for (index in 0 until length()) {
            val item = optJSONObject(index) ?: continue
            values.add(
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
        return values
    }

    private fun JSONArray?.toDailyRuntimeLegendList(): List<WidgetDailyRuntimeLegendItem> {
        if (this == null) {
            return emptyList()
        }

        val values = mutableListOf<WidgetDailyRuntimeLegendItem>()
        for (index in 0 until length()) {
            val item = optJSONObject(index) ?: continue
            val itemId = parseNullableString(item.optString("itemId"))
                ?: parseNullableString(item.optString("categoryId"))
                ?: continue
            val itemName = parseNullableString(item.optString("itemName"))
                ?: parseNullableString(item.optString("categoryName"))
                ?: continue
            val color = parseNullableString(item.optString("color")) ?: continue
            values.add(
                WidgetDailyRuntimeLegendItem(
                    itemId = itemId,
                    itemName = itemName,
                    color = color,
                    totalMinutes = item.optInt("totalMinutes", 0).coerceAtLeast(0)
                )
            )
        }
        return values
    }

    private fun JSONObject.toDailyRuntimeViewData(): WidgetDailyRuntimeViewData {
        return WidgetDailyRuntimeViewData(
            segments = optJSONArray("segments").toDailyRuntimeSegmentList(),
            legend = optJSONArray("legend").toDailyRuntimeLegendList()
        )
    }
}
