package com.mistycrown.lumostime

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * SharedPreferences-backed storage for widget config, runtime state, and pending imports.
 */
object WidgetStores {
    private const val PREFS_NAME = "lumostime_widget_timer"
    private const val KEY_CONFIG = "shared_slots_v1"
    private const val KEY_RUNTIME = "runtime_v1"
    private const val KEY_PENDING_ACTIONS = "pending_actions_v1"
    const val SLOT_COUNT = 4

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun loadConfig(context: Context): List<WidgetTimerSlotConfig> {
        val raw = prefs(context).getString(KEY_CONFIG, null)
        if (raw.isNullOrBlank()) {
            return defaultConfig()
        }

        return runCatching {
            val array = JSONArray(raw)
            val slots = mutableListOf<WidgetTimerSlotConfig>()
            for (index in 0 until array.length()) {
                val item = array.optJSONObject(index) ?: continue
                slots += WidgetTimerSlotConfig(
                    slotIndex = item.optInt("slotIndex", index),
                    activityId = item.optString("activityId").ifBlank { null },
                    categoryId = item.optString("categoryId").ifBlank { null },
                    icon = item.optString("icon").ifBlank { null },
                    label = item.optString("label").ifBlank { null },
                    color = item.optString("color").ifBlank { null }
                )
            }
            normalizeSlots(slots)
        }.getOrElse {
            defaultConfig()
        }
    }

    fun saveConfig(context: Context, slots: List<WidgetTimerSlotConfig>) {
        val normalized = normalizeSlots(slots)
        val array = JSONArray()
        normalized.forEach { slot ->
            array.put(JSONObject().apply {
                put("slotIndex", slot.slotIndex)
                put("activityId", slot.activityId ?: JSONObject.NULL)
                put("categoryId", slot.categoryId ?: JSONObject.NULL)
                put("icon", slot.icon ?: JSONObject.NULL)
                put("label", slot.label ?: JSONObject.NULL)
                put("color", slot.color ?: JSONObject.NULL)
            })
        }

        prefs(context).edit().putString(KEY_CONFIG, array.toString()).apply()
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
                icon = json.optString("icon", "•"),
                label = json.optString("label", ""),
                color = json.optString("color", "#E7E5E4"),
                startedAt = json.getLong("startedAt"),
                source = json.optString("source", "widget")
            )
        }.getOrNull()
    }

    fun saveRuntimeState(context: Context, runtimeState: WidgetTimerRuntimeState?) {
        val editor = prefs(context).edit()
        if (runtimeState == null) {
            editor.remove(KEY_RUNTIME).apply()
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
        }
        editor.putString(KEY_RUNTIME, json.toString()).apply()
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
                            icon = item.optString("icon", "•"),
                            label = item.optString("label", ""),
                            color = item.optString("color", "#E7E5E4"),
                            startedAt = item.getLong("startedAt"),
                            endedAt = item.getLong("endedAt"),
                            createdAt = item.getLong("createdAt")
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
            })
        }

        prefs(context).edit().putString(KEY_PENDING_ACTIONS, array.toString()).apply()
    }

    private fun normalizeSlots(slots: List<WidgetTimerSlotConfig>): List<WidgetTimerSlotConfig> {
        val slotMap = slots.associateBy { it.slotIndex }
        return (0 until SLOT_COUNT).map { index ->
            slotMap[index] ?: WidgetTimerSlotConfig(slotIndex = index)
        }
    }

    private fun defaultConfig(): List<WidgetTimerSlotConfig> {
        return (0 until SLOT_COUNT).map { WidgetTimerSlotConfig(slotIndex = it) }
    }
}
