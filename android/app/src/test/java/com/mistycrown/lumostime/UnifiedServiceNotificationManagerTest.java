package com.mistycrown.lumostime;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.content.Context;

import androidx.test.core.app.ApplicationProvider;

import org.junit.Before;
import org.junit.Test;

public class UnifiedServiceNotificationManagerTest {
    private Context context;

    @Before
    public void setUp() {
        context = ApplicationProvider.getApplicationContext();
        UnifiedServiceNotificationManager.clearAssistantState(context);
    }

    @Test
    public void isAssistantEnabledTracksPersistedAssistantState() {
        assertFalse(UnifiedServiceNotificationManager.isAssistantEnabled(context));

        UnifiedServiceNotificationManager.setAssistantState(
            context,
            true,
            true,
            true,
            5,
            0L
        );

        assertTrue(UnifiedServiceNotificationManager.isAssistantEnabled(context));

        UnifiedServiceNotificationManager.clearAssistantState(context);

        assertFalse(UnifiedServiceNotificationManager.isAssistantEnabled(context));
    }
}
