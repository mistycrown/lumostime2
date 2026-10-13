/**
 * @file vitest.desktop.config.ts
 * @input Desktop startup and widget persistence regression tests
 * @output Node tests independent of Vite's Electron launch plugins
 * @pos Test configuration
 * @updated 2026-10-13: Added focused desktop startup checks.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['electron/desktopWidgetState.test.ts', 'electron/loginItemSettings.test.ts', 'src/services/desktopWidgetService.test.ts']
  }
});
