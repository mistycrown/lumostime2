/**
 * @file vitest.sync.config.ts
 * @input Shared cloud-sync transfer, protocol, scheduling and feedback tests
 * @output Focused Node regressions without launching the desktop application
 * @updated 2026-10-30: Covers persistent progress and settled image counters.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/services/syncService.test.ts', 'src/utils/syncUtils.test.ts', 'src/utils/syncProtocol.test.ts', 'src/utils/syncScheduler.test.ts', 'src/components/SyncProgress.test.tsx']
  }
});
