# Transparent Title Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate duplicate, misaligned navigation-background rendering on Todo and Record pages when transparent title bars are enabled.

**Architecture:** `MainLayout` already owns the viewport-wide navigation background for transparent title bars. Todo and Record will identify their local image layers with semantic classes; a narrowly scoped stylesheet rule will suppress only those local image layers while the layout state is active. Their translucent content overlays remain unchanged, and Memoir is excluded.

**Tech Stack:** React, TypeScript, Tailwind utility classes, global CSS, Vitest.

**Spec:** `docs/plans/2026-09-30-transparent-title-background-design.md`

## Global Constraints

- Use UTF-8 source files, 2-space TypeScript indentation, single quotes, and semicolons.
- Preserve and update file headers when modifying source files.
- Do not alter Memoir, navigation-background settings, theme-package handling, or opaque-title-bar behavior.
- Run `npm run build` and manually smoke-test Todo and Record with transparent title bars enabled.

## Review Focus

- Transparent title bar + image background: Todo and Record show only the `MainLayout` image layer across the header and content.
- Opaque title bar: local Todo and Record image layers still render normally.
- No selected navigation background: no new blank or opaque layer is introduced.
- Todo schedule mode: it remains excluded from transparent-title behavior.
- Memoir: its existing local background and own header are not selected by the new rule.

---

### Task 1: Mark and suppress duplicate page image layers

**Files:**

- Modify: `src/views/RecordView.tsx:156-167`
- Modify: `src/views/TodoView.tsx:2315-2325,2601-2611`
- Modify: `src/index.css:5-15`
- Create: `src/index.css.test.ts`

**Interfaces:**

- Consumes: `.transparent-title-bar-active` placed by `MainLayout` when a supported view has transparent navigation enabled.
- Produces: `.record-page-background-image` and `.todo-page-background-image` markers that the stylesheet hides only below that layout-state ancestor.

- [ ] **Step 1: Write the failing stylesheet regression test**

Create `src/index.css.test.ts`, load `src/index.css`, and assert that the transparent-title selector targets both `.record-page-background-image` and `.todo-page-background-image`, but does not target the Memoir image layer.

- [ ] **Step 2: Run the regression test to verify it fails**

Run: `npx vitest run src/index.css.test.ts`

Expected: FAIL because the dedicated page-background markers and scoped hiding rule do not yet exist.

- [ ] **Step 3: Add semantic classes and the transparent-mode selector**

Add `record-page-background-image` to the Record image background node and `todo-page-background-image` to each Todo image background node. Add one CSS rule under `.transparent-title-bar-active` that sets only those two local image layers to `display: none`; do not change `page-background-overlay` behavior or any Memoir selector.

- [ ] **Step 4: Run focused regression tests**

Run: `npx vitest run src/index.css.test.ts src/views/TodoView.cardBackground.test.ts`

Expected: PASS.

- [ ] **Step 5: Build and manually smoke-test**

Run: `npm run build`

Expected: production build succeeds. With a selected image navigation background and transparency enabled, inspect Todo and Record: the image is continuous from status/title bar into the content and no duplicate top-right ornament appears; turn transparency off and confirm their local image backgrounds remain visible. Open Memoir to confirm no visual behavior changes.

- [ ] **Step 6: Commit the completed fix**

Run:

```bash
git add src/index.css src/index.css.test.ts src/views/RecordView.tsx src/views/TodoView.tsx docs/plans/2026-09-30-transparent-title-background-design.md docs/superpowers/plans/2026-09-30-transparent-title-background.md
git commit -m "修复透明标题栏背景重叠"
```
