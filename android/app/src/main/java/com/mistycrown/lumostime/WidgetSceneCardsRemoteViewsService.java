package com.mistycrown.lumostime;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import java.util.Collections;
import java.util.List;

/**
 * RemoteViews collection service backing the scrollable 5-column scene card grid.
 * Updated 2026-05-03: Switched title truncation to a code-point-safe implementation so emoji and surrogate pairs are not split mid-character.
 * Updated 2026-05-10: Stabilized mixed-language card-title centering by using a plain ASCII ellipsis fallback that launcher TextViews measure more consistently.
 * Updated 2026-08-11: Selects scene checklist progress for today from the weekly daily payload.
 * Updated 2026-08-12: Delegates individual card rendering to the shared renderer used by Android 12+ in-process collections.
 */
public class WidgetSceneCardsRemoteViewsService extends RemoteViewsService {

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

            return WidgetSceneCardRenderer.render(
                    context,
                    appWidgetId,
                    resolvedState != null ? resolvedState.selectedSlotId : null,
                    items.get(position),
                    position,
                    dailyPayload,
                    runtimeState,
                    tapAnimationState
            );
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

    }
}
