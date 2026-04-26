# Plugins Layer

The `plugins/` directory contains definitions and implementations for Capacitor plugins used to access native device features.

## Architecture

LumosTime uses Capacitor to bridge the web application with native Android APIs.
*   **Interfaces**: Typed interfaces (e.g., `AppUsagePlugin.ts`, `FocusNotificationPlugin.ts`) define the contract for native calls.
*   **Web Fallbacks**: `web.ts` provides mock implementations to prevent the app from crashing when running in a browser environment (simulating native features with console logs).
*   **Native Implementation**: The actual Java/Kotlin code resides in the `android/` directory (not shown here).

## Key Plugins

*   **AppUsagePlugin**: Monitors app usage stats and manages accessibility permissions for auto-tracking.
*   **FocusNotificationPlugin**: Controls the floating window overlay (Xiaomi Super Island style) and related Android permission handoff, while the persistent runtime status notification is now shared with the assistant agent service on native Android.
*   **AssistantAgentPlugin**: Starts and stops the Android-first background AI agent service, updates lightweight polling config, emits native assistant system-trigger events back to the web layer, surfaces AI active-message system notifications, and exposes one-shot notification-navigation payloads so taps can reopen the shared AI chat at the exact background reply.
