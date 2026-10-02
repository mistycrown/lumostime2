# Versioned cloud synchronization

`syncProtocol.ts` owns content canonicalization, SHA-256 identities, destination checkpoints, pending upload receipts, and the four-way sync decision. Timestamps and JSON sizes are never used to choose a direction. Generated AI/achievement export dates are excluded, while actual user record timestamps remain significant.

`syncScheduler.ts` owns one debounce/retry queue: 5-second edit debounce, 30-second maximum wait and resume cooldown, and retries from 5 seconds up to 5 minutes. Requests arriving during a transfer survive its completion. Local storage audits do not poll the cloud.

`syncUtils.ts` retains payload validation, verified safety backups and image transfer, adds a unique `syncRevision`, and restores the already selected snapshot. Only a confirmed missing object permits initial upload; failed reads and malformed payloads stop the transfer.

`localDataTimestamp.ts` now tracks local edit revisions without a recent-input heuristic. Clearing pending state requires an explicit captured revision. The coordinator additionally checks actual snapshot content before acknowledging it.

Cloud destination identifiers are hashed and include provider, endpoint, account and bucket. Credentials are excluded. Existing payloads without revisions use their content hash as a legacy version. Interrupted uploads retain a receipt so a successfully written version with a lost response can be recognized on retry or restart.

This is sequential-device handoff, not an atomic multi-writer protocol. A pre-upload recheck catches intervening writes, but the providers do not use conditional PUT in this implementation. Both actively editing devices require explicit conflict resolution.

Run focused tests with Vitest's programmatic `startVitest` API and `config: false` (avoids unrelated Electron bundling plugins). Run actual React lifecycle integration with `node scripts/test-sync-renderer.mjs`; add `--smoke-url http://127.0.0.1:4179` for a local production preview. The runner uses a hidden Electron window, isolated profile and in-memory cloud.
