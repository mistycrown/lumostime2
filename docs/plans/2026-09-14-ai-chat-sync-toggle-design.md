# AI Chat Sync Toggle Design

## Goal

Allow users to keep AI chat history local while continuing to sync the remaining AI settings and assistant data.

## Behavior

- The preference is stored locally and defaults to enabled.
- When enabled, the existing backup payload includes chat sessions and background call history.
- When disabled, sessions and background call history are emitted as empty collections. Debug exchanges embedded in those records are therefore excluded too.
- Persona settings, prompts, user profile, AI presets, memory, reminders, scheduled tasks, letters, and Dream state remain syncable.
- Restore treats a disabled/empty chat section as intentionally omitted and never replaces existing local chat history with an empty array.

## UI

Place a native styled checkbox directly below the user-avatar controls in the persona settings panel, using the existing theme tokens and spacing.

## Compatibility

The existing backup payload version and shape remain valid. Older payloads without the preference field are treated as sync-enabled. The preference is device-local so opting out cannot be undone by a remote restore.
