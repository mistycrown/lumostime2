/**
 * @file vitest.widget.config.ts
 * @input Native-widget payload and daily-action regression tests.
 * @output Focused tests without Electron startup plugins.
 * @updated 2026-10-29: Adds daily-list and existing weekly-widget regression checks.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['src/services/__tests__/widgetTestSetup.ts'],
    include: ['src/services/widgetService*.test.ts', 'src/utils/dailyCheckUtils.test.ts']
  }
});
