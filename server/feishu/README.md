# Unified Feishu connection service

- `oauthStore.ts`: AES-256-GCM encrypted SQLite connections, hashed session IDs, one-use OAuth states and account-scoped category/import persistence. Disconnect deletes state and credentials while retaining encrypted import metadata for deduplication after reconnection.
- `oauthService.ts`: PKCE authorization-code flow with explicit consent, current v3 token exchange/refresh, user identity and writable calendars, serialized rotating-token refresh, safe status metadata and explicit test/Log imports. Default user scopes are `calendar:calendar offline_access`. App installation/availability errors give account-facing instructions instead of asking users to configure credentials.
- `httpApi.ts`: HTTP routes for `status`, `connect`, `callback`, `calendar`, `test`, `import`, `disconnect`, with HttpOnly cookies, strict origin policy and bounded JSON (256 KiB for import; 4 KiB otherwise). OAuth callback does not require a browser cookie: the consumed state binds it to the originating app session.
- `calendarTest.ts`: Validates write access and creates a 15-minute private, free test event without notifications or reminders. Uses a caller-stable UUID idempotency key.
- `calendarImport.ts`: Automatically creates/subscribes private category calendars, stores stable mappings, reconciles source markers before event creation, and records each result. Preserves sectioned descriptions up to 12000 characters and appends the Log source marker on its own line; metadata does not change deduplication. Per-account locks serialize operations. Unknown writes are reconciled without blind recreation; definitive provider rejections may be retried. HTTP 429 stops the batch.
- Nearby tests cover session/state security, encryption and persistence, account isolation, refresh/revocation, HTTP boundaries and event writes.

Run through `scripts/run-feishu-server.mjs` on Node 22.12+ with the supplied flags. Deploy a single persistent instance behind HTTPS, not an ephemeral serverless function. Feishu tokens and app secrets never enter the frontend build.

See [deployment and user instructions](../../docs/feishu-calendar-test.md). Formal Log uploads are explicit, create-only operations; later edits/deletes are not propagated.

The maintainer must register/publish a real Feishu app and deploy the service before end users can authorize. Internal apps are limited to their enterprise; public multi-enterprise use requires the appropriate store-app onboarding and tenant installation. Local development automatically prepares this API; production startup refuses missing credentials.

Access/refresh expiry and permission error categories follow the [official Feishu CLI constants](https://github.com/larksuite/cli/blob/main/internal/output/lark_errors.go).
