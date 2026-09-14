# AI Chat IndexedDB Migration Design

## Goal

Move large AI chat sessions and assistant background history out of `localStorage` while preserving the existing backup/cloud-sync payload shape and reading data written by older versions.

## Design

- Add a small storage adapter with an in-memory cache and two IndexedDB object stores.
- Keep the first render synchronous by reading the existing `localStorage` keys as a bootstrap snapshot.
- Initialize IndexedDB in the background. If the stores are empty, migrate the legacy JSON values into IndexedDB, then remove the large legacy keys only after a successful write/read verification.
- During initialization, writes update the in-memory cache and legacy storage; after IndexedDB becomes ready, subsequent writes use IndexedDB and the legacy keys are no longer written.
- If IndexedDB is unavailable or errors, continue using the existing `localStorage` implementation.
- Keep `AIBackupPayload` unchanged. Backup and restore code read/write through the adapter's synchronous cache API, so cloud sync remains format-compatible.
- Emit a storage-ready event so mounted chat UI state reloads after migration.

## Scope

The migrated records are `lumostime_ai_chat_sessions_v1` and `lumostime_assistant_background_call_history_v1`. Small settings such as active session id, personas, prompts, and debug mode remain in `localStorage`.

## Failure Handling

Migration is idempotent. Legacy keys are retained when IndexedDB initialization or verification fails. Storage errors are logged once and do not break chat rendering or sync.

## Verification

Add focused adapter tests for legacy bootstrap, migration, IndexedDB writes, and fallback behavior; run the existing service tests and production build.
