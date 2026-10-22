/**
 * @file test-sync.mjs
 * @updated 2026-10-07: Includes daily backup scheduling and preference controls.
 * @updated 2026-10-22: Includes conditional-read caches and real WebDAV/COS/S3 adapter regressions.
 * @input Focused cloud-sync protocol, adapter, scheduler and AI backup regression suites
 * @output Vitest results without loading the app's Electron packaging plugins
 * @pos Test Runner
 */
import { startVitest } from 'vitest/node';

const context = await startVitest('test', [
  'src/utils/cloudJsonCache.test.ts',
  'src/services/compatibleS3Service.test.ts',
  'src/services/s3Service.test.ts',
  'src/services/webdavService.test.ts',
  'src/services/webdavRequestQueue.test.ts',
  'src/services/syncService.test.ts',
  'src/utils/syncProtocol.test.ts',
  'src/utils/syncScheduler.test.ts',
  'src/utils/dailyBackupScheduler.test.ts',
  'src/views/settings/PreferencesSettingsView.test.tsx',
  'src/utils/localDataTimestamp.test.ts',
  'src/utils/syncUtils.test.ts',
  'src/utils/syncPayloadMetadata.test.ts',
  'src/utils/dataValidation.test.ts',
  'src/services/syncBackupStability.test.ts',
  'src/services/assistantMemoryService.test.ts',
  'src/services/assistantBackupService.test.ts'
], { config: false, watch: false, environment: 'node', reporters: ['dot'] });
await context.close();
