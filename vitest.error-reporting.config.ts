/**
 * @file vitest.error-reporting.config.ts
 * @input Error-reporting and diagnostic identity regression tests
 * @output Isolated Node tests without Electron startup or production integrations
 * @pos Test configuration
 * @updated 2026-10-25: Adds focused coverage for automatic and manual error receipts.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/services/errorReporting*.test.ts', 'src/services/diagnosticIdentityService.test.ts']
  }
});
