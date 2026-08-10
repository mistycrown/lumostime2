package com.mistycrown.lumostime;

import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.graphics.Bitmap;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import java.util.ArrayList;
import java.util.List;

/**
 * Supplies one weekday header followed by compact daily-check rows to the 4x3 widget.
 * Updated 2026-08-10: Made the weekday header a collection item to avoid duplicate RemoteViews layers.
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
            return items.isEmpty() ? 0 : items.size() + 1;
        }

        @Override
        public RemoteViews getViewAt(int position) {
            if (position < 0 || position >= getCount()) {
                return null;
            }

            if (position == 0) {
                RemoteViews header = new RemoteViews(
                        context.getPackageName(),
                        R.layout.widget_daily_check_week_4x3_weekday_item
                );
                header.setImageViewBitmap(
                        R.id.widget_daily_check_week_4x3_weekday_bitmap,
                        WidgetDailyCheckWeek4x3RowBitmapRenderer.INSTANCE.renderWeekdays(context, appWidgetId)
                );
                return header;
            }

            RemoteViews views = new RemoteViews(
                    context.getPackageName(),
                    R.layout.widget_daily_check_week_4x3_list_item
            );
            Bitmap bitmap = WidgetDailyCheckWeek4x3RowBitmapRenderer.INSTANCE.render(
                    context,
                    appWidgetId,
                    payload,
                    items.get(position - 1)
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
            return 2;
        }

        @Override
        public long getItemId(int position) {
            if (position == 0) {
                return Long.MIN_VALUE;
            }
            return position < 0 || position >= getCount()
                    ? position
                    : items.get(position - 1).getCheckItemId().hashCode();
        }

        @Override
        public boolean hasStableIds() {
            return true;
        }
    }
}
