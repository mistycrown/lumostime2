/**
 * @file vitest.journal.config.ts
 * @input Journal PDF regression tests
 * @output Isolated Node test suite without Electron Vite launch hooks
 * @updated 2026-10-24: Covers data/layout, Markdown, uploaded fonts and bounded native file transfers.
 */
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['src/utils/journalExport.test.ts', 'src/utils/journalTimelineLayout.test.ts', 'src/utils/journalStatistics.test.ts', 'src/utils/journalLogContent.test.ts', 'src/utils/journalMarkdown.test.ts', 'src/services/journalPdfLayout.test.ts', 'src/services/journalPdfService.test.ts', 'src/services/journalPdfFonts.test.ts', 'src/services/journalNativeFile.test.ts'], testTimeout: 30000 } });
