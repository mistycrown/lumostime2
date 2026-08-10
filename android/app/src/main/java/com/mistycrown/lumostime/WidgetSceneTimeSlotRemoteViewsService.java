package com.mistycrown.lumostime;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Provides isolated RemoteViews rows for the scene widget's scrollable time-slot rail.
 * The rail intentionally has its own service and row layout so launcher caches cannot
 * reuse timer-card RemoteViews in place of time-slot icons.
 */
public class WidgetSceneTimeSlotRemoteViewsService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new Factory(getApplicationContext(), intent);
    }

    private static final class Factory implements RemoteViewsFactory {
        private final Context context;
        private final int appWidgetId;
        private List<WidgetSceneTimeSlot> slots = Collections.emptyList();
        private String selectedSlotId;

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
            slots = Collections.emptyList();
            selectedSlotId = null;
        }

        @Override
        public int getCount() {
            return slots.size();
        }

        @Override
        public RemoteViews getViewAt(int position) {
            if (position < 0 || position >= slots.size()) {
                return null;
            }

            WidgetSceneTimeSlot slot = slots.get(position);
            RemoteViews views = new RemoteViews(
                    context.getPackageName(),
                    R.layout.widget_scene_time_slot_item
            );
            views.setImageViewBitmap(
                    R.id.widget_scene_time_slot_bitmap,
                    WidgetSceneTabBitmapRenderer.INSTANCE.render(
                            context,
                            slot.getIcon(),
                            slot.getUiIconAssetPath(),
                            slot.getUiIconFallbackAssetPath(),
                            slot.getId() != null && slot.getId().equals(selectedSlotId)
                    )
            );

            Intent fillInIntent = new Intent();
            fillInIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            fillInIntent.putExtra(WidgetSceneProviderSupport.EXTRA_SLOT_ID, slot.getId());
            views.setOnClickFillInIntent(R.id.widget_scene_time_slot_root, fillInIntent);
            views.setOnClickFillInIntent(R.id.widget_scene_time_slot_bitmap, fillInIntent);
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
            if (position < 0 || position >= slots.size() || slots.get(position).getId() == null) {
                return position;
            }
            return slots.get(position).getId().hashCode();
        }

        @Override
        public boolean hasStableIds() {
            return true;
        }

        private void reloadData() {
            WidgetSceneProviderSupport.ResolvedSceneState state =
                    WidgetSceneProviderSupport.resolveState(context, appWidgetId);
            if (state == null || state.displayedGroup == null) {
                slots = Collections.emptyList();
                selectedSlotId = null;
                return;
            }
            slots = new ArrayList<>(state.displayedGroup.getTimeSlots());
            selectedSlotId = state.selectedSlotId;
        }
    }
}
