/**
 * @file check-todo-reminder-types.mjs
 * @input Project TypeScript configuration and reminder implementation entry points
 * @output Type diagnostics in reminder modules and their directly changed integration files
 * @pos Focused type verification; existing diagnostics in other modules remain outside its scope
 * @updated 2026-10-18: Includes quick-action reminder controls and save helpers.
 * @updated 2026-10-17: Checks reminder code without hiding existing full-project type errors.
 */
import ts from 'typescript';
import path from 'node:path';

const files = [
  'src/components/TodoReminderButton.tsx', 'src/components/TodoReminderModal.tsx',
  'src/components/TodoDetailModal.tsx', 'src/components/__tests__/todoReminderHarness.tsx',
  'src/components/TodoQuickActionsModal.tsx', 'src/components/TodoQuickActionsModal.test.tsx',
  'src/hooks/useTodoQuickActions.ts', 'src/hooks/useTodoQuickActions.test.ts',
  'src/contexts/DataContext.tsx', 'src/hooks/useTodoReminderNavigation.ts',
  'src/plugins/TodoReminderPlugin.ts', 'src/services/todoReminderService.ts',
  'src/services/todoReminderService.test.ts', 'src/utils/todoReminderUtils.ts',
  'src/utils/todoReminderUtils.test.ts', 'src/utils/todoDuplicateUtils.ts', 'src/types.ts'
];
const configFile = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
if (configFile.error) throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, process.cwd());
const program = ts.createProgram(files, { ...config.options, noEmit: true });
const targets = new Set(files.map((file) => path.resolve(file).toLowerCase()));
const diagnostics = ts.getPreEmitDiagnostics(program).filter((item) => !item.file || targets.has(path.resolve(item.file.fileName).toLowerCase()));
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => process.cwd(), getCanonicalFileName: (file) => file, getNewLine: () => '\n'
  }));
  process.exitCode = 1;
} else {
  console.log(`PASS: focused TypeScript diagnostics for ${files.length} reminder/integration modules`);
}
