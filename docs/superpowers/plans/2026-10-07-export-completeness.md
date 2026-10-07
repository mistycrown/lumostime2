# Export Completeness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use native execution in this repository. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Obsidian and XLSX exports to preserve current log metadata and related datasets while fixing date-range bugs.

**Architecture:** Add shared export serialization helpers for attribute labels and JSON-safe cells. Expand the XLSX service to build the existing log sheet plus related data sheets. Expand Obsidian inputs and Markdown sections, and make callers pass already-filtered data to every report generator.

**Tech Stack:** React + TypeScript, SheetJS (`xlsx`), Electron IPC, Vitest.
**Spec:** `docs/plans/2026-10-07-export-completeness-design.md`

## Global Constraints

- Use UTF-8, 2-space indentation, single quotes, and semicolons.
- Preserve and update source header comments when modifying files.
- Keep Android compilation out of scope; run the web/Electron production build.
- Do not include binary image data inside XLSX; preserve image identifiers and existing Obsidian attachment copying.

## Review Focus

- Attribute values with text, number, single-choice, and multi-choice shapes must retain both raw IDs and readable labels.
- A single-day export must never include logs from another day in its statistics.
- Historical reviews and review-only periods must not be silently dropped.
- Empty related datasets must produce valid sheets/sections.
- Re-exporting an existing Obsidian path must not duplicate old content.

### Task 1: Shared Export Serialization

**Files:**
- Create: `src/utils/exportSerialization.ts`
- Test: `src/utils/exportSerialization.test.ts`

**Interfaces:**
- Produces `serializeAttributeValues(values, activity)` and `serializeJsonCell(value)` helpers for both exporters.

- [ ] Add tests for all four attribute value shapes and JSON serialization.
- [ ] Implement readable option-label resolution while retaining raw JSON.
- [ ] Run the focused Vitest file and commit.

### Task 2: XLSX Dataset Export

**Files:**
- Modify: `src/services/excelExportService.ts`
- Modify: `src/views/settings/DataManagementView.tsx`
- Modify: `src/views/SettingsView.tsx`
- Modify: `src/App.tsx`
- Test: `src/services/excelExportService.test.ts`

**Interfaces:**
- Extend `exportLogsToExcel` with optional nodes, node categories, collections, collection entries, and reviews.
- Return the same native/web result shape and preserve the `时间记录` sheet name.

- [ ] Test log columns, dynamic attributes, and related sheet contents.
- [ ] Add complete log metadata columns and related dataset sheets using JSON-safe cells.
- [ ] Thread current datasets from `App` through settings to the exporter.
- [ ] Run focused tests and commit.

### Task 3: Obsidian Markdown Completeness

**Files:**
- Modify: `src/services/obsidianExportService.ts`
- Modify: `src/views/ObsidianExportView.tsx`
- Modify: `src/views/SettingsView.tsx`
- Modify: `src/App.tsx`
- Modify: `electron/main.ts`
- Test: `src/services/obsidianExportService.test.ts`

**Interfaces:**
- Extend Obsidian inputs with related datasets needed for supplemental sections.
- Keep existing path and export option APIs compatible.

- [ ] Test attribute rendering, review metadata, and filtered daily statistics.
- [ ] Add complete log/review/related-data sections and pass selected-range datasets.
- [ ] Fix historical review selection and replace-on-write IPC behavior.
- [ ] Run focused tests and commit.

### Task 4: Verification

- [ ] Run all focused exporter tests.
- [ ] Run `npm run build`.
- [ ] Inspect `git diff` and `git status`, then commit only implementation and test files.
