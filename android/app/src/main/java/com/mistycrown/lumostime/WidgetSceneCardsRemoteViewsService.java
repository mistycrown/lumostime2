package com.mistycrown.lumostime;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import java.text.SimpleDateFormat;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

/**
 * RemoteViews collection service backing the scrollable 5-column scene card grid.
 * Updated 2026-05-03: Switched title truncation to a code-point-safe implementation so emoji and surrogate pairs are not split mid-character.
 * Updated 2026-05-10: Stabilized mixed-language card-title centering by using a plain ASCII ellipsis fallback that launcher TextViews measure more consistently.
 */
public class WidgetSceneCardsRemoteViewsService extends RemoteViewsService {
    private static final int MAX_CARD_TITLE_CODE_POINTS = 4;
    private static final String CARD_TITLE_ELLIPSIS = "...";

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new Factory(getApplicationContext(), intent);
    }

    private static final class Factory implements RemoteViewsService.RemoteViewsFactory {
        private final Context context;
        private final int appWidgetId;
        private WidgetSceneProviderSupport.ResolvedSceneState resolvedState;
        private WidgetDailySyncPayload dailyPayload;
        private WidgetRuntimeState runtimeState;
        private WidgetTapAnimationState tapAnimationState;

        Factory(Context context, Intent intent) {
            this.context = context;
            this.appWidgetId = intent.getIntExtra(
                    AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID
            );
        }

        @Override
        public void onCreate() {
            reloadData();
        }

        @Override
        public void onDataSetChanged() {
            reloadData();
        }

        @Override
        public void onDestroy() {
            resolvedState = null;
            dailyPayload = null;
            runtimeState = null;
            tapAnimationState = null;
        }

        @Override
        public int getCount() {
            return getItems().size();
        }

        @Override
        public RemoteViews getViewAt(int position) {
            List<WidgetSceneItem> items = getItems();
            if (position < 0 || position >= items.size()) {
                return null;
            }

            WidgetSceneItem item = items.get(position);
            WidgetSnapshotSlot snapshotSlot = buildSnapshotSlot(item, position);

            RemoteViews views = new RemoteViews(
                    context.getPackageName(),
                    R.layout.widget_scene_card_item
            );
            views.setImageViewBitmap(
                    R.id.widget_scene_card_bitmap,
                    WidgetSlotBitmapRenderer.INSTANCE.render(context, snapshotSlot)
            );
            views.setTextViewText(
                    R.id.widget_scene_card_title,
                    formatCardTitle(item.getTitle())
            );

            Intent fillInIntent = new Intent();
            fillInIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            fillInIntent.putExtra(
                    WidgetSceneProviderSupport.EXTRA_SLOT_ID,
                    resolvedState != null ? resolvedState.selectedSlotId : null
            );
            fillInIntent.putExtra(WidgetSceneProviderSupport.EXTRA_ITEM_ID, item.getId());
            views.setOnClickFillInIntent(R.id.widget_scene_card_root, fillInIntent);
            views.setOnClickFillInIntent(R.id.widget_scene_card_bitmap, fillInIntent);
            views.setOnClickFillInIntent(R.id.widget_scene_card_title, fillInIntent);
            return views;
        }

        @Override
        public RemoteViews getLoadingView() {
            return null;
        }

        @Override
        public int getViewTypeCount() {
            return 1;
        }

        @Override
        public long getItemId(int position) {
            List<WidgetSceneItem> items = getItems();
            if (position < 0 || position >= items.size()) {
                return position;
            }
            return items.get(position).getId().hashCode();
        }

        @Override
        public boolean hasStableIds() {
            return true;
        }

        private void reloadData() {
            resolvedState = WidgetSceneProviderSupport.resolveState(context, appWidgetId);
            dailyPayload = WidgetStores.INSTANCE.loadDailySyncPayload(context);
            runtimeState = WidgetStores.INSTANCE.loadRuntimeState(context);
            tapAnimationState = WidgetStores.INSTANCE.loadTapAnimationState(context);
        }

        private List<WidgetSceneItem> getItems() {
            if (resolvedState == null || resolvedState.selectedSlot == null) {
                return Collections.emptyList();
            }
            return resolvedState.selectedSlot.getItems();
        }

        private WidgetSnapshotSlot buildSnapshotSlot(WidgetSceneItem item, int position) {
            String widgetType = WidgetSceneItemTypes.CHECKLIST.equals(
                    WidgetSceneItemTypes.normalize(item.getItemType())
            ) ? WidgetTypes.DAILY : WidgetTypes.TIMER;
            String tapAnimationMode = resolveTapAnimationMode(widgetType, position);
            Float tapAnimationProgress = resolveTapAnimationProgress(widgetType, position);

            if (WidgetSceneItemTypes.CHECKLIST.equals(
                    WidgetSceneItemTypes.normalize(item.getItemType())
            )) {
                WidgetDailyProgress progress = findDailyProgress(item.getCheckItemId());
                WidgetDailyCheckMeta meta = findDailyMeta(item.getCheckItemId());
                String manualMode = WidgetDailyModes.normalize(
                        meta != null ? meta.getManualMode() : item.getCheckManualMode()
                );
                int targetCount = Math.max(
                        1,
                        meta != null ? meta.getTargetCount()
                                : item.getCheckTargetCount() != null ? item.getCheckTargetCount() : 1
                );
                int currentCount = progress != null
                        ? Math.max(0, Math.min(progress.getCurrentCount(), targetCount))
                        : 0;
                boolean isCompleted = progress != null && progress.isCompleted();

                return new WidgetSnapshotSlot(
                        position,
                        WidgetTypes.DAILY,
                        null,
                        null,
                        item.getCheckItemId(),
                        item.getIcon(),
                        item.getUiIconAssetPath(),
                        item.getUiIconFallbackAssetPath(),
                        item.getTitle(),
                        item.getColor(),
                        false,
                        manualMode,
                        currentCount,
                        targetCount,
                        isCompleted,
                        tapAnimationMode,
                        tapAnimationProgress
                );
            }

            return new WidgetSnapshotSlot(
                    position,
                    WidgetTypes.TIMER,
                    item.getActivityId(),
                    item.getCategoryId(),
                    null,
                    item.getIcon(),
                    item.getUiIconAssetPath(),
                    item.getUiIconFallbackAssetPath(),
                    item.getTitle(),
                    item.getColor(),
                    matchesRuntime(item),
                    null,
                    0,
                    1,
                    false,
                    tapAnimationMode,
                    tapAnimationProgress
            );
        }

        private WidgetDailyCheckMeta findDailyMeta(String checkItemId) {
            if (dailyPayload == null || checkItemId == null) {
                return null;
            }
            for (WidgetDailyCheckMeta item : dailyPayload.getItems()) {
                if (Objects.equals(item.getCheckItemId(), checkItemId)) {
                    return item;
                }
            }
            return null;
        }

        private WidgetDailyProgress findDailyProgress(String checkItemId) {
            if (dailyPayload == null || checkItemId == null) {
                return null;
            }
            if (!Objects.equals(dailyPayload.getDate(), getCurrentDateString())) {
                return null;
            }
            for (WidgetDailyProgress item : dailyPayload.getProgress()) {
                if (Objects.equals(item.getCheckItemId(), checkItemId)) {
                    return item;
                }
            }
            return null;
        }

        private boolean matchesRuntime(WidgetSceneItem item) {
            if (runtimeState == null) {
                return false;
            }
            return Objects.equals(runtimeState.getActivityId(), item.getActivityId())
                    && Objects.equals(runtimeState.getCategoryId(), item.getCategoryId())
                    && Objects.equals(runtimeState.getLinkedTodoId(), item.getLinkedTodoId())
                    && runtimeState.getScopeIds().containsAll(item.getScopeIds())
                    && item.getScopeIds().containsAll(runtimeState.getScopeIds());
        }

        private String getCurrentDateString() {
            return new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
        }

        private String resolveTapAnimationMode(String widgetType, int position) {
            if (tapAnimationState == null) {
                return null;
            }
            if (tapAnimationState.getAppWidgetId() != appWidgetId) {
                return null;
            }
            if (!Objects.equals(WidgetTypes.normalize(tapAnimationState.getWidgetType()), WidgetTypes.normalize(widgetType))) {
                return null;
            }
            if (tapAnimationState.getSlotIndex() != position) {
                return null;
            }
            return tapAnimationState.getAnimationMode();
        }

        private Float resolveTapAnimationProgress(String widgetType, int position) {
            if (tapAnimationState == null) {
                return null;
            }
            if (tapAnimationState.getAppWidgetId() != appWidgetId) {
                return null;
            }
            if (!Objects.equals(WidgetTypes.normalize(tapAnimationState.getWidgetType()), WidgetTypes.normalize(widgetType))) {
                return null;
            }
            if (tapAnimationState.getSlotIndex() != position) {
                return null;
            }
            long duration = Math.max(1L, tapAnimationState.getExpiresAt() - tapAnimationState.getStartedAt());
            float progress = (System.currentTimeMillis() - tapAnimationState.getStartedAt()) / (float) duration;
            return Math.max(0f, Math.min(1f, progress));
        }

        private String formatCardTitle(String title) {
            if (title == null) {
                return "";
            }
            String trimmed = title.trim();
            if (trimmed.isEmpty()) {
                return "";
            }
            if (trimmed.codePointCount(0, trimmed.length()) <= MAX_CARD_TITLE_CODE_POINTS) {
                return trimmed;
            }
            int endIndex = trimmed.offsetByCodePoints(0, MAX_CARD_TITLE_CODE_POINTS);
            return trimmed.substring(0, endIndex) + CARD_TITLE_ELLIPSIS;
        }
    }
}
