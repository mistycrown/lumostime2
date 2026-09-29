# Floating Button Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users set one scalable image as the circular background for every `FloatingButton`, and preserve it through saved themes and theme ZIP imports.

**Architecture:** A focused appearance service persists the image filename and percentage scale, notifies React consumers, and owns safe image replacement. `FloatingButton` adds the optional image under unchanged content. Existing snapshot, reference-cleanup, package parsing, import, and application services carry the same setting.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, localStorage, Vitest, JSZip.
**Spec:** `docs/plans/2026-09-29-floating-button-background-design.md`

## Global Constraints

- All created or modified source and JSON files use UTF-8 encoding.
- Image input accepts only image files up to 10MB.
- The image is circularly clipped, centered, cover-filled, and scales from 50% to 200%; default is 100%.
- When absent, every button must retain its existing appearance and behavior.
- Theme ZIP stays at `schemaVersion: 2`; packages that omit this optional setting remain valid.

## Review Focus

- Malformed stored values use 100%, and values outside 50–200 are clamped; test in Task 1.
- Replacing or clearing an image still referenced by another setting/snapshot must not delete it; test in Task 1.
- A ZIP selecting a missing floating-button resource must reject before persistence; test in Task 3.
- A snapshot selecting a missing image clears only this setting and reports a warning; test in Task 2.
- A `disableThemeStyle` button receives the image while retaining caller fallback styles; test in Task 1.

### Task 1: Persist, edit, and render the global background

**Files:**

- Create: `src/services/floatingButtonBackgroundService.ts`
- Create: `src/services/floatingButtonBackgroundService.test.ts`
- Create: `src/components/FloatingButtonBackgroundSelector.tsx`
- Modify: `src/constants/storageKeys.ts`
- Modify: `src/components/FloatingButton.tsx`
- Modify: `src/views/SponsorshipView.tsx`
- Modify: `src/services/settingsImageReferenceService.ts`

**Interfaces:**

- Consumes: `imageService.saveImage(file, 'theme')`, `imageService.deleteImage(filename)`, `getSettingsReferencedImages()`.
- Produces: `FloatingButtonBackgroundSettings`, `floatingButtonBackgroundService.getSettings()`, `setImage(file)`, `setSettings(imageFilename, scale)`, `clearImage()`, `setScale(scale)`, and `FLOATING_BUTTON_BACKGROUND_CHANGED_EVENT`.
- Produces: `<FloatingButtonBackgroundSelector onToast={onToast} />`.

- [ ] **Step 1: Write failing service and component tests**

