package com.mistycrown.lumostime

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Builds the lightweight widget UI snapshot from template bindings, runtime state,
 * and the daily widget's mirrored review progress.
 */
object WidgetSnapshotBuilder {
    fun build(
        context: android.content.Context,
        appWidgetId: Int,
        widgetSize: String
    ): WidgetSnapshot {
        val normalizedSize = WidgetSizes.normalize(widgetSize)
        val runtimeState = WidgetStores.loadRuntimeState(context)
        val dailyPayload = WidgetStores.loadDailySyncPayload(context)
        val tapAnimationState = WidgetStores.loadTapAnimationState(context)
        val now = System.currentTimeMillis()
        val todayDate = getCurrentDateString()
        val dailyMetaMap = dailyPayload?.items?.associateBy { it.checkItemId } ?: emptyMap()
        val dailyProgressMap =
            if (dailyPayload?.date == todayDate) {
                dailyPayload.progress.associateBy { it.checkItemId }
            } else {
                emptyMap()
            }

        val binding = WidgetStores.ensureBinding(context, appWidgetId, normalizedSize)
        val template = WidgetStores.loadTemplateForSize(context, binding?.templateId, normalizedSize)
        val hasTemplate = template != null

        val slots = (template?.slots ?: emptySlots(normalizedSize)).map { slot ->
            val slotType = WidgetTypes.normalize(slot.slotType)
            if (slotType == WidgetTypes.DAILY) {
                val meta = slot.checkItemId?.let(dailyMetaMap::get)
                val progress = slot.checkItemId?.let(dailyProgressMap::get)
                val manualMode = WidgetDailyModes.normalize(
                    progress?.manualMode ?: meta?.manualMode ?: slot.checkManualMode
                )
                val targetCount =
                    (progress?.targetCount ?: meta?.targetCount ?: slot.checkTargetCount ?: 1).coerceAtLeast(1)
                val currentCount = (progress?.currentCount ?: 0).coerceAtLeast(0).coerceAtMost(targetCount)
                val isCompleted = progress?.isCompleted ?: false

                WidgetSnapshotSlot(
                    slotIndex = slot.slotIndex,
                    slotType = slotType,
                    activityId = null,
                    categoryId = null,
                    checkItemId = slot.checkItemId,
                    icon = slot.customIcon?.ifBlank { null }
                        ?: meta?.icon?.ifBlank { null }
                        ?: slot.icon?.ifBlank { null }
                        ?: "\u2022",
                    uiIconAssetPath = slot.uiIconAssetPath,
                    uiIconFallbackAssetPath = slot.uiIconFallbackAssetPath,
                    label = if (hasTemplate) {
                        meta?.content?.ifBlank { null }
                            ?: slot.label?.ifBlank { null }
                            ?: "日课 ${slot.slotIndex + 1}"
                    } else {
                        ""
                    },
                    color = slot.color?.ifBlank { null } ?: "#E7E5E4",
                    isActive = false,
                    manualMode = manualMode,
                    currentCount = currentCount,
                    targetCount = targetCount,
                    isCompleted = isCompleted,
                    tapAnimationMode = tapAnimationState
                        ?.takeIf {
                            it.appWidgetId == appWidgetId &&
                                WidgetTypes.normalize(it.widgetType) == slotType &&
                                it.slotIndex == slot.slotIndex
                        }
                        ?.animationMode,
                    tapAnimationProgress = tapAnimationState
                        ?.takeIf {
                            it.appWidgetId == appWidgetId &&
                                WidgetTypes.normalize(it.widgetType) == slotType &&
                                it.slotIndex == slot.slotIndex
                        }
                        ?.let { animation ->
                            ((now - animation.startedAt).toFloat() /
                                (animation.expiresAt - animation.startedAt).coerceAtLeast(1L).toFloat())
                                .coerceIn(0f, 1f)
                        }
                )
            } else if (slotType == WidgetTypes.SHORTCUT) {
                WidgetSnapshotSlot(
                    slotIndex = slot.slotIndex,
                    slotType = slotType,
                    activityId = null,
                    categoryId = null,
                    icon = slot.customIcon?.ifBlank { null }
                        ?: slot.icon?.ifBlank { null }
                        ?: shortcutEmojiForAction(slot.shortcutAction)
                        ?: "\u2022",
                    uiIconAssetPath = slot.uiIconAssetPath,
                    uiIconFallbackAssetPath = slot.uiIconFallbackAssetPath,
                    label = if (hasTemplate) {
                        slot.label?.ifBlank { null }
                            ?: shortcutLabelForAction(slot.shortcutAction)
                            ?: "快捷入口 ${slot.slotIndex + 1}"
                    } else {
                        ""
                    },
                    color = slot.color?.ifBlank { null }
                        ?: shortcutColorForAction(slot.shortcutAction)
                        ?: "#E7E5E4",
                    isActive = false,
                    tapAnimationMode = tapAnimationState
                        ?.takeIf {
                            it.appWidgetId == appWidgetId &&
                                WidgetTypes.normalize(it.widgetType) == slotType &&
                                it.slotIndex == slot.slotIndex
                        }
                        ?.animationMode,
                    tapAnimationProgress = tapAnimationState
                        ?.takeIf {
                            it.appWidgetId == appWidgetId &&
                                WidgetTypes.normalize(it.widgetType) == slotType &&
                                it.slotIndex == slot.slotIndex
                        }
                        ?.let { animation ->
                            ((now - animation.startedAt).toFloat() /
                                (animation.expiresAt - animation.startedAt).coerceAtLeast(1L).toFloat())
                                .coerceIn(0f, 1f)
                        }
                )
            } else {
                val matchesRuntime = matchesRuntime(template, slot, runtimeState)
                WidgetSnapshotSlot(
                    slotIndex = slot.slotIndex,
                    slotType = slot.slotType,
                    activityId = slot.activityId,
                    categoryId = slot.categoryId,
                    icon = slot.icon?.ifBlank { null } ?: "\u2022",
                    uiIconAssetPath = slot.uiIconAssetPath,
                    uiIconFallbackAssetPath = slot.uiIconFallbackAssetPath,
                    label = if (hasTemplate) {
                        slot.label?.ifBlank { null } ?: "Slot ${slot.slotIndex + 1}"
                    } else {
                        ""
                    },
                    color = slot.color?.ifBlank { null } ?: "#E7E5E4",
                    isActive = matchesRuntime,
                    tapAnimationMode = tapAnimationState
                        ?.takeIf {
                            it.appWidgetId == appWidgetId &&
                                WidgetTypes.normalize(it.widgetType) == slotType &&
                                it.slotIndex == slot.slotIndex
                        }
                        ?.animationMode,
                    tapAnimationProgress = tapAnimationState
                        ?.takeIf {
                            it.appWidgetId == appWidgetId &&
                                WidgetTypes.normalize(it.widgetType) == slotType &&
                                it.slotIndex == slot.slotIndex
                        }
                        ?.let { animation ->
                            ((now - animation.startedAt).toFloat() /
                                (animation.expiresAt - animation.startedAt).coerceAtLeast(1L).toFloat())
                                .coerceIn(0f, 1f)
                        }
                )
            }
        }

        return WidgetSnapshot(
            appWidgetId = appWidgetId,
            widgetSize = normalizedSize,
            templateId = template?.id,
            templateName = template?.name ?: "",
            slots = slots
        )
    }

