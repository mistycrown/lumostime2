package com.mistycrown.lumostime;

import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.graphics.Bitmap;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import java.util.ArrayList;
import java.util.List;

/**
 * Supplies compact daily-check rows to the scrollable 4x3 widget.
 */
public class WidgetDailyCheckWeek4x3RemoteViewsService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new Factory(getApplicationContext(), intent);
    }

    private static final class Factory implements RemoteViewsFactory {
        private final android.content.Context context;
        private final int appWidgetId;
        private List<WidgetDailyCheckMeta> items = new ArrayList<>();
        private WidgetDailySyncPayload payload;

        private Factory(android.content.Context context, Intent intent) {
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
            payload = WidgetStores.INSTANCE.loadDailySyncPayload(context);
            items = payload == null ? new ArrayList<>() : payload.getItems();
        }

        @Override
        public void onDestroy() {
            items = new ArrayList<>();
            payload = null;
        }

        @Override
        public int getCount() {
            return items.size();
        }

        @Override
        public RemoteViews getViewAt(int position) {
            if (position < 0 || position >= items.size()) {
                return null;
            }

            RemoteViews views = new RemoteViews(
                    context.getPackageName(),
                    R.layout.widget_daily_check_week_4x3_list_item
            );
            Bitmap bitmap = WidgetDailyCheckWeek4x3RowBitmapRenderer.INSTANCE.render(
                    context,
                    appWidgetId,
                    payload,
                    items.get(position)
            );
            views.setImageViewBitmap(R.id.widget_daily_check_week_4x3_row_bitmap, bitmap);
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
            return position < 0 || position >= items.size()
                    ? position
                    : items.get(position).getCheckItemId().hashCode();
        }

        @Override
        public boolean hasStableIds() {
            return true;
        }
    }
}
