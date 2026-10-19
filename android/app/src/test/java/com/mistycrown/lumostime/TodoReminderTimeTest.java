/**
 * @file TodoReminderTimeTest.java
 * @input Date offsets, DST transitions and overdue reminder timestamps
 * @output Standalone Java regression checks, runnable without Gradle or an Android runtime
 * @pos Native time policy test (no Android dependencies)
 * @updated 2026-10-17: Verifies local calendar arithmetic and bounded one-shot delivery.
 */
package com.mistycrown.lumostime;

import java.util.Calendar;
import java.util.TimeZone;

public final class TodoReminderTimeTest {
    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    public static void main(String[] args) {
        TimeZone shanghai = TimeZone.getTimeZone("Asia/Shanghai");
        Calendar actual = Calendar.getInstance(shanghai);
        actual.setTimeInMillis(TodoReminderTime.triggerAt("2027-01-01", 1, "18:30", shanghai));
        check(actual.get(Calendar.YEAR) == 2026 && actual.get(Calendar.MONTH) == 11
            && actual.get(Calendar.DAY_OF_MONTH) == 31 && actual.get(Calendar.HOUR_OF_DAY) == 18
            && actual.get(Calendar.MINUTE) == 30, "Source-date offsets must cross years correctly");
        TimeZone newYork = TimeZone.getTimeZone("America/New_York");
        long before = TodoReminderTime.triggerAt("2026-03-09", 2, "09:00", newYork);
        long after = TodoReminderTime.triggerAt("2026-03-09", 0, "09:00", newYork);
        check(after - before == 47L * 60 * 60 * 1000, "DST must use calendar days rather than 24-hour offsets");
        for (String[] invalid : new String[][] { { "2026-02-30", "09:00" }, { "2026-10-20", "24:00" },
            { "2026-03-08", "02:30" }, { "2026-1-01", "09:00" } }) {
            boolean rejected = false;
            try { TodoReminderTime.triggerAt(invalid[0], 0, invalid[1], newYork); }
            catch (IllegalArgumentException expected) { rejected = true; }
            check(rejected, "Invalid or nonexistent local reminder times must be rejected");
        }
        long future = TodoReminderTime.triggerAt("2026-10-20", 0, "09:00", shanghai);
        check(future != TodoReminderTime.triggerAt("2026-10-20", 0, "09:00", newYork), "Timezone changes must rebuild timestamps");
        check(!TodoReminderTime.shouldDeliver(future, future - 1, false), "Do not fire early");
        check(TodoReminderTime.shouldDeliver(future, future + 60000, false), "Deliver recent missed alarms");
        check(!TodoReminderTime.shouldDeliver(future, future + 60000, true), "Do not redeliver consumed alarms");
        check(!TodoReminderTime.shouldDeliver(future, future + 86400001, false), "Do not flood old missed alarms");
        System.out.println("PASS: date offsets, DST, invalid times, timezone changes, overdue and delivered reminders");
    }
}
