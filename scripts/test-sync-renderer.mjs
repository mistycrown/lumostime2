/**
 * @file test-sync-renderer.mjs
 * @updated 2026-10-07: Smoke-tests four-digit daily backup input, validation and persistence.
 * @input Real sync hook and isolated test adapters; optional --smoke-url for a local production preview
 * @output Renderer integration results and optional production-page screenshot in a temporary directory
 * @pos Test Runner
 * @description Runs real React effects in a hidden Electron window using disposable profile storage.
 */
import { build } from 'esbuild';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-sync-test-'));
const mocks = path.join(root, 'src/hooks/__tests__/syncHarnessMocks.tsx');
const mockNames = [
  'DataContext', 'CategoryScopeContext', 'ReviewContext', 'SettingsContext', 'NavigationContext', 'AchievementContext', 'ToastContext',
  'webdavService', 's3Service', 'compatibleS3Service', 'imageService', 'syncService', 'aiChatStorageService',
  'assistantBackupService', 'appearanceBackupService', 'preferencesBackupService', 'moodCalendarBackgroundService',
  'widgetService', 'customColorGroupService', 'sceneGroupStorage', 'errorReporting', 'syncConfig'
];
await build({
  entryPoints: [path.join(root, 'src/hooks/__tests__/syncRendererHarness.tsx')],
  bundle: true, platform: 'browser', format: 'iife', outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [{ name: 'isolated-sync-adapters', setup(builder) {
    builder.onResolve({ filter: /.*/ }, args => {
      if (args.path === '@capacitor/app' || args.path === '@capacitor/core' || mockNames.includes(path.basename(args.path))) {
        return { path: mocks };
      }
    });
  } }]
});
await writeFile(path.join(directory, 'index.html'), '<!doctype html><html><meta charset="utf-8"><body><div id="root"></div><script src="test.js"></script></body></html>', 'utf8');
const smokeIndex = process.argv.indexOf('--smoke-url');
const smokeUrl = smokeIndex >= 0 ? process.argv[smokeIndex + 1] : null;
if (smokeUrl && !/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(smokeUrl)) throw new Error('Smoke URL must be a local preview origin');
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, 'profile'));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, width: 1200, height: 850, webPreferences: { contextIsolation: true, backgroundThrottling: false } });
  const seenErrors = new Set();
  window.webContents.on('console-message', event => {
    if (event.level === 'error' && !seenErrors.has(event.message)) {
      seenErrors.add(event.message);
      console.error('[renderer]', event.message);
    }
  });
  await window.loadFile(path.join(__dirname, 'index.html'));
  window.webContents.debugger.attach('1.3');
  await window.webContents.debugger.sendCommand('Runtime.enable');
  window.webContents.debugger.on('message', (_event, method, params) => {
    if (method === 'Runtime.exceptionThrown' && !seenErrors.has(params.exceptionDetails?.exception?.description)) {
      const description = params.exceptionDetails?.exception?.description || JSON.stringify(params.exceptionDetails);
      seenErrors.add(description);
      console.error('[uncaught]', description);
    }
  });
  let result;
  for (let i = 0; i < 600; i++) {
    result = await window.webContents.executeJavaScript('window.__syncTestResult');
    if (result) break;
    await sleep(100);
  }
  if (!result || result.error) {
    console.error(JSON.stringify(result || { error: 'Renderer test timeout' }, null, 2));
    app.exit(1);
    return;
  }
  console.log(JSON.stringify(result, null, 2));
  const smokeUrl = ${JSON.stringify(smokeUrl)};
  if (smokeUrl) {
    seenErrors.clear();
    await window.loadURL(smokeUrl);
    await sleep(6000);
    const text = await window.webContents.executeJavaScript('document.body.innerText');
    if (seenErrors.size || text.includes('应用启动失败') || text.includes('加载本地数据超时') || text.length < 30) throw new Error('Production smoke failed: ' + JSON.stringify(Array.from(seenErrors)) + text);
    const screenshot = path.join(__dirname, 'production-smoke.png');
    await fs.writeFile(screenshot, (await window.webContents.capturePage()).toPNG());
    console.log('SMOKE_SCREENSHOT=' + screenshot);
    console.log('SMOKE_TEXT=' + text.slice(0, 500));
    const execute = code => window.webContents.executeJavaScript(code);
    const openPreferences = async () => {
      await execute("document.querySelector('button svg.lucide-settings').closest('button').click()");
      await sleep(1000);
      await execute("Array.from(document.querySelectorAll('span')).find(node => node.textContent === '偏好设置').click()");
      await sleep(1000);
    };
    await openPreferences();
    if (!await execute("document.querySelector('button[role=switch]')?.getAttribute('aria-checked') === 'false'")) throw new Error('Daily backup should default to disabled');
    await execute("document.querySelector('button[role=switch]').click()");
    await sleep(200);
    if (!await execute("(() => { const input = document.getElementById('daily-backup-time'); return input.type === 'text' && input.inputMode === 'numeric' && input.maxLength === 4; })()")) throw new Error('Backup time should use four-digit text input');
    // Hidden Electron windows do not receive native focus, so dispatch React's focus events explicitly.
    await execute("(async () => { const input = document.getElementById('daily-backup-time'); input.dispatchEvent(new FocusEvent('focusin', { bubbles: true })); for (const value of ['', '2', '21', '213', '2130']) { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); await new Promise(resolve => setTimeout(resolve, 20)); } })()");
    await sleep(200);
    if (!await execute("localStorage.getItem('lumostime_daily_backup_enabled') === 'true' && localStorage.getItem('lumostime_daily_backup_time') === '21:30'")) throw new Error('Daily preferences were not saved');
    await execute("(() => { const input = document.getElementById('daily-backup-time'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '2599'); input.dispatchEvent(new Event('input', { bubbles: true })); })()");
    await sleep(100);
    if (!await execute("localStorage.getItem('lumostime_daily_backup_time') === '21:30'")) throw new Error('Invalid digits changed the backup schedule');
    await execute("document.getElementById('daily-backup-time').dispatchEvent(new FocusEvent('focusout', { bubbles: true }))");
    await sleep(100);
    if (!await execute("document.getElementById('daily-backup-time').value === '2130'")) throw new Error('Invalid input did not revert on blur');
    await execute("document.getElementById('daily-backup-time').scrollIntoView({ block: 'center' })");
    // Wake the compositor of the hidden test window before saving its updated frame.
    await window.webContents.capturePage();
    await sleep(500);
    const preferencesScreenshot = path.join(__dirname, 'daily-backup-preferences.png');
    await fs.writeFile(preferencesScreenshot, (await window.webContents.capturePage()).toPNG());
    console.log('PREFERENCES_SCREENSHOT=' + preferencesScreenshot);
    await window.loadURL(smokeUrl);
    await sleep(3000);
    await openPreferences();
    if (!await execute("document.getElementById('daily-backup-time')?.value === '2130'")) throw new Error('Daily backup time did not survive reload');
    await execute("Array.from(document.querySelectorAll('h4')).find(node => node.textContent === '手动同步模式').parentElement.parentElement.querySelector('button').click()");
    await sleep(200);
    if (await execute("!!document.querySelector('button[role=switch]')")) throw new Error('Daily backup controls remain visible in automatic mode');
    await execute("Array.from(document.querySelectorAll('h4')).find(node => node.textContent === '手动同步模式').parentElement.parentElement.querySelector('button').click()");
    await sleep(200);
    await execute("document.querySelector('button[role=switch]').click()");
    await sleep(200);
    if (await execute("!!document.getElementById('daily-backup-time')")) throw new Error('Disabled backup time remains visible');
    if (seenErrors.size) throw new Error('Preferences smoke errors: ' + JSON.stringify(Array.from(seenErrors)));
    console.log('PREFERENCES_SMOKE=passed');
  }
  app.exit(0);
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', code => { process.exitCode = code ?? 1; });
child.on('error', error => { console.error(error); process.exitCode = 1; });
