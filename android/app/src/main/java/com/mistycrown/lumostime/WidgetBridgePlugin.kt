package com.mistycrown.lumostime

import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONArray

/**
 * Capacitor bridge for widget templates, instance bindings, runtime synchronization, and pending action import.
 */
@CapacitorPlugin(name = "WidgetBridge")
class WidgetBridgePlugin : Plugin() {
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
    fun bindWidgetInstance(call: PluginCall) {
        val appWidgetId = call.getInt("appWidgetId") ?: -1
        val templateId = call.getString("templateId")

        if (appWidgetId <= 0) {
            call.reject("Invalid appWidgetId")
            return
        }

        WidgetStores.saveBinding(context, appWidgetId, templateId)
        WidgetRefreshCoordinator.refreshWidget(context, appWidgetId)
        call.resolve()
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
    fun getRuntimeState(call: PluginCall) {
        val result = JSObject()
        result.put("runtimeState", WidgetStores.loadRuntimeState(context)?.let(::runtimeToJs))
        call.resolve(result)
    }

    @PluginMethod
    fun syncRuntimeState(call: PluginCall) {
        val runtimeJson = call.getObject("runtimeState")
        val runtimeState = runtimeJson?.let {
            WidgetTimerRuntimeState(
                id = it.getString("id") ?: "",
                activityId = it.getString("activityId") ?: "",
                categoryId = it.getString("categoryId") ?: "",
                icon = it.optString("icon", "\u2022"),
                label = it.optString("label", ""),
                color = it.optString("color", "#E7E5E4"),
                startedAt = it.getLong("startedAt"),
                source = it.optString("source", "app"),
                slotIndex = if (it.has("slotIndex")) it.optInt("slotIndex") else null,
                templateId = it.optString("templateId").ifBlank { null },
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
    fun refreshWidget(call: PluginCall) {
        val appWidgetId = call.getInt("appWidgetId") ?: -1
        if (appWidgetId > 0) {
            WidgetRefreshCoordinator.refreshWidget(context, appWidgetId)
        } else {
            WidgetRefreshCoordinator.refreshAllAsync(context)
        }
        call.resolve()
    }

    private fun parseSlots(slotsArray: JSONArray?, widgetSize: String): List<WidgetTimerSlotConfig> {
        if (slotsArray == null) {
            return (0 until WidgetSizes.slotCount(widgetSize)).map { WidgetTimerSlotConfig(slotIndex = it) }
        }

        val slots = mutableListOf<WidgetTimerSlotConfig>()
        for (index in 0 until slotsArray.length()) {
            val item = slotsArray.optJSONObject(index) ?: continue
            slots += WidgetTimerSlotConfig(
                slotIndex = item.optInt("slotIndex", index),
                activityId = item.optString("activityId").ifBlank { null },
                categoryId = item.optString("categoryId").ifBlank { null },
                icon = item.optString("icon").ifBlank { null },
                uiIconAssetPath = item.optString("uiIconAssetPath").ifBlank { null },
                uiIconFallbackAssetPath = item.optString("uiIconFallbackAssetPath").ifBlank { null },
                label = item.optString("label").ifBlank { null },
                color = item.optString("color").ifBlank { null }
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

    private fun slotToJs(slot: WidgetTimerSlotConfig): JSObject {
        return JSObject().apply {
            put("slotIndex", slot.slotIndex)
            put("activityId", slot.activityId)
            put("categoryId", slot.categoryId)
            put("icon", slot.icon)
            put("uiIconAssetPath", slot.uiIconAssetPath)
            put("uiIconFallbackAssetPath", slot.uiIconFallbackAssetPath)
            put("label", slot.label)
            put("color", slot.color)
        }
    }

    private fun actionToJs(action: WidgetPendingAction): JSObject {
        return JSObject().apply {
            put("id", action.id)
            put("activityId", action.activityId)
            put("categoryId", action.categoryId)
            put("icon", action.icon)
            put("label", action.label)
            put("color", action.color)
            put("startedAt", action.startedAt)
            put("endedAt", action.endedAt)
            put("createdAt", action.createdAt)
        }
    }

    private fun runtimeToJs(runtimeState: WidgetTimerRuntimeState): JSObject {
        return JSObject().apply {
            put("id", runtimeState.id)
            put("activityId", runtimeState.activityId)
            put("categoryId", runtimeState.categoryId)
            put("icon", runtimeState.icon)
            put("label", runtimeState.label)
            put("color", runtimeState.color)
            put("startedAt", runtimeState.startedAt)
            put("source", runtimeState.source)
            put("slotIndex", runtimeState.slotIndex)
            put("templateId", runtimeState.templateId)
            put("appWidgetId", runtimeState.appWidgetId)
        }
    }
}
