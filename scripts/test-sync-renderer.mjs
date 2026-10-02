/**
 * @file test-sync-renderer.mjs
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
  }
  app.exit(0);
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', code => { process.exitCode = code ?? 1; });
child.on('error', error => { console.error(error); process.exitCode = 1; });
