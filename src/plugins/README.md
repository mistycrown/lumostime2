# Plugins Layer

The `plugins/` directory contains definitions and implementations for Capacitor plugins used to access native device features.

## Architecture

LumosTime uses Capacitor to bridge the web application with native Android APIs.
*   **Interfaces**: Typed interfaces (e.g., `AppUsagePlugin.ts`, `FocusNotificationPlugin.ts`) define the contract for native calls.
*   **Web Fallbacks**: `web.ts` provides mock implementations to prevent the app from crashing when running in a browser environment (simulating native features with console logs).
*   **Native Implementation**: The actual Java/Kotlin code resides in the `android/` directory (not shown here).

## Key Plugins

*   **WidgetBridgePlugin**: Syncs Android widget templates, runtime state, TODAY + PIN mirrored source payloads, and now the `maybeDates` / recurrence `skipDates` metadata needed for native widget date-rollover rebuilds to stay aligned with the app's today schedule visibility.
*   **AppUsagePlugin**: Monitors app usage stats and manages accessibility permissions for auto-tracking.
*   **FocusNotificationPlugin**: Controls the floating window overlay (Xiaomi Super Island style), related Android permission handoff, resume-safe pending stop recovery, and app-session syncing for the shared Android runtime notification title, while the persistent runtime status notification is shared with the assistant agent service on native Android.
*   **AssistantAgentPlugin**: Starts and stops the Android-first background AI agent service, updates lightweight polling config, emits native assistant system-trigger events back to the web layer, exposes native diagnostic list/clear hooks plus live diagnostic update events for poll tracing, surfaces AI active-message system notifications, and exposes one-shot notification-navigation payloads so taps can reopen the shared AI chat at the exact background reply.
