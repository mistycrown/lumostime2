/**
 * @file AssistantTimeParser.java
 * @input Assistant ISO datetime strings
 * @output Epoch-millisecond parsing helpers for native reminder and background assistant flows
 * @pos Native Helper
 * @description Provides small date-time parsing helpers so Android-side reminder and background assistant code can evaluate local-offset ISO timestamps consistently.
 * @updated 2026-04-30: Added ISO datetime parsing helper for native reminder due checks and background diagnostics.
 */
package com.mistycrown.lumostime;

import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;

public final class AssistantTimeParser {
    private AssistantTimeParser() {
    }

    public static long parseIsoDateTime(String value) {
        if (value == null || value.trim().isEmpty()) {
            return -1L;
        }

        try {
            return OffsetDateTime.parse(value.trim()).toInstant().toEpochMilli();
        } catch (DateTimeParseException error) {
            return -1L;
        }
    }
}
