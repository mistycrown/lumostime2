/**
 * @file TodoReminderCalendarPlan.java
 * @input Desired opt-in calendar events, existing owned events and current time
 * @output Idempotent insert/update/delete operations without Android dependencies
 * @pos Native calendar reconciliation policy
 * @updated 2026-10-18: Prevents duplicate events and retrospective reminder creation.
 */
package com.mistycrown.lumostime;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public final class TodoReminderCalendarPlan {
    private TodoReminderCalendarPlan() {}

    public static final class Event {
        public final long rowId;
        public final String key, title, description, timezone;
        public final long at;
        public final boolean reminderReady;

        public Event(long rowId, String key, String title, String description, String timezone,
                     long at, boolean reminderReady) {
            this.rowId = rowId;
            this.key = key;
            this.title = title;
            this.description = description;
            this.timezone = timezone;
            this.at = at;
            this.reminderReady = reminderReady;
        }

        private boolean sameContent(Event other) {
            return at == other.at && Objects.equals(title, other.title)
                && Objects.equals(description, other.description) && Objects.equals(timezone, other.timezone);
        }
    }

    public static final class Change {
        public final Event before, after; // null before = insert; null after = delete.
        Change(Event before, Event after) { this.before = before; this.after = after; }
        public boolean needsReminder() {
            return after != null && (before == null || before.at != after.at || !before.reminderReady);
        }
    }

    public static List<Change> plan(List<Event> desired, List<Event> existing, long now) {
        List<Change> changes = new ArrayList<>();
        Map<String, Event> remaining = new HashMap<>();
        for (Event event : existing) {
            // Recover from duplicates left by an interrupted/older implementation.
            if (remaining.containsKey(event.key)) changes.add(new Change(event, null));
            else remaining.put(event.key, event);
        }
        for (Event target : desired) {
            Event old = remaining.remove(target.key);
            if (target.at <= now) {
                // Retain an unchanged historical event, but never insert/rearm a past reminder.
                if (old != null && old.at != target.at) changes.add(new Change(old, null));
                continue;
            }
            if (old == null || !old.sameContent(target) || !old.reminderReady) changes.add(new Change(old, target));
        }
        for (Event old : remaining.values()) changes.add(new Change(old, null));
        return changes;
    }
}
