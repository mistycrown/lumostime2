/**
 * @file AssistantNativePromptBuilderTest.java
 * @input Cached 09:00 prompts, 11:00 executions, UTC reminders, and midnight/DST cases
 * @output JVM regression checks for native prompt time anchors and trigger instants
 * @pos Native Test
 * @updated 2026-10-14: Covers current execution time, calendar rollover, preserved snapshot dates, and timezone normalization.
 */
package com.mistycrown.lumostime;

import org.json.JSONObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import java.time.OffsetDateTime;
import java.util.TimeZone;
import static org.junit.Assert.*;

public class AssistantNativePromptBuilderTest {
    private TimeZone originalZone;

    @Before
    public void setUp() {
        originalZone = TimeZone.getDefault();
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Shanghai"));
    }

    @After
    public void tearDown() {
        TimeZone.setDefault(originalZone);
    }

    private String snapshot() {
        return "Base prompt\n=== Stable State Context ===\n"
            + "{\"currentLocalDate\":\"2026-10-14\",\"tomorrowDate\":\"2026-10-15\",\"timelineSummaryForDate\":\"saved summary\"}"
            + "\n=== Volatile State Anchors ===\n"
            + "{\"currentDateTime\":\"2026-10-14T09:15:00+08:00\",\"stateContextDate\":\"2026-10-14\",\"activeSessionSummary\":\"saved focus\"}"
            + "\n=== Memory Snapshot ===\n{\"updatedAt\":\"2026-10-14T09:15:00+08:00\"}";
    }

    private JSONObject section(String prompt, String label) throws Exception {
        int start = prompt.indexOf("=== " + label + " ===\n") + label.length() + 9;
        int end = prompt.indexOf("\n=== ", start);
        return new JSONObject(prompt.substring(start, end < 0 ? prompt.length() : end));
    }

    @Test
    public void usesElevenOClockExecutionInsteadOfNineOClockSnapshot() throws Exception {
        String prompt = AssistantNativePromptBuilder.buildSystemPrompt(snapshot(), "2026-10-14T11:00:00+08:00");
        JSONObject clock = section(prompt, "Volatile State Anchors");
        assertEquals("2026-10-14T11:00:00+08:00", clock.getString("currentDateTime"));
        assertEquals("saved focus", clock.getString("activeSessionSummary"));
        assertEquals("saved summary", section(prompt, "Stable State Context").getString("timelineSummaryForDate"));
        assertEquals("2026-10-14T09:15:00+08:00", section(prompt, "Memory Snapshot").getString("updatedAt"));
    }

    @Test
    public void refreshesCalendarAcrossMidnightWithoutRedatingAppSummaries() throws Exception {
        String prompt = AssistantNativePromptBuilder.buildSystemPrompt(snapshot(), "2026-10-15T00:00:05+08:00");
        JSONObject calendar = section(prompt, "Stable State Context");
        assertEquals("2026-10-15", calendar.getString("currentLocalDate"));
        assertEquals("周四", calendar.getString("currentWeekday"));
        assertEquals("2026-10-16", calendar.getString("tomorrowDate"));
        assertEquals("2026-10-17", calendar.getString("dayAfterTomorrowDate"));
        assertEquals("2026-10-11..2026-10-17", calendar.getString("currentWeekRange"));
        assertEquals("2026-10-22", calendar.getJSONObject("nextWeekdayDates").getString("nextThursday"));
        assertEquals("2026-10-14", section(prompt, "Volatile State Anchors").getString("stateContextDate"));
    }

    @Test
    public void addsCurrentClockToSnapshotsWithoutStateSections() throws Exception {
        String prompt = AssistantNativePromptBuilder.buildSystemPrompt("Base prompt", "2026-10-14T11:00:00+08:00");
        assertEquals("2026-10-14T11:00:00+08:00", section(prompt, "Volatile State Anchors").getString("currentDateTime"));
    }

    @Test
    public void localizesUtcReminderWithoutMutatingOriginalTrigger() throws Exception {
        JSONObject trigger = new JSONObject()
            .put("createdAt", "2026-10-14T03:00:05Z")
            .put("metadata", new JSONObject().put("scheduledDueAt", "2026-10-14T03:00:00Z")
                .put("actualDispatchAt", "2026-10-14T03:00:05Z").put("delayMinutes", 0));
        String prompt = AssistantNativePromptBuilder.buildUserPrompt(trigger, "");
        JSONObject local = section(prompt, "Trigger");
        OffsetDateTime dueAt = OffsetDateTime.parse(local.getJSONObject("metadata").getString("scheduledDueAt"));
        assertEquals(11, dueAt.getHour());
        assertEquals(8 * 3600, dueAt.getOffset().getTotalSeconds());
        assertEquals(AssistantTimeParser.parseIsoDateTime("2026-10-14T03:00:00Z"), dueAt.toInstant().toEpochMilli());
        assertEquals("2026-10-14T03:00:00Z", trigger.getJSONObject("metadata").getString("scheduledDueAt"));
        assertEquals(0, local.getJSONObject("metadata").getInt("delayMinutes"));
    }

    @Test
    public void handlesMidnightAndDstWithoutChangingInstants() {
        assertTrue(AssistantTimeParser.formatLocalDateTime("2026-10-14T16:00:05Z").startsWith("2026-10-15T00:00:05"));
        TimeZone.setDefault(TimeZone.getTimeZone("America/New_York"));
        assertTrue(AssistantTimeParser.formatLocalDateTime("2026-11-01T05:30:00Z").endsWith("-04:00"));
        assertTrue(AssistantTimeParser.formatLocalDateTime("2026-11-01T06:30:00Z").endsWith("-05:00"));
        assertEquals(3600000L, AssistantTimeParser.parseIsoDateTime("2026-11-01T01:30:00-05:00")
            - AssistantTimeParser.parseIsoDateTime("2026-11-01T01:30:00-04:00"));
    }

    @Test
    public void preservesInvalidTimeForDiagnostics() {
        assertEquals("invalid", AssistantTimeParser.formatLocalDateTime("invalid"));
        assertEquals("", AssistantTimeParser.formatLocalDateTime(""));
        assertEquals(-1L, AssistantTimeParser.parseIsoDateTime("2026-10-14T11:00:00"));
    }
}
