/**
 * @file vitest.journal.config.ts
 * @input Journal PDF regression tests
 * @output Isolated Node test suite without Electron Vite launch hooks
 * @updated 2026-10-23: Adds date/data and pagination coverage for journal export.
 */
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['src/utils/journalExport.test.ts', 'src/services/journalPdfLayout.test.ts', 'src/services/journalPdfService.test.ts'], testTimeout: 30000 } });
