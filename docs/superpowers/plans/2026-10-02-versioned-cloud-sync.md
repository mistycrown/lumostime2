# Versioned cloud sync implementation plan

**Goal:** Reliable handoff between devices used at different times, without timestamp or byte-size direction guesses.

**Architecture:** Persist a checkpoint per cloud destination (remote revision and acknowledged local content hash). A pure coordinator compares that checkpoint with current local and remote snapshots; a single scheduler coalesces edits, foreground checks, and retries. Existing cloud providers, backup validation, and image transfer remain in use.

**Tech stack:** React, TypeScript, Vitest, existing WebDAV/COS/S3 adapters.
**Spec:** User-approved design in the 2026-10-02 conversation: four-way direction table, 5-second debounce, bounded wait, snapshot acknowledgements, safe legacy migration.

**Execution:** Native in this session, as required by AGENTS.md; no delegation or additional approval.

## Constraints and review focus

- UTF-8; preserve unrelated working-tree changes; no Android compilation.
- Ignore transport timestamps and generated AI/achievement export dates when comparing user content.
- Unknown network failures must never mean an empty remote; distinguish confirmed missing objects.
- Edits during transfer and conflict dialogs must remain pending; restore must not replace a changed local snapshot.
- Legacy backups and destination changes need independent checkpoints; no guessing based on clock or size.
- React callbacks must access current data; restore events must not re-upload restored content.

## Tasks

- [x] Add `syncProtocol.ts` and tests for version/content comparisons, four-way direction decisions, legacy migration, destination checkpoints, and exact-snapshot acknowledgements.
- [x] Add `syncScheduler.ts` and fake-timer tests for shared debounce, bounded wait, edits during transfer, retries, foreground cooldown, and disposal.
- [x] Update `syncUtils.ts` to publish a unique revision, return verified metadata, accept the selected restore snapshot, and reject unexpected remote reads. Test failed reads and backups.
- [x] Replace the hook's duplicated direction/trigger paths with the coordinator, latest-data refs, and scheduler. Track all synchronized content and retain explicit manual/conflict actions.
- [x] Run focused regressions and production build, perform a local browser smoke check where available, inspect the complete diff, update module documentation, and commit only this task's files.

## Verification

- 2026-10-02: 77 focused Vitest regressions passed (9 files).
- 10 real React renderer scenarios passed with isolated in-memory cloud adapters.
- Production build and full application startup smoke passed; screenshot inspected.
- Android web assets synchronized with Capacitor; Android compilation and real cloud/device handoff were not performed.
- Full-project TypeScript checking still reports existing errors in unrelated code (including the existing dreamService assistantReply reference); no new sync-module type errors were found.
- Commit scope excludes unrelated working-tree changes, including the Feishu settings additions.
