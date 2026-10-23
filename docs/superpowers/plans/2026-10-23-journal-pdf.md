# Journal PDF Export Implementation Plan

**Goal:** Export selected local data as a configurable, paginated Chinese journal PDF from Data Management.
**Architecture:** Pure date/data projection → page-aware PDF composition → existing platform download conventions. Isolated export panel owns options, progress and cancellation; PDF/font dependencies load only on export.
**Tech Stack:** React, TypeScript, pdf-lib, fontkit, bundled LXGW WenKai, Capacitor Filesystem, Vitest, Electron Chromium.
**Spec:** docs/plans/2026-10-23-journal-pdf-design.md

## Global Constraints

UTF-8; source in existing src structure with headers; native execution in this session; no Android compilation; no unrelated changes staged. Maximum 3660 days and 1000 pages. Chinese font must be bundled and verified. No user data uploads.

## Review Focus

- Date parsing and partial week/month boundaries must never include adjacent records.
- Cross-midnight actual and planned records must allocate time separately without double counting.
- Repeated tasks preserve skipped dates and per-occurrence completion.
- Long content, missing reviews and many checks must paginate without loss or overlaps.
- Cancel/failure paths must re-enable the UI and never download partial PDFs.

### Task 1: Project data

**Files:** src/utils/journalExport.ts, src/utils/journalExport.test.ts
**Interfaces:** JournalExportData + JournalExportOptions → buildJournalModel(data, options): JournalModel. Stable local date keys and daily logs, todo projections, checks and reviews.

- [x] Test invalid/reversed dates, end-day inclusion, midnight splits, planned/actual totals, recurring status, check snapshots and review boundaries.
- [x] Implement pure model with strict validation, calendar helpers, reusable scheduling and auto-check evaluation.
- [x] Run targeted Vitest checks through isolated configuration.

### Task 2: Compose and save PDF

**Files:** src/services/journalPdfService.ts, src/services/journalPdfLayout.ts, package.json, package-lock.json
**Interfaces:** createJournalPdf(data, options, onProgress?, signal?): Promise<{ bytes: Uint8Array; pageCount: number }>; exportJournalPdf saves completed bytes and returns filename/path/page count.

- [x] Register bundled Chinese TrueType font once for all pages and compose cover/contents plus seven optional sections. Embed in full because current fontkit subsets drop WenKai outlines.
- [x] Implement measured wrapping, page headers/footers, continuation, matrix/calendar layouts, unsupported-symbol fallback and cancellation.
- [x] Verify real A4/A5 PDFs by extraction and rendered-page inspection, including long paragraphs and mixed emoji.

### Task 3: Add export controls and verify

**Files:** src/views/settings/JournalPdfExportPanel.tsx, src/views/settings/DataManagementView.tsx, src/views/SettingsView.tsx, scripts/test-journal-pdf-renderer.mjs, relevant folder READMEs.
**Interfaces:** Panel accepts JournalExportData and onToast, with independent export state.

- [x] Implement date presets, section checkboxes, size, empty dates, cover, progress and cancel; wire current goals and existing datasets.
- [x] Run native Chromium smoke checks of mobile/desktop controls and real PDF downloads; inspect screenshots.
- [x] Run focused tests and npm run build, review current-task diff/status, commit only this feature.

## Verification result

- 15 focused Vitest checks passed.
- Native Chromium panel smoke checks passed for A4/A5 downloads, failure recovery, cancellation and empty data.
- Rendered and inspected 24-page A4 and 29-page A5 samples; Chinese glyphs, full notes, contents, page numbers and bounds verified. Both samples are about 8.4 MB with one shared full font.
- npm run build passed; npx cap sync android completed without compiling Android.
- Full repository TypeScript checking still reports pre-existing errors; no diagnostics reference the new journal modules.
- Generated font remains in local public/ assets under the existing ignore policy; the preparation script documents reproduction.
