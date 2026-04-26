package com.mistycrown.lumostime;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Shared rendering and tap handling for the dedicated TODAY + PIN widgets.
 */
public final class WidgetTodoPinProviderSupport {
    public static final String ACTION_TOGGLE_TODO_ITEM =
            "com.mistycrown.lumostime.action.TOGGLE_TODO_PIN_ITEM";
    public static final String EXTRA_TODO_ID = "todo_pin_todo_id";

    private WidgetTodoPinProviderSupport() {}

    public static boolean handleCommonReceive(
            Context context,
            Intent intent,
            Class<?> providerClass
    ) {
        if (intent == null) {
            return false;
        }

        String action = intent.getAction();
        if (ACTION_TOGGLE_TODO_ITEM.equals(action)) {
            int appWidgetId = intent.getIntExtra(
                    AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID
            );
            String todoId = intent.getStringExtra(EXTRA_TODO_ID);
            if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID && todoId != null && !todoId.trim().isEmpty()) {
                WidgetTodoPinPayload payload = WidgetStores.INSTANCE.loadTodoPinPayload(context);
                WidgetTodoPinItem item = findItem(payload, todoId);
                if (item != null && item.isActionable()) {
                    boolean didChange = WidgetTimerController.INSTANCE.handleTodoPinItemTap(context, appWidgetId, todoId);
                    if (didChange) {
                        WidgetRefreshCoordinator.INSTANCE.refreshAllAsync(context);
                    }
                } else {
                    launchApp(context, appWidgetId);
                }
            }
            return true;
        }

        return Intent.ACTION_DATE_CHANGED.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action);
    }

    public static void updateWidgets(
            Context context,
            AppWidgetManager appWidgetManager,
            int[] appWidgetIds,
            Class<? extends AppWidgetProvider> providerClass
    ) {
        updateWidgets(
                context,
                appWidgetManager,
                appWidgetIds,
                R.layout.widget_layout_todo_pin_4x2,
                providerClass
        );
    }

    public static void updateWidgets(
            Context context,
            AppWidgetManager appWidgetManager,
            int[] appWidgetIds,
            int layoutResId,
            Class<? extends AppWidgetProvider> providerClass
    ) {
        if (appWidgetIds == null || appWidgetIds.length == 0) {
            return;
        }

        WidgetTodoPinPayload payload = WidgetStores.INSTANCE.loadTodoPinPayload(context);
        if (!isPayloadForToday(payload)) {
            payload = null;
        }
        WidgetRuntimeState runtimeState = WidgetStores.INSTANCE.loadRuntimeState(context);

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), layoutResId);
            Intent serviceIntent = new Intent(context, WidgetTodoPinRemoteViewsService.class);
            serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            serviceIntent.setData(Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME)));

            views.setRemoteAdapter(R.id.widget_todo_pin_list, serviceIntent);
            views.setEmptyView(R.id.widget_todo_pin_list, R.id.widget_todo_pin_empty);
            views.setTextViewText(R.id.widget_todo_pin_subtitle, formatHeaderDate());
            views.setTextViewText(R.id.widget_todo_pin_status, formatStatus(payload, runtimeState));
            views.setPendingIntentTemplate(
                    R.id.widget_todo_pin_list,
                    buildItemTemplatePendingIntent(context, appWidgetId, providerClass)
            );

            appWidgetManager.notifyAppWidgetViewDataChanged(
                    new int[] { appWidgetId },
                    R.id.widget_todo_pin_list
            );
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    private static WidgetTodoPinItem findItem(WidgetTodoPinPayload payload, String todoId) {
        if (payload == null || todoId == null) {
            return null;
        }

        for (WidgetTodoPinItem item : payload.getItems()) {
            if (todoId.equals(item.getTodoId())) {
                return item;
            }
        }
        return null;
    }

    private static boolean isPayloadForToday(WidgetTodoPinPayload payload) {
        if (payload == null) {
            return false;
        }
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
        return today.equals(payload.getDate());
    }

    private static String formatHeaderDate() {
        return new SimpleDateFormat("EEEE / MMM dd", Locale.ENGLISH)
                .format(new Date())
                .toUpperCase(Locale.ENGLISH);
    }

    private static String formatStatus(WidgetTodoPinPayload payload, WidgetRuntimeState runtimeState) {
        int taskCount = payload == null ? 0 : payload.getItems().size();
        boolean hasRunningTodo = runtimeState != null
                && runtimeState.getLinkedTodoId() != null
                && findItem(payload, runtimeState.getLinkedTodoId()) != null;

        if (taskCount <= 0) {
            return "NO TASKS";
        }

        if (hasRunningTodo) {
            return "1 RUNNING / " + taskCount + " TASKS";
        }

        return taskCount + " TASKS";
    }

    private static void launchApp(Context context, int appWidgetId) {
        try {
            PendingIntent intent = buildOpenAppPendingIntent(context, appWidgetId);
            intent.send();
        } catch (PendingIntent.CanceledException ignored) {
        }
    }

    private static PendingIntent buildOpenAppPendingIntent(Context context, int appWidgetId) {
        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent == null) {
            launchIntent = new Intent(context, MainActivity.class);
        }

        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        launchIntent.setAction(Intent.ACTION_VIEW);
        launchIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        return PendingIntent.getActivity(
                context,
                appWidgetId + 6400,
                launchIntent,
                pendingIntentFlags()
        );
    }

    private static PendingIntent buildItemTemplatePendingIntent(
            Context context,
            int appWidgetId,
            Class<? extends AppWidgetProvider> providerClass
    ) {
        Intent intent = new Intent(context, providerClass);
        intent.setAction(ACTION_TOGGLE_TODO_ITEM);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        return PendingIntent.getBroadcast(
                context,
                appWidgetId + 7400,
                intent,
                pendingIntentTemplateFlags()
        );
    }

    private static int pendingIntentFlags() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return flags;
    }

    private static int pendingIntentTemplateFlags() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return flags;
    }
}