    private fun matchesRuntime(
        template: WidgetTemplate?,
        slot: WidgetSlotConfig,
        runtimeState: WidgetRuntimeState?
    ): Boolean {
        if (!slot.isConfigured() || runtimeState == null) {
            return false
        }

        if (WidgetTypes.normalize(runtimeState.widgetType) != WidgetTypes.normalize(slot.slotType)) {
            return false
        }

        return if (runtimeState.source == "widget" && template != null) {
            runtimeState.templateId == template.id && runtimeState.slotIndex == slot.slotIndex
        } else {
            runtimeState.activityId == slot.activityId &&
                runtimeState.categoryId == slot.categoryId &&
                runtimeState.linkedTodoId == slot.linkedTodoId &&
                runtimeState.scopeIds.toSet() == slot.scopeIds.toSet()
        }
    }

    private fun emptySlots(widgetSize: String): List<WidgetSlotConfig> {
        return (0 until WidgetSizes.slotCount(widgetSize)).map {
            WidgetSlotConfig(slotIndex = it, slotType = null)
        }
    }

    private fun getCurrentDateString(): String {
        return SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
    }

    private fun shortcutLabelForAction(action: String?): String? {
        return when (action) {
            "open_supplement_log" -> "补记"
            "quick_punch" -> "打点"
            "open_today_review" -> "Review"
            "open_search" -> "搜索"
            "open_gallery" -> "画廊"
            else -> null
        }
    }

    private fun shortcutEmojiForAction(action: String?): String? {
        return when (action) {
            "open_supplement_log" -> "\u270D\uFE0F"
            "quick_punch" -> "\u26A1"
            "open_today_review" -> "\uD83D\uDCD3"
            "open_search" -> "\uD83D\uDD0D"
            "open_gallery" -> "\uD83D\uDDBC\uFE0F"
            else -> null
        }
    }

    private fun shortcutColorForAction(action: String?): String? {
        return when (action) {
            "open_supplement_log" -> "#F5E6D3"
            "quick_punch" -> "#FEF3C7"
            "open_today_review" -> "#DBEAFE"
            "open_search" -> "#E0E7FF"
            "open_gallery" -> "#DCFCE7"
            else -> null
        }
    }
}
