# Theme Font Filename Android Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import ZIP-packaged theme fonts on Android without relying on synthetic `File.name` behavior.

**Architecture:** The font service will accept a Blob and an optional trusted filename, normalize the name once, and use it for validation, display defaults, and persistence. Theme import passes its already validated archive path filename directly and no longer constructs a `File` instance.

**Tech Stack:** TypeScript, browser Blob/File APIs, JSZip, Vitest.

**Spec:** `docs/plans/2026-09-30-theme-font-filename-android-compatibility-design.md`

## Global Constraints

- Preserve the four existing external font formats and the 20 MB size limit.
- Do not change the rabbit-cloud package or remove its font.
- Preserve the existing FontFace data URL fallback and package transaction rollback.
- Do not perform platform or User-Agent detection.

## Review Focus

- A real user-uploaded File with a string name must still import normally.
- A ZIP Blob plus explicit `.ttf` filename must not invoke the File constructor.
- A Blob with an absent or non-string name and no explicit name must fail cleanly, never with `.split`.
- The parsed filename must be persisted in the custom-font record.
- Failed packaged font imports must still remove resources saved before registration.

---

### Task 1: Decouple custom fonts from `File.name`

**Files:**

- Modify: `src/services/fontService.ts:100-270`
- Modify: `src/services/fontService.test.ts:1-119`

**Interfaces:**

- Consumes: `addCustomFont(blob: Blob | File, displayName?: string, fileName?: string)`.
- Produces: filename normalization used before extension validation and stored as `StoredCustomFontRecord.fileName`.

- [ ] **Step 1: Write failing filename-resolution tests**

Cover an ordinary File with `theme.ttf`, a bare Blob with explicit `rabbit.ttf`, and an object whose `name` is non-string without an explicit filename. Assert the first two use the expected format and persist the resolved name; assert the last returns `success: false` without throwing.

- [ ] **Step 2: Run the focused test**

Run: `npx vitest run src/services/fontService.test.ts`

Expected: FAIL because `addCustomFont` requires `File` and calls `.split` on its name.

- [ ] **Step 3: Implement normalized filename handling**

Change `addCustomFont` to accept `Blob | File` plus `fileName?: string`. Add a private resolver that prefers a trimmed explicit name, otherwise returns a trimmed string `name` property, otherwise `''`. Make `detectFontFormat` accept `unknown` and return `null` unless it receives a non-empty string. Use the resolved name for format inference, display-name fallback, and `StoredCustomFontRecord.fileName`.

- [ ] **Step 4: Run focused font-service tests**

Run: `npx vitest run src/services/fontService.test.ts`

Expected: PASS.

### Task 2: Pass ZIP font Blob and validated filename directly

**Files:**

- Modify: `src/services/themePackageImportService.ts:674-686`
- Modify: `src/services/themePackageImportService.test.ts:140-230`

**Interfaces:**

- Consumes: `fontService.addCustomFont(fontBlob, fontConfig.displayName, getFilename(fontConfig.file))`.
- Produces: a package importer that never calls `new File` for an archived font.

- [ ] **Step 1: Write a failing importer call-shape assertion**

Use the existing custom-font ZIP helper. Mock `addCustomFont` to succeed and assert it receives the extracted Blob, display name, and `theme.ttf`; spy on `globalThis.File` to prove importing does not construct a File.

- [ ] **Step 2: Implement Blob-forwarding in the importer**

Replace the synthetic `new File` line with the direct Blob call described above. Keep all existing validation and `FONT_IMPORT_FAILED` handling unchanged.

- [ ] **Step 3: Run affected tests and build**

Run: `npx vitest run src/services/fontService.test.ts src/services/themePackageImportService.test.ts`

Expected: PASS.

Run: `npm run build`

Expected: completes without TypeScript or Vite errors.

- [ ] **Step 4: Commit only the font compatibility files**

```bash
git add src/services/fontService.ts src/services/fontService.test.ts src/services/themePackageImportService.ts src/services/themePackageImportService.test.ts
git commit -m "修复移动端主题字体文件名兼容"
```

## Self-Review

- Task 1 owns all direct `.name` and `.split` behavior, including the Android-shaped non-string case.
- Task 2 owns the importer boundary and verifies it no longer creates a File.
- The five review-focus cases are covered by the listed tests; existing FontFace fallback behavior remains intact.
