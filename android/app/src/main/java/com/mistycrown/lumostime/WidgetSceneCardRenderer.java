package com.mistycrown.lumostime;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.Objects;

/**
 * Builds one scene-widget card for both in-process and service-backed collections.
 * Updated 2026-08-12: Shares card rendering between Android 12+ RemoteCollectionItems
 * and the legacy RemoteViewsService path so launcher compatibility does not change card behavior.
 */
final class WidgetSceneCardRenderer {
    private static final int MAX_CARD_TITLE_CODE_POINTS = 4;
    private static final String CARD_TITLE_ELLIPSIS = "...";

    private WidgetSceneCardRenderer() {}

    static RemoteViews render(
            Context context,
            int appWidgetId,
            String selectedSlotId,
            WidgetSceneItem item,
            int position,
            WidgetDailySyncPayload dailyPayload,
            WidgetRuntimeState runtimeState,
            WidgetTapAnimationState tapAnimationState
    ) {
        WidgetSnapshotSlot snapshotSlot = buildSnapshotSlot(
                appWidgetId,
                item,
                position,
                dailyPayload,
                runtimeState,
                tapAnimationState
        );
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_scene_card_item);
        views.setImageViewBitmap(
                R.id.widget_scene_card_bitmap,
                WidgetSlotBitmapRenderer.INSTANCE.render(context, snapshotSlot)
        );
        views.setTextViewText(R.id.widget_scene_card_title, formatCardTitle(item.getTitle()));

        Intent fillInIntent = new Intent();
        fillInIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        fillInIntent.putExtra(WidgetSceneProviderSupport.EXTRA_SLOT_ID, selectedSlotId);
        fillInIntent.putExtra(WidgetSceneProviderSupport.EXTRA_ITEM_ID, item.getId());
        views.setOnClickFillInIntent(R.id.widget_scene_card_root, fillInIntent);
        views.setOnClickFillInIntent(R.id.widget_scene_card_bitmap, fillInIntent);
        views.setOnClickFillInIntent(R.id.widget_scene_card_title, fillInIntent);
        return views;
    }

    private static WidgetSnapshotSlot buildSnapshotSlot(
            int appWidgetId,
            WidgetSceneItem item,
            int position,
            WidgetDailySyncPayload dailyPayload,
            WidgetRuntimeState runtimeState,
            WidgetTapAnimationState tapAnimationState
    ) {
        String widgetType = WidgetSceneItemTypes.CHECKLIST.equals(
                WidgetSceneItemTypes.normalize(item.getItemType())
        ) ? WidgetTypes.DAILY : WidgetTypes.TIMER;
        String tapAnimationMode = resolveTapAnimationMode(tapAnimationState, appWidgetId, widgetType, position);
        Float tapAnimationProgress = resolveTapAnimationProgress(tapAnimationState, appWidgetId, widgetType, position);

        if (WidgetSceneItemTypes.CHECKLIST.equals(WidgetSceneItemTypes.normalize(item.getItemType()))) {
            WidgetDailyProgress progress = findDailyProgress(dailyPayload, item.getCheckItemId());
            WidgetDailyCheckMeta meta = findDailyMeta(dailyPayload, item.getCheckItemId());
            String manualMode = WidgetDailyModes.normalize(meta != null ? meta.getManualMode() : item.getCheckManualMode());
            int targetCount = Math.max(
                    1,
                    meta != null ? meta.getTargetCount()
                            : item.getCheckTargetCount() != null ? item.getCheckTargetCount() : 1
            );
            int currentCount = progress != null
                    ? Math.max(0, Math.min(progress.getCurrentCount(), targetCount))
                    : 0;

            return new WidgetSnapshotSlot(
                    position, WidgetTypes.DAILY, null, null, item.getCheckItemId(), item.getIcon(),
                    item.getUiIconAssetPath(), item.getUiIconFallbackAssetPath(), item.getTitle(), item.getColor(),
                    false, manualMode, currentCount, targetCount, progress != null && progress.isCompleted(),
                    tapAnimationMode, tapAnimationProgress, item.getCheckTemplateId()
            );
        }

        return new WidgetSnapshotSlot(
                position, WidgetTypes.TIMER, item.getActivityId(), item.getCategoryId(), null, item.getIcon(),
                item.getUiIconAssetPath(), item.getUiIconFallbackAssetPath(), item.getTitle(), item.getColor(),
                matchesRuntime(runtimeState, item), null, 0, 1, false,
                tapAnimationMode, tapAnimationProgress, null
        );
    }

    private static WidgetDailyCheckMeta findDailyMeta(WidgetDailySyncPayload payload, String checkItemId) {
        if (payload == null || checkItemId == null) return null;
        for (WidgetDailyCheckMeta item : payload.getItems()) {
            if (Objects.equals(item.getCheckItemId(), checkItemId)) return item;
        }
        return null;
    }

    private static WidgetDailyProgress findDailyProgress(WidgetDailySyncPayload payload, String checkItemId) {
        if (payload == null || checkItemId == null || !Objects.equals(payload.getDate(), currentDateString())) return null;
        for (WidgetDailyProgress item : payload.getProgress()) {
            if (Objects.equals(item.getCheckItemId(), checkItemId)
                    && Objects.equals(item.getDate(), payload.getDate())) return item;
        }
        return null;
    }

    private static boolean matchesRuntime(WidgetRuntimeState runtimeState, WidgetSceneItem item) {
        return runtimeState != null
                && Objects.equals(runtimeState.getActivityId(), item.getActivityId())
                && Objects.equals(runtimeState.getCategoryId(), item.getCategoryId())
                && Objects.equals(runtimeState.getLinkedTodoId(), item.getLinkedTodoId())
                && runtimeState.getScopeIds().containsAll(item.getScopeIds())
                && item.getScopeIds().containsAll(runtimeState.getScopeIds());
    }

    private static String resolveTapAnimationMode(
            WidgetTapAnimationState state, int appWidgetId, String widgetType, int position
    ) {
        return matchesTapAnimation(state, appWidgetId, widgetType, position) ? state.getAnimationMode() : null;
    }

    private static Float resolveTapAnimationProgress(
            WidgetTapAnimationState state, int appWidgetId, String widgetType, int position
    ) {
        if (!matchesTapAnimation(state, appWidgetId, widgetType, position)) return null;
        long duration = Math.max(1L, state.getExpiresAt() - state.getStartedAt());
        float progress = (System.currentTimeMillis() - state.getStartedAt()) / (float) duration;
        return Math.max(0f, Math.min(1f, progress));
    }

    private static boolean matchesTapAnimation(
            WidgetTapAnimationState state, int appWidgetId, String widgetType, int position
    ) {
        return state != null
                && state.getAppWidgetId() == appWidgetId
                && Objects.equals(WidgetTypes.normalize(state.getWidgetType()), WidgetTypes.normalize(widgetType))
                && state.getSlotIndex() == position;
    }

    private static String currentDateString() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
    }

    private static String formatCardTitle(String title) {
        if (title == null) return "";
        String trimmed = title.trim();
        if (trimmed.isEmpty()) return "";
        if (trimmed.codePointCount(0, trimmed.length()) <= MAX_CARD_TITLE_CODE_POINTS) return trimmed;
        int endIndex = trimmed.offsetByCodePoints(0, MAX_CARD_TITLE_CODE_POINTS);
        return trimmed.substring(0, endIndex) + CARD_TITLE_ELLIPSIS;
    }
}
