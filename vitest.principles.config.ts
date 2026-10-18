/**
 * @file vitest.principles.config.ts
 * @input Principle grouping, backup compatibility and AI write regression tests
 * @output Focused Node tests independent of Electron development startup
 * @updated 2026-10-18: Adds principle group feature verification.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/utils/principleGroupUtils.test.ts',
      'src/views/settings/PrincipleLibraryView.test.ts',
      'src/services/assistantActionExecutor.test.ts',
      'src/utils/dataValidation.test.ts'
    ]
  }
});
