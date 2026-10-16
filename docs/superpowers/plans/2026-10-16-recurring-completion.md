# Recurring completion implementation plan

**Execution:** Native, per repository instructions; implement in this session without a separate approval step or subagents.
**Goal:** Complete and undo one dated occurrence while preserving the recurring task.
**Architecture:** Sparse completion map on TodoItem; shared pure completion helpers; date context carried by schedule actions. Keep series completion separate.
**Tech Stack:** React, TypeScript, Vitest, Electron, Capacitor Android.
**Spec:** `docs/plans/2026-10-16-recurring-completion-design.md`

## Constraints and review focus

- UTF-8; preserve file headers; concise UI labels; no Android compilation.
- Backdated completion stays on its occurrence date and undo preserves other dates.
- Date-less actions cannot silently complete another date or the series.
- Rule edits, detail autosave, backup/restore and duplication preserve/reset history as appropriate.
- Completed occurrences do not regenerate automatic Plans.
- Native widgets retain date context across midnight and reflect single completion.

## Tasks

- [x] Add completion types and pure helpers in `src/utils/todoOccurrenceUtils.ts`; test idempotence, undo, date validation, backfill and series independence.
- [x] Integrate date badges, hydration, duplicate cleanup and recurring Plan generation; run focused utility tests.
- [x] Route manager and quick actions through helpers; pass occurrence dates in list/week/month; add completed-day grouping and date picker fallback; preserve detail history and label series completion.
- [x] Update focus completion, Electron actions/snapshots and Android widget payload/actions to use occurrence dates; add focused regression coverage.
- [x] Run affected Vitest suites, TypeScript check and production build; smoke test affected UI, inspect diff and commit only task files.

## Verification

- `npx vitest run --config vitest.todo.config.ts`: 17 suites / 167 tests passed, including dated-sidebar state and date selection for pinned desktop tasks without today's occurrence.
- `node scripts/test-todo-occurrence.mjs`: seven renderer flows passed, including list grouping, undo/backfill, date picker hardware back, week/bento/month date forwarding and detail end/restore autosave. Mobile and desktop captures use `C:/Windows/Fonts/msyh.ttc`; Chinese text inspected visually.
- `npm run build`: production web assets and Electron main/preload builds passed. `npx cap sync android`: final web assets and plugin configuration synchronized successfully.
- Full TypeScript check was run. Existing errors remain in unchanged code, including the Electron tray image argument, missing GoalEditor props, optional-date type predicates and calendar navigation references. No new occurrence helper, action, or renderer-harness diagnostics were reported.
- Android compilation and device smoke testing are left to the user per repository instructions. Native models, JSON serialization, queued action replay and Java constructor callers were reviewed together.
