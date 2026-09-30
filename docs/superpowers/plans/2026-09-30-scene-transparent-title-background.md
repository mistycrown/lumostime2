# Scene Transparent Title Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Scene use one continuous navigation background from the transparent title bar through its content.

**Architecture:** Add `AppView.SCENE` to the existing transparent-title support list in `MainLayout`, so it owns the full-viewport background image. Mark the local Scene image layer and extend the existing narrowly scoped CSS rule to hide it only within `.transparent-title-bar-active`.

**Tech Stack:** React, TypeScript, global CSS, Vitest.

**Spec:** `docs/plans/2026-09-30-scene-transparent-title-background-design.md`

## Global Constraints

- Use UTF-8 source files, 2-space TypeScript indentation, single quotes, and semicolons.
- Preserve and update file headers when modifying source files.
- Do not change opaque-title behavior, Scene child pages, Todo, Record, or Memoir behavior.
- Run focused Vitest coverage and `npm run build`.

## Review Focus

- Scene is included in `MainLayout` only while the persisted transparent-navigation toggle is enabled.
- Scene’s local image layer is hidden only under `.transparent-title-bar-active`.
- Opaque title mode preserves Scene’s original local image layer.
- The selector keeps its existing Todo and Record behavior.
- Memoir remains absent from the shared local-image suppression selector.

---

### Task 1: Extend the single-layer transparent background contract to Scene

**Files:**

- Modify: `src/components/MainLayout.tsx:163-168`
- Modify: `src/views/SceneView.tsx:1024-1042`
- Modify: `src/index.css:5-10`
- Modify: `src/index.css.test.ts`
- Create: `src/components/MainLayout.transparentTitleBar.test.ts`

**Interfaces:**

- Consumes: `AppView.SCENE` and `.transparent-title-bar-active` from `MainLayout`.
- Produces: `.scene-page-background-image`, which the shared transparent-title stylesheet rule suppresses alongside the Todo and Record local image layers.

- [ ] **Step 1: Write failing regression expectations**

Extend `src/index.css.test.ts` to require `.scene-page-background-image` in the existing suppression rule. Add `MainLayout.transparentTitleBar.test.ts` to load `MainLayout.tsx` and assert that `supportsTransparentTitleBar` includes `currentView === AppView.SCENE`.

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npx vitest run src/index.css.test.ts src/components/MainLayout.transparentTitleBar.test.ts`

Expected: FAIL because Scene is neither marked in the stylesheet nor included in the transparent title support list.

- [ ] **Step 3: Wire Scene into the shared background mechanism**

Include `AppView.SCENE` in `supportsTransparentTitleBar`, add `scene-page-background-image` to the Scene local wallpaper node, and add that selector to the existing transparent-title CSS hiding rule. Update headers in both modified TypeScript files.

- [ ] **Step 4: Run focused regression coverage**

Run: `npx vitest run src/index.css.test.ts src/components/MainLayout.transparentTitleBar.test.ts`

Expected: PASS.

- [ ] **Step 5: Build and manually smoke-test**

Run: `npm run build`

Expected: production build succeeds. With an image navigation background and transparent navigation enabled, Scene shows one continuous image across its header and content; after disabling transparency, its local background returns. Verify Memoir remains unchanged.

- [ ] **Step 6: Commit the completed fix**

```bash
git add src/components/MainLayout.tsx src/components/MainLayout.transparentTitleBar.test.ts src/index.css src/index.css.test.ts src/views/SceneView.tsx docs/plans/2026-09-30-scene-transparent-title-background-design.md docs/superpowers/plans/2026-09-30-scene-transparent-title-background.md
git commit -m "修复场景页透明标题栏背景"
```
