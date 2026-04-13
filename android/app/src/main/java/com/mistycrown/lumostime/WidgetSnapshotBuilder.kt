package com.mistycrown.lumostime

/**
 * Builds the lightweight widget UI snapshot from template bindings and native runtime state.
 */
object WidgetSnapshotBuilder {
    fun build(context: android.content.Context, appWidgetId: Int, widgetSize: String): WidgetSnapshot {
        val normalizedSize = WidgetSizes.normalize(widgetSize)
        val runtimeState = WidgetStores.loadRuntimeState(context)
        val binding = WidgetStores.ensureBinding(context, appWidgetId, normalizedSize)
        val template = WidgetStores.loadTemplateForSize(context, binding?.templateId, normalizedSize)

        val slots = (template?.slots ?: emptySlots(normalizedSize)).map { slot ->
            val matchesRuntime = matchesRuntime(template, slot, runtimeState)

            WidgetSnapshotSlot(
                slotIndex = slot.slotIndex,
                activityId = slot.activityId,
                categoryId = slot.categoryId,
                icon = slot.icon?.ifBlank { null } ?: "\u2022",
                uiIconAssetPath = slot.uiIconAssetPath,
                uiIconFallbackAssetPath = slot.uiIconFallbackAssetPath,
                label = slot.label?.ifBlank { null } ?: "Slot ${slot.slotIndex + 1}",
                color = slot.color?.ifBlank { null } ?: "#E7E5E4",
                isActive = matchesRuntime
            )
        }

        return WidgetSnapshot(
            appWidgetId = appWidgetId,
            widgetSize = normalizedSize,
            templateId = template?.id,
            templateName = template?.name ?: "暂无模板",
            slots = slots
        )
    }

    private fun matchesRuntime(
        template: WidgetTemplate?,
        slot: WidgetTimerSlotConfig,
        runtimeState: WidgetTimerRuntimeState?
    ): Boolean {
        if (!slot.isConfigured() || runtimeState == null) {
            return false
        }

        return if (runtimeState.source == "widget" && template != null) {
            runtimeState.templateId == template.id &&
                runtimeState.slotIndex == slot.slotIndex
        } else {
            runtimeState.activityId == slot.activityId &&
                runtimeState.categoryId == slot.categoryId
        }
    }

    private fun emptySlots(widgetSize: String): List<WidgetTimerSlotConfig> {
        return (0 until WidgetSizes.slotCount(widgetSize)).map { WidgetTimerSlotConfig(slotIndex = it) }
    }
}
