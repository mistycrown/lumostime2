/**
 * @file TodoReminderCalendar.java
 * @input Durable opt-in reminder snapshot and explicitly granted calendar permissions
 * @output Atomic reconciliation of owned events in a dedicated local system calendar
 * @pos Native calendar integration; calendar application owns notification delivery
 * @updated 2026-10-18: Adds local calendar fallback with stable identities and isolated errors.
 */
package com.mistycrown.lumostime;

import android.Manifest;
import android.content.ContentProviderOperation;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.provider.CalendarContract;
import android.provider.CalendarContract.Calendars;
import android.provider.CalendarContract.Events;
import android.provider.CalendarContract.Reminders;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.TimeZone;

public final class TodoReminderCalendar {
    private static final String PREFS = "lumostime_todo_calendar";
    private static final String NAME = "lumostime_todo_reminders";
    private TodoReminderCalendar() {}

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static boolean supported(Context context) {
        return context.getPackageManager().resolveContentProvider(CalendarContract.AUTHORITY, 0) != null;
    }

    public static boolean granted(Context context) {
        return context.checkSelfPermission(Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED
            && context.checkSelfPermission(Manifest.permission.WRITE_CALENDAR) == PackageManager.PERMISSION_GRANTED;
    }

    public static String error(Context context) { return prefs(context).getString("error", ""); }

    private static void report(Context context, String message) {
        if (!message.equals(error(context))) prefs(context).edit().putString("error", message).commit();
    }

    private static Uri ownedUri(Context context, Uri uri) {
        return uri.buildUpon().appendQueryParameter(CalendarContract.CALLER_IS_SYNCADAPTER, "true")
            .appendQueryParameter(Calendars.ACCOUNT_NAME, context.getPackageName())
            .appendQueryParameter(Calendars.ACCOUNT_TYPE, CalendarContract.ACCOUNT_TYPE_LOCAL).build();
    }

    private static long calendarId(Context context, boolean create) {
        ContentResolver resolver = context.getContentResolver();
        try (Cursor cursor = resolver.query(Calendars.CONTENT_URI, new String[] { Calendars._ID },
            Calendars.ACCOUNT_NAME + "=? AND " + Calendars.ACCOUNT_TYPE + "=? AND " + Calendars.NAME + "=?",
            new String[] { context.getPackageName(), CalendarContract.ACCOUNT_TYPE_LOCAL, NAME }, null)) {
            if (cursor == null) throw new IllegalStateException("Calendar query unavailable");
            if (cursor.moveToFirst()) return cursor.getLong(0);
        }
        if (!create) return -1;
        ContentValues values = new ContentValues();
        values.put(Calendars.ACCOUNT_NAME, context.getPackageName());
        values.put(Calendars.ACCOUNT_TYPE, CalendarContract.ACCOUNT_TYPE_LOCAL);
        values.put(Calendars.NAME, NAME);
        values.put(Calendars.CALENDAR_DISPLAY_NAME, "LumosTime 待办提醒");
        values.put(Calendars.OWNER_ACCOUNT, context.getPackageName());
        values.put(Calendars.CALENDAR_COLOR, Color.rgb(120, 113, 108));
        values.put(Calendars.CALENDAR_ACCESS_LEVEL, Calendars.CAL_ACCESS_OWNER);
        values.put(Calendars.CALENDAR_TIME_ZONE, TimeZone.getDefault().getID());
        values.put(Calendars.VISIBLE, 1);
        values.put(Calendars.SYNC_EVENTS, 1);
        values.put(Calendars.MAX_REMINDERS, 1);
        values.put(Calendars.ALLOWED_REMINDERS, String.valueOf(Reminders.METHOD_ALERT));
        Uri inserted = resolver.insert(ownedUri(context, Calendars.CONTENT_URI), values);
        if (inserted == null) throw new IllegalStateException("Calendar creation unavailable");
        return ContentUris.parseId(inserted);
    }

    private static List<TodoReminderCalendarPlan.Event> desired(JSONArray reminders) throws Exception {
        List<TodoReminderCalendarPlan.Event> result = new ArrayList<>();
        TimeZone zone = TimeZone.getDefault();
        for (int i = 0; i < reminders.length(); i++) {
            JSONObject entry = reminders.getJSONObject(i);
            if (!Boolean.TRUE.equals(entry.opt("calendarSync"))) continue;
            long at;
            try {
                at = TodoReminderTime.triggerAt(entry.getString("date"), entry.getInt("daysBefore"),
                    entry.getString("time"), zone);
            } catch (IllegalArgumentException invalidTime) { continue; }
            String description = ("deadlineDate".equals(entry.getString("field")) ? "截止日期：" : "安排日期：")
                + entry.getString("date") + "\nLumosTime";
            String key = "lumostime://todo-reminder/" + Uri.encode(entry.getString("id"));
            result.add(new TodoReminderCalendarPlan.Event(0, key, entry.getString("title"), description, zone.getID(), at, true));
        }
        return result;
    }

    private static boolean reminderReady(ContentResolver resolver, long id) {
        try (Cursor cursor = resolver.query(Reminders.CONTENT_URI,
            new String[] { Reminders.MINUTES, Reminders.METHOD }, Reminders.EVENT_ID + "=?",
            new String[] { String.valueOf(id) }, null)) {
            if (cursor == null) throw new IllegalStateException("Reminder query unavailable");
            return cursor.getCount() == 1 && cursor.moveToFirst()
                && cursor.getInt(0) == 0 && cursor.getInt(1) == Reminders.METHOD_ALERT;
        }
    }

    private static List<TodoReminderCalendarPlan.Event> existing(Context context, long calendarId) {
        List<TodoReminderCalendarPlan.Event> result = new ArrayList<>();
        ContentResolver resolver = context.getContentResolver();
        try (Cursor cursor = resolver.query(Events.CONTENT_URI,
            new String[] { Events._ID, Events.CUSTOM_APP_URI, Events.TITLE, Events.DESCRIPTION, Events.EVENT_TIMEZONE, Events.DTSTART },
            Events.CALENDAR_ID + "=? AND " + Events.CUSTOM_APP_PACKAGE + "=? AND " + Events.DELETED + "=0",
            new String[] { String.valueOf(calendarId), context.getPackageName() }, Events._ID + " ASC")) {
            if (cursor == null) throw new IllegalStateException("Event query unavailable");
            while (cursor.moveToNext()) {
                String key = cursor.getString(1);
                // Never manage manually created or foreign calendar events, even in our calendar.
                if (key == null || !key.startsWith("lumostime://todo-reminder/")) continue;
                long id = cursor.getLong(0);
                result.add(new TodoReminderCalendarPlan.Event(id, key, cursor.getString(2), cursor.getString(3),
                    cursor.getString(4), cursor.getLong(5), reminderReady(resolver, id)));
            }
        }
        return result;
    }

    public static void reconcile(Context context, JSONArray reminders) {
        boolean requested = false;
        for (int i = 0; i < reminders.length(); i++) {
            JSONObject entry = reminders.optJSONObject(i);
            if (entry != null && Boolean.TRUE.equals(entry.opt("calendarSync"))) requested = true;
        }
        // A retained marker also tracks cleanup work when permission is revoked after a previous sync.
        boolean managed = prefs(context).getBoolean("managed", false);
        if (!requested && !managed) { report(context, ""); return; }
        if (!supported(context)) { report(context, "此设备没有可用的系统日历"); return; }
        if (!granted(context)) {
            report(context, "系统日历权限未开启，同步或清理暂停；请恢复日历权限");
            return;
        }
        try {
            List<TodoReminderCalendarPlan.Event> targets = desired(reminders);
            long now = System.currentTimeMillis();
            boolean hasFuture = false;
            for (TodoReminderCalendarPlan.Event target : targets) if (target.at > now) hasFuture = true;
            // Persist before the first external write, so an interrupted sync can clean up on retry.
            if (!managed && !prefs(context).edit().putBoolean("managed", true).commit()) {
                throw new IllegalStateException("Unable to save calendar ownership");
            }
            long id = calendarId(context, hasFuture);
            if (id >= 0) apply(context, id, TodoReminderCalendarPlan.plan(targets, existing(context, id), now));
            if (!requested) prefs(context).edit().putBoolean("managed", false).commit();
            report(context, "");
        } catch (Exception failure) {
            Log.e("TodoReminderCalendar", "Calendar reconciliation failed", failure);
            report(context, "系统日历同步失败，请检查日历权限后重新打开应用");
        }
    }

    private static void apply(Context context, long calendarId, List<TodoReminderCalendarPlan.Change> changes) throws Exception {
        ArrayList<ContentProviderOperation> operations = new ArrayList<>();
        for (TodoReminderCalendarPlan.Change change : changes) {
            if (change.after == null) {
                operations.add(ContentProviderOperation.newDelete(ownedUri(context,
                    ContentUris.withAppendedId(Events.CONTENT_URI, change.before.rowId))).build());
                continue;
            }
            TodoReminderCalendarPlan.Event event = change.after;
            ContentValues values = new ContentValues();
            values.put(Events.CALENDAR_ID, calendarId);
            values.put(Events.CUSTOM_APP_PACKAGE, context.getPackageName());
            values.put(Events.CUSTOM_APP_URI, event.key);
            values.put(Events.TITLE, event.title);
            values.put(Events.DESCRIPTION, event.description);
            values.put(Events.DTSTART, event.at);
            values.put(Events.DTEND, event.at + 60000L);
            values.put(Events.EVENT_TIMEZONE, event.timezone);
            values.put(Events.AVAILABILITY, Events.AVAILABILITY_FREE);
            int eventIndex = operations.size();
            if (change.before == null) {
                operations.add(ContentProviderOperation.newInsert(ownedUri(context, Events.CONTENT_URI)).withValues(values).build());
            } else {
                operations.add(ContentProviderOperation.newUpdate(ownedUri(context,
                    ContentUris.withAppendedId(Events.CONTENT_URI, change.before.rowId))).withValues(values).withExpectedCount(1).build());
            }
            if (!change.needsReminder()) continue;
            if (change.before != null) {
                operations.add(ContentProviderOperation.newDelete(ownedUri(context, Reminders.CONTENT_URI))
                    .withSelection(Reminders.EVENT_ID + "=?", new String[] { String.valueOf(change.before.rowId) }).build());
            }
            ContentProviderOperation.Builder reminder = ContentProviderOperation.newInsert(ownedUri(context, Reminders.CONTENT_URI))
                .withValue(Reminders.MINUTES, 0).withValue(Reminders.METHOD, Reminders.METHOD_ALERT);
            if (change.before == null) reminder.withValueBackReference(Reminders.EVENT_ID, eventIndex);
            else reminder.withValue(Reminders.EVENT_ID, change.before.rowId);
            operations.add(reminder.build());
        }
        if (!operations.isEmpty()) context.getContentResolver().applyBatch(CalendarContract.AUTHORITY, operations);
    }
}
