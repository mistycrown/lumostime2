# Navigation Icon Size Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users and imported theme packages set the size of modern navigation image icons without changing text navigation.

**Architecture:** Persist a normalized `iconScale` percentage with the existing navigation-icon selection, then reuse its change event to update settings and navigation immediately. Theme-package parsing carries a validated `apply.navigation.iconScale` into normalized navigation config; package application persists it only when supplied.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest, JSZip
**Spec:** `docs/plans/2026-09-30-navigation-icon-size-design.md`

## Global Constraints

- Use UTF-8 source files, 2-space TypeScript indentation, single quotes, and semicolons.
- Only custom image icon navigation receives the setting; text navigation appearance remains unchanged.
- `iconScale` is an integer percentage with default `100` and inclusive valid range `70` to `140`.
- Theme packages retain schema version 2; omitting `apply.navigation.iconScale` preserves a user's existing scale.
- Update file header `@updated` comments on every modified source and test file.

## Review Focus

- Missing, legacy, decimal, NaN, and out-of-range stored values resolve to a safe integer percentage; Task 1 tests this.
- Changing scale dispatches the existing navigation-icon event so a mounted navigation refreshes; Task 1 tests this.
- A text-only theme package must not unexpectedly introduce a non-default image scale; Task 2 tests this.
- A package with no `iconScale` retains the current scale when it applies image icons; Task 2 tests this.
- Theme JSON values outside 70 to 140 or non-integers fail with the precise configuration path; Task 2 tests this.

---

### Task 1: Persist and expose navigation image icon scale

**Files:**
- Modify: `src/services/navigationIconService.ts`
- Modify: `src/services/navigationIconService.test.ts`

**Interfaces:**
- Produces: `NavigationIconSelection.iconScale: number` and `navigationIconService.setIconScale(scale: number): void`.
- Consumes: `NAVIGATION_ICON_CHANGE_EVENT` and the existing `navigation_icon_selection_v1` persisted object.

- [ ] **Step 1: Write failing service tests for default, normalization, persistence, and change notification**

Add tests that assert a selection without `iconScale` returns `100`; stored values `69`, `141`, `100.5`, and non-numbers resolve to a valid integer in `[70, 140]`; `setIconScale(125)` saves `iconScale: 125` without altering the active scheme; and exactly one navigation-icon change event is dispatched.

- [ ] **Step 2: Run the focused test file to verify it fails**

Run: `npx vitest run src/services/navigationIconService.test.ts`

Expected: FAIL because `iconScale` and `setIconScale` do not exist.

- [ ] **Step 3: Add normalized scale support to `navigationIconService`**

Extend `NavigationIconSelection` with `iconScale: number`. Add exported constants for the default and inclusive bounds, and a pure normalizer that accepts unknown input, rounds finite values, clamps them to 70 through 140, and uses 100 for absent or invalid values. Make `getSelection()` return the normalized value and implement `setIconScale(scale: number): void` through `saveSelection` so existing event semantics apply.

- [ ] **Step 4: Run the focused test file to verify it passes**

