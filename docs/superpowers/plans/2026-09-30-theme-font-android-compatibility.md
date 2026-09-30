# Theme Font Android Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow theme packages with valid external fonts to import on Android WebView while preserving desktop behavior and transactional rollback.

**Architecture:** `FontService` will try the existing `ArrayBuffer` `FontFace` source first. When it fails, it will retry with the same Blob encoded as a CSS data URL. `ThemePackageImportService` keeps its existing failure gate and rollback semantics.

**Tech Stack:** TypeScript, browser `FontFace`/`FileReader`, IndexedDB, Vitest.

**Spec:** `docs/plans/2026-09-30-theme-font-android-compatibility-design.md`

## Global Constraints

- Preserve support for `woff2`, `woff`, `ttf`, and `otf` theme fonts.
- Do not modify the rabbit-cloud package or bundle fonts into Android.
- Do not use platform or User-Agent detection; retry from actual registration failure.
- Preserve the existing `FONT_IMPORT_FAILED` transaction rollback semantics.
- Use UTF-8, existing TypeScript formatting, and update modified file headers.

## Review Focus

- Android WebView rejects `ArrayBuffer` but accepts a data URL.
- A compatible browser succeeds initially and never reads a data URL.
- Both strategies fail without saving a custom-font record.
- Generated data URL source is safely quoted for CSS parsing.
- Package-level font failure remains typed and rolls back images and metadata.

---

### Task 1: Add FontFace source fallback coverage

**Files:**

- Create: `src/services/fontService.test.ts`
- Modify: `src/services/fontService.ts:150-245`

**Interfaces:**

- Consumes: `fontService.addCustomFont(file: File, displayName?: string): Promise<AddCustomFontResult>`.
- Produces: mocked `FontFace`, `document.fonts`, IndexedDB, and localStorage tests for custom-font registration.

- [ ] **Step 1: Write failing tests for the three outcomes**

Create `fontService.test.ts` with localStorage and font-storage mocks. Test a first-attempt `ArrayBuffer` success; an `ArrayBuffer` rejection followed by a successful data URL source starting with `url("data:font/ttf;base64,`; and failure of both attempts with `saveFont` never called.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run src/services/fontService.test.ts`

Expected: FAIL because no fallback is implemented.

- [ ] **Step 3: Implement two-stage registration in `fontService.ts`**

Refactor private `registerCustomFont(record: StoredCustomFontRecord): Promise<void>` to attempt `new FontFace(record.familyName, await record.blob.arrayBuffer())`, load it, and add it to `document.fonts`. On failure, call `blobToDataUrl(record.blob)` and retry with a safely quoted `url("${dataUrl}")` source. Add the font ID to `registeredCustomFontIds` only after adding a loaded face. If both attempts fail, throw an error retaining both causes for the caller's current failure path.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npx vitest run src/services/fontService.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the testable font-registration change**

Run:

```bash
git add src/services/fontService.ts src/services/fontService.test.ts
git commit -m "兼容移动端主题字体导入"
```

### Task 2: Pin package-font transaction behavior

**Files:**

- Modify: `src/services/themePackageImportService.test.ts:20-160`
- Modify: `src/services/themePackageImportService.ts:674-686` only if the new test identifies a missing error boundary.

**Interfaces:**

- Consumes: the existing `fontService.addCustomFont` mock and `ThemePackageImportError`.
- Produces: regression proof that a failed packaged TTF produces `FONT_IMPORT_FAILED` and removes images saved before font registration.

- [ ] **Step 1: Write the package import regression test**

Produce a schema-v2 package with one image plus `resources.fonts`/`apply.font` referencing `assets/fonts/theme.ttf`. Make `addCustomFont` return `{ success: false, message: '字体解析失败' }`. Assert that import rejects with `{ code: 'FONT_IMPORT_FAILED' }`, calls `deleteImage` for the already saved image, and leaves `getImportedPackages()` empty.

- [ ] **Step 2: Run the import test and close any proven gap**

Run: `npx vitest run src/services/themePackageImportService.test.ts`

Expected: PASS after adding the regression; if it exposes a gap, make only the minimal `ThemePackageImportService` change necessary to retain its typed error and rollback.

- [ ] **Step 3: Run all affected checks**

Run: `npx vitest run src/services/fontService.test.ts src/services/themePackageImportService.test.ts`

Expected: PASS.

Run: `npm run build`

Expected: production build completes without TypeScript or Vite errors.

- [ ] **Step 4: Commit package transaction coverage**

Run:

```bash
git add src/services/themePackageImportService.ts src/services/themePackageImportService.test.ts
git commit -m "补充主题字体导入回滚测试"
```

## Self-Review

- Task 1 covers the universal runtime fallback and both success/failure results; Task 2 covers package transaction preservation.
- The plan does not alter supported formats, the package manifest, or Android-native code.
- Every review-focus condition is assigned to a test in Task 1 or Task 2.
