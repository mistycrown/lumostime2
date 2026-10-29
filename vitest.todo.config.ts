/**
 * @file vitest.todo.config.ts
 * @updated 2026-10-18: Includes terminal todo status and dated abandonment regressions.
 * @input Todo scheduling and related sidebar/widget regression tests
 * @output Node test runner independent of Vite's Electron launch plugins
 * @pos Test configuration
 * @updated 2026-10-14: Adds focused Plan and Trace schedule verification.
 * @updated 2026-10-16: Includes deletion migration target, reference handling and hierarchy checks.
 * @updated 2026-10-16: Covers recurring occurrence completion and related modal/widget rendering.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['src/utils/__tests__/todoTestSetup.ts'],
    include: [
      'src/utils/todoStatusUtils.test.ts',
      'src/utils/todoListDisplayUtils.test.ts',
      'src/services/assistantContextBuilder.test.ts',
      'src/services/excelExportService.test.ts',
      'src/utils/todoOccurrenceUtils.test.ts',
      'src/utils/todoRecurringPlanUtils.test.ts',
      'src/utils/todoCompletionModeUtils.test.ts',
      'src/hooks/useTodoManager.test.ts',
      'src/hooks/useTodoQuickActions.test.ts',
      'src/components/TodoQuickActionsModal.test.tsx',
      'src/components/TodoDetailModal.test.tsx',
      'src/components/TodoExecutionTagPicker.test.tsx',
      'src/components/TodoScheduleViewsFallback.test.tsx',
      'src/views/TodoView.recurrenceFallback.test.tsx',
      'src/services/widgetService.test.ts',
      'src/utils/referenceDeleteTargets.test.ts',
      'src/utils/referenceDeletion.test.ts',
      'src/utils/todoHierarchyUtils.test.ts',
      'src/utils/todoScheduleUtils.test.ts',
      'src/utils/todoExecutionTags.test.ts',
      'src/components/TodoSchedulePlan.test.tsx',
      'src/components/TimelineTodoSidebar.test.ts',
      'src/services/desktopWidgetService.test.ts'
    ]
  }
});
