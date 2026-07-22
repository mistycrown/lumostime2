package com.mistycrown.lumostime;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;

/** Rendering and actions for the dedicated quick-todo widget. */
public final class WidgetQuickTodoProviderSupport {
    public static final String ACTION_COMPLETE = "com.mistycrown.lumostime.action.COMPLETE_QUICK_TODO";
    public static final String ACTION_REFRESH = "com.mistycrown.lumostime.action.REFRESH_QUICK_TODO";
    private static final String ACTION_OPEN_ADD_DIALOG = "com.mistycrown.lumostime.action.OPEN_QUICK_TODO_ADD_DIALOG";
    public static final String EXTRA_TODO_ID = "quick_todo_id";

    private WidgetQuickTodoProviderSupport() {}

    public static boolean handleReceive(Context context, Intent intent) {
        if (intent == null) return false;
        String action = intent.getAction();
        if (ACTION_REFRESH.equals(action)) return true;
        if (!ACTION_COMPLETE.equals(action)) return false;
        String todoId = intent.getStringExtra(EXTRA_TODO_ID);
        return todoId != null && WidgetTodoPinProviderSupport.toggleTodoCompletion(context, todoId);
    }

    public static void addQuickTodo(Context context, String title) {
        String normalizedTitle = title == null ? "" : title.trim();
        if (normalizedTitle.isEmpty()) return;

        WidgetTodoPinPayload payload = WidgetStores.INSTANCE.loadTodoPinPayload(context);
        if (payload == null) return;
        long now = System.currentTimeMillis();
        String todoId = "widget-quick-" + now;
        java.util.List<WidgetTodoPinSourceTodo> sourceTodos = new java.util.ArrayList<>(payload.getSourceTodos());
        sourceTodos.add(new WidgetTodoPinSourceTodo(
                todoId, normalizedTitle, "quick", false, null, null, null,
                java.util.Collections.<String>emptyList(), false, null, null,
                java.util.Collections.<String>emptyList(), null
        ));
        WidgetStores.INSTANCE.saveTodoPinPayload(context, new WidgetTodoPinPayload(
                payload.getDate(), payload.getItems(), now, sourceTodos, payload.getSourceCategories()
        ));
        WidgetStores.INSTANCE.appendPendingTodoPinAction(context, new WidgetPendingTodoPinAction(
                "quick-create-" + todoId, todoId, false, now, "create", normalizedTitle
        ));
        WidgetRefreshCoordinator.INSTANCE.refreshTodoPinWidgets(context);
    }

    public static void updateWidgets(
            Context context,
            AppWidgetManager manager,
            int[] ids,
            Class<? extends android.appwidget.AppWidgetProvider> providerClass
    ) {
        if (ids == null || ids.length == 0) return;
        for (int appWidgetId : ids) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout_quick_todo_4x2);
            Intent serviceIntent = new Intent(context, WidgetQuickTodoRemoteViewsService.class);
            serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            serviceIntent.setData(Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME)));
            views.setRemoteAdapter(R.id.widget_quick_todo_list, serviceIntent);
            views.setEmptyView(R.id.widget_quick_todo_list, R.id.widget_quick_todo_empty);
            views.setOnClickPendingIntent(R.id.widget_quick_todo_refresh_button, refreshIntent(context, appWidgetId, providerClass));
            views.setOnClickPendingIntent(R.id.widget_quick_todo_add_button, addIntent(context, appWidgetId));
            views.setPendingIntentTemplate(R.id.widget_quick_todo_list, completionTemplate(context, appWidgetId, providerClass));
            manager.notifyAppWidgetViewDataChanged(new int[] { appWidgetId }, R.id.widget_quick_todo_list);
            manager.updateAppWidget(appWidgetId, views);
        }
    }

    private static PendingIntent refreshIntent(Context context, int appWidgetId, Class<?> providerClass) {
        Intent intent = new Intent(context, providerClass);
        intent.setAction(ACTION_REFRESH);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        return PendingIntent.getBroadcast(context, appWidgetId + 7600, intent, immutableFlags());
    }

    private static PendingIntent completionTemplate(Context context, int appWidgetId, Class<?> providerClass) {
        Intent intent = new Intent(context, providerClass);
        intent.setAction(ACTION_COMPLETE);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        return PendingIntent.getBroadcast(context, appWidgetId + 7700, intent, mutableFlags());
    }

    private static PendingIntent addIntent(Context context, int appWidgetId) {
        Intent intent = new Intent(context, QuickTodoAddActivity.class);
        intent.setAction(ACTION_OPEN_ADD_DIALOG);
        intent.setData(Uri.parse("lumostime-widget://quick-todo/add/" + appWidgetId));
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        return PendingIntent.getActivity(context, appWidgetId + 7800, intent, immutableFlags());
    }

    private static int immutableFlags() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return flags;
    }

    private static int mutableFlags() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) flags |= PendingIntent.FLAG_MUTABLE;
        else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return flags;
    }
}
