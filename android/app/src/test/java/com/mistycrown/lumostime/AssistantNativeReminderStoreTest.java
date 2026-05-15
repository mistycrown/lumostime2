package com.mistycrown.lumostime;

import static org.junit.Assert.assertEquals;

import android.content.Context;

import androidx.test.core.app.ApplicationProvider;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Before;
import org.junit.Test;

public class AssistantNativeReminderStoreTest {
    private Context context;

    @Before
    public void setUp() {
        context = ApplicationProvider.getApplicationContext();
        AssistantNativeReminderStore.save(context, new JSONArray());
    }

    @Test
    public void markDispatchedRemovesOnlyTheMatchedReminder() throws Exception {
        JSONArray reminders = new JSONArray()
            .put(new JSONObject()
                .put("id", "reminder-1")
                .put("type", "self_followup")
                .put("dueAt", "2026-05-15T01:00:00.000Z")
                .put("status", "pending")
                .put("text", "first")
                .put("source", "system")
                .put("createdAt", "2026-05-15T00:55:00.000Z"))
            .put(new JSONObject()
                .put("id", "reminder-2")
                .put("type", "self_followup")
                .put("dueAt", "2026-05-15T02:00:00.000Z")
                .put("status", "pending")
                .put("text", "second")
                .put("source", "system")
                .put("createdAt", "2026-05-15T01:55:00.000Z"));

        AssistantNativeReminderStore.save(context, reminders);

        AssistantNativeReminderStore.markDispatched(
            context,
            "reminder-1",
            "2026-05-15T01:00:05.000Z"
        );

        JSONArray remaining = AssistantNativeReminderStore.list(context);
        assertEquals(1, remaining.length());
        assertEquals("reminder-2", remaining.getJSONObject(0).getString("id"));
    }
}
