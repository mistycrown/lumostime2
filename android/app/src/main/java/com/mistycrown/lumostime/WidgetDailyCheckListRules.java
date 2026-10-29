package com.mistycrown.lumostime;

/**
 * @file WidgetDailyCheckListRules.java
 * @input Daily metadata, current count, and the rendered/current local dates.
 * @output A replay action or null for read-only, stale, invalid or completed count rows.
 * @updated 2026-10-29: Adds Android-independent tap rules for the quick-check list.
 */
public final class WidgetDailyCheckListRules {
    private WidgetDailyCheckListRules() {}

    public static String actionMode(
            String type, String manualMode, int currentCount, int targetCount,
            String renderedDate, String todayDate
    ) {
        if (!"manual".equals(type) || todayDate == null || todayDate.isEmpty()
                || !todayDate.equals(renderedDate)) return null;
        if ("binary".equals(manualMode)) return "toggle";
        if (!"count".equals(manualMode) || targetCount < 1 || currentCount >= targetCount) return null;
        return "increment";
    }
}
