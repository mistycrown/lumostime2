/**
 * @file vitest.s3.config.ts
 * @input Compatible-S3 and desktop network boundary regressions
 * @output Node tests without application launch plugins
 * @updated 2026-10-30: Adds focused cross-platform client identity verification.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/services/compatibleS3*.test.ts', 'src/utils/compatibleS3Transport.test.ts', 'src/utils/cloudJsonCache.test.ts', 'electron/compatibleS3Request.test.ts']
  }
});
