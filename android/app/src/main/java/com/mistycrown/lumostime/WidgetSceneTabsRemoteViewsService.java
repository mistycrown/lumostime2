package com.mistycrown.lumostime;

import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** Supplies the vertically scrollable time-slot list for the scene widget. */
public class WidgetSceneTabsRemoteViewsService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new Factory(getApplicationContext(), intent);
    }

    private static final class Factory implements RemoteViewsFactory {
        private final android.content.Context context;
        private final int appWidgetId;
        private List<WidgetSceneTimeSlot> slots = Collections.emptyList();
        private String selectedSlotId;

        Factory(android.content.Context context, Intent intent) {
            this.context = context;
            this.appWidgetId = intent.getIntExtra(
                    AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID
            );
        }

        @Override
        public void onCreate() {
            onDataSetChanged();
        }

        @Override
        public void onDataSetChanged() {
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
                    R.layout.widget_scene_tab_item
            );
            views.setImageViewBitmap(
                    R.id.widget_scene_tab_bitmap,
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
            fillInIntent.putExtra(
                    WidgetSceneProviderSupport.EXTRA_SLOT_ID,
                    slot.getId()
            );
            views.setOnClickFillInIntent(R.id.widget_scene_tab_root, fillInIntent);
            views.setOnClickFillInIntent(R.id.widget_scene_tab_bitmap, fillInIntent);
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
            return position;
        }

        @Override
        public boolean hasStableIds() {
            // Selection changes the bitmap for existing rows, so force visible rows to rebind.
            return false;
        }
    }
}
