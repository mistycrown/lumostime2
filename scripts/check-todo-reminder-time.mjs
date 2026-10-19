/**
 * @file check-todo-reminder-time.mjs
 * @input Installed JDK and the Android-independent reminder time policy
 * @output Java policy compilation/tests in an isolated temporary directory
 * @pos Verification script; does not compile or package the Android application
 * @updated 2026-10-18: Also checks the Android-independent calendar reconciliation policy.
 * @updated 2026-10-17: Runs calendar/DST/delivery checks without Gradle or an Android device.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

const directory = mkdtempSync(join(tmpdir(), 'lumos-reminder-time-'));
const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with ${result.status}`);
};
try {
  run('javac', ['-encoding', 'UTF-8', '-d', directory,
    'android/app/src/main/java/com/mistycrown/lumostime/TodoReminderTime.java',
    'android/app/src/test/java/com/mistycrown/lumostime/TodoReminderTimeTest.java',
    'android/app/src/main/java/com/mistycrown/lumostime/TodoReminderCalendarPlan.java',
    'android/app/src/test/java/com/mistycrown/lumostime/TodoReminderCalendarPlanTest.java']);
  run('java', ['-cp', directory, 'com.mistycrown.lumostime.TodoReminderTimeTest']);
  run('java', ['-cp', directory, 'com.mistycrown.lumostime.TodoReminderCalendarPlanTest']);
} finally {
  if (!resolve(directory).startsWith(resolve(tmpdir()) + sep) || !basename(directory).startsWith('lumos-reminder-time-')) {
    throw new Error('Refusing to remove an unexpected temporary directory');
  }
  rmSync(directory, { recursive: true, force: true });
}
