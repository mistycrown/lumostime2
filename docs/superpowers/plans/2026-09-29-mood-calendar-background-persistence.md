# Mood Calendar Background Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the selected Memoir mood-calendar background visible across cold starts and sync without allowing asynchronous hydration to overwrite newer records.

**Architecture:** Treat `imageFilename` as durable identity and image URLs as runtime cache entries. Hydrate from the display component through a deduplicated service operation, merge results against current storage, and route the existing background-change event into appearance auto-sync.

**Tech Stack:** React 19, TypeScript, Vitest, Vite, IndexedDB/Capacitor Filesystem
**Spec:** `docs/plans/2026-09-29-mood-calendar-background-persistence-design.md`

## Global Constraints

- Preserve UTF-8, two-space TypeScript indentation, single quotes, semicolons, and existing file headers.
- Do not compile Android in this workspace.
- Preserve unrelated working-tree changes and stage only task files.
- Do not persist temporary `blob:` or `data:` URLs in localStorage.

## Review Focus

- Cold start with a selected image whose stored URL is empty must rehydrate and render.
- Concurrent hydration and upload/import must not drop the new record.
- Concurrent hydration calls must not create duplicate reads or conflicting writes.
- A missing image file must remain retryable and must not clear the selected ID.
- Selection and opacity changes must enter the appearance auto-sync path.

---

### Task 1: Make background hydration durable and race-safe

**Files:**
- Modify: `src/services/moodCalendarBackgroundService.ts`
- Test: `src/services/moodCalendarBackgroundService.test.ts`

**Interfaces:**
- Produces: `hydrateCustomBackgrounds(): Promise<void>` with in-flight deduplication and merge-by-ID semantics.
- Produces: metadata persistence that strips temporary `blob:` and `data:` URLs.

- [x] Add failing tests for native-style data URLs, shared concurrent hydration, missing-image retry, and concurrent record insertion.
- [x] Run the focused service test and confirm the new cases fail.
- [x] Implement runtime URL caching, in-flight hydration reuse, current-list merge, and warning diagnostics.
- [x] Run the focused service test and confirm all cases pass.

### Task 2: Start hydration from the display path

**Files:**
- Modify: `src/components/MoodCalendar.tsx`
- Test: `src/components/MoodCalendar.test.tsx` if the current test environment supports React DOM; otherwise add a focused source contract test beside the component.

**Interfaces:**
- Consumes: `moodCalendarBackgroundService.hydrateCustomBackgrounds(): Promise<void>`.

- [x] Add a failing regression assertion that mounting/display initialization invokes hydration.
- [x] Add the mount effect without changing calendar rendering behavior.
- [x] Run the focused test.

### Task 3: Include mood-calendar changes in appearance auto-sync

**Files:**
- Modify: `src/hooks/useSyncManager.ts`
- Test: existing sync tests or a focused source contract test.

**Interfaces:**
- Consumes: `MOOD_CALENDAR_BACKGROUND_CHANGE_EVENT` from the background service.

- [x] Add a failing assertion for the missing appearance event.
- [x] Import and register the exported event constant in `appearanceEvents`.
- [x] Run the focused sync test.

### Task 4: Verify and deliver

**Files:**
- Review all files above and the two plan documents.

- [x] Run focused Vitest suites.
- [x] Run `npm run build`.
- [x] Inspect `git status` and task-only diff.
- [x] Stage only completed code, tests, and associated plan files; commit with a concise Chinese subject.
