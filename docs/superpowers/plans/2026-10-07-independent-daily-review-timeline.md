# Independent Daily Review Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Render linked daily reviews as independent cards in node timeline tabs and remove invalid nested buttons from log rows.

**Architecture:** Keep review filtering in `DetailTimelineCard`, but render filtered reviews in a standalone section before the history list. Keep date grouping responsible only for logs. Replace log-row button semantics with an accessible clickable container so inline `NodeText` buttons remain valid.

**Tech Stack:** React, TypeScript, Vitest, Vite.

**Spec:** `docs/plans/2026-10-07-independent-daily-review-timeline-design.md`

## Global Constraints

- Use UTF-8 and existing TypeScript/React conventions.
- Preserve unrelated worktree changes.
- Do not add a new dependency.

## Review Focus

- A review-only date must not create an empty log date group; test that grouping remains log-only.
- A node link inside a log note must remain clickable without triggering log editing.
- A log row must still open with mouse and keyboard activation.
- Review cards must remain clickable and render answers with node links.

### Task 1: Separate Review Cards From Log History

**Files:**
- Modify: `src/components/DetailTimelineCard.tsx`
- Modify: `src/utils/detailTimelineGrouping.ts`
- Test: `src/components/DetailTimelineCard.test.ts`

- [ ] Remove review date keys from `buildDetailTimelineGroupedData` calls and keep the grouping function log-only.
- [ ] Render filtered review entries in a standalone “关联日报” section before the history list, with independent card styling and open-detail buttons.
- [ ] Add tests proving review-only dates do not enter log grouping and review content is represented independently.
- [ ] Run the targeted Vitest tests.

### Task 2: Remove Nested Buttons From Log Rows

**Files:**
- Modify: `src/components/DetailTimelineCard.tsx`
- Test: `src/components/__tests__/nodeRendererHarness.tsx`

- [ ] Add a shared keyboard activation handler for log-row containers.
- [ ] Replace the log row's button-like interaction with `role="button"`, `tabIndex={0}`, and Enter/Space handling.
- [ ] Ensure click propagation from nested node links remains stopped by `NodeText`.
- [ ] Extend the renderer smoke test to cover the log container and node-link interaction path.

### Task 3: Verify And Commit

- [ ] Run `npx vitest run src/components/DetailTimelineCard.test.ts src/services/nodeDescriptionService.test.ts src/utils/nodeUtils.test.ts`.
- [ ] Run `node scripts/test-nodes-renderer.mjs`.
- [ ] Run `npm run build` and `git diff --check`.
- [ ] Inspect status and commit only the files for this feature.
