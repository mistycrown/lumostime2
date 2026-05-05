package com.mistycrown.lumostime;

import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.text.TextUtils;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import java.util.ArrayList;
import java.util.List;

/**
 * RemoteViews collection service backing the scrollable TODAY + PIN widget list.
 */
public class WidgetTodoPinRemoteViewsService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new Factory(getApplicationContext(), intent);
    }

    private static final class Factory implements RemoteViewsService.RemoteViewsFactory {
        private final android.content.Context context;
        private final int appWidgetId;
        private List<WidgetTodoPinItem> items = new ArrayList<>();
        private WidgetRuntimeState runtimeState;

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
            WidgetTodoPinProviderSupport.refreshTodoPinPayloadFromMirroredSources(context);
            WidgetTodoPinPayload payload = WidgetStores.INSTANCE.loadTodoPinPayload(context);
            if (payload != null && isPayloadForToday(payload)) {
                items = payload.getItems();
            } else {
                items = new ArrayList<>();
            }
            runtimeState = WidgetStores.INSTANCE.loadRuntimeState(context);
        }

        @Override
        public void onDestroy() {
            items = new ArrayList<>();
            runtimeState = null;
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

            WidgetTodoPinItem item = items.get(position);
            boolean isRunning = runtimeState != null
                    && item.getTodoId().equals(runtimeState.getLinkedTodoId());
            boolean isActionable = item.isActionable();

            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_todo_pin_list_item);
            views.setTextViewText(R.id.widget_todo_pin_title, item.getTitle());
            views.setViewVisibility(
                    R.id.widget_todo_pin_button_start,
                    isActionable && !isRunning ? View.VISIBLE : View.GONE
            );
            views.setViewVisibility(
                    R.id.widget_todo_pin_button_stop,
                    isActionable && isRunning ? View.VISIBLE : View.GONE
            );
            views.setViewVisibility(
                    R.id.widget_todo_pin_button_open,
                    !isActionable ? View.VISIBLE : View.GONE
            );
            views.setViewVisibility(
                    R.id.widget_todo_pin_divider,
                    position == items.size() - 1 ? View.GONE : View.VISIBLE
            );

            Intent fillInIntent = new Intent();
            fillInIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            fillInIntent.putExtra(WidgetTodoPinProviderSupport.EXTRA_TODO_ID, item.getTodoId());
            views.setOnClickFillInIntent(R.id.widget_todo_pin_row, fillInIntent);
            views.setOnClickFillInIntent(R.id.widget_todo_pin_action_button, fillInIntent);
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
            if (position < 0 || position >= items.size()) {
                return position;
            }
            return items.get(position).getTodoId().hashCode();
        }

        @Override
        public boolean hasStableIds() {
            return true;
        }

        private boolean isPayloadForToday(WidgetTodoPinPayload payload) {
            String today = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault())
                    .format(new java.util.Date());
            return TextUtils.equals(today, payload.getDate());
        }
    }
}
