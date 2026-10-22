# Conditional cloud sync implementation plan

**Goal:** Reduce unchanged backup downloads and repeated native WebDAV image uploads within the existing sync protocol.

**Execution:** Native implementation in this session, as required by AGENTS.md and the user's approved optimization request.

**Design:** Retain one in-memory main-backup JSON/ETag pair per provider. Only explicit sync checks use conditional GET. Initial reads, missing/weak ETags and verification reads fetch complete data. Invalidate before main-backup writes and connection changes. Never use cached content after network/auth/rate-limit failures. Preserve conflict detection, safety backups and read-after-write verification. Native WebDAV uses native HTTP for main-backup response headers; safety backups and attachments retain filesystem transfers. Do not add a new server or change the backup format.

**Alternatives:** HEAD plus GET adds requests when data changes; a separate version file cannot atomically track writes from legacy clients. Conditional GET binds the validator to the actual downloaded response and needs one request for unchanged content.

- [x] Add a bounded JSON response cache and regression tests for 304, changed data, unsupported conditions, errors, invalidation, destination isolation and mutation isolation.
- [x] Integrate compatible S3, COS and WebDAV; keep default downloads unconditional for verification. Reuse native WebDAV manifests when directory listing is unavailable. Verify with adapter and sync tests.
- [x] Exercise real React sync lifecycle, run production build and isolated preview smoke, update sync documentation and inspect the diff. Commit only task files after verification.

**Review focus:** A missing object must still reach existing missing-object classification; network/auth/429/503 must not return stale data; upload failures must invalidate previous receipts; 304 must require a matching strong validator; unsupported conditional requests must fall back without repeated failures; native transport must retain UTF-8 and queue cooldowns. Initial checks after process restart download one full snapshot because caches are deliberately memory-only.

**Validation:** `node scripts/test-sync.mjs` (171 tests), `node scripts/test-sync-renderer.mjs` (19 scenarios), `npm run build`, preview smoke with `--smoke-url http://127.0.0.1:4179` (startup and preference interaction), and `npx cap sync android` passed. Android compilation and real-device/cloud-account testing were not performed. Full-project `tsc --noEmit` reports existing errors across unrelated modules; a repeat check found no diagnostics in the modified sync/cache/adapter/harness files. This task does not repair unrelated modules.
