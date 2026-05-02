package com.mistycrown.lumostime;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import java.util.Collections;
import java.util.List;

/**
 * RemoteViews collection service backing the icon-only scene tab row.
 */
public class WidgetSceneTabsRemoteViewsService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new Factory(getApplicationContext(), intent);
    }

    private static final class Factory implements RemoteViewsService.RemoteViewsFactory {
        private final Context context;
        private final int appWidgetId;

        Factory(Context context, Intent intent) {
            this.context = context;
            this.appWidgetId = intent.getIntExtra(
                    AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID
            );
        }

        @Override
        public void onCreate() {}

        @Override
        public void onDataSetChanged() {}

        @Override
        public void onDestroy() {}

        @Override
        public int getCount() {
            WidgetSceneProviderSupport.ResolvedSceneState state =
                    WidgetSceneProviderSupport.resolveState(context, appWidgetId);
            List<WidgetSceneTimeSlot> slots = state.displayedGroup != null
                    ? state.displayedGroup.getTimeSlots()
                    : Collections.emptyList();
            return slots.size();
        }

        @Override
        public RemoteViews getViewAt(int position) {
            WidgetSceneProviderSupport.ResolvedSceneState state =
                    WidgetSceneProviderSupport.resolveState(context, appWidgetId);
            List<WidgetSceneTimeSlot> slots = state.displayedGroup != null
                    ? state.displayedGroup.getTimeSlots()
                    : Collections.emptyList();
            if (position < 0 || position >= slots.size()) {
                return null;
            }

            WidgetSceneTimeSlot slot = slots.get(position);
            boolean isSelected = slot.getId() != null && slot.getId().equals(state.selectedSlotId);

            RemoteViews views = new RemoteViews(
                    context.getPackageName(),
                    R.layout.widget_scene_tab_item
            );
            views.setImageViewBitmap(
                    R.id.widget_scene_tab_bitmap,
                    WidgetSceneTabBitmapRenderer.INSTANCE.render(context, slot.getIcon(), isSelected)
            );

            Intent fillInIntent = new Intent();
            fillInIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            fillInIntent.putExtra(WidgetSceneProviderSupport.EXTRA_SLOT_ID, slot.getId());
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
            WidgetSceneProviderSupport.ResolvedSceneState state =
                    WidgetSceneProviderSupport.resolveState(context, appWidgetId);
            List<WidgetSceneTimeSlot> slots = state.displayedGroup != null
                    ? state.displayedGroup.getTimeSlots()
                    : Collections.emptyList();
            if (position < 0 || position >= slots.size()) {
                return position;
            }
            return slots.get(position).getId().hashCode();
        }

        @Override
        public boolean hasStableIds() {
            return true;
        }
    }
}
