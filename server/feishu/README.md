# Feishu connection executors

2026-10-03: `personalService.ts` implements official personal-app registration followed by calendar device authorization. Pending codes and per-user app secrets stay encrypted; status returns only the consent page and stage. Provider intervals, single-flight polling, cancellation and exchanged-token recovery are enforced. An owned primary calendar identifies the same user across different private apps. This executor runs locally in Electron or inside the Web/Android connection service; public app credentials and callback registration are unnecessary in personal mode.

- `oauthStore.ts`: AES-256-GCM encrypted SQLite connections, hashed session IDs, one-use OAuth states and account-scoped category/import persistence. Disconnect deletes state and credentials while retaining encrypted import metadata for deduplication after reconnection.
- `oauthService.ts`: PKCE authorization-code flow with explicit consent, current v3 token exchange/refresh, user identity and writable calendars, serialized rotating-token refresh, safe status metadata and explicit test/Log imports. Shared and personal flows request `calendar:calendar calendar:calendar:readonly offline_access`: primary-calendar lookup requires a read scope that the write scope alone does not grant. App installation/availability errors give account-facing instructions instead of asking users to configure credentials.
- `httpApi.ts`: HTTP routes for `status`, `connect`, `callback`, `calendar`, `test`, `import`, `disconnect`, with HttpOnly cookies, strict origin policy and bounded JSON (256 KiB for import; 4 KiB otherwise). OAuth callback does not require a browser cookie: the consumed state binds it to the originating app session.
- `calendarTest.ts`: Validates write access and creates a 15-minute private, free test event without notifications or reminders. Uses a caller-stable UUID idempotency key.
- `calendarImport.ts`: Automatically creates/subscribes private category calendars, stores stable mappings, reconciles source markers before event creation, and records each result. Preserves sectioned descriptions up to 12000 characters and appends the Log source marker on its own line; metadata does not change deduplication. Per-account locks serialize operations. Unknown writes are reconciled without blind recreation; definitive provider rejections may be retried. HTTP 429 stops the batch.
- Nearby tests cover session/state security, encryption and persistence, account isolation, refresh/revocation, HTTP boundaries and event writes.

Run through `scripts/run-feishu-server.mjs` on Node 22.12+ with the supplied flags. Deploy a single persistent instance behind HTTPS, not an ephemeral serverless function. Feishu tokens and app secrets never enter the frontend build.

See [deployment and user instructions](../../docs/feishu-calendar-test.md). Formal Log synchronization is manual and scoped to the selected dates.

- `calendarSync.ts`: Upgrades existing encrypted import ledgers into an account + Log ID index; supports content/time updates, explicit deletion IDs and delete-old-then-create category moves. Source markers are checked before mutation, and each migration step is persisted for safe retries. Catalog pagination exposes only imported references for the selected range. Legacy clients retain create-only behavior.
- Deletion intent comes from the complete hydrated local log snapshot, never from a filtered upload batch. Sync metadata stays in the connection executor database; a new independent executor cannot infer deleted logs from another executor's missing ledger. Keep the database and encryption key when moving the service.

2026-10-03: The catalog includes all known source category IDs for each Log. Explicit ignored-category preferences protect both current records and prior/source locations, including unfinished migrations. The executor rejects updates or deletions touching ignored categories before issuing provider calls.

In personal mode, users confirm their own app and calendar authorization on Feishu. Desktop requires no remote service; Web/Android still require a deployed execution service with persistent storage and a fixed encryption key. The historical shared-app mode still requires maintainer registration/publication and its original credentials. Local development prepares the personal API and a persistent ignored development key.

Access/refresh expiry and permission error categories follow the [official Feishu CLI constants](https://github.com/larksuite/cli/blob/main/internal/output/lark_errors.go).
