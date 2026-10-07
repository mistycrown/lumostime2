# Modern Navigation Offset Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use native execution to implement this plan task-by-task.

**Goal:** Keep `navigation_new_background_settings` local-only so modern navigation positioning is not exported or cloud-synchronized.

**Architecture:** Remove the storage key from the appearance backup allowlist. Existing localStorage reads and navigation rendering remain unchanged; restore naturally ignores the omitted key and preserves destination-device settings.

**Tech Stack:** React, TypeScript, Vitest.
**Spec:** `docs/plans/2026-10-07-modern-navigation-offset-sync-design.md`

## Global Constraints

- Use UTF-8, existing TypeScript style, and preserve source header comments.
- Do not alter unrelated pre-existing working-tree changes.
- Do not compile the Android project.

## Review Focus

- Captured appearance payload must omit the local-only settings key.
- Applying a payload must not overwrite an existing destination-device settings value.
- Legacy payloads that still contain the key must be ignored rather than restored.

### Task 1: Exclude Modern Navigation Settings From Appearance Sync

**Files:**
- Modify: `src/services/appearanceBackupService.ts`
- Test: `src/services/appearanceBackupService.test.ts`

**Interfaces:**
- Consumes: existing `appearanceBackupService.buildBackupPayload()` and `applyBackupPayload()` APIs.
- Produces: appearance payloads without `navigation_new_background_settings`; all other appearance storage behavior unchanged.

- [ ] **Step 1: Update regression coverage**

  Assert that `buildBackupPayload().storage` omits `navigation_new_background_settings`, that applying a payload leaves a pre-existing local value unchanged, and that an old payload containing the field is ignored.

- [ ] **Step 2: Run the focused test**

  Run: `npx vitest run src/services/appearanceBackupService.test.ts`

  Expected: the new assertions fail before the allowlist change and pass afterward.

- [ ] **Step 3: Remove the key from `APPEARANCE_STORAGE_KEYS`**

  Keep `navigation_new_mode_enabled`, `navigation_new_background`, custom background list, icon settings, and transparency settings in the allowlist.

- [ ] **Step 4: Run focused and production verification**

  Run: `npx vitest run src/services/appearanceBackupService.test.ts` and `npm run build`.

  Expected: both commands pass.

- [ ] **Step 5: Commit**

  Stage only the design/plan files and the two appearance backup files, then commit with `修复新版导航栏偏移不同步`.
