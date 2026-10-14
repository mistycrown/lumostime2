/**
 * @file AssistantNativePromptBuilder.java
 * @input Cached assistant prompts, execution timestamps, and trigger payloads
 * @output Native prompts with current local clock/calendar anchors and local reminder times
 * @pos Native Helper
 * @description Refreshes execution time independently of cached app state summaries.
 * @updated 2026-10-14: Extracted native prompt time refresh and trigger normalization for JVM verification.
 */
package com.mistycrown.lumostime;

import org.json.JSONException;
import org.json.JSONObject;
import java.time.OffsetDateTime;
import java.time.LocalDate;

public final class AssistantNativePromptBuilder {
    private AssistantNativePromptBuilder() {
    }

    public static String buildSystemPrompt(String snapshotPrompt, String requestedAt) throws JSONException {
        LocalDate today = OffsetDateTime.parse(requestedAt).toLocalDate();
        String[] weekdays = { "周日", "周一", "周二", "周三", "周四", "周五", "周六" };
        String[] nextWeekdayKeys = { "nextSunday", "nextMonday", "nextTuesday", "nextWednesday", "nextThursday", "nextFriday", "nextSaturday" };
        int weekday = today.getDayOfWeek().getValue() % 7;
        LocalDate weekStart = today.minusDays(weekday);
        JSONObject calendar = new JSONObject();
        calendar.put("currentLocalDate", today.toString());
        calendar.put("currentWeekday", weekdays[weekday]);
        calendar.put("tomorrowDate", today.plusDays(1).toString());
        calendar.put("dayAfterTomorrowDate", today.plusDays(2).toString());
        calendar.put("currentWeekRange", weekStart + ".." + weekStart.plusDays(6));
        JSONObject nextWeekdays = new JSONObject();
        for (int index = 0; index < nextWeekdayKeys.length; index += 1) {
            int delta = (index - weekday + 7) % 7;
            nextWeekdays.put(nextWeekdayKeys[index], today.plusDays(delta == 0 ? 7 : delta).toString());
        }
        calendar.put("nextWeekdayDates", nextWeekdays);
        JSONObject clock = new JSONObject().put("currentDateTime", requestedAt);
        String prompt = refreshPromptSection(snapshotPrompt, "Stable State Context", calendar);
        prompt = refreshPromptSection(prompt, "Volatile State Anchors", clock);
        return prompt + "\n=== Native Execution Time ===\n" + stringifyJson(clock)
            + "\nThis is the current device-local time. Date-based app summaries still refer to stateContextDate;"
            + " active-session and memory snapshots describe the last synced state, not a live observation.";
    }

    private static String refreshPromptSection(String prompt, String label, JSONObject updates) throws JSONException {
        String marker = "=== " + label + " ===\n";
        int markerStart = prompt.indexOf(marker);
        if (markerStart < 0) {
            return prompt + "\n" + marker + stringifyJson(updates);
        }
        int contentStart = markerStart + marker.length();
        int contentEnd = prompt.indexOf("\n=== ", contentStart);
        if (contentEnd < 0) {
            contentEnd = prompt.length();
        }
        JSONObject section = new JSONObject(prompt.substring(contentStart, contentEnd).trim());
        java.util.Iterator<String> keys = updates.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            section.put(key, updates.get(key));
        }
        return prompt.substring(0, contentStart) + stringifyJson(section) + prompt.substring(contentEnd);
    }

    public static String buildUserPrompt(JSONObject trigger, String conversationJson) throws JSONException {
        String normalizedConversation = conversationJson == null ? "" : conversationJson.trim();
        if (normalizedConversation.isEmpty()) {
            normalizedConversation = "{\"recentTurns\":[]}";
        }

        JSONObject localTrigger = new JSONObject(trigger.toString());
        localTrigger.put("createdAt", AssistantTimeParser.formatLocalDateTime(trigger.optString("createdAt", "")));
        JSONObject metadata = localTrigger.optJSONObject("metadata");
        if (metadata != null) {
            for (String key : new String[] { "scheduledDueAt", "scheduledFor", "actualDispatchAt" }) {
                if (metadata.has(key)) {
                    metadata.put(key, AssistantTimeParser.formatLocalDateTime(metadata.optString(key, "")));
                }
            }
        }
        return "=== Trigger ===\n"
            + stringifyJson(localTrigger)
            + "\n\n=== Conversation Context ===\n"
            + normalizedConversation
            + "\n\nReturn one JSON object only.";
    }

    private static String stringifyJson(JSONObject object) {
        if (object == null) {
            return "{}";
        }

        try {
            return object.toString(2);
        } catch (JSONException error) {
            return object.toString();
        }
    }

}
