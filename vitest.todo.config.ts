/**
 * @file vitest.todo.config.ts
 * @input Todo scheduling and related sidebar/widget regression tests
 * @output Node test runner independent of Vite's Electron launch plugins
 * @pos Test configuration
 * @updated 2026-10-14: Adds focused Plan and Trace schedule verification.
 * @updated 2026-10-16: Includes deletion migration target, reference handling and hierarchy checks.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/utils/referenceDeleteTargets.test.ts',
      'src/utils/referenceDeletion.test.ts',
      'src/utils/todoHierarchyUtils.test.ts',
      'src/utils/todoScheduleUtils.test.ts',
      'src/components/TodoSchedulePlan.test.tsx',
      'src/components/TimelineTodoSidebar.test.ts',
      'src/services/desktopWidgetService.test.ts'
    ]
  }
});
