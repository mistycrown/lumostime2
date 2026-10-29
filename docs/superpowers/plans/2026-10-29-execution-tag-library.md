# Execution Tag Library Implementation Plan

**Goal:** Switch between schedule and execution beside Tasks, and select/manage reusable execution tags in a modal.

**Architecture:** Keep one schedule sidebar entry with an internal execution mode. Persist a reusable tag/category library in the existing preferences backup path. Keep stable tag IDs and existing semantic groups for compatibility; add an optional category ID for organization. Import existing task labels without restoring explicitly deleted labels. Task association changes flow through existing todo save callbacks.

**Execution:** Native implementation in this session, as required by AGENTS.md and the user's implementation request.

**Constraints:** UTF-8; preserve existing styles and task data; no subagents; do not compile Android; commit only this feature after verification.

- [x] Implement library persistence, legacy discovery, category CRUD, tag rename/move/delete and safe association updates. Cover reload, deletion tombstones, category moves, duplicate names and backup restore.
- [x] Replace the inline popup with a portal modal for selection and management. Show affected task count before unlink/delete; support new/renamed/deleted categories and moving tags.
- [x] Remove the execution sidebar tab. Add a schedule/execution switch beside Tasks and label filters within execution mode.
- [x] Add execution-label quick editing beside Pin in both todo and timeline shortcuts, using live task data and preserving the current quick-action snapshot.
- [x] Run focused regressions and production build. Smoke test selection, reuse, management, switch and mobile layout with isolated example data. Review and commit.

Validation: 25 Vitest files / 220 tests passed; production build passed; isolated browser checks passed at desktop and mobile widths, including the Pin-row shortcut, nested hardware back, immediate label saves and a subsequent Pin action. Screenshots are generated under `node_modules/.cache/todo-execution-smoke/`.

Review focus: edits must preserve other task fields; category moves must not clear tags; deleted presets must stay deleted; old backups must retain the library when its key is omitted; canceled deletion must not alter associations.
