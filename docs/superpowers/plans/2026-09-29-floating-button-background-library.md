# Floating Button Background Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single floating-button background setting with a selectable, theme-synchronized library of image schemes and remove the native button chrome while any scheme is active.

**Architecture:** The current service becomes a small resource catalog storing scheme records and a current ID, with one-time migration from the previous filename/scale keys. The selector displays default plus scheme thumbnails. Snapshot, backup, reference collection, and ZIP application store/register the catalog while preserving the selected resource.

**Tech Stack:** React, TypeScript, Tailwind CSS, localStorage, Vitest, JSZip.
**Spec:** `docs/plans/2026-09-29-floating-button-background-library-design.md`

## Global Constraints

- All modified source and JSON files use UTF-8.
- A scheme image accepts only image files up to 10MB and has an independent 50–200 scale, defaulting to 100.
- Uploading creates and selects a scheme; deleting current selection returns to default.
- A selected scheme removes FloatingButton's native background color, border, and shadow while retaining its icon and interaction.
- Legacy single-image settings migrate once without discarding the existing image.
- Schema-v2 ZIPs remain backward compatible when no floating-button section is supplied.

## Review Focus

- A legacy image/scale must create exactly one scheme once; Task 1 tests migration.
- Removing a current scheme must reset to default without deleting an image referenced by a snapshot/package; Task 1 tests protection.
- Default selection must restore each caller's original styled button; Task 2 tests class behavior.
- Every packaged resource must be registered as selectable, even if it is not selected; Task 3 tests it.
- A package with an absent resource ID or illegal scale must still be rejected; Task 3 retains parser coverage.

### Task 1: Replace the single setting with a scheme catalog

**Files:**

- Modify: `src/services/floatingButtonBackgroundService.ts`
- Modify: `src/services/floatingButtonBackgroundService.test.ts`
- Modify: `src/constants/storageKeys.ts`
- Modify: `src/services/settingsImageReferenceService.ts`
- Modify: `src/services/appearanceBackupService.ts`
- Modify: `src/services/themeSnapshotService.ts`

**Interfaces:**

- Produces: `FloatingButtonBackgroundScheme { id: string; imageFilename: string; scale: number }`.
- Produces: `getSchemes()`, `getCurrentSchemeId()`, `getCurrentScheme()`, `addScheme(file)`, `selectScheme(id | null)`, `setSchemeScale(id, scale)`, `deleteScheme(id)`, and `registerSchemes(schemes, selectedId?)`.
- Consumes: existing image service and settings-reference collector.

- [ ] **Step 1: Write failing migration/catalog tests**

Assert legacy filename plus scale becomes one selected scheme; upload appends and selects; selection and scale are per-scheme; removal of current selection uses default; shared images survive deletion.

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run src/services/floatingButtonBackgroundService.test.ts`

Expected: FAIL because only one image is supported.

- [ ] **Step 3: Implement catalog persistence, migration, and references**

Use a JSON scheme-list storage key and current-ID key. Read old keys only if the new catalog is absent, migrate exactly once, and retain old key compatibility only for migration. Include all scheme filenames in settings/backup/snapshot reference traversal. Ensure default supplement clears the current selection but retains schemes as user-owned resources.

- [ ] **Step 4: Run service and snapshot verification**

Run: `npx vitest run src/services/floatingButtonBackgroundService.test.ts src/services/themeSnapshotService.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/floatingButtonBackgroundService.ts src/services/floatingButtonBackgroundService.test.ts src/constants/storageKeys.ts src/services/settingsImageReferenceService.ts src/services/appearanceBackupService.ts src/services/themeSnapshotService.ts
git commit -m "悬浮按钮支持背景方案库"
```

### Task 2: Present scheme grid and remove active button chrome

**Files:**

- Modify: `src/components/FloatingButton.tsx`
- Modify: `src/components/FloatingButtonBackgroundSelector.tsx`

**Interfaces:**

- Consumes: Task 1 catalog service and change event.
- Produces: selector grid with default, schemes, upload, per-scheme scale, and delete controls.
- Produces: FloatingButton rendering which conditionally removes only `floating-button`/fallback background chrome when a scheme is selected.

- [ ] **Step 1: Write failing UI/render tests**

Assert default selection renders original CSS classes, selected scheme renders the image and has no background/border/shadow classes, and selector uploads a new entry, selects thumbnails, and deletes the current item.

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run src/services/floatingButtonBackgroundService.test.ts`

Expected: FAIL until selector and rendering consume the catalog.

- [ ] **Step 3: Implement the gallery and conditional chrome**

Render a default thumbnail, one thumbnail per scheme, plus upload tile. Give the selected scheme the size slider and delete action. In FloatingButton, compute classes so custom image schemes never receive `floating-button` or variant border/shadow classes; retain sizing, fixed/custom positioning, z-index, icon wrapper, and active animation.

- [ ] **Step 4: Run focused tests and build**

Run: `npx vitest run src/services/floatingButtonBackgroundService.test.ts && npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/FloatingButton.tsx src/components/FloatingButtonBackgroundSelector.tsx
git commit -m "优化悬浮按钮背景方案展示"
```

### Task 3: Register all package assets as reusable schemes

**Files:**

- Modify: `src/services/themePackageApplicationService.ts`
- Modify: `src/services/themePackageApplicationService.test.ts`
- Modify: `src/services/themePackageService.ts`
- Modify: `src/services/themePackageService.test.ts`
- Modify: `docs/plans/theme-package-template/README.md`

**Interfaces:**

- Consumes: `resources.floatingButtonBackgrounds: Array<{ id: string; image: string }>` and optional `apply.floatingButtonBackground { resourceId; scale? }`.
- Produces: package-namespaced scheme IDs registered through Task 1, with apply selection choosing only the declared current resource.

- [ ] **Step 1: Write failing multi-resource package tests**

Use two floating-button assets and apply one at 135; assert both appear in the service catalog and only the declared one is current. Retain missing-ID and out-of-range-scale rejection cases.

- [ ] **Step 2: Run package tests to verify failure**

Run: `npx vitest run src/services/themePackageService.test.ts src/services/themePackageApplicationService.test.ts`

Expected: FAIL because application only writes one setting.

- [ ] **Step 3: Register all mapped package assets**

Normalize resources as today. In application, map every resource to its local filename, namespace its scheme ID by package ID, preserve/replace that package's prior schemes, then select the configured item only when apply exists. Do not alter user-created schemes.

- [ ] **Step 4: Update template documentation and run full verification**

Run: `npx vitest run src/services/floatingButtonBackgroundService.test.ts src/services/themePackageService.test.ts src/services/themePackageApplicationService.test.ts src/services/themeSnapshotService.test.ts && npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/themePackageApplicationService.ts src/services/themePackageApplicationService.test.ts src/services/themePackageService.ts src/services/themePackageService.test.ts docs/plans/theme-package-template/README.md
git commit -m "主题包导入悬浮按钮背景方案"
```

## Self-Review

- Task 1 owns catalog storage, migration, and every persistence/reference path.
- Task 2 owns visible management and the no-chrome rendering rule.
- Task 3 owns multi-resource package registration and validation.
- All five review-focus conditions have a designated regression test.

