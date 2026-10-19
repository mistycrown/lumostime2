/**
 * @file TodoReminderCalendarPlanTest.java
 * @input Owned calendar snapshots, edits, cancellation, duplicates and past times
 * @output Standalone reconciliation regression checks without an Android build
 * @pos Native calendar policy test
 * @updated 2026-10-18: Covers idempotence, source isolation, reminder repair and no retrospective alerts.
 */
package com.mistycrown.lumostime;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public final class TodoReminderCalendarPlanTest {
    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    private static TodoReminderCalendarPlan.Event event(long row, String key, String title, long at, boolean ready) {
        return new TodoReminderCalendarPlan.Event(row, key, title, "安排日期：2026-10-20", "Asia/Shanghai", at, ready);
    }

    public static void main(String[] args) {
        TodoReminderCalendarPlan.Event arranged = event(11, "t:scheduledDate", "提交论文", 2000, true);
        TodoReminderCalendarPlan.Event deadline = event(12, "t:deadlineDate", "提交论文", 3000, true);
        List<TodoReminderCalendarPlan.Event> both = Arrays.asList(arranged, deadline);
        check(TodoReminderCalendarPlan.plan(both, both, 1000).isEmpty(), "Repeated saves/resume must be idempotent");

        List<TodoReminderCalendarPlan.Change> insert = TodoReminderCalendarPlan.plan(both, Collections.emptyList(), 1000);
        check(insert.size() == 2 && insert.get(0).before == null && insert.get(1).needsReminder(), "Independent sources need separate reminders");

        List<TodoReminderCalendarPlan.Change> cancel = TodoReminderCalendarPlan.plan(Collections.singletonList(deadline), both, 1000);
        check(cancel.size() == 1 && cancel.get(0).before.rowId == 11 && cancel.get(0).after == null,
            "Disabling one source must preserve the other source");
        check(TodoReminderCalendarPlan.plan(Collections.emptyList(), both, 1000).size() == 2,
            "Completion, deletion or disabling all calendar sync must clean owned events");

        TodoReminderCalendarPlan.Event renamed = event(0, arranged.key, "提交修改稿", arranged.at, true);
        TodoReminderCalendarPlan.Change rename = TodoReminderCalendarPlan.plan(Collections.singletonList(renamed),
            Collections.singletonList(arranged), 1000).get(0);
        check(rename.before.rowId == 11 && !rename.needsReminder(), "Renaming must preserve the event and existing alert");

        TodoReminderCalendarPlan.Event moved = event(0, arranged.key, arranged.title, 4000, true);
        TodoReminderCalendarPlan.Change reschedule = TodoReminderCalendarPlan.plan(Collections.singletonList(moved),
            Collections.singletonList(arranged), 1000).get(0);
        check(reschedule.before.rowId == 11 && reschedule.after.at == 4000 && reschedule.needsReminder(),
            "Rescheduling must replace the alert on the existing event");

        TodoReminderCalendarPlan.Event changedZone = new TodoReminderCalendarPlan.Event(0, arranged.key,
            arranged.title, arranged.description, "America/New_York", 5000, true);
        check(TodoReminderCalendarPlan.plan(Collections.singletonList(changedZone), Collections.singletonList(arranged), 1000)
            .get(0).needsReminder(), "Timezone projection must rebuild future alarms");

        TodoReminderCalendarPlan.Event broken = event(11, arranged.key, arranged.title, arranged.at, false);
        check(TodoReminderCalendarPlan.plan(Collections.singletonList(arranged), Collections.singletonList(broken), 1000)
            .get(0).needsReminder(), "An interrupted or deleted alert must be repaired");
        check(TodoReminderCalendarPlan.plan(Collections.singletonList(arranged), Collections.singletonList(broken), 2500).isEmpty(),
            "Do not repair alerts after their trigger time");
        check(TodoReminderCalendarPlan.plan(Collections.singletonList(arranged), Collections.emptyList(), 2500).isEmpty(),
            "Do not create past events during permission recovery/import");
        check(TodoReminderCalendarPlan.plan(Collections.singletonList(arranged), Collections.singletonList(arranged), 2500).isEmpty(),
            "Keep historical events without rearming them");
        check(TodoReminderCalendarPlan.plan(Collections.singletonList(event(0, arranged.key, arranged.title, 500, true)),
            Collections.singletonList(arranged), 1000).get(0).after == null, "Moving into the past must cancel the old future alert");

        TodoReminderCalendarPlan.Event duplicate = event(99, arranged.key, arranged.title, arranged.at, true);
        List<TodoReminderCalendarPlan.Change> dedupe = TodoReminderCalendarPlan.plan(Collections.singletonList(arranged),
            Arrays.asList(arranged, duplicate), 1000);
        check(dedupe.size() == 1 && dedupe.get(0).before.rowId == 99 && dedupe.get(0).after == null,
            "Duplicate recovery must retain exactly one stable event");
        System.out.println("PASS: calendar idempotence, independent sources, cleanup, edits, timezone, alert repair, past times and deduplication");
    }
}
