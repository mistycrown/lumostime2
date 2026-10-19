/**
 * @file test-todo-reminders.mjs
 * @input Reminder renderer harness, built product CSS and verified Windows Chinese font
 * @output Hidden isolated Electron interactions and mobile/dark/desktop screenshot artifacts
 * @pos Verification launcher; all permissions are simulated and no real notifications are sent
 * @updated 2026-10-18: Inserts time digits through Chromium to verify real input selection and automatic focus transitions.
 * @updated 2026-10-17: Verifies reminder interactions and successful-save-before-schedule ordering.
 */
import { build } from 'esbuild';
import { copyFile, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-todo-reminders-'));
const mocks = {
  SettingsContext: 'export const useOptionalSettings = () => null;',
  ToastContext: 'export const useToast = () => ({ addToast: () => {} });',
  ...Object.fromEntries(['IconRenderer', 'DataCollectionSelector', 'ScopeAssociation', 'TagAssociation', 'DetailTimelineCard', 'TimelineImage']
    .map((name) => [name, `export const ${name} = () => null;`]))
};
await build({
  entryPoints: ['src/components/__tests__/todoReminderHarness.tsx'], bundle: true, platform: 'browser', format: 'iife', outfile: path.join(directory, 'test.js'),
  define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '{}' },
  plugins: [{ name: 'isolated-reminder-contexts', setup(builder) {
    builder.onResolve({ filter: /\/(SettingsContext|ToastContext|IconRenderer|DataCollectionSelector|ScopeAssociation|TagAssociation|DetailTimelineCard|TimelineImage)$/ },
      (args) => ({ path: args.path.split('/').pop(), namespace: 'reminder-test' }));
    builder.onLoad({ filter: /.*/, namespace: 'reminder-test' }, (args) => ({ contents: mocks[args.path], loader: 'js' }));
  } }]
});
const stylesheet = (await readdir('dist/assets')).find((name) => name.startsWith('index-') && name.endsWith('.css'));
if (!stylesheet) throw new Error('Run npm run build before renderer verification');
await copyFile(path.join('dist/assets', stylesheet), path.join(directory, 'app.css'));
await copyFile('C:/Windows/Fonts/msyh.ttc', path.join(directory, 'chinese.ttc'));
await writeFile(path.join(directory, 'index.html'), '<!doctype html><html><meta charset="utf-8"><link rel="stylesheet" href="app.css"><style>@font-face{font-family:VerifiedChinese;src:url(chinese.ttc)}body{font-family:VerifiedChinese,"Microsoft YaHei",sans-serif;--font-family:VerifiedChinese;--app-safe-area-top:0px;background:#f5f1ec}</style><body><div id="root"></div><script src="test.js"></script></body></html>', 'utf8');
await writeFile(path.join(directory, 'main.cjs'), `
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.setPath('userData', path.join(__dirname, 'profile'));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 390, height: 844, webPreferences: { backgroundThrottling: false, offscreen: true } });
  const errors = [];
  win.webContents.on('console-message', (event) => { if (event.level === 'error') errors.push(event.message); });
  await win.loadFile(path.join(__dirname, 'index.html'));
  // Offscreen windows have no OS focus; emulate it so native focus/select/input behavior is exercised.
  win.webContents.debugger.attach('1.3');
  await win.webContents.debugger.sendCommand('Emulation.setFocusEmulationEnabled', { enabled: true });
  const captured = new Set();
  for (let i = 0; i < 600; i++) {
    const digits = await win.webContents.executeJavaScript('window.__todoReminderTypeDigits');
    if (digits) {
      const focused = [];
      for (const digit of digits) {
        await win.webContents.debugger.sendCommand('Input.insertText', { text: digit });
        await new Promise(resolve => setTimeout(resolve, 30));
        focused.push(await win.webContents.executeJavaScript('document.activeElement?.id'));
      }
      await win.webContents.executeJavaScript('window.__todoReminderTypeDigits = undefined; window.__todoReminderTyped = ' + JSON.stringify(focused));
    }
    const capture = await win.webContents.executeJavaScript('window.__todoReminderCapture');
    if (capture && !captured.has(capture.name)) {
      win.setContentSize(capture.width, capture.height);
      await win.webContents.executeJavaScript('document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))');
      await new Promise(resolve => setTimeout(resolve, 250));
      const file = path.join(__dirname, capture.name + '.png');
      await fs.writeFile(file, (await win.webContents.capturePage()).toPNG());
      console.log('SCREENSHOT=' + file);
      captured.add(capture.name);
      await win.webContents.executeJavaScript('window.__todoReminderCaptured = true');
    }
    const result = await win.webContents.executeJavaScript('window.__todoReminderResult');
    if (result) {
      console.log(JSON.stringify({ ...result, rendererErrors: errors }, null, 2));
      app.exit(result.error || errors.length ? 1 : 0); return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  console.error(await win.webContents.executeJavaScript('document.body.innerText.slice(-3000)'));
  throw new Error('Todo reminder renderer timeout');
}).catch(error => { console.error(error); app.exit(1); });
`, 'utf8');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
