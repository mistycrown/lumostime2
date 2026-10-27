/**
 * @file vitest.awareness.config.ts
 * @input App-awareness regression tests
 * @output Node test configuration without Electron startup plugins
 * @pos Test configuration
 * @updated 2026-10-27: Includes legacy WebView UUID compatibility regression tests.
 * @updated 2026-10-18: Adds master switch persistence and restore verification.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['src/utils/__tests__/todoTestSetup.ts'],
    include: ['src/services/appAwarenessService.test.ts', 'src/utils/cryptoCompatibility.test.ts']
  }
});
