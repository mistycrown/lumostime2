/**
 * @file vitest.feishu.config.ts
 * @input Focused Feishu API/server/client and import-range test modules.
 * @output Node-based integration unit tests without Electron renderer polyfills.
 * @pos Test configuration.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    execArgv: ['--experimental-sqlite'],
    include: ['server/feishu/*.test.ts', 'scripts/feishu*.test.ts', 'electron/feishuConnection.test.ts', 'src/services/feishuCalendarClient.test.ts', 'src/utils/feishu*.test.ts', 'src/components/FeishuConnectionPanel.test.tsx', 'src/views/settings/FeishuCalendarSettingsView.test.tsx']
  }
});
