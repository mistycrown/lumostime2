package com.mistycrown.lumostime

import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Capacitor bridge for widget config, runtime synchronization, and pending action import.
 */
@CapacitorPlugin(name = "WidgetBridge")
class WidgetBridgePlugin : Plugin() {
    @PluginMethod
    fun getConfig(call: PluginCall) {
        val result = JSObject()
        val payload = JSArray()
        WidgetStores.loadConfig(context).forEach { payload.put(slotToJs(it)) }
        result.put("slots", payload)
        call.resolve(result)
    }

    @PluginMethod
    fun saveConfig(call: PluginCall) {
        val slotsArray = call.getArray("slots") ?: JSArray()
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

        WidgetStores.saveConfig(context, slots)
        QuickLogWidget.refreshAllAsync(context)
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
                source = it.optString("source", "app")
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
        QuickLogWidget.refreshAllAsync(context)
        call.resolve()
    }

    @PluginMethod
    fun refreshWidget(call: PluginCall) {
        QuickLogWidget.refreshAllAsync(context)
        call.resolve()
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
        }
    }
}
