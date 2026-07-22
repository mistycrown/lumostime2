package com.mistycrown.lumostime;

import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

/** Collection adapter for quick-todo rows. */
public class WidgetQuickTodoRemoteViewsService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new Factory(getApplicationContext(), intent);
    }

    private static final class Factory implements RemoteViewsService.RemoteViewsFactory {
        private final android.content.Context context;
        private final int appWidgetId;
        private List<WidgetTodoPinSourceTodo> items = new ArrayList<>();

        Factory(android.content.Context context, Intent intent) {
            this.context = context;
            appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        }

        @Override public void onCreate() { onDataSetChanged(); }

        @Override
        public void onDataSetChanged() {
            WidgetTodoPinPayload payload = WidgetStores.INSTANCE.loadTodoPinPayload(context);
            List<WidgetTodoPinSourceTodo> nextItems = new ArrayList<>();
            if (payload != null) {
                for (WidgetTodoPinSourceTodo todo : payload.getSourceTodos()) {
                    if ("quick".equals(todo.getKind())) nextItems.add(todo);
                }
            }
            Collections.sort(nextItems, new Comparator<WidgetTodoPinSourceTodo>() {
                @Override public int compare(WidgetTodoPinSourceTodo left, WidgetTodoPinSourceTodo right) {
                    if (left.isCompleted() != right.isCompleted()) return left.isCompleted() ? 1 : -1;
                    return left.getTitle().compareToIgnoreCase(right.getTitle());
                }
            });
            items = nextItems;
        }

        @Override public void onDestroy() { items = new ArrayList<>(); }
        @Override public int getCount() { return items.size(); }

        @Override
        public RemoteViews getViewAt(int position) {
            if (position < 0 || position >= items.size()) return null;
            WidgetTodoPinSourceTodo item = items.get(position);
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quick_todo_list_item);
            views.setTextViewText(R.id.widget_quick_todo_title, item.getTitle());
            views.setImageViewResource(R.id.widget_quick_todo_complete_button,
                    item.isCompleted() ? R.drawable.widget_todo_pin_checkbox_checked : R.drawable.widget_todo_pin_checkbox_unchecked);
            views.setViewVisibility(R.id.widget_quick_todo_divider, position == items.size() - 1 ? View.GONE : View.VISIBLE);
            Intent fillInIntent = new Intent();
            fillInIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            fillInIntent.putExtra(WidgetQuickTodoProviderSupport.EXTRA_TODO_ID, item.getId());
            views.setOnClickFillInIntent(R.id.widget_quick_todo_complete_button, fillInIntent);
            return views;
        }

        @Override public RemoteViews getLoadingView() { return null; }
        @Override public int getViewTypeCount() { return 1; }
        @Override public long getItemId(int position) { return position < 0 || position >= items.size() ? position : items.get(position).getId().hashCode(); }
        @Override public boolean hasStableIds() { return true; }
    }
}