Run: `npx vitest run src/services/navigationIconService.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the service change**

Run: `git add src/services/navigationIconService.ts src/services/navigationIconService.test.ts && git commit -m "add navigation icon scale"`

### Task 2: Carry and apply the scale in theme packages

**Files:**
- Modify: `src/services/themePackageService.ts`
- Modify: `src/services/themePackageService.test.ts`
- Modify: `src/services/themePackageApplicationService.ts`
- Modify: `src/services/themePackageApplicationService.test.ts`
- Modify: `docs/plans/theme-package-template/theme.json`
- Modify: `docs/plans/theme-package-template/README.md`
- Modify: `docs/plans/2026-09-26-theme-package-design.md`

**Interfaces:**
- Consumes: `apply.navigation.iconScale?: number`, `NavigationIconSelection.iconScale`, and the Task 1 bounds.
- Produces: normalized manifest config `navigation.iconScale?: number`; imported custom-image selection retaining or setting `iconScale`.

- [ ] **Step 1: Write failing parser tests for supported and invalid JSON fields**

In `themePackageService.test.ts`, extend the existing custom-icon navigation package fixture with `iconScale: 125` and assert normalized config preserves it. Add cases for `69`, `141`, `100.5`, and a string, each expecting `INVALID_CONFIGURATION` at `config.navigation.iconScale`.

- [ ] **Step 2: Write failing application tests for supplied and omitted scale**

In `themePackageApplicationService.test.ts`, apply an image-icon package with `iconScale: 125` and assert persisted selection contains `125`. Apply another image-icon package with no scale after persisting `iconScale: 115`, and assert the result retains `115`. Assert the existing text-only package path does not write an image-scale override.

- [ ] **Step 3: Run package tests to verify they fail**

Run: `npx vitest run src/services/themePackageService.test.ts src/services/themePackageApplicationService.test.ts`

Expected: FAIL because parsing and application ignore `iconScale`.

- [ ] **Step 4: Preserve and validate `navigation.iconScale` during schema-v2 adaptation**

In `themePackageService.ts`, copy `apply.navigation.iconScale` into normalized navigation config only when present. Reject values that are not finite integers from 70 through 140 with `ThemePackageValidationError('INVALID_CONFIGURATION', ..., 'config.navigation.iconScale')`. Keep validation compatible with legacy schema configuration.

- [ ] **Step 5: Apply a package scale only when custom image icons are applied**

In `themePackageApplicationService.ts`, write the validated `navigation.iconScale` into the custom-icon selection when it is present; otherwise read and retain `navigationIconService.getSelection().iconScale`. Leave the text-only branch’s selection shape and scale behavior unchanged.

- [ ] **Step 6: Document the JSON contract**

Add `"iconScale": 100` to the template’s modern navigation example or create a minimal modern-navigation example if absent. Document that it is an optional integer percentage from 70 to 140, affects custom image icons only, and is omitted to preserve the existing user preference. Mirror this in the canonical format specification.

- [ ] **Step 7: Run package tests to verify they pass**

Run: `npx vitest run src/services/themePackageService.test.ts src/services/themePackageApplicationService.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit the package support**

Run: `git add src/services/themePackageService.ts src/services/themePackageService.test.ts src/services/themePackageApplicationService.ts src/services/themePackageApplicationService.test.ts docs/plans/theme-package-template/theme.json docs/plans/theme-package-template/README.md docs/plans/2026-09-26-theme-package-design.md && git commit -m "support navigation icon scale in themes"`

### Task 3: Add the settings control and scaled navigation rendering

**Files:**
- Modify: `src/components/NavigationIconSelector.tsx`
- Modify: `src/components/BottomNavigation.tsx`

**Interfaces:**
- Consumes: `NavigationIconSelection.iconScale`, `navigationIconService.setIconScale(scale: number)`, and the 70 to 140 bounds from Task 1.
- Produces: a live percentage-range control for image navigation and inline image dimensions proportional to the mobile/desktop baselines.

- [ ] **Step 1: Add the control to the image-icon settings section**

Render a labelled range input only when `selection.mode !== 'text'`, with `min={70}`, `max={140}`, `step={1}`, `value={selection.iconScale}`, and an accessible label that includes the current percentage. On change, call `navigationIconService.setIconScale(Number(event.target.value))`; subscription-based reload already keeps the value current.

- [ ] **Step 2: Apply the selected scale to navigation image dimensions**

Replace the fixed Tailwind width/height classes for the navigation image in `BottomNavigation.tsx` with an inline style that scales the existing 28px mobile and 36px desktop baselines via CSS `clamp()` or a responsive CSS custom property. Retain `object-contain`, active/inactive opacity, error fallback, item layout, and label typography unchanged.

- [ ] **Step 3: Perform a browser smoke test**

Run: `npm run dev`

Expected: In a custom image scheme, moving the new control from 70% to 140% immediately changes all five image icons; switching to text hides the control and preserves text navigation; icon labels remain the same size.

- [ ] **Step 4: Run regression and production checks**

Run: `npx vitest run src/services/navigationIconService.test.ts src/services/themePackageService.test.ts src/services/themePackageApplicationService.test.ts && npm run build`

Expected: all tests and build succeed.

- [ ] **Step 5: Commit the UI integration**

Run: `git add src/components/NavigationIconSelector.tsx src/components/BottomNavigation.tsx && git commit -m "add navigation icon size control"`
