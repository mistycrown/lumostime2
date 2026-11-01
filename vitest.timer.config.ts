/**
 * @file vitest.timer.config.ts
 * @input Timer preferences, NFC decisions and widget regression suites
 * @output Isolated Node checks without application build plugins
 * @updated 2026-11-01: Groups the affected simultaneous timing regression suites.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['src/services/__tests__/widgetTestSetup.ts'],
    include: [
      'src/services/widgetService*.test.ts',
      'src/services/preferencesBackupService.test.ts',
      'src/views/settings/PreferencesSettingsView.test.tsx',
      'src/utils/nfc*.test.ts',
      'src/utils/sessionPersistence.test.ts'
    ]
  }
});
