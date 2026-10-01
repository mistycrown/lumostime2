# 图片预览多图切换与长图阅读 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use native execution in this session and verify each task before handoff.

**Goal:** Let every shared image preview browse the current record's attachments horizontally while making long images readable with width-fit vertical scrolling.

**Architecture:** Keep `ImagePreviewModal` as the sole full-screen viewer and add a normalized image-source list with a selected index. The modal resolves stored image filenames itself, renders a native scroll-snap carousel for multi-image sets, and selects a native vertical-scrolling renderer when a loaded image would exceed the available viewport at fitted width. Existing single-URL callers remain supported.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, react-zoom-pan-pinch, Lucide React, Vitest, Vite.
**Spec:** `docs/plans/2026-10-01-image-preview-ux-design.md`

## Global Constraints

- Use UTF-8 encoding and preserve/update source-file header comments plus relevant folder READMEs.
- Preserve all existing unrelated working-tree changes, including `TimePalCard.tsx`, `TimePalSettings.tsx`, `storageKeys.ts`, the three detail views, `TodoView.tsx`, and `timePalDisplay.*`.
- Do not compile the Android project.
- Do not add a carousel dependency; reuse the existing preview and image service stack.
- Run focused Vitest coverage and `npm run build` before delivery.

## Review Focus

- A single-image caller must retain its existing preview, close, download, and optional delete behavior. (Task 2)
- The clicked attachment must open at its matching index, including gallery records with multiple images. (Tasks 1 and 3)
- A very tall image must fit the available width and accept vertical touch scrolling without the zoom library consuming the gesture. (Tasks 1 and 2)
- Switching slides must reset rotation/zoom and keep the toolbar's download/delete action bound to the active source. (Task 2)
- Missing or failed image sources must show an isolated fallback page without blocking navigation to valid siblings. (Task 2)

### Task 1: Define and test preview-list helpers

**Files:**
- Create: `src/components/imagePreviewUtils.ts`
- Create: `src/components/imagePreviewUtils.test.ts`

**Interfaces:**
- Produces: `ImagePreviewItem`, `normalizeImagePreviewItems(imageUrl, images)`, `getInitialPreviewIndex(index, length)`, and `isLongPreviewImage(naturalWidth, naturalHeight, viewportWidth, viewportHeight)`.
- Consumed by: `ImagePreviewModal.tsx` and its call sites.

- [ ] **Step 1: Write failing utility tests**

Test legacy single URLs, supplied list entries, empty-list fallback, initial-index clamping, and viewport-relative tall-image detection (including an image that exactly fits the viewport).

- [ ] **Step 2: Run the focused test to verify failure**

Run: `npx vitest run src/components/imagePreviewUtils.test.ts`
Expected: FAIL because the helper module does not exist.

- [ ] **Step 3: Implement the preview-item and viewport helpers**

Create the named helper module. Each image item stores a source string and optional download filename; list normalization keeps the old `imageUrl` prop usable. Treat an image as long only when its fitted-width height exceeds the image viewport height.

- [ ] **Step 4: Run the focused test to verify success**

Run: `npx vitest run src/components/imagePreviewUtils.test.ts`
Expected: PASS.

### Task 2: Upgrade the shared full-screen viewer

**Files:**
- Modify: `src/components/ImagePreviewModal.tsx`
- Modify: `src/components/ImagePreviewControls.tsx`
- Modify: `src/components/README.md`

**Interfaces:**
- Consumes: the Task 1 helper exports, `imageService.getImageUrl`, and existing `saveImageFromUrl` behavior.
- Produces: optional `images`, `initialIndex`, and active-item-aware deletion support while preserving `imageUrl`, `downloadFilename`, `onClose`, and old single-image callers.

- [ ] **Step 1: Add the list-aware modal contract and active-source resolution**

Accept normalized stored filenames, blob/data URLs, and HTTP URLs. Resolve stored sources as originals through `imageService`, avoid late async results replacing a newer active slide, and make download/delete act on the resolved active item.

- [ ] **Step 2: Render swipeable slides and accessible non-touch navigation**

Use a horizontal scroll-snap container for two or more images; synchronize its selected index from scroll position, show a compact `current / total` indicator, and expose previous/next toolbar or overlay actions plus ArrowLeft/ArrowRight keyboard navigation when adjacent items exist. Reset rotation and zoom when selection changes.

- [ ] **Step 3: Add the width-fit long-image renderer**

Record each active image's natural dimensions. Use the existing transform renderer for ordinary images; when Task 1 identifies a long image, render it at the available width inside an `overflow-y-auto` slide with `touch-action: pan-y`, and hide conflicting transform-only controls for that mode. Keep the fixed close/download/delete controls reachable.

- [ ] **Step 4: Preserve failures and modal/back behavior**

Render the existing missing-image fallback per failed slide, retain backdrop closing and Android delete-confirmation/back-button ordering, and ensure a failed neighbor does not close the viewer or disable navigation.

- [ ] **Step 5: Update component documentation**

Add dated `@updated` entries to the two source headers and a concise entry in `src/components/README.md` describing grouped attachment preview, long-image scrolling, and retained single-image compatibility.

### Task 3: Pass each record's attachment group into the viewer

**Files:**
- Modify: `src/components/AddLogModal.tsx`
- Modify: `src/components/TimelineItem.tsx`
- Modify: `src/components/GalleryView.tsx`
- Modify: `src/views/TimelineView.tsx`
- Modify: `src/views/settings/CollectionSettingsView.tsx`
- Modify: `src/views/README.md`

**Interfaces:**
- Consumes: Task 2 `ImagePreviewModal` list props and each view's existing image filename/media array.
- Produces: a selected attachment index and its current record's complete image-source list for the shared viewer.

- [ ] **Step 1: Wire editing-record attachments and active deletion**

In `AddLogModal`, pass `imageManager.images` in attachment order and derive `initialIndex` from `previewFilename`; route deleting the active preview item to the existing image-manager deletion flow so its filename, URL map, and visible thumbnail list stay synchronized.

- [ ] **Step 2: Wire timeline and collection record media**

Replace URL-only preview state with selected-index/session state in `TimelineItem`, `TimelineView`, and `CollectionSettingsView`. On each thumbnail click, pass the complete `entry.media` or record `images` array in its stored order and the clicked index; preserve support for direct HTTP/data media in collections.

- [ ] **Step 3: Scope gallery navigation to its source record**

When a gallery thumbnail opens, pass only `item.log.images` and that thumbnail's index, never the global `galleryItems` sequence. Preserve original-image retrieval through the shared modal rather than eagerly fetching every sibling in the gallery grid.

- [ ] **Step 4: Update view documentation and headers**

Add dated header entries in all modified views/components and note the shared attachment-scoped preview behavior in `src/views/README.md`.

### Task 4: Verify the completed interaction

**Files:**
- Inspect: `src/components/ImagePreviewModal.tsx`
- Inspect: `src/components/imagePreviewUtils.test.ts`
- Inspect: all Task 3 call sites

- [ ] **Step 1: Run focused tests**

Run: `npx vitest run src/components/imagePreviewUtils.test.ts`
Expected: PASS.

- [ ] **Step 2: Perform a focused manual smoke test**

Verify a one-image entry, a record with three images, a tall portrait/screenshot, gallery grouping, active-image download/delete, and Android-back code path in the development app or by code-path review if device runtime is unavailable.

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 4: Review the worktree and commit only task files**

Run `git status --short` and `git diff --check`; stage only the listed image-preview implementation, tests, documentation, and plan/design files. Leave all unrelated existing edits unstaged, then commit with a focused Chinese subject.
