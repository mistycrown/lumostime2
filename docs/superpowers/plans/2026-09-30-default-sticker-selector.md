# 默认贴纸选择器紧凑化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the default selector-page control into the fish-feeding Icon tab's Sticker section and replace its long list with a bottom-sheet picker.

**Architecture:** Keep `defaultSelectorPage` persistence and `MoodPicker` routing untouched. `EmojiSettingsView` stops rendering the old card. `SponsorshipView` owns the bottom-sheet open state and derives its choices from the same available sticker sets or resolved new-selector groups that `MoodPicker` can open.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Vitest, Vite.

**Spec:** `docs/plans/2026-09-30-default-sticker-selector-design.md`

## Global Constraints

- Source files must use UTF-8, 2-space indentation, single quotes, and semicolons.
- Preserve and update source-file header comments when modifying source files.
- Keep settings labels concise; do not add explanatory microcopy unless required by the specification.
- Do not change `defaultSelectorPage` storage, its default value, or `MoodPicker` page-resolution behavior.
- Do not compile Android from this workspace.

## Review Focus

- A saved `emoji` default remains selectable and displays as “Emoji 页” in the compact row.
- With the new sticker selector disabled, every currently available sticker set is selectable.
- With the new sticker selector enabled, only resolved, currently usable large groups are selectable, and their group IDs are saved.
- A stale saved ID displays a safe fallback label and does not prevent opening the sheet.
- Selecting an option closes the sheet immediately; tapping the backdrop or close button does not alter the saved selection.

---

### Task 1: Relocate the default-page control and provide picker choices

**Files:**

- Modify: `src/views/settings/EmojiSettingsView.tsx:123,407-451`
- Modify: `src/views/SponsorshipView.tsx:88-90,426-440,510-520,1872-2062`

**Interfaces:**

- Consumes: `defaultSelectorPage`, `setDefaultSelectorPage`, `stickerSelectorConfig`, `stickerService.getAllStickerSets()`, and `resolveStickerSelectorGroups(config, stickerSets)`.
- Produces: an Icon-tab “默认贴纸” row and an in-place bottom sheet whose option values are compatible with `MoodPicker`.

- [ ] **Step 1: Remove the old selector-default card from `EmojiSettingsView.tsx`**

Delete the verified-only `Selector 默认页` block and remove `defaultSelectorPage`, `setDefaultSelectorPage`, and `stickerService` imports/usages that become unused. Keep emoji style, emoji-group, and reaction settings unchanged.

- [ ] **Step 2: Add derived default-page choices in `SponsorshipView.tsx`**

Import `resolveStickerSelectorGroups`. Build memoized options containing `{ id: string; name: string }`: use resolved group IDs and names when `stickerSelectorConfig.enabled`, otherwise use `selectorSourceSets`. Prefix both cases with `{ id: 'emoji', name: 'Emoji 页' }`; derive the row's displayed name by matching `defaultSelectorPage`, with `Emoji 页` as the stale-ID fallback.

- [ ] **Step 3: Add the compact row beneath the Sticker configuration**

Add `isDefaultSelectorSheetOpen: boolean` state. At the end of the Sticker section, render a full-width button labeled “默认贴纸”, with the derived current name and `ChevronRight`; it opens the sheet. Retain the existing sticker editor, upload controls, and new-selector group editor in their current order.

- [ ] **Step 4: Add the bottom-sheet picker**

Render a `fixed` backdrop with `role="dialog"` and `aria-modal="true"`, aligned to the bottom on mobile and centered on desktop, using the project’s existing rounded sheet/backdrop styling. Include a concise “默认贴纸” title, a close button, and one button per derived option. Clicking an option calls `setDefaultSelectorPage(option.id)` then closes the sheet; clicking only the backdrop or close button closes it without saving. Mark the selected option with the existing `Check` icon.

- [ ] **Step 5: Update the modified file headers**

Add a dated `@updated` entry to `EmojiSettingsView.tsx` and `SponsorshipView.tsx` describing the relocated compact default-sticker picker.

### Task 2: Verify behavior and ship the focused UI change

**Files:**

- Modify: `src/views/settings/EmojiSettingsView.tsx`
- Modify: `src/views/SponsorshipView.tsx`

**Interfaces:**

- Consumes: the picker behavior from Task 1.
- Produces: a production-buildable settings UI with verified page-selection routing.

- [ ] **Step 1: Perform the default-selector manual smoke checks**

Open the Icon tab’s Sticker section in a redeemed session. Confirm the old long card is gone from Emoji and Sticker settings; verify the compact row opens the sheet, selecting Emoji and a normal sticker set saves and closes it, and backdrop/close do not save. Enable the new sticker selector and verify the sheet presents usable large groups; select one and confirm the mood picker opens on that group.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: exit code 0 with Vite production assets generated successfully.

- [ ] **Step 3: Inspect the focused diff**

Run: `git diff --check` and `git diff -- src/views/settings/EmojiSettingsView.tsx src/views/SponsorshipView.tsx`

Expected: no whitespace errors; only removal of the old card and addition of the Icon-tab row/sheet behavior.

- [ ] **Step 4: Commit the completed feature**

```bash
git add src/views/settings/EmojiSettingsView.tsx src/views/SponsorshipView.tsx
git commit -m "紧凑化默认贴纸选择"
```
