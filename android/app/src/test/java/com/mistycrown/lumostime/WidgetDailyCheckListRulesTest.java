package com.mistycrown.lumostime;

import org.junit.Test;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

/**
 * @file WidgetDailyCheckListRulesTest.java
 * @input Daily-list tap metadata and dates, without Android runtime dependencies.
 * @output Regression checks for read-only items, stale taps and capped increments.
 * @updated 2026-10-29: Adds isolated JVM checks for the daily-list widget.
 */
public class WidgetDailyCheckListRulesTest {
    private static final String TODAY = "2026-10-29";

    @Test public void binaryChecksCanBeCompletedAndCancelled() {
        assertEquals("toggle", action("manual", "binary", 0, 1, TODAY));
        assertEquals("toggle", action("manual", "binary", 1, 1, TODAY));
    }

    @Test public void automaticAndLegacyUnknownItemsAreReadOnly() {
        assertNull(action("auto", "binary", 0, 1, TODAY));
        assertNull(action(null, "binary", 0, 1, TODAY));
        assertNull(action("", "count", 0, 8, TODAY));
    }

    @Test public void countActionsIncrementWithoutResettingAtTheTarget() {
        assertEquals("increment", action("manual", "count", 0, 8, TODAY));
        assertEquals("increment", action("manual", "count", 7, 8, TODAY));
        assertNull(action("manual", "count", 8, 8, TODAY));
        assertNull(action("manual", "count", 12, 8, TODAY));
    }

    @Test public void staleOrMissingRenderedDatesCannotChangeTodaysProgress() {
        assertNull(action("manual", "binary", 0, 1, "2026-10-28"));
        assertNull(action("manual", "count", 3, 8, "2026-10-30"));
        assertNull(action("manual", "binary", 0, 1, null));
        assertNull(WidgetDailyCheckListRules.actionMode("manual", "binary", 0, 1, "", ""));
    }

    @Test public void invalidTargetsAndModesCannotQueueActions() {
        assertNull(action("manual", "count", 0, 0, TODAY));
        assertNull(action("manual", "count", 0, -8, TODAY));
        assertNull(action("manual", "other", 0, 1, TODAY));
    }

    private String action(String type, String mode, int count, int target, String date) {
        return WidgetDailyCheckListRules.actionMode(type, mode, count, target, date, TODAY);
    }
}
