/**
 * @file TodoReminderTime.java
 * @input Source date, calendar-day offset, HH:mm and current device timezone
 * @output Strict local reminder timestamps and bounded overdue-delivery decisions
 * @pos Native time policy (no Android dependencies)
 * @updated 2026-10-17: Adds calendar arithmetic that survives DST and rejects invalid local times.
 */
package com.mistycrown.lumostime;

import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.TimeZone;

public final class TodoReminderTime {
    private static final long MAX_LATENESS_MS = 24L * 60 * 60 * 1000;

    private TodoReminderTime() {}

    public static long triggerAt(String date, int daysBefore, String time, TimeZone zone) {
        if (date == null || !date.matches("\\d{4}-\\d{2}-\\d{2}") || time == null
            || !time.matches("([01]\\d|2[0-3]):[0-5]\\d") || Math.abs((long) daysBefore) > 3660) {
            throw new IllegalArgumentException("Invalid reminder date or time");
        }
        Calendar calendar = new GregorianCalendar(zone);
        calendar.setLenient(false);
        calendar.clear();
        calendar.set(Integer.parseInt(date.substring(0, 4)), Integer.parseInt(date.substring(5, 7)) - 1,
            Integer.parseInt(date.substring(8, 10)), 12, 0, 0);
        calendar.getTimeInMillis(); // Validate the source before applying calendar arithmetic.
        calendar.add(Calendar.DAY_OF_MONTH, -daysBefore);
        calendar.set(Calendar.HOUR_OF_DAY, Integer.parseInt(time.substring(0, 2)));
        calendar.set(Calendar.MINUTE, Integer.parseInt(time.substring(3, 5)));
        return calendar.getTimeInMillis();
    }

    public static boolean shouldDeliver(long triggerAt, long now, boolean delivered) {
        return !delivered && triggerAt <= now && now - triggerAt <= MAX_LATENESS_MS;
    }
}
