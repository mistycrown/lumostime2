package com.mistycrown.lumostime;

import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/** Collection adapter for quick-todo rows.
 * Updated 2026-09-11: Shows all unfinished quick todos and at most five most recently completed ones.
 */
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
                    if (left.isCompleted()) {
                        int completedAtComparison = compareCompletedAt(left.getCompletedAt(), right.getCompletedAt());
                        if (completedAtComparison != 0) return completedAtComparison;
                    }
                    return left.getTitle().compareToIgnoreCase(right.getTitle());
                }
            });
            int completedCount = 0;
            for (WidgetTodoPinSourceTodo item : nextItems) {
                if (item.isCompleted()) completedCount++;
            }
            if (completedCount > 5) {
                int keepCount = nextItems.size() - completedCount + 5;
                nextItems = new ArrayList<>(nextItems.subList(0, keepCount));
            }
            items = nextItems;
        }

        private static int compareCompletedAt(String left, String right) {
            Long leftTime = parseCompletedAt(left);
            Long rightTime = parseCompletedAt(right);
            if (leftTime == null && rightTime == null) return 0;
            if (leftTime == null) return 1;
            if (rightTime == null) return -1;
            return Long.compare(rightTime, leftTime);
        }

        private static Long parseCompletedAt(String value) {
            if (value == null || value.trim().isEmpty()) return null;
            String normalized = value.trim();
            if (normalized.endsWith("Z")) {
                normalized = normalized.substring(0, normalized.length() - 1) + "+0000";
            } else if (normalized.matches(".*[+-]\\d{2}:\\d{2}$")) {
                normalized = normalized.substring(0, normalized.length() - 3)
                        + normalized.substring(normalized.length() - 2);
            }
            for (String pattern : new String[] {
                    "yyyy-MM-dd'T'HH:mm:ss.SSSZ",
                    "yyyy-MM-dd'T'HH:mm:ssZ"
            }) {
                try {
                    SimpleDateFormat formatter = new SimpleDateFormat(pattern, Locale.US);
                    formatter.setLenient(false);
                    Date parsed = formatter.parse(normalized);
                    if (parsed != null) return parsed.getTime();
                } catch (java.text.ParseException ignored) {
                    // Try the format without milliseconds for legacy values.
                }
            }
            return null;
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