Cover default `{ imageFilename: null, scale: 100 }`, scale clamping, image MIME/10MB rejection, replacement/clear cleanup protection, referenced-image collection, selector controls, and image rendering below children for normal and `disableThemeStyle` buttons.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npx vitest run src/services/floatingButtonBackgroundService.test.ts`

Expected: FAIL because the service and selector do not exist.

- [ ] **Step 3: Add the storage keys and implement the service**

Add `THEME_KEYS.FLOATING_BUTTON_BACKGROUND = 'lumostime_floating_button_background_v1'` and `THEME_KEYS.FLOATING_BUTTON_BACKGROUND_SCALE = 'lumostime_floating_button_background_scale_v1'`. Define `FloatingButtonBackgroundSettings = { imageFilename: string | null; scale: number }`; use the `theme` image group, clamp scale, dispatch the change event, and only delete an old filename absent from `getSettingsReferencedImages()`. Add selected filename and thumbnail to that reference service.

- [ ] **Step 4: Implement UI composition**

Render the optional background as an absolute, circular, `aria-hidden` layer before a relative child wrapper in `FloatingButton`; use centered, non-repeating cover background with percentage scale. Implement a style-tab selector with live circular preview, upload/replace, clear, and a 50–200 “图片大小” range input. Insert it before existing style selectors.

- [ ] **Step 5: Run verification and commit**

Run: `npx vitest run src/services/floatingButtonBackgroundService.test.ts && npm run build`

Expected: PASS.

```bash
git add src/constants/storageKeys.ts src/services/floatingButtonBackgroundService.ts src/services/floatingButtonBackgroundService.test.ts src/services/settingsImageReferenceService.ts src/components/FloatingButton.tsx src/components/FloatingButtonBackgroundSelector.tsx src/views/SponsorshipView.tsx
git commit -m "新增悬浮按钮图片背景"
```

### Task 2: Include it in backups and saved-theme snapshots

**Files:**

- Modify: `src/services/appearanceBackupService.ts`
- Modify: `src/services/themeSnapshotService.ts`
- Modify: `src/services/themeSnapshotService.test.ts`

**Interfaces:**

- Consumes: Task 1 storage keys and service.
- Produces: backup payloads and `ThemeSettingsSnapshot` objects that restore selected image and scale safely.

- [ ] **Step 1: Write failing snapshot regression tests**

Verify capture includes filename and scale, `getThemeSnapshotImageReferences()` includes the filename, and applying a snapshot with an unavailable image clears it and returns `悬浮按钮背景缺少资源：<filename>`.

- [ ] **Step 2: Run the tests and verify failure**

Run: `npx vitest run src/services/themeSnapshotService.test.ts`

Expected: FAIL because the settings are not captured or validated.

- [ ] **Step 3: Extend backup, snapshot, and fallback code**

Add both keys to `APPEARANCE_STORAGE_KEYS`. Add the selected filename to `getThemeSnapshotImageReferences()`; in snapshot resource validation resolve it via `imageService`, clear only this setting if missing, and append the specified warning. Default-theme application clears the image and resets scale to 100.

- [ ] **Step 4: Run verification and commit**

Run: `npx vitest run src/services/themeSnapshotService.test.ts && npm run build`

Expected: PASS.

```bash
git add src/services/appearanceBackupService.ts src/services/themeSnapshotService.ts src/services/themeSnapshotService.test.ts
git commit -m "保存悬浮按钮背景主题配置"
```

### Task 3: Add image resources to theme ZIPs and templates

**Files:**

- Modify: `src/services/themePackageService.ts`
- Modify: `src/services/themePackageImportService.ts`
- Modify: `src/services/themePackageApplicationService.ts`
- Modify: `src/services/themePackageImportService.test.ts`
- Modify: `docs/plans/theme-package-template/theme.json`
- Modify: `docs/plans/theme-package-template/README.md`
- Modify: `docs/plans/theme-package-template - 副本/theme.json`
- Modify: `docs/plans/theme-package-template - 副本/README.md`

**Interfaces:**

- Consumes: `resources.floatingButtonBackgrounds: Array<{ id: string; image: string }>` and `apply.floatingButtonBackground?: { resourceId: string; scale?: number }`.
- Produces: normalized `config.floatingButtonBackground` with the resolved asset path and scale; application calls Task 1 `setSettings()` using the package image mapping.

- [ ] **Step 1: Write failing package parse/import/application tests**

Build a v2 ZIP with `assets/floating-button-backgrounds/flower.webp`, a resource ID, and `scale: 135`; assert the mapped filename and scale are applied. Assert a missing selected ID and scale values 49/201 reject with `INVALID_CONFIGURATION`. Assert deletion preserves the image when the global setting references it.

- [ ] **Step 2: Run package tests and verify failure**

Run: `npx vitest run src/services/themePackageImportService.test.ts`

Expected: FAIL because the collection and apply section are unknown.

- [ ] **Step 3: Normalize and validate schema v2**

In `adaptResourcesAndApply`, resolve the selected resource and create `config.floatingButtonBackground`. Add `floatingButtonBackgrounds` to collection validation, require unique nonempty IDs and an `image` path, validate `resourceId`, and restrict optional scale to [50, 200]. Do not alter manifests that omit the section.

- [ ] **Step 4: Apply mapped image settings**

Read `config.floatingButtonBackground.image`, resolve `record.imageAssets[path]`, then call Task 1 `setSettings(filename, scale)` without re-uploading. Rely on imported record `imageAssets` plus the global settings reference collector for package cleanup.

- [ ] **Step 5: Update both templates**

Add an empty `floatingButtonBackgrounds` collection, document `assets/floating-button-backgrounds/`, and give matching Chinese UTF-8 JSON examples with `image`, `resourceId`, and default scale 100.

- [ ] **Step 6: Run full verification and commit**

Run: `npx vitest run src/services/themePackageImportService.test.ts src/services/themeSnapshotService.test.ts && npm run build`

Expected: PASS.

```bash
git add src/services/themePackageService.ts src/services/themePackageImportService.ts src/services/themePackageApplicationService.ts src/services/themePackageImportService.test.ts docs/plans/theme-package-template "docs/plans/theme-package-template - 副本"
git commit -m "主题包支持悬浮按钮背景"
```

## Self-Review

- Task 1 implements the global UI, data model, validation, and image cleanup.
- Task 2 makes saved current settings, backups, snapshots, restoration, and default fallback complete.
- Task 3 provides JSON schema, ZIP assets, import/application behavior, validation, and user templates.
- Each review-focus condition has an owning test, and all named interfaces use the same storage keys and service.

