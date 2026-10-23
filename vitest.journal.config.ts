/**
 * @file vitest.journal.config.ts
 * @input Journal PDF regression tests
 * @output Isolated Node test suite without Electron Vite launch hooks
 * @updated 2026-10-23: Covers date/data, pagination, overlap lanes and six statistical dimensions.
 */
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['src/utils/journalExport.test.ts', 'src/utils/journalTimelineLayout.test.ts', 'src/utils/journalStatistics.test.ts', 'src/utils/journalLogContent.test.ts', 'src/services/journalPdfLayout.test.ts', 'src/services/journalPdfService.test.ts'], testTimeout: 30000 } });
