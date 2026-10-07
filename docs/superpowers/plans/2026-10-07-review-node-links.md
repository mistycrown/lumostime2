# Review Node Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Index node links from daily, weekly, and monthly review answers and render/open them as filtered independent cards in node timelines.

**Architecture:** Generalize `nodeUtils` and `NodeContext` from daily-only review answers to a typed review-entry collection. Pass these entries into `DetailTimelineCard`, filter periods by month overlap, and route card opens through the existing navigation state for each review view.

**Tech Stack:** React, TypeScript, Vitest, Vite.
**Spec:** `docs/plans/2026-10-07-review-node-links-design.md`

## Global Constraints

- Use UTF-8 and existing TypeScript/React conventions.
- Preserve daily-review behavior and unrelated worktree changes.
- Do not add dependencies or persist a new relationship table.

## Review Focus

- A week crossing two months appears in both relevant month filters.
- A month filter includes a daily answer on the selected day and excludes an unrelated period.
- Rename and merge update all three review kinds without rediscovering stale nodes.
- Clicking each card opens the correct review kind and guide tab.
- Review answers without node links do not create candidates or empty cards.

### Task 1: Generalize Review Node Indexing

**Files:**
- Modify: `src/utils/nodeUtils.ts`
- Modify: `src/contexts/NodeContext.tsx`
- Modify: `src/utils/nodeUtils.test.ts`

- [ ] Define the typed review-entry shape and date-range helpers for daily/weekly/monthly records.
- [ ] Extend discovery/indexing/candidate inputs to weekly and monthly reviews.
- [ ] Apply rename/merge/association updates to all review arrays while preserving legacy daily behavior.
- [ ] Add tests for typed entries, cross-kind indexing, range timestamps, and rename/merge transforms.

### Task 2: Render And Filter All Review Cards

**Files:**
- Modify: `src/components/DetailTimelineCard.tsx`
- Modify: `src/views/NodeDetailView.tsx`
- Modify: `src/components/DetailTimelineCard.test.ts`

- [ ] Replace daily-specific timeline entries with typed review entries and label cards by review kind.
- [ ] Implement month-overlap filtering for day/week/month periods; keep all-view behavior unchanged.
- [ ] Feed all indexed review answers into node detail, AI biography context, and potential-association rendering.
- [ ] Add tests for month overlap, all-view retention, and independent card rendering data.

### Task 3: Open Weekly And Monthly Reviews

**Files:**
- Modify: `src/components/NodeDetailOverlay.tsx`
- Modify: `src/views/NodeDetailView.tsx`
- Modify: `src/components/__tests__/nodeRendererHarness.tsx`

- [ ] Add weekly/monthly callbacks that close the node overlay, set the period, select the guide tab, and open the corresponding view.
- [ ] Route potential and linked review-card actions through the typed callback.
- [ ] Extend the renderer smoke test to verify callback routing and that the related tab remains node-focused.

### Task 4: Verify And Commit

- [ ] Run targeted Vitest tests for node utilities and timeline grouping.
- [ ] Run `node scripts/test-nodes-renderer.mjs`.
- [ ] Run `npm run build` and `git diff --check`.
- [ ] Commit only the implementation and documentation files for this feature.
