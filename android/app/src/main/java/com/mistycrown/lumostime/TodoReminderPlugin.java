/**
 * @file TodoReminderPlugin.java
 * @input Committed reminder snapshots, permission/settings requests and notification intents
 * @output Native reminder status, serialized scheduling and one-shot todo navigation
 * @pos Capacitor Plugin
 * @updated 2026-10-18: Adds explicit calendar authorization, capability/error status and app permission settings.
 * @updated 2026-10-17: Adds a dedicated local reminder bridge without background services or AI.
 */
package com.mistycrown.lumostime;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(name = "TodoReminder", permissions = {
    @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications"),
    @Permission(strings = { Manifest.permission.READ_CALENDAR, Manifest.permission.WRITE_CALENDAR }, alias = "calendar")
})
public class TodoReminderPlugin extends Plugin {
    private static final String NAVIGATION_PREFS = "lumostime_todo_reminder_navigation";

    public static void captureNavigation(Context context, Intent intent) {
        if (intent == null || !intent.hasExtra("todo_reminder_target")) return;
        String id = intent.getStringExtra("todo_reminder_target");
        if (id != null && !id.isEmpty()) {
            context.getSharedPreferences(NAVIGATION_PREFS, Context.MODE_PRIVATE).edit().putString("todoId", id).commit();
        }
        // Do not capture the same click again after activity recreation.
        intent.removeExtra("todo_reminder_target");
    }

    @Override
    protected void handleOnResume() {
        getBridge().execute(() -> {
            try {
                TodoReminderScheduler.restore(getContext());
            } catch (Exception error) {
                Log.e("TodoReminder", "Unable to restore reminders on resume", error);
            }
        });
    }

    private JSObject status() {
        TodoReminderScheduler.createChannel(getContext());
        JSObject result = new JSObject();
        result.put("supported", true);
        result.put("notifications", TodoReminderScheduler.notificationsEnabled(getContext()));
        result.put("exact", TodoReminderScheduler.canScheduleExact(getContext()));
        result.put("background", true);
        JSObject calendar = new JSObject();
        calendar.put("supported", TodoReminderCalendar.supported(getContext()));
        calendar.put("granted", TodoReminderCalendar.granted(getContext()));
        calendar.put("error", TodoReminderCalendar.error(getContext()));
        result.put("calendar", calendar);
        return result;
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod
    public void sync(PluginCall call) {
        JSArray reminders = call.getArray("reminders");
        if (reminders == null) { call.reject("Missing reminder snapshot"); return; }
        try {
            TodoReminderScheduler.sync(getContext(), reminders);
            call.resolve(status());
        } catch (Exception error) {
            call.reject("Unable to save or schedule local reminders", error);
        }
    }

    @PluginMethod
    public void requestNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationResult");
        } else {
            call.resolve(status());
        }
    }

    @PermissionCallback
    private void notificationResult(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod
    public void requestCalendar(PluginCall call) {
        if (!TodoReminderCalendar.supported(getContext())) { call.resolve(status()); return; }
        if (!TodoReminderCalendar.granted(getContext())) {
            requestPermissionForAlias("calendar", call, "calendarResult");
        } else {
            calendarResult(call);
        }
    }

    @PermissionCallback
    private void calendarResult(PluginCall call) {
        getBridge().execute(() -> {
            try { TodoReminderScheduler.restore(getContext()); }
            catch (Exception error) { Log.e("TodoReminder", "Unable to restore reminders after calendar permission", error); }
            call.resolve(status());
        });
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        String kind = call.getString("kind", "notifications");
        Intent intent;
        if ("exact".equals(kind) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                Uri.parse("package:" + getContext().getPackageName()));
        } else if (!"calendar".equals(kind) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            intent = new Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS)
                .putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName())
                .putExtra(Settings.EXTRA_CHANNEL_ID, TodoReminderScheduler.CHANNEL_ID);
        } else {
            intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:" + getContext().getPackageName()));
        }
        try {
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Unable to open reminder settings", error);
        }
    }

    @PluginMethod
    public void consumeNavigation(PluginCall call) {
        android.content.SharedPreferences store = getContext().getSharedPreferences(NAVIGATION_PREFS, Context.MODE_PRIVATE);
        String id = store.getString("todoId", null);
        store.edit().remove("todoId").commit();
        JSObject result = new JSObject();
        if (id != null) result.put("todoId", id);
        call.resolve(result);
    }
}
